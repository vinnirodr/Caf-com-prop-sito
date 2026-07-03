# Spec — Minha Conta (Perfil, senha, e-mail, excluir conta)

- **Data:** 2026-07-02
- **Status:** Aprovado no brainstorming; pronto para o plano de implementação
- **Sub-projeto:** 1 de 2 da "Área da Conta" no Meu Espaço (o outro é `Ajustes`)

## Contexto e objetivo

No Meu Espaço, o item **"Dados pessoais"** hoje é um placeholder (`emBreve`). Este
sub-projeto cria a área **Minha Conta**, onde o usuário logado vê e edita seus
dados, troca a senha, altera o e-mail e pode excluir a conta. A exclusão de conta
também **destrava a publicação na Play Store**, que exige essa opção para apps com
login.

O backend hoje só tem leitura do usuário (`GET /auth/eu/`); este spec adiciona a
escrita.

## Escopo

**Dentro:**
- Editar dados básicos: nome, sobrenome, telefone, data de nascimento.
- Trocar senha (senha atual + nova).
- Alterar e-mail (gated por senha atual, **sem** verificação por e-mail na v1).
- Excluir conta (gated por senha, exclusão imediata).

**Fora (outros sub-projetos):**
- Ajustes/Configurações (notificações, Termos/Política, Sobre, tema) → spec seguinte.
- Verificação de posse do novo e-mail → entra junto com a infra de e-mail
  (sub-projeto de recuperação de senha).

## Backend (app `accounts`)

Segue o padrão atual (views DRF + serializers + JWT `simplejwt`). Modelo: Django
`User` padrão com `username = email`; dados extras no `Profile` (OneToOne).

### Endpoints

| Endpoint | Método | Body | Comportamento |
|---|---|---|---|
| `/auth/eu/` | `PATCH` | `nome, sobrenome, telefone, data_nascimento` (todos opcionais) | Edita dados básicos. `MeView` vira `RetrieveUpdateAPIView`. `email` é read-only aqui. Retorna o usuário atualizado (`UserSerializer`). |
| `/auth/trocar-senha/` | `POST` | `senha_atual, nova_senha` | Valida `check_password(senha_atual)`; roda `validate_password(nova_senha)`; `set_password` + save. Retorna 200. |
| `/auth/trocar-email/` | `POST` | `novo_email, senha_atual` | Valida a senha; checa unicidade (`email__iexact`, excluindo o próprio); atualiza `email` **e** `username`. Retorna o usuário atualizado. |
| `/auth/excluir-conta/` | `POST` | `senha` | Valida a senha; `user.delete()`. Retorna 204. |

Todos exigem autenticação (`IsAuthenticated`), exceto o que já é público. Operações
sensíveis (`trocar-email`, `excluir-conta`) exigem reconfirmar a **senha atual**.

### Serializers

- `UserSerializer`: tornar `nome`, `sobrenome`, `telefone`, `data_nascimento`
  graváveis (via `source`/`Profile`); `email` e `id` read-only.
- Novos: `TrocarSenhaSerializer`, `TrocarEmailSerializer`, `ExcluirContaSerializer`
  (cada um valida a senha e as regras acima; mensagens de erro em português).

### Exclusão em cascata (confirmado no código)

`Profile` (OneToOne), `Nota`, `Favorito`, `Progresso` já têm `on_delete=CASCADE`
apontando para o usuário. Logo, `user.delete()` remove todos os dados pessoais sem
trabalho extra.

## Frontend (`src/`)

### Rotas / telas (expo-router)

- **`src/app/conta.tsx`** — tela principal "Minha Conta". Acessada trocando o item
  "Dados pessoais" do Meu Espaço de `emBreve` para `rota: '/conta'`; registrar a
  tela no Stack de `src/app/_layout.tsx`.
- **`src/app/conta/senha.tsx`** — sub-tela "Trocar senha".
- **`src/app/conta/email.tsx`** — sub-tela "Alterar e-mail".
  (Sub-telas dedicadas, conforme decidido — não bottom-sheets.)

### Tela "Minha Conta"

- Cabeçalho "Minha Conta" com voltar; `SafeAreaView` + `ScrollView` no padrão atual.
- **Editar dados** com `Field`: Nome, Sobrenome, Telefone, Data de nascimento
  (**máscara de texto DD/MM/AAAA**, sem dependência nativa nova). Botão "Salvar"
  habilitado só quando há mudança; chama `atualizarPerfil()`.
- **E-mail**: `Field` somente-leitura com botão "Alterar" que navega para
  `/conta/email`.
- **Ações sensíveis** (lista estilo Meu Espaço): "Trocar senha" → `/conta/senha`;
  "Alterar e-mail" → `/conta/email`; **"Excluir conta"** (item destrutivo, vermelho)
  → confirmação + prompt de senha.

### Camadas de apoio

- **`src/api/auth.ts`**: `atualizarPerfil(patch)`, `trocarSenha(atual, nova)`,
  `trocarEmail(novo, senha)`, `excluirConta(senha)` — todas via `authFetch`,
  lançando `ApiError` com a mensagem do backend.
- **`src/auth/AuthContext.tsx`**: `atualizarUsuario(user)` (atualiza o `user` em
  memória após editar) e `excluir(senha)` (chama a API e limpa a sessão como o
  `sair()`). Expor ambos no `useAuth()`.

## Fluxo de dados

1. **Editar dados:** tela lê `user` do `AuthContext` → `PATCH /auth/eu/` → resposta
   passa por `atualizarUsuario()` → UI reflete.
2. **Trocar senha:** `/conta/senha` (atual + nova + confirmar) → `POST` → sucesso
   volta para Conta.
3. **Alterar e-mail:** `/conta/email` (novo + senha) → `POST` → `atualizarUsuario()`
   → volta.
4. **Excluir conta:** confirmação destrutiva → prompt de senha → `POST` →
   `excluir()` limpa sessão → redireciona para `/(auth)/entrar`.

## Tratamento de erros

- Reusa o padrão `ApiError` + estados `carregando`/`erro` das telas atuais.
- Erros por campo quando aplicável: "senha atual incorreta", "e-mail já em uso",
  mensagem de senha fraca do `validate_password`.
- Botões desabilitados enquanto carrega e quando os campos obrigatórios faltam.

## Casos de borda

- Após trocar e-mail, `username` acompanha o novo e-mail; JWT atual segue válido
  (o dono do token é o `id`). Sem re-login forçado na v1.
- Trocar senha **não** invalida os tokens JWT atuais na v1 (aceitável; rotação de
  token fica como melhoria futura).
- Excluir conta: cascata confirmada; após excluir, qualquer chamada com o token
  antigo passa a falhar (usuário inexistente) — a sessão já terá sido limpa.

## Testes

- **Backend:** criar `accounts/tests.py` (Django `APITestCase`) — não existe suíte
  hoje, então cobrir só o sensível:
  - exige autenticação nos 4 endpoints;
  - `PATCH /auth/eu/` atualiza os campos e não permite editar `email`;
  - `trocar-senha` rejeita senha atual errada e aceita a correta;
  - `trocar-email` rejeita senha errada e e-mail duplicado; sincroniza `username`;
  - `excluir-conta` rejeita senha errada; com a correta, apaga o usuário e os dados
    relacionados (cascata).
- **Frontend:** sem framework de teste de UI (YAGNI). Verificação **manual no dev
  build** + `tsc --noEmit` passando.

## Critérios de aceite

- Usuário logado consegue: editar dados e ver refletido; trocar a senha e logar com
  a nova; alterar o e-mail e logar com o novo; excluir a conta e ser deslogado, sem
  restar dados pessoais no banco.
- Todos os fluxos com estados de carregando/erro claros, em português caloroso.
- `tsc` passando (fora o erro pré-existente já conhecido em `Field.tsx`).
