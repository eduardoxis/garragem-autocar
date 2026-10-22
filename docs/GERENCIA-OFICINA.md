# Gerência Oficina

## Administração

Gerência Oficina e Gerenciar Fila compartilham `js/modules/fila/management.js`: mesmos atendimentos, ações, formulários, filtros e permissões. A Gerência usa Inter e acrescenta data inicial/final, botão Hoje e informações do expediente. O administrador pode adicionar, editar, reordenar, finalizar, remover e consultar histórico; cada login de mecânico continua restrito aos seus serviços, com alteração de status e observações. Registros encerrados ficam disponíveis para consulta, com alterações desabilitadas.

Os quatro botões administrativos são Exibir na TV, Autorizar TV, TVs autorizadas e Adicionar à fila.

## TV dos mecânicos

Use Exibir na TV na Gerência ou abra `/oficina/tv`. Informe o código exibido em Autorizar TV, na própria Gerência. A autorização dura até 12 horas e pode ser revogada em TVs autorizadas.

O documento independente mantém logo, título, indicação Mecânicos, relógio/data em São Paulo, colunas por profissional e legenda. Tela cheia oculta a interface administrativa. São exibidos até cinco profissionais e cinco serviços por coluna; o excedente alterna a cada 15 segundos, com indicadores. Cadastros ativos aparecem mesmo sem serviços. Profissionais inativos com atendimentos no período permanecem identificados.

A TV tem sessão somente de leitura e funciona sem manter o administrador conectado. Não recebe clientes, valores ou observações internas. O cookie `gac_workshop_tv` é separado de `gac_queue_tv`, usado na recepção. Código, lista de autorizações e revogação são separados por painel; uma autorização não libera a outra TV.

## Continuidade

A coleção única continua sendo `queueEntries`. A passagem do tempo não cria registros, não muda previsão, responsável ou status.

- Aguardando e Em serviço continuam ativos nos dias seguintes, com a data original.
- Pendências anteriores se juntam aos serviços atuais com o aviso Pendente de DD/MM/AAAA.
- A posição da fila é preservada, inclusive a ordenação manual. Atendimentos antigos normalmente possuem posições anteriores.
- Marcar um serviço antigo como Pronto registra `readyAt`, retira o aviso de pendência e mantém o resultado visível no dia da conclusão. A recepção exibe o veículo até o encerramento administrativo.
- Finalizar preserva o histórico; Remover retira o atendimento das visualizações aplicáveis.
- O box permanece ocupado enquanto o veículo estiver ativo e Em serviço. Meia-noite e fechamento do expediente não o liberam. Pronto, finalização e remoção usam as transações existentes para liberá-lo.

A consulta administrativa abre em Hoje. Na virada do dia, esse período avança automaticamente; períodos históricos explícitos são mantidos. O histórico por data mostra o estado atual registrado dos atendimentos daquele período, sem simular estados antigos.

## Expediente e feriados

Em Administração → Configurações da empresa, use Expediente da oficina. Configure os sete dias, horários de abertura/fechamento e datas sem expediente. Os horários sugeridos precisam ser ajustados e salvos; nada é gravado automaticamente.

A configuração fica em `companies/{empresa}.workshopSchedule`; somente o administrador pode salvá-la. O servidor valida horários, datas, duplicidades e limites. Os painéis recebem as alterações em tempo real. Em domingos, feriados e demais dias fechados, as pendências continuam visíveis, com informação do próximo expediente. Os atendimentos não são movidos para outra data nem alterados. Se todos os dias forem fechados, o painel informa que não há próximo expediente configurado.

## Sincronização e validação

O SSE existente observa a mesma fila. A Gerência administrativa usa `view: workshop-admin`; a TV usa `GET /api/queue-stream?view=workshop` com seu cookie. Empresa, sessão, perfil e vínculo continuam validados. A reconexão recebe uma fotografia completa. Cadastro de mecânicos e expediente também são observados.

Execute `node tests/run.js` e `node tests/check-syntax.js`. Os testes de navegador `tests/queue.browser.test.mjs` e `tests/workshop.browser.test.mjs` usam manipuladores reais com banco isolado: quatro telas, permissões, filtros, transferência, histórico, continuidade, boxes, expediente, feriados, autorização de TVs, reconexão, revogação, tela cheia e celular. Não acessam clientes ou credenciais de produção.
