from django.db.models import Count, ProtectedError, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Branch, Certificate, CertificateCategory, EmailRecipient, Notification, RenewalRecord
from .serializers import (
    BranchSerializer,
    CertificateCategorySerializer,
    CertificateSerializer,
    EmailRecipientSerializer,
    NotificationSerializer,
    RenewalRecordSerializer,
)


class BranchViewSet(viewsets.ModelViewSet):
    # Annotated so the frontend can show "N certificates" per branch
    # without a separate request per row (see BranchSerializer.get_certificate_count
    # for the fallback used right after a create/update).
    queryset = Branch.objects.annotate(certificate_count=Count('certificates')).order_by('name')
    serializer_class = BranchSerializer

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'This branch has certificates assigned to it and cannot be deleted. Reassign or remove those certificates first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class CertificateCategoryViewSet(viewsets.ModelViewSet):
    # Annotated so the frontend can show "N certificates" per category
    # without a separate request per row. See
    # CertificateCategorySerializer.get_certificate_count for the
    # fallback used when an instance wasn't fetched from this queryset
    # (e.g. straight after a create/update).
    queryset = CertificateCategory.objects.annotate(certificate_count=Count('certificates')).order_by('name')
    serializer_class = CertificateCategorySerializer

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'This category has certificates assigned to it and cannot be deleted. Reassign or remove those certificates first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class CertificateViewSet(viewsets.ModelViewSet):
    queryset = Certificate.objects.select_related('category', 'branch').all()
    serializer_class = CertificateSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        return queryset


class RenewalRecordViewSet(viewsets.ModelViewSet):
    queryset = RenewalRecord.objects.select_related('certificate', 'renewed_by').all()
    serializer_class = RenewalRecordSerializer

    def create(self, request, *args, **kwargs):
        """
        Renewing a certificate is an action, not something the client
        assembles a full RenewalRecord for. The client sends
        `certificate` and `new_expiry_date` (required), plus optionally
        a new document under `new_attached_file` and/or a fresh
        `alert_days_before` for the new cycle. Everything else — the
        "previous" state being archived — is derived from the
        certificate's current values here, server-side, so it can't be
        spoofed or get out of sync.
        """
        certificate_id = request.data.get('certificate')
        new_expiry_date_raw = request.data.get('new_expiry_date')
        if not certificate_id or not new_expiry_date_raw:
            return Response(
                {'detail': 'certificate and new_expiry_date are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_expiry_date = parse_date(new_expiry_date_raw)
        if new_expiry_date is None:
            return Response(
                {'detail': 'new_expiry_date must be a valid date in YYYY-MM-DD format.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Optional: let the user set a fresh alert threshold for the new
        # expiry cycle. If omitted, the certificate keeps whatever it
        # already had.
        new_alert_days_before = None
        raw_alert_days_before = request.data.get('alert_days_before')
        if raw_alert_days_before not in (None, ''):
            try:
                new_alert_days_before = int(raw_alert_days_before)
                if new_alert_days_before < 0:
                    raise ValueError
            except (TypeError, ValueError):
                return Response(
                    {'detail': 'alert_days_before must be a non-negative whole number of days.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        certificate = get_object_or_404(Certificate, pk=certificate_id)

        if new_expiry_date <= certificate.issue_date:
            return Response(
                {'detail': 'Expiry date must be after the issue date.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        renewal = RenewalRecord.objects.create(
            certificate=certificate,
            previous_expiry_date=certificate.expiry_date,
            new_expiry_date=new_expiry_date,
            previous_attached_file=certificate.attached_file or None,
            renewed_by=request.user,
        )

        certificate.expiry_date = new_expiry_date
        if new_alert_days_before is not None:
            certificate.alert_days_before = new_alert_days_before
        new_file = request.FILES.get('new_attached_file')
        if new_file:
            certificate.attached_file = new_file
        certificate.save()  # status recalculates automatically here

        # A renewal starts a fresh expiry cycle, so any reminders already
        # sent for the OLD cycle must not suppress reminders for the new
        # one. Clearing ReminderLog here lets check_reminders alert again
        # once this certificate crosses its alert threshold next time.
        certificate.reminder_logs.all().delete()

        serializer = self.get_serializer(renewal)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class EmailRecipientViewSet(viewsets.ModelViewSet):
    queryset = EmailRecipient.objects.all()
    serializer_class = EmailRecipientSerializer


class NotificationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    Read + mark-as-read only. Notifications are created exclusively by
    check_reminders (the website channel), never directly through this
    API, so create/destroy are deliberately not exposed here.
    """

    queryset = Notification.objects.select_related(
        'certificate', 'certificate__branch', 'certificate__category'
    ).all()
    serializer_class = NotificationSerializer

    def get_queryset(self):
        """Optional filters: ?is_read=true|false, ?status=expiring_soon|expired
        (the certificate's current status) and ?q= (certificate name or
        reference number). Mark-one-as-read is PATCH /notifications/{id}
        with {"is_read": true}."""
        queryset = super().get_queryset()
        params = self.request.query_params
        is_read = params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        status_filter = params.get('status')
        if status_filter in (Certificate.STATUS_EXPIRING_SOON, Certificate.STATUS_EXPIRED):
            queryset = queryset.filter(certificate__status=status_filter)
        query = params.get('q', '').strip()
        if query:
            queryset = queryset.filter(
                Q(certificate__name__icontains=query) | Q(certificate__reference_number__icontains=query)
            )
        return queryset

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'updated': updated})

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        return Response({'count': Notification.objects.filter(is_read=False).count()})

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Counts for the Notifications page summary cards."""
        notifications = Notification.objects.all()
        return Response({
            'unread': notifications.filter(is_read=False).count(),
            'expiring_soon': notifications.filter(certificate__status=Certificate.STATUS_EXPIRING_SOON).count(),
            'expired': notifications.filter(certificate__status=Certificate.STATUS_EXPIRED).count(),
        })


class GlobalSearchView(APIView):
    """
    Backs the topbar search box. Searches certificates (by name and
    reference_number), branches (by name), and categories (by name),
    each capped to a few results, done server-side via the database
    rather than fetching everything and filtering in the browser.
    """

    RESULT_LIMIT = 5

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'certificates': [], 'branches': [], 'categories': []})

        certificates = Certificate.objects.filter(
            Q(name__icontains=query) | Q(reference_number__icontains=query)
        ).order_by('name')[:self.RESULT_LIMIT]

        branches = Branch.objects.filter(name__icontains=query).order_by('name')[:self.RESULT_LIMIT]

        categories = CertificateCategory.objects.filter(
            name__icontains=query
        ).order_by('name')[:self.RESULT_LIMIT]

        return Response({
            'certificates': [
                {'id': c.id, 'name': c.name, 'reference_number': c.reference_number, 'status': c.status}
                for c in certificates
            ],
            'branches': [{'id': b.id, 'name': b.name} for b in branches],
            'categories': [{'id': c.id, 'name': c.name} for c in categories],
        })


class DashboardStatsView(APIView):
    """Aggregate counts + chart-ready data for the dashboard home page."""

    def get(self, request):
        certificates = Certificate.objects.all()

        totals = {
            'total': certificates.count(),
            'active': certificates.filter(status=Certificate.STATUS_ACTIVE).count(),
            'expiring_soon': certificates.filter(status=Certificate.STATUS_EXPIRING_SOON).count(),
            'expired': certificates.filter(status=Certificate.STATUS_EXPIRED).count(),
        }

        status_breakdown = [
            {'status': key, 'label': label, 'count': totals[key]}
            for key, label in Certificate.STATUS_CHOICES
        ]

        today = timezone.localdate()
        buckets = [
            {'label': 'Expired', 'min': None, 'max': -1, 'count': 0},
            {'label': '0-30 days', 'min': 0, 'max': 30, 'count': 0},
            {'label': '31-60 days', 'min': 31, 'max': 60, 'count': 0},
            {'label': '61-90 days', 'min': 61, 'max': 90, 'count': 0},
            {'label': '90+ days', 'min': 91, 'max': None, 'count': 0},
        ]
        for cert in certificates:
            days = (cert.expiry_date - today).days
            for bucket in buckets:
                lo, hi = bucket['min'], bucket['max']
                if (lo is None or days >= lo) and (hi is None or days <= hi):
                    bucket['count'] += 1
                    break

        expiry_buckets = [{'label': b['label'], 'count': b['count']} for b in buckets]

        return Response({
            'totals': totals,
            'status_breakdown': status_breakdown,
            'expiry_buckets': expiry_buckets,
        })
