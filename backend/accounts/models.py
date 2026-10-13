from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    """
    Standard-auth user. There is intentionally no role/permission-level
    field — every logged-in user has the same access. This model is also
    the source for the "responsible person" dropdown on a Certificate,
    which is used only for notification targeting, not for permissions.
    """

    username = None
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    objects = UserManager()

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name or self.email
