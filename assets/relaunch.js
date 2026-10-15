// ReCaptured relaunch · shared behaviour
(function(){
  // /book/: highlight the chosen call type from ?intent=
  var q=new URLSearchParams(location.search), demo=q.get('intent')==='demo';
  document.querySelectorAll('.choose a').forEach(function(a){a.classList.toggle('on', /intent=demo/.test(a.getAttribute('href'))===demo);});
  // GA4 CTA events
  document.addEventListener('click', function(e){
    var a=e.target.closest('a'); if(!a||!window.gtag) return;
    var href=a.getAttribute('href')||'', ev=null;
    if(/\/book\/\?intent=founding/.test(href)) ev='cta_get_started';
    else if(href==='#product'||/\/#product$/.test(href)) ev='cta_see_how';
    else if(/\/pilot\//.test(href)) ev='cta_pilot_apply';
    else if(/\/book\//.test(href)||/calendly\.com/.test(href)) ev='cta_book_call';
    if(ev) gtag('event', ev, {link_text:(a.textContent||'').trim().slice(0,80)});
  });
})();
