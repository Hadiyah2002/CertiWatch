"""
Data migration: recomputes status for every existing Certificate row
now that the expiring_soon threshold is per-certificate
(alert_days_before) instead of a single global setting.

Every existing row got alert_days_before=30 from the previous
migration, which matches the old global default — so for most
deployments this is a no-op. But if a deployment had customized the old
CERTIFICATE_EXPIRING_SOON_DAYS setting to something other than 30,
existing statuses were computed against that custom value and would
otherwise stay stale until each certificate was next saved. This
recomputes everyone immediately for consistency.
"""
from datetime import timedelta

from django.db import migrations
from django.utils import timezone


def recompute_status(apps, schema_editor):
    Certificate = apps.get_model('certificates', 'Certificate')
    today = timezone.localdate()

    for cert in Certificate.objects.all():
        if cert.expiry_date < today:
            new_status = 'expired'
        elif cert.expiry_date <= today + timedelta(days=cert.alert_days_before):
            new_status = 'expiring_soon'
        else:
            new_status = 'active'
        if cert.status != new_status:
            cert.status = new_status
            cert.save(update_fields=['status'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('certificates', '0005_certificate_alert_days_before'),
    ]

    operations = [
        migrations.RunPython(recompute_status, noop_reverse),
    ]
