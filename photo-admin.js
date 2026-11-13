'use strict';
// EVENTORIA: standalone in-browser photo manager. No Python, no external scripts.
// Photos are never stored in localStorage. Save to site directory or export as ZIP.
(() => {
  const $ = id => document.getElementById(id);
  const draft = structuredClone(window.EVENTORIA_PHOTO_CONFIG || {services:{},portfolio:{}});
  draft.services ||= {};
  draft.portfolio ||= {};
  const pending = new Map(); // relative path -> File
  const previews = new Map(); // relative path -> object URL
  const readLocal = (key, initial) => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; }
    catch { return initial; }
  };
  const services = readLocal('ev3_services', window.SEED_SERVICES || []);
  const portfolio = readLocal('ev3_portfolio', window.SEED_PORTFOLIO || []);
  const list = {services, portfolio};
  const itemName = (kind, item) => kind==='services' ? item.name : item.title;
  const validTypes = ['image/jpeg','image/png','image/webp'];
  const seen = new Set();
  let selected = 'services';
  let selectedId = String(services[0]?.id || '1');
  function alertUser(message, good=false, bad=false) {
    const box = $('message'); box.hidden = false; box.textContent = message;
    box.className = 'p-message ' + (bad?'bad':good?'good':'');
    box.scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  function entry() { return list[selected].find(x=>String(x.id)===selectedId); }
  function media() {
    if(!draft[selected][selectedId]){
      const source = entry();
      let gallery = Array.isArray(source?.gallery)?source.gallery.filter(Boolean):[];
      if(!gallery.length&&source?.image) gallery=[source.image];
      draft[selected][selectedId] = {image:source?.image||gallery[0]||'',gallery:[...new Set(gallery)]};
    }
    return draft[selected][selectedId];
  }
  function photoURL(path) { return previews.get(path) || path; }
  function escapeHTML(v) {return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function chooseKind() {
    selected = $('kind').value;
    $('item').innerHTML = list[selected].map(x=>`<option value="${escapeHTML(x.id)}">${escapeHTML(itemName(selected,x))}</option>`).join('');
    selectedId = $('item').value;
    render();
  }
  function render() {
    const data = media();
    $('entryName').textContent = itemName(selected, entry()) || 'Нова подія';
    $('count').textContent = `${data.gallery.length} фото`;
    $('galleryList').innerHTML = data.gallery.length ? data.gallery.map((path,i)=>`
      <article class="p-photo" data-photo="${i}">
       <img src="${escapeHTML(photoURL(path))}" alt="Фото ${i+1}" loading="lazy">
       <div class="p-cover">${path===data.image?'★ Головна обкладинка':`Фото №${i+1}`}</div>
       <p class="p-photo-info">${escapeHTML(path.split('/').pop())}</p>
       <div class="p-photo-actions">
         ${path!==data.image?`<button data-action="cover" data-index="${i}">★ Обкладинка</button>`:''}
         <button data-action="up" data-index="${i}" ${i===0?'disabled':''}>↑</button>
         <button data-action="down" data-index="${i}" ${i===data.gallery.length-1?'disabled':''}>↓</button>
         <button data-action="remove" data-index="${i}">Видалити</button>
       </div>
      </article>`).join('') : '<div class="p-warning">Галерея порожня. Додайте фотографію.</div>';
  }
  async function addImages(files, useCover) {
    if(!files.length) return;
    const item = media();
    const warns=[];
    for (const file of files) {
      if(!validTypes.includes(file.type)) { warns.push(`${file.name}: потрібен JPG, PNG або WebP`); continue; }
      if(file.size>16*1024*1024) { warns.push(`${file.name}: файл понад 16 МБ`); continue; }
      const base = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9_-]+/g,'_').slice(0,35) || 'photo';
      const ext = file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
      const stamp = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
      const path = `assets/photos/custom/${selected}_${selectedId}_${base}_${stamp}.${ext}`;
      pending.set(path, file);
      previews.set(path, URL.createObjectURL(file));
      seen.add(path);
      if(!item.gallery.includes(path)) item.gallery.push(path);
      if(useCover){item.image = path;useCover=false;}
      try {
        const bmp=await createImageBitmap(file);
        if(bmp.width<1000) warns.push(`${file.name}: ${bmp.width}×${bmp.height} px — може виглядати розмито`);
        bmp.close();
      } catch { /* Some devices do not support image bitmap; browser will still show it. */ }
    }
    if(!item.image&&item.gallery.length) item.image=item.gallery[0];
    render();
    alertUser(warns.length?warns.join('\n'):'Фотографії додано до добірки. Натисніть збереження праворуч, щоб записати їх у файли сайту.',!warns.length,!!warns.length);
  }
  function move(i, delta){const d=media();const j=i+delta;if(j<0||j>=d.gallery.length)return;[d.gallery[i],d.gallery[j]]=[d.gallery[j],d.gallery[i]];render();}
  function remove(i){const d=media(); const old=d.gallery.splice(i,1)[0]; if(d.image===old)d.image=d.gallery[0]||'';render();}
  function configText(){return '/* EVENTORIA: фото, відредаговані в адмінпанелі. */\nwindow.EVENTORIA_PHOTO_CONFIG = '+JSON.stringify(draft,null,2)+';\n';}
  async function writeFile(dir, filename, data){const fileHandle=await dir.getFileHandle(filename,{create:true});const stream=await fileHandle.createWritable();await stream.write(data);await stream.close();}
  async function saveFolder(){
    if(typeof window.showDirectoryPicker!=='function'){
      alertUser('Цей браузер не підтримує запис до папки. Натисніть «Завантажити ZIP з фото», потім розпакуйте його в папку сайту.',false,true);return;
    }
    try {
      const root=await window.showDirectoryPicker({mode:'readwrite',id:'eventoria-site'});
      try{await root.getFileHandle('index.html');} catch{alertUser('Виберіть саме розпаковану папку EVENTORIA, де знаходиться index.html. Зараз вибрана інша папка.',false,true);return;}
      let current=root;
      for(const path of pending.keys()){
        const parts=path.split('/'),name=parts.pop();current=root;
        for (const segment of parts){current=await current.getDirectoryHandle(segment,{create:true});}
        await writeFile(current,name,pending.get(path));
      }
      await writeFile(root,'photo-config.js',new Blob([configText()],{type:'text/javascript;charset=utf-8'}));
      alertUser(`Збережено! Записано ${pending.size} нових фото та photo-config.js у папку ${root.name}. Тепер відкрийте index.html із цієї папки й перевірте фото. Для GitHub Pages опублікуйте оновлені файли.`,true);
    } catch(err){if(err.name==='AbortError')return;alertUser('Не вдалося записати файли: '+err.message+'\nСкористайтеся кнопкою «Завантажити ZIP з фото».',false,true);}
  }
  function crc32(b){
    let c=0xffffffff;for(let i=0;i<b.length;i++){c^=b[i];for(let j=0;j<8;j++)c=(c&1)?(c>>>1)^0xedb88320:c>>>1;}return(c^0xffffffff)>>>0;
  }
  // Produces a standards-compliant STORE ZIP without external scripts/CDNs.
  async function createZip(files){
    const enc=new TextEncoder();const segments=[],central=[];let offset=0;
    const now=new Date(),dosTime=((now.getHours()&31)<<11)|((now.getMinutes()&63)<<5)|((Math.floor(now.getSeconds()/2))&31);
    const dosDate=(((now.getFullYear()-1980)&127)<<9)|(((now.getMonth()+1)&15)<<5)|(now.getDate()&31);
    for(const [name,content] of files){
      const path=enc.encode(name),bytes=content instanceof Uint8Array?content:new Uint8Array(await content.arrayBuffer()),crc=crc32(bytes);
      const local=new Uint8Array(30+path.length),v=new DataView(local.buffer);
      v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(8,0,true);
      v.setUint16(10,dosTime,true);v.setUint16(12,dosDate,true);v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,path.length,true);
      local.set(path,30);segments.push(local,bytes);
      const mid=new Uint8Array(46+path.length),m=new DataView(mid.buffer);
      m.setUint32(0,0x02014b50,true);m.setUint16(4,20,true);m.setUint16(6,20,true);m.setUint16(8,0x0800,true);m.setUint16(10,0,true);
      m.setUint16(12,dosTime,true);m.setUint16(14,dosDate,true);m.setUint32(16,crc,true);m.setUint32(20,bytes.length,true);m.setUint32(24,bytes.length,true);m.setUint16(28,path.length,true);m.setUint32(42,offset,true);
      mid.set(path,46);central.push(mid);offset+=local.length+bytes.length;
    }
    const centralLen=central.reduce((sum,x)=>sum+x.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);
    e.setUint32(0,0x06054b50,true);e.setUint16(8,central.length,true);e.setUint16(10,central.length,true);e.setUint32(12,centralLen,true);e.setUint32(16,offset,true);
    return new Blob([...segments,...central,end],{type:'application/zip'});
  }
  async function downloadZip(){
    try {
      const configFile=new Blob([configText()],{type:'text/javascript;charset=utf-8'});
      const files=[['photo-config.js',configFile],...pending.entries()];
      const zip=await createZip(files);const url=URL.createObjectURL(zip);const a=document.createElement('a');
      a.href=url;a.download='EVENTORIA_PHOTOS_UPDATE.zip';document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),10000);
      alertUser(`ZIP підготовлено: ${pending.size} нових фото + photo-config.js. Розпакуйте його в папку EVENTORIA зі збереженням структури папок; після перевірки завантажте змінені файли на GitHub.`,true);
    }catch(err){alertUser('Не вдалося створити ZIP: '+err.message,false,true);}
  }
  $('kind').addEventListener('change',chooseKind);
  $('item').addEventListener('change',()=>{selectedId=$('item').value;render();});
  $('coverUpload').addEventListener('change',async e=>{await addImages([...(e.target.files||[])].slice(0,1),true);e.target.value='';});
  $('galleryUpload').addEventListener('change',async e=>{await addImages([...(e.target.files||[])],false);e.target.value='';});
  $('galleryList').addEventListener('click',e=>{
    const button=e.target.closest('button[data-action]');if(!button)return;
    const i=Number(button.dataset.index), action=button.dataset.action;
    if(action==='cover'){media().image=media().gallery[i];render();}
    if(action==='remove')remove(i);
    if(action==='up')move(i,-1);
    if(action==='down')move(i,1);
  });
  $('saveFolder').addEventListener('click',saveFolder);
  $('downloadZip').addEventListener('click',downloadZip);
  chooseKind();
})();
