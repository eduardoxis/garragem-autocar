# Checklist: sincronização e edição exclusiva

A lista e a visualização recebem os dados persistidos pelo servidor, incluindo assinatura e exclusão. Digitação, seleção de fotos, marcações e legendas permanecem locais até Salvar ou Salvar e revisar. As fotos ficam em uma fila local e são enviadas ao salvar, no mesmo armazenamento privado em Base64 existente. Outras ações explícitas, como confirmar assinatura, finalizar, excluir ou salvar vínculo, continuam exigindo seus respectivos botões.

## Edição exclusiva

A API adquire um bloqueio por checklist, conta e sessão de aba. Uma segunda conta/aba pode visualizar, mas não adquirir a edição. O servidor também valida o bloqueio em gravações e envios de anexos; não depende de esconder botões. Cada lease dura 90 segundos e é renovado a cada 45 segundos enquanto a edição está aberta. Voltar, revisar ou sair da rota libera o bloqueio. Se a aba/conexão desaparecer sem conseguir liberar, a expiração permite nova aquisição. Um bloqueio vencido não permite salvar. As transações do Firestore impedem aquisições simultâneas.

O bloqueio fica em `checklists/{id}/editing/session`, uma subcoleção já sem acesso direto pelas regras atuais. Não altera o documento principal, não cria revisões, não transmite campos em digitação nem dispara atualização de checklist por renovação. Não requer novo índice, Storage ou configuração de TTL.

## Sincronização

O endpoint autenticado `/api/checklist-stream` verifica empresa, perfil e atividade do usuário. A primeira mensagem fornece a lista completa; mensagens seguintes contêm só registros alterados e exclusões. A conexão é renovada após 45 segundos e reconecta com espera progressiva após falhas. A consulta é compartilhada na mesma instância do servidor, incluindo a tolerância existente de 10 segundos para reconectar; instâncias diferentes têm listeners independentes. A identidade é observada para revogar uma sessão desativada ou com permissão alterada.

Quando a conexão inicial funciona, não é necessário consultar novamente a lista pela API. Se ela falhar, a consulta comum existente permite abrir a tela enquanto a conexão tenta recuperar. Filtros e paginação são preservados; o stream é encerrado ao sair da rota. Uma revisão arquivada não é substituída pelo conteúdo atual. Se houver atualização externa durante preenchimento/assinatura, o formulário fica preservado e há uma opção explícita de abrir a versão atual.

## Cliente e veículo

Sem cliente cadastrado selecionado, só o modo manual fica disponível. O modo manual bloqueia o seletor de veículo e mantém os campos de digitação livres. O modo cadastrado exige cliente e mostra só veículos com `customerId` correspondente. Os botões de cadastrar/vincular veículo ficam disponíveis nesse modo. O vínculo também pode ser salvo na página Veículos. A API valida empresa e vínculo anterior para evitar sobrescrever uma mudança simultânea; registra a ação na auditoria.

## Validação offline

- `node tests/run.js`: permissões, transações, bloqueio por conta/aba, renovação, expiração, liberação, vínculo e SSE.
- `node tests/checklist-live.browser.test.mjs`: duas contas com handlers reais e banco isolado; digitar não grava, Salvar sincroniza, edição concorrente bloqueada, rascunho preservado, assinatura/exclusão, reconexão, modos manual/cadastrado e filtro/vínculo de cliente.
- `node tests/checklist-query-budget.browser.test.mjs`: seleção de fotos sem upload/gravação; lote enviado só no Salvar e prévias sem releituras.
- `node tests/browser.test.mjs`: retomada, anexos, assinaturas, PDFs, descontos e demais fluxos existentes.

Os testes não usam registros reais de clientes.
