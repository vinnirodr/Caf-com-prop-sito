# Café com Propósito — App (React Native + Expo)

App em **React Native + Expo + TypeScript**. Este é o **Bloco 1 — Fundação**:
tema da marca, navegação das 3 abas (Início, Biblioteca, Meu Espaço) e conexão
com a API do backend Django.

## O que já funciona

- **Navegação das 3 abas** com os ícones e cores da marca.
- **Tema** com a paleta aprovada (café, dourado, sálvia) e as fontes Lora e Inter.
- **Biblioteca conectada à API:** busca os capítulos reais do backend e os
  exibe em lista, com estados de carregando, erro e "puxar para atualizar".
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

### Para produção (depois)
Em `src/api/config.ts`, troque `API_BASE` pela URL do Render (há um comentário
no arquivo indicando onde).

## Estrutura
```
src/
├── app/                      # rotas (expo-router)
│   ├── _layout.tsx           # carrega fontes + navegação raiz
│   └── (tabs)/
│       ├── _layout.tsx       # as 3 abas
│       ├── index.tsx         # Início
│       ├── biblioteca.tsx    # Biblioteca (consome a API)
│       └── meu-espaco.tsx    # Meu Espaço
├── api/
│   ├── config.ts             # URL da API (detecta o IP em dev)
│   └── content.ts            # tipos + funções (capítulos, páginas especiais)
└── theme/theme.ts            # cores, fontes, espaçamentos, temas de leitura
```

## Próximos blocos
2. Leitura · 3. Áudio · 4. Início · 5. Conta · 6. Pessoal (anotações/favoritos)
