(function(){
"use strict";
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
function ls(k,v){try{if(v===undefined)return JSON.parse(localStorage.getItem(k)||"null");localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
/* السمة */
var tb=$("#theme");if(tb){var cur=ls("dhad.site.theme");if(cur)document.documentElement.setAttribute("data-theme",cur);
tb.onclick=function(){var d=document.documentElement,isDark=d.getAttribute("data-theme")==="dark"||(!d.getAttribute("data-theme")&&matchMedia("(prefers-color-scheme:dark)").matches);var n=isDark?"light":"dark";d.setAttribute("data-theme",n);ls("dhad.site.theme",n)}}
/* تشغيل الأكواد */
function runCode(code){
  if(!window.DhadRun)return {ok:false,out:[],error:"المحرك لم يُحمَّل بعد"};
  return window.DhadRun(code);
}
function show(box,r){var o=$(".out",box);if(!o){o=document.createElement("div");o.className="out";box.appendChild(o)}
  o.className="out"+(r.ok?"":" err");o.textContent=r.out.join("\n")+(r.ok?"":(r.out.length?"\n":"")+"✗ "+r.error);}
$$(".codebox").forEach(function(box){
  var run=$("[data-run]",box),pre=$("pre",box);if(!run||!pre)return;
  run.onclick=function(){show(box,runCode(pre.textContent))};
});
/* الملعب */
var pg=$("#pg");if(pg){var ta=$("textarea",pg),go=$("#pg-run"),po=$("#pg-out");
 function pgRun(){var r=runCode(ta.value);po.className="out"+(r.ok?"":" err");po.textContent=r.out.join("\n")+(r.ok?"":(r.out.length?"\n":"")+"✗ "+r.error)}
 go.onclick=pgRun;ta.addEventListener("keydown",function(e){if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();pgRun()}});
 var ed=$("#pg-ed");if(ed)ed.onclick=function(e){e.preventDefault();location.href="/editor/?code="+encodeURIComponent(ta.value)};
 window.addEventListener("load",pgRun)}
/* المعجم */
var di=$("#dsearch");if(di){var ents=$$(".entry"),chips=$$(".chip[data-cat]"),cat="";
 function norm(s){return s.replace(/[ً-ْـ]/g,"").replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").toLowerCase()}
 function filt(){var q=norm(di.value.trim()),n=0;ents.forEach(function(e){var ok=(!cat||e.dataset.cat===cat)&&(!q||norm(e.dataset.q).indexOf(q)>-1);e.hidden=!ok;if(ok)n++});$("#dcount").textContent=n+" مدخلًا"}
 di.oninput=filt;chips.forEach(function(c){c.onclick=function(){cat=c.dataset.cat;chips.forEach(function(x){x.classList.toggle("on",x===c)});filt()}});filt()}
/* تقدّم الدروس */
var lid=document.body.dataset.lesson;if(lid){var dn=ls("dhad.site.done")||{};dn[lid]=1;ls("dhad.site.done",dn)}
var dn2=ls("dhad.site.done")||{},sv2=ls("dhad.site.solved")||{};$$("[data-lesson-card]").forEach(function(c){var id=c.dataset.lessonCard;if(sv2[id]||dn2[id]){var m=document.createElement("span");m.className="done-mark"+(sv2[id]?" solved":"");m.textContent=sv2[id]?"✓ حللت التحدي":"✓ قرأته";c.appendChild(m)}});
/* المجتمع */
var CFG={url:"https://pacucdvobiwcigcuyvbr.supabase.co",key:"sb_publishable_VBFe3Sfh3Q7NS1muHs-Uog_67Tn3eo2"};
function raw(p,o,tok){o=o||{};o.headers=Object.assign({apikey:CFG.key,"Content-Type":"application/json"},o.headers||{});if(tok)o.headers.Authorization="Bearer "+tok;return fetch(CFG.url+p,o)}
var sess=null;
function signin(){sess=sess||ls("dhad.session.v1");var now=Math.floor(Date.now()/1000);
 if(sess&&sess.expires_at-60>now)return Promise.resolve(sess);
 function pw(c){return raw("/auth/v1/token?grant_type=password",{method:"POST",body:JSON.stringify(c)}).then(function(r){return r.json().then(function(j){if(!r.ok||!j.access_token){var e=new Error(j.msg||j.error_description||"HTTP "+r.status);e.status=r.status;throw e}
   sess={access_token:j.access_token,refresh_token:j.refresh_token,expires_at:j.expires_at||now+3600,user:j.user};ls("dhad.session.v1",sess);return sess})})}
 function mk(){return raw("/functions/v1/device-signup",{method:"POST",body:"{}"}).then(function(r){return r.json().then(function(j){if(!r.ok||!j.email)throw new Error(j.error||"تعذّر إنشاء الجلسة");ls("dhad.cred.v1",{email:j.email,password:j.password});return pw({email:j.email,password:j.password})})})}
 var c=ls("dhad.cred.v1");if(c&&c.email)return pw(c).catch(function(e){if(e.status===400||e.status===401||e.status===422)return mk();throw e});return mk()}
var board=$("#board");if(board){
 var kcls={"رأي إيجابي":"k-pos","رأي سلبي":"k-neg","اقتراح":"k-sug","سؤال":"k-q"},myv=ls("dhad.site.votes")||{},flt="";
 var posts=[];
 function ago(t){var s=(Date.now()-new Date(t))/1000;if(s<60)return"الآن";if(s<3600)return"قبل "+Math.floor(s/60)+" دقيقة";if(s<86400)return"قبل "+Math.floor(s/3600)+" ساعة";return"قبل "+Math.floor(s/86400)+" يومًا"}
 function draw(){board.textContent="";var l=posts.filter(function(p){return !flt||p.kind===flt});if(!l.length){board.innerHTML='<p class="msg">لا مشاركات بعد. كن أول من يكتب.</p>';return}
  l.forEach(function(p){var d=document.createElement("div");d.className="post";var m=document.createElement("div");m.className="meta";
   var t=document.createElement("span");t.className="tag "+(kcls[p.kind]||"");t.textContent=p.kind;var a=document.createElement("b");a.textContent=p.author;var w=document.createElement("span");w.textContent=ago(p.at);
   var v=document.createElement("button");v.className="vote"+(myv[p.id]?" on":"");v.textContent="👍 "+p.votes;v.title="أؤيّد";v.onclick=function(){vote(p,v)};
   m.append(t,a,w,v);var b=document.createElement("p");b.textContent=p.body;d.append(m,b);board.appendChild(d)})}
 function load(){return raw("/rest/v1/rpc/community_list",{method:"POST",body:JSON.stringify({p_limit:100})}).then(function(r){return r.json()}).then(function(j){posts=Array.isArray(j)?j:[];draw()}).catch(function(){board.innerHTML='<p class="msg bad">تعذّر تحميل المشاركات الآن.</p>'})}
 function vote(p,btn){signin().then(function(s){return raw("/rest/v1/rpc/community_toggle_vote",{method:"POST",body:JSON.stringify({p_post:p.id})},s.access_token)}).then(function(r){return r.json()}).then(function(on){if(typeof on!=="boolean")return;myv[p.id]=on?1:0;ls("dhad.site.votes",myv);p.votes+=on?1:-1;btn.textContent="👍 "+p.votes;btn.classList.toggle("on",on)}).catch(function(){})}
 $$(".chip[data-kind]").forEach(function(c){c.onclick=function(){flt=c.dataset.kind;$$(".chip[data-kind]").forEach(function(x){x.classList.toggle("on",x===c)});draw()}});
 var f=$("#newpost"),msg=$("#postmsg");
 f.onsubmit=function(e){e.preventDefault();var body=f.body.value.trim();if(body.length<3){msg.className="msg bad";msg.textContent="اكتب ثلاثة أحرف على الأقل.";return}
  msg.className="msg";msg.textContent="جارٍ النشر…";f.querySelector("button").disabled=true;
  signin().then(function(s){return raw("/rest/v1/community_posts",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({user_id:s.user.id,kind:f.kind.value,author:(f.author.value.trim()||"زائر").slice(0,40),body:body.slice(0,1200)})},s.access_token)})
  .then(function(r){if(!r.ok)return r.json().then(function(j){throw new Error(j.message||"تعذّر النشر")});f.body.value="";msg.className="msg ok";msg.textContent="تم النشر. شكرًا لمشاركتك.";return load()})
  .catch(function(er){msg.className="msg bad";msg.textContent=er.message||"تعذّر النشر"}).then(function(){f.querySelector("button").disabled=false});
  ls("dhad.site.author",f.author.value)};
 var au=ls("dhad.site.author");if(au)f.author.value=au;load()}
})();
(function(){document.addEventListener("click",function(e){var b=e.target.closest("[data-copy]");if(!b)return;var t=document.getElementById(b.dataset.copy);if(!t)return;var txt=t.textContent;(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(function(){b.textContent="تم النسخ ✓"},function(){var r=document.createRange();r.selectNodeContents(t);var s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent="حدّد ثم انسخ"})})})();

/* عرض ورقة الدرس صورةً كاملة: ملء الشاشة + حفظ + مشاركة */
(function(){
"use strict";
var art=document.querySelector("body[data-lesson] .sheet");if(!art)return;
var $=function(s,r){return (r||document).querySelector(s)};
var lid=document.body.getAttribute("data-lesson");
var imgBlob=null,imgUrl=null,building=null;
function txt(s){var e=$(s,art);return e?e.textContent.replace(/\s+/g," ").trim():""}
function grab(){
  var d={ico:txt(".ico"),no:txt(".no"),h1:txt("h1"),goal:txt(".goal"),items:[].slice.call(art.querySelectorAll("ol li")).map(function(l){return l.textContent.replace(/\s+/g," ").trim()}),
    code:"",out:"",tip:txt(".tipbox"),chal:txt(".chal")};
  var pre=$(".codebox pre",art);if(pre)d.code=pre.textContent.replace(/\s+$/,"");
  var o=$(".codebox .out",art);if(o)d.out=o.textContent.replace(/\s+$/,"");
  return d;
}
function wrapT(x,text,maxW,firstW){var words=text.split(" "),lines=[],cur="",lim=firstW||maxW;words.forEach(function(w){var t=cur?cur+" "+w:w;if(x.measureText(t).width>lim&&cur){lines.push(cur);cur=w;lim=maxW}else cur=t});if(cur)lines.push(cur);return lines}
function rrect(x,X,Y,w,h,r){x.beginPath();if(x.roundRect)x.roundRect(X,Y,w,h,r);else x.rect(X,Y,w,h)}
function toAr(n){return String(n).replace(/\d/g,function(d){return "٠١٢٣٤٥٦٧٨٩"[d]})}
function paint(x,d,H,dry){
  var W=1080,G=60,R=W-122,L=60,CW=R-L,F="Cairo,Tahoma,sans-serif",M="Cairo,ui-monospace,monospace";
  x.direction="rtl";x.textAlign="right";x.textBaseline="alphabetic";
  var y=G;
  function row(){return y+G-17}
  if(!dry){
    x.fillStyle="#fffdf5";x.fillRect(0,0,W,H);
    x.strokeStyle="#dfe9f2";x.lineWidth=2;for(var k=G;k<H;k+=G){x.beginPath();x.moveTo(0,k);x.lineTo(W,k);x.stroke()}
    x.strokeStyle="#e9a79a";x.lineWidth=4;x.beginPath();x.moveTo(W-84,0);x.lineTo(W-84,H);x.stroke();
  }
  // الرقم والأيقونة
  if(!dry){x.fillStyle="#9a6b12";x.font="700 28px "+F;x.fillText(d.no,R,row());
    if(d.ico){x.save();x.translate(L+40,y+G*1.3);x.rotate(-0.1);x.font="84px "+F+",'Apple Color Emoji','Noto Color Emoji'";x.textAlign="center";x.fillStyle="#000";x.fillText(d.ico,0,0);x.restore();x.textAlign="right"}}
  y+=G;
  // العنوان
  x.font="800 56px "+F;wrapT(x,d.h1,CW-110).forEach(function(l){if(!dry){x.fillStyle="#1f1b13";x.font="800 56px "+F;x.fillText(l,R,row())}y+=G});
  // الهدف
  x.font="700 34px "+F;wrapT(x,d.goal,CW).forEach(function(l){if(!dry){x.fillStyle="#0f5c5a";x.font="700 34px "+F;x.fillText(l,R,row())}y+=G});
  // النقاط
  d.items.forEach(function(it,i){
    x.font="500 34px "+F;
    wrapT(x,it,CW-58).forEach(function(l,j){
      if(!dry){if(j===0){x.fillStyle="#c1452f";x.font="800 34px "+F;x.fillText(toAr(i+1)+".",R,row())}
        x.fillStyle="#1f1b13";x.font="500 34px "+F;x.fillText(l,R-58,row())}
      y+=G});
  });
  // الكود
  if(d.code){
    y+=G*0.5;y=Math.ceil(y/G)*G;
    var lines=d.code.split("\n"),fs=30;
    x.font="500 "+fs+"px "+M;
    var worst=Math.max.apply(null,lines.map(function(l){return x.measureText(l).width}));
    while(worst>CW-44&&fs>18){fs-=2;x.font="500 "+fs+"px "+M;worst=Math.max.apply(null,lines.map(function(l){return x.measureText(l).width}))}
    var lh=Math.round(fs*1.6),outLines=d.out?d.out.split("\n"):[];
    var barH=52,padT=14,codeH=lines.length*lh+padT*2,outH=outLines.length?(34+outLines.length*lh+16):0;
    var boxH=barH+codeH+outH,rows=Math.ceil((boxH+8)/G),bx=L,bw=CW+6;
    if(!dry){
      x.save();rrect(x,bx,y,bw,boxH,12);x.clip();
      x.fillStyle="#26210f";x.fillRect(bx,y,bw,barH);
      x.fillStyle="#d8c99c";x.font="600 24px "+F;x.fillText("ضاد",bx+bw-20,y+barH-16);
      x.fillStyle="#16130d";x.fillRect(bx,y+barH,bw,codeH+outH);
      x.fillStyle="#f3ead4";x.font="500 "+fs+"px "+M;
      lines.forEach(function(l,i){x.fillText(l,bx+bw-22,y+barH+padT+lh*(i+1)-8)});
      if(outLines.length){
        var oy=y+barH+codeH;x.fillStyle="#0f1d19";x.fillRect(bx,oy,bw,outH);
        x.strokeStyle="#2f4a42";x.setLineDash([8,6]);x.lineWidth=2;x.beginPath();x.moveTo(bx,oy);x.lineTo(bx+bw,oy);x.stroke();x.setLineDash([]);
        x.fillStyle="#7fb5a4";x.font="500 22px "+F;x.fillText("المخرجات",bx+bw-22,oy+28);
        x.fillStyle="#bfeadb";x.font="500 "+fs+"px "+M;
        outLines.forEach(function(l,i){x.fillText(l,bx+bw-22,oy+34+lh*(i+1)-8)});
      }
      x.restore();
    }
    y+=rows*G;
  }
  // النصيحة
  if(d.tip){
    y+=G*0.2;y=Math.ceil(y/G)*G;
    var m=d.tip.indexOf(":"),lab=m>0&&m<14?d.tip.slice(0,m+1):"",body=lab?d.tip.slice(m+1).trim():d.tip;
    x.font="800 32px "+F;var lw=lab?x.measureText(lab).width+12:0;
    x.font="500 32px "+F;var tl=wrapT(x,body,CW-40,CW-40-lw);
    var th=tl.length*G+20;
    if(!dry){x.fillStyle="#fff1b8";x.fillRect(L,y,CW+6,th);x.fillStyle="#4a3b00";
      tl.forEach(function(l,i){var yy=y+10+i*G+G-17;
        if(i===0&&lab){x.fillStyle="#a63a2a";x.font="800 32px "+F;x.fillText(lab,R-12,yy);x.fillStyle="#4a3b00";x.font="500 32px "+F;x.fillText(l,R-12-lw,yy)}
        else{x.fillStyle="#4a3b00";x.font="500 32px "+F;x.fillText(l,R-12,yy)}})}
    y+=Math.ceil(th/G)*G;
  }
  // التحدي
  if(d.chal){
    y+=G*0.2;y=Math.ceil(y/G)*G;
    x.font="600 32px "+F;var cl=wrapT(x,d.chal,CW-40),chh=cl.length*G+24;
    if(!dry){x.strokeStyle="#0f5c5a";x.lineWidth=4;x.setLineDash([14,9]);rrect(x,L,y,CW+6,chh,12);x.stroke();x.setLineDash([]);
      x.fillStyle="#0f5c5a";x.font="600 32px "+F;cl.forEach(function(l,i){x.fillText(l,R-12,y+12+i*G+G-17)})}
    y+=Math.ceil(chh/G)*G;
  }
  y+=G*0.5;y=Math.ceil(y/G)*G;
  // الشريط السفلي
  var bar=170,top=y;
  if(!dry){
    x.fillStyle="#1f1b13";x.fillRect(0,top,W,bar);
    x.textAlign="center";x.fillStyle="#d9a845";x.font="700 34px "+F;x.fillText("جرّب الدرس حيًّا في المتصفح",W/2,top+64);
    x.fillStyle="#fff";x.font="700 36px "+M;x.direction="ltr";
    var u=(location.host+location.pathname).replace(/\/$/,"");x.fillText(u,W/2,top+124);x.direction="rtl";
  }
  return top+bar;
}
function build(){
  if(building)return building;
  var loads=["800 40px Cairo","700 30px Cairo","500 30px Cairo"].map(function(f){return document.fonts?document.fonts.load(f,"ضاد متغير ٠١٢٣"):Promise.resolve()});
  building=Promise.all(loads).catch(function(){}).then(function(){
    var d=grab(),m=document.createElement("canvas").getContext("2d"),H=paint(m,d,0,true);
    var c=document.createElement("canvas");c.width=1080;c.height=H;paint(c.getContext("2d"),d,H,false);
    return new Promise(function(res){c.toBlob(function(b){imgBlob=b;imgUrl=URL.createObjectURL(b);res(b)},"image/png")});
  });
  return building;
}
/* الواجهة */
var ov=null,menu=null,toastEl=null,U=location.origin+location.pathname,TX=document.title.split(" — ")[0]+": درس تفاعلي في ضاد، جرّبه وحلّ التحدي";
var SITES=[["فيسبوك","#1877f2","f","https://www.facebook.com/sharer/sharer.php?u="+encodeURIComponent(U)],
 ["إكس","#111","X","https://x.com/intent/tweet?text="+encodeURIComponent(TX)+"&url="+encodeURIComponent(U)],
 ["واتساب","#25a244","و","https://wa.me/?text="+encodeURIComponent(TX+" "+U)],
 ["تيليجرام","#229ed9","ت","https://t.me/share/url?url="+encodeURIComponent(U)+"&text="+encodeURIComponent(TX)],
 ["لينكدإن","#0a66c2","in","https://www.linkedin.com/sharing/share-offsite/?url="+encodeURIComponent(U)],
 ["ريديت","#ff4500","r","https://www.reddit.com/submit?url="+encodeURIComponent(U)+"&title="+encodeURIComponent(TX)]];
function toast(m){if(!toastEl)return;toastEl.textContent=m;toastEl.hidden=!m;clearTimeout(toast.t);toast.t=setTimeout(function(){toastEl.hidden=true},3200)}
function isIOS(){return /iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1)}
function file(){return new File([imgBlob],"dhad-"+lid+".png",{type:"image/png"})}
function canShareFile(){try{return !!(imgBlob&&navigator.share&&navigator.canShare&&navigator.canShare({files:[file()]}))}catch(e){return false}}
function save(){
  if(!imgBlob)return;
  if(isIOS()&&canShareFile()){navigator.share({files:[file()]}).catch(function(){});toast("اختر «حفظ الصورة» من القائمة");return}
  var a=document.createElement("a");a.href=imgUrl;a.download="dhad-"+lid+".png";document.body.appendChild(a);a.click();a.remove();
  toast("جارٍ الحفظ في هاتفك. إن لم يبدأ التنزيل فاضغط على الصورة مطوّلًا واختر «حفظ الصورة»");
}
function shareNative(){if(canShareFile())navigator.share({files:[file()],text:TX+"\n"+U}).catch(function(){})}
function copyLink(){try{navigator.clipboard.writeText(U).then(function(){toast("نُسخ الرابط")},function(){toast("تعذّر النسخ")})}catch(e){toast("تعذّر النسخ")}}
function closeMenu(){if(menu)menu.hidden=true}
function close(){if(!ov)return;ov.hidden=true;document.documentElement.style.overflow="";closeMenu()}
function make(){
  ov=document.createElement("div");ov.id="lv";ov.hidden=true;ov.setAttribute("role","dialog");ov.setAttribute("aria-label","ورقة الدرس كصورة");
  ov.innerHTML='<div class="lv-top"><button type="button" class="lv-x" aria-label="إغلاق">✕</button><button type="button" class="lv-dots" aria-label="المزيد" aria-haspopup="menu" aria-expanded="false">⋮</button></div>'+
   '<div class="lv-menu" role="menu" hidden></div><div class="lv-scroll"><img class="lv-img" alt="ورقة الدرس كاملة"><p class="lv-wait">جارٍ تجهيز الصورة…</p></div><p class="lv-toast" role="status" hidden></p>';
  document.body.appendChild(ov);
  menu=$(".lv-menu",ov);toastEl=$(".lv-toast",ov);
  var h='<button type="button" role="menuitem" data-a="save">حفظ الصورة</button>';
  if(canShareFile()||true)h+='<button type="button" role="menuitem" data-a="native" hidden>مشاركة الصورة</button>';
  h+='<button type="button" role="menuitem" data-a="link">نسخ الرابط</button><div class="lv-sep">مشاركة على</div>';
  h+=SITES.map(function(s){return '<a role="menuitem" href="'+s[3]+'" target="_blank" rel="noopener"><span class="lv-ic" style="background:'+s[1]+'">'+s[2]+'</span>'+s[0]+'</a>'}).join("");
  menu.innerHTML=h;
  ov.addEventListener("click",function(e){
    var t=e.target;
    if(t.closest(".lv-x")){close();return}
    var dots=t.closest(".lv-dots");
    if(dots){var open=menu.hidden;menu.hidden=!open;dots.setAttribute("aria-expanded",String(open));var nb=$('[data-a="native"]',menu);if(nb)nb.hidden=!canShareFile();return}
    var b=t.closest("[data-a]");
    if(b){closeMenu();var a=b.getAttribute("data-a");if(a==="save")save();else if(a==="native")shareNative();else if(a==="link")copyLink();return}
    if(t.closest("a")){closeMenu();return}
    if(!t.closest(".lv-menu"))closeMenu();
  });
  document.addEventListener("keydown",function(e){if(e.key==="Escape")close()});
}
function open(){
  if(!ov)make();
  ov.hidden=false;document.documentElement.style.overflow="hidden";
  var im=$(".lv-img",ov),w=$(".lv-wait",ov);
  if(imgUrl){im.src=imgUrl;w.hidden=true;return}
  w.hidden=false;
  build().then(function(){im.src=imgUrl;w.hidden=true},function(){w.textContent="تعذّر تجهيز الصورة"});
}
art.style.cursor="zoom-in";art.setAttribute("title","اضغط لعرض الدرس كصورة كاملة");
art.addEventListener("click",function(e){
  if(e.target.closest("button,a,pre,.out,textarea,input,.chalbox"))return;
  var s=window.getSelection&&window.getSelection().toString();if(s)return;
  open();
});
var note=$(".sheetnote");if(note)note.insertAdjacentHTML("beforeend","<br>اضغط على الورقة لعرضها صورةً كاملة تحفظها أو تشاركها.");
build();
})();
/* عدّاد الزائرين: رقم فقط، بلا أي بيانات شخصية */
(function(){
var el=document.getElementById("vc");if(!el)return;
var CFG={url:"https://pacucdvobiwcigcuyvbr.supabase.co",key:"sb_publishable_VBFe3Sfh3Q7NS1muHs-Uog_67Tn3eo2"};
var seen=false;try{seen=localStorage.getItem("dhad.counted")==="1"}catch(e){}
function ar(n){return String(n).replace(/\d/g,function(d){return "٠١٢٣٤٥٦٧٨٩"[d]})}
fetch(CFG.url+"/rest/v1/rpc/"+(seen?"counter_get":"counter_hit"),{method:"POST",headers:{apikey:CFG.key,"Content-Type":"application/json"},body:"{}"})
.then(function(r){return r.ok?r.json():null}).then(function(n){
 if(typeof n!=="number"&&typeof n!=="string")return;n=Number(n);if(!isFinite(n))return;
 if(!seen){try{localStorage.setItem("dhad.counted","1")}catch(e){}}
 el.textContent=ar(n);el.parentNode.hidden=false}).catch(function(){});
})();

/* محرر التحدي: تشغيل + فحص تلقائي + تلميح + حل */
(function(){
"use strict";
var box=document.getElementById("cb"),dj=document.getElementById("chal-data");if(!box||!dj)return;
var C;try{C=JSON.parse(dj.textContent)}catch(e){return}
var ta=box.querySelector("textarea"),msg=box.querySelector(".cbmsg"),sol=box.querySelector(".cbsol"),bSol=box.querySelector('[data-act="sol"]');
var KEY="dhad.chal."+C.id,fails=0,hintN=0;
function ls(k,v){try{if(v===undefined)return JSON.parse(localStorage.getItem(k)||"null");localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
var saved=ls(KEY);if(typeof saved==="string"&&saved.trim())ta.value=saved;
function rows(){var n=ta.value.split("\n").length;ta.style.minHeight=Math.min(Math.max(n,6),22)*28.5+28+"px"}
rows();
ta.addEventListener("input",function(){ls(KEY,ta.value);rows()});
function norm(s){return String(s).replace(/[٠-٩]/g,function(d){return "٠١٢٣٤٥٦٧٨٩".indexOf(d)}).replace(/٫/g,".").replace(/\s+$/,"").replace(/^\s+/,"")}
function say(kind,html,isText){msg.hidden=false;msg.className="cbmsg "+kind;if(isText)msg.textContent=html;else msg.innerHTML=html}
function esc(t){return String(t).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c]})}
function run(code){if(!window.DhadRun)return{ok:false,out:[],error:"المحرك لم يُحمّل بعد، أعد المحاولة بعد لحظة"};return window.DhadRun(code)}
function check(code){
  if(!code.replace(/#[^\n]*/g,"").trim())return{ok:false,m:"المحرر فارغ. اكتب حلّك أولًا ثم اضغط «شغّل وافحص»."};
  for(var i=0;i<C.must.length;i++)if(!new RegExp(C.must[i].re).test(code))return{ok:false,m:C.must[i].msg};
  for(var j=0;j<C.mustNot.length;j++)if(new RegExp(C.mustNot[j].re).test(code))return{ok:false,m:C.mustNot[j].msg};
  var tests=C.tests.length?C.tests:[{post:"",expect:null}];
  for(var t=0;t<tests.length;t++){
    var T=tests[t],r=run(code+"\n"+(T.post||""));
    if(C.error){
      if(r.ok)return{ok:false,m:"الكود عمل دون أي خطأ، والمطلوب أن يحدث الخطأ المذكور في التحدي."};
      if(!new RegExp(C.error).test(r.error))return{ok:false,m:"حدث خطأ آخر غير المطلوب:\n"+r.error};
      continue}
    if(!r.ok)return{ok:false,m:"✗ "+r.error+(r.out.length?"\nقبل الخطأ طُبع:\n"+r.out.join("\n"):"")};
    if(T.expect){var got=r.out.map(norm),exp=T.expect.map(norm),same=got.length===exp.length&&got.every(function(g,k){return g===exp[k]});
      if(!same){var pre=T.post?"بعد تشغيل كودك مع:\n"+T.post+"\n\n":"";
        return{ok:false,m:pre+"المتوقع:\n"+T.expect.join("\n")+"\n\nالذي ظهر عندك:\n"+(r.out.length?r.out.join("\n"):"(لم ُيطبع شيء — هل نسيت اطبع؟)")}}}
  }
  return{ok:true,out:run(code).out}
}
function go(){
  var code=ta.value,res=check(code);
  if(res.ok){
    var done=ls("dhad.site.solved")||{};done[C.id]=1;ls("dhad.site.solved",done);
    var o=(res.out&&res.out.length)?"<br><small>خرج برنامجك:</small><br><code>"+esc(res.out.join("\n")).replace(/\n/g,"<br>")+"</code>":"";
    say("ok","✓ أحسنت! حلّك صحيح ويجتاز كل الفحوص."+o);bSol.hidden=false;
  }else{
    fails++;say("bad",res.m,true);bSol.hidden=false;
  }
}
box.addEventListener("click",function(e){
  var b=e.target.closest("[data-act]");if(!b)return;var a=b.getAttribute("data-act");
  if(a==="run")go();
  else if(a==="hint"){hintN++;say("info","تلميح: "+C.hint,true)}
  else if(a==="sol"){var open=!sol.hidden;if(open){sol.hidden=true;b.textContent="أظهر الحل";return}
    var r=run(C.solution+"\n"+((C.tests[0]&&C.tests[0].post)||""));
    sol.innerHTML="<b>الحل المقترح (حاول أولًا ثم قارن):</b><pre></pre>";sol.querySelector("pre").textContent=C.solution;sol.hidden=false;b.textContent="أخفِ الحل"}
  else if(a==="reset"){if(ta.value!==C.starter&&ta.value.trim()&&!confirm("سيُمسح ما كتبته. متأكد؟"))return;ta.value=C.starter;ls(KEY,ta.value);rows();msg.hidden=true;sol.hidden=true;bSol.textContent="أظهر الحل"}
});
ta.addEventListener("keydown",function(e){
  if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();go();return}
  if(e.key==="Tab"&&!e.shiftKey){e.preventDefault();var s=ta.selectionStart,en=ta.selectionEnd;ta.value=ta.value.slice(0,s)+"    "+ta.value.slice(en);ta.selectionStart=ta.selectionEnd=s+4;ls(KEY,ta.value)}
});
})();
