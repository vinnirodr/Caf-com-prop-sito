from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("registro/", views.RegisterView.as_view(), name="auth-registro"),
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("eu/", views.MeView.as_view(), name="auth-eu"),
    path("registrar-token/", views.RegistrarTokenView.as_view(), name="auth-registrar-token"),
]
