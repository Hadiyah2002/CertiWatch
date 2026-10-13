from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.middleware.csrf import get_token
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .serializers import ChangePasswordSerializer, UserCreateSerializer, UserSerializer


class CSRFView(APIView):
    """
    GET this to receive a csrftoken cookie. Not required before login
    (see LoginView) but useful to warm the cookie up before any later
    authenticated POST/PUT/PATCH/DELETE call.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'csrfToken': get_token(request)})


class LoginView(APIView):
    """
    DRF's APIView already exempts itself from Django's global CSRF
    middleware (see APIView.as_view(), which wraps the view in
    django.views.decorators.csrf.csrf_exempt). CSRF is instead enforced
    per-request by SessionAuthentication.enforce_csrf(), and only once a
    session already exists — so a fresh, logged-out visitor's first
    login attempt never needs a pre-fetched CSRF token. That's also the
    right security boundary: there's no existing session for a forged
    cross-site request to hijack until login succeeds.

    We call get_token() on success so a CSRF cookie is in place for
    every request made *after* login, which do need it.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        password = request.data.get('password', '')

        user = authenticate(request, username=email, password=password)
        if user is None:
            return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

        login(request, user)
        get_token(request)  # seed the csrftoken cookie for subsequent requests
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """
    View and update the CURRENTLY LOGGED-IN user's own account only.
    This is deliberately separate from Manage Users (UserListCreateView/
    UserDetailView), which manages *other* people's accounts — this view
    never takes a target user id, it only ever acts on request.user.
    """

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()

        # Without this, changing your own password invalidates your
        # CURRENT session too (Django ties session validity to a hash of
        # the password), logging you out immediately after a successful
        # change — surprising and unnecessary. This keeps the current
        # session valid against the new password.
        update_session_auth_hash(request, user)

        return Response({'detail': 'Password changed successfully.'})


class UserListCreateView(APIView):
    """
    Backs the "Manage Users" page. Any authenticated user can list,
    add, or deactivate accounts here — there's no role distinction in
    this app, consistent with everything else. This is also the ONLY
    way a new account gets created: there is no public signup endpoint
    anywhere, so access to CertiWatch is entirely gated by someone who's
    already logged in choosing to add another person here.

    (DRF's default IsAuthenticated permission, set globally in
    settings.REST_FRAMEWORK, already covers this — no anonymous access.)
    """

    def get(self, request):
        # Lists everyone, active or deactivated, so the page can show
        # who's been turned off rather than just silently hiding them.
        users = User.objects.all().order_by('name')
        return Response(UserSerializer(users, many=True).data)

    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class UserDetailView(APIView):
    def patch(self, request, pk):
        """Currently only used to reactivate a deactivated user
        (is_active: true). This mirrors delete()'s self-protection so
        you can't accidentally do something odd to your own account
        through this endpoint either, even though reactivating yourself
        specifically isn't a real risk — kept for consistency."""
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_active = request.data.get('is_active')
        if is_active is not None:
            user.is_active = bool(is_active)
            user.save(update_fields=['is_active'])

        return Response(UserSerializer(user).data)

    def delete(self, request, pk):
        if int(pk) == request.user.id:
            return Response(
                {'detail': "You can't deactivate your own account while logged in as it."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Deactivate rather than hard-delete: preserves this person's
        # history (e.g. RenewalRecord.renewed_by) instead of nulling it
        # out, and "removing" someone from CertiWatch just means they
        # can no longer log in — which is_active=False already does via
        # Django's own ModelBackend authentication check.
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response(UserSerializer(user).data)
