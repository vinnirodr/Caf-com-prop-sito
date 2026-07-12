# Música de fundo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Música de fundo opcional durante a leitura do capítulo — biblioteca cadastrada no admin, o usuário escolhe e liga/desliga, tocando por baixo da narração com ducking e fades, contínua entre capítulos.

**Architecture:** Backend expõe `MusicaFundo` (admin + `GET /api/musicas-fundo/`), espelhando `LembreteTexto`. No app, um `BackgroundMusicContext` (2º player expo-audio em loop, dentro do `AudioProvider`) gerencia tocar/pausar/ducking/fades/continuidade e persiste a preferência. A tela de leitura sinaliza entrar/sair; Ajustes tem o toggle + seletor de faixa.

**Tech Stack:** Django + DRF (backend); React Native 0.85.3 / Expo ~56 / expo-audio / TypeScript / expo-router (frontend).

## Global Constraints

- **Gracioso:** sem faixas cadastradas ou sem faixa escolhida, nada toca e nada quebra; toda chamada de áudio tolera falha (try/catch).
- **Volume:** música sempre ≤ 50% da narração. Alvos: **0.4** (leitura silenciosa) e **0.2** (narração tocando). Narração fica em volume cheio.
- **Fades:** rampa de volume manual (expo-audio não tem fade nativo). Fade-in/out ~1200ms; rampa de ducking ~400ms.
- **Continuidade entre capítulos:** `sairLeitura()` agenda o fade-out+pause em ~600ms; `entrarLeitura()` cancela um agendamento pendente — A→B não reinicia a música (mesmo player, mesma posição).
- **Grátis para todos** (não é premium). Toca em modo silencioso (`playsInSilentMode: true`, já setado no AudioContext).
- **Gates:** frontend `cd frontend && npx tsc --noEmit` (aceitável só o pré-existente `src/components/Field.tsx:38`); backend `cd backend && .venv/bin/python manage.py test content`.
- **Textos em PT**, tokens de `@/theme/ccpTheme`. Node 20 p/ comandos: `source ~/.nvm/nvm.sh && nvm use v20.20.2`.
- **Arquivos compartilhados (hotspots):** `_layout.tsx`, `capitulo/[numero].tsx`, `ajustes.tsx`, `content.ts`, `storage.ts` — em todos, **só ADIÇÃO**; não mexer no que já existe (usePremium, getTotalCapitulos, etc.).

---

### Task 1: Backend — model `MusicaFundo` + endpoint + admin + teste

**Files:**
- Modify: `backend/content/models.py` (append model)
- Modify: `backend/content/serializers.py` (append serializer)
- Modify: `backend/content/views.py` (append view + import)
- Modify: `backend/content/urls.py` (append route)
- Modify: `backend/content/admin.py` (append admin + import)
- Create: migration (via `makemigrations`)
- Test: `backend/content/tests.py` (create if absent)

**Interfaces:**
- Produces: `GET /api/musicas-fundo/` → `Paginated` de `{ id, titulo, url, ordem }` (só `ativa=True`, por `ordem`).

- [ ] **Step 1: Escrever o teste que falha** — em `backend/content/tests.py` (crie o arquivo se não existir):

```python
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile

from content.models import MusicaFundo


class MusicaFundoApiTests(TestCase):
    def test_lista_so_ativas_com_url(self):
        MusicaFundo.objects.create(
            titulo="Piano suave",
            arquivo=SimpleUploadedFile("piano.mp3", b"fake-audio"),
            ativa=True,
            ordem=1,
        )
        MusicaFundo.objects.create(
            titulo="Inativa",
            arquivo=SimpleUploadedFile("x.mp3", b"fake"),
            ativa=False,
            ordem=2,
        )
        resp = self.client.get("/api/musicas-fundo/")
        self.assertEqual(resp.status_code, 200)
        results = resp.json()["results"]
        self.assertEqual(len(results), 1)
        item = results[0]
        self.assertEqual(item["titulo"], "Piano suave")
        self.assertIn("url", item)
        self.assertTrue(item["url"])
        self.assertEqual(item["ordem"], 1)
```

- [ ] **Step 2: Rodar o teste — deve falhar** (model/endpoint não existem)

Run: `cd backend && .venv/bin/python manage.py test content.tests.MusicaFundoApiTests -v 2`
Expected: erro de import/404 (`MusicaFundo` inexistente).

- [ ] **Step 3: Model** — append em `backend/content/models.py` (seguir o molde de `LembreteTexto`):

```python
class MusicaFundo(models.Model):
    """Faixa de música de fundo para a leitura. A autora cadastra várias; o app
    lista as ativas e o usuário escolhe uma para tocar por baixo da leitura/narração."""

    titulo = models.CharField("título", max_length=120)
    arquivo = models.FileField("arquivo de áudio", upload_to="musicas/")
    ativa = models.BooleanField(
        "ativa", default=True, help_text="Desmarque para tirar esta faixa do app."
    )
    ordem = models.PositiveIntegerField("ordem", default=0)
    criado_em = models.DateTimeField("criado em", auto_now_add=True)

    class Meta:
        verbose_name = "música de fundo"
        verbose_name_plural = "músicas de fundo"
        ordering = ["ordem", "id"]

    def __str__(self):
        return self.titulo
```

- [ ] **Step 4: Serializer** — append em `backend/content/serializers.py` (`url` relativa, o app absolutiza com `mediaUrl`):

```python
class MusicaFundoSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = MusicaFundo
        fields = ("id", "titulo", "url", "ordem")

    def get_url(self, obj):
        return obj.arquivo.url if obj.arquivo else None
```
E adicione `MusicaFundo` ao import de models no topo (`from .models import ... MusicaFundo ...`).

- [ ] **Step 5: View + rota** — em `backend/content/views.py` (import `MusicaFundo` + `MusicaFundoSerializer`) append:

```python
class MusicaFundoList(generics.ListAPIView):
    serializer_class = MusicaFundoSerializer

    def get_queryset(self):
        return MusicaFundo.objects.filter(ativa=True).order_by("ordem", "id")
```
Em `backend/content/urls.py`, adicione dentro de `urlpatterns`:
```python
    path("musicas-fundo/", views.MusicaFundoList.as_view(), name="musicafundo-list"),
```

- [ ] **Step 6: Admin** — em `backend/content/admin.py` (import `MusicaFundo`) append:

```python
@admin.register(MusicaFundo)
class MusicaFundoAdmin(admin.ModelAdmin):
    list_display = ("titulo", "ativa", "ordem")
    list_display_links = ("titulo",)
    list_editable = ("ativa", "ordem")
```

- [ ] **Step 7: Migration**

Run: `cd backend && .venv/bin/python manage.py makemigrations content`
Expected: cria `content/migrations/000X_musicafundo.py`.

- [ ] **Step 8: Rodar o teste — deve passar**

Run: `cd backend && .venv/bin/python manage.py test content -v 2`
Expected: PASS (inclui o novo teste). Rode também `.venv/bin/python manage.py test` para garantir que nada quebrou.

- [ ] **Step 9: Commit**

```bash
git add backend/content/models.py backend/content/serializers.py backend/content/views.py backend/content/urls.py backend/content/admin.py backend/content/migrations/ backend/content/tests.py
git commit -m "feat(musica-fundo): model MusicaFundo + endpoint /api/musicas-fundo/ + admin"
```

---

### Task 2: Frontend — API `getMusicasFundo` + prefs no storage

**Files:**
- Modify: `frontend/src/api/content.ts` (append tipo + função)
- Modify: `frontend/src/lib/storage.ts` (append KEYS + get/save)

**Interfaces:**
- Consumes (Task 1): `GET /api/musicas-fundo/`.
- Produces: `MusicaFundo` type, `getMusicasFundo()`, `getMusicaFundoPrefs()`, `saveMusicaFundoPrefs()`.

- [ ] **Step 1: `content.ts`** — append (mesmo estilo de `getSpecialPages`/`getLembretes`):

```typescript
export type MusicaFundo = {
  id: number;
  titulo: string;
  url: string | null;
  ordem: number;
};

/** Faixas de música de fundo cadastradas pela autora (endpoint público). */
export const getMusicasFundo = () =>
  apiGet<Paginated<MusicaFundo>>('/musicas-fundo/');
```

- [ ] **Step 2: `storage.ts`** — adicione as chaves em `KEYS` e as funções:

Em `KEYS` (dentro do objeto):
```typescript
  musicaAtiva: 'ccp.musica.ativa',
  musicaFaixaId: 'ccp.musica.faixaId',
```
No fim do arquivo:
```typescript
// Preferência da música de fundo da leitura (local, sem conta).
export type MusicaFundoPrefs = { ativa: boolean; faixaId: number | null };

export async function getMusicaFundoPrefs(): Promise<MusicaFundoPrefs> {
  try {
    const [ativa, faixaId] = await Promise.all([
      AsyncStorage.getItem(KEYS.musicaAtiva),
      AsyncStorage.getItem(KEYS.musicaFaixaId),
    ]);
    return {
      ativa: ativa === '1',
      faixaId: faixaId != null ? Number(faixaId) : null,
    };
  } catch {
    return { ativa: false, faixaId: null };
  }
}

export async function saveMusicaFundoPrefs(prefs: MusicaFundoPrefs): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [KEYS.musicaAtiva, prefs.ativa ? '1' : '0'],
      [KEYS.musicaFaixaId, prefs.faixaId != null ? String(prefs.faixaId) : ''],
    ]);
  } catch {
    // ignora
  }
}
```

- [ ] **Step 3: Type-check** → `cd frontend && npx tsc --noEmit` (sem erros novos).
- [ ] **Step 4: Commit**
```bash
git add frontend/src/api/content.ts frontend/src/lib/storage.ts
git commit -m "feat(musica-fundo): api getMusicasFundo + prefs no storage"
```

---

### Task 3: `BackgroundMusicContext` (motor de áudio) + provider no `_layout`

**Files:**
- Create: `frontend/src/audio/BackgroundMusicContext.tsx`
- Modify: `frontend/src/app/_layout.tsx` (envolver com `<BackgroundMusicProvider>` dentro de `<AudioProvider>`)

**Interfaces:**
- Consumes (Task 2): `getMusicasFundo`, `MusicaFundo`, `getMusicaFundoPrefs`, `saveMusicaFundoPrefs`; `mediaUrl` de `@/api/content`; `useAudioStatus` de `@/audio/AudioContext`.
- Produces: `usarMusicaFundo() → { ativa, alternar, temFaixas, faixas, faixaSelecionada, escolherFaixa, entrarLeitura, sairLeitura }` e `<BackgroundMusicProvider>`.

- [ ] **Step 1: Criar `src/audio/BackgroundMusicContext.tsx`**

```tsx
/**
 * Música de fundo da leitura. 2º player expo-audio (em loop, volume baixo) que toca
 * por baixo da narração enquanto o usuário está num capítulo. Ducking dinâmico +
 * fades + continuidade entre capítulos. Gracioso: sem faixa, nada toca e nada quebra.
 */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useAudioPlayer } from 'expo-audio';
import { getMusicasFundo, mediaUrl, type MusicaFundo } from '@/api/content';
import { getMusicaFundoPrefs, saveMusicaFundoPrefs } from '@/lib/storage';
import { useAudioStatus } from '@/audio/AudioContext';

const VOL_LEITURA = 0.4; // leitura silenciosa
const VOL_DUCK = 0.2; // narração tocando (≤ 50% da narração)
const FADE_MS = 1200;
const DUCK_MS = 400;
const GRACA_SAIR_MS = 600; // janela p/ não reiniciar entre capítulos

type MusicaValue = {
  ativa: boolean;
  temFaixas: boolean;
  faixas: MusicaFundo[];
  faixaSelecionada: MusicaFundo | null;
  alternar: () => void;
  escolherFaixa: (id: number) => void;
  entrarLeitura: () => void;
  sairLeitura: () => void;
};

const MusicaContext = createContext<MusicaValue | undefined>(undefined);

export function BackgroundMusicProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer();
  const narracao = useAudioStatus(); // { tocando, ... }

  const [faixas, setFaixas] = useState<MusicaFundo[]>([]);
  const [ativa, setAtiva] = useState(false);
  const [faixaId, setFaixaId] = useState<number | null>(null);

  const emLeituraRef = useRef(false);
  const rampaRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sairTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const carregadaRef = useRef<number | null>(null); // id da faixa já carregada no player

  const faixaSelecionada = useMemo(
    () => faixas.find((f) => f.id === faixaId) ?? null,
    [faixas, faixaId]
  );

  // Rampa de volume manual (expo-audio não tem fade nativo).
  const rampaVolume = useCallback(
    (para: number, ms: number, aoFim?: () => void) => {
      if (rampaRef.current) clearInterval(rampaRef.current);
      const de = player.volume ?? 0;
      const passos = Math.max(1, Math.round(ms / 40));
      let i = 0;
      rampaRef.current = setInterval(() => {
        i += 1;
        const v = de + (para - de) * (i / passos);
        try {
          player.volume = Math.max(0, Math.min(1, v));
        } catch {
          /* ignora */
        }
        if (i >= passos) {
          if (rampaRef.current) clearInterval(rampaRef.current);
          rampaRef.current = null;
          aoFim?.();
        }
      }, 40);
    },
    [player]
  );

  // Garante a faixa certa carregada no player.
  const garantirCarregada = useCallback(() => {
    if (!faixaSelecionada?.url) return false;
    if (carregadaRef.current !== faixaSelecionada.id) {
      try {
        player.replace({ uri: mediaUrl(faixaSelecionada.url) as string });
        player.loop = true;
        carregadaRef.current = faixaSelecionada.id;
      } catch {
        return false;
      }
    }
    return true;
  }, [faixaSelecionada, player]);

  const alvoDuck = useCallback(
    () => (narracao.tocando ? VOL_DUCK : VOL_LEITURA),
    [narracao.tocando]
  );

  // Começa a tocar com fade-in (se as condições permitirem).
  const iniciar = useCallback(() => {
    if (!ativa || !emLeituraRef.current || !garantirCarregada()) return;
    try {
      player.volume = 0;
      player.play();
      rampaVolume(alvoDuck(), FADE_MS);
    } catch {
      /* ignora */
    }
  }, [ativa, garantirCarregada, player, rampaVolume, alvoDuck]);

  // Para com fade-out.
  const parar = useCallback(() => {
    rampaVolume(0, FADE_MS, () => {
      try {
        player.pause();
      } catch {
        /* ignora */
      }
    });
  }, [player, rampaVolume]);

  // Boot: carrega prefs + faixas.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const [prefs, lista] = await Promise.all([
        getMusicaFundoPrefs(),
        getMusicasFundo().then((r) => r.results).catch(() => [] as MusicaFundo[]),
      ]);
      if (!vivo) return;
      setFaixas(lista);
      setAtiva(prefs.ativa);
      // faixa salva, ou a primeira disponível como padrão
      setFaixaId(prefs.faixaId ?? lista[0]?.id ?? null);
    })();
    return () => {
      vivo = false;
      if (rampaRef.current) clearInterval(rampaRef.current);
      if (sairTimerRef.current) clearTimeout(sairTimerRef.current);
    };
  }, []);

  // Ducking: ao mudar o estado da narração, se está tocando, ramp curto ao novo alvo.
  useEffect(() => {
    if (ativa && emLeituraRef.current && player.playing) {
      rampaVolume(alvoDuck(), DUCK_MS);
    }
  }, [narracao.tocando, ativa, player, rampaVolume, alvoDuck]);

  const entrarLeitura = useCallback(() => {
    if (sairTimerRef.current) {
      clearTimeout(sairTimerRef.current);
      sairTimerRef.current = null;
    }
    emLeituraRef.current = true;
    if (!player.playing) iniciar();
  }, [player, iniciar]);

  const sairLeitura = useCallback(() => {
    if (sairTimerRef.current) clearTimeout(sairTimerRef.current);
    sairTimerRef.current = setTimeout(() => {
      emLeituraRef.current = false;
      sairTimerRef.current = null;
      parar();
    }, GRACA_SAIR_MS);
  }, [parar]);

  const alternar = useCallback(() => {
    setAtiva((prev) => {
      const nova = !prev;
      saveMusicaFundoPrefs({ ativa: nova, faixaId });
      if (nova) {
        if (emLeituraRef.current) iniciar();
      } else {
        parar();
      }
      return nova;
    });
  }, [faixaId, iniciar, parar]);

  const escolherFaixa = useCallback(
    (id: number) => {
      setFaixaId(id);
      saveMusicaFundoPrefs({ ativa, faixaId: id });
      // troca de faixa: fade-out, recarrega, fade-in (se tocando)
      const tocando = player.playing;
      rampaVolume(0, DUCK_MS, () => {
        carregadaRef.current = null; // força recarregar na próxima
        if (ativa && emLeituraRef.current && tocando) {
          // garantirCarregada usa o faixaSelecionada memoizado; adia p/ próximo tick
          setTimeout(() => iniciar(), 0);
        }
      });
    },
    [ativa, player, rampaVolume, iniciar]
  );

  const value = useMemo<MusicaValue>(
    () => ({
      ativa,
      temFaixas: faixas.length > 0,
      faixas,
      faixaSelecionada,
      alternar,
      escolherFaixa,
      entrarLeitura,
      sairLeitura,
    }),
    [ativa, faixas, faixaSelecionada, alternar, escolherFaixa, entrarLeitura, sairLeitura]
  );

  return <MusicaContext.Provider value={value}>{children}</MusicaContext.Provider>;
}

export function usarMusicaFundo(): MusicaValue {
  const c = useContext(MusicaContext);
  if (!c) throw new Error('usarMusicaFundo deve ser usado dentro de <BackgroundMusicProvider>.');
  return c;
}
```

- [ ] **Step 2: Wire no `_layout.tsx`**

Import: `import { BackgroundMusicProvider } from '@/audio/BackgroundMusicContext';`
Envolver **dentro** de `<AudioProvider>` (que já existe), por fora do resto:
```tsx
        <AudioProvider>
          <BackgroundMusicProvider>
            {/* StatusBar + Stack ... tudo que já existe aqui dentro, sem alteração */}
          </BackgroundMusicProvider>
        </AudioProvider>
```
NÃO remover/reordenar nenhuma `Stack.Screen` nem outro provider. Ler o arquivo antes.

- [ ] **Step 3: Type-check** → `cd frontend && npx tsc --noEmit` (sem erros novos). Se `player.volume`/`player.loop` acusarem erro de tipo no expo-audio instalado, ajuste conforme o `.d.ts` real do pacote (ex.: método setter) — mantendo o comportamento.
- [ ] **Step 4: Commit**
```bash
git add frontend/src/audio/BackgroundMusicContext.tsx frontend/src/app/_layout.tsx
git commit -m "feat(musica-fundo): BackgroundMusicContext (ducking, fades, continuidade) + provider"
```

---

### Task 4: Integração na tela de leitura (`capitulo/[numero].tsx`)

**Files:**
- Modify: `frontend/src/app/capitulo/[numero].tsx`

**Interfaces:**
- Consumes (Task 3): `usarMusicaFundo` (`entrarLeitura`, `sairLeitura`, `alternar`, `ativa`, `temFaixas`).

- [ ] **Step 1: Sinalizar entrar/sair (continuidade)** — adicione o import e o efeito de foco:

```tsx
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react'; // se ainda não importado
import { usarMusicaFundo } from '@/audio/BackgroundMusicContext';
```
Dentro do componente:
```tsx
  const musica = usarMusicaFundo();
  useFocusEffect(
    useCallback(() => {
      musica.entrarLeitura();
      return () => musica.sairLeitura();
    }, [musica])
  );
```
(Se `useCallback` já está importado, não duplicar o import.)

- [ ] **Step 2: Atalho inline (ícone de nota musical)** — perto dos controles de leitura (onde já há o botão de tema/"Ouvir"), adicione um `Pressable` que só aparece quando `musica.temFaixas`:

```tsx
{musica.temFaixas && (
  <Pressable
    onPress={musica.alternar}
    hitSlop={8}
    accessibilityRole="button"
    accessibilityLabel={musica.ativa ? 'Desligar música de fundo' : 'Ligar música de fundo'}
    style={styles.musicaBtn}
  >
    <Ionicons
      name={musica.ativa ? 'musical-notes' : 'musical-notes-outline'}
      size={20}
      color={musica.ativa ? t.palette.douradoAmanhecer : t.ui.textoSuave}
    />
  </Pressable>
)}
```
Ler o arquivo para achar a linha dos controles e um estilo vizinho para `musicaBtn` (reusar padding/área de toque ≥44px de um botão existente; usar tokens, sem cor nova crua). `Ionicons` e `t` (useTheme) já estão no arquivo.

- [ ] **Step 3: Type-check** → `cd frontend && npx tsc --noEmit` (sem erros novos).
- [ ] **Step 4: Commit**
```bash
git add "frontend/src/app/capitulo/[numero].tsx"
git commit -m "feat(musica-fundo): tela de leitura sinaliza entrar/sair + atalho inline"
```

---

### Task 5: Controles em Ajustes (`ajustes.tsx`)

**Files:**
- Modify: `frontend/src/app/ajustes.tsx`

**Interfaces:**
- Consumes (Task 3): `usarMusicaFundo` (`ativa`, `alternar`, `temFaixas`, `faixas`, `faixaSelecionada`, `escolherFaixa`).

- [ ] **Step 1: Bloco "Música de fundo"** — ler `ajustes.tsx` para reusar o componente `Switch` local e o padrão de "card/seção" já usado (o de notificações/lembrete). Adicionar uma seção:
  - Título "Música de fundo".
  - `Switch` mestre: `on={musica.ativa}` `onPress={musica.alternar}` `label="Música de fundo na leitura"`. Desabilitar/ocultar visualmente quando `!musica.temFaixas`.
  - Se `musica.temFaixas`: uma lista das `musica.faixas` — cada item um `Pressable` (título + check quando `musica.faixaSelecionada?.id === f.id`) chamando `musica.escolherFaixa(f.id)`.
  - Se `!musica.temFaixas`: texto suave "Nenhuma faixa disponível ainda."
  - Import: `import { usarMusicaFundo } from '@/audio/BackgroundMusicContext';` e `const musica = usarMusicaFundo();` no componente.
  - Usar tokens/estilos já presentes no arquivo (nada de cor nova crua). Textos em PT, acolhedores.

- [ ] **Step 2: Type-check** → `cd frontend && npx tsc --noEmit` (sem erros novos).
- [ ] **Step 3: Commit**
```bash
git add frontend/src/app/ajustes.tsx
git commit -m "feat(musica-fundo): controles em Ajustes (liga/desliga + escolher faixa)"
```

---

### Task 6: Fecho — gates finais + COORDENACAO + PR

**Files:**
- Modify: `COORDENACAO.md`

- [ ] **Step 1: Gates finais**
- `cd backend && .venv/bin/python manage.py test` → tudo verde.
- `cd frontend && npx tsc --noEmit` → só `Field.tsx:38`.

- [ ] **Step 2: `COORDENACAO.md`** (nova entrada no topo do Log):
```markdown
### 2026-07-12 · 💻 LOCAL · Música de fundo
- **Backend:** model `MusicaFundo` + `GET /api/musicas-fundo/` + admin (autora cadastra faixas).
- **App:** `BackgroundMusicContext` (2º player expo-audio, ducking 0.4/0.2, fades, contínua entre
  capítulos via debounce). Controles em **Ajustes** (liga/desliga + escolher faixa) e atalho na
  leitura. Grátis; toca por baixo da narração.
- **Hotspots (só adição):** `_layout.tsx` (BackgroundMusicProvider), `capitulo/[numero].tsx`,
  `ajustes.tsx`, `content.ts`, `storage.ts`.
- **Depende de dados:** a autora precisa subir faixas no admin (e R2 em prod p/ o arquivo persistir).
```

- [ ] **Step 3: Commit + push + PR**
```bash
git add COORDENACAO.md
git commit -m "docs(coordenacao): log da música de fundo"
git push -u origin claude/musica-fundo
gh pr create --base main --title "feat(musica-fundo): música de fundo na leitura (admin + ducking + fades)" --body "Música de fundo opcional na leitura: biblioteca cadastrada no admin, o usuário escolhe e liga/desliga (Ajustes + atalho na leitura), tocando por baixo da narração com ducking (0.4/0.2), fades e continuidade entre capítulos. Grátis. Backend: model MusicaFundo + /api/musicas-fundo/. Ver docs/superpowers/plans/2026-07-12-musica-fundo.md."
```

---

## Notas de execução
- **Branch:** já estamos em `claude/musica-fundo` (base main atual, com #35). Não recriar.
- **Sem Jest no front:** gate = `tsc`. Backend usa Django tests (`content`).
- **expo-audio:** o 2º player mixa com a narração (mesma sessão do app). Se `player.volume`/`.loop`
  precisarem de API diferente na versão instalada, ajustar mantendo o comportamento (fade/loop).
- **Teste real** (fade/ducking/continuidade) só num build com faixas cadastradas no admin.
