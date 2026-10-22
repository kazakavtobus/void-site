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
  for(const k of allowed){const v=params.get(k);if(v&&v.length<=120&&/^[\p{L}\p{N} ._+\-/]*$/u.test(v)){try{sessionStorage.setItem('tvoykazak_'+k,v)}catch{}}}
  function attribution(){let a=[];for(const k of allowed){let v='';try{v=sessionStorage.getItem('tvoykazak_'+k)||''}catch{}if(v)a.push(`${k}: ${v}`)};return a;}
  function track(event,metadata){window.dispatchEvent(new CustomEvent('tvoykazak:track',{detail:{event,...metadata}}));if(typeof window.ym==='function'&&Number.isInteger(window.TVOYKAZAK_METRIKA_ID))window.ym(window.TVOYKAZAK_METRIKA_ID,'reachGoal',event,metadata)}
  document.querySelectorAll('[data-contact-link]').forEach(a=>a.addEventListener('click',()=>{
    // Telegram profile links cannot automatically attach attribution to a new chat.
    // Emit a first-party event only; persistence requires a separately configured analytics service.
    const channel=a.dataset.contactChannel||'telegram';
    track('contact_click',{channel,source:attribution().join('; ')});
  }));
})();
