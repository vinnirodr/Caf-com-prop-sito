# Música de fundo — Design/Spec

## Objetivo
Permitir uma **música de fundo** opcional durante a leitura do capítulo, para relaxar/concentrar
— tocando **por baixo** da narração de áudio quando ela estiver ativa. A autora cadastra as faixas
no admin; o usuário liga/desliga e escolhe a faixa. Volume da música **sempre ≤ 50%** da narração.

## Decisões (fechadas com o dono)
- **Fonte:** biblioteca de faixas cadastradas no admin Django; o **usuário escolhe** uma.
- **Escopo:** toca **na leitura do capítulo** (leitura silenciosa e por baixo da narração). Fora do
  capítulo, silêncio. **Continua entre capítulos** (A→B) sem reiniciar.
- **Controles:** Ajustes (toggle mestre + escolher faixa) + atalho discreto na tela de leitura.
- **Volume:** **ducking dinâmico** — ~40% na leitura silenciosa, ~20% quando a narração toca, volta
  a ~40% ao pausar. Transições suaves (rampas).
- **Fades:** fade-in ao iniciar, fade-out ao encerrar (~1,2s).
- **Grátis para todos** (não é premium). Toca em modo silencioso, como a narração.

## Backend (Django — `content`)
### Model `MusicaFundo` (`content/models.py`)
- `titulo` (CharField, max 120)
- `arquivo` (FileField, `upload_to="musicas/"`) — arquivo de áudio (mp3/m4a). Mesmo storage do
  áudio dos capítulos (disco em dev; R2 em prod quando configurado).
- `ativa` (BooleanField, default True)
- `ordem` (PositiveIntegerField, default 0)
- `Meta.ordering = ["ordem", "id"]`; `verbose_name`/`verbose_name_plural` em PT; `__str__ = titulo`.
- Admin: registrar em PT (lista com `titulo`, `ativa`, `ordem`; editável `ativa`/`ordem`).
- **Migration** nova.

### API
- `MusicaFundoSerializer` (`content/serializers.py`): `id`, `titulo`, `url` (absoluta do `arquivo`,
  via `request.build_absolute_uri` — espelhar como `Chapter.audio` é exposto), `ordem`.
- `GET /api/musicas-fundo/` (`content/views.py` + `content/urls.py`): lista as `ativa=True`,
  ordenadas por `ordem`. Padrão idêntico a `paginas-especiais` (público, sem auth).

## Frontend
### API (`src/api/content.ts` — só ADIÇÃO, arquivo compartilhado)
- Tipo `MusicaFundo = { id: number; titulo: string; url: string; ordem: number }`.
- `getMusicasFundo(): Promise<Paginated<MusicaFundo>>` — mesmo estilo de `getSpecialPages()`.

### Persistência (`src/lib/storage.ts` — só ADIÇÃO)
- `getMusicaFundoPrefs(): Promise<{ ativa: boolean; faixaId: number | null }>`
- `saveMusicaFundoPrefs(prefs)`. Chave AsyncStorage dedicada (ex.: `@ccp/musica_fundo`).

### `src/audio/BackgroundMusicContext.tsx` (NOVO) — coração da feature
Provider montado **dentro do `AudioProvider`** (precisa observar a narração), e envolvendo a árvore.
- Player: um **2º `useAudioPlayer` (expo-audio)** com `loop = true`, **persistente** (uma instância).
- Estado: `ativa` (bool, persistido), `faixaSelecionadaId` (persistido), `faixas: MusicaFundo[]`
  (carregadas no boot via `getMusicasFundo`), `emLeitura` (contador/flag).
- Hook `usarMusicaFundo() → { ativa, alternar, faixas, faixaSelecionada, escolherFaixa, entrarLeitura, sairLeitura }`.
- **Regra de tocar:** toca quando `ativa && faixaSelecionada && emLeitura`. Senão, pausa (com fade-out).
- **Continuidade entre capítulos:** `sairLeitura()` **não pausa na hora** — agenda o fade-out+pause
  para ~600ms depois (`setTimeout`). `entrarLeitura()` **cancela** um fade-out pendente. Assim A→B
  (unmount de A + mount de B na mesma janela) mantém o **mesmo player tocando, da mesma posição**;
  o fade-out só ocorre quando se sai de vez da leitura.
- **Ducking:** consome o status da narração (do `AudioContext` — `useAudioStatus`/equivalente).
  Alvo de volume = `narracaoTocando ? 0.2 : 0.4`. Mudanças de alvo aplicam **rampa** (~400ms).
- **Fades:** helper `rampaVolume(de, para, ms)` com `setInterval` passo a passo em `player.volume`
  (mesmo padrão da contagem regressiva já usada no projeto). Fade-in 0→alvo (~1,2s) ao começar;
  fade-out alvo→0 (~1,2s) ao encerrar, e só então `player.pause()`.
- **Troca de faixa:** `escolherFaixa(id)` — se tocando, fade-out da atual → troca `player.replace(url)`
  → fade-in da nova. Persistir a escolha.
- **Gracioso:** sem `faixas` → `ativa` efetivo é false, nada toca; `alternar`/picker refletem
  "nenhuma faixa disponível". Falha ao carregar → ignora (try/catch), não trava a leitura.

### `src/app/_layout.tsx` (hotspot)
- Adicionar `<BackgroundMusicProvider>` **dentro** de `<AudioProvider>`, envolvendo o resto.
- ⚠️ Depende do **PR #35 (páginas especiais)** já mergeado (ele também toca `_layout.tsx`).
  Ordem: mergear #35 → basear a implementação na main atualizada.

### `src/app/capitulo/[numero].tsx` (leitura)
- No **foco/mount** chamar `entrarLeitura()`; no **blur/unmount** chamar `sairLeitura()` (usar o
  padrão de foco do expo-router / cleanup do `useEffect`).
- **Atalho inline:** ícone discreto de nota musical (ex.: `musical-notes-outline`) perto dos
  controles de leitura (ao lado de "Ouvir"/tema), que chama `alternar()`; estado visual liga/desliga.
  Ocultar quando não há faixas.
- Já contém `usePremium` (monetização) e `getTotalCapitulos` (149 caps) — só ADIÇÃO, sem mexer nesses.

### `src/app/ajustes.tsx` (config)
- Bloco novo "Música de fundo": um `Switch` mestre (liga/desliga, usa o componente `Switch` local
  já existente na tela) + uma **lista de faixas** (as `faixas`) com seleção (rádio/check) chamando
  `escolherFaixa(id)`. Se não houver faixas: texto "Nenhuma faixa disponível ainda".
- `ajustes.tsx` **não** é tocado pela Tarefa 1 — sem colisão.

## Áudio / mixagem (nota técnica)
- Dois `useAudioPlayer` no mesmo app **mixam** naturalmente (mesma sessão de áudio do app); não é
  o caso de "mixWithOthers" entre apps. Manter `setAudioModeAsync({ playsInSilentMode: true })`
  (já setado no `AudioContext`) para tocar no silencioso.
- A narração fica em volume cheio; a música no alvo (0.4/0.2) — garante o piso "≤ 50% da narração".

## Fora de escopo (YAGNI)
- Música por-capítulo, crossfade entre faixas além do fade simples na troca, download/offline,
  equalização, gating premium, controle de volume por slider (só ducking fixo).

## Verificação
1. Backend: criar 1–2 `MusicaFundo` no admin → `GET /api/musicas-fundo/` retorna as ativas com `url`.
2. App: Ajustes lista as faixas, liga + escolhe; abrir capítulo → música entra com fade-in em ~40%;
   tocar "Ouvir" → música baixa (~20%) suavemente, narração por cima; pausar → volta a ~40%.
3. Navegar cap. A→B → música **continua sem reiniciar** (mesma posição, sem corte).
4. Sair pra Biblioteca → fade-out e para. Voltar a um capítulo → recomeça com fade-in.
5. Sem faixas cadastradas → nada quebra; toggle mostra "nenhuma faixa".
6. `npx tsc --noEmit` limpo (só o pré-existente `Field.tsx:38`). Backend tests passam.
7. Linha no `COORDENACAO.md` ao mergear.
