# Perfil: foto + selo Premium + cartão clicável — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Foto de perfil (upload), selo "Premium" no cartão, e cartão de perfil clicável (→ Dados pessoais).

**Architecture:** `Profile.avatar` (ImageField) + `POST /api/auth/avatar/` (multipart). `/eu/` devolve `avatar`. App: `/conta` ganha avatar + "Trocar foto" (expo-image-picker → upload). Cartão do Meu Espaço → `/conta`, exibe a foto e uma pill "Premium".

**Tech Stack:** Django + DRF; React Native/Expo/TS, expo-image-picker.

## Global Constraints
- **Gate back:** `cd backend && .venv/bin/python manage.py test accounts` (e suíte completa verde).
- **Gate front:** `cd frontend && npx tsc --noEmit` — só o pré-existente `src/components/Field.tsx:38`.
- Pillow já instalado (`requirements.txt`), `content` já usa ImageField. Avatar vai pro R2 em prod (storage default).
- Só ADIÇÃO em arquivos compartilhados. Textos PT; tokens de `@/theme/ccpTheme`. Node 20 p/ front.

---

### Task 1: Backend — `Profile.avatar` + serializer + endpoint `POST /avatar/` + migration + teste

**Files:** Modify `backend/accounts/models.py`, `serializers.py`, `views.py`, `urls.py`; migration; Test `tests.py`.

- [ ] **Step 1: Teste que falha** (`accounts/tests.py`):
```python
class AvatarTests(APITestCase):
    def test_upload_avatar(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        # PNG 1x1 mínimo válido
        png = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
               b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
               b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82")
        u = criar_usuario(email="ava@example.com")
        self.client.force_authenticate(user=u)
        img = SimpleUploadedFile("foto.png", png, content_type="image/png")
        resp = self.client.post("/api/auth/avatar/", {"avatar": img}, format="multipart")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertTrue(resp.json()["avatar"])
        u.perfil.refresh_from_db()
        self.assertTrue(u.perfil.avatar)

    def test_sem_arquivo_400(self):
        u = criar_usuario(email="ava2@example.com")
        self.client.force_authenticate(user=u)
        resp = self.client.post("/api/auth/avatar/", {}, format="multipart")
        self.assertEqual(resp.status_code, 400)
```
- [ ] **Step 2: Rodar — falha** (endpoint/campo não existem).
- [ ] **Step 3: Model** — em `accounts/models.py`, no `Profile` (após `notificacoes_ativas` ou perto):
```python
    avatar = models.ImageField("foto", upload_to="avatars/", null=True, blank=True)
```
- [ ] **Step 4: Serializer** — em `UserSerializer` (`accounts/serializers.py`):
```python
    avatar = serializers.SerializerMethodField()

    def get_avatar(self, obj):
        perfil = getattr(obj, "perfil", None)
        return perfil.avatar.url if (perfil and perfil.avatar) else None
```
+ `"avatar"` em `Meta.fields`.
- [ ] **Step 5: View + URL** — em `accounts/views.py` (imports: `MultiPartParser, FormParser` de `rest_framework.parsers`; `IsAuthenticated`; `APIView` ou `views`), append:
```python
class AvatarView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        arquivo = request.FILES.get("avatar")
        if not arquivo:
            return Response({"detail": "Envie uma imagem em 'avatar'."}, status=status.HTTP_400_BAD_REQUEST)
        perfil = request.user.perfil
        perfil.avatar = arquivo
        perfil.save(update_fields=["avatar"])
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)
```
Em `accounts/urls.py`: `path("avatar/", views.AvatarView.as_view(), name="auth-avatar")` (fica em `/api/auth/avatar/`).
- [ ] **Step 6: Migration** — `cd backend && .venv/bin/python manage.py makemigrations accounts`.
- [ ] **Step 7: Rodar — passa** — `manage.py test accounts` + `manage.py test` (completo).
- [ ] **Step 8: Commit**
```bash
git add backend/accounts/models.py backend/accounts/serializers.py backend/accounts/views.py backend/accounts/urls.py backend/accounts/migrations/ backend/accounts/tests.py
git commit -m "feat(perfil): Profile.avatar + POST /api/auth/avatar/ + avatar no /eu/"
```

---

### Task 2: App — expo-image-picker + tipo `avatar` + `trocarAvatar`

**Files:** Modify `frontend/package.json` (expo install), `frontend/src/api/auth.ts`.

- [ ] **Step 1: Dep** — `cd frontend && source ~/.nvm/nvm.sh && nvm use v20.20.2 && npx expo install expo-image-picker`.
- [ ] **Step 2: Tipo** — em `auth.ts`, `Usuario` ganha `avatar: string | null;`.
- [ ] **Step 3: API `trocarAvatar`** — em `auth.ts` (usa o `authFetch`/Bearer já existente; NÃO setar Content-Type):
```typescript
export async function trocarAvatar(uri: string): Promise<Usuario> {
  const nome = uri.split('/').pop() || 'avatar.jpg';
  const match = /\.(\w+)$/.exec(nome);
  const tipo = match ? `image/${match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase()}` : 'image/jpeg';
  const form = new FormData();
  form.append('avatar', { uri, name: nome, type: tipo } as unknown as Blob);
  const res = await authFetch('/auth/avatar/', { method: 'POST', body: form });
  if (!res.ok) throw new ApiError(res.status, {}, 'Não foi possível enviar a foto.');
  return (await res.json()) as Usuario;
}
```
(Confirmar a assinatura de `authFetch` em `auth.ts` — se ele injeta Content-Type JSON por padrão, garantir que p/ FormData ele NÃO force `application/json`. Ajustar `authFetch` p/ só setar JSON quando o body não é FormData, se necessário.)
- [ ] **Step 4: tsc** — `npx tsc --noEmit` (só Field.tsx:38).
- [ ] **Step 5: Commit**
```bash
git add frontend/package.json frontend/package-lock.json frontend/src/api/auth.ts
git commit -m "feat(perfil): expo-image-picker + tipo avatar + trocarAvatar"
```

---

### Task 3: App — avatar + "Trocar foto" em `/conta`

**Files:** Modify `frontend/src/app/conta.tsx`.

- [ ] **Step 1: Avatar + trocar** — no topo do ScrollView de `conta.tsx`, antes dos Fields, adicionar um avatar (foto via `mediaUrl(user?.avatar)` de `@/api/content`, ou a inicial do nome como fallback) + um Pressable "Trocar foto":
  - Import `* as ImagePicker from 'expo-image-picker'`, `mediaUrl` de `@/api/content`, `trocarAvatar` de `@/api/auth`, `Image` de `expo-image` (ou react-native Image).
  - Handler:
    ```tsx
    const escolherFoto = async () => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permissão necessária', 'Autorize o acesso às fotos para trocar sua imagem.'); return; }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (r.canceled || !r.assets?.[0]) return;
      try {
        const atualizado = await trocarAvatar(r.assets[0].uri);
        atualizarUsuario(atualizado);
      } catch { Alert.alert('Ops', 'Não foi possível enviar a foto. Tente de novo.'); }
    };
    ```
  - UI: círculo com a foto (ou inicial) + "Trocar foto" abaixo. Tokens do ccpTheme; alvo ≥44px.
- [ ] **Step 2: tsc** — `npx tsc --noEmit`.
- [ ] **Step 3: Commit**
```bash
git add frontend/src/app/conta.tsx
git commit -m "feat(perfil): avatar + Trocar foto em Dados pessoais"
```

---

### Task 4: App — cartão do Meu Espaço: → /conta + foto + pill Premium

**Files:** Modify `frontend/src/app/(tabs)/meu-espaco.tsx`.

- [ ] **Step 1** — em `meu-espaco.tsx`:
  - Import `usePremium` de `@/subscription/PremiumContext`, `mediaUrl` de `@/api/content`, `Image` (expo-image). `const { premium } = usePremium();`
  - **Cartão `onPress` (logado):** trocar `emBreve` por `() => router.push('/conta')`. (Manter `emBreve` se ainda for usado em outro lugar; senão pode remover.)
  - **Avatar:** se `user?.avatar`, renderizar `<Image source={{ uri: mediaUrl(user.avatar) }} style={styles.avatar} />` no lugar da inicial; senão a inicial atual.
  - **Pill "Premium":** ao lado do `profileName`, quando `premium`, um `<View style={styles.premiumPill}><Text style={styles.premiumPillText}>Premium</Text></View>` (fundo `palette.douradoSuave`/dourado suave, texto café escuro — como os `chip`/`chipText` já no arquivo). Layout: nome + pill numa linha (flexDirection row, gap, wrap).
- [ ] **Step 2: tsc** — `npx tsc --noEmit`.
- [ ] **Step 3: Commit**
```bash
git add "frontend/src/app/(tabs)/meu-espaco.tsx"
git commit -m "feat(perfil): cartão -> Dados pessoais + foto + selo Premium"
```

---

### Task 5: Fecho — gates + COORDENACAO + PR

- [ ] **Step 1: Gates** — `cd backend && .venv/bin/python manage.py test` (verde) + `cd frontend && npx tsc --noEmit` (só Field.tsx:38).
- [ ] **Step 2: COORDENACAO.md** (topo do Log):
```markdown
### 2026-07-14 · 💻 LOCAL · Perfil: foto + selo Premium + cartão clicável
- Backend: `Profile.avatar` + `POST /api/auth/avatar/` (multipart) + `avatar` no `/eu/`. Migration.
- App: expo-image-picker; `/conta` com avatar + "Trocar foto"; cartão do Meu Espaço → Dados pessoais,
  exibe a foto e a pill "Premium". Hotspots (só adição): accounts/{models,serializers,views,urls},
  meu-espaco.tsx, conta.tsx, auth.ts.
```
- [ ] **Step 3: Commit + push + PR**
```bash
git add COORDENACAO.md
git commit -m "docs(coordenacao): log de perfil (foto + selo)"
git push -u origin claude/perfil-foto-selo
gh pr create --base main --title "feat(perfil): foto do usuário + selo Premium + cartão clicável" --body "Foto de perfil (upload via /conta), selo Premium no cartão do Meu Espaço, e cartão clicável (→ Dados pessoais). Ver docs/superpowers/plans/2026-07-14-perfil-foto-selo.md."
```

---

## Notas de execução
- **Branch:** já em `claude/perfil-foto-selo` (base main 11d2b1d).
- **authFetch + FormData:** CONFIRMADO — `authFetch` (auth.ts:146-152) **não** força `Content-Type` (só adiciona `Authorization: Bearer` + `Accept`). Basta o `trocarAvatar` **não** passar `Content-Type` (o RN preenche o `multipart/form-data; boundary=...` sozinho). Nenhuma mudança no `authFetch` necessária.
- **`/eu/` já devolve premium** (feature Assinaturas na main) — a pill usa `usePremium()` que combina backend+RC.
