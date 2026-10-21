# Relatório da entrega — Garagem Auto Car

Entrega local de 21/10/2026, preparada a partir de garragem-autocar-main (1).zip e da imagem de referência enviada. Não houve push, commit, publicação ou gravação na base real.

## Funcionalidades

- Desconto percentual ou fixo por item, desconto geral e desconto por dinheiro/PIX, nessa ordem. Valor fixo por item é aplicado uma vez ao subtotal, incluindo a quantidade.
- Configuração administrativa independente para dinheiro e PIX, com ativação, edição e prévia. Trocar para cartão/boleto/outra opção remove o desconto exclusivo.
- Totais em centavos, validação no navegador e no servidor, configuração consultada no servidor, preservação da regra acordada em orçamentos salvos e prévia do PDF validada sem gravar o documento.
- Salvamento, edição, importação de orçamentos e follow-up encaminhados pela API, preservando o fluxo existente de lembretes.
- Novo aviso no PDF e slogan solicitado. Valores originais, descontos e total final aparecem no documento; a paginação evita compressão/estiramento e divide as linhas dos itens quando necessário.
- Checklist com cliente/veículo existentes, cadastro de veículo durante o preenchimento, condições de 35 componentes, acessórios, combustível, chaves, quilometragem, serviços e observações.
- Fotos e vídeos privados, múltiplos arquivos, associação à parte do veículo, legendas, prévia/ampliação, remoção no rascunho e tratamento de erro/progresso.
- Diagrama com regiões clicáveis. A arte de veículos foi reaproveitada da referência como ilustração recortada por CSS. Campos, seletores e botões são componentes reais; o formulário completo não usa a imagem como fundo estático.
- Rascunho recuperável, finalização, cancelamento, versões preservadas, motivo/providência de correção e histórico de eventos. O check-in antigo e seus registros continuam disponíveis.
- Assinatura presencial e remota desenhada com dedo ou mouse, limpar/refazer, cancelamento e confirmação final. A verificação no servidor rejeita PNG sem traços.
- Confirmação de ciência por link sem assinatura, divergência com revisão solicitada e nova versão para correção.
- PDF de checklist com fotos e assinatura quando existente, indicação de vídeos, visualização/impressão e compartilhamento/download para WhatsApp.
- Registro manual de envio e da resposta recebida no WhatsApp, com funcionário, horário e versão. Gerar PDF, abrir link ou finalizar vistoria não confirma ciência.
- Painel de acompanhamento com pesquisa e filtros, consulta de versões, mídias e histórico; associação e atalhos por placa com orçamentos e OS.

A ciência registrada não aprova orçamentos, não autoriza reparos e não confirma serviços adicionais.

## Banco de dados

Não foi executada migração em produção nem regravação automática de documentos antigos.

| Estrutura | Alteração preparada |
|---|---|
| quotes | items[].discountType; generalDiscount/generalDiscountType; paymentMethod; snapshot paymentDiscount; totals em centavos; calculationVersion=2. Campos antigos e acréscimos continuam suportados. |
| companies | paymentDiscounts.cash e paymentDiscounts.pix com enabled, type e value. |
| checklists | Documento por vistoria, com empresa, código, versão, revisão concorrente, conteúdo, estado da vistoria e estado da confirmação separados. |
| checklists/{id}/versions | Cópias preservadas de versões anteriores/confirmadas, incluindo suas referências de mídias e assinatura. |
| checklists/{id}/events | Eventos com data/hora, responsável e versão; divergências e motivos de correção registrados. |
| checklistLinks | Hash de token aleatório, vínculo à vistoria/versão, método, expiração e revogação. |
| checklistMedia | Referências privadas, tipo, tamanho, vínculo, versão e caminho do objeto. |

Foi acrescentado índice por empresa/data de criação dos checklists. Regras Firestore e Storage foram preparadas, mas precisam ser publicadas no seu projeto. Não há armazenamento de vídeos/imagens Base64 em campos do Firestore.

## Armazenamento, links, PDF e segurança

Os binários vão para um bucket privado do Cloud Storage. Cada leitura passa pela autorização da API; o cliente recebe um blob temporário. O bucket precisa ter Public Access Prevention=enforced. Tipos de arquivo são limitados e conferidos por assinatura de formato; uploads têm limites de tamanho e quantidade. A assinatura PNG é inspecionada também nos pixels.

O link tem token criptográfico de 256 bits, hash salvo no banco, validade de sete dias e revogação. Trocar link ou versão invalida a autorização anterior. A página pública dispensa conta, mas acessa somente aquela vistoria e as mídias da versão autorizada.

Assinatura/ciência guarda nome informado, declaração, versão exata, data/hora, método e responsável aplicável. A assinatura desenhada não é apresentada como prova isolada da identidade do cliente.

PDFs usam o HTML do documento, jsPDF e html2canvas já empregados pelo projeto. Foram implementadas páginas por blocos/linhas para preservar legibilidade. A impressão é feita a partir do PDF visualizado. O documento inclui as informações reais salvas/validadas, sem inventar percentuais de desconto.

Há autenticação Firebase com verificação de revogação, perfis ativos, permissão por papel/empresa, validação de origem/requisições, limite por rota, escaping de conteúdo, gravações financeiras pela API e controle de versão/revisão. As regras também restringem leitura/alteração de perfis entre empresas. As coleções privadas e o bucket ficam fechados ao acesso direto do cliente.

## Verificações executadas

- 54 testes automatizados passaram, incluindo os oito testes originais.
- 79 arquivos JavaScript passaram na verificação de sintaxe.
- Orçamento com 23 itens foi paginado em sete páginas no teste, preservando todas as linhas e sem sobrepor o rodapé; nenhum erro de JavaScript foi registrado no teste de navegador.
- Conferência de descontos individuais, gerais e de pagamento; troca PIX/cartão; entradas inválidas; centavos; reabertura; regra salva; total adulterado enviado pelo navegador e prévia de PDF sem gravação.
- Exemplo completo conferido: R$ 500,00 - R$ 50,00 - R$ 45,00 - R$ 12,15 = R$ 392,85.
- APIs testadas em armazenamento isolado: permissões, isolamento entre empresas, concorrência, rascunho/finalização, conteúdo bloqueado, link, divergência, nova versão, confirmação, assinatura presencial/remota, mídia privada e expiração/revogação.
- Navegador Chrome: cliente/veículo, avaria, salvar/revisar, finalizar, gerar link, assinatura vazia, desenhar com mouse, limpar/refazer, confirmar, toque emulado em celular e cancelar sem registrar ciência.
- Tela de 390 px sem vazamento horizontal e conferência da visualização de computador.
- Inspeção do HTML do PDF: novo aviso presente, aviso antigo ausente, descontos e total R$ 392,85 correspondentes à tela.
- PDFs de revisão exportados pelo Chromium, renderizados com Poppler e inspecionados visualmente. A referência foi comparada com o Checklist produzido.

A revisão visual preserva a estrutura monocromática da referência, cabeçalho, identificação, vistas dos veículos, acessórios, combustível, serviços, assinatura e rodapé. O logo existente foi reaproveitado em escala cinza, e a tipografia foi aproximada; não é alegada reprodução pixel a pixel.

Os testes de API usam substitutos isolados do Firebase/Storage e não tocaram dados reais. O teste de navegador intercepta as bibliotecas externas de PDF para conferir a composição, e os PDFs de revisão foram exportados pelo Chromium. A execução completa de jsPDF/html2canvas, os serviços reais de autenticação/upload e o compartilhamento efetivo precisam ser validados em homologação com suas credenciais. Não houve teste em aparelho/câmera física nem envio real de mensagem.

## Configurações e limites restantes

1. Configurar as variáveis Firebase Admin e FIREBASE_STORAGE_BUCKET, permissões do bucket, prevenção de acesso público e ambiente Vercel/API.
2. Publicar regras, índice e versão da aplicação de forma coordenada. Um push no Git não publica sozinho as regras Firebase.
3. Definir os descontos da empresa em Configurações. O código não ativa percentuais de exemplo.
4. Limite atual: 2,5 MB por arquivo e 60 arquivos por checklist. Vídeos maiores exigem upload direto/resumível autenticado adicional; não há promessa de uma integração que não existe.
5. Compartilhamento nativo depende do navegador/dispositivo. Na ausência dele, o PDF é baixado para anexar ao WhatsApp; a resposta é conferida manualmente.
6. Definir a política de retenção/descarte e backup da empresa. Links expiram, mas versões/documentos e arquivos privados não são apagados automaticamente. O backup JSON anterior não inclui os binários/versões deste módulo.
7. Conferir os fluxos em homologação com a infraestrutura real antes do uso com clientes.

O passo a passo está em docs/CHECKLIST-E-DESCONTOS.md. Nenhuma dependência paga foi ativada; infraestrutura externa pode envolver custos conforme sua conta/uso. Não foram adicionados dados fictícios aos módulos de produção.

## Arquivos alterados ou criados

| Situação | Arquivo |
|---|---|
| Criado | .env.example |
| Criado | .gitignore |
| Criado | api/checklist-media.js |
| Criado | api/checklists.js |
| Criado | api/quotes.js |
| Criado | api/settings.js |
| Criado | api/_checklist.js |
| Alterado | api/_firebase-admin.js |
| Alterado | api/_security.js |
| Criado | api/_signature.js |
| Criado | assets/checklist-reference.png |
| Criado | checklist.html |
| Criado | css/checklist.css |
| Criado | docs/CHECKLIST-E-DESCONTOS.md |
| Alterado | firebase.json |
| Alterado | firestore.indexes.json |
| Alterado | firestore.rules |
| Alterado | js/components/sidebar.js |
| Alterado | js/firebase/firestore.js |
| Alterado | js/guards.js |
| Alterado | js/modules/check-in/page.js |
| Criado | js/modules/checklist/client.js |
| Criado | js/modules/checklist/document.js |
| Criado | js/modules/checklist/page.js |
| Criado | js/modules/checklist/pdf.js |
| Criado | js/modules/checklist/public.js |
| Criado | js/modules/checklist/signature.js |
| Alterado | js/modules/configuracoes/page.js |
| Alterado | js/modules/crud-page.js |
| Alterado | js/modules/oficina/page.js |
| Alterado | js/modules/orcamentos/page.js |
| Alterado | js/onepage.js |
| Criado | js/services/api.js |
| Criado | js/utils/checklist.js |
| Alterado | js/utils/currency.js |
| Criado | js/utils/discounts.js |
| Alterado | js/utils/masks.js |
| Criado | js/utils/pdf-pages.js |
| Alterado | package.json |
| Alterado | README.md |
| Alterado | service-worker.js |
| Criado | storage.rules |
| Criado | tests/api.test.js |
| Criado | tests/browser.test.mjs |
| Criado | tests/check-syntax.js |
| Criado | tests/checklist.test.js |
| Criado | tests/discounts.test.js |
| Criado | tests/helpers/png.js |
| Alterado | tests/run.js |
| Criado | tests/signature.test.js |
| Alterado | vercel.json |
| Criado | RELATORIO-DA-ENTREGA.md |
