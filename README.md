# Café com Propósito

Aplicativo devocional cristão baseado no livro *Café com Propósito* (75 capítulos).
O usuário lê ou ouve uma reflexão diária, faz anotações, favorita e compartilha —
"um café com Deus todos os dias".

Este repositório é um **monorepo** com as duas partes do projeto:

| Pasta | O que é | Stack |
|-------|---------|-------|
| [`backend/`](./backend) | API REST + painel administrativo para a autora gerenciar o conteúdo | Django + Django REST Framework |
| [`frontend/`](./frontend) | Aplicativo mobile que consome a API | React Native + Expo + TypeScript |

## Como rodar

Cada parte tem seu próprio README com instruções detalhadas:

- **Backend:** veja [`backend/README.md`](./backend/README.md)
  (resumo: `pip install -r requirements.txt` → `migrate` → `import_planilha` →
  `runserver`). Painel admin em `/admin/`, API em `/api/capitulos/`.
- **Frontend:** veja [`frontend/README.md`](./frontend/README.md)
  (resumo: `npm install` → `npx expo start` → abrir no Expo Go na mesma rede).

> Suba o backend primeiro (`python manage.py runserver 0.0.0.0:8000`). Em
> desenvolvimento, o app detecta o IP da máquina automaticamente.

## Documentação de contexto

- [`backend/CLAUDE.md`](./backend/CLAUDE.md) e [`frontend/CLAUDE.md`](./frontend/CLAUDE.md)
  trazem o contexto de design, regras de domínio e roadmap de cada parte.
- [`backend/DEPLOY-RENDER.md`](./backend/DEPLOY-RENDER.md) — passo a passo de deploy.
