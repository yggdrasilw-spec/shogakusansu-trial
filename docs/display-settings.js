/* Browser-local presentation preferences; learning records stay on the server. */
(() => {
 const key='sansuu-step-display-v1', defaults={size:'standard',motion:'system',pictures:true};
 let prefs={...defaults};
 try {const saved=JSON.parse(localStorage.getItem(key));if(saved){if(['standard','large','extra'].includes(saved.size))prefs.size=saved.size;if(['system','reduce'].includes(saved.motion))prefs.motion=saved.motion;if(typeof saved.pictures==='boolean')prefs.pictures=saved.pictures;}}catch{}
 const media=matchMedia('(prefers-reduced-motion: reduce)'), drawer=document.getElementById('settings-drawer'),toggle=document.getElementById('menu-toggle');
 window.mathMotionReduced=()=>prefs.motion==='reduce'||media.matches;
 window.mathPictureObjects=()=>prefs.pictures;
 function apply(){
  document.documentElement.dataset.textSize=prefs.size;
  document.documentElement.dataset.motion=window.mathMotionReduced()?'reduce':'full';
  document.querySelector(`[name="text-size"][value="${prefs.size}"]`).checked=true;
  document.querySelector(`[name="motion"][value="${prefs.motion}"]`).checked=true;
  document.getElementById('picture-objects').checked=prefs.pictures;
  if(window.mathMotionReduced()){document.querySelectorAll('.tap-ripple').forEach(e=>e.remove());if(typeof stopTextbookPlayback==='function')stopTextbookPlayback();}
 }
 function save(){apply();try{localStorage.setItem(key,JSON.stringify(prefs));}catch{} }
 function syncNav(){let locked=false;drawer.querySelectorAll('[data-nav]').forEach(b=>{const source=document.getElementById(b.dataset.nav);b.disabled=source.disabled;b.classList.toggle('active',source.classList.contains('active'));if(source.classList.contains('active'))b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');locked ||= source.disabled;});document.getElementById('drawer-learning-note').hidden=!locked;}
 toggle.onclick=()=>{syncNav();drawer.showModal();toggle.setAttribute('aria-expanded','true');};
 const close=()=>drawer.close();document.getElementById('close-settings').onclick=close;document.getElementById('settings-done').onclick=close;
 drawer.addEventListener('close',()=>{toggle.setAttribute('aria-expanded','false');toggle.focus();});
 drawer.addEventListener('click',e=>{if(e.target===drawer){const r=drawer.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
 drawer.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{document.getElementById(b.dataset.nav).click();close();});
 document.querySelectorAll('[name="text-size"]').forEach(i=>i.onchange=()=>{prefs.size=i.value;save();});
 document.querySelectorAll('[name="motion"]').forEach(i=>i.onchange=()=>{prefs.motion=i.value;save();});
 document.getElementById('picture-objects').onchange=e=>{prefs.pictures=e.target.checked;save();if(typeof state!=='undefined'&&state)render();};
 media.addEventListener('change',apply);
 document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||b.disabled||window.mathMotionReduced())return;
  const r=b.getBoundingClientRect(),ripple=document.createElement('span');ripple.className='tap-ripple';ripple.setAttribute('aria-hidden','true');
  const diameter=Math.max(r.width,r.height)*2;ripple.style.width=ripple.style.height=diameter+'px';
  ripple.style.left=(e.detail?e.clientX-r.left:r.width/2)+'px';ripple.style.top=(e.detail?e.clientY-r.top:r.height/2)+'px';
  b.append(ripple);ripple.addEventListener('animationend',()=>ripple.remove(),{once:true});setTimeout(()=>ripple.remove(),650);
 },true);
 apply();
})();
