import calendar

from django.db.models import Count, Q
from django.db.models.functions import ExtractMonth
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Branch, Certificate, CertificateCategory
from .report_exports import build_pdf_response, build_xlsx_response
from .serializers import CertificateSerializer

MONTH_NAMES = list(calendar.month_name)  # index 1-12, index 0 is ''


def _parse_int(value, field_name):
    """Returns (int_or_none, error_response_or_none)."""
    if value in (None, ''):
        return None, None
    try:
        return int(value), None
    except (TypeError, ValueError):
        return None, Response({'detail': f'{field_name} must be a whole number.'}, status=400)


class ReportsSummaryView(APIView):
    """All-time totals — the 4 summary cards at the top of the Reports page."""

    def get(self, request):
        qs = Certificate.objects.all()
        totals = {
            'total': qs.count(),
            'active': qs.filter(status=Certificate.STATUS_ACTIVE).count(),
            'expiring_soon': qs.filter(status=Certificate.STATUS_EXPIRING_SOON).count(),
            'expired': qs.filter(status=Certificate.STATUS_EXPIRED).count(),
        }

        fmt = request.query_params.get('export')
        headers = ['Metric', 'Count']
        rows = [
            ['Total Certificates', totals['total']],
            ['Active', totals['active']],
            ['Expiring Soon', totals['expiring_soon']],
            ['Expired', totals['expired']],
        ]
        if fmt == 'xlsx':
            return build_xlsx_response('summary.xlsx', 'Summary', headers, rows)
        if fmt == 'pdf':
            return build_pdf_response('summary.pdf', 'Certificate Summary', headers, rows)

        return Response(totals)


class ReportsExpiredListView(APIView):
    """
    Certificates whose expiry_date falls within a given month/year.
    `year` is required; `month` is optional (omit it to see the whole
    year). This looks at each certificate's CURRENT expiry_date, so a
    certificate that already expired and was later renewed forward
    won't show up under its old expiry period anymore — only its
    current cycle counts.
    """

    def get(self, request):
        year, err = _parse_int(request.query_params.get('year'), 'year')
        if err:
            return err
        if year is None:
            return Response({'detail': 'year is required.'}, status=400)

        month, err = _parse_int(request.query_params.get('month'), 'month')
        if err:
            return err
        if month is not None and not (1 <= month <= 12):
            return Response({'detail': 'month must be between 1 and 12.'}, status=400)

        qs = Certificate.objects.filter(expiry_date__year=year).select_related('category', 'branch')
        if month:
            qs = qs.filter(expiry_date__month=month)
        qs = qs.order_by('expiry_date')

        period_label = f'{MONTH_NAMES[month]} {year}' if month else str(year)

        fmt = request.query_params.get('export')
        if fmt in ('xlsx', 'pdf'):
            headers = ['Name', 'Reference #', 'Category', 'Branch', 'Expiry Date', 'Status']
            rows = [
                [c.name, c.reference_number, c.category.name, c.branch.name, str(c.expiry_date), c.get_status_display()]
                for c in qs
            ]
            title = f'Certificates Expiring — {period_label}'
            if fmt == 'xlsx':
                return build_xlsx_response(f'expired-{year}{f"-{month:02d}" if month else ""}.xlsx', 'Expired', headers, rows)
            return build_pdf_response(f'expired-{year}{f"-{month:02d}" if month else ""}.pdf', title, headers, rows)

        serializer = CertificateSerializer(qs, many=True, context={'request': request})
        return Response({'period': period_label, 'count': qs.count(), 'certificates': serializer.data})


class ReportsExpiringByMonthView(APIView):
    """12-month breakdown of expiry_date counts for a given year, for the bar chart."""

    def get(self, request):
        year, err = _parse_int(request.query_params.get('year'), 'year')
        if err:
            return err
        if year is None:
            year = timezone.localdate().year

        counts = (
            Certificate.objects.filter(expiry_date__year=year)
            .annotate(month=ExtractMonth('expiry_date'))
            .values('month')
            .annotate(count=Count('id'))
        )
        count_by_month = {row['month']: row['count'] for row in counts}
        months = [{'month': m, 'month_name': MONTH_NAMES[m], 'count': count_by_month.get(m, 0)} for m in range(1, 13)]

        fmt = request.query_params.get('export')
        if fmt in ('xlsx', 'pdf'):
            headers = ['Month', 'Certificates Expiring']
            rows = [[m['month_name'], m['count']] for m in months]
            title = f'Certificates Expiring by Month — {year}'
            if fmt == 'xlsx':
                return build_xlsx_response(f'expiring-by-month-{year}.xlsx', 'By Month', headers, rows)
            return build_pdf_response(f'expiring-by-month-{year}.pdf', title, headers, rows)

        return Response({'year': year, 'months': months})


class ReportsByBranchView(APIView):
    """Certificate count and status breakdown per branch."""

    def get(self, request):
        branches = Branch.objects.annotate(
            total=Count('certificates'),
            active=Count('certificates', filter=Q(certificates__status=Certificate.STATUS_ACTIVE)),
            expiring_soon=Count('certificates', filter=Q(certificates__status=Certificate.STATUS_EXPIRING_SOON)),
            expired=Count('certificates', filter=Q(certificates__status=Certificate.STATUS_EXPIRED)),
        ).order_by('name')

        data = [
            {
                'id': b.id, 'name': b.name, 'total': b.total,
                'active': b.active, 'expiring_soon': b.expiring_soon, 'expired': b.expired,
            }
            for b in branches
        ]

        fmt = request.query_params.get('export')
        if fmt in ('xlsx', 'pdf'):
            headers = ['Branch', 'Total', 'Active', 'Expiring Soon', 'Expired']
            rows = [[d['name'], d['total'], d['active'], d['expiring_soon'], d['expired']] for d in data]
            if fmt == 'xlsx':
                return build_xlsx_response('by-branch.xlsx', 'By Branch', headers, rows)
            return build_pdf_response('by-branch.pdf', 'Certificates by Branch', headers, rows)

        return Response(data)


class ReportsByCategoryView(APIView):
    """Certificate count and status breakdown per category."""

    def get(self, request):
        categories = CertificateCategory.objects.annotate(
            total=Count('certificates'),
            active=Count('certificates', filter=Q(certificates__status=Certificate.STATUS_ACTIVE)),
            expiring_soon=Count('certificates', filter=Q(certificates__status=Certificate.STATUS_EXPIRING_SOON)),
            expired=Count('certificates', filter=Q(certificates__status=Certificate.STATUS_EXPIRED)),
        ).order_by('name')

        data = [
            {
                'id': c.id, 'name': c.name, 'total': c.total,
                'active': c.active, 'expiring_soon': c.expiring_soon, 'expired': c.expired,
            }
            for c in categories
        ]

        fmt = request.query_params.get('export')
        if fmt in ('xlsx', 'pdf'):
            headers = ['Category', 'Total', 'Active', 'Expiring Soon', 'Expired']
            rows = [[d['name'], d['total'], d['active'], d['expiring_soon'], d['expired']] for d in data]
            if fmt == 'xlsx':
                return build_xlsx_response('by-category.xlsx', 'By Category', headers, rows)
            return build_pdf_response('by-category.pdf', 'Certificates by Category', headers, rows)

        return Response(data)
