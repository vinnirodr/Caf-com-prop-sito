# Spec — Recuperação de senha (código OTP por e-mail)

- **Data:** 2026-07-06
- **Status:** Aprovado no brainstorming; pronto para o plano de implementação
- **Sub-projeto:** #3 do roadmap (recuperação de senha)
- **Coordenação:** base `origin/main` @ `caca138`; branch `claude/recuperacao-senha`.
  Produção = `main` (ver [[sessao-irma-paralela]]).

## Contexto e objetivo

Na tela Entrar, "Esqueci a senha" hoje é placeholder (`emBreve`). Este sub-projeto
implementa a recuperação de senha por **código OTP enviado por e-mail** (via Resend),
tudo dentro do app — sem deep link nem página web. O Django ainda não tem config de
e-mail; este spec adiciona.

## Escopo

**Dentro:**
- Backend: pedir código (`/auth/esqueci-senha/`) + redefinir (`/auth/redefinir-senha/`),
  envio de e-mail via Resend (SMTP), modelo do código, config de e-mail.
- Frontend: tela de recuperação (duas fases) ligada ao "Esqueci a senha".

**Fora (futuro / ops):**
- Verificar um domínio no Resend (o Vinícius fará depois) — só afeta o remetente/
  entregabilidade, não o código. Até lá, `DEFAULT_FROM_EMAIL` usa o remetente de
  teste do Resend (`onboarding@resend.dev`), que só entrega no e-mail dono da conta.
- Deep links / página web de reset. Auto-login após redefinir (o usuário volta ao
  login e entra com a nova senha).

## Fluxo

1. **"Esqueci a senha"** → tela de recuperação, levando o e-mail já digitado (se houver).
2. **Fase 1 (pedir código):** e-mail → `POST /auth/esqueci-senha/` → **sempre 200**
   ("Se o e-mail existir, enviamos um código"). Se o user existe: invalida códigos
   anteriores, cria um novo (6 dígitos), guarda o **hash** com expiração de **20 min**,
   e envia o código por e-mail.
3. **Fase 2 (redefinir):** código + nova senha → `POST /auth/redefinir-senha/` →
   valida o código (existe, não usado, não expirado, tentativas < 5, confere) →
   `validate_password` + `set_password` + marca o código como usado. Sucesso → 200.
4. **Sucesso** → volta pra tela Entrar (e-mail pré-preenchido) pra logar com a nova senha.

## Backend (`accounts`)

### Modelo `PasswordResetCode`
- `usuario` (FK → User, `on_delete=CASCADE`), `code_hash` (CharField), `criado_em`
  (`auto_now_add`), `expira_em` (DateTimeField), `usado` (Bool, default False),
  `tentativas` (PositiveInt, default 0). + migration.
- O código em si (6 dígitos) **nunca** é salvo em claro — só o hash (via
  `django.contrib.auth.hashers.make_password`/`check_password`).

### Módulo `accounts/reset_senha.py` (isola a lógica, testável)
- `solicitar(email)`: acha o user por `email__iexact`; se existe e passou do cooldown
  (últimos 60s), invalida códigos ativos, cria um novo e envia o e-mail. Nunca lança
  se o e-mail não existe (anti-enumeração).
- `redefinir(email, codigo, nova_senha)`: valida o código do user; incrementa
  `tentativas`; em sucesso marca `usado` e troca a senha. Lança
  `CodigoInvalido` (mensagem em português) nos casos ruins.
- `_enviar_email(user, codigo)`: `django.core.mail.send_mail` — assunto e corpo em
  português, caloroso; corpo cita o código e a validade (20 min).

### Endpoints (serializers finos + `AllowAny`)
- `POST /auth/esqueci-senha/` — body `{email}` → **sempre 200**
  `{"detail": "Se o e-mail existir, enviamos um código."}`.
- `POST /auth/redefinir-senha/` — body `{email, codigo, nova_senha}` → 200 em
  sucesso; **400** com mensagem se código inválido/expirado/usado ou senha fraca.

### Config de e-mail (`settings.py`, por env vars)
- Produção: `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`,
  `EMAIL_HOST=smtp.resend.com`, `EMAIL_PORT=587`, `EMAIL_USE_TLS=True`,
  `EMAIL_HOST_USER=resend`, `EMAIL_HOST_PASSWORD=<RESEND_API_KEY>`,
  `DEFAULT_FROM_EMAIL=<env>` (por ora `onboarding@resend.dev`).
- Dev/testes: se `RESEND_API_KEY` vazio → `console.EmailBackend` (não envia de
  verdade; imprime no log). Nos testes, o Django usa `locmem` automaticamente.

## Frontend (`src/`)

- **`src/app/(auth)/recuperar-senha.tsx`** (nova): uma tela com estado `fase`
  (`'pedir'` → `'redefinir'`). Fase 1: campo e-mail + "Enviar código". Fase 2: campos
  código + nova senha + confirmar + "Redefinir senha". Estados carregando/erro no
  padrão das outras telas; textos calorosos.
- **`src/app/(auth)/entrar.tsx`**: o botão "Esqueci a senha" passa de `emBreve` para
  `router.push({ pathname: '/(auth)/recuperar-senha', params: email ? { email } : {} })`.
- **`src/app/_layout.tsx`**: registrar a rota `(auth)/recuperar-senha` se necessário
  (o grupo `(auth)` já é registrado; conferir se precisa de `Stack.Screen`).
- **`src/api/auth.ts`**: `esqueciSenha(email)` e `redefinirSenha(email, codigo, nova_senha)`
  (via `postJson`, lançando `ApiError` com a mensagem do backend).

## Segurança e casos de borda

- **Anti-enumeração:** `/auth/esqueci-senha/` sempre 200, mensagem genérica.
- **Código:** 6 dígitos, guardado como hash, expira em 20 min, **uso único**,
  **máx 5 tentativas** por código (depois invalida).
- **Rate limit:** cooldown de 60s por e-mail no pedido de código (não recria dentro
  da janela; ainda responde 200).
- Conta só-Google (sem senha usável) que pedir reset **define** uma senha — passa a
  poder logar por senha também. Comportamento aceitável e útil.
- Falha no envio de e-mail não deve vazar detalhe nem quebrar o fluxo (loga e segue;
  o pedido responde 200 mesmo assim).

## Testes

- **Backend** (`accounts/tests.py`, email backend `locmem`):
  - pedir código para e-mail existente → 200, 1 código criado, 1 e-mail na `outbox`;
  - pedir código para e-mail inexistente → 200, **nenhum** código, **nenhum** e-mail
    (anti-enumeração);
  - redefinir com código correto → 200, senha trocada (login com a nova funciona);
  - código errado / expirado / já usado → 400, senha inalterada;
  - senha nova fraca → 400.
- **Frontend:** sem framework de UI (YAGNI); verificação manual no dev build + `tsc`
  passando (fora o erro pré-existente conhecido em `Field.tsx:38`).

## Critérios de aceite

- O usuário pede o código, recebe por e-mail, digita código + nova senha e consegue
  logar com a nova senha.
- Respostas não revelam se o e-mail existe; código expira, é de uso único e limita
  tentativas.
- Trocar o `DEFAULT_FROM_EMAIL` (env) por um domínio verificado no futuro NÃO exige
  mudança de código.
- Textos em português, tom caloroso; `tsc` passando; testes de backend verdes.
