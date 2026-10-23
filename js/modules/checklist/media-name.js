const extensions={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'};
export const isFileCaption=value=>/\.(png|jpe?g|webp|mp4|webm)$/i.test(String(value||'').trim());
export function mediaFilename(media,contentType=''){
 const suffix=String(media.caption||'').trim().match(/\.(png|jpe?g|webp|mp4|webm)$/i)?.[1]?.toLowerCase();
 const ext=extensions[contentType]||suffix||'png';
 const part=String(media.part||'Geral').replace(/[<>:"/\\|?*\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim().slice(0,120)||'Geral';
 return part+'.'+ext;
}
export const mediaCaption=(media,contentType='')=>isFileCaption(media.caption)?mediaFilename(media,contentType):String(media.caption||'');
