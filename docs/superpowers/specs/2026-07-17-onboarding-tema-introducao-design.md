# Onboarding no fluxo + Tema na leitura + Introdução v2 — Design/Spec

## Decisões (fechadas com o dono; conteúdo oficial da AUTORA)

### A. Onboarding
- **Flag versionada:** a chave do storage muda para `ccp.onboarding_done_v2` → o carrossel novo
  aparece **uma vez para todos** (inclusive quem já usava) e depois nunca mais. Splash continua
  decidindo (`done ? tabs : onboarding`) — sem mudança de lógica, só a chave.
- **Música sempre no onboarding:** a 1ª faixa de música de fundo toca (fade-in ~0.4) enquanto o
  onboarding está em foco e para (fade-out) ao sair — **independente da preferência** do usuário
  (que permanece OFF por padrão; nada é persistido). Gracioso: sem faixas → silêncio, nada quebra.
  - Implementação: `BackgroundMusicContext` ganha um **modo demo**: estado `demoAtiva` +
    `definirDemo(ligar: boolean)` no value. `deveTocar` vira:
    `(ativa && faixa && (emLeitura || narracao.faixaAtual != null)) || (demoAtiva && faixa)`.
    Onboarding: `useFocusEffect` → `definirDemo(true)` / cleanup `definirDemo(false)`.

### B. Tema do app refletindo na leitura
- Leitura (capítulo) e Introdução **abrem no tema derivado do app**: app escuro → tema de leitura
  `escuro`; claro → `claro`. O seletor interno (claro/papel/escuro) continua e persiste.
- **Re-sincronização:** ao mudar a Aparência em Ajustes (`definirModo`), o tema de leitura salvo é
  atualizado para o derivado (`escuro`→'escuro', senão 'claro'; em `auto`, usa o esquema do sistema
  naquele momento). Assim "a configuração do app reflete em todo ele", e o usuário re-decide lá dentro.
- Fallback de init nas telas de leitura: `prefs.theme ?? (t.mode === 'dark' ? 'escuro' : 'claro')`.

### C. Introdução v2 (estrutura oficial da autora + mock do design system)
**Backend (`SpecialPage`):**
- Novos campos: `subtitulo` (CharField 200, blank) e `audio` (FileField `upload_to="paginas/"`,
  null/blank — botão "Ouvir" só aparece quando a autora subir; igual capítulos). Migration.
- Serializer expõe `subtitulo` e `audio` (url relativa). Admin ganha os campos.
- **Comando `seed_introducao` (idempotente, roda no build.sh):** garante as 5 páginas oficiais:
  | ordem | titulo | subtitulo |
  |---|---|---|
  | 1 | Boas-vindas | "Sua jornada com Deus começa com um simples passo de fé." |
  | 2 | Sobre o Livro e a Autora | "Toda grande transformação começa com um encontro na presença de Deus." |
  | 3 | Como Utilizar o Aplicativo | "Reserve alguns minutos. Deus pode transformar todo o seu dia." |
  | 4 | Uma Palavra ao Seu Coração | "Nenhum coração chega até aqui por acaso." |
  | 5 | Comece Sua Jornada | "Que hoje seja o primeiro de muitos encontros inesquecíveis com Deus." |
  - Conteúdos: página 1 = carta oficial da autora (no plano); 2 reaproveita o conteúdo de
    "Apresentação da Autora" (se existir); 3 reaproveita "Como Utilizar Este Livro"; 4 já existe
    (mantém conteúdo); 5 = frase oficial ("Não espere o momento perfeito. Deus pode falar com você
    hoje.") + convite curto.
  - **Regra de idempotência:** busca por `titulo`; ao CRIAR define tudo; se JÁ EXISTE atualiza só
    `ordem`/`subtitulo`(se vazio)/`publicado` — **nunca sobrescreve `conteudo`** (edições da autora
    são soberanas). Páginas fora da lista oficial → `publicado=False` (não apaga).
**App:**
- **Hub `/introducao`** (substitui o leitor direto; segue o mock): topbar voltar + eyebrow
  "ANTES DE COMEÇAR"; hero em gradiente escuro-quente com selo, título "Introdução" e sub
  "Sobre o livro, a autora e o convite"; label "SUA JORNADA COMEÇA AQUI" + "N páginas · ~X min"
  (estimado por palavras/200wpm); lista numerada (bolinha com número, título, subtítulo, chevron);
  item 1 com botão **"Começar"**. Tocar em qualquer item abre o leitor naquela página.
- **Leitor `/introducao/[pagina]`** (mock): fundo em gradiente dourado-creme
  `#FCF5E7 → #F3E7D0 → #E8D4B4` no claro; no escuro usa o tema de leitura escuro (regra B; o
  seletor interno é o **Aa** de tamanho de fonte + tema como no capítulo — mínimo: Aa de fonte no
  topo; tema segue regra B). Ornamento central (selo em círculo com linhas), eyebrow = título da
  página (uppercase), conteúdo serif grande; rodapé: barra de progresso + "Anterior · n de N ·
  Próxima"; botões "▷ Ouvir a introdução" (só com `audio`; toca no player global) e nota musical
  (alternar música de fundo). **Última página:** CTA primário "Iniciar Capítulo 1" →
  `router.replace('/capitulo/1')`.
- Biblioteca: card "Introdução" ganha o subtítulo do mock ("Sobre o livro, a autora e o convite").
- **Nunca** cravar número de capítulos (regra do projeto).

## Fora de escopo (backlog salvo): itens informativos no Meu Espaço; fim de jornada (Legado/Agradecimentos).

## Verificação
- Backend: `manage.py test` verde (novos: campos + seed idempotente que preserva conteúdo).
- App: tsc só Field.tsx:38. Manual (próximo build): onboarding aparece 1x com música; Aparência
  reflete na leitura; Introdução = hub → leitor novo → "Iniciar Capítulo 1".
