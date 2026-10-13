from django.contrib import admin

from .models import (
    Branch,
    Certificate,
    CertificateCategory,
    EmailRecipient,
    Notification,
    ReminderLog,
    RenewalRecord,
)


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ['name', 'location']
    search_fields = ['name', 'location']


@admin.register(CertificateCategory)
class CertificateCategoryAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'branch', 'expiry_date', 'alert_days_before', 'status']
    list_filter = ['status', 'branch', 'category']
    search_fields = ['name', 'description', 'reference_number']
    autocomplete_fields = ['category', 'branch']


@admin.register(RenewalRecord)
class RenewalRecordAdmin(admin.ModelAdmin):
    list_display = ['certificate', 'previous_expiry_date', 'new_expiry_date', 'renewed_by', 'renewed_at']
    list_filter = ['renewed_at']


@admin.register(ReminderLog)
class ReminderLogAdmin(admin.ModelAdmin):
    list_display = ['certificate', 'channel', 'last_sent_at']
    list_filter = ['channel', 'last_sent_at']
    autocomplete_fields = ['certificate']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['certificate', 'message', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
    autocomplete_fields = ['certificate']


@admin.register(EmailRecipient)
class EmailRecipientAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'email']
