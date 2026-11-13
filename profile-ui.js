/* EVENTORIA — authentication modal and profile menu, powered by existing Supabase client. */
(()=>{
'use strict';
const api=window.EVENTORIA_ACCOUNT;
if(!api||!api.configured()){
  console.warn('EVENTORIA: Supabase account is not configured.');
}
const client=api?.client||null;
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const userLabel=user=>user?.user_metadata?.full_name||user?.email?.split('@')[0]||'Профіль';
let currentUser=null, dlg=null, profileButton=null, profileMenu=null, previousFocus=null;

function init(){
  addProfileControl();
  makeDialog();
  if(document.getElementById('evProfileDashboard')) renderDashboard('loading');
  if(client){
    client.auth.onAuthStateChange((_event,session)=>{
      currentUser=session?.user||null;
      updateProfileControl();
      if(document.getElementById('evProfileDashboard')) setTimeout(()=>renderDashboard(),0);
    });
    client.auth.getUser().then(({data})=>{currentUser=data?.user||null;updateProfileControl();if(document.getElementById('evProfileDashboard'))renderDashboard();}).catch(()=>updateProfileControl());
  }else{updateProfileControl();if(document.getElementById('evProfileDashboard'))renderDashboard();}
  document.addEventListener('click',event=>{
    if(profileMenu&&!profileMenu.contains(event.target)&&!profileButton?.contains(event.target))closeMenu();
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenu();closeDialog();}});
  window.addEventListener('hashchange',()=>{if(document.getElementById('evProfileDashboard'))renderDashboard();});
}
function addProfileControl(){
 const nav=document.querySelector('.navright');
 if(!nav){return;}
 const container=document.createElement('div');container.className='ev-account-nav';
 container.innerHTML=`<button type="button" class="ev-account-button" aria-label="Вхід або профіль" title="Мій профіль" aria-expanded="false"><svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.4-4 3-6 7.5-6s7.1 2 7.5 6"/></svg><span class="ev-account-name">Увійти</span></button><div class="ev-account-menu" hidden></div>`;
 const first=nav.querySelector('.nav-cta');if(first)first.after(container);else nav.prepend(container);
 profileButton=container.querySelector('button');profileMenu=container.querySelector('.ev-account-menu');
 profileButton.addEventListener('click',()=>{if(currentUser){profileMenu.hidden=!profileMenu.hidden;profileButton.setAttribute('aria-expanded',String(!profileMenu.hidden));}else openDialog('login');});
}
function updateProfileControl(){
 if(!profileButton)return;
 profileButton.querySelector('.ev-account-name').textContent=currentUser?userLabel(currentUser):'Увійти';
 profileButton.setAttribute('aria-label',currentUser?'Меню профілю':'Увійти або зареєструватися');
 profileMenu.innerHTML=currentUser?`<div class="ev-menu-identity"><strong>${html(userLabel(currentUser))}</strong><small>${html(currentUser.email)}</small></div><a href="account.html#profile">Мої дані</a><a href="account.html#orders">Мої замовлення</a><button type="button" id="evSignOut">Вийти</button>`:'';
 profileMenu.querySelector('#evSignOut')?.addEventListener('click',signOut);
 closeMenu();
}
function closeMenu(){if(profileMenu)profileMenu.hidden=true;profileButton?.setAttribute('aria-expanded','false');}
async function signOut(){closeMenu();if(!client)return;const {error}=await client.auth.signOut();if(error){alert('Не вдалося вийти: '+error.message);return;}currentUser=null;updateProfileControl();if(document.getElementById('evProfileDashboard'))renderDashboard();}
function makeDialog(){
 dlg=document.createElement('div');dlg.className='ev-auth-backdrop';dlg.hidden=true;
 dlg.innerHTML=`<section class="ev-auth-modal" role="dialog" aria-modal="true" aria-labelledby="evAuthTitle"><button type="button" class="ev-auth-close" aria-label="Закрити вікно">×</button><div class="ev-auth-brand">EVENT<span>ORIA</span></div><p class="ev-auth-eyebrow">ОСОБИСТИЙ КАБІНЕТ</p><h2 id="evAuthTitle">Раді вас бачити!</h2><p class="ev-auth-subtitle">Увійдіть, щоб зберігати замовлення та переглядати їх у кабінеті.</p><div class="ev-auth-tabs" role="group" aria-label="Вхід або реєстрація"><button type="button" data-ev-mode="login">Увійти</button><button type="button" data-ev-mode="signup">Реєстрація</button></div><form id="evAuthForm"><label>Email<input name="email" type="email" autocomplete="email" maxlength="150" required placeholder="name@example.com"></label><label>Пароль<input name="password" type="password" minlength="8" maxlength="128" required autocomplete="current-password" placeholder="Щонайменше 8 символів"></label><button type="submit" class="ev-auth-submit">Увійти</button></form><p class="ev-auth-message" role="status" aria-live="polite"></p><p class="ev-auth-hint">Під час реєстрації може знадобитися підтвердження електронної пошти.</p></section>`;
 document.body.appendChild(dlg);
 dlg.querySelector('.ev-auth-close').addEventListener('click',closeDialog);
 dlg.addEventListener('click',ev=>{if(ev.target===dlg)closeDialog();});
 dlg.querySelectorAll('[data-ev-mode]').forEach(btn=>btn.addEventListener('click',()=>selectMode(btn.dataset.evMode)));
 dlg.querySelector('form').addEventListener('submit',submitAuth);
}
let mode='login';
function selectMode(next){
 mode=next;
 dlg.querySelectorAll('[data-ev-mode]').forEach(btn=>{btn.classList.toggle('active',btn.dataset.evMode===next);btn.setAttribute('aria-pressed',String(btn.dataset.evMode===next));});
 dlg.querySelector('#evAuthTitle').textContent=next==='login'?'Вхід до EVENTORIA':'Створити акаунт';
 dlg.querySelector('.ev-auth-submit').textContent=next==='login'?'Увійти':'Зареєструватися';
 dlg.querySelector('[name=password]').autocomplete=next==='login'?'current-password':'new-password';
 dlg.querySelector('.ev-auth-message').textContent='';
}
function openDialog(next='login'){
 if(!dlg)return;
 previousFocus=document.activeElement;
 dlg.hidden=false;document.body.classList.add('ev-auth-open');
 dlg.querySelector('form').reset();selectMode(next);
 dlg.querySelector('[name=email]').focus();
}
function closeDialog(){if(!dlg||dlg.hidden)return;dlg.hidden=true;document.body.classList.remove('ev-auth-open');previousFocus?.focus?.();}
async function submitAuth(event){
 event.preventDefault();const message=dlg.querySelector('.ev-auth-message');
 if(!client){message.textContent='Підключення до бази даних тимчасово недоступне.';return;}
 const form=event.currentTarget,button=form.querySelector('[type=submit]');
 const email=form.elements.namedItem('email').value.trim(),password=form.elements.namedItem('password').value;
 button.disabled=true;message.textContent='Перевіряємо дані…';
 try{
  const res=mode==='login'?await client.auth.signInWithPassword({email,password}):await client.auth.signUp({email,password,options:{emailRedirectTo:new URL('account.html',location.href).href}});
  if(res.error)throw res.error;
  if(mode==='signup'&&!res.data.session){message.textContent='Перевірте пошту та підтвердьте email, після цього увійдіть.';return;}
  currentUser=res.data?.user||null;closeDialog();updateProfileControl();if(document.getElementById('evProfileDashboard'))renderDashboard();
 }catch(error){message.textContent='Помилка: '+(error?.message||'Не вдалося завершити дію');}
 finally{button.disabled=false;}
}
function dashboard(){return document.getElementById('evProfileDashboard');}
async function renderDashboard(state){
 const root=dashboard();if(!root)return;
 if(state==='loading'){root.innerHTML='<p class="ev-account-muted">Завантаження профілю…</p>';return;}
 if(!client){root.innerHTML='<p class="ev-account-muted">Немає підключення до Supabase.</p>';return;}
 if(!currentUser){root.innerHTML='<div class="ev-account-empty"><h2>Ваш особистий простір</h2><p>Увійдіть або створіть акаунт, щоб переглядати свої замовлення.</p><button class="ev-account-primary" type="button" id="evOpenAuth">Увійти / Зареєструватися</button></div>';root.querySelector('#evOpenAuth').onclick=()=>openDialog('login');return;}
 const section=location.hash==='#orders'?'orders':'profile';
 root.innerHTML=`<div class="ev-account-heading"><div><p>Особистий кабінет</p><h2>Вітаємо, ${html(userLabel(currentUser))}!</h2></div><button class="ev-account-signout" type="button" id="evDashboardExit">Вийти</button></div><div class="ev-account-layout"><nav class="ev-account-sidebar" aria-label="Розділи кабінету"><a class="${section==='profile'?'active':''}" href="account.html#profile">Мої дані</a><a class="${section==='orders'?'active':''}" href="account.html#orders">Мої замовлення</a></nav><section class="ev-account-content" id="evAccountContent"></section></div>`;
 root.querySelector('#evDashboardExit').onclick=signOut;
 if(section==='profile'){
  root.querySelector('#evAccountContent').innerHTML=`<h3>Мої дані</h3><div class="ev-profile-field"><span>Електронна пошта</span><strong>${html(currentUser.email)}</strong></div><div class="ev-profile-field"><span>Ім’я</span><strong>${html(userLabel(currentUser))}</strong></div><p class="ev-account-muted">Ваші дані авторизації зберігаються в Supabase Auth. Пароль не відображається й не зберігається на сторінці.</p>`;
 }else{
  const content=root.querySelector('#evAccountContent');content.innerHTML='<h3>Мої замовлення</h3><p>Завантажуємо замовлення…</p>';
  const {data,error}=await client.from('customer_orders').select('id,created_at,details,status').eq('user_id',currentUser.id).order('created_at',{ascending:false});
  if(!document.contains(content))return;
  if(error){content.innerHTML=`<h3>Мої замовлення</h3><p class="ev-account-muted">Не вдалося завантажити замовлення: ${html(error.message)}</p>`;return;}
  content.innerHTML=`<div class="ev-account-section-top"><h3>Мої замовлення</h3><a class="ev-account-primary" href="order.html">+ Нове замовлення</a></div>`+(data?.length?data.map(o=>`<article class="ev-order-tile"><div><strong>${html(o.details?.service||o.details?.type||'Свято')}</strong><span>${html(o.status||'Нова')}</span></div><p>Дата події: ${html(o.details?.date||'Не вказана')} · Місто: ${html(o.details?.city||'Не вказане')}</p><small>Створено: ${html(new Date(o.created_at).toLocaleString('uk-UA'))}</small></article>`).join(''):'<p class="ev-account-muted">Замовлень поки немає. Ви можете створити перше замовлення просто зараз.</p>');
 }
}
window.EVENTORIA_OPEN_AUTH=openDialog;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
