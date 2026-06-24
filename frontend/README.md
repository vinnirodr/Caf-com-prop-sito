# Café com Propósito — App (React Native + Expo)

App em **React Native + Expo + TypeScript**. Este é o **Bloco 1 — Fundação**:
tema da marca, navegação das 3 abas (Início, Biblioteca, Meu Espaço) e conexão
com a API do backend Django.

## O que já funciona

- **Navegação das 3 abas** com os ícones e cores da marca.
- **Tema** com a paleta aprovada (café, dourado, sálvia) e as fontes Lora e Inter.
- **Biblioteca conectada à API:** busca os capítulos reais do backend e os
  exibe em lista clicável, com estados de carregando, erro e "puxar para atualizar".
- **Tela de Leitura:** capítulo no molde de 8 partes, com ajuste de tamanho de
  fonte, temas de leitura (claro/papel/escuro) e navegação anterior/próximo.
- **Design system aplicado 100%:** tokens em `theme/ccpTheme.ts` (fonte única),
  com suporte a modo claro/escuro do sistema via `useTheme()`.
- **Início** e **Meu Espaço**: telas-base (completadas nos próximos blocos).

## Como rodar

### 1. Suba o backend primeiro
Na pasta do backend Django:
```bash
python manage.py runserver 0.0.0.0:8000
```
O `0.0.0.0` permite que o celular acesse o backend pela rede.

### 2. Rode o app
```bash
npm install
npx expo start
```
Abra o app **Expo Go** no celular e escaneie o QR code do terminal. Celular e
computador precisam estar na mesma rede Wi-Fi. O app descobre sozinho o IP do
computador para falar com o backend (porta 8000) — nada a configurar em dev.

### Testar contra a API de produção (Render)
Para abrir o app apontando para o backend já no ar, passe a URL na variável
`EXPO_PUBLIC_API_BASE` ao iniciar o Expo (não precisa editar código):

```bash
EXPO_PUBLIC_API_BASE=https://SEU-APP.onrender.com npx expo start
```

Escaneie o QR no **Expo Go**. Como o app nativo chama a API direto, não há
problema de CORS. Sem essa variável, o app volta a usar o backend local (dev).

## Gerar um APK de teste (recomendado para testar no celular)

Em vez de *dev client* (que precisa do Metro rodando e pode parecer "bugado" se
não estiver conectado), gere um **APK standalone** com a URL do Render já
embutida — é um app fechado, instala e abre, sem QR nem rede local.

A config está no `eas.json` (perfil `preview`: `distribution: internal`,
`buildType: apk`, com `EXPO_PUBLIC_API_BASE` apontando pro Render).

```bash
npm install -g eas-cli      # uma vez
eas login                   # conta Expo (grátis)
eas init                    # vincula o projeto à sua conta (cria o projectId)
eas build -p android --profile preview
```

Ao final o EAS devolve um **link de download do `.apk`**. Baixe no celular,
instale (permita "fontes desconhecidas") e abra — já abre conectado à API do
Render. Nada de Metro/QR.

> O perfil `development` (dev client) e o `production` (app-bundle para a Play
> Store) também estão no `eas.json` para os próximos passos.

## Estrutura
```
src/
├── app/                      # rotas (expo-router)
│   ├── _layout.tsx           # carrega fontes + navegação raiz
│   ├── (tabs)/
│   │   ├── _layout.tsx       # as 3 abas
│   │   ├── index.tsx         # Início
│   │   ├── biblioteca.tsx    # Biblioteca (consome a API)
│   │   └── meu-espaco.tsx    # Meu Espaço
│   └── capitulo/[numero].tsx # Tela de Leitura (molde de 8 partes)
├── api/
│   ├── config.ts             # URL da API (EXPO_PUBLIC_API_BASE ou IP em dev)
│   └── content.ts            # tipos + funções (capítulos, páginas especiais)
└── theme/
    ├── ccp.tokens.json       # tokens fonte (Style Dictionary)
    ├── ccpTheme.ts           # tema resolvido (fonte única: light/dark, etc.)
    └── useTheme.ts           # hook useTheme() (claro/escuro do sistema)
```

## Próximos blocos
2. Leitura · 3. Áudio · 4. Início · 5. Conta · 6. Pessoal (anotações/favoritos)
