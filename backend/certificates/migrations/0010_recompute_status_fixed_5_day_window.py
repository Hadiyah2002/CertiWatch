"""
Data migration: recomputes status for every existing Certificate row
now that the Active/Expiring Soon/Expired status label uses a fixed
5-day window for everyone, decoupled from each certificate's own
alert_days_before (which now controls reminder timing only). Also
applies the corrected rule that an expiry_date of today counts as
EXPIRED, not expiring_soon.
"""
from django.db import migrations
from django.utils import timezone

EXPIRING_SOON_WINDOW_DAYS = 5


def recompute_status(apps, schema_editor):
    Certificate = apps.get_model('certificates', 'Certificate')
    today = timezone.localdate()

    for cert in Certificate.objects.all():
        if cert.expiry_date <= today:
            new_status = 'expired'
        elif (cert.expiry_date - today).days <= EXPIRING_SOON_WINDOW_DAYS:
            new_status = 'expiring_soon'
        else:
            new_status = 'active'
        if cert.status != new_status:
            cert.status = new_status
            cert.save(update_fields=['status'])


def noop_reverse(apps, schema_editor):
    pass  # nothing meaningful to reverse


class Migration(migrations.Migration):

    dependencies = [
        ('certificates', '0009_reminderlog_rename_sent_at_to_last_sent_at'),
    ]

    operations = [
        migrations.RunPython(recompute_status, noop_reverse),
    ]
