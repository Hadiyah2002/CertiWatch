import smtplib

from django.conf import settings
from django.core.mail import EmailMessage, get_connection
from django.core.management.base import BaseCommand, CommandError

from certificates.management.commands.check_reminders import SEND_ERRORS, make_message_id


class Command(BaseCommand):
    help = (
        "Sends one plain test email to each given address using the current "
        "EMAIL_* settings, printing the effective config first (never the "
        "password). Unlike check_reminders, any failure is reported loudly "
        "with the full exception type and message. Use --debug to see the "
        "SMTP conversation, including the server's final reply "
        "(e.g. '250 OK id=...')."
    )

    def add_arguments(self, parser):
        parser.add_argument('recipients', nargs='+', help='One or more email addresses to send the test message to.')
        parser.add_argument(
            '--debug',
            action='store_true',
            help='Print the SMTP protocol exchange (to stderr) so the server responses are visible.',
        )

    def handle(self, *args, **options):
        recipients = options['recipients']

        self.stdout.write('Effective email config:')
        for label, value in [
            ('EMAIL_HOST', settings.EMAIL_HOST),
            ('EMAIL_PORT', settings.EMAIL_PORT),
            ('EMAIL_USE_TLS', settings.EMAIL_USE_TLS),
            ('EMAIL_USE_SSL', settings.EMAIL_USE_SSL),
            ('EMAIL_HOST_USER', settings.EMAIL_HOST_USER),
            ('DEFAULT_FROM_EMAIL', settings.DEFAULT_FROM_EMAIL),
            ('EMAIL_TIMEOUT', settings.EMAIL_TIMEOUT),
            ('EMAIL_HOST_PASSWORD', 'set' if settings.EMAIL_HOST_PASSWORD else 'NOT SET'),
        ]:
            self.stdout.write(f'  {label}: {value}')
        self.stdout.flush()

        if options['debug']:
            # Class-level so it applies from the very first connect/EHLO,
            # for both SMTP (TLS) and SMTP_SSL connections.
            smtplib.SMTP.debuglevel = 1

        try:
            connection = get_connection(fail_silently=False)
            connection.open()
        except (ValueError, *SEND_ERRORS) as exc:
            raise CommandError(
                f'Could not connect/log in: {type(exc).__module__}.{type(exc).__name__}: {exc}'
            ) from exc

        failures = []
        try:
            for recipient in recipients:
                message = EmailMessage(
                    subject='CertiWatch test email',
                    body=(
                        'This is a test email from CertiWatch.\n\n'
                        'If you received it, email notifications are configured correctly.'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[recipient],
                    reply_to=[settings.EMAIL_HOST_USER] if settings.EMAIL_HOST_USER else None,
                    headers={'Message-ID': make_message_id()},
                    connection=connection,
                )
                try:
                    message.send(fail_silently=False)
                    self.stdout.write(self.style.SUCCESS(f'Sent to {recipient}.'))
                except SEND_ERRORS as exc:
                    failures.append(recipient)
                    self.stdout.write(self.style.ERROR(
                        f'FAILED for {recipient}: {type(exc).__module__}.{type(exc).__name__}: {exc}'
                    ))
                self.stdout.flush()
        finally:
            try:
                connection.close()
            except SEND_ERRORS:
                pass
            smtplib.SMTP.debuglevel = 0

        if failures:
            raise CommandError(f'{len(failures)} of {len(recipients)} test email(s) failed: {", ".join(failures)}')
        self.stdout.write(self.style.SUCCESS(
            f'All {len(recipients)} test email(s) accepted by the SMTP server. '
            'If one does not arrive, see "Email troubleshooting" in the README.'
        ))
