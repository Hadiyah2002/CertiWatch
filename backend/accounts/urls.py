from django.urls import path

from . import views

urlpatterns = [
    path('csrf', views.CSRFView.as_view(), name='auth-csrf'),
    path('login', views.LoginView.as_view(), name='auth-login'),
    path('logout', views.LogoutView.as_view(), name='auth-logout'),
    path('me', views.MeView.as_view(), name='auth-me'),
    path('change-password', views.ChangePasswordView.as_view(), name='auth-change-password'),
    path('users', views.UserListCreateView.as_view(), name='auth-users'),
    path('users/<int:pk>', views.UserDetailView.as_view(), name='auth-user-detail'),
]
