# Garagem Auto Car — Gestão de Oficina

Sistema de gestão para oficina mecânica construído com HTML5, CSS puro, JavaScript nativo, Firebase Authentication, Firestore, Firebase Admin e Vercel Functions.

## Configuração

1. Copie `.env.example` para `.env.local` e preencha as credenciais.
2. Em `js/firebase/firebase-config.js`, preencha a configuração pública do Firebase Web.
3. Ative autenticação por e-mail/senha no Firebase Authentication.
4. Publique `firestore.rules` e `firestore.indexes.json` com a Firebase CLI.
5. Crie o primeiro usuário no Authentication e o documento `users/{uid}` com `role: "admin"`, `active: true` e `companyId`.
6. Execute `npm install` e `npm run dev`.

Nenhum arquivo ou imagem é gravado no Firestore. URLs externas são opcionais.

## Checklist e descontos

Consulte [o guia de configuração e operação](docs/CHECKLIST-E-DESCONTOS.md) e [o relatório da entrega](RELATORIO-DA-ENTREGA.md). As APIs e as regras do Firestore precisam estar configuradas/publicadas. Fotos, vídeos e assinaturas do checklist são armazenados em Base64 no Firestore, sem Firebase Storage.

A fila da recepção e o acesso dos mecânicos estão descritos em [Fila de Serviços](docs/FILA-DE-SERVICOS.md).
