# Ficha da Google Play Store — Café com Propósito

> Documento de referência para preencher o Google Play Console. Copie e cole os campos.
> Pacote do app: `com.cafecomproposito.app`

---

## 1. Textos da ficha

**Nome do app** (máx. 30):
```
Café com Propósito
```

**Descrição curta** (máx. 80):
```
Devocional diário para ler ou ouvir. Comece o dia com fé e um bom café.
```

**Descrição completa** (máx. 4000):
```
Comece o seu dia com um café e um encontro com Deus. ☕

O Café com Propósito é um devocional cristão diário, baseado no livro homônimo, feito para trazer paz, leveza e propósito à sua rotina. A cada dia, uma reflexão para ler ou ouvir — no seu tempo, sem pressa.

O que você encontra:
• 75 capítulos devocionais — cada um com versículo-chave, reflexão, oração, aplicação prática e uma frase para guardar no coração.
• Leia ou ouça: acompanhe a narração dos capítulos quando quiser.
• Anotações e favoritos: guarde o que tocou o seu coração.
• Progresso salvo: retome sempre de onde parou.
• Lembrete diário: um toque suave no horário que você escolher.
• Leitura confortável: ajuste o tamanho da fonte e escolha entre os temas Claro, Papel e Escuro.

Um convite, nunca uma cobrança. Cultive um momento diário de fé e recomece a cada amanhecer.

Baixe agora e reserve um tempo para o seu café com propósito.
```

**Categoria:** Estilo de vida (alternativa: Livros e referências)
**Tags:** devocional, cristão, fé, oração, bíblia, reflexão diária

---

## 2. Contato / URLs
- **E-mail de contato:** `cafecomproposito@luminaflow.io`
- **Política de Privacidade (obrigatório):** `https://cafe-com-proposito-api.onrender.com/privacidade/`
- **Termos de Uso:** `https://cafe-com-proposito-api.onrender.com/termos/`
- **Site (opcional):** deixar em branco por ora, ou usar a página de privacidade.

---

## 3. Ícone (512×512, PNG 32-bit)
Já existe o ícone oficial (selo da marca) — **exportar/redimensionar para 512×512** e subir.
Só gerar novo se quiser mudar. Prompt (IA, em inglês) caso queira gerar:
```
Minimalist mobile app icon: a coffee cup gently merging with a sunrise and a subtle cross, warm gold (#C8924A) on a deep coffee-brown background (#5B4636), elegant, calm, spiritual, flat vector, centered, soft rounded square, no text.
```

## 4. Feature graphic (1024×500) — obrigatório
Prompt (IA):
```
A serene warm banner illustration for a Christian daily devotional app. A cup of coffee with soft steam on a wooden table beside an open Bible, gentle morning light, cozy peaceful mood. Warm palette: coffee brown #5B4636, gold #C8924A, cream #FAF7F2. Minimalist, soft shadows, lots of empty space on the LEFT for a title. 1024x500 wide, high quality.
```
> A IA erra texto: deixe o espaço vazio e escreva "Café com Propósito" por cima depois (Canva/Figma).

## 5. Screenshots (mín. 2, ideal 4–6) — TELAS REAIS
⚠️ Política do Google: screenshots precisam ser **telas reais do app** (print falso reprova).
Formato: PNG/JPEG, retrato 9:16 (ex.: 1080×1920). Sugestão + legenda por tela:

| Tela | Legenda |
|---|---|
| Início (Bom dia + clima + leitura de hoje) | "Um café com Deus todos os dias" |
| Leitura do capítulo (8 partes) | "Reflexões para ler no seu tempo" |
| Botão Ouvir / Player | "Ouça a narração quando quiser" |
| Biblioteca (75 capítulos) | "75 capítulos, sempre com você" |
| Ajustes (lembrete diário) | "Um lembrete gentil no seu horário" |

Dica: capture telas limpas e opcionalmente jogue num mockup de celular com fundo bege
no Canva (busque "Google Play screenshot"). Moldura/fundo pode ser decorativo; a tela do
app tem que ser real.

---

## 6. Data Safety (Segurança dos dados)
Coleta (tudo "para funcionalidade do app"; **não** para anúncios, **não** vendido):

| Dado | Coleta? | Vinculado ao usuário | Finalidade |
|---|---|---|---|
| Nome | Sim | Sim | Conta / funcionalidade |
| E-mail | Sim | Sim | Conta / login |
| Telefone | Sim | Sim | Conta |
| Data de nascimento | Sim | Sim | Conta |
| Localização aproximada | Sim | Não | Clima na tela inicial |
| Atividade no app (progresso, favoritos, anotações) | Sim | Sim | Funcionalidade |
| ID do dispositivo (token de push) | Sim | Sim | Notificações |

- Criptografado em trânsito: **Sim** (HTTPS).
- Usuário pode pedir exclusão: **Sim** — há "Excluir conta" no app.
- Compartilha/vende dados: **Não** (usa serviços para operar; declarar na Política, não como venda).

## 7. Classificação de conteúdo (IARC)
Responder "Não" a violência, sexo, drogas, palavrões, jogos de azar. Resultado esperado:
**Livre (L / Everyone)**. Categoria: Referência / Estilo de vida.

## 8. Público-alvo e conteúdo
- Faixa etária: **18 anos ou mais** (evita regras de apps infantis).
- Contém anúncios: **Não**.

## 9. App access (para o revisor)
Do capítulo 3 em diante pede conta. Criar uma **conta de teste** no app
(ex.: `reviewer@luminaflow.io` + senha) e informar em App access → "Algumas
funcionalidades são restritas", para o revisor conseguir ler além do cap. 2.

---

## Ordem de preenchimento
1. Ficha principal (textos + ícone + feature graphic + screenshots)
2. Data safety → Classificação → Público-alvo → Anúncios → App access
3. Subir o **AAB de produção** (`eas build --profile production`) em teste interno →
   promover → enviar para revisão.
