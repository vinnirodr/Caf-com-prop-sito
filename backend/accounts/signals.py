"""Cria automaticamente um Profile sempre que um User é criado."""
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Profile


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def criar_perfil(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(usuario=instance)
