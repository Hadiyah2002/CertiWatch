import logging
import smtplib
import socket
from email.utils import make_msgid

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.html import escape

from certificates.models import Certificate, EmailRecipient, Notification, ReminderLog

logger = logging.getLogger(__name__)

REPEAT_INTERVAL_DAYS = 7


def build_status_line(certificate):
    """The one place 'how many days until/since expiry' gets turned into
    words. Every channel's message goes through this, so there's no way
    for one channel to say "expiring soon" while another shows a
    confusing negative day count for the same certificate."""
    days = certificate.days_until_expiry
    if days >= 0:
        return 'expiring soon today' if days == 0 else f'expiring soon in {days} days'
    return f'expired {abs(days)} days ago'


def build_reminder_message(certificate, condensed=False):
    """
    Shared by both reminder channels (_send_email and _send_website) so
    email and website notifications can never drift into inconsistent
    wording again.

    condensed=False (default, used for email) produces:
        Certificate: {name}
        Reference Number: {reference_number}
        Expiry Date: {dd-mm-yyyy}
        {status_line}
        This certificate is within its alert window and requires attention.

    condensed=True (used for the website Notification) produces a
    single line instead — Notification.message is a short CharField
    and the certificate name is already shown separately above the
    message in the notification bell dropdown, so repeating the full
    multi-line block there would be both redundant and, for a
    long-named certificate, at real risk of exceeding the field's
    length limit.
    """
    status_line = build_status_line(certificate)
    expiry_display = certificate.expiry_date.strftime('%d-%m-%Y')

    if condensed:
        return (
            f'{certificate.name} (Ref: {certificate.reference_number}) — {status_line}. '
            f'Expiry date: {expiry_display}.'
        )

    return (
        f'Certificate: {certificate.name}\n'
        f'Reference Number: {certificate.reference_number}\n'
        f'Expiry Date: {expiry_display}\n'
        f'{status_line}\n'
        f'This certificate is within its alert window and requires attention.'
    )


# Everything a single SMTP send can raise. OSError covers socket errors,
# connection refused and timeouts (socket.timeout is listed for clarity).
SEND_ERRORS = (
    smtplib.SMTPRecipientsRefused,
    smtplib.SMTPAuthenticationError,
    smtplib.SMTPException,
    socket.timeout,
    OSError,
)


def make_message_id():
    """Message-ID on the sending mailbox's domain (e.g. arkichem.com).
    Django's default uses this machine's hostname (a laptop name when
    run locally), which spam filters penalize."""
    user = settings.EMAIL_HOST_USER
    if '@' in user:
        return make_msgid(domain=user.rsplit('@', 1)[1])
    return make_msgid()


def _build_alert_html(certificate, status_line, link):
    """Simple HTML alternative: inline styles only, no images."""
    status_color = '#dc2626' if certificate.days_until_expiry < 0 else '#d97706'
    rows = [
        ('Certificate', certificate.name),
        ('Reference Number', certificate.reference_number),
        ('Category', certificate.category.name),
        ('Branch', certificate.branch.name),
        ('Expiry Date', certificate.expiry_date.strftime('%d-%m-%Y')),
    ]
    rows_html = ''.join(
        '<tr>'
        f'<td style="padding:6px 16px 6px 0;color:#6b7280;white-space:nowrap;vertical-align:top;">{escape(label)}</td>'
        f'<td style="padding:6px 0;color:#111827;">{escape(value)}</td>'
        '</tr>'
        for label, value in rows
    )
    return (
        '<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f9fafb;'
        'font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111827;">'
        '<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;'
        'border-radius:8px;padding:24px;">'
        '<p style="margin:0 0 4px;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;'
        'color:#0b4d3b;font-weight:bold;">CertiWatch Alert</p>'
        f'<h1 style="margin:0 0 8px;font-size:18px;color:#111827;">{escape(certificate.name)}</h1>'
        f'<p style="margin:0 0 16px;font-weight:bold;color:{status_color};">{escape(status_line)}</p>'
        f'<table style="border-collapse:collapse;margin:0 0 16px;">{rows_html}</table>'
        '<p style="margin:0 0 20px;color:#374151;">'
        'This certificate is within its alert window and requires attention.</p>'
        f'<a href="{escape(link)}" style="display:inline-block;background:#0b4d3b;color:#ffffff;'
        'text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:bold;">View certificate</a>'
        '</div></body></html>'
    )


def send_alert_email(certificate, recipients):
    """
    Send the expiry alert for one certificate, as one separate message per
    recipient over a single SMTP connection (opened once, closed at the end).

    `recipients` is any iterable of email addresses, from any domain. They
    have nothing to do with the sender, which comes only from .env
    (DEFAULT_FROM_EMAIL / EMAIL_HOST_USER).

    Returns a list of (email, error) pairs; error is None on success. A
    failure for one recipient never stops the others.
    """
    recipients = list(recipients)
    status_line = build_status_line(certificate)
    subject = f'CertiWatch Alert: {certificate.name} - {status_line}'
    link = f'{settings.FRONTEND_BASE_URL}/certificates/{certificate.id}'
    text_body = f'{build_reminder_message(certificate)}\n\nView certificate: {link}'
    html_body = _build_alert_html(certificate, status_line, link)
    reply_to = [settings.EMAIL_HOST_USER] if settings.EMAIL_HOST_USER else None

    try:
        connection = get_connection(fail_silently=False)
        connection.open()
    except (ValueError, *SEND_ERRORS) as exc:
        # Couldn't connect or log in at all (or TLS and SSL are both on):
        # every recipient fails with the same error.
        return [(email, exc) for email in recipients]

    results = []
    try:
        for email in recipients:
            message = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[email],
                reply_to=reply_to,
                headers={'Message-ID': make_message_id()},
                connection=connection,
            )
            message.attach_alternative(html_body, 'text/html')
            try:
                message.send(fail_silently=False)
                results.append((email, None))
            except SEND_ERRORS as exc:
                results.append((email, exc))
                if isinstance(exc, smtplib.SMTPServerDisconnected) or not isinstance(exc, smtplib.SMTPException):
                    # The connection itself is gone; drop it so the next
                    # recipient's send opens a fresh one.
                    try:
                        connection.close()
                    except SEND_ERRORS:
                        pass
    finally:
        try:
            connection.close()
        except SEND_ERRORS:
            pass
    return results


class Command(BaseCommand):
    help = (
        "Checks every certificate against its own alert_days_before threshold and, "
        "for anything within that window, sends a reminder on each channel — "
        "repeating every 7 days for as long as the certificate stays within its "
        "alert window (not a one-time-only alert). Reminders are sent as email "
        "notifications and website notifications. Safe to run daily via cron. Renewing a "
        "certificate clears its ReminderLog rows so its next expiry cycle starts "
        "sending fresh reminders again."
    )

    def handle(self, *args, **options):
        channels = [ReminderLog.CHANNEL_EMAIL, ReminderLog.CHANNEL_WEBSITE]
        today = timezone.localdate()

        due_count = 0
        sent_count = 0
        skipped_count = 0
        failed_count = 0

        for certificate in Certificate.objects.all():
            # "Crossed its own custom alert threshold" — covers expiring_soon
            # AND expired certificates alike (days_until_expiry <= alert_days_before
            # is true for both; an expired certificate keeps getting reminders
            # every 7 days until it's renewed, at which point ReminderLog is
            # cleared and a fresh cycle begins).
            if certificate.days_until_expiry > certificate.alert_days_before:
                continue

            due_count += 1

            for channel in channels:
                log = ReminderLog.objects.filter(certificate=certificate, channel=channel).first()

                if log is not None:
                    days_since_last_send = (today - timezone.localtime(log.last_sent_at).date()).days
                    if days_since_last_send < REPEAT_INTERVAL_DAYS:
                        # Not due yet — sent within the last 7 days.
                        skipped_count += 1
                        continue

                # Either never sent before, or it's been 7+ days — send now.
                if channel == ReminderLog.CHANNEL_WEBSITE:
                    self._send_website(certificate)
                elif channel == ReminderLog.CHANNEL_EMAIL:
                    if not self._send_email(certificate):
                        # Nobody received it, so leave ReminderLog alone and
                        # the next run retries instead of marking it as sent.
                        failed_count += 1
                        continue

                # update_or_create bumps last_sent_at to now (auto_now=True)
                # whether this is the first send or a 7-day repeat.
                ReminderLog.objects.update_or_create(certificate=certificate, channel=channel)
                sent_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'Done. {due_count} certificate(s) within their alert window, '
            f'{sent_count} reminder(s) sent, {skipped_count} not due yet (sent within the last {REPEAT_INTERVAL_DAYS} days), '
            f'{failed_count} email reminder(s) not delivered to anyone (will retry next run).'
        ))

    def _send_website(self, certificate):
        Notification.objects.create(
            certificate=certificate,
            message=build_reminder_message(certificate, condensed=True),
        )
        self.stdout.write(self.style.SUCCESS(
            f'[website] Notification created for "{certificate.name}".'
        ))

    def _send_email(self, certificate):
        """Returns True if at least one recipient was sent the email."""
        recipients = list(EmailRecipient.objects.filter(is_active=True).values_list('email', flat=True))

        if not recipients:
            self.stdout.write(self.style.WARNING(
                f'[email] No active email recipients configured — nothing to send for "{certificate.name}".'
            ))
            return False

        any_sent = False
        for email, error in send_alert_email(certificate, recipients):
            if error is None:
                any_sent = True
                self.stdout.write(self.style.SUCCESS(f'[email] Sent to {email} for "{certificate.name}".'))
            else:
                self.stdout.write(self.style.ERROR(
                    f'[email] FAILED for {email} ("{certificate.name}"): {type(error).__name__}: {error}'
                ))
                logger.warning(
                    'Failed to send reminder email to %s for certificate %s: %s: %s',
                    email, certificate.id, type(error).__name__, error,
                )
        return any_sent
