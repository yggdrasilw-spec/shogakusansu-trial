/* Render only the learner's public prompt. No internal parameters or answers. */
function visualObjectText(text,topic){return window.mathPictureObjects?.()&&['s1-count-visual','s1-group-visual','s1-match-visual','s1-compare-visual'].includes(topic)?text.replaceAll('丸','りんご'):text;}
function renderVisualTask(item,host,topic){
 host.replaceChildren();host.hidden=true;
 const measurement=measurementSceneForItem(item,topic);
 if(measurement){host.className='visual-board';if(drawMeasurementScene(measurement,host))return item.prompt.split('\n図データ：')[0];}
 if(topic.startsWith('tb-'))return renderTextbookTask(item,host)??item.prompt;
 const parts=item.prompt.split('\n');
 const objects=['s1-count-visual','s1-group-visual','s1-match-visual','s1-compare-visual'];
 if(objects.includes(topic)){
  host.hidden=false;host.className='visual-board';
  for(const line of parts.slice(1)){
   const row=document.createElement('div');row.className='visual-row';
   const shapes=[...line].filter(x=>x==='●'||x==='■');
   row.setAttribute('role','img');row.setAttribute('aria-label',(line.startsWith('上')?'上。':line.startsWith('下')?'下。':'')+(shapes.length?shapes.map(s=>s==='●'?visualObjectText('丸',topic):'四角').join('、'):'空の枠'));
   if(line.startsWith('上')||line.startsWith('下')){const label=document.createElement('span');label.textContent=line.slice(0,2);label.setAttribute('aria-hidden','true');row.append(label)}
   for(const shape of shapes){const dot=document.createElement('span');dot.className=shape==='●'?'object-dot':'object-square';dot.textContent=shape;dot.setAttribute('aria-hidden','true');if(shape==='●'&&window.mathPictureObjects?.()){dot.classList.add('picture-object');const img=document.createElement('img');img.src='./assets/counting-apple.png';img.alt='';img.width=48;img.height=48;img.onerror=()=>{img.remove();dot.classList.remove('picture-object');};dot.append(img);}row.append(dot)}
   if(!shapes.length){const empty=document.createElement('span');empty.textContent='（空の枠）';empty.setAttribute('aria-hidden','true');row.append(empty)}
   host.append(row)
  }
  return visualObjectText(parts[0],topic);
 }
 if(topic==='s3-tick-visual'){
  const endpoints=parts[0].match(/^左端の値は(\d+)、右端の値は(\d+)/),marks=parts[1]?.split('──');
  if(!endpoints||!marks||!marks.every(x=>x==='│'||x==='▲')||marks.filter(x=>x==='▲').length!==1)return item.prompt;
  const intervals=marks.length-1,target=marks.indexOf('▲'),ns='http://www.w3.org/2000/svg';
  const node=(tag,attrs,text)=>{const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text)e.textContent=text;return e};
  host.hidden=false;host.className='visual-board';const svg=node('svg',{viewBox:'0 0 620 145',role:'img','aria-label':`等間隔の目盛り。左端${endpoints[1]}、右端${endpoints[2]}。${intervals}区間。▲は左端から${target}区間右。`});
  svg.append(node('line',{x1:40,y1:65,x2:580,y2:65,stroke:'#183334','stroke-width':3}));
  marks.forEach((mark,i)=>{const x=40+540*i/intervals;svg.append(node('line',{x1:x,y1:49,x2:x,y2:81,stroke:'#183334','stroke-width':3}));if(i===0||i===intervals)svg.append(node('text',{x,y:35,'text-anchor':'middle','font-size':24,fill:'#183334'},i===0?endpoints[1]:endpoints[2]));if(mark==='▲')svg.append(node('text',{x,y:116,'text-anchor':'middle','font-size':30,fill:'#176659'},'▲'))});
  host.append(svg);return parts[0]+'\n'+parts[2];
 }
 return item.prompt;
}
