# Fase A — Páginas especiais do livro (introdução/encerramento) — HANDOFF para 💻 LOCAL

> A sessão CLOUD (☁️) explorou o código e escreveu esta especificação. **A Fase A é sua.**
> Boa notícia: **o backend já está 100% pronto — é só frontend.** Nada de model, endpoint,
> serializer ou importador novos.

## Objetivo
Hoje o app mostra só os capítulos numerados. O livro tem **páginas especiais** (abertura,
apresentação da autora, "como utilizar", manifesto, contracapa, etc.) que **não aparecem em
lugar nenhum**. A Fase A traz essas páginas para dentro do app — como leituras avulsas,
sempre livres (sem gate de conta, sem áudio).

## O que JÁ EXISTE (não refazer — só consumir)
| Camada | Onde | Detalhe |
|---|---|---|
| **Model** | `backend/content/models.py:69` `SpecialPage` | `titulo`, `conteudo`, `ordem`, `publicado`; `ordering = ["ordem", "id"]` |
| **Serializer** | `backend/content/serializers.py:32` `SpecialPageSerializer` | expõe `id, titulo, conteudo, ordem` — **o `conteudo` completo já vem na lista** (não precisa de endpoint de detalhe) |
| **Endpoint** | `content/views.py:29` + `content/urls.py:8` | `GET /api/paginas-especiais/` — lista paginada dos `publicado=True`, por `ordem` |
| **Dados** | planilha `dados/…-75-capitulos.xlsx`, aba "Páginas Especiais" | **8 páginas** já preenchidas (abaixo); `import_planilha` cria no deploy (`build.sh`), idempotente |
| **Front (API)** | `frontend/src/api/content.ts:68` `getSpecialPages()` | já retorna `Paginated<SpecialPage>` — **hoje sem uso**. Tipo `SpecialPage` já definido |

As 8 páginas (na ordem): **Frase de Abertura da Obra · Apresentação da Autora · Como Utilizar
Este Livro · Uma Palavra ao Seu Coração · A Inspiração por Trás da Obra · Manifesto · Sobre a
Autora · Contracapa.**

### Confira em 5s (backend local)
```bash
python manage.py import_planilha dados/Cafe-com-Proposito-CONTEUDO-75-capitulos.xlsx
curl -s http://localhost:8000/api/paginas-especiais/ | python -m json.tool
# → 8 objetos { id, titulo, conteudo, ordem } com o conteúdo completo
```
> Obs.: `import_planilha` faz `get_or_create` por `titulo` (só **cria**). Depois disso, quem
> ajusta o texto é a autora no admin. Se precisar recarregar do zero em dev, apague as
> `SpecialPage` e rode de novo.

## O que fazer (frontend)
### 1. Tela de leitura da página — `frontend/src/app/pagina/[id].tsx` (NOVO)
- Recebe `id` via `useLocalSearchParams`.
- Busca as páginas com `getSpecialPages()` e acha a de `id` (`.results.find(...)`). A lista é
  curta (8) — **não precisa** de endpoint de detalhe. (Se preferir evitar buscar a lista toda,
  dá pra passar o objeto por params na navegação; mas o find é mais simples e barato.)
- Renderiza `titulo` + `conteudo` **quebrado em parágrafos por `\n\n`** — exatamente o padrão
  de `capitulo/[numero].tsx:196` (`chapter.reflexao.split(/\n\s*\n/)`).
- **Reaproveite o conforto de leitura do capítulo:** mesma tipografia (Lora), e — se quiser —
  os temas claro/papel/escuro + tamanho de fonte via `getReadingPrefs`/`saveReadingPrefs`
  (`src/lib/storage.ts`). É **prosa livre** (sem o molde de 8 partes), então a tela é mais
  simples que a do capítulo: topbar com voltar + título, corpo rolável, sem barra de áudio,
  sem favoritar/anotar (a menos que você queira estender depois).
- **Sem gate de conta e sem áudio** — leitura sempre livre.

### 2. Seção na Biblioteca — `frontend/src/app/(tabs)/biblioteca.tsx`
- Adicione um bloco **"Do livro"** (sugestão de rótulo) no **`ListHeaderComponent`
  (`renderHeader`)**, **acima** da lista de capítulos numerados.
- Busque as páginas com `getSpecialPages()` (novo `useState`/`useEffect`, no mesmo estilo do
  `load()` que já existe ali). Renderize itens simples (ícone + título) na ordem `ordem`, cada
  um com `onPress={() => router.push('/pagina/' + id)}`.
- Mantenha o tom calmo: reuse os tokens (`t.ui.*`, `spacing`, `radius`) e o visual de linha/card
  já presente no arquivo. Some com o bloco quando a lista vier vazia/erro.

### 3. Registrar a rota — `frontend/src/app/_layout.tsx`
- Adicione `<Stack.Screen name="pagina/[id]" />` junto de `capitulo/[numero]` (linha ~71).

### 4. (Opcional) Atalho em Meu Espaço
- Se achar que enriquece, um item "Sobre o livro" em `(tabs)/meu-espaco.tsx` levando às páginas
  (ou direto a "Apresentação da Autora"). Não é obrigatório.

## ⚠️ Antes de começar: rebase
`git fetch origin && git rebase origin/main` — a `main` já tem:
- `content.ts` com `getTotalCapitulos()` (☁️, PR #32) e a sua monetização (`usePremium`).
- `_layout.tsx`, `(tabs)/biblioteca.tsx`, `(tabs)/meu-espaco.tsx` — arquivos que você vai tocar
  aqui e que já foram mexidos recentemente. Rebase para não sobrescrever.

## Verificação (ponta a ponta)
1. Backend local: `import_planilha` → `curl /api/paginas-especiais/` traz as 8 páginas.
2. App: Biblioteca mostra o bloco "Do livro"; tocar numa página abre `/pagina/[id]` com o texto
   em parágrafos; voltar funciona; funciona **deslogado** (sem pedir conta).
3. `npx tsc --noEmit` limpo (ignorando o erro pré-existente de `google.ts`, módulo nativo não
   instalado no ambiente da nuvem).
4. Ao mergear, deixe uma linha no `COORDENACAO.md`.

## Fora de escopo
- Áudio das páginas especiais, favoritar/anotar página, edição de conteúdo no app (a autora
  edita no admin). Só exibição de leitura.
