/* SVG geometry adapted from monosashi/index.html and sonohoka/kasa-sym.html.
 * See assets/REUSED_SVG.md. Givens come exclusively from the public prompt. */
function measurementSceneForItem(item,topic){
 const prompt=item.prompt.split('\n図データ：')[0];let m;
 if(topic==='s2-length'&&(m=prompt.match(/^(\d+)cm(\d+)mmは何mm？$/)))return {kind:'measurement-ruler',start_mm:0,end_mm:10*Number(m[1])+Number(m[2]),given:`${m[1]}cm${m[2]}mm`};
 if(topic==='tb-me2-length-unit'&&(m=prompt.match(/^(\d+)cmは何mm？$/)))return {kind:'measurement-ruler',start_mm:0,end_mm:10*Number(m[1]),given:`${m[1]}cm`};
 const group=(litres,rest,unit,title)=>({millilitres:1000*Number(litres)+Number(rest)*(unit==='dL'?100:1),given:unit==='dL'?`${litres}L${rest}dL`:`${litres}Lと${rest}mL`,unit,title});
 if(topic==='s2-capacity-dl'&&(m=prompt.match(/^(\d+)L(\d+)dLは何dL？$/)))return {kind:'measurement-capacity',groups:[group(m[1],m[2],'dL','水の量')]};
 if(topic==='s2-capacity-ml'&&(m=prompt.match(/^(\d+)Lと(\d+)mLを合わせると何mL？$/)))return {kind:'measurement-capacity',groups:[group(m[1],m[2],'mL','合わせる水')]};
 if(['s2-capacity-add','s2-capacity-sub'].includes(topic)&&(m=prompt.match(/^(\d+)L(\d+)dLと(\d+)L(\d+)dLを(?:合わせると|引くと)何dL？$/)))return {kind:'measurement-capacity',operation:topic.endsWith('sub')?'sub':'add',groups:[group(m[1],m[2],'dL',topic.endsWith('sub')?'はじめの水':'一つ目の水'),group(m[3],m[4],'dL',topic.endsWith('sub')?'引く水':'二つ目の水')]};
 return null;
}

function drawMeasurementScene(scene,host){
 const ruler=scene.kind==='measurement-ruler'||scene.kind==='ruler'&&scene.unit==='cm';
 const capacity=scene.kind==='measurement-capacity'||scene.kind==='capacity';
 if(!ruler&&!capacity)return false;
 host.replaceChildren();host.hidden=false;host.classList.add('measurement-board');
 const ns='http://www.w3.org/2000/svg';
 const node=(tag,attrs={},text)=>{const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=String(text);return n;};
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const phase=scene.phase===1;
 if(ruler){
  const start=scene.start_mm??10*(scene.start??scene.a),end=scene.end_mm??start+10*scene.b*(scene.step||1);
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<start||end>1000)return false;
  const firstCm=Math.max(0,Math.floor(start/10)-1),lastCm=Math.max(firstCm+1,Math.ceil(end/10)+1),cm=lastCm-firstCm,step=Math.max(38,540/cm),w=cm*step+100,x0=45,y=160,h=95;
  const controls=el('div','','measurement-shapes');controls.setAttribute('role','group');controls.setAttribute('aria-label','ものさしの表示倍率');
  const scroll=el('div','','measurement-ruler-scroll');scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','ものさしの図。左右にスクロールできます');
  const svg=node('svg',{viewBox:`0 0 ${w} 295`,width:w,class:'ruler-overview',role:'img','aria-label':`cmとmmのものさし。${firstCm}cmから${lastCm}cmの部分。1cmの間は10等分。棒の左端${start/10}cm、右端${end/10}cm。画面上の長さは実寸ではありません。`});
  svg.dataset.assetSource='monosashi';svg.dataset.startMm=start;svg.dataset.endMm=end;svg.dataset.axisStartMm=firstCm*10;
  // Plastic ruler's outline, zero offset, shine and 28/40/66 tick proportions.
  svg.append(node('rect',{x:x0-16,y,width:cm*step+32,height:h,rx:8,fill:'#c2e0f5',stroke:'#5a9ac8','stroke-width':2}),node('rect',{x:x0-15,y:y+1,width:cm*step+30,height:26,rx:7,fill:'#e8f4fb',opacity:.75}),node('line',{x1:x0,y1:y,x2:x0,y2:y+h,stroke:'#1a5276','stroke-width':2.5}));
  for(let mm=firstCm*10;mm<=lastCm*10;mm++){
   const x=x0+(mm-firstCm*10)*step/10,isCm=mm%10===0,half=mm%5===0;
   svg.append(node('line',{x1:x,y1:y,x2:x,y2:y+(isCm?44:half?28:19),stroke:'#1a5276','stroke-width':isCm?1.8:1,'data-mm':mm}));
   if(isCm)svg.append(node('text',{x,y:y+70,'text-anchor':'middle','font-size':28,'font-weight':700,fill:'#0d3349'},mm/10));
  }
  svg.append(node('text',{x:x0+cm*step+9,y:y+89,'text-anchor':'end','font-size':15,fill:'#0d3349'},'cm'));
  const left=x0+(start-firstCm*10)*step/10,right=x0+(end-firstCm*10)*step/10;
  svg.append(node('rect',{x:left,y:105,width:right-left,height:28,rx:3,fill:'#bfe0cf',stroke:'#176659','stroke-width':2,'data-measured-object':'true'}));
  for(const x of [left,right])svg.append(node('line',{x1:x,y1:98,x2:x,y2:y,stroke:phase?'#b76a1d':'#176659','stroke-width':2,'stroke-dasharray':'4 4'}));
  const title=node('text',{x:w/2,y:45,'text-anchor':'middle','font-size':21,fill:'#24364d'},phase?'左端と右端の間の長さを読む':scene.given?`棒の長さ ${scene.given}`:'棒の両端を目盛りに合わせる');svg.append(title);
  if(phase)svg.append(node('line',{x1:left,y1:85,x2:right,y2:85,stroke:'#b76a1d','stroke-width':4}));
  for(const [mode,title]of [['overview','全体を見る'],['detail','目盛りを拡大']]){const b=el('button',title,'secondary');b.type='button';b.dataset.rulerView=mode;b.setAttribute('aria-pressed',String(mode==='overview'));b.onclick=()=>{svg.classList.toggle('ruler-overview',mode==='overview');controls.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));if(mode==='detail')scroll.scrollLeft=Math.max(0,left*svg.getBoundingClientRect().width/w-32);else scroll.scrollLeft=0;};controls.append(b);}
  scroll.append(svg);host.append(controls,scroll,el('p',(firstCm?'ものさしの途中の部分を表示しています。':'')+'1cmの間に小さい目盛りが10区間あります。拡大した図は左右にスクロールできます。実寸ではありません。','measurement-note'));return true;
 }
 const arbitrary=scene.kind==='capacity';
 const groups=arbitrary?[{cups:scene.a,title:'上',given:`${scene.a}杯`},{cups:scene.b,title:'下',given:`${scene.b}杯`}]:scene.groups;
 if(!Array.isArray(groups)||groups.length>2||groups.some(g=>arbitrary?!Number.isInteger(g.cups)||g.cups<0||g.cups>20:!Number.isInteger(g.millilitres)||g.millilitres<0||g.millilitres>20000))return false;
 const controls=el('div','','measurement-shapes');controls.setAttribute('role','group');controls.setAttribute('aria-label','容器の形。同じ量のまま切り替えます');
 const area=el('div','','measurement-groups');let shape='cylinder';
 for(const [value,title]of [['cylinder','円筒ます'],['cube','立方体ます']]){const b=el('button',title,'secondary');b.type='button';b.dataset.shape=value;b.onclick=()=>{shape=value;show();};controls.append(b);}
 host.append(controls,area,el('p',arbitrary?'同じ大きさの小容器で比べています。':'どのますも満杯で1L。形を変えても水の量は同じです。','measurement-note'));
 function vessel(dl,label){
  const svg=node('svg',{viewBox:shape==='cube'?'0 0 400 430':'0 0 600 920',role:'img','aria-label':label});svg.dataset.assetSource='kasa-sym';svg.dataset.dl=dl;svg.dataset.shape=shape;
  if(shape==='cylinder'){
   const y=180+(10-dl)*60;
   svg.append(node('path',{d:'M 50,100 L 50,800 A 250,55 0 0,0 550,800 L 550,100 A 250,55 0 0,0 50,100 Z',fill:'#fff'}));
   if(dl>0){const liquid=node('g',{'data-water':'true'});liquid.append(node('path',{d:`M 50,${y} A 250,55 0 0,0 550,${y} L 550,800 A 250,55 0 0,1 50,800 Z`,fill:'#1ca7ff'}),node('ellipse',{cx:300,cy:y,rx:250,ry:55,fill:'#1ca7ff'}),node('ellipse',{cx:300,cy:y,rx:250,ry:55,fill:'none',stroke:'#7cd2ff','stroke-width':6}),node('path',{d:`M 50,${y} A 250,55 0 0,0 550,${y}`,fill:'none',stroke:'#fff','stroke-width':5}));svg.append(liquid);}
   if(!arbitrary)for(let d=1;d<=10;d++){const yTick=780-d*60;svg.append(node('path',{d:`M 50,${yTick} A 250,55 0 0,0 ${d===5||d===10?150:100},${yTick+(d===5||d===10?44:33)}`,fill:'none',stroke:phase?'#b76a1d':'#24364d','stroke-width':10,'data-dl-mark':d}));}
   svg.append(node('path',{d:'M 50,100 L 50,800 A 250,55 0 0,0 550,800 L 550,100',fill:'none',stroke:'#24364d','stroke-width':16,'stroke-linecap':'round','stroke-linejoin':'round'}),node('ellipse',{cx:300,cy:100,rx:250,ry:55,fill:'none',stroke:'#24364d','stroke-width':16}));
  }else{
   const c=400-dl*20,s=350-dl*20;
   if(dl>0){const liquid=node('g',{opacity:.7,'data-water':'true'});for(const [points,fill]of [[`200 ${c}, 50 ${s}, 50 350, 200 400`,'#81d4fa'],[`200 ${c}, 350 ${s}, 350 350, 200 400`,'#4fc3f7'],[`200 ${c}, 350 ${s}, 200 ${300-dl*20}, 50 ${s}`,'#b3e5fc']])liquid.append(node('polygon',{points,fill}));svg.append(liquid);}
   svg.append(node('path',{d:'M50 150 L200 100 L350 150 L200 200 L50 150 L50 350 L200 400 L350 350 L350 150 L200 200 L200 400',fill:'none',stroke:'#24364d','stroke-width':3}));
   if(!arbitrary)for(let d=1;d<=10;d++){const y=400-d*20;svg.append(node('line',{x1:50,y1:y-50,x2:200,y2:y,stroke:phase?'#b76a1d':'#24364d','stroke-width':1.5,'data-dl-mark':d}));}
  }
  return svg;
 }
 function show(){
  controls.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.shape===shape)));area.replaceChildren();
  groups.forEach(g=>{
   const section=el('section','','measurement-group');section.append(el('h3',g.title+'：'+g.given));
   const grid=el('div','','measurement-vessels');
   const full=arbitrary?g.cups:Math.floor(g.millilitres/1000),rest=arbitrary?0:g.millilitres%1000;
   const amounts=Array(full).fill(10);if(rest)amounts.push(rest/100);if(!amounts.length)amounts.push(0);
   amounts.forEach((dl,i)=>{const label=arbitrary?(g.cups?'同じ小容器1杯':'空の小容器'):dl===10?'1L':dl===0?'空のます':g.unit==='mL'?`${rest}mL`:`${rest/100}dL`;
    const figure=el('figure','','measurement-vessel');figure.append(vessel(dl,label),el('figcaption',label));figure.dataset.givenMl=arbitrary?'':dl*100;grid.append(figure);
   });section.append(grid);area.append(section);
  });
 }
 show();return true;
}
