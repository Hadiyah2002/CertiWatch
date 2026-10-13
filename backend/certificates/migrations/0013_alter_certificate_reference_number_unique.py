from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('certificates', '0012_dedupe_reference_numbers'),
    ]

    operations = [
        migrations.AlterField(
            model_name='certificate',
            name='alert_days_before',
            field=models.PositiveIntegerField(default=30, help_text='How many days before expiry this certificate should show as "Expiring Soon" and start triggering reminders (email/WhatsApp/website). Fully editable per certificate. Renewing a certificate lets you set a fresh value for the new cycle.'),
        ),
        migrations.AlterField(
            model_name='certificate',
            name='reference_number',
            field=models.CharField(help_text='Government-issued registration/license/reference number for this certificate. Must be unique.', max_length=100, unique=True),
        ),
    ]
