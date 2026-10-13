"""
Data migration: recomputes status for every existing Certificate row
now that the Active/Expiring Soon/Expired status label is back to using
each certificate's own alert_days_before as the threshold (reverting
the brief fixed-5-day-for-everyone experiment from migration 0010).
The rule that an expiry_date of today counts as EXPIRED, not
expiring_soon, is unchanged.
"""
from django.db import migrations
from django.utils import timezone


def recompute_status(apps, schema_editor):
    Certificate = apps.get_model('certificates', 'Certificate')
    today = timezone.localdate()

    for cert in Certificate.objects.all():
        if cert.expiry_date <= today:
            new_status = 'expired'
        elif (cert.expiry_date - today).days <= cert.alert_days_before:
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
        ('certificates', '0010_recompute_status_fixed_5_day_window'),
    ]

    operations = [
        migrations.RunPython(recompute_status, noop_reverse),
    ]
