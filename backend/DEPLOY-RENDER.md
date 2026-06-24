# Guia de Deploy no Render — Café com Propósito

Este guia leva o backend do seu computador até o ar, em produção, no Render.
Siga na ordem. Tempo estimado: 20–30 minutos na primeira vez.

> **Pré-requisito:** o projeto já precisa estar no GitHub (repositório
> `Caf-com-prop-sito`). O Render publica a partir do GitHub.

---

## Visão geral do que vamos criar

1. Um **banco de dados PostgreSQL** (gerenciado pelo Render).
2. Um **web service** que roda o Django (a API + o painel admin).
3. As **variáveis de ambiente** (segredos e configurações).
4. A **carga inicial** dos 75 capítulos.
5. (Importante) O **armazenamento de áudios na nuvem**, antes da autora subir narrações.

Já incluí no projeto os arquivos `build.sh` (em `backend/`) e `render.yaml` (na
**raiz do repositório**), que automatizam quase tudo. Como este repositório é um
**monorepo** (`backend/` + `frontend/`), o `render.yaml` usa `rootDir: backend`
para o Render rodar tudo dentro da pasta do backend.

---

## Passo 1 — Subir os arquivos novos para o GitHub

Eu adicionei `build.sh`, `render.yaml` e um ajuste nas configurações. Envie:

```bash
git add -A
git commit -m "Configuração de deploy no Render"
git push
```

---

## Passo 2 — Criar a conta e conectar o GitHub

1. Acesse **render.com** e crie uma conta (pode entrar com o próprio GitHub).
2. No painel, clique em **New +** → **Blueprint**.
3. Conecte sua conta do GitHub e selecione o repositório **Caf-com-prop-sito**.
4. O Render vai detectar o arquivo `render.yaml` e propor criar **dois serviços**:
   o banco `cafe-db` e a API `cafe-com-proposito-api`. Confirme.

> Se preferir o método manual (sem blueprint), veja o "Plano B" no fim do guia.

---

## Passo 3 — Conferir as variáveis de ambiente

O `render.yaml` já configura quase tudo automaticamente:

- `SECRET_KEY` → gerada com segurança pelo próprio Render.
- `DEBUG` → já vem como `False` (correto para produção).
- `DATABASE_URL` → conectada automaticamente ao banco `cafe-db`.

Falta **uma** que você preenche à mão:

- `ALLOWED_HOSTS` → assim que o serviço subir, o Render te dá uma URL parecida com
  `cafe-com-proposito-api.onrender.com`. Copie **só o domínio** (sem o `https://`)
  e cole no valor de `ALLOWED_HOSTS`.

  > Observação: o projeto também detecta o domínio do Render sozinho, mas
  > preencher `ALLOWED_HOSTS` deixa tudo explícito e seguro.

Depois de salvar, o Render refaz o deploy automaticamente.

---

## Passo 4 — Acompanhar o primeiro deploy

Na aba **Logs** do web service, você verá o `build.sh` rodando:
instala dependências, coleta arquivos estáticos e **roda as migrações** do banco.

Quando aparecer algo como "Your service is live", a API está no ar. Teste no navegador:

```
https://SEU-DOMINIO.onrender.com/api/capitulos/
```

(No começo deve retornar uma lista vazia — ainda não importamos o conteúdo.)

---

## Passo 5 — Carregar os 75 capítulos e criar o login da autora

**Boa notícia: isso já acontece sozinho.** A planilha está versionada em
`backend/dados/`, e o `build.sh` roda a cada deploy:

- `import_planilha …` (idempotente — importa os 75 capítulos + páginas especiais);
- `createsuperuser --no-input` (cria a conta da autora a partir das variáveis
  `DJANGO_SUPERUSER_USERNAME/_EMAIL/_PASSWORD`).

Ou seja: defina `DJANGO_SUPERUSER_EMAIL` e `DJANGO_SUPERUSER_PASSWORD` no Render
(o `render.yaml` já pede esses valores) e, no primeiro deploy, conteúdo e login
já ficam prontos. Se algum dia precisar rodar à mão, use a aba **Shell** do web
service:

```bash
python manage.py import_planilha dados/Cafe-com-Proposito-CONTEUDO-75-capitulos.xlsx
python manage.py createsuperuser
```

Pronto: o painel da autora estará em:

```
https://SEU-DOMINIO.onrender.com/admin/
```

---

## Passo 6 (ESSENCIAL antes das narrações) — Áudios na nuvem

No Render, o disco é **efêmero**: arquivos enviados pelo painel admin
(áudios, imagens) **são apagados a cada novo deploy**. Por isso, antes de a autora
começar a subir as narrações em produção, é preciso guardá-las em um
armazenamento de nuvem. Recomendo **Cloudflare R2** (sem taxa de saída, barato).

O esquema é:

1. Criar um bucket no Cloudflare R2 (ou Backblaze B2).
2. Adicionar `django-storages[s3]` ao projeto.
3. Configurar as chaves de acesso como variáveis de ambiente no Render.
4. Apontar o storage de mídia para o bucket.

> Quando você chegar aqui, me avise: eu monto essa configuração exata
> (é cerca de 20 linhas de código + 4 variáveis de ambiente) e te entrego pronta.
> Para a autora **testar localmente**, nada disso é necessário — funciona direto.

---

## Resumo dos custos (fase inicial)

| Item | Plano grátis | Quando pagar |
|------|--------------|--------------|
| Web service (API) | Sim (dorme após inatividade) | ~US$7/mês ao lançar, para não dormir |
| PostgreSQL | Sim | Quando crescer o volume de dados |
| Cloudflare R2 (áudios) | Camada gratuita generosa | Só com muito tráfego |

Dá para validar tudo gastando praticamente zero.

---

## Plano B — Criação manual (sem blueprint)

Se preferir não usar o `render.yaml`:

1. **New + → PostgreSQL** → crie o banco, copie a *Internal Database URL*.
2. **New + → Web Service** → conecte o repositório.
   - Root Directory: `backend`
   - Build Command: `./build.sh`
   - Start Command: `gunicorn cafe_backend.wsgi:application`
3. Em **Environment**, adicione: `SECRET_KEY` (uma chave longa qualquer),
   `DEBUG=False`, `ALLOWED_HOSTS=seu-dominio.onrender.com`,
   `DATABASE_URL=` (a URL do passo 1).
4. Deploy. Depois, Passo 5 acima.

---

## Problemas comuns

- **Erro 400 (Bad Request) ao abrir o site:** falta o domínio em `ALLOWED_HOSTS`.
- **Página do admin sem estilo (sem CSS):** o `collectstatic` não rodou — confira
  o `build.sh` nos logs (o `whitenoise` já está configurado para servir os estáticos).
- **Login do admin recusado em produção:** é o `CSRF_TRUSTED_ORIGINS` — já está
  tratado no projeto, mas exige que o domínio esteja em `ALLOWED_HOSTS`.
- **Áudios sumindo após deploy:** é o disco efêmero — configure o Passo 6.
