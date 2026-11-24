# Quickstart: Venda Mínima

Roteiro para validar a feature de ponta a ponta (e para o vídeo da entrega). Contratos:
[API](contracts/sales-api.md) e [interface](contracts/ui.md).

## Pré-requisitos

- Docker com Compose; `make up` sobe painel (http://localhost:5173), API (http://localhost:8000) e
  PostgreSQL, com as migrações aplicadas.
- Pelo menos dois produtos com saldo. Pelo painel: cadastre "Camiseta Básica Branca M"
  (R$ 49,90) e "Meia Cano Curto" (R$ 37,70) em Produtos e registre uma entrada de 10 unidades de
  cada em Estoque.

## Verificações automáticas

```bash
make test            # domínio, serviço, repositórios, rotas e migração (SQLite)
make test-postgres   # o mesmo no PostgreSQL, com os testes de concorrência das vendas
make lint && make format
make frontend-check && make frontend-test && make frontend-build
make e2e             # tests/e2e/sales.spec.ts contra a stack real
```

## Roteiro manual

1. **Venda pelo código (US1):** menu "Nova venda". Digite o código da camiseta e tecle Enter duas
   vezes, e o da meia uma vez. Esperado: duas linhas (camiseta × 2, meia × 1), total R$ 137,50, campo
   do código limpo e com o foco.
2. **Código inexistente:** digite `7890000000000` + Enter. Esperado: "Produto não encontrado", carrinho
   igual.
3. **Busca pelo nome:** em "Buscar pelo nome", digite "meia" e clique em "Adicionar Meia Cano Curto".
   Esperado: a meia passa a 2 un.; total R$ 175,20.
4. **Pagamento dividido (US2):** escolha Pix, valor R$ 50,00, "Adicionar pagamento". Esperado: "Falta
   pagar R$ 125,20" e o valor seguinte já preenchido com 125,20. Tente Cartão de crédito com 200,00:
   recusado ("Só o pagamento em dinheiro…"). Escolha Dinheiro, 130,00. Esperado: "Troco: R$ 4,80".
5. **Finalizar:** "Finalizar venda". Esperado: comprovante "Venda nº 1 registrada" com itens,
   pagamentos, total R$ 175,20 e troco R$ 4,80.
6. **Estoque baixado:** em Estoque, camiseta com 8 e meia com 8; o histórico da camiseta mostra
   "Venda", −2, saldo 8, "Venda nº 1".
7. **Histórico (US3):** menu "Vendas". Esperado: a venda nº 1 no topo; "Vendas hoje: 1",
   "Faturamento hoje: R$ 175,20", "Ticket médio hoje: R$ 175,20". "Ver venda nº 1" mostra o detalhe.
8. **Persistência:** recarregue a página e reinicie a stack (`make down && make up`); a venda e os
   saldos continuam iguais.
9. **Saldo insuficiente:** numa nova venda, deixe 3 un. de um produto e, em outra aba, retire esse
   saldo por um ajuste até sobrar 1. Finalize na primeira aba. Esperado: recusa com "Há só 1 un. de
   … em estoque", carrinho mantido, nada registrado.
10. **Carrinho guardado:** com itens no carrinho, vá a Produtos e volte, ou recarregue. Esperado: o
    carrinho e os pagamentos continuam.

## Idempotência pela API

```bash
# Envie duas vezes o mesmo corpo (mesmo "id"): a primeira responde 201, a segunda 200 com a
# mesma venda, e o saldo do produto só baixa uma vez.
curl -i -X POST http://localhost:8000/sales -H "Content-Type: application/json" -d @venda.json
curl -i -X POST http://localhost:8000/sales -H "Content-Type: application/json" -d @venda.json
```
