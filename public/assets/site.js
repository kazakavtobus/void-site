(()=>{
  const toggle=document.querySelector('.menu-toggle');
  const nav=document.querySelector('.mobile-nav');
  const closeMenu=()=>{if(!toggle||!nav)return;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Открыть меню');nav.hidden=true;document.body.classList.remove('menu-is-open')};
  toggle?.addEventListener('click',()=>{const opening=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(opening));toggle.setAttribute('aria-label',opening?'Закрыть меню':'Открыть меню');nav.hidden=!opening;document.body.classList.toggle('menu-is-open',opening)});
  nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
  const allowed=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','ref'];
  const params=new URLSearchParams(location.search);
  // Save only non-sensitive attribution tags for the current browser session.
  for(const k of allowed){const v=params.get(k);if(v&&v.length<=120&&/^[\p{L}\p{N} ._+\-/]*$/u.test(v)){try{sessionStorage.setItem('void_'+k,v)}catch{}}}
  function attribution(){let a=[];for(const k of allowed){let v='';try{v=sessionStorage.getItem('void_'+k)||''}catch{}if(v)a.push(`${k}: ${v}`)};return a;}
  function track(event,metadata){window.dispatchEvent(new CustomEvent('void:track',{detail:{event,...metadata}}));if(typeof window.ym==='function'&&Number.isInteger(window.VOID_METRIKA_ID))window.ym(window.VOID_METRIKA_ID,'reachGoal',event,metadata)}
  document.querySelectorAll('[data-contact-link]').forEach(a=>a.addEventListener('click',()=>{
    const channel=a.dataset.contactChannel||'email';track('contact_click',{channel});
    if(!a.href.startsWith('mailto:')||a.dataset.contactChannel!=='email')return;
    const address=a.href.slice(7).split('?')[0];
    const body=['Здравствуйте! Хочу обсудить проект.','','Кратко о задаче:','','','—','Откуда пришёл(пришла):',...attribution()];
    a.href=`mailto:${address}?subject=${encodeURIComponent('Задача для VOID')}&body=${encodeURIComponent(body.join('\n'))}`;
  }));
})();
