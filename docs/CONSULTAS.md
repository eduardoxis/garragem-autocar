# Redução de consultas repetidas

- Listas e contagens idênticas compartilham a requisição em andamento e reutilizam resultados por até 30 segundos. Configurações da empresa: até 60 segundos. Chaves incluem usuário, perfil, empresa, filtros e cursor. O armazenamento é apenas em memória, com limite de entradas; falhas não ficam em cache.
- Gravações invalidam as coleções afetadas antes e depois da operação. Login, logout, troca de conta e retorno ao aplicativo limpam o cache. Atualizar a lista de mecânicos força uma consulta nova.
- O observador da sessão é instalado uma única vez. Perfil ativo, função e permissões continuam sendo consultados ao entrar nas áreas; a autorização das APIs continua validada por requisição.
- Notificações simultâneas compartilham o carregamento por até 60 segundos, descartam resultados de telas desmontadas e não consultam coleções que as regras não permitem ao perfil.
- Abrir ou editar checklist não consulta eventos e versões. O histórico completo é carregado ao expandir “Versões e histórico”. A API mantém o comportamento completo por padrão para outros consumidores.
- A listagem de checklists carrega até 100 registros por chamada, preservando todos os registros e a busca existente. Isso reduz viagens à API e leituras de cursor, mas cada documento retornado continua sendo uma leitura.
- Salvar um formulário inalterado não grava outra revisão. Fotos são vinculadas em lote, com uma gravação do checklist após o envio; arquivos enviados antes de uma falha parcial são preservados. Cada arquivo continua usando o armazenamento privado em Base64 e suas validações.
- Miniaturas já carregadas são reutilizadas durante a edição; adicionar uma foto não baixa novamente as anteriores.
- Consultas Firestore dos painéis em tempo real são compartilhadas dentro da mesma instância do servidor. Uma tolerância de 10 segundos mantém a assinatura entre reconexões SSE; depois, consultas sem assinantes são encerradas. O limite de consultas ociosas é 80. Instâncias diferentes da Vercel possuem consultas independentes. Filtros por empresa/perfil e revogação de acesso continuam ativos.

## Verificação

`node tests/run.js` e `node tests/check-syntax.js`.

Testes opcionais com Playwright e Chrome: `tests/auth-queries.browser.test.mjs`, `tests/checklist-query-budget.browser.test.mjs`, `tests/checklist-desktop.browser.test.mjs`, `tests/queue.browser.test.mjs` e `tests/workshop.browser.test.mjs`.

As fixtures verificam: zero gravações ao salvar sem alteração; três fotos vinculadas em uma gravação; somente a nova miniatura baixada; quatro painéis e reconexões compartilhando uma assinatura de fila na mesma instância; um observador de autenticação com validações de perfil ainda atualizadas. Nenhum teste usa dados reais de clientes.

A redução final da cobrança depende do volume de uso, quantidade de documentos e instâncias ativas. Não há estimativa percentual sem medir o ambiente publicado. Alterações feitas por outro dispositivo podem levar até o TTL para aparecer nas listas comuns; painéis da fila continuam em tempo real.
