# Arquitetura do sistema

## Camadas

- Interface: HTML5, CSS3 e JavaScript ES Modules.
- Identidade: Firebase Authentication por e-mail e senha.
- Dados: Firestore, sempre segmentado por `companyId`.
- Autorização: `js/guards.js`, Firestore Security Rules e Firebase Admin nas APIs.
- Automações: Vercel Cron protegido por `CRON_SECRET`.
- Documentos: PDF gerado no navegador, sem upload e sem Base64 persistido.

## Fluxo principal

Cliente → Veículo → Check-in → Diagnóstico → Orçamento → Follow-up → Aprovação → OS → Execução → Pagamento → Entrega → Pós-venda → Próxima manutenção.

## Collections

`companies`, `users`, `customers`, `vehicles`, `checkIns`, `diagnostics`, `serviceOrders`, `quotes`, `quoteFollowUps`, `services`, `products`, `stockMovements`, `suppliers`, `supplierQuotes`, `appointments`, `reminders`, `payments`, `receivables`, `payables`, `cashSessions`, `postSales`, `notifications`, `auditLogs`, `settings`.

Todos os documentos operacionais têm `companyId`, `deleted`, `createdAt` e `updatedAt`. Exclusões são lógicas.

## Perfis

- `admin`: acesso integral.
- `user`: clientes, orçamentos, perfil e funções diretamente relacionadas.

As permissões não dependem do menu: são verificadas novamente nas regras e nas funções protegidas.
