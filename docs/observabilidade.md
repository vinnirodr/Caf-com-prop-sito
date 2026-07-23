# Observabilidade — Café com Propósito

Três camadas, todas em plano gratuito.

## 1. Painel próprio — `/status/`
`https://cafe-com-proposito-api.onrender.com/status/` (ou pelo domínio da landing).
Exige login **staff** (o mesmo do `/admin/`). Mostra:
- **Saúde:** banco no ar, latência da consulta, migrações aplicadas, tabelas, hora do servidor.
- **Conteúdo:** capítulos publicados, quantos têm narração, páginas da introdução.
- **Uso:** usuários, novos e ativos (hoje/7d/30d), premium ativos, capítulos lidos/ouvidos,
  favoritos, anotações — e barras dos últimos 14 dias.
- Só agregados: nenhum dado pessoal de leitor aparece.
- **Degrada com elegância:** se o banco estiver fora do ar, a página abre normalmente e o
  bloco de saúde mostra "falha"; os blocos de conteúdo e uso mostram "indisponível" em vez
  de quebrar a página (ajuste feito após revisão, commit `33d4f1f`).

"Ativo" = usuário com progresso de leitura no período (o login por JWT não atualiza o
`last_login` do Django, então esse campo não serve de métrica).

## 2. Sentry — erros e latência do backend
1. Em sentry.io, crie um projeto **Django** e copie o **DSN**.
2. Render → serviço `cafe-com-proposito-api` → **Environment** → adicione
   `SENTRY_DSN` com esse valor → salvar (redeploy automático).
3. Pronto: exceções do backend chegam com stack trace, e 10% das requisições viram
   trace de performance (para achar lentidão).
- Sem a variável, o Sentry fica **desligado** e a aplicação funciona igual.
- Privacidade: enviamos os erros **sem PII** (`send_default_pii=False`).
- O plano gratuito ("Developer") vale para sempre; contas novas começam num teste de 14
  dias do plano pago e depois caem no gratuito.
- Sem lock-in: o DSN pode apontar para um GlitchTip (compatível com o SDK do Sentry).

## 3. UptimeRobot — está no ar? (e alerta)
1. Em uptimerobot.com → **Add New Monitor**.
2. Tipo **HTTP(s)**, URL `https://cafe-com-proposito-api.onrender.com/healthz/`,
   intervalo **5 minutos**, alerta por e-mail.
3. Repita para a landing: `https://cafecomproposito.luminaflow.io/`.
- Bônus: o ping de 5 em 5 minutos mantém o Render acordado, reduzindo o cold start.
- O `/healthz/` é leve de propósito (não consulta o banco).

## Fase 2 (quando sair o próximo build do app)
- **Firebase Analytics:** telas e eventos (`capitulo_lido`, `capitulo_ouvido`).
- **Sentry React Native:** crashes do app.
Ambos exigem build novo — combinar com quem for gerar (ver `docs/build-local-guia.md`).
