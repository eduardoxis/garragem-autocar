# Gerência Oficina

Acesse **Gerência Oficina** no menu lateral. O administrador acompanha todos os mecânicos; cada login de mecânico continua vendo somente os serviços atribuídos ao seu cadastro vinculado, conforme as permissões já existentes.

O painel usa os mesmos atendimentos de **Gerenciar Fila**, sem duplicar clientes, veículos, mecânicos ou filas. Mudanças de status, responsável, placa, serviço, previsão e box chegam automaticamente às visualizações aplicáveis. O botão **Gerenciar Fila** abre os controles administrativos existentes.

## Organização diária

- Ao adicionar ou editar um atendimento na fila, informe **Dia do serviço**. A previsão de conclusão continua sendo uma data e hora independente.
- Registros antigos usam o dia da previsão; não precisam de migração.
- O painel abre no dia atual, no fuso `America/Sao_Paulo`. O administrador pode consultar datas anteriores e futuras.
- Pendências ativas de dias anteriores continuam visíveis no dia atual, com aviso. A mudança de data não altera nenhum status.
- Atendimentos finalizados permanecem na consulta do seu dia, sem controles de edição. Atendimentos removidos não aparecem. O histórico existente é preservado.
- Cadastros ativos aparecem mesmo sem serviços. Se um profissional for desativado e ainda possuir registros no dia consultado, sua coluna permanece identificada como inativa, para não esconder serviços ou histórico.

## Painel em tela cheia

Use **Tela cheia** para exibir somente o painel, com logo, relógio, data, colunas e legenda. O painel segue sempre o dia atual e acompanha a virada da meia-noite. Saia com ESC ou com **Sair**, no canto superior direito, revelado ao passar o mouse ou receber foco. Ao sair, a consulta administrativa anterior é restaurada.

As colunas seguem os mecânicos cadastrados. Para manter a leitura, cada coluna mostra até cinco serviços por vez, alternando automaticamente a cada 15 segundos quando houver mais registros. Mais de cinco profissionais são distribuídos em grupos alternados. Contadores e indicadores de página mostram o total. No celular e na área administrativa, as colunas se reorganizam conforme o espaço disponível.

## Sincronização e segurança

O fluxo SSE autenticado existente recebe `view: "workshop"` e `day`, observando `queueEntries` e o cadastro de mecânicos da mesma empresa. A reconexão recebe uma nova fotografia completa. Os vínculos e permissões continuam sendo validados e revogados em tempo real. A projeção da oficina não contém clientes, valores ou observações internas.

Os controles de status usam a mesma API transacional, a revisão do atendimento e as regras de boxes. Concluir ou retirar o veículo libera o box. Atribuição de box e edição dos demais campos continuam restritas ao administrador em **Gerenciar Fila**. A TV da recepção conserva sua autorização de leitura e seu layout.

## Validação local

`node tests/run.js` e `node tests/check-syntax.js` verificam regras e sintaxe. `tests/workshop.browser.test.mjs` usa os manipuladores reais e SSE com um banco isolado, sem credenciais nem dados de clientes. Exercita as três telas, transferência, liberação de box, histórico diário, permissões, cadastro dinâmico, reconexão, tela cheia, celular e virada do dia. Requer Playwright e Chrome; `PLAYWRIGHT_PATH` pode apontar para a instalação local.
