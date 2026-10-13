"""
Django settings for CertiWatch.

CertiWatch is a Government Certificate & Compliance Expiry Management
System. This settings file is intentionally kept simple: standard Django
session authentication (no roles/permission tiers), local media storage
(no cloud storage), and PostgreSQL as the database.
"""

import logging
import os
from pathlib import Path
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

_TRUE_VALUES = {'true', '1', 'yes', 'on'}
_FALSE_VALUES = {'false', '0', 'no', 'off', ''}


def env_bool(name, default):
    """Read an env var as a real bool. true/1/yes/on -> True and
    false/0/no/off/empty -> False (any case, whitespace trimmed); unset ->
    default. Anything else is a config mistake and fails loudly rather
    than being silently treated as truthy/falsy."""
    raw = os.environ.get(name)
    if raw is None:
        return default
    value = raw.strip().lower()
    if value in _TRUE_VALUES:
        return True
    if value in _FALSE_VALUES:
        return False
    raise ImproperlyConfigured(
        f'{name}={raw!r} is not a valid boolean. Use true/false, 1/0, yes/no or on/off.'
    )


# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'dev-only-insecure-key')
DEBUG = env_bool('DJANGO_DEBUG', True)

ALLOWED_HOSTS = [
    h.strip() for h in os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if h.strip()
]

# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'corsheaders',

    'accounts',
    'certificates',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'config.middleware.NoCacheApiMiddleware',
]

ROOT_URLCONF = 'config.urls'

# The API deliberately uses URLs with no trailing slash (see accounts/urls.py
# and certificates/urls.py) because the Next.js dev proxy strips trailing
# slashes before forwarding requests, and Django's default APPEND_SLASH
# redirect can't preserve POST data across that redirect. Turning it off
# avoids that failure mode entirely for any future endpoint too.
APPEND_SLASH = False

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# ---------------------------------------------------------------------------
# Database (PostgreSQL)
# ---------------------------------------------------------------------------

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'certiwatch'),
        'USER': os.environ.get('DB_USER', 'certiwatch'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'certiwatch'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

AUTH_USER_MODEL = 'accounts.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ---------------------------------------------------------------------------
# I18N
# ---------------------------------------------------------------------------

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static & Media (local server storage only — no S3/cloud)
# ---------------------------------------------------------------------------

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---------------------------------------------------------------------------
# CORS / CSRF
# In production this app is expected to sit behind the client's own reverse
# proxy on the same domain as the frontend, so cross-site cookie issues
# should not come up. These settings keep local dev (Next.js on :3000,
# Django on :8000) working with cookie-based session auth.
# ---------------------------------------------------------------------------

FRONTEND_ORIGIN = os.environ.get('FRONTEND_ORIGIN', 'http://localhost:3000')

CORS_ALLOWED_ORIGINS = [FRONTEND_ORIGIN]
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [FRONTEND_ORIGIN]

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# ---------------------------------------------------------------------------
# CertiWatch business rules
# ---------------------------------------------------------------------------

# NOTE: the expiring_soon threshold used to be a single global setting
# here. It's now per-certificate (Certificate.alert_days_before), set
# and edited individually on each certificate, so there's no global
# value to configure anymore.

# ---------------------------------------------------------------------------
# Email (used by the `check_reminders` management command)
# ---------------------------------------------------------------------------

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', '').strip()
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '').strip()
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = env_bool('EMAIL_USE_TLS', True)
EMAIL_USE_SSL = env_bool('EMAIL_USE_SSL', False)
if EMAIL_USE_TLS and EMAIL_USE_SSL:
    # Django refuses to send with both on, so every email would fail.
    logging.getLogger(__name__).warning(
        'EMAIL_USE_TLS and EMAIL_USE_SSL are both True, but only one can be on '
        '- every email send will fail. Use port 587 with EMAIL_USE_TLS=True, '
        'or port 465 with EMAIL_USE_SSL=True and EMAIL_USE_TLS=False.'
    )
EMAIL_TIMEOUT = int(os.environ.get('EMAIL_TIMEOUT', '20'))
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER or 'noreply@certiwatch.local').strip()
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# Public address of the frontend, used for the "View certificate" link in
# alert emails. Defaults to the frontend origin used for CORS above.
FRONTEND_BASE_URL = os.environ.get('FRONTEND_BASE_URL', FRONTEND_ORIGIN).strip().rstrip('/')
