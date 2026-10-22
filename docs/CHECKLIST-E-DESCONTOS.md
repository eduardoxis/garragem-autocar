# Checklist e descontos — configuração e operação

As alterações são locais. Nenhum push, implantação ou alteração de dados do Firebase foi feito por esta entrega.

## Instalação no seu repositório

O ZIP original não contém a pasta .git. Copie os arquivos desta entrega para o seu clone Git existente, preservando a pasta .git e suas variáveis de ambiente. Confira as diferenças antes do commit. Não execute git init nesta cópia esperando recuperar o histórico do GitHub.

Use Node.js 24 para os testes desta entrega. O projeto mantém JavaScript nativo, Firebase Authentication, Firestore, Firebase Admin e funções da Vercel.

1. Instale as dependências já declaradas em package.json com npm install.
2. Configure as variáveis de .env.example em .env.local para desenvolvimento e no projeto Vercel para publicação. Não grave chaves reais no Git.
3. Não é necessário configurar Firebase Storage. Fotos são otimizadas no navegador; fotos, vídeos e assinaturas são persistidos em Base64 em documentos privados do Firestore, acessíveis somente pela API.
4. Publique as regras e o índice do Firestore no projeto correto: firebase deploy --project SEU_PROJECT_ID --only firestore:rules,firestore:indexes. O comando depende da Firebase CLI autenticada.
5. Publique a versão da aplicação que inclui as novas APIs. As novas regras bloqueiam gravações diretas em quotes: coordene a atualização das regras e da aplicação. Fazer push no Git não publica automaticamente as regras do Firebase.
6. Execute npm run dev para servir a aplicação e suas APIs. Abrir index.html diretamente ou usar apenas um servidor estático não executa as funções /api.
7. Faça uma validação em ambiente de homologação antes de usar dados reais: autenticação, gravação, upload, consulta remota, assinatura e download do PDF.

A infraestrutura de armazenamento e a execução na nuvem dependem da sua conta e podem gerar custos conforme o uso/plano. Não foram criados recursos externos nem ativados serviços pagos.

## Descontos

Configurações da empresa contém controles independentes para dinheiro e PIX, com ativação, tipo (%/R$), valor e base editável de prévia.

No orçamento, cada item tem desconto próprio. O valor fixo incide uma única vez no subtotal da quantidade. A ordem é: itens, desconto geral e desconto da forma de pagamento. Cartões, boleto e outras opções removem o desconto especial. Acréscimos antigos continuam contabilizados e discriminados.

Os cálculos arredondam cada etapa em centavos. Descontos negativos, vazios, inválidos, percentuais acima de 100 e valores fixos acima do saldo são rejeitados. A API recalcula o orçamento, ignora totais enviados pelo navegador e consulta a configuração da empresa. A prévia do PDF também passa pela API e não grava o orçamento. Um documento ainda não salvo aparece como PRÉVIA.

Orçamentos novos guardam a regra de pagamento efetivamente acordada. Alterar a configuração da empresa não recalcula silenciosamente os já salvos. Alterar a forma de pagamento no editor seleciona a configuração correspondente. Registros antigos não são migrados ou atualizados automaticamente.

O texto sobre pagamentos foi substituído pelo texto solicitado, e a frase do cabeçalho é “O carro é seu, o compromisso é nosso.”. O resumo mostra os descontos efetivos. O PDF conserva o estilo existente e cria páginas adicionais quando necessário, evitando esticar/comprimir uma página com conteúdo excedente.

## Checklist

O menu Checklist está disponível para administradores, atendentes e mecânicos. O check-in anterior continua acessível, com seus registros preservados e um atalho para o módulo completo. Clientes e veículos existentes são reutilizados; o veículo pode ser cadastrado durante a vistoria. A placa é conferida entre os veículos carregados para evitar duplicação acidental.

A vistoria registra identificação, entrada, quilometragem, chaves, combustível, motivo, serviços, objetos, acessórios e condições externas/internas. Os componentes começam como Não inspecionado; os acessórios começam como Não verificado. As regiões do diagrama abrem seus campos correspondentes. Há associação opcional com orçamento e OS e atalhos por placa nos detalhes.

1. Salve o rascunho e adicione as mídias.
2. Revise o documento completo, incluindo avarias e itens não inspecionados.
3. Finalize a vistoria: a finalização não confirma ciência do cliente.
4. Escolha assinatura, confirmação por link ou PDF para WhatsApp. Os métodos podem ser alternados, revogando o link anterior.
5. Para corrigir conteúdo finalizado, escolha Nova versão / corrigir e registre a providência adotada. A versão anterior e seu histórico são preservados. Uma divergência precisa ser resolvida em nova versão antes de solicitar nova ciência.

O painel pesquisa por cliente, placa e número e filtra data, responsável e status. Os registros são buscados em páginas no servidor; os filtros são aplicados ao conjunto carregado. Versões e eventos podem ser consultados nos detalhes.

## Mídias e assinatura

Arquivos são armazenados em Base64, divididos em partes de até 500.000 caracteres em checklistMedia/{id}/chunks. A API valida acesso, vínculo com a versão, tamanho e integridade SHA-256 na leitura. Fotos de até 5 MB são otimizadas para JPEG; vídeos e assinaturas aceitam até 2,5 MB. Assinaturas permanecem PNG e mantêm a validação dos traços. Não é usado Firebase Storage.

São permitidos JPG, PNG, WebP, MP4 e WebM, até 2,5 MB por arquivo e 60 arquivos por checklist. O limite respeita a infraestrutura atual de funções JSON. Para vídeos maiores, será necessário acrescentar upload direto/resumível autenticado; este fluxo não foi simulado. Há seleção múltipla, acesso à câmera/gravador compatível do dispositivo, progresso de envio, legendas, vínculo à parte inspecionada, ampliação e remoção durante o rascunho. Fotografias HEIC precisam ser convertidas para um formato permitido. Não há editor de desenho sobre fotografias; as avarias são marcadas pelo diagrama e descritas nos componentes.

A consulta de cada arquivo é autorizada pela API para aquele checklist/versão. O navegador recebe um blob temporário; não são geradas URLs públicas permanentes. O PDF incorpora fotos e a assinatura. Vídeos são indicados para consulta segura com a equipe, sem tentar incluí-los como imagem.

A assinatura utiliza Canvas e Pointer Events para dedo ou mouse, com limpar, cancelar e confirmação final. Sem traços, ela não pode ser confirmada. O servidor examina os pixels do PNG para rejeitar uma assinatura vazia mesmo com uma requisição adulterada. A imagem é vinculada à versão, nome informado, declaração, data/hora e método presencial/remoto. Ela registra ciência do documento; não comprova isoladamente a identidade de quem assinou.

## Links e WhatsApp

Links usam 32 bytes aleatórios criptográficos. Somente o hash do token é salvo no banco. O token fica no fragmento do endereço (#), e é enviado à API em corpo JSON. A validade é de sete dias, com revogação e invalidação por nova versão ou troca de link. Não há acesso a outros clientes nem listagem pública. O cliente não precisa criar conta. A versão confirmada continua consultável enquanto o link estiver válido; uma segunda confirmação é bloqueada.

A confirmação por link apresenta a declaração e exige aceite. A assinatura remota apresenta a mesma vistoria e o campo de desenho. A divergência registra Revisão solicitada.

O botão Compartilhar link abre o WhatsApp com a mensagem preparada. Para arquivos, usa-se o compartilhamento nativo quando suportado. Nos demais navegadores o PDF é baixado para anexar manualmente à conversa. A geração do PDF não registra envio nem confirmação. O funcionário registra o envio e, somente depois de conferir a mensagem recebida, registra a ciência via WhatsApp, com usuário, horário e versão. Não foi implementada uma integração oficial inexistente com o WhatsApp.

## Segurança e retenção

O servidor valida o token Firebase, revogação, perfil, papel e empresa. As regras bloqueiam acesso direto às coleções privadas e às partes Base64. A leitura passa pela API autenticada ou pelo link válido do cliente. São mantidos controles de origem, revisão e limites de requisição.

Links expiram em sete dias. Documentos e versões assinadas não são apagados automaticamente. Uploads interrompidos podem deixar partes privadas sem vínculo; a manutenção deve considerar isso. O backup deste módulo precisa incluir as subcoleções do Firestore. Não há dependência de backup de bucket.

## Testes e limites de validação

npm test executa os testes unitários e de APIs em armazenamento isolado, sem conexão com a produção. npm run check verifica sintaxe de todos os arquivos JavaScript.

npm run test:browser usa Playwright disponível no ambiente de desenvolvimento e Google Chrome instalado. Também aceita PLAYWRIGHT_PATH para a instalação da biblioteca, BROWSER_CHANNEL para outro canal e QA_OUTPUT_DIR para os arquivos de revisão. Para exportar os PDFs de revisão com Chromium, defina PDF_QA=1. Os testes usam dados identificados como teste e respostas isoladas de serviços externos.

Foram testados cálculos financeiros, persistência, regras de acesso, versões, divergência, assinatura presencial/remota, PNG vazio, mídia privada, expiração/revogação, prévia do PDF, mouse, toque emulado, limpeza/cancelamento, responsividade e conteúdo do documento. O novo texto e o total de R$ 392,85 foram conferidos no documento. PDFs de revisão foram renderizados e inspecionados visualmente.

Testes usam dados fictícios e serviços isolados. Não houve teste com câmera física, envio real de WhatsApp ou credenciais de produção. O teste de navegador intercepta bibliotecas externas de PDF; a geração final por jsPDF/html2canvas e os uploads na implantação precisam de validação em homologação.

## Baixar e enviar o PDF

Abra um checklist finalizado e use **Baixar PDF** ou **Enviar PDF ao cliente**. A assinatura registrada e as fotos são incluídas no arquivo. No celular, prepare o PDF e toque em **Compartilhar arquivo PDF** para escolher o aplicativo disponível. No computador, baixe o arquivo, abra a conversa pelo botão **Abrir WhatsApp do cliente** e anexe o PDF usando o clipe. Não há envio automático nem registro automático de ciência ou envio.

## Layout compacto e várias fotos

O PDF exibe o cabeçalho apenas na primeira página. As condições ficam em duas colunas, sem dividir descrições curtas em várias linhas de continuação. Observações aproveitam o espaço da última folha de condições e as fotos ficam em pares. A assinatura e os textos completos permanecem no documento.

Use **Selecionar várias fotos ou vídeos de uma vez** para enviar um lote. Cada checklist aceita até 60 arquivos, e é possível continuar adicionando fotos pela câmera. As fotos são otimizadas e salvas em Base64.

A assinatura registrada aparece na primeira folha e também junto da declaração de ciência, na visualização interna, no link de consulta do cliente e no PDF. Se não for possível carregar uma assinatura registrada, a geração do PDF é interrompida para evitar exportar o documento sem ela.

A área de fotos permite arrastar e soltar arquivos ou usar o botão **Escolher arquivos**. Os atalhos de câmera e vídeo continuam disponíveis. Cada cartão reúne prévia, parte do veículo, legenda e remoção; o contador é atualizado ao remover uma imagem. Salve o checklist para conservar as alterações de parte, legenda ou remoção.

## Carregamento de dados

A listagem e a leitura do Checklist passam pela camada de dados compartilhada do projeto (`listRecords` e `getRecord`). As chamadas de servidor e as mídias utilizam o mesmo serviço `api` usado em Orçamentos, preservando autenticação e respostas de erro. Os dados do Checklist continuam no Firestore e as mídias continuam em Base64.

O registro e seu histórico são buscados juntos, sem uma segunda requisição de histórico ao abrir. As respostas de telas anteriores não atualizam o formulário aberto por **Continuar preenchimento**. As operações de versão, assinatura e link público permanecem validadas no servidor; não são necessárias novas regras ou migração para esta padronização.
