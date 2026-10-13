from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import report_views, views

router = DefaultRouter(trailing_slash=False)
router.register('branches', views.BranchViewSet, basename='branch')
router.register('categories', views.CertificateCategoryViewSet, basename='certificatecategory')
router.register('certificates', views.CertificateViewSet, basename='certificate')
router.register('renewals', views.RenewalRecordViewSet, basename='renewalrecord')
router.register('email-recipients', views.EmailRecipientViewSet, basename='emailrecipient')
router.register('notifications', views.NotificationViewSet, basename='notification')

urlpatterns = [
    path('search', views.GlobalSearchView.as_view(), name='global-search'),
    path('dashboard/stats', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    path('reports/summary', report_views.ReportsSummaryView.as_view(), name='reports-summary'),
    path('reports/expired-list', report_views.ReportsExpiredListView.as_view(), name='reports-expired-list'),
    path('reports/expiring-by-month', report_views.ReportsExpiringByMonthView.as_view(), name='reports-expiring-by-month'),
    path('reports/by-branch', report_views.ReportsByBranchView.as_view(), name='reports-by-branch'),
    path('reports/by-category', report_views.ReportsByCategoryView.as_view(), name='reports-by-category'),
    path('', include(router.urls)),
]
