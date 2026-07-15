from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("registro/", views.RegisterView.as_view(), name="auth-registro"),
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("google/", views.GoogleLoginView.as_view(), name="auth-google"),
    path("esqueci-senha/", views.EsqueciSenhaView.as_view(), name="auth-esqueci-senha"),
    path("redefinir-senha/", views.RedefinirSenhaView.as_view(), name="auth-redefinir-senha"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("eu/", views.MeView.as_view(), name="auth-eu"),
    path("trocar-senha/", views.TrocarSenhaView.as_view(), name="auth-trocar-senha"),
    path("trocar-email/", views.TrocarEmailView.as_view(), name="auth-trocar-email"),
    path("excluir-conta/", views.ExcluirContaView.as_view(), name="auth-excluir-conta"),
    path("registrar-token/", views.RegistrarTokenView.as_view(), name="auth-registrar-token"),
    path("avatar/", views.AvatarView.as_view(), name="auth-avatar"),
    path("interno/disparar-agendadas/", views.DispararAgendadasView.as_view(), name="interno-disparar-agendadas"),
]
