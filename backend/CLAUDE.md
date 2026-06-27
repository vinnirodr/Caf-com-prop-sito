# Café com Propósito — Backend (Django)

> Contexto persistente para o Claude Code. Leia antes de qualquer tarefa.

## O que é o projeto
Aplicativo devocional cristão baseado no livro *Café com Propósito*, de Marinilde
Rodrigues Gregório (75 capítulos). O usuário lê ou ouve uma reflexão por dia, faz
anotações, favorita e compartilha. Este repositório é o **backend**: API REST para
o app + **painel administrativo** para a autora (pessoa não-técnica) gerenciar
conteúdo, áudios e imagens.

O app mobile (React Native/Expo) vive em repositório separado e consome esta API.

## Stack
- Python + **Django** + **Django REST Framework**
- **Django Admin** como painel da autora
- Banco: SQLite em dev; **PostgreSQL** em produção (via `DATABASE_URL`)
- Deploy: **Render** (`render.yaml` + `build.sh` na raiz)
- Armazenamento de mídia: local em dev; **nuvem (Cloudflare R2) ainda a configurar** para produção

## Estrutura
- `content/` — app principal: modelos `Chapter` e `SpecialPage`, admin, serializers,
  views (API), e o comando `import_planilha`.
- `engagement/` — dados do usuário: `Note`, `Favorite`, `ReadingProgress`.
- `cafe_backend/` — settings, urls, wsgi.
- `dados/` — a planilha-modelo com os 75 capítulos (fonte de carga inicial).

## Regras de domínio (IMPORTANTES)
- O livro tem **75 capítulos**, cada um no **molde de 8 partes**: número, título,
  versículo-chave (texto + referência), reflexão, oração, aplicação prática,
  frase para guardar no coração, referências complementares.
- **Monetização (regra de áudio):** no plano gratuito o áudio é liberado **apenas
  nos Capítulos 1 e 2** (`audio_acesso = "free"`); do 3 em diante é **premium**.
  A **leitura de todos os capítulos é sempre livre.**
- O campo `audio` de um capítulo pode estar vazio: o app só mostra "Ouvir" quando
  há áudio. As narrações entram aos poucos, pelo painel.
- Há **páginas especiais** (abertura/encerramento do livro) além dos 75 capítulos.

## Convenções
- Painel admin e `verbose_name` em **português** — a autora usa o admin; mantenha-o
  simples e amigável.
- O importador (`import_planilha`) é **idempotente**: cria o que falta, pula o que
  existe (use `--substituir` para atualizar). Não quebre essa propriedade.
- Nunca commitar segredos. `.env`, `db.sqlite3` e `/media/` estão no `.gitignore`.
- Migrations versionadas no git.

## Comandos
- Rodar: `python manage.py runserver 0.0.0.0:8000`
- Importar conteúdo: `python manage.py import_planilha dados/Cafe-com-Proposito-CONTEUDO-75-capitulos.xlsx`
- Em produção (Render), `build.sh` roda migrate + import + cria o superusuário automaticamente.

## API (consumida pelo app)
- `GET /api/capitulos/` — lista (paginada) de capítulos publicados (público)
- `GET /api/capitulos/<numero>/` — capítulo completo (8 partes) (público)
- `GET /api/paginas-especiais/` — páginas de abertura/encerramento (público)
- `POST /api/auth/registro/` — cria conta, devolve `access`+`refresh`+`user`
- `POST /api/auth/login/` — login por e-mail+senha (JWT)
- `POST /api/auth/refresh/` — renova o access token
- `GET /api/auth/eu/` — dados do usuário logado (requer Bearer)

> Auth: app `accounts` (User padrão + `Profile` com telefone/nascimento),
> JWT via `djangorestframework-simplejwt`. Login por e-mail (username=email).

## Próximos passos (roadmap do backend)
1. ~~**Autenticação do app:** cadastro, login~~ ✅ (app `accounts`, JWT). Falta:
   recuperação de senha (e-mail/SMTP) e login Google/Apple (allauth/OAuth).
2. ~~**Endpoints de usuário:** CRUD de anotações, favoritos e progresso~~ ✅
   (`/api/favoritos/`, `/api/anotacoes/`, `/api/progresso/`, `/api/resumo/`).
3. ~~**Armazenamento em nuvem (Cloudflare R2)**~~ ✅ código pronto (`django-storages`/S3).
   Ativa sozinho quando as variáveis `R2_*` existem (`R2_BUCKET`, `R2_ENDPOINT_URL`,
   `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_DOMAIN`); senão, disco local.
   Falta só criar o bucket/credenciais e setar as env vars no Render.
4. **Fase 2 (monetização):** validação de assinatura (RevenueCat) e regra premium do áudio.

## Lembretes
- O app é centrado em conteúdo e na autora editando aos poucos — priorize um admin
  robusto e uma API estável.
- Materiais de referência (fora do repo): briefing de design system, protótipos de UX,
  arquivo da marca.
