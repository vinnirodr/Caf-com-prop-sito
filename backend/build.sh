#!/usr/bin/env bash
# Script de build do Render — roda a cada deploy.
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

# Carrega os 75 capítulos + páginas especiais (idempotente: pula os já existentes).
python manage.py import_planilha dados/Cafe-com-Proposito-CONTEUDO-75-capitulos.xlsx || true

# Cria o usuário administrador automaticamente, a partir das variáveis de ambiente
# DJANGO_SUPERUSER_USERNAME / _EMAIL / _PASSWORD (não falha se já existir).
python manage.py createsuperuser --no-input || true
