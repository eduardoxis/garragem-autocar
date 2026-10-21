# Checklist e descontos — configuração e operação

As alterações são locais. Nenhum push, implantação ou alteração de dados do Firebase foi feito por esta entrega.

## Instalação no seu repositório

O ZIP original não contém a pasta .git. Copie os arquivos desta entrega para o seu clone Git existente, preservando a pasta .git e suas variáveis de ambiente. Confira as diferenças antes do commit. Não execute git init nesta cópia esperando recuperar o histórico do GitHub.

Use Node.js 24 para os testes desta entrega. O projeto mantém JavaScript nativo, Firebase Authentication, Firestore, Firebase Admin e funções da Vercel.

1. Instale as dependências já declaradas em package.json com npm install.
2. Configure as variáveis de .env.example em .env.local para desenvolvimento e no projeto Vercel para publicação. Não grave chaves reais no Git.
3. Provisione um bucket privado do Cloud Storage e informe FIREBASE_STORAGE_BUCKET. Ative Public Access Prevention como enforced. O código verifica essa configuração antes de aceitar arquivos. Garanta à conta de serviço acesso aos objetos e à leitura dos metadados do bucket. Não conceda acesso público ao bucket.
4. Publique as regras e o índice do Firestore e as regras de Storage no projeto Firebase correto. O comando, a partir da raiz do projeto, é: firebase deploy --project SEU_PROJECT_ID --only firestore:rules,firestore:indexes,storage. Substitua SEU_PROJECT_ID pelo identificador real. O comando depende da Firebase CLI autenticada e da configuração do bucket.
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

Arquivos são binários privados no Cloud Storage. O Firestore guarda referências e metadados; vídeos e fotos não são armazenados em campos Base64. Base64 é usado apenas no transporte de uploads pequenos à função, com limite de tamanho.

São permitidos JPG, PNG, WebP, MP4 e WebM, até 2,5 MB por arquivo e 60 arquivos por checklist. O limite respeita a infraestrutura atual de funções JSON. Para vídeos maiores, será necessário acrescentar upload direto/resumível autenticado; este fluxo não foi simulado. Há seleção múltipla, acesso à câmera/gravador compatível do dispositivo, progresso de envio, legendas, vínculo à parte inspecionada, ampliação e remoção durante o rascunho. Fotografias HEIC precisam ser convertidas para um formato permitido. Não há editor de desenho sobre fotografias; as avarias são marcadas pelo diagrama e descritas nos componentes.

A consulta de cada arquivo é autorizada pela API para aquele checklist/versão. O navegador recebe um blob temporário; não são geradas URLs públicas permanentes. O PDF incorpora fotos e a assinatura. Vídeos são indicados para consulta segura com a equipe, sem tentar incluí-los como imagem.

A assinatura utiliza Canvas e Pointer Events para dedo ou mouse, com limpar, cancelar e confirmação final. Sem traços, ela não pode ser confirmada. O servidor examina os pixels do PNG para rejeitar uma assinatura vazia mesmo com uma requisição adulterada. A imagem é vinculada à versão, nome informado, declaração, data/hora e método presencial/remoto. Ela registra ciência do documento; não comprova isoladamente a identidade de quem assinou.

## Links e WhatsApp

Links usam 32 bytes aleatórios criptográficos. Somente o hash do token é salvo no banco. O token fica no fragmento do endereço (#), e é enviado à API em corpo JSON. A validade é de sete dias, com revogação e invalidação por nova versão ou troca de link. Não há acesso a outros clientes nem listagem pública. O cliente não precisa criar conta. A versão confirmada continua consultável enquanto o link estiver válido; uma segunda confirmação é bloqueada.

A confirmação por link apresenta a declaração e exige aceite. A assinatura remota apresenta a mesma vistoria e o campo de desenho. A divergência registra Revisão solicitada.

O botão Compartilhar link abre o WhatsApp com a mensagem preparada. Para arquivos, usa-se o compartilhamento nativo quando suportado. Nos demais navegadores o PDF é baixado para anexar manualmente à conversa. A geração do PDF não registra envio nem confirmação. O funcionário registra o envio e, somente depois de conferir a mensagem recebida, registra a ciência via WhatsApp, com usuário, horário e versão. Não foi implementada uma integração oficial inexistente com o WhatsApp.

## Segurança e retenção

O servidor valida o token Firebase, inclusive revogação, perfil ativo, papel e empresa. As regras do Firestore bloqueiam escrita direta de orçamentos e acesso direto às coleções privadas do checklist. O acesso a perfis de outras empresas também foi restringido. Há validação de origem, tipo/tamanho de requisição, limite de tentativas por rota, escaping de conteúdo e controle de revisão para evitar sobrescritas concorrentes. A Storage é fechada ao acesso direto, e o bucket exige prevenção de acesso público.

Links expiram automaticamente em sete dias. Documentos e versões assinadas não são apagados automaticamente: a empresa ainda precisa definir seu prazo de retenção e sua rotina autorizada de descarte e backup. Uploads interrompidos antes do vínculo podem deixar arquivos privados sem referência; inclua sua conferência na rotina de manutenção. O backup JSON antigo não foi convertido em backup de arquivos/versões: para este módulo, use backup do Firestore e do bucket. Não foi alegada certificação jurídica nem conformidade legal automática.

## Testes e limites de validação

npm test executa os testes unitários e de APIs em armazenamento isolado, sem conexão com a produção. npm run check verifica sintaxe de todos os arquivos JavaScript.

npm run test:browser usa Playwright disponível no ambiente de desenvolvimento e Google Chrome instalado. Também aceita PLAYWRIGHT_PATH para a instalação da biblioteca, BROWSER_CHANNEL para outro canal e QA_OUTPUT_DIR para os arquivos de revisão. Para exportar os PDFs de revisão com Chromium, defina PDF_QA=1. Os testes usam dados identificados como teste e respostas isoladas de serviços externos.

Foram testados cálculos financeiros, persistência, regras de acesso, versões, divergência, assinatura presencial/remota, PNG vazio, mídia privada, expiração/revogação, prévia do PDF, mouse, toque emulado, limpeza/cancelamento, responsividade e conteúdo do documento. O novo texto e o total de R$ 392,85 foram conferidos no documento. PDFs de revisão foram renderizados e inspecionados visualmente.

Não foram usados usuários reais, câmera física, aparelho físico, bucket de produção, mensagens reais do WhatsApp ou credenciais da implantação. Esses testes precisam ser concluídos na homologação com sua configuração real. A exportação de revisão com Chromium valida a composição HTML; o teste do navegador intercepta as bibliotecas externas de PDF para inspecionar o documento. O download final por jsPDF/html2canvas, as fontes/CDNs e os uploads reais precisam da checagem de homologação.
