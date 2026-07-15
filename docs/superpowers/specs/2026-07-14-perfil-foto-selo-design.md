# Perfil: foto do usuário + selo Premium + cartão clicável — Design/Spec

## Objetivo
No cartão de perfil (Meu Espaço): tornar o cartão clicável (hoje só mostra "Em breve"),
exibir um **selo "Premium"** quando o usuário é premium, e permitir **trocar a foto** do perfil.

## Decisões (fechadas com o dono)
- **Cartão inteiro → "Dados pessoais" (`/conta`)** ao tocar (substitui o `emBreve`).
- **Trocar foto fica DENTRO de `/conta`** (avatar + botão "Trocar foto"); o cartão do Meu Espaço só
  **exibe** a foto + o selo.
- **Selo Premium = pill "Premium"** (douradinha) ao lado do nome, no cartão.

## Backend (app `accounts`)
- **`Profile.avatar`** = `models.ImageField("foto", upload_to="avatars/", null=True, blank=True)` (mesmo
  storage dos áudios/imagens — R2 em prod). Migration nova.
- **`UserSerializer`** ganha `avatar` (SerializerMethodField → `perfil.avatar.url` relativo ou None; o
  app absolutiza com `mediaUrl`). Adicionar a `Meta.fields`.
- **Endpoint dedicado** `POST /api/auth/avatar/` (em `accounts/views.py` + `accounts/urls.py`):
  - `IsAuthenticated`; `parser_classes = [MultiPartParser, FormParser]`.
  - Lê `request.FILES.get("avatar")`; valida presença; salva em `request.user.perfil.avatar`; responde
    `UserSerializer(request.user).data` (pra o app atualizar o `user`).
  - (Pillow já é dep do django ImageField? Confirmar — se ImageField exigir Pillow e não estiver
    instalado, adicionar `Pillow` ao requirements.)
- Teste: usuário autenticado faz POST multipart com uma imagem → 200, `avatar` no payload não-nulo;
  sem arquivo → 400.

## App (frontend)
- **Dependência:** `npx expo install expo-image-picker` (pra escolher a imagem).
- **Tipo:** `Usuario` ganha `avatar: string | null` (do `/eu/`).
- **API (`src/api/auth.ts`):** `trocarAvatar(uri: string): Promise<Usuario>` — monta `FormData`
  (`avatar` = `{ uri, name, type }`), faz `authFetch` (Bearer; **não** setar Content-Type manualmente —
  deixar o multipart/boundary) para `POST /auth/avatar/`, devolve o `Usuario`.
- **`/conta` (Dados pessoais):** no topo do ScrollView, avatar grande (foto via `mediaUrl(user.avatar)`
  ou a inicial do nome como fallback) + botão/pressable **"Trocar foto"**:
  - `ImagePicker.requestMediaLibraryPermissionsAsync()` (trata negado com Alert gentil);
  - `ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1,1], quality: 0.7 })`;
  - com a URI → `trocarAvatar(uri)` → `atualizarUsuario(user)` (reusa o padrão já existente na tela);
  - estados de carregando/erro (Alert). Sem quebrar o resto da tela.
- **Cartão do Meu Espaço (`(tabs)/meu-espaco.tsx`):**
  - `onPress` do cartão (logado) → `router.push('/conta')` (remove o `emBreve` **só** do cartão; o
    `emBreve` pode continuar existindo se usado em outro lugar — conferir).
  - Avatar: se `user.avatar`, mostra a foto (`Image`/`expo-image` com `mediaUrl`); senão a inicial (atual).
  - **Pill "Premium"** ao lado do nome quando `usePremium().premium` (usa tokens: fundo dourado suave,
    texto café escuro — como os chips já existentes na tela). Import `usePremium`.

## Fora de escopo (YAGNI)
- Crop avançado, câmera ao vivo (só galeria por ora), remover foto (só trocar), avatar de terceiros.

## Verificação
1. Backend: POST `/api/auth/avatar/` autenticado com imagem → 200 + `avatar` no `/eu/`; sem arquivo → 400.
2. App: `/conta` mostra avatar + "Trocar foto" → escolhe imagem → sobe → aparece na hora (conta + cartão
   do Meu Espaço). Cartão do Meu Espaço → toca → abre "Dados pessoais". Pill "Premium" aparece quando
   o usuário é premium (via admin manual ou RevenueCat).
3. `manage.py test` verde; `npx tsc --noEmit` só `Field.tsx:38`.
