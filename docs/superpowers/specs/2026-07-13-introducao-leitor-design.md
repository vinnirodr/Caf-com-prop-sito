# Introdução — leitor das páginas especiais (redesign)

## Problema
As 8 páginas especiais aparecem hoje como uma lista solta ("Do livro") no topo da Biblioteca, e o
leitor (`pagina/[id].tsx`) é cru (sem conforto de leitura). Fica pesado e pouco convidativo.

## Solução (fechada com o dono)
- **Biblioteca:** trocar a lista "Do livro" por **uma única entrada "Introdução"** antes dos capítulos.
- **Leitor direto:** tocar em "Introdução" abre um **leitor sequencial** das páginas especiais (começa
  na 1ª), folheando com **Anterior/Próxima** (sem swipe, sem índice), com **tamanho de fonte** e
  **tema de cores** (claro/papel/escuro) — o **mesmo conforto do capítulo**.

## Comportamento do leitor
- Carrega todas as páginas especiais (`getSpecialPages()`), ordenadas por `ordem`. Estado `indice`
  (começa em 0). Mostra **uma página por vez**: `titulo` + `conteudo` quebrado em parágrafos (`\n\s*\n`).
- **Conforto (reaproveitado de `capitulo/[numero].tsx`):**
  - Tema de leitura `claro | papel | escuro` (tokens `reading[...]` + chrome), e **tamanho de fonte**
    (`FONT_STEPS`), com a **mesma barra de controle** do capítulo.
  - **Preferência compartilhada:** usa `getReadingPrefs`/`saveReadingPrefs` (`src/lib/storage`) — mesma
    escolha de tema/fonte da leitura de capítulos (consistência).
- **Navegação (só botões):** **Anterior** (oculto/desabilitado na 1ª página) e **Próxima**. Indicador
  **"{n} de {total}"**. Na **última página**, "Próxima" vira **"Concluir"** → `router.back()` (volta à
  Biblioteca). Trocar de página reseta o scroll pro topo.
- **Topbar:** voltar + título "Introdução" (ou o título da página atual — ver nota). Sem áudio, sem gate.
- **Estados:** carregando (spinner) e erro (mensagem + "Tentar de novo"), como o leitor atual.

## Biblioteca (`(tabs)/biblioteca.tsx`)
- **Remover** o bloco "Do livro" (a lista das 8 páginas) e seus estilos.
- **Adicionar** um card único **"Introdução"** no `ListHeaderComponent`, **acima** dos capítulos:
  ícone (`book-outline`) + "Introdução" + subtítulo "Sobre o livro e a autora" + chevron →
  `router.push('/introducao')`. Só aparece se houver páginas especiais (mantém o fetch atual, mas só
  pra saber se existem — ou sempre mostra e o leitor trata vazio). Reusar os tokens/estilo de card já
  presentes no arquivo.

## Técnico
- **Novo:** `src/app/introducao.tsx` (o leitor sequencial). Espelha a UX de conforto de
  `capitulo/[numero].tsx` (tema/fonte/barra), sem o molde de 8 partes e sem áudio.
- **`_layout.tsx`:** registrar `<Stack.Screen name="introducao" />`; **remover** `<Stack.Screen name="pagina/[id]" />`.
- **Remover** `src/app/pagina/[id].tsx` (não mais referenciada após as mudanças acima).
- Sem backend novo (endpoint `/api/paginas-especiais/` já existe).

## Nota de UX
Título da topbar: usar **"Introdução"** fixo (a pessoa sabe que está na seção) e mostrar o **título da
página** como cabeçalho do corpo (grande, serif), como já é hoje. Assim o "{n} de {total}" + o título
grande situam a pessoa.

## Fora de escopo (YAGNI)
- Índice/lista pra saltar páginas, swipe, favoritar/anotar página, áudio das páginas.

## Verificação
1. Biblioteca mostra **"Introdução"** (1 card) antes dos capítulos; a lista antiga sumiu.
2. Tocar → abre a 1ª página em modo leitura; **Próxima/Anterior** navegam; **"{n} de {total}"** atualiza;
   na última, **"Concluir"** volta à Biblioteca.
3. **Fonte** e **tema** funcionam e **persistem** (e refletem a mesma preferência do capítulo).
4. Funciona **deslogado** (leitura livre). `npx tsc --noEmit` limpo (só `Field.tsx:38`).
