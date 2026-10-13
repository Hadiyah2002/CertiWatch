from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('certificates', '0004_certificate_reference_number'),
    ]

    operations = [
        migrations.AddField(
            model_name='certificate',
            name='alert_days_before',
            field=models.PositiveIntegerField(
                default=30,
                help_text=(
                    'How many days before expiry this specific certificate should start '
                    'showing as "expiring_soon" and triggering reminders. Fully editable '
                    'per certificate — 30 is just a starting suggestion.'
                ),
            ),
        ),
    ]
