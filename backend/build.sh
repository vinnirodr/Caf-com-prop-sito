#!/usr/bin/env bash
# Script de build do Render — roda a cada deploy.
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

# Carrega/atualiza os capítulos do livro (fonte: dados/capitulos.json; idempotente,
# preserva áudios/imagens já enviados no painel). O livro está em evolução contínua.
python manage.py import_capitulos dados/capitulos.json || true

# Cria as páginas especiais (abertura/encerramento) da planilha-modelo. SEM --substituir:
# só cria o que falta e pula capítulos já existentes, então não desfaz a carga acima.
python manage.py import_planilha dados/Cafe-com-Proposito-CONTEUDO-75-capitulos.xlsx || true

# Cria o usuário administrador automaticamente, a partir das variáveis de ambiente
# DJANGO_SUPERUSER_USERNAME / _EMAIL / _PASSWORD (não falha se já existir).
python manage.py createsuperuser --no-input || true
