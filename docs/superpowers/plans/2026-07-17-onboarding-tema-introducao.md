# Onboarding + Tema na leitura + Introdução v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (A) onboarding aparece 1x pra todos com música ambiente; (B) Aparência do app reflete no tema de leitura; (C) Introdução v2 com a estrutura oficial da autora (hub + leitor novo do mock).

**Tech Stack:** Django/DRF (C-backend); RN/Expo/TS (A, B, C-app).

## Global Constraints
- **Gates:** backend `cd backend && .venv/bin/python manage.py test`; frontend `cd frontend && npx tsc --noEmit` (só o pré-existente `Field.tsx:38`). Node 20: `source ~/.nvm/nvm.sh && nvm use v20.20.2`.
- Rotas novas exigem regen dos typed-routes (`npx expo start` ~20s, matar; não commitar `.expo/`).
- Textos PT; tokens/tema (`useTheme`); nunca cravar número de capítulos.
- Ver detalhes de UX no spec: `docs/superpowers/specs/2026-07-17-onboarding-tema-introducao-design.md` + a imagem do mock (hub + leitor).

---

### Task 1 (A): flag v2 + música demo no onboarding
**Files:** Modify `frontend/src/lib/storage.ts` (1 linha), `frontend/src/audio/BackgroundMusicContext.tsx`, `frontend/src/app/onboarding.tsx`.
- [ ] Step 1: em `storage.ts` KEYS: `onboardingDone: 'ccp.onboarding_done'` → `'ccp.onboarding_done_v2'` (só o valor da chave).
- [ ] Step 2: `BackgroundMusicContext`: adicionar `const [demoAtiva, setDemoAtiva] = useState(false)`; `const definirDemo = useCallback((ligar: boolean) => setDemoAtiva(ligar), []);` e mudar:
```ts
const deveTocar =
  (ativa && !!faixaSelecionada && (emLeitura || narracao.faixaAtual != null)) ||
  (demoAtiva && !!faixaSelecionada);
```
Expor `definirDemo` no type `MusicaValue` + no `value` (e deps do memo). Nada mais muda (reconcile cuida do fade).
- [ ] Step 3: `onboarding.tsx`: `import { useFocusEffect } from 'expo-router'`; `import { useCallback } from 'react'` (se faltar); `const musica = usarMusicaFundo();` +
```tsx
useFocusEffect(useCallback(() => {
  musica.definirDemo(true);
  return () => musica.definirDemo(false);
}, [musica.definirDemo]));
```
- [ ] Step 4: tsc; commit `feat(onboarding): flag v2 (mostra 1x pra todos) + música ambiente no onboarding`.

### Task 2 (B): tema do app → tema de leitura
**Files:** Modify `frontend/src/theme/ThemeModeContext.tsx`, `frontend/src/app/capitulo/[numero].tsx` (2 linhas), `frontend/src/app/introducao.tsx` (se ainda existir — o leitor novo da Task 6 já nasce com a regra).
- [ ] Step 1: `ThemeModeContext.definirModo`: após persistir, re-sincronizar o tema de leitura:
```ts
import { saveReadingPrefs } from '@/lib/storage';
// dentro de definirModo(m):
const resolvido = m === 'auto' ? (sistema === 'dark' ? 'dark' : 'light') : m === 'escuro' ? 'dark' : 'light';
saveReadingPrefs({ theme: resolvido === 'dark' ? 'escuro' : 'claro' });
```
(`sistema` já existe no provider; cuidado com closure — usar o valor atual.)
- [ ] Step 2: `capitulo/[numero].tsx`: no init das prefs, o fallback quando `p.theme` ausente vira derivado do app: precisa do `t`/mode — o arquivo NÃO usa useTheme (temas próprios); importar `useResolvedMode` de `@/theme/ThemeModeContext` e usar `const appMode = useResolvedMode();` → default `appMode === 'dark' ? 'escuro' : 'claro'` (em vez do `'claro'` fixo). Não mexer em mais nada.
- [ ] Step 3: tsc; commit `feat(tema): Aparência reflete no tema de leitura (default derivado + resync)`.

### Task 3 (C-back): SpecialPage subtitulo + audio
**Files:** Modify `backend/content/models.py`, `serializers.py`, `admin.py`; migration; Test `content/tests.py`.
- [ ] Step 1 (teste falha): página com subtitulo+audio aparece no `/api/paginas-especiais/` com os 2 campos (audio pode ser null).
- [ ] Step 2: model `SpecialPage` += `subtitulo = models.CharField("subtítulo", max_length=200, blank=True, default="")` e `audio = models.FileField("áudio (narração)", upload_to="paginas/", null=True, blank=True)`. Migration.
- [ ] Step 3: `SpecialPageSerializer.fields` += `subtitulo`, `audio` (audio como SerializerMethodField url relativa: `obj.audio.url if obj.audio else None`).
- [ ] Step 4: admin `SpecialPageAdmin`: exibir/editar os novos campos (list_display += subtitulo).
- [ ] Step 5: testes verdes; commit `feat(introducao): SpecialPage ganha subtitulo + audio`.

### Task 4 (C-back): comando seed_introducao + build.sh
**Files:** Create `backend/content/management/commands/seed_introducao.py`; Modify `backend/build.sh`; Test `content/tests.py`.
- [ ] Step 1 (teste falha): rodar o comando 2x → 5 páginas oficiais publicadas na ordem 1-5 com subtítulos; páginas fora da lista despublicadas; conteúdo editado pela "autora" NÃO é sobrescrito na 2ª execução.
- [ ] Step 2: comando (idempotente; regra: cria com tudo; existente atualiza só ordem/publicado e subtitulo-se-vazio; NUNCA conteudo; fora da lista → publicado=False):
```python
"""Garante a estrutura oficial da Introdução (5 páginas da autora). Idempotente."""
from django.core.management.base import BaseCommand
from content.models import SpecialPage

CARTA_BOAS_VINDAS = """Seja muito bem-vindo(a) ao Café com Propósito: Encontros Diários com Deus.

É uma alegria receber você neste espaço preparado com oração, carinho e amor pela Palavra de Deus. Meu desejo é que cada capítulo seja um momento de pausa em meio à correria da vida, onde você possa fortalecer sua fé, renovar sua esperança e experimentar a presença do Senhor.

O Café com Propósito nasceu do desejo de incentivar pessoas a separarem alguns minutos do dia para estar com Deus. Assim como uma xícara de café aquece o corpo, a Palavra de Deus fortalece a alma e renova o coração.

Este aplicativo foi criado para acompanhar você nessa jornada. Aqui, cada reflexão foi fundamentada nas Escrituras e preparada para aproximá-lo ainda mais de Cristo.

Não tenha pressa. Leia cada capítulo com calma, medite no versículo, faça a oração e permita que o Espírito Santo fale ao seu coração.

Minha oração é que este devocional seja um instrumento de Deus para fortalecer sua caminhada e lembrar, todos os dias, que o Senhor continua cuidando de você.

Seja bem-vindo(a). Que este seja o início de muitos encontros diários com Deus.

Com carinho,
Marinilde Rodrigues Gregório"""

COMECE = """"Não espere o momento perfeito. Deus pode falar com você hoje."

Que hoje seja o primeiro de muitos encontros inesquecíveis com Deus. Toque em Iniciar e comece pelo Capítulo 1 — no seu tempo, com calma e propósito."""

OFICIAIS = [
    (1, "Boas-vindas", "Sua jornada com Deus começa com um simples passo de fé.", CARTA_BOAS_VINDAS, None),
    (2, "Sobre o Livro e a Autora", "Toda grande transformação começa com um encontro na presença de Deus.", None, "Apresentação da Autora"),
    (3, "Como Utilizar o Aplicativo", "Reserve alguns minutos. Deus pode transformar todo o seu dia.", None, "Como Utilizar Este Livro"),
    (4, "Uma Palavra ao Seu Coração", "Nenhum coração chega até aqui por acaso.", None, None),
    (5, "Comece Sua Jornada", "Que hoje seja o primeiro de muitos encontros inesquecíveis com Deus.", COMECE, None),
]
PLACEHOLDER = "Conteúdo em preparo — a autora pode editá-lo aqui no painel. ☕"


class Command(BaseCommand):
    help = "Garante as 5 páginas oficiais da Introdução (não sobrescreve conteúdo editado)."

    def handle(self, *args, **options):
        titulos_oficiais = [t for _, t, _, _, _ in OFICIAIS]
        for ordem, titulo, subtitulo, conteudo, herdar_de in OFICIAIS:
            pagina = SpecialPage.objects.filter(titulo__iexact=titulo).first()
            if pagina:
                pagina.ordem = ordem
                pagina.publicado = True
                if not pagina.subtitulo:
                    pagina.subtitulo = subtitulo
                pagina.save(update_fields=["ordem", "publicado", "subtitulo"])
                self.stdout.write(f"= {titulo} (atualizada)")
                continue
            corpo = conteudo
            if corpo is None and herdar_de:
                origem = SpecialPage.objects.filter(titulo__iexact=herdar_de).first()
                corpo = origem.conteudo if origem else None
            SpecialPage.objects.create(
                titulo=titulo, subtitulo=subtitulo, conteudo=corpo or PLACEHOLDER,
                ordem=ordem, publicado=True,
            )
            self.stdout.write(f"+ {titulo} (criada)")
        fora = SpecialPage.objects.filter(publicado=True).exclude(titulo__in=titulos_oficiais)
        n = fora.update(publicado=False)
        if n:
            self.stdout.write(f"- {n} página(s) fora da estrutura oficial despublicada(s)")
        self.stdout.write(self.style.SUCCESS("Introdução oficial garantida."))
```
- [ ] Step 3: `build.sh`: adicionar `python manage.py seed_introducao` após os imports existentes.
- [ ] Step 4: testes verdes (o teste cobre: 2ª execução não sobrescreve conteúdo editado); commit `feat(introducao): seed_introducao (estrutura oficial da autora) + build.sh`.

### Task 5 (C-app): tipos/API + hub da Introdução
**Files:** Modify `frontend/src/api/content.ts` (SpecialPage += `subtitulo: string; audio: string | null`); Delete `frontend/src/app/introducao.tsx`; Create `frontend/src/app/introducao/index.tsx` (hub); Modify `frontend/src/app/_layout.tsx` (screen `introducao/index` + `introducao/[pagina]` — a [pagina] entra na Task 6; registrar ambas aqui).
- [ ] Hub segue o mock (ver imagem/spec): eyebrow "ANTES DE COMEÇAR" + voltar; hero gradiente `gradients.escuroQuente` com selo (BrandSeal pequeno em quadrado arredondado), título serif "Introdução", sub "Sobre o livro, a autora e o convite"; linha "SUA JORNADA COMEÇA AQUI" + à direita "N páginas · ~X min" (X = total de palavras/200, mínimo 1); lista numerada: círculo com número (1 preenchido dourado, demais outline), título serif, subtítulo suave, chevron; item 1 traz botão pill "Começar". Tocar item i → `router.push('/introducao/' + (i+1))` (1-based). Estados carregando/erro/vazio como o resto do app. Tema-aware (`useTheme`).
- [ ] tsc (com regen de typed-routes) + commit `feat(introducao): hub oficial (índice numerado com subtítulos)`.

### Task 6 (C-app): leitor novo `/introducao/[pagina]`
**Files:** Create `frontend/src/app/introducao/[pagina].tsx`.
- [ ] Leitor segue o mock: topbar voltar + "INTRODUÇÃO" (eyebrow) + botão **Aa** (cicla os FONT_STEPS, persiste via `getReadingPrefs/saveReadingPrefs` fontStep — como no capítulo); fundo: claro = gradiente `#FCF5E7 → #F3E7D0 → #E8D4B4`; tema de leitura derivado/persistido (regra B: `prefs.theme ?? (useResolvedMode()==='dark' ? 'escuro' : 'claro')`; se tema resolvido = 'escuro', fundo `reading.escuro.fundo` sólido e textos `reading.escuro.texto`; 'papel' usa `reading.papel`); ornamento central (círculo com BrandSeal pequeno + linhas horizontais); eyebrow = titulo da página em uppercase espaçado dourado; conteúdo em Lora grande (respeitando fontStep), parágrafos por `\n\s*\n`; rodapé fixo: barra de progresso fina (pagina/N) + linha "Anterior · n de N · Próxima" (Anterior desabilitado na 1ª); botões acima do rodapé: "▷ Ouvir a introdução" (SÓ se `pagina.audio` — toca no player global via `useAudioControls().tocar({numero: 0, titulo}, {uri: mediaUrl(audio)})` e abre `/player`) e botão nota musical (alternar música de fundo, só se `temFaixas`). **Última página:** em vez de "Próxima", CTA primário "Iniciar Capítulo 1" → `router.replace('/capitulo/1')`. Sinaliza `entrarLeitura/sairLeitura` da música (como o capítulo) p/ a música de fundo tocar aqui também.
- [ ] tsc + commit `feat(introducao): leitor oficial (mock) com Aa, áudio condicional e CTA capítulo 1`.

### Task 7: fecho
**Files:** Modify `frontend/src/app/(tabs)/biblioteca.tsx` (subtítulo do card "Sobre o livro, a autora e o convite"), `COORDENACAO.md`.
- [ ] Biblioteca: atualizar o subtítulo do card Introdução; conferir que a rota usada é `/introducao` (hub).
- [ ] Gates finais (backend test + tsc com typed-routes regen). COORDENACAO (topo do Log): entrada resumindo A+B+C (arquivos-chave, seed no build.sh, backlog da autora salvo). Commit + push + `gh pr create` (base main, título `feat: onboarding 1x + tema na leitura + Introdução v2 (estrutura oficial da autora)`). NÃO mergear.

## Notas de execução
- Branch: `claude/onboarding-tema-introducao` (base main 6282f45). Ledger em `.superpowers/sdd/progress.md`.
- O leitor antigo `introducao.tsx` é REMOVIDO na Task 5 (rota vira pasta). Remover a screen antiga do `_layout` e registrar as novas.
- Mock de referência: imagem enviada pelo dono (hub + leitor); tons do DS: `#FCF5E7/#F3E7D0/#E8D4B4`.
