# Loja / E-commerce (produtos físicos) — PRÓXIMO ÉPICO

> Capturado em 2026-07-12. **Não** faz parte do plano de monetização digital
> (Premium/Doação via RevenueCat) — é um **cano de pagamento diferente**.

## ⚠️ Regra de ouro (política das lojas)
Produtos **físicos** (livro impresso, camisetas, xícaras, etc.) **NÃO PODEM** usar
Google Play Billing / RevenueCat. Google e Apple **exigem meio de pagamento externo**
para bens físicos (Mercado Pago, Stripe, PagSeguro, PIX, checkout próprio). Misturar
com Play Billing = app **reprovado**. Portanto a Loja é um subsistema à parte.

## Estado atual (já existe)
- **Backend:** modelo `content.Produto` (nome, preço, imagem, categoria, `link_compra` URL).
  Cadastrado pelo admin pela autora. É uma **vitrine**.
- **Frontend:** `frontend/src/app/loja.tsx` — lista os produtos; "Comprar" **abre o
  `link_compra`** (externo) se houver; senão mostra "Em breve".
- **Venda hoje, sem código:** basta a autora preencher `link_compra` por produto
  (Shopee, Mercado Livre, Loja Integrada, Nuvemshop, checkout Instagram/WhatsApp).

## Objetivo do épico (quando for a hora)
Tirar o "Em breve" e ter **carrinho + checkout** de verdade dentro do app.

## Escopo provável (a detalhar no brainstorm/spec)
- **Frontend:** estado de carrinho, detalhe do produto, adicionar/remover, tela de
  checkout, formulário de endereço, resumo, cálculo de frete.
- **Backend:** modelo `Pedido`/`ItemPedido`, endpoints de checkout, **webhook** do
  gateway (confirmação de pagamento), gestão de pedidos no admin, estoque.
- **Gateway (a escolher):** Mercado Pago (Checkout Pro / PIX — forte no BR), Stripe,
  ou PagSeguro. Definir cartão + PIX.
- **Frete:** Melhor Envio / Correios (cálculo por CEP) — ou frete fixo/combinar.
- **Decisão de arquitetura:** carrinho in-app + **checkout hospedado** (Checkout Pro)
  é o caminho mais leve/seguro (não lida com dados de cartão); vs. checkout nativo completo.

## Caveats
- Comércio físico traz complexidade real: frete, endereço, estoque, reembolso,
  impostos/nota. Começar simples (checkout hospedado + frete simples) é sensato.
- Ainda **permite** o `link_compra` externo como atalho enquanto o carrinho não existe.

Ver [[publicacao-lojas]] e o plano de monetização digital em
`docs/superpowers/plans/2026-07-12-monetizacao-premium-doacao.md`.
