/* One short caption and one mathematical operation per learner-controlled step.
   Created only after the existing support transaction has been committed. */
(() => {
 const topics=['a-basic','a-complement','as-add-transfer','as-sub-basic','as-sub-ten','as-sub-transfer','c-unit','c-equivalent','c-common','c-reduce','b-share','b-group','b-basic','b-remainder'];
 const gcd=(a,b)=>b?gcd(b,a%b):a;
 const slot=(i,side=0)=>[46+(i%5)*43+side*290,90+Math.floor(i/5)*43];
 const dot=(i,side,color)=>({id:`${side}-${i}`,x:slot(i,side)[0],y:slot(i,side)[1],color});
 function build(item,kind){
  if(!topics.includes(item.topic))return null;
  const {a,b,n,d,k}=item.parameters, frames=[], fraction=item.topic.startsWith('c-');
  const add=(caption,objects,extra={})=>frames.push({caption,objects:structuredClone(objects),...structuredClone(extra)});
  let prediction, expected;
  if(item.topic.startsWith('b-')){
   const {q,r=0}=item.parameters,share=item.topic==='b-share',total=d*q+r;
   const groupBox=g=>({id:'group-'+g,x:220+(g%3)*125,y:55+Math.floor(g/3)*82,w:110,h:74,label:share?`${g+1}人目`:`${g+1}組目`});
   const position=(g,i)=>{const box=groupBox(g);return[box.x+18+(i%3)*24,box.y+31+Math.floor(i/3)*16];};
   let objects=Array.from({length:total},(_,i)=>({id:'div-'+i,x:30+(i%9)*16,y:80+Math.floor(i/9)*16,color:'#167b60',radius:6}));
   let groups=share?Array.from({length:d},(_,i)=>groupBox(i)):[];
   add(share?`${total}この玉を、${d}人で同じ数ずつ分けます。`:`${total}この玉を、1組${d}こずつにまとめます。`,objects,{division:true,groups,total});
   prediction=share?'1人分の玉は、何こになるでしょう？':r?'残る玉は、何こになるでしょう？':'同じ個数ずつまとめると、何組できるでしょう？';expected=String(r?r:q);
   for(let step=0;step<q;step++){
    if(share){
     objects=objects.map((o,i)=>i>=step*d&&i<(step+1)*d?{...o,x:position(i%d,step)[0],y:position(i%d,step)[1],group:i%d}:o);
     add(`1人に1こずつ配ります（${step+1}回目）。`,objects,{operation:'share',division:true,groups,total});
    }else{
     groups.push(groupBox(step));objects=objects.map((o,i)=>i>=step*d&&i<(step+1)*d?{...o,x:position(step,i%d)[0],y:position(step,i%d)[1],group:step}:o);
     add(`${d}この玉を動かして、1組にまとめます。`,objects,{operation:'group',division:true,groups,total});
    }
   }
   if(r){objects=objects.map((o,i)=>i>=d*q?{...o,x:30+(i-d*q)*18,y:275,remainder:true}:o);add('どの組にも入らなかった玉を、残った玉の場所へ集めます。',objects,{operation:'remainder',division:true,groups,total,remainder:true});}
   add(share?`1人分は${q}こです。どの人も同じ数です。`:r?`あまりは${r}こです。${d}こより少なく、もう1組は作れません。`:`${d}こずつの組が、${q}組できました。`,objects,{answer:true,division:true,groups,total,remainder:!!r});
   // Hints demonstrate the first rounds; the learner completes the division.
   if(kind==='hint')frames.splice(Math.min(frames.length,3));
  }else if(fraction){
   const reduce=item.topic==='c-reduce', unit=item.topic==='c-unit';
   const startD=reduce?d*k:d, startN=reduce?n*k:n, divisor=reduce?gcd(startN,startD):1;
   const endD=reduce?startD/divisor:unit?d:d*k, endN=reduce?startN/divisor:unit?n:n*k;
   const band={id:'band',x:40,y:100,w:540,h:90,fill:unit?0:startN/startD,denominator:startD};
   const units=unit?Array.from({length:n},(_,i)=>({id:'unit-'+i,unit:true,x:40+i*540/d,y:210,w:540/d,h:90,color:'#167b60'})):[];
   add(unit?`1/${d}の帯を${n}こ集めます。上の「1」と比べます。`:`同じ大きさの「1」を、${startD}等分しています。`,[band,...units]);
   prediction=unit?'集めた量は、1の何分のいくつ？（例：2/5）':reduce?'区切りをまとめても、色のついた量は変わるでしょうか？':'区切りを細かくしても、色のついた量は変わるでしょうか？';expected=unit?`${n}/${d}`:'変わらない';
   if(unit){units.forEach(o=>{o.y=100;});add(`1/${d}の帯を、「1」の区切りに合わせて動かします。`,[band,...units],{operation:'collect'});}
   else {add(reduce?`${divisor}こ分の区切りを、1こにまとめます。`:`1つの区切りを、さらに${k}等分します。`,[{...band,denominator:endD}],{operation:'partition'});}
   add(`色のついた量は${endN}/${endD}です。`,[{...band,denominator:endD},...units],{answer:true});
  }else{
   const complement=item.topic==='a-complement', subtract=item.topic.startsWith('as-sub-');
   const right=complement?10-a:b;
   let objects=Array.from({length:a},(_,i)=>dot(i,0,'#167b60'));
   if(!subtract&&!complement)objects.push(...Array.from({length:right},(_,i)=>dot(i,1,'#b95810')));
   add(subtract?`${a}この玉から、${b}こ取ります。`:complement?`${a}この玉があります。空いた場所を見ます。`:`左に${a}こ、右に${b}こあります。`,objects,{ten:true});
   prediction=subtract?'取ったあと、玉はいくつ残るでしょう？':complement||item.topic==='as-add-transfer'?'左の枠を10こにするには、あといくつ必要？':'合わせると、玉はいくつになるでしょう？';
   expected=String(subtract?a-b:complement||item.topic==='as-add-transfer'?10-a:a+b);
   if(subtract){
    // First remove the ones beyond ten, then remove the rest from ten.
    const first=item.topic==='as-sub-transfer'?a-10:b;
    const move=(lo,hi)=>{objects=objects.map((o,i)=>i>=lo&&i<hi?{...o,x:slot(a-1-i,1)[0],y:slot(a-1-i,1)[1]+100,removed:true}:o);};
    if(first){move(a-first,a);add(`${first}この玉を、取った玉の場所へ動かします。`,objects,{operation:'remove',ten:true});}
    if(first<b){move(a-b,a-first);add(`10このまとまりから、あと${b-first}こ取ります。`,objects,{operation:'remove',ten:true});}
    if(b===0)add('0こ取るので、玉はそのままです。',objects,{ten:true});
   }else if(complement){
    objects.push(...Array.from({length:right},(_,i)=>({...dot(i,1,'#b95810'),origin:slot(i,1),x:slot(a+i)[0],y:slot(a+i)[1]})));
    add('空いた場所に玉を入れて、10こにします。',objects,{operation:'fill',ten:true});
   }else{
    const first=Math.min(right,10-a);
    objects=objects.map(o=>o.id.startsWith('1-')&&Number(o.id.slice(2))<first?{...o,x:slot(a+Number(o.id.slice(2)))[0],y:slot(a+Number(o.id.slice(2)))[1]}:o);
    add(first?`${first}この玉を、左の空いた場所へ動かします。`:'右の玉は0こなので、そのままです。',objects,{operation:'combine',ten:true});
    if(right>first){objects=objects.map(o=>o.id.startsWith('1-')&&Number(o.id.slice(2))>=first?{...o,x:slot(a+Number(o.id.slice(2)))[0],y:slot(a+Number(o.id.slice(2)))[1]}:o);add(`残りの${right-first}こを、10このまとまりの下へ動かします。`,objects,{operation:'combine',ten:true});}
   }
   const answer=complement?right:subtract?a-b:a+b;
   add(complement?`加えた玉は${answer}こです。`:subtract?`残った玉は${answer}こです。`:`合わせた玉は${answer}こです。`,objects,{answer:true,ten:true});
  }
  return {topic:item.topic,frames:kind==='hint'?frames.filter(f=>!f.answer):frames,prediction,expected,hint:kind==='hint'};
 }
 let animations=[],retired=[];
 window.stopMeaningMotion=()=>{animations.forEach(a=>a.cancel());animations=[];retired.forEach(n=>n.remove());retired=[];};
 function render(lesson,host){
  stopTextbookPlayback();host.replaceChildren();host.hidden=false;host.className='visual-board meaning-motion';
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 620 310');svg.setAttribute('role','img');
  const caption=document.createElement('p'), controls=document.createElement('div'), check=document.createElement('div'), status=document.createElement('p');
  caption.className='lesson-caption';caption.setAttribute('aria-live','polite');controls.className='actions lesson-controls';check.className='motion-prediction';status.setAttribute('role','status');
  const prompt=document.createElement('label'), input=document.createElement('input'), verify=document.createElement('button');
  prompt.textContent=lesson.prediction;input.setAttribute('aria-label','予想した答え');input.maxLength=40;verify.type='button';verify.textContent='予想を確かめる';prompt.append(input);check.append(prompt,verify,status);
  verify.onclick=()=>{const response=input.value.normalize('NFKC').trim(),r=response.match(/^(\d+)\s*\/\s*(\d+)$/),e=lesson.expected.match(/^(\d+)\/(\d+)$/);
   const matches=response===lesson.expected||(r&&e&&Number(r[2])>0&&Number(r[1])*Number(e[2])===Number(e[1])*Number(r[2]));
   status.textContent=!response?'先に予想を書いてみよう。':matches?'図とつながっています。動かして確かめよう。':'図を動かし、空いた場所や残った量を確かめよう。';};
  let index=0;const nodes=new Map();
  const make=(tag,attrs,parent=svg)=>{const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e;};
  const groupLayer=make('g',{});
  if(lesson.frames[0].division){const total=make('text',{x:100,y:45,'text-anchor':'middle','font-size':18,fill:'#183334'});total.textContent=`全部 ${lesson.frames[0].total}こ`;}
  if(lesson.topic.startsWith('c-')){const whole=make('text',{x:310,y:65,'text-anchor':'middle','font-size':22,fill:'#183334'});whole.textContent='全体の 1';}
  if(lesson.frames[0].ten){for(let i=0;i<20;i++){const[x,y]=slot(i);make('rect',{x:x-19,y:y-19,width:38,height:38,rx:4,fill:'none',stroke:'#a2bbb1'});}const label=make('text',{x:420,y:290,'text-anchor':'middle','font-size':18,fill:'#183334'});label.textContent=lesson.topic.startsWith('as-sub-')?'取った玉':'右の玉';}
  const button=(text,fn)=>{const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=text;b.onclick=fn;controls.append(b);return b;};
  const prev=button('ひとつ戻る',()=>{index=Math.max(0,index-1);show(false);}), replay=button('この動きをもう一度',()=>{if(index>0){const target=index;index--;show(false);index=target;show(true);}else show(false);}), next=button(lesson.hint?'次のヒント':'次の動きを見る',()=>{index=Math.min(index+1,lesson.frames.length-1);show(true);});
  function show(animate){
   window.stopMeaningMotion();const frame=lesson.frames[index];renderMathText(caption,frame.caption);caption.prepend(document.createTextNode(`${index+1} / ${lesson.frames.length}　`));svg.setAttribute('aria-label',frame.caption);
   const reduced=window.mathMotionReduced?.()??matchMedia('(prefers-reduced-motion: reduce)').matches;
   groupLayer.replaceChildren();for(const group of frame.groups||[]){
    make('rect',{x:group.x,y:group.y,width:group.w,height:group.h,rx:8,fill:'#f0f5f2',stroke:'#a2bbb1'},groupLayer);
    const label=make('text',{x:group.x+group.w/2,y:group.y+17,'text-anchor':'middle','font-size':14,fill:'#183334'},groupLayer);label.textContent=group.label;
   }
   if(frame.remainder){const label=make('text',{x:100,y:254,'text-anchor':'middle','font-size':16,fill:'#183334'},groupLayer);label.textContent='残った玉';}
   for(const o of frame.objects){
    let node=nodes.get(o.id);
    if(o.id==='band'){
     if(!node){node=make('g',{'data-object':o.id});make('rect',{x:o.x,y:o.y,width:o.w,height:o.h,fill:'#f0f5f2',stroke:'#183334'},node);make('rect',{x:o.x,y:o.y,width:o.w*o.fill,height:o.h,fill:'#167b60'},node);nodes.set(o.id,node);}
     const oldLines=new Map([...node.querySelectorAll('line')].map(n=>[n.getAttribute('data-cut'),n]));
     const cuts=new Set();for(let i=1;i<o.denominator;i++){
      const cut=String(i/o.denominator);cuts.add(cut);
      if(!oldLines.has(cut)){const line=make('line',{'data-cut':cut,x1:o.x+i*o.w/o.denominator,x2:o.x+i*o.w/o.denominator,y1:o.y,y2:o.y+o.h,stroke:'#183334','stroke-width':1},node);
       if(animate&&!reduced)animations.push(line.animate([{strokeDasharray:'90',strokeDashoffset:'90'},{strokeDasharray:'90',strokeDashoffset:'0'}],{duration:900}));}
     }
     for(const[cut,line]of oldLines)if(!cuts.has(cut)){
      if(animate&&!reduced){retired.push(line);const animation=line.animate([{opacity:1},{opacity:0}],{duration:900});animations.push(animation);animation.onfinish=()=>line.remove();}else line.remove();
     }
     // The colored area stays fixed while partitions change; never stretch the whole.
     node.setAttribute('data-denominator',o.denominator);node.setAttribute('data-filled',o.fill);
     node.setAttribute('stroke',o.highlight?'#b95810':'none');
    }else{
     const xattr=o.unit?'x':'cx',yattr=o.unit?'y':'cy';
     const old=node?{x:Number(node.getAttribute(xattr)),y:Number(node.getAttribute(yattr))}:o.origin?{x:o.origin[0],y:o.origin[1]}:null;
     if(!node){node=make(o.unit?'rect':'circle',o.unit?{width:o.w,height:o.h,fill:o.color,'data-object':o.id}:{r:o.radius||15,fill:o.color,'data-object':o.id});nodes.set(o.id,node);}
     node.setAttribute(xattr,o.x);node.setAttribute(yattr,o.y);node.setAttribute('data-removed',!!o.removed);node.setAttribute('stroke',o.remainder?'#b95810':o.unit||o.removed?'#183334':'none');node.setAttribute('stroke-dasharray',o.removed?'3 2':'none');
     if(animate&&!reduced&&old&&(old.x!==o.x||old.y!==o.y))animations.push(node.animate([{transform:`translate(${old.x-o.x}px,${old.y-o.y}px)`},{transform:'translate(0,0)'}],{duration:900,easing:'ease-in-out'}));
    }
   }
   for(const[id,node]of nodes)if(!frame.objects.some(o=>o.id===id)){node.remove();nodes.delete(id);}
   prev.disabled=index===0;next.disabled=index===lesson.frames.length-1;replay.disabled=index===0;
   check.hidden=index!==0;
   footer.textContent=index===lesson.frames.length-1?(lesson.hint?'ヒントを閉じて、自分で続きを考えよう。':'図を閉じて自分で答えよう。次の新しい問題では、ヒントなしで確かめよう。'):'先を予想してから、1つずつ動かせます。予想は練習で、実力の判定には使いません。';
  }
  const footer=document.createElement('p');footer.className='format';host.append(svg,caption,check,controls,footer);show(false);
 }
 window.meaningMotion={build,render,topics};
})();
