"""Mostra o perfil (telefone, nascimento) embutido na tela do usuário no admin."""
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Profile

User = get_user_model()


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name = "perfil"
    verbose_name_plural = "perfil"


class UserAdmin(BaseUserAdmin):
    inlines = [ProfileInline]
    list_display = ("username", "email", "first_name", "last_name", "is_staff")


admin.site.unregister(User)
admin.site.register(User, UserAdmin)
