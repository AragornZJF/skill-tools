(function(){
  function init(){
    var sel=document.getElementById('themeSelect');
    if(!sel){return;}
    var THEMES=(typeof themes!=='undefined')?themes:null;
    if(!THEMES){return;}
    var opts=[];
    for(var i=0;i<sel.options.length;i++){opts.push({v:sel.options[i].value,t:sel.options[i].textContent});}
    sel.style.display='none';
    var wrap=document.createElement('div');
    wrap.className='kg-picker';
    wrap.innerHTML='<button type="button" class="kg-picker__btn"><span class="kg-picker__sw"></span><span class="kg-picker__lbl"></span><svg class="kg-picker__caret" viewBox="0 0 12 12" width="11" height="11"><path d="M2 4.5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button><ul class="kg-picker__panel"></ul>';
    sel.parentNode.insertBefore(wrap,sel.nextSibling);
    var btn=wrap.querySelector('.kg-picker__btn');
    var lbl=wrap.querySelector('.kg-picker__lbl');
    var sw=wrap.querySelector('.kg-picker__sw');
    var panel=wrap.querySelector('.kg-picker__panel');
    opts.forEach(function(o){
      var li=document.createElement('li');
      li.className='kg-picker__item';
      li.setAttribute('data-value',o.v);
      var tt=THEMES[o.v]||{};
      li.innerHTML='<span class="kg-picker__dot" style="background:'+((tt.colors&&tt.colors[0])||'#888')+'"></span>'+o.t;
      li.addEventListener('click',function(e){e.stopPropagation();if(typeof switchTheme==='function'){switchTheme(o.v);}paint(o.v);close();});
      panel.appendChild(li);
    });
    function paint(name){
      var t=THEMES[name]||{};
      lbl.textContent=t.name||name;
      btn.style.background=t.buttonBg||'';
      btn.style.color=t.textPrimary||'';
      btn.style.borderColor=t.borderColor||'';
      sw.style.background=((t.colors&&t.colors[0])||t.background||'');
      panel.style.background=t.toolbarBg||t.cardBg||'';
      panel.style.borderColor=t.borderColor||'';
      panel.style.color=t.textPrimary||'';
      var c=panel.children;
      for(var i=0;i<c.length;i++){c[i].classList.toggle('is-active',c[i].getAttribute('data-value')===name);c[i].style.color=t.textPrimary||'';}
    }
    function open(){panel.classList.add('is-open');btn.classList.add('is-open');}
    function close(){panel.classList.remove('is-open');btn.classList.remove('is-open');}
    btn.addEventListener('click',function(e){e.stopPropagation();panel.classList.contains('is-open')?close():open();});
    document.addEventListener('click',close);
    document.addEventListener('keydown',function(e){if(e.key==='Escape'){close();}});
    paint(sel.value||'dark-tech');
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();
