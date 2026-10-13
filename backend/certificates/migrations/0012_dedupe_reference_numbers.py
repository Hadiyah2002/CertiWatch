"""
Data migration: before reference_number becomes a unique column (next
migration), rename any EXISTING duplicates so the upcoming unique
constraint doesn't fail to apply. For each group of certificates that
currently share a reference_number, the first one (lowest id) keeps its
value as-is; every other one in that group gets "-DUP2", "-DUP3", etc.
appended, so they stay distinct and the migration can proceed safely on
a database that already has duplicates in it.

These renamed values are placeholders, not real reference numbers —
anyone affected should go back into the certificate and enter its
correct, real reference number once this migration has run.
"""
from collections import defaultdict

from django.db import migrations


def dedupe_reference_numbers(apps, schema_editor):
    Certificate = apps.get_model('certificates', 'Certificate')

    groups = defaultdict(list)
    for cert in Certificate.objects.order_by('id').only('id', 'reference_number'):
        groups[cert.reference_number].append(cert.id)

    for reference_number, ids in groups.items():
        if len(ids) <= 1:
            continue  # not a duplicate

        # ids is already in ascending id order (queried with order_by('id')).
        # Keep the first as-is; rename the rest.
        for position, cert_id in enumerate(ids[1:], start=2):
            new_value = f'{reference_number}-DUP{position}'
            # Extremely unlikely, but guard against the renamed value
            # itself colliding with something else already in use.
            while Certificate.objects.filter(reference_number=new_value).exists():
                position += 1
                new_value = f'{reference_number}-DUP{position}'
            Certificate.objects.filter(pk=cert_id).update(reference_number=new_value)


def noop_reverse(apps, schema_editor):
    pass  # renamed values are placeholders; nothing meaningful to reverse


class Migration(migrations.Migration):

    dependencies = [
        ('certificates', '0011_recompute_status_per_certificate_threshold'),
    ]

    operations = [
        migrations.RunPython(dedupe_reference_numbers, noop_reverse),
    ]
