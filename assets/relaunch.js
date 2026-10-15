// ReCaptured relaunch · shared behaviour
(function(){
  // /book/: highlight the chosen call type from ?intent=
  var q=new URLSearchParams(location.search), demo=q.get('intent')==='demo';
  document.querySelectorAll('.choose a').forEach(function(a){a.classList.toggle('on', /intent=demo/.test(a.getAttribute('href'))===demo);});
  // GA4 CTA events
  // GA4 batches hits for a few seconds, so an event fired just before a same-site link
  // unloads the page is dropped. Those clicks are saved here and sent from the next page.
  var PENDING='rc_pending_cta';
  try{
    var saved=sessionStorage.getItem(PENDING);
    if(saved){sessionStorage.removeItem(PENDING); saved=JSON.parse(saved); if(window.gtag) gtag('event', saved.ev, saved.params);}
  }catch(_){}
  document.addEventListener('click', function(e){
    var a=e.target.closest('a'); if(!a||!window.gtag) return;
    var href=a.getAttribute('href')||'', ev=null;
    if(/\/book\/\?intent=founding/.test(href)) ev='cta_get_started';
    else if(href==='#product'||/\/#product$/.test(href)) ev='cta_see_how';
    else if(/\/pilot\//.test(href)) ev='cta_pilot_apply';
    else if(/\/book\//.test(href)||/calendly\.com/.test(href)) ev='cta_book_call';
    if(!ev) return;
    var params={link_text:(a.textContent||'').trim().slice(0,80)};
    var leavesInTab=a.host===location.host&&!(a.pathname===location.pathname&&a.hash)&&(!a.target||a.target==='_self')
      &&e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey;
    if(leavesInTab){
      params.link_page=location.pathname;
      try{sessionStorage.setItem(PENDING, JSON.stringify({ev:ev, params:params})); return;}catch(_){}
    }
    gtag('event', ev, params);
  });
})();
