from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from certificates.models import (
    Branch,
    Certificate,
    CertificateCategory,
    EmailRecipient,
)


class Command(BaseCommand):
    help = 'Seed the database with branches, categories, users, certificates, and alert recipients for local development.'

    @transaction.atomic
    def handle(self, *args, **options):
        today = timezone.localdate()

        # --- Users -----------------------------------------------------
        # Login is restricted to exactly these two accounts. There is no
        # public registration endpoint anywhere in this app — the only
        # way to add another account is directly via Django admin or the
        # ORM, both of which require existing trusted access.
        users_data = [
            {'email': 'info@arkichem.com', 'name': 'Faisal Alhayan', 'password': 'ChangeMe123!', 'is_staff': True, 'is_superuser': True},
            {'email': 'abdullahalzeer35@gmail.com', 'name': 'Abdullah Fahad Zeer', 'password': 'ChangeMe123!', 'is_staff': True, 'is_superuser': True},
        ]
        users = {}
        for data in users_data:
            data = dict(data)
            email = data.pop('email')
            password = data.pop('password')
            user, created = User.objects.get_or_create(email=email, defaults=data)
            if created:
                user.set_password(password)
                user.save()
            users[email] = user
        self.stdout.write(self.style.SUCCESS(f'Users ready ({len(users)}).'))

        # --- Branches ----------------------------------------------------
        # PLACEHOLDER LOCATIONS: names are real, location strings are
        # reasonable stand-ins — refine via the Branches section as needed.
        branches_data = [
            {'name': 'Head Office (Riyadh)', 'location': 'Riyadh, Saudi Arabia'},
            {'name': 'Jeddah Branch', 'location': 'Jeddah, Saudi Arabia'},
            {'name': 'Dammam Branch', 'location': 'Dammam, Saudi Arabia'},
            {'name': 'Factory Malham', 'location': 'Malham, Saudi Arabia'},
            {'name': 'Khamis Mushait Branch', 'location': 'Khamis Mushait, Saudi Arabia'},
            {'name': 'Madinah Munawwarah Branch', 'location': 'Madinah, Saudi Arabia'},
        ]
        branches = {}
        for data in branches_data:
            branch, _ = Branch.objects.get_or_create(name=data['name'], defaults=data)
            branches[branch.name] = branch
        self.stdout.write(self.style.SUCCESS(f'Branches ready ({len(branches)}).'))

        # --- Categories --------------------------------------------------
        categories_data = [
            {'name': 'Government Certificate', 'description': 'General government-issued certificates.'},
            {'name': 'License', 'description': 'Operating and commercial licenses.'},
            {'name': 'Registration', 'description': 'Company, commercial, or asset registrations.'},
            {'name': 'Permit', 'description': 'Permits authorizing a specific activity.'},
            {'name': 'Municipal Certificate', 'description': 'Certificates issued by local municipalities.'},
            {'name': 'Safety/Compliance Document', 'description': 'Safety, health, and regulatory compliance documents.'},
            {'name': 'Other', 'description': 'Anything not covered by the categories above.'},
        ]
        categories = {}
        for data in categories_data:
            cat, _ = CertificateCategory.objects.get_or_create(name=data['name'], defaults=data)
            categories[cat.name] = cat
        self.stdout.write(self.style.SUCCESS(f'Categories ready ({len(categories)}).'))

        # --- Certificates --------------------------------------------------
        # (name, reference_number, category, branch, issue offset days, expiry offset days, alert_days_before)
        # Offsets are relative to today so the seeded data always lands in
        # a realistic mix of active / expiring_soon / expired, no matter
        # when this command is run.
        #
        # Status (active/expiring_soon/expired) uses THIS certificate's
        # own alert_days_before as its threshold — every certificate can
        # have a different window, and this same value also controls
        # when check_reminders starts sending reminders for it (one
        # unified threshold, not two separate concepts):
        #   - Municipality Operating License (4 days left, 30-day alert),
        #     Import Permit (2 days, 15-day alert), Chamber of Commerce
        #     Membership (50 days, 60-day alert), and Industrial
        #     Operating License (exactly 5 days left with a 7-day alert —
        #     right at its own boundary) all land in expiring_soon.
        #   - Fire Safety Inspection Certificate expires TODAY (offset 0)
        #     — demonstrating that the expiry date itself counts as
        #     expired, not expiring_soon, regardless of alert_days_before.
        certs_data = [
            ('Commercial Registration Certificate', 'CR-1010483920', 'Registration', 'Head Office (Riyadh)', -700, 120, 30),
            ('Municipality Operating License', 'MUN-RUH-2024-0456', 'Municipal Certificate', 'Head Office (Riyadh)', -300, 4, 30),
            ('Civil Defense Safety Certificate', 'CD-RUH-88213', 'Safety/Compliance Document', 'Head Office (Riyadh)', -400, -20, 30),
            ('Chamber of Commerce Membership', 'COC-JED-77341', 'License', 'Jeddah Branch', -200, 50, 60),
            ('Import Permit', 'IMP-2025-009981', 'Permit', 'Jeddah Branch', -150, 2, 15),
            ('Environmental Compliance Certificate', 'ENV-JED-66120', 'Government Certificate', 'Jeddah Branch', -500, -60, 30),
            ('Vehicle Fleet Registration', 'VFR-DMM-334521', 'Registration', 'Dammam Branch', -250, 300, 90),
            ('Fire Safety Inspection Certificate', 'FSI-DMM-2025-112', 'Safety/Compliance Document', 'Dammam Branch', -100, 0, 45),
            ('Zakat & Tax Certificate', 'ZATCA-70012345', 'Government Certificate', 'Dammam Branch', -600, -5, 30),
            ('ISO Quality Management Certificate', 'ISO9001-2023-8834', 'Other', 'Head Office (Riyadh)', -400, 500, 30),
            ('Industrial Operating License', 'IOL-JED-2024-556', 'License', 'Jeddah Branch', -300, 5, 7),
            ('Municipal Building Permit', 'MBP-DMM-2024-9012', 'Municipal Certificate', 'Dammam Branch', -350, 180, 60),
        ]

        created_count = 0
        for name, reference_number, cat_name, branch_name, issue_offset, expiry_offset, alert_days_before in certs_data:
            issue_date = today + timedelta(days=issue_offset)
            expiry_date = today + timedelta(days=expiry_offset)

            cert, created = Certificate.objects.get_or_create(
                name=name,
                branch=branches[branch_name],
                defaults={
                    'reference_number': reference_number,
                    'category': categories[cat_name],
                    'description': f'{name} for {branch_name}.',
                    'issue_date': issue_date,
                    'expiry_date': expiry_date,
                    'alert_days_before': alert_days_before,
                    # status is recalculated from expiry_date in Certificate.save()
                    # regardless of what's passed here.
                },
            )
            if created:
                created_count += 1

        self.stdout.write(self.style.SUCCESS(f'Certificates ready ({created_count} created, {len(certs_data) - created_count} already existed).'))

        # --- Alert Recipients --------------------------------------------
        # These replace per-certificate responsible_user targeting: every
        # active recipient here gets every reminder, managed entirely from
        # the Alert Recipients page.
        email_recipients_data = [
            {'name': 'Faisal Alhayan', 'email': 'info@arkichem.com'},
            {'name': 'Abdullah Fahad Zeer', 'email': 'abdullahalzeer35@gmail.com'},
        ]
        for data in email_recipients_data:
            EmailRecipient.objects.get_or_create(email=data['email'], defaults=data)
        self.stdout.write(self.style.SUCCESS(f'Email recipients ready ({len(email_recipients_data)}).'))

        self.stdout.write(self.style.SUCCESS(
            'Seed complete. Login with info@arkichem.com or abdullahalzeer35@gmail.com, '
            'password ChangeMe123! (change this immediately).'
        ))
