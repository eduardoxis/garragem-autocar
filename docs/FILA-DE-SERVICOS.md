# Fila de Serviços GAC

## Como usar

1. Depois do deploy, entre no sistema como administrador e abra **Gerenciar Fila** no menu lateral.
2. Use **Adicionar à fila**. Selecione uma OS ou um veículo existente, ou informe os dados de um veículo avulso. Escolha o mecânico ativo, o serviço e a previsão. O mesmo veículo não pode ter dois atendimentos ativos na fila.
3. Para a televisão, abra **/fila/tv** no navegador da TV ou use **Exibir na TV**. O painel é um documento independente e não carrega o menu administrativo.
4. Na TV aparecerá um código. No computador do administrador, clique em **Autorizar TV** e informe esse código e a identificação da recepção. O código vale por cinco minutos; a autorização dura até 12 horas e pode ser revogada em **TVs autorizadas**.
5. Na TV, movimente o mouse para revelar o controle discreto de tela cheia. Clique para ativar. ESC ou o mesmo controle permite sair.

A TV usa uma sessão própria somente de leitura. No dispositivo dos clientes, utilize essa autorização, sem entrar com uma conta de funcionário. Ela continua funcionando sem manter a página de gerenciamento aberta. Exibe a placa e o box de serviço, conforme o painel da recepção. Não exibe clientes, observações internas, valores, histórico ou controles de edição.

## Acesso do mecânico pelo celular

1. Em **Administração → Usuários**, crie ou ajuste uma conta com o perfil **Mecânico**.
2. Em **Administração → Mecânicos**, edite o cadastro correspondente e selecione essa conta no campo **Usuário do sistema**. Uma conta só pode estar vinculada a um mecânico.
3. Atribua esse mecânico aos atendimentos. Ao entrar no sistema, ele verá **Gerenciar Fila** no computador e **Fila** no menu do celular.
4. O mecânico vê apenas seus atendimentos e pode alterar status e observações internas. Cadastro, edição dos demais dados, reordenação, encerramento, remoção e autorização de TVs ficam com o administrador.

Os vínculos, o perfil, a empresa e a atribuição são conferidos no servidor, inclusive nas chamadas diretas à API. Desativar o usuário ou o mecânico encerra o acesso ao fluxo em tempo real.

## Estados, ordem e histórico

- **Aguardando:** amarelo.
- **Em serviço:** azul.
- **Pronto:** verde. Continua na televisão até o administrador finalizar ou remover.

Use as setas para reorganizar a ordem. Os filtros de status e mecânico e a pesquisa por veículo ou placa são internos. **Finalizar** e **Remover** exigem confirmação, retiram o atendimento do painel e preservam o histórico. Alterações registram usuário, data/hora, estado anterior e estado posterior. **Histórico** mostra as 100 alterações mais recentes do atendimento.

Vincular uma OS não altera automaticamente suas aprovações financeiras ou seu ciclo de execução. A fila representa o acompanhamento na recepção.

## Painel da televisão

O layout usa uma base de 1920 × 1080, ajustada proporcionalmente à tela. São duas tabelas de dez posições, com até 20 atendimentos por página. Quando há mais registros, as páginas alternam a cada 15 segundos. Nenhum registro fictício é inserido pelo sistema; uma fila vazia mostra uma mensagem correspondente.

A projeção pública contém somente identificador técnico, veículo, resumo do serviço, placa, box ocupado, status, previsão e posição. O campo de serviço admite até 80 caracteres para funcionar como resumo no painel. Observações completas são internas. A assinatura, os checklists e as fotos Base64 existentes permanecem no módulo de Checklist.

## Implementação e implantação

- Banco existente: Firestore, acessado no servidor pelo Firebase Admin já configurado.
- Coleções de trabalho: `queueEntries`, histórico em subcoleção, `queueDisplayEntries`, `queueVehicleLocks`, `queueBoxLocks`, `queueMetadata`, `queueAudit`, `queueTvSessions` e `queueTvPairCodes`. As coleções não duplicam os cadastros de veículos, mecânicos ou OS; guardam referências e os dados do atendimento.
- Cada alteração atualiza o atendimento, sua projeção para a TV e o histórico em uma transação. Os bloqueios por placa e por box impedem entradas ativas duplicadas e ocupações simultâneas do mesmo box. O fluxo da TV consulta os registros da empresa e projeta somente os campos autorizados, incluindo a placa de atendimentos cadastrados antes desta atualização.
- [Listeners do Firestore](https://firebase.google.com/docs/firestore/query-data/listen) alimentam um fluxo SSE no servidor. O navegador recebe atualizações sem recarregar a página. Uma reconexão recebe o estado completo, evitando perda de alterações durante a desconexão.
- A conexão de streaming é renovada a cada 45 segundos; o limite de 60 segundos da função está declarado em `vercel.json`, conforme a [configuração de duração da Vercel](https://vercel.com/docs/functions/configuring-functions/duration). Listeners e temporizadores são encerrados ao desconectar.
- A sessão da TV usa cookie `HttpOnly`, `SameSite=Strict`, `Secure` no ambiente publicado, um segredo aleatório e vínculo com o navegador. O segredo não é colocado na URL, no armazenamento JavaScript ou no painel administrativo. A revogação é acompanhada em tempo real.
- A TV não inicializa o Firebase Auth do funcionário. Suas credenciais não autorizam nenhuma operação administrativa.
- A rota `/fila/tv` é atendida por `fila/tv.html` com `cleanUrls`, já habilitado no projeto. Não exige novas variáveis, Firebase Storage, índices compostos ou acesso anônimo ao Firestore.

## Validação

`node tests/run.js` executa testes de regras da fila, permissões, atribuições, bloqueio de duplicação, preservação de histórico, projeção sem dados privados, autorização, revogação e fluxo SSE.

`tests/queue.browser.test.mjs` usa os handlers reais com um Firestore isolado: testa cadastro a partir da OS, atualização pelo mecânico, visualização somente de leitura, mais de 20 veículos, paginação, Full HD, reconexão, tela cheia, ESC, encerramento e revogação. Os dados de demonstração existem somente dentro dos testes. `tests/browser.test.mjs` cobre a regressão de Checklist, assinatura, Base64, PDF e cadastro de mecânicos.

Esses testes não acessam clientes ou credenciais de produção. Depois do deploy, autorize a TV real e confira a conexão no ambiente publicado e no navegador do equipamento.


O painel da TV exibe as colunas #, Veículo, Serviço, Placa, Box, Status e Previsão. A fonte Inter acompanha o projeto e é carregada localmente. A placa faz parte da projeção autorizada para a recepção; nome do cliente, mecânico e observações internas não são enviados à TV.

Em Gerenciar Fila, o administrador pode selecionar Box 01 a Box 06 durante um serviço. A ocupação é validada em transação por empresa; dois atendimentos não podem ocupar o mesmo box. Alterar para Pronto ou Aguardando, finalizar ou remover libera o box. Registros antigos sem box continuam válidos e mostram um traço até a atribuição. A exibição não depende de modificar a página Oficina.

O campo técnico legado `mechanic` permanece vazio na projeção para manter compatibilidade com TVs abertas antes desta versão. A nova tabela não exibe essa coluna.
