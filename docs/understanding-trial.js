/* Construction and written reasoning are separate observations from numeric scores.
 * Grid constructions have explicit geometric checks. Written reasoning is assessed
 * with a visible rubric by a person; saving text never promotes numeric mastery. */
(() => {
  'use strict';
  const TASKS = [
    {id:'segment',label:'長さ3cmの線分',count:2,instruction:'1ますを1cmとして、長さ3cmの線分をかこう。両端の点をえらびます。',criteria:['両端がちがう点になっている','両端の距離が3cmになっている']},
    {id:'square',label:'一辺3cmの正方形',count:4,closed:true,instruction:'1ますを1cmとして、一辺3cmの正方形をかこう。周りをたどる順に4つの頂点をえらびます。',criteria:['4つの頂点がちがう','4辺の長さがすべて3cm','となり合う辺が直角']},
    {id:'rectangle',label:'4cmと2cmの長方形',count:4,closed:true,instruction:'1ますを1cmとして、長い辺4cm、短い辺2cmの長方形をかこう。周りをたどる順に4つの頂点をえらびます。',criteria:['4つの頂点がちがう','向かい合う辺がそれぞれ4cmと2cm','となり合う辺が直角']},
    {id:'right-triangle',label:'直角三角形',count:3,closed:true,instruction:'直角をはさむ2辺が3cmと4cmの直角三角形をかこう。1ますは1cm。3つの頂点をえらびます。',criteria:['3つの頂点がちがう','直角がひとつある','直角をはさむ2辺が3cmと4cm']},
    {id:'parallel',label:'平行な2本の線分',count:4,pairs:true,instruction:'平行な2本の線分をかこう。1本目の両端、2本目の両端の順に4点をえらびます。同じ直線上に重ねないでください。',criteria:['どちらも長さのある線分','2本の向きが平行','2本が別の直線上にある']},
    {id:'perpendicular',label:'直角に交わる線分',count:4,pairs:true,instruction:'直角に交わる2本の線分をかこう。1本目の両端、2本目の両端の順に4点をえらびます。',criteria:['どちらも長さのある線分','交わる角が直角','2本の線分が実際に交わっている']},
    {id:'reflect-point',label:'点を線対称にうつす',count:1,axis:6,given:[[4,3]],instruction:'赤い点を、点線を軸として線対称にうつそう。うつした先の点をひとつえらびます。',criteria:['軸から左右の距離が同じ','軸に垂直な方向で向かい合う']},
    {id:'reflect-triangle',label:'三角形を線対称にうつす',count:3,closed:true,axis:6,given:[[2,2],[4,2],[3,5]],instruction:'赤い三角形を、点線を軸として線対称にうつそう。うつした先の3つの頂点をえらびます。',criteria:['3つの頂点がちがう','もとの頂点と軸からの距離が同じ','頂点どうしが軸に垂直な方向で向かい合う']}
  ];
  const vec=(a,b)=>[b[0]-a[0],b[1]-a[1]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1],cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
  const length2=(a,b)=>dot(vec(a,b),vec(a,b));
  const pointKey=p=>p.join(',');
  const orient=(a,b,c)=>cross(vec(a,b),vec(a,c));
  function intersects(a,b,c,d){
    const o=[orient(a,b,c),orient(a,b,d),orient(c,d,a),orient(c,d,b)];
    return o[0]*o[1]<=0&&o[2]*o[3]<=0&&
      Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0]))<=Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0]))&&
      Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1]))<=Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1]));
  }
  function assess(task,points){
    if(points.length!==task.count)return task.criteria.map(()=>false);
    const unique=new Set(points.map(pointKey)).size===points.length;
    if(task.id==='segment')return [unique,length2(...points)===9];
    if(task.id==='square'||task.id==='rectangle'){
      const edges=points.map((p,i)=>vec(p,points[(i+1)%4])),squared=edges.map(e=>dot(e,e));
      const sizes=task.id==='square'?squared.every(x=>x===9):
        squared[0]===squared[2]&&squared[1]===squared[3]&&[squared[0],squared[1]].sort((a,b)=>a-b).join(',')==='4,16';
      return [unique,sizes,edges.every((e,i)=>dot(e,edges[(i+1)%4])===0)&&squared.every(x=>x>0)];
    }
    if(task.id==='right-triangle'){
      const right=points.findIndex((p,i)=>dot(vec(p,points[(i+1)%3]),vec(p,points[(i+2)%3]))===0);
      return [unique,right>=0&&unique,right>=0&&[length2(points[right],points[(right+1)%3]),length2(points[right],points[(right+2)%3])].sort((a,b)=>a-b).join(',')==='9,16'];
    }
    if(task.pairs){
      const [a,b,c,d]=points,u=vec(a,b),v=vec(c,d),nonzero=dot(u,u)>0&&dot(v,v)>0;
      return task.id==='parallel'?[nonzero,nonzero&&cross(u,v)===0,cross(u,vec(a,c))!==0]:
        [nonzero,nonzero&&dot(u,v)===0,nonzero&&intersects(a,b,c,d)];
    }
    const targets=task.given.map(([x,y])=>[2*task.axis-x,y]);
    const matched=targets.every(p=>points.some(q=>pointKey(p)===pointKey(q)));
    if(task.id==='reflect-point')return [Math.abs(points[0][0]-task.axis)===Math.abs(task.given[0][0]-task.axis)&&points[0][0]>task.axis,matched];
    return [unique,matched,matched];
  }
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const btn=(text,fn,cls='secondary')=>{const n=el('button',text,cls);n.type='button';n.addEventListener('click',fn);return n;};
  const $=id=>document.getElementById(id);
  const MAX=1000,MAX_BYTES=5*1024*1024;
  const encodeRecords=records=>JSON.stringify({format:'understanding-record/1',records},null,2);
  const fitsRecords=records=>records.length<=MAX&&new TextEncoder().encode(encodeRecords(records)).length<=MAX_BYTES;
  let db,task=TASKS[0],points=[],cursor=[2,2],explanationItem=null,reviewRecord=null,saving=false;
  const database=()=>db||=new Promise((resolve,reject)=>{
    const r=indexedDB.open('sansuu-understanding:'+location.pathname.replace(/index\.html$/,''),1);
    r.onupgradeneeded=()=>r.result.createObjectStore('records',{keyPath:'id'});
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('記録の保存場所を開けません。'));r.onblocked=()=>reject(Error('ほかのタブを閉じて開き直してください。'));
  });
  async function list(){const d=await database();return new Promise((resolve,reject)=>{
    const tx=d.transaction('records','readonly'),r=tx.objectStore('records').getAll();tx.oncomplete=()=>resolve(r.result);tx.onabort=tx.onerror=()=>reject(Error('記録を読み込めません。'));
  });}
  async function write(records,replace=false){
    const d=await database();return new Promise((resolve,reject)=>{
      const tx=d.transaction('records','readwrite'),store=tx.objectStore('records'),current=store.getAll();
      current.onsuccess=()=>{
        if(!fitsRecords(replace?records:[...current.result,...records])){tx.abort();return;}
        if(replace){store.clear();for(const record of records)store.put(record);}
        else for(const record of records){const r=store.get(record.id);r.onsuccess=()=>{if(r.result!==undefined){tx.abort();return;}store.add(record);};}
      };
      tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(Error('保存できませんでした。記録の上限は1,000件・5MBです。先に書き出して保存場所を確認してください。'));
    });
  }
  async function update(record,expected){
    const d=await database();return new Promise((resolve,reject)=>{
      const tx=d.transaction('records','readwrite'),store=tx.objectStore('records'),r=store.getAll();
      r.onsuccess=()=>{const old=r.result.find(x=>x.id===record.id),next=r.result.map(x=>x.id===record.id?record:x);if(JSON.stringify(old)!==JSON.stringify(expected)||!fitsRecords(next)){tx.abort();return;}store.put(record);};
      tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(Error('別のタブでこの記録が変わりました。一覧から開き直してください。'));
    });
  }
  const stamp=()=>({id:crypto.randomUUID(),created_at:new Date().toISOString()});
  const status=text=>$('understanding-status').textContent=text;
  async function save(record){if(saving)return false;saving=true;try{await write([record]);status('確認した内容をこのブラウザーに保存しました。');return true;}catch(e){status(e.message);return false;}finally{saving=false;}}
  function show(){if(!$('understanding-dialog').open)$('understanding-dialog').showModal();}
  function panel(name){for(const id of ['drawing-panel','explanation-panel','understanding-history','understanding-review'])$(id).hidden=id!==name;status('');}
  function draw(){
    const host=$('construction-board'),ns='http://www.w3.org/2000/svg';host.replaceChildren();
    const node=(tag,attrs,text)=>{const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text)n.textContent=text;host.append(n);return n;};
    const xy=([x,y])=>[30+x*36,30+y*36];
    for(let x=0;x<=12;x++){node('line',{x1:30+x*36,y1:30,x2:30+x*36,y2:318,stroke:'#dbe3e8'});node('text',{x:30+x*36,y:342,'text-anchor':'middle','font-size':12,fill:'#526273'},String(x));}
    for(let y=0;y<=8;y++){node('line',{x1:30,y1:30+y*36,x2:462,y2:30+y*36,stroke:'#dbe3e8'});node('text',{x:16,y:34+y*36,'text-anchor':'middle','font-size':12,fill:'#526273'},String(y));}
    if(task.axis)node('line',{x1:30+task.axis*36,y1:18,x2:30+task.axis*36,y2:325,stroke:'#9b6e20','stroke-width':3,'stroke-dasharray':'7 5'});
    const lines=(ps,color,closed=false,pairs=false)=>{
      for(let i=1;i<ps.length;i++){if(pairs&&i%2===0)continue;const[a,b]=[xy(ps[i-1]),xy(ps[i])];node('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:color,'stroke-width':3});}
      if(closed&&ps.length===task.count){const[a,b]=[xy(ps.at(-1)),xy(ps[0])];node('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:color,'stroke-width':3});}
      for(const[i,p]of ps.entries()){const[x,y]=xy(p);node('circle',{cx:x,cy:y,r:6,fill:color});node('text',{x:x+10,y:y-8,fill:color,'font-size':14},String(i+1));}
    };
    if(task.given)lines(task.given,'#b4414b',task.given.length===3);
    lines(points,'#245bb0',task.closed,task.pairs);
    const[x,y]=xy(cursor);node('circle',{cx:x,cy:y,r:11,fill:'none',stroke:'#245bb0','stroke-width':2,'stroke-dasharray':'3 3'});
    $('construction-points').textContent=`${points.length} / ${task.count}点：`+points.map(p=>`(${p.join(', ')})`).join(' → ');
    $('construction-check').disabled=points.length!==task.count||saving;
    try{sessionStorage.setItem('sansuu-construction-draft',JSON.stringify({task:task.id,points,cursor}));}catch{}
  }
  function pick(p){if(points.length>=task.count){$('construction-feedback').textContent='点がそろっています。「ひとつ戻す」で直せます。';return;}points.push(p);cursor=[...p];$('construction-feedback').replaceChildren();draw();}
  function chooseTask(id){task=TASKS.find(t=>t.id===id)||TASKS[0];points=[];cursor=[2,2];$('construction-instruction').textContent=task.instruction;$('construction-feedback').replaceChildren();draw();}
  function openDrawing(){panel('drawing-panel');show();draw();$('construction-board').focus();}
  async function openExplanation(){
    try{
      if(!state?.feedback?.item)return;
      const {store}=await browserReady,s=await store.read();
      explanationItem=structuredClone(s.items[state.feedback.item_id]);
      $('explanation-question').textContent=explanationItem.prompt.split('\n図データ：')[0];
      renderVisualTask({prompt:explanationItem.prompt},$('explanation-visual'),explanationItem.topic);
      for(const id of ['reason-givens','reason-method','reason-check'])$(id).value='';
      try{const draft=JSON.parse(sessionStorage.getItem('sansuu-reason:'+explanationItem.item_id));if(draft)for(const id of ['reason-givens','reason-method','reason-check'])$(id).value=draft[id]||'';}catch{}
      panel('explanation-panel');show();$('reason-givens').focus();
    }catch(e){panel('explanation-panel');show();status('問題を読み込めませんでした。学習記録は変更していません。');}
  }
  const formatAnswer=answer=>typeof answer==='object'?`${answer.n}/${answer.d}`:String(answer);
  function validText(x,max=4000){return typeof x==='string'&&x.length<=max;}
  function validRecord(r){
    if(!r||typeof r!=='object'||!/^[a-f0-9-]{36}$/.test(r.id)||!Number.isFinite(Date.parse(r.created_at)))return false;
    if(r.kind==='construction')return TASKS.some(t=>t.id===r.task)&&Array.isArray(r.points)&&r.points.length===TASKS.find(t=>t.id===r.task).count&&r.points.every(p=>Array.isArray(p)&&p.length===2&&p.every((n,i)=>Number.isInteger(n)&&n>=0&&n<=(i?8:12)));
    if(r.kind!=='explanation'||!validText(r.topic,120)||!validText(r.item_id,260)||!validText(r.question,20000)||!validText(r.model_answer,120)||!Array.isArray(r.worked_steps)||!r.worked_steps.every(x=>validText(x,4000))||r.worked_steps.length>30||!r.response||!['givens','method','check'].every(k=>validText(r.response[k])&&r.response[k].trim()))return false;
    if(r.review!==undefined){const v=r.review;if(!v||!['self','reviewer'].includes(v.role)||!Array.isArray(v.ratings)||v.ratings.length!==3||!v.ratings.every(x=>['met','revise','unsure'].includes(x))||!validText(v.comment)||!validText(v.name,120))return false;}
    return true;
  }
  async function verifyExplanation(record){
    if(record.kind!=='explanation')return;
    const {pack,loader}=await browserReady,spec=pack.topics[record.topic];
    if(!spec)throw Error('今の教材にない説明の記録です。');
    const prefix='browser-item/1:'+record.topic+':',rest=record.item_id.startsWith(prefix)?record.item_id.slice(prefix.length):'',parts=rest.split(':');
    if(parts.length!==2||!/^\d+$/.test(parts[0])||Number(parts[0])>0xffffffff||!/^[a-f0-9]{64}$/.test(parts[1]))throw Error('説明の問題IDを確認できません。');
    await loader.ensure(record.topic);
    const match=spec.rows.some(row=>{
      const answer=spec.form_policy.kind==='required_denominator'?{n:row.answer.n*(row.required_denominator/row.answer.d),d:row.required_denominator}:row.answer;
      return row.semantic_fingerprint===parts[1]&&row.prompt===record.question&&JSON.stringify(row.worked_steps)===JSON.stringify(record.worked_steps)&&formatAnswer(answer)===record.model_answer;
    });
    if(!match)throw Error('説明の問題・考え方の例が今の教材と一致しません。元の記録は変更していません。');
  }
  function review(record){
    reviewRecord=record;panel('understanding-review');show();const host=$('understanding-review-content');host.replaceChildren();
    if(record.kind==='construction'){
      const t=TASKS.find(t=>t.id===record.task),checks=assess(t,record.points);
      host.append(el('h3',t.label),el('p',t.instruction),el('p',record.points.map(p=>`(${p.join(', ')})`).join(' → ')));
      const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 492 360');svg.setAttribute('role','img');svg.setAttribute('aria-label',t.label+'。描いた頂点：'+record.points.map(pointKey).join('、'));svg.classList.add('construction-preview');
      const n=(tag,attrs)=>{const node=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))node.setAttribute(k,String(v));svg.append(node);};
      for(let x=0;x<=12;x++)n('line',{x1:30+x*36,y1:30,x2:30+x*36,y2:318,stroke:'#dbe3e8'});
      for(let y=0;y<=8;y++)n('line',{x1:30,y1:30+y*36,x2:462,y2:30+y*36,stroke:'#dbe3e8'});
      if(t.axis)n('line',{x1:30+t.axis*36,y1:18,x2:30+t.axis*36,y2:325,stroke:'#9b6e20','stroke-width':3,'stroke-dasharray':'7 5'});
      const sketch=(ps,color,closed,pairs)=>{for(let i=1;i<ps.length;i++){if(pairs&&i%2===0)continue;n('line',{x1:30+ps[i-1][0]*36,y1:30+ps[i-1][1]*36,x2:30+ps[i][0]*36,y2:30+ps[i][1]*36,stroke:color,'stroke-width':3});}if(closed)n('line',{x1:30+ps.at(-1)[0]*36,y1:30+ps.at(-1)[1]*36,x2:30+ps[0][0]*36,y2:30+ps[0][1]*36,stroke:color,'stroke-width':3});for(const[x,y]of ps)n('circle',{cx:30+x*36,cy:30+y*36,r:6,fill:color});};
      if(t.given)sketch(t.given,'#b4414b',t.given.length===3,false);sketch(record.points,'#245bb0',t.closed,t.pairs);host.append(svg);
      t.criteria.forEach((c,i)=>host.append(el('p',(checks[i]?'✓ ':'要確認：')+c)));
      $('reason-review-form').hidden=true;return;
    }
    host.append(el('h3','説明の確認'),el('p',record.question.split('\n図データ：')[0],'understanding-source'));
    const visual=el('div');host.append(visual);renderVisualTask({prompt:record.question},visual,record.topic);
    for(const[k,title]of [['givens','使った数や条件'],['method','式や方法を選んだ理由'],['check','確かめ方']])host.append(el('h4',title),el('p',record.response[k],'written-response'));
    const details=el('details');details.append(el('summary','答え・考え方の例を見る'));
    details.append(el('p','答え：'+record.model_answer));record.worked_steps.forEach(s=>details.append(el('p',s)));host.append(details);
    host.append(el('p','言い方は例と同じでなくてもかまいません。数・図の条件、方法の理由、確かめ方が問題とつながっているかを確認します。文章を保存しただけで正解・理解済みとは判定しません。','format'));
    $('reason-review-form').hidden=false;$('reason-review-role').value=record.review?.role||'self';$('reason-review-name').value=record.review?.name||'';$('reason-review-comment').value=record.review?.comment||'';
    for(let i=0;i<3;i++)$('reason-rating-'+i).value=record.review?.ratings[i]||'unsure';
  }
  async function history(){
    panel('understanding-history');show();const host=$('understanding-records');host.replaceChildren(el('p','読み込んでいます…'));
    try{const records=await list();host.replaceChildren();for(const r of records.sort((a,b)=>b.created_at.localeCompare(a.created_at))){const t=r.kind==='construction'?TASKS.find(t=>t.id===r.task)?.label:'説明：'+r.topic;host.append(btn(new Date(r.created_at).toLocaleString('ja-JP')+' · '+t+' · '+(r.kind==='construction'?(assess(TASKS.find(t=>t.id===r.task),r.points).every(Boolean)?'条件に適合':'直してみよう'):r.review?'確認の記録あり':'未確認'),()=>review(r)));}if(!records.length)host.append(el('p','まだ作図・説明の記録はありません。'));}catch(e){status(e.message);}
  }
  function download(records){const url=URL.createObjectURL(new Blob([encodeRecords(records)],{type:'application/json'})),a=el('a');a.href=url;a.download='sansuu-understanding-record.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  window.addEventListener('DOMContentLoaded',()=>{
    $('construction-task').replaceChildren(...TASKS.map(t=>{const n=el('option',t.label);n.value=t.id;return n;}));
    let draft;try{draft=JSON.parse(sessionStorage.getItem('sansuu-construction-draft'));}catch{}
    chooseTask(TASKS[0].id);
    if(draft&&TASKS.some(t=>t.id===draft.task)&&Array.isArray(draft.points)&&draft.points.length<=TASKS.find(t=>t.id===draft.task).count&&draft.points.every(p=>Array.isArray(p)&&p.length===2&&p.every((n,i)=>Number.isInteger(n)&&n>=0&&n<=(i?8:12)))){task=TASKS.find(t=>t.id===draft.task);points=draft.points;$('construction-task').value=task.id;$('construction-instruction').textContent=task.instruction;draw();}
    $('open-construction').onclick=openDrawing;$('open-understanding-history').onclick=history;$('explain-answer').onclick=openExplanation;
    $('close-understanding').onclick=()=>$('understanding-dialog').close();
    $('understanding-done').onclick=()=>$('understanding-dialog').close();
    $('construction-task').onchange=e=>chooseTask(e.target.value);
    $('construction-undo').onclick=()=>{points.pop();$('construction-feedback').replaceChildren();draw();};
    $('construction-clear').onclick=()=>{points=[];$('construction-feedback').replaceChildren();draw();};
    $('construction-board').addEventListener('pointerup',event=>{const svg=event.currentTarget,pt=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse()),p=[Math.round((pt.x-30)/36),Math.round((pt.y-30)/36)];if(p[0]>=0&&p[0]<=12&&p[1]>=0&&p[1]<=8)pick(p);});
    $('construction-board').addEventListener('keydown',event=>{
      const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
      if(arrows[event.key]){event.preventDefault();cursor=cursor.map((n,i)=>Math.max(0,Math.min(i?8:12,n+arrows[event.key][i])));draw();$('construction-cursor').textContent=`位置 (${cursor.join(', ')})`;}else if(event.key==='Enter'||event.key===' '){event.preventDefault();pick([...cursor]);}else if(event.key==='Backspace'){event.preventDefault();points.pop();draw();}
    });
    $('construction-check').onclick=async()=>{
      if(points.length!==task.count||saving)return;
      const submittedTask=task,record={...stamp(),kind:'construction',task:task.id,points:structuredClone(points)};
      $('construction-check').disabled=true;
      if(!await save(record)){draw();return;}
      if(task.id!==record.task||JSON.stringify(points)!==JSON.stringify(record.points)){draw();return;}
      const checks=assess(submittedTask,record.points),host=$('construction-feedback');host.replaceChildren(el('strong',checks.every(Boolean)?'図形の条件を満たしています。':'条件をひとつずつ確かめて、直してみよう。'));submittedTask.criteria.forEach((c,i)=>host.append(el('p',(checks[i]?'✓ ':'要確認：')+c)));draw();
    };
    for(const id of ['reason-givens','reason-method','reason-check'])$(id).addEventListener('input',()=>{if(!explanationItem)return;try{sessionStorage.setItem('sansuu-reason:'+explanationItem.item_id,JSON.stringify(Object.fromEntries(['reason-givens','reason-method','reason-check'].map(k=>[k,$(k).value]))));}catch{}});
    $('reason-submit').onclick=async()=>{
      if(!explanationItem||saving)return;const response={givens:$('reason-givens').value.trim(),method:$('reason-method').value.trim(),check:$('reason-check').value.trim()};
      if(Object.values(response).some(x=>!x)){status('3つの欄に考えを書いてください。まだ考え中なら、そのことも書けます。');return;}
      const item=explanationItem,record={...stamp(),kind:'explanation',topic:item.topic,item_id:item.item_id,question:item.prompt,model_answer:formatAnswer(item.form_policy.kind==='required_denominator'?{n:item.answer.n*(item.required_denominator/item.answer.d),d:item.required_denominator}:item.answer),worked_steps:item.worked_steps,response};
      if(await save(record)){try{sessionStorage.removeItem('sansuu-reason:'+item.item_id);}catch{}review(record);}
    };
    $('reason-save-review').onclick=async()=>{
      if(!reviewRecord||saving)return;const record={...reviewRecord,review:{role:$('reason-review-role').value,name:$('reason-review-name').value.trim(),ratings:[0,1,2].map(i=>$('reason-rating-'+i).value),comment:$('reason-review-comment').value.trim()}};
      // Compare and update this record atomically; never replace other students' records.
      saving=true;try{await update(record,reviewRecord);reviewRecord=record;status('確認結果を保存しました。学習全体の理解度や正式な認定には変換しません。');}catch(e){status(e.message);}finally{saving=false;}
    };
    $('understanding-back-history').onclick=history;
    $('export-understanding').onclick=async()=>{try{download(await list());status('作図・説明の記録を書き出しました。説明に個人情報を書いた場合は、その内容も含まれます。');}catch(e){status(e.message);}};
    $('import-understanding').onchange=async event=>{
      const file=event.target.files[0];if(!file)return;event.target.disabled=true;
      try{if(file.size>MAX_BYTES)throw Error('記録ファイルは5MBまでです。');const imported=JSON.parse(await file.text());if(imported.format!=='understanding-record/1'||!Array.isArray(imported.records)||imported.records.length>MAX||!imported.records.every(validRecord)||new Set(imported.records.map(r=>r.id)).size!==imported.records.length)throw Error('記録の形式を確認できません。元の記録は変更していません。');
        for(const r of imported.records)await verifyExplanation(r);
        const existing=await list(),known=new Map(existing.map(r=>[r.id,r]));
        for(const r of imported.records)if(known.has(r.id)&&JSON.stringify(known.get(r.id))!==JSON.stringify(r))throw Error('同じIDの異なる記録があります。元の記録は変更していません。');
        const added=imported.records.filter(r=>!known.has(r.id));if(existing.length+added.length>MAX)throw Error('記録の上限1,000件を超えます。');if(!confirm(`作図・説明の記録${added.length}件を追加します。今ある記録は残ります。追加しますか？`)){status('取り込みを取り消しました。');return;}await write(added);await history();status(`${added.length}件を追加しました。`);
      }catch(e){status(e instanceof SyntaxError?'JSONファイルを読み取れません。元の記録は変更していません。':e.message);}finally{event.target.disabled=false;event.target.value='';}
    };
    $('clear-understanding').onclick=async()=>{if(!confirm('作図・説明・確認結果の記録を消します。必要なら先に書き出してください。消しますか？'))return;try{await write([],true);try{for(const key of Object.keys(sessionStorage))if(key.startsWith('sansuu-reason:')||key==='sansuu-construction-draft')sessionStorage.removeItem(key);}catch{}points=[];reviewRecord=null;explanationItem=null;await history();status('作図・説明の記録を消しました。計算の学習記録は残っています。');}catch(e){status(e.message);}};
  });
  // Read-only task specification and independent geometric assessment for QA.
  window.constructionAssessment={tasks:TASKS.map(t=>structuredClone(t)),assess:(id,points)=>assess(TASKS.find(t=>t.id===id),points)};
})();
