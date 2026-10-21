// Paginate semantic blocks and item rows before rasterization; never stretch an oversized sheet.
export function paginateQuoteDocument(root,{selector='.sheet',headerSelector=null}={}){
 const doc=root.ownerDocument||root;
 const sources=[...root.querySelectorAll(selector)];
 for(const source of sources){
 const content=source.querySelector(':scope > .content');
 const footer=source.querySelector(':scope > footer');
 const repeated=headerSelector?source.querySelector(headerSelector):null;
 const groups=content?[...content.children]:[...source.children].filter(n=>n!==footer&&n!==repeated);
 const headers=content?[...source.children].filter(n=>n!==content&&n!==footer):repeated?[repeated]:[];
 const pages=[];let page,flow,foot;
 const next=()=>{page=source.cloneNode(false);Object.assign(page.style,{position:'relative',height:'1123px',minHeight:'1123px',overflow:'hidden'});source.before(page);for(const h of headers)page.append(h.cloneNode(true));flow=content?content.cloneNode(false):doc.createElement('div');page.append(flow);foot=footer?.cloneNode(true);if(foot){Object.assign(foot.style,{position:'absolute',left:'0',right:'0',bottom:'0',marginTop:'0'});page.append(foot);}pages.push(page);};
 const fits=node=>node.getBoundingClientRect().bottom+12<=(foot?foot.getBoundingClientRect().top:page.getBoundingClientRect().bottom-25);
 const append=node=>{flow.append(node);if(!fits(node)&&flow.children.length>1){node.remove();next();flow.append(node);}if(!fits(node))throw new Error('Uma seção do orçamento excede uma página. Reduza o texto dessa seção para gerar o PDF.');};
 next();
 for(const group of groups){
 if(group.tagName==='TABLE'){
 const rows=[...group.querySelectorAll('tbody > tr')];let table,body;
 const tableStart=()=>{table=group.cloneNode(false);const head=group.querySelector('thead');if(head)table.append(head.cloneNode(true));body=doc.createElement('tbody');table.append(body);flow.append(table);};tableStart();
 for(const original of rows){const row=original.cloneNode(true);body.append(row);if(!fits(table)){
 row.remove();if(!body.children.length)table.remove();next();tableStart();body.append(row);
 if(!fits(table))throw new Error('A descrição de um item excede uma página. Reduza o texto do item.');
 }}
 }else append(group.cloneNode(true));
 }
 source.remove();
 }
 return [...root.querySelectorAll(selector)];
}
