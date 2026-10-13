from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.db import models
from django.utils import timezone


class Branch(models.Model):
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class CertificateCategory(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Certificate categories'

    def __str__(self):
        return self.name


def certificate_upload_path(instance, filename):
    return f'certificates/{instance.branch_id or "unassigned"}/{filename}'


def renewal_upload_path(instance, filename):
    return f'renewals/{instance.certificate_id}/{filename}'


ALLOWED_ATTACHMENT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png']


class Certificate(models.Model):
    STATUS_ACTIVE = 'active'
    STATUS_EXPIRING_SOON = 'expiring_soon'
    STATUS_EXPIRED = 'expired'

    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_EXPIRING_SOON, 'Expiring Soon'),
        (STATUS_EXPIRED, 'Expired'),
    ]

    name = models.CharField(max_length=255)
    reference_number = models.CharField(
        max_length=100,
        unique=True,
        help_text='Government-issued registration/license/reference number for this certificate. Must be unique.',
    )
    category = models.ForeignKey(CertificateCategory, on_delete=models.PROTECT, related_name='certificates')
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name='certificates')
    description = models.TextField(blank=True, help_text='Purpose / notes about this certificate.')

    issue_date = models.DateField()
    expiry_date = models.DateField()
    alert_days_before = models.PositiveIntegerField(
        default=30,
        help_text=(
            'How many days before expiry this certificate should show as '
            '"Expiring Soon" and start triggering reminders (email/'
            'website). Fully editable per certificate. Renewing '
            'a certificate lets you set a fresh value for the new cycle.'
        ),
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)

    attached_file = models.FileField(
        upload_to=certificate_upload_path,
        blank=True,
        null=True,
        validators=[FileExtensionValidator(ALLOWED_ATTACHMENT_EXTENSIONS)],
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['expiry_date']

    def __str__(self):
        return self.name

    @staticmethod
    def compute_auto_status(expiry_date, alert_days_before):
        """Active / expiring_soon / expired, using THIS certificate's own
        alert_days_before as the expiring_soon threshold — every
        certificate can have a different window. An expiry_date of
        today counts as EXPIRED, not expiring_soon — as soon as the
        expiry date itself arrives, the certificate has expired.

        This is the ONLY way status is derived — there is no manual
        override. Renewing a certificate (see RenewalRecord) is an
        action that changes expiry_date (and can also update
        alert_days_before for the new cycle), which then flows through
        this same calculation."""
        today = timezone.localdate()
        if expiry_date <= today:
            return Certificate.STATUS_EXPIRED
        if (expiry_date - today).days <= alert_days_before:
            return Certificate.STATUS_EXPIRING_SOON
        return Certificate.STATUS_ACTIVE

    @property
    def days_until_expiry(self):
        return (self.expiry_date - timezone.localdate()).days

    def clean(self):
        super().clean()
        if self.issue_date and self.expiry_date and self.expiry_date <= self.issue_date:
            raise ValidationError({'expiry_date': 'Expiry date must be after the issue date.'})

    def save(self, *args, **kwargs):
        self.status = self.compute_auto_status(self.expiry_date, self.alert_days_before)
        super().save(*args, **kwargs)


class RenewalRecord(models.Model):
    """History entry created each time a certificate is renewed. The old
    file is retained here so the audit trail isn't lost when the
    certificate's attached_file is replaced."""

    certificate = models.ForeignKey(Certificate, on_delete=models.CASCADE, related_name='renewal_records')
    previous_expiry_date = models.DateField()
    new_expiry_date = models.DateField()
    previous_attached_file = models.FileField(
        upload_to=renewal_upload_path,
        blank=True,
        null=True,
        validators=[FileExtensionValidator(ALLOWED_ATTACHMENT_EXTENSIONS)],
    )
    renewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='renewals_performed',
    )
    renewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-renewed_at']

    def __str__(self):
        return f'{self.certificate.name}: {self.previous_expiry_date} -> {self.new_expiry_date}'


class ReminderLog(models.Model):
    """
    Tracks the last time a reminder was sent for a certificate on a
    given channel. Reminders repeat every 7 days while the certificate
    remains within its alert window — this is NOT a one-time
    "already sent, skip forever" flag. See check_reminders.py for the
    exact repeat logic (last_sent_at is updated, not just set once).

    IMPORTANT: when a certificate is renewed, its ReminderLog entries
    must be deleted so the new expiry cycle can alert again. This is
    handled in RenewalRecordViewSet.create() — see the comment there.
    """

    CHANNEL_EMAIL = 'email'
    CHANNEL_WEBSITE = 'website'

    CHANNEL_CHOICES = [
        (CHANNEL_EMAIL, 'Email'),
        (CHANNEL_WEBSITE, 'Website'),
    ]

    certificate = models.ForeignKey(Certificate, on_delete=models.CASCADE, related_name='reminder_logs')
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    last_sent_at = models.DateTimeField(auto_now=True)

    class Meta:
        # At most one row per certificate per channel per expiry cycle.
        # check_reminders uses update_or_create against this, checking
        # whether 7+ days have passed since last_sent_at before repeating
        # a send. Renewal clears these rows to start a fresh cycle.
        unique_together = ('certificate', 'channel')
        ordering = ['-last_sent_at']

    def __str__(self):
        return f'{self.certificate.name} — {self.get_channel_display()} last sent {self.last_sent_at:%Y-%m-%d}'


class Notification(models.Model):
    """
    Company-wide notice-board entry for an expiring/expired certificate.
    Shared feed visible to all logged-in users — no per-user targeting,
    consistent with the no-roles design. Created by check_reminders for
    the 'website' channel.
    """

    certificate = models.ForeignKey(Certificate, on_delete=models.CASCADE, related_name='notifications')
    message = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.message


class EmailRecipient(models.Model):
    """
    Who receives email reminders. This is deliberately NOT per-certificate
    — it's one shared list of recipients managed on the Alert Recipients
    page, replacing the old per-certificate 'responsible_user' targeting.
    """

    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} <{self.email}>'
