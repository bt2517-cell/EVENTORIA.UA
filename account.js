/* EVENTORIA: Supabase Auth + protected customer orders. */
(()=>{
 const url=String(window.EVENTORIA_SUPABASE_URL||'').trim();
 const key=String(window.EVENTORIA_SUPABASE_KEY||'').trim();
 const client=(url&&key&&window.supabase)?window.supabase.createClient(url,key):null;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const api={configured:()=>!!client,client,
  async getUser(){if(!client)return null;const {data,error}=await client.auth.getUser();if(error)return null;return data.user;},
  async submitOrder(order){
   if(!client)throw Error('Потрібно підключити базу даних Supabase.');
   const user=await api.getUser();if(!user)throw Error('Спочатку увійдіть або зареєструйтеся у розділі «Мій кабінет».');
   const {error}=await client.from('customer_orders').insert({user_id:user.id, details:order, status:'Нова'});
   if(error)throw Error('Не вдалося записати замовлення: '+error.message);
  }
 };
 window.EVENTORIA_ACCOUNT=api;
 const el=document.getElementById('accountRoot');if(!el)return;
 const status=()=>document.getElementById('accountStatus');
 const note=s=>{status().textContent=s;};
 function form(mode){
  el.innerHTML=`<div class="account-tabs"><button class="btn ${mode==='login'?'active':''}" data-mode="login">Увійти</button><button class="btn ${mode==='signup'?'active':''}" data-mode="signup">Реєстрація</button></div>
  <form id="accountForm"><div class="formgrid"><div class="field"><label>Email</label><input type="email" name="email" autocomplete="email" required maxlength="150"></div><div class="field"><label>Пароль (мінімум 8 символів)</label><input type="password" name="password" autocomplete="${mode==='signup'?'new-password':'current-password'}" required minlength="8"></div></div><button class="btn primary" style="margin-top:20px">${mode==='login'?'Увійти':'Зареєструватися'}</button></form><p class="small">Після реєстрації може знадобитися підтвердження електронної пошти.</p>`;
  el.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>form(b.dataset.mode));
  el.querySelector('#accountForm').onsubmit=async e=>{
   e.preventDefault();const f=new FormData(e.target),email=f.get('email'),password=f.get('password');
   const btn=e.target.querySelector('button');btn.disabled=true;note('Перевіряємо дані…');
   try{
    const res=mode==='signup'?await client.auth.signUp({email,password}):await client.auth.signInWithPassword({email,password});
    if(res.error)throw res.error;
    if(mode==='signup'&&!res.data.session){note('Перевірте пошту й підтвердьте реєстрацію. Потім увійдіть.');btn.disabled=false;return;}
    await show();
   }catch(err){note('Помилка: '+err.message);btn.disabled=false;}
  };
 }
 async function show(){
  const user=await api.getUser();if(!user){form('login');return;}
  el.innerHTML=`<p>Ви увійшли як <b>${esc(user.email)}</b></p><div style="display:flex;gap:10px;flex-wrap:wrap;margin:16px 0"><a class="btn primary" href="order.html">Створити замовлення</a><button class="btn" id="logoutBtn">Вийти</button></div><h2 style="font-size:30px;margin:24px 0 12px">Мої замовлення</h2><div class="account-orders" id="myOrders"><p>Завантаження…</p></div>`;
  document.getElementById('logoutBtn').onclick=async()=>{await client.auth.signOut();note('Ви вийшли з акаунта');await show();};
  const {data,error}=await client.from('customer_orders').select('id,created_at,details,status').order('created_at',{ascending:false});
  const orders=document.getElementById('myOrders');if(error){orders.textContent='Не вдалося отримати замовлення: '+error.message;return;}
  orders.innerHTML=data?.length?data.map(({created_at,details:d,status})=>`<article><b>${esc(d.service||d.type||'Подія')}</b><span class="pill" style="margin-left:10px">${esc(status)}</span><p>${esc(new Date(created_at).toLocaleString('uk-UA'))}</p><p><b>Дата:</b> ${esc(d.date||'—')} · <b>Місто:</b> ${esc(d.city||'—')}</p><p><b>Гостей:</b> ${esc(d.guests||'—')} · <b>Бюджет:</b> ${esc(d.budget||'—')}</p><p>${esc(d.details||'')}</p></article>`).join(''):'<p>Замовлень ще немає.</p>';
 }
 if(!client){el.innerHTML='<div class="warning"><b>Кабінет ще не активовано.</b> Спочатку власнику сайту потрібно підключити Supabase за інструкцією з архіву. Ніякі паролі тут не збираються.</div>';return;}
 show();
})();
