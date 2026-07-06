"""
Dispara as notificações agendadas cujo horário já venceu.

Em produção quem chama isso é o endpoint interno (via cron do GitHub Actions),
mas este comando é útil para rodar manualmente ou em outro agendador:

    python manage.py enviar_notificacoes_agendadas
"""
from django.core.management.base import BaseCommand

from accounts import push


class Command(BaseCommand):
    help = "Envia as notificações agendadas que já venceram."

    def handle(self, *args, **options):
        enviadas = push.disparar_agendadas()
        self.stdout.write(self.style.SUCCESS(f"{enviadas} notificação(ões) disparada(s)."))
