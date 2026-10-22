import { getIcon } from '../../components/icons.js';

export function uploadSection(){
 return `<section class="card checklist-upload" id="checklist-upload" aria-labelledby="upload-title">
 <header class="card-header"><h2 id="upload-title">${getIcon('image',25)}Fotos e vídeos</h2></header>
 <div class="card-body">
 <p class="upload-description">Arquivos privados · JPG, PNG, WebP, MP4 ou WebM · Fotos até 5 MB; vídeos até 2,5 MB.</p>
 <p class="upload-label">Selecionar várias fotos ou vídeos de uma vez</p>
 <div class="upload-dropzone" id="upload-dropzone" role="region" aria-label="Área para arrastar e soltar arquivos">
 ${getIcon('upload',34)}<strong>Arraste e solte os arquivos aqui</strong><span>ou</span>
 <button class="btn upload-choose" type="button" data-pick="files">${getIcon('folder')}Escolher arquivos</button>
 <span id="file-selection" class="upload-muted" aria-live="polite">Nenhum arquivo escolhido</span>
 <input id="files" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" aria-label="Selecionar fotos e vídeos" multiple hidden>
 </div>
 <p class="upload-help">Até 60 arquivos por checklist. Você pode selecionar várias fotos do painel, pneus e carro ou continuar adicionando pela câmera.</p>
 <div class="upload-capture-options">
 <div class="upload-capture"><span class="capture-icon">${getIcon('camera',27)}</span><div><strong>Fotografar com a câmera</strong><p>Tire uma foto agora usando a câmera do seu dispositivo.</p></div><button class="btn" type="button" data-pick="camera">${getIcon('camera')}Escolher arquivo</button><input id="camera" type="file" accept="image/*" capture="environment" aria-label="Fotografar com a câmera" hidden></div>
 <div class="upload-capture"><span class="capture-icon capture-video">${getIcon('video',27)}</span><div><strong>Gravar vídeo</strong><p>Grave um vídeo agora usando a câmera do seu dispositivo.</p></div><button class="btn" type="button" data-pick="video-camera">${getIcon('video')}Escolher arquivo</button><input id="video-camera" type="file" accept="video/mp4,video/webm" capture="environment" aria-label="Gravar vídeo" hidden></div>
 </div>
 <p id="upload-progress" role="status"></p><p id="attachment-count" aria-live="polite"></p>
 <div class="checklist-media upload-attachments" id="attachments"></div>
 </div></section>`;
}
