from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('certificates', '0008_emailrecipient_whatsapprecipient_and_more'),
    ]

    operations = [
        # A true rename, not remove+add — this preserves every existing
        # ReminderLog row's timestamp instead of dropping it. Anyone who
        # already has reminder data from earlier prompts keeps it intact.
        migrations.RenameField(
            model_name='reminderlog',
            old_name='sent_at',
            new_name='last_sent_at',
        ),
        migrations.AlterField(
            model_name='reminderlog',
            name='last_sent_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AlterModelOptions(
            name='reminderlog',
            options={'ordering': ['-last_sent_at']},
        ),
    ]
