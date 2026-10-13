from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from accounts.serializers import UserSerializer

from .models import Branch, Certificate, CertificateCategory, EmailRecipient, Notification, RenewalRecord


class BranchSerializer(serializers.ModelSerializer):
    certificate_count = serializers.SerializerMethodField()

    class Meta:
        model = Branch
        fields = ['id', 'name', 'location', 'certificate_count']

    def get_certificate_count(self, obj):
        count = getattr(obj, 'certificate_count', None)
        return count if count is not None else obj.certificates.count()


class CertificateCategorySerializer(serializers.ModelSerializer):
    certificate_count = serializers.SerializerMethodField()

    class Meta:
        model = CertificateCategory
        fields = ['id', 'name', 'description', 'certificate_count']

    def get_certificate_count(self, obj):
        # Present (and cheap) when this instance came from
        # CertificateCategoryViewSet's annotated queryset (list/retrieve).
        # Fall back to a live count otherwise (e.g. right after a
        # create/update, where the returned instance wasn't annotated).
        count = getattr(obj, 'certificate_count', None)
        return count if count is not None else obj.certificates.count()


class CertificateSerializer(serializers.ModelSerializer):
    category = CertificateCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        source='category', queryset=CertificateCategory.objects.all(), write_only=True
    )
    branch = BranchSerializer(read_only=True)
    branch_id = serializers.PrimaryKeyRelatedField(source='branch', queryset=Branch.objects.all(), write_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reference_number = serializers.CharField(
        max_length=100,
        validators=[UniqueValidator(
            queryset=Certificate.objects.all(),
            message='A certificate with this reference number already exists.',
        )],
    )

    class Meta:
        model = Certificate
        fields = [
            'id', 'name', 'reference_number', 'category', 'category_id', 'branch', 'branch_id', 'description',
            'issue_date', 'expiry_date', 'alert_days_before',
            'status', 'status_display', 'days_until_expiry', 'attached_file',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['status', 'created_at', 'updated_at']

    def validate(self, attrs):
        # Falls back to the existing instance's value for whichever date
        # wasn't included in this request, so a PATCH that only changes
        # one of the two dates is still checked against the other's
        # current value rather than skipping validation entirely.
        issue_date = attrs.get('issue_date', getattr(self.instance, 'issue_date', None))
        expiry_date = attrs.get('expiry_date', getattr(self.instance, 'expiry_date', None))
        if issue_date and expiry_date and expiry_date <= issue_date:
            raise serializers.ValidationError({'expiry_date': 'Expiry date must be after the issue date.'})
        return attrs


class RenewalRecordSerializer(serializers.ModelSerializer):
    renewed_by = UserSerializer(read_only=True)

    class Meta:
        model = RenewalRecord
        fields = [
            'id', 'certificate', 'previous_expiry_date', 'new_expiry_date',
            'previous_attached_file', 'renewed_by', 'renewed_at',
        ]
        read_only_fields = ['previous_expiry_date', 'previous_attached_file', 'renewed_by', 'renewed_at']


class EmailRecipientSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailRecipient
        fields = ['id', 'name', 'email', 'is_active', 'created_at']
        read_only_fields = ['created_at']


class NotificationCertificateSerializer(serializers.ModelSerializer):
    """The certificate details a notification card needs, nested so the
    frontend can show structured fields instead of just the message text."""

    days_until_expiry = serializers.IntegerField(read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Certificate
        fields = [
            'id', 'name', 'reference_number', 'expiry_date', 'status',
            'days_until_expiry', 'branch_name', 'category_name',
        ]
        read_only_fields = fields


class NotificationSerializer(serializers.ModelSerializer):
    certificate = NotificationCertificateSerializer(read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'certificate', 'message', 'created_at', 'is_read']
        read_only_fields = ['certificate', 'message', 'created_at']
