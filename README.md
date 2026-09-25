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
