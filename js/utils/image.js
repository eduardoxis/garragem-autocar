const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_SIDE = 1024;
const JPEG_QUALITY = 0.72;
const MAX_STORED_CHARS = 650000;

export async function imageFileToDataUrl(file) {
  if (!file || !file.size) return null;
  if (!file.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem válido.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('A imagem deve ter no máximo 5 MB.');

  const source = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext('2d');
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  let output = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  while (output.length > MAX_STORED_CHARS && canvas.width > 320) {
    canvas.width = Math.round(canvas.width * 0.8);
    canvas.height = Math.round(canvas.height * 0.8);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    output = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  }
  source.close();
  if (output.length > MAX_STORED_CHARS) throw new Error('Não foi possível otimizar a imagem para armazenamento local. Escolha uma foto menor.');
  return output;
}
