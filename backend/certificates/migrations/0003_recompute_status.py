"""
Data migration: recomputes status for every existing Certificate row.

If you already had a database from before the status field went from
4 states (including the now-removed 'renewal_required') to 3, any row
that was manually flagged 'renewal_required' would otherwise be left
with a status value the model no longer recognizes. This corrects every
row using the same active/expiring_soon/expired logic the app now uses
everywhere else, so nothing is left in an inconsistent state.
"""
from datetime import timedelta

from django.db import migrations
from django.utils import timezone


def recompute_status(apps, schema_editor):
    Certificate = apps.get_model('certificates', 'Certificate')
    threshold_days = 30  # matches the CERTIFICATE_EXPIRING_SOON_DAYS default
    today = timezone.localdate()

    for cert in Certificate.objects.all():
        if cert.expiry_date < today:
            new_status = 'expired'
        elif cert.expiry_date <= today + timedelta(days=threshold_days):
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
        ('certificates', '0002_alter_certificate_status'),
    ]

    operations = [
        migrations.RunPython(recompute_status, noop_reverse),
    ]
