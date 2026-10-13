from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('certificates', '0003_recompute_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='certificate',
            name='reference_number',
            field=models.CharField(
                default='PENDING-UPDATE',
                help_text='Government-issued registration/license/reference number for this certificate.',
                max_length=100,
            ),
            preserve_default=False,
        ),
    ]
