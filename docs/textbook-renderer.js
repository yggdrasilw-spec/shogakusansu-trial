/* Original SVG diagrams. All question data comes from the public prompt.
 * Storyboards are delivered only after the server records answer support. */
let textbookPlayback = null;
function stopTextbookPlayback(){if(textbookPlayback!==null)clearInterval(textbookPlayback);textbookPlayback=null}
function describeTextbookScene(s){
 const a=s.a??4,b=s.b??3,phase=s.phase===1;
 if(s.kind==='fraction'){let n=s.numerator,d=s.denominator;if(phase&&s.subdivide){n*=s.subdivide;d*=s.subdivide}if(phase&&s.copies)n*=s.copies;return `同じ全体の1を${d}等分した区画。色の区画は${n}個。`+(s.second_numerator||s.second_denominator?` 比べるもう一つの量は${s.second_numerator||s.numerator}/${s.second_denominator||s.denominator}。`:'')}
 if(s.kind==='cards')return s.texts.map((t,i)=>(i+1)+'番、'+t+(s.selected===i?'。正しい選択肢':'')).join('。');
 if(s.kind==='clock')return `時計。長針は${s.minute/5||12}の位置。短針は${s.hour}の位置。`;
 if(s.kind==='polygon')return `${s.sides}本の直線で囲まれた図。`+(s.equal?`${s.equal}本の辺に等しい長さの印。`:'')+(s.axis?'頂点を通る対称軸を表示。':'');
 if(s.kind==='rectangle')return `四つの角に直角の印。縦${s.height||3}、横${s.width||4}の四角形。`+(s.diagonals?'二本の対角線も表示。':'');
 if(s.kind==='circle')return s.circumference?`円周${s.circumference}cmの円。直径は未知量。`:`円の中心と${s.measure==='diameter'?'中心を通る直径':'中心から円上までの半径'}${a}cm。`;
 if(s.kind==='conservation')return `配置変更前は${s.before}個、変更後は${s.after}個の丸。`;
 if(s.kind==='partwhole')return `テープの全体は${s.total}、分かる部分は${s.part}。もう一つの部分は未知量。`;
 if(s.kind==='distribution')return `全体${s.total}個。一つ分または分ける人数は${s.divisor}。`;
 if(s.kind==='ruler')return `等間隔の目盛り。左端${s.start??a}、一間隔${s.step||1}、${b}区間。単位${s.unit||''}。`;
 if(s.kind==='numberline')return `数直線は${s.start}から${s.end}。丸めた値は${s.target}。`;
 if(s.kind==='bar')return `棒グラフ。棒の値は${s.values.join('、')}。共通の軸で0から始まる。`;
 if(s.kind==='line'||s.kind==='multiline')return `1時、2時、3時の値は順に${s.values.join('、')}。`+(s.kind==='multiline'?`別系列は${a}、${a+1}、${a+2}。`:'');
 if(s.kind==='dots')return `小さい順に並べた記録${s.values.join('、')}。`;
 if(s.kind==='dotplot')return `値1の位置に${a}個、値2の位置に${b}個の点。`;
 if(s.kind==='histogram')return `記録${s.values.join('、')}を、10以上20未満と20以上30未満の階級に分けた図。`;
 if(s.kind==='percent')return `帯全体が100%。色の境界は${s.percent}%。`;
 if(s.kind==='relation'||s.kind==='table'||s.kind==='place')return s.table?s.table.map(r=>r.join('、')).join('。'):`対応する二つの量。一つの値1、2、${b}に、${a}、${2*a}、${a*b}が対応。`;
 if(s.kind==='two-table')return `二つの観点の表。赤は小${a}、大${b}。青は小2、大3。赤の合計は未知量。`;
 const names={groups:`一つ分${a}、${b}組の図`,pictograph:`上に${a}個の丸、下に${b}個の丸`,
  bars:`上が${a}、下が${b}の量の図`,length:`同じ始点の棒。上が${a}、下が${b}`,capacity:`同じ容器に換算した杯数。上${a}、下${b}`,
  ratio:`基準側の区画${a}個、比べる側の区画${b}個`,symmetry:`縦の対称軸の両側に対応する点`,
  coordinate:`横${a}、縦${b}の格子上の点`,position:`左から${a}番目の点を強調し、その右に${b}個`,
  abacus:`梁に付く五珠1個、一珠${a}個`,net:'六枚の正方形を十字形につないだ展開図',
  lines:s.relation==='parallel'?'平行な二直線':'直角に交わる二直線',solid:'直方体。隠れた辺を破線で表示',
  prism:`${s.sides||3}角形の平行で合同な底面二枚と側面`,cylinder:'二枚の円の底面と曲面からなる柱体',
  sphere:'球。中心を通る切断を円として表示',angle:`直角${a}個分の開き`,
  area:s.note||`同じ正方形を${Math.min(a,12)}列、${Math.min(b,10)}段並べた図`,
  parallelogram:'二組の向かい合う辺が平行な四角形',rhombus:'四辺が等しい四角形',
  'right-triangle':'一つの角が直角の三角形',trapezoid:'一組の向かい合う辺だけが平行な四角形',
  'split-square':'四角形を対角線で二つの三角形に分ける図',congruent:'対応辺と角が等しい二つの三角形',
  scaled:'元の図と同じ角を持つ拡大図の模式図',cases:`最初の選び方${a}通りから、次の選び方${s.ordered?a-1:b}通りへ分かれる枝`};
 if(s.kind==='calculation'){const expr=n=>n.kind==='value'?n.text:'('+n.children.map(expr).join(n.symbol)+')';return expr(s)+'＝'+s.result}
 return s.kind==='value'?s.text:names[s.kind]||'図の条件を確認します';
}
function drawTextbookScene(scene, host, topic){
 host.classList.remove('measurement-board');
 if(topic==='tb-me2-length-unit'&&scene.kind==='length')scene={kind:'measurement-ruler',start_mm:0,end_mm:10*scene.a,given:`${scene.a}cm`,phase:scene.phase};
 if(drawMeasurementScene(scene,host))return;
 const ns='http://www.w3.org/2000/svg',ink='#183334',green='#176659',blue='#294d77',gold='#b76a1d';
 host.replaceChildren();
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 640 320');svg.setAttribute('role','img');
 const description=mathSpokenText(describeTextbookScene(scene));svg.setAttribute('aria-label',description);
 const desc=document.createElementNS(ns,'desc');desc.textContent=description;svg.append(desc);
 const e=(tag,attrs,text)=>{const node=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))node.setAttribute(k,String(v));if(text!==undefined)node.textContent=String(text);svg.append(node);return node};
 const line=(x1,y1,x2,y2,color=ink,dash='')=>e('line',{x1,y1,x2,y2,stroke:color,'stroke-width':3,'stroke-dasharray':dash});
 const text=(x,y,t,size=20,color=ink)=>drawMathSVGText(svg,x,y,t,size,color);
 const rect=(x,y,w,h,fill='none',stroke=ink)=>e('rect',{x,y,width:w,height:h,fill,stroke,'stroke-width':2,rx:3});
 const circle=(x,y,r,fill=green)=>e('circle',{cx:x,cy:y,r,fill});
 const a=scene.a??4,b=scene.b??3,phase=scene.phase===1;
 const polygon=(points,fill='#e7f0e9')=>e('polygon',{points:points.map(p=>p.join(',')).join(' '),fill,stroke:ink,'stroke-width':3});
 const table=(rows)=>{const cols=Math.max(...rows.map(r=>r.length)),w=540/cols,h=Math.min(52,250/rows.length);rows.forEach((row,i)=>row.forEach((v,j)=>{rect(50+j*w,25+i*h,w,h,i===0?'#e7f0e9':'white');text(50+(j+.5)*w,25+i*h+h*.67,v,18)}))};
 const bars=()=>{const max=Math.max(a,b,1);[a,b].forEach((v,i)=>{rect(70,65+i*95,470*v/max,45,i?blue:green);text(45,96+i*95,i?'下':'上',18);text(70+235*v/max,96+i*95,v,22,'white')});if(phase)line(70,35,70,250,gold)};
 const kind=scene.kind;
 if(kind==='cards'){
  // HTML preserves wrapping and keyboard/browser zoom for verbal choices.
  const list=document.createElement('ol');list.className='diagram-choices';
  (scene.texts||[]).forEach((value,i)=>{const li=document.createElement('li');renderMathText(li,value);if(scene.selected===i){li.className='selected-reason';li.append(document.createTextNode(' ✓'))}list.append(li)});host.append(list);return;
 }
 if(kind==='value'){text(320,155,scene.text,42);host.append(svg);return}
 if(kind==='calculation'){
  const expression=n=>n.kind==='value'?n.text:'('+n.children.map(expression).join(' '+n.symbol+' ')+')';
  const terms=scene.children.map(expression);const small=terms.join('').length>24?16:24;
  terms.forEach((t,i)=>{const x=155+i*330;rect(x-135,40,270,70,'#eef5ef');text(x,85,t,small);line(x,112,320,195,green)});
  text(320,88,scene.symbol,24,gold);rect(180,205,280,75,'#e7f0e9');text(320,253,'＝ '+scene.result,30);host.append(svg);return;
 }
 if(kind==='fraction'){
  let n=scene.numerator,d=scene.denominator;
  if(phase&&scene.subdivide){n*=scene.subdivide;d*=scene.subdivide}
  if(phase&&scene.copies)n*=scene.copies;
  if(!(Number.isInteger(n)&&Number.isInteger(d)&&n>=0&&d>=1&&d<=120)){text(320,160,'単位と個数を確認します');host.append(svg);return}
  const wholes=Math.max(1,Math.ceil(n/d)),cols=wholes>5?2:1,rows=Math.ceil(wholes/cols),w=cols===2?240:500,h=Math.min(36,190/rows);
  for(let j=0;j<wholes;j++){const x=70+(j%cols)*260,y=35+Math.floor(j/cols)*(h+9);for(let i=0;i<d;i++)rect(x+i*w/d,y,w/d,h,j*d+i<n?'#bfe0cf':'white');if(phase)line(x,y+h/2,x+w,y+h/2,gold,'5 4')}
  text(320,295,`全体の1を${d}等分。色の部分は${n}個分。`,18);
  if(scene.second_numerator||scene.second_denominator)text(320,258,`比べる量：${scene.second_numerator||n}/${scene.second_denominator||d}`,18,blue);
 }
 else if(kind==='groups'||kind==='pictograph'){
  if(kind==='groups'){
   const rows=Math.min(b,12),cols=Math.min(a,16),sx=Math.min(33,510/cols),sy=Math.min(27,220/rows);
   for(let j=0;j<rows;j++){if(phase)rect(52,20+j*sy,cols*sx+15,sy,'#e7f0e9',gold);for(let i=0;i<cols;i++)circle(70+i*sx,32+j*sy,Math.min(8,sy*.25))}
   text(320,290,`一つ分 ${a} ${scene.unit||''}、${b}組`,20);
  }else{[a,b].forEach((n,j)=>{for(let i=0;i<n;i++)circle(70+i*45,85+j*100,13,j?blue:green);text(45,90+j*100,j?'下':'上',18)});if(phase)line(58,47,58,234,gold)}
 }
 else if(kind==='bars'||kind==='length'||kind==='capacity')bars();
 else if(kind==='partwhole'){
  const w=500*scene.part/scene.total;rect(70,100,w,65,'#bfe0cf');rect(70+w,100,500-w,65,'#e7f0e9');text(70+w/2,140,scene.part,24);text(70+w+(500-w)/2,140,'？',24);line(70,65,570,65);text(320,48,'全体 '+scene.total,24);if(phase)text(320,250,'全体 − 分かっている部分',24,gold);
 }
 else if(kind==='distribution'){
  const count=Math.min(scene.total,108);for(let i=0;i<count;i++)circle(60+(i%18)*30,45+Math.floor(i/18)*27,7);text(320,240,`全部 ${scene.total}、分ける単位 ${scene.divisor}`,21);if(phase)text(320,290,'全体 ÷ 一つ分（または人数）',22,gold);
 }
 else if(kind==='ratio'){
  const w=480/Math.max(a,b,1);[a,b].forEach((n,j)=>{for(let i=0;i<n;i++)rect(90+i*w,60+j*105,w,48,j?'#b8cde2':'#bfe0cf');text(53,91+j*105,j?'比べる':'基準',16);text(330,135+j*105,n+'個分',19)});if(phase){line(90,32,90+w,32,gold);text(90+w/2,25,'1',19,gold)}
 }
 else if(kind==='place'){
  table(scene.table||[['百','十','一'],[a,b,0]]);text(320,225,scene.note||'となりの大きい位は、10個分',20);
  if(phase){line(440,185,225,185,gold);text(320,172,'10個 ⇢ 1個',22,gold)}
 }
 else if(kind==='relation'||kind==='table')table(scene.table||(kind==='relation'?[['個数','対応する量'],[1,a],[2,2*a],[b,a*b]]:[['種類','個数'],['赤',a],['青',b]]));
 else if(kind==='two-table')table([['種類','小','大','合計'],['赤',a,b,'？'],['青',2,3,5]]);
 else if(['bar','line','multiline','histogram'].includes(kind)){
  const values=scene.values||[a,b],isLine=kind==='line'||kind==='multiline',step=scene.step||1;
  const max=Math.max(...values,1),top=Math.ceil(max/step)*step;
  line(65,255,595,255);line(65,255,65,25);
  const ticks=Math.min(10,Math.ceil(top/step));for(let i=0;i<=ticks;i++){const value=top*i/ticks,y=255-210*i/ticks;line(58,y,595,y,'#d5dfd9');text(31,y+6,Number(value.toFixed(2)),14)}
  const points=values.map((v,i)=>[110+i*440/Math.max(values.length-1,1),255-210*v/top]);
  if(isLine){points.forEach(([x,y],i)=>{if(i)line(...points[i-1],x,y,green);circle(x,y,6);text(x,287,(i+1)+'時',18);if(phase){line(x,y,x,255,gold,'4 4');line(65,y,x,y,gold,'4 4')}});
   if(kind==='multiline'){const other=[a,a+1,a+2];other.forEach((v,i)=>{const x=points[i][0],y=255-210*v/top;circle(x,y,5,blue);if(i)line(points[i-1][0],255-210*other[i-1]/top,x,y,blue)})}
  }else if(kind==='histogram'){
   // Half-open bins: 10<=x<20, 20<=x<30; heights are frequencies.
   host.replaceChildren();svg.replaceChildren(desc);line(80,255,570,255);line(80,255,80,30);
   const counts=[values.filter(v=>v>=10&&v<20).length,values.filter(v=>v>=20&&v<30).length];counts.forEach((n,i)=>{rect(100+i*180,255-70*n,180,70*n,'#bfe0cf');text(190+i*180,285,i?'20以上30未満':'10以上20未満',17);text(190+i*180,245-70*n,n,22)});
   text(320,30,'記録：'+values.join('、'),18);
  }else values.forEach((v,i)=>{const x=95+i*480/values.length,w=Math.min(95,360/values.length);rect(x,255-210*v/top,w,210*v/top,i?blue:green);text(x+w/2,285,values.length===2?(i?'青':'赤'):'棒',18);if(phase)text(x+w/2,245-210*v/top,v,20)});
 }
 else if(kind==='percent'){
  const pc=scene.percent;rect(65,85,510,65,'white');rect(65,85,510*pc/100,65,'#bfe0cf');for(let i=0;i<=10;i++){line(65+i*51,150,65+i*51,165);text(65+i*51,193,i*10,16)}text(320,245,'全体100%',22);if(phase)text(65+510*pc/200,120,pc+'%',24);
 }
 else if(kind==='dots'){
  const vals=[...(scene.values||[a,a+b,a+2*b])].sort((x,y)=>x-y),spacing=Math.min(80,510/vals.length);
  vals.forEach((v,i)=>{const x=70+i*spacing;circle(x,125,24,phase&&i===Math.floor(vals.length/2)?gold:green);text(x,132,v,20,'white');text(x,200,(i+1)+'番',18)});text(320,265,'小さい順に並べた記録',22);
 }
 else if(kind==='dotplot'){
  line(100,260,530,260);[a,b].forEach((n,j)=>{for(let i=0;i<n;i++)circle(200+j*210,242-i*22,8,j?blue:green);text(200+j*210,290,j+1,22)});text(320,28,'値ごとの点の数＝度数',20);
 }
 else if(kind==='cases'){
  const first=scene.ordered?a:a,second=scene.ordered?a-1:b;circle(65,155,8);
  for(let i=0;i<Math.min(first,9);i++){const y=30+i*250/Math.max(first-1,1);line(65,155,235,y,green);text(257,y+5,'選択'+(i+1),16);if(phase)for(let j=0;j<Math.min(second,8);j++){const endY=y+(j-(second-1)/2)*11;line(290,y,505,endY,blue);circle(505,endY,3,blue)}}text(320,310,`最初${first}通り、次${second}通り`,20);
 }
 else if(kind==='clock'){
  const cx=320,cy=155,r=120;circle(cx,cy,r,'white');e('circle',{cx,cy,r,fill:'none',stroke:ink,'stroke-width':3});for(let i=1;i<=12;i++){const angle=i*Math.PI/6-Math.PI/2;text(cx+99*Math.cos(angle),cy+99*Math.sin(angle)+7,i,21)}
  const hour=(scene.hour%12+scene.minute/60)*Math.PI/6-Math.PI/2,minute=scene.minute*Math.PI/30-Math.PI/2;line(cx,cy,cx+65*Math.cos(hour),cy+65*Math.sin(hour),green);line(cx,cy,cx+90*Math.cos(minute),cy+90*Math.sin(minute),blue);circle(cx,cy,6);if(phase){text(85,110,'短針：時',20,green);text(85,170,'長針：分',20,blue)}
 }
 else if(kind==='ruler'){
  line(60,175,580,175);for(let i=0;i<=b;i++){const x=60+520*i/b;line(x,157,x,190);text(x,220,(scene.start??a)+i*(scene.step||1),20)}rect(60,80,520,35,'#bfe0cf');text(320,270,scene.unit||'',18);if(phase)text(320,50,'始点から終点までの差',22,gold);
 }
 else if(kind==='numberline'){
  line(45,165,600,165);for(let v=scene.start;v<=scene.end;v++){const x=45+555*(v-scene.start)/(scene.end-scene.start);line(x,155,x,175);if(v%5===0)text(x,210,v,18)}circle(322.5,165,7);text(322.5,105,'丸めた値 '+scene.target,22);if(phase){const lo=scene.target-5,hi=scene.target+4;rect(45+555*(lo-scene.start)/(scene.end-scene.start),140,555*(hi-lo)/(scene.end-scene.start),50,'none',gold);text(320,265,'下の5を含み、上の5は次の十へ',19,gold)}
 }
 else if(kind==='area'){
  const w=Math.min(a,12),h=Math.min(b,10),cell=Math.min(40,215/h);for(let j=0;j<h;j++)for(let i=0;i<w;i++)rect(70+i*cell,25+j*cell,cell,cell,phase&&j===0?'#f6dfb7':'#e7f0e9');if(scene.boundary)for(let i=0;i<scene.boundary;i++){rect(70+i*30,135,30,30,'white');polygon([[70+i*30,135],[100+i*30,135],[70+i*30,165]],'#f6dfb7')}text(320,300,scene.note||'同じ大きさの正方形を面積の単位にする',16);
 }
 else if(kind==='abacus'){
  line(80,125,560,125);line(320,25,320,280);polygon([[300,103],[320,88],[340,103],[320,118]],green);
  for(let i=0;i<4;i++){const y=i<a?144+i*25:245+(i-a)*15;polygon([[300,y],[320,y-10],[340,y],[320,y+10]],i<a?green:'#d5dfd9')}
  text(150,75,'五珠 5',22);text(150,205,'一珠 1',22);if(phase)text(475,200,'梁に付く珠を読む',18,gold);
 }
 else if(kind==='coordinate'){
  for(let i=0;i<=10;i++){line(60+i*45,35,60+i*45,265,'#d5dfd9');line(60,265-i*23,510,265-i*23,'#d5dfd9')}circle(60+a*45,265-b*23,8);text(60+a*45,245-b*23,`(${a},${b})`,18);if(phase){line(60+a*45,265-b*23,60+(a+2)*45,265-b*23,gold);circle(60+(a+2)*45,265-b*23,8,gold)}
 }
 else if(kind==='position'){
  const n=a+b;for(let i=0;i<n;i++){const x=35+i*570/Math.max(n-1,1);circle(x,150,10,i===a-1?gold:green);if(phase)text(x,110,i+1,17)}text(320,240,'左からの順序と、全体の個数を区別',20);
 }
 else if(kind==='conservation'){
  for(let i=0;i<scene.before;i++)circle(100+i*42,90,12);for(let i=0;i<scene.after;i++)circle(55+i*95,220,12);text(40,94,'前',18);text(27,225,'後',18);if(phase)for(let i=0;i<Math.min(scene.before,scene.after);i++)line(100+i*42,104,55+i*95,205,gold,'4 5');
 }
 else if(kind==='symmetry'){
  line(320,30,320,275,ink,'6 6');circle(180,140,9);circle(460,140,9);text(180,115,'A',24);text(460,115,'A′',24);if(phase){line(180,140,460,140,gold);text(250,175,a+'cm',21);text(390,175,a+'cm',21)}
 }
 else if(['solid','prism','cylinder','sphere'].includes(kind)){
  if(kind==='sphere'){e('circle',{cx:320,cy:145,r:100,fill:'#e7f0e9',stroke:ink,'stroke-width':3});e('ellipse',{cx:320,cy:145,rx:100,ry:25,fill:'none',stroke:blue,'stroke-dasharray':'5 5'});circle(320,145,4);if(phase)line(320,145,420,145,gold)}
  else if(kind==='cylinder'){rect(205,85,230,150,'#e7f0e9');[85,235].forEach(y=>e('ellipse',{cx:320,cy:y,rx:115,ry:32,fill:'#e7f0e9',stroke:ink,'stroke-width':3}));}
  else if(kind==='prism'){
   const n=scene.sides||3,base=Array.from({length:n},(_,i)=>[240+85*Math.cos(i*2*Math.PI/n),215+45*Math.sin(i*2*Math.PI/n)]),top=base.map(([x,y])=>[x+90,y-130]);polygon(base);base.forEach(([x,y],i)=>line(x,y,...top[i],ink,i>n/2?'5 5':''));polygon(top);text(320,305,`${n}角形の底面に、${n}枚の側面`,20);
  }else{
   polygon([[175,115],[385,115],[385,255],[175,255]]);polygon([[175,115],[245,55],[455,55],[385,115]]);polygon([[385,115],[455,55],[455,195],[385,255]]);line(175,255,245,195,ink,'5 5');line(245,55,245,195,ink,'5 5');line(245,195,455,195,ink,'5 5');if(phase){text(320,292,scene.note||'底面と高さ／面と辺を対応させる',16,gold)}
  }
 }
 else if(kind==='net'){
  [[1,0],[0,1],[1,1],[2,1],[3,1],[1,2]].forEach(([x,y],i)=>{rect(160+x*65,40+y*65,65,65,phase?'#bfe0cf':'#e7f0e9');text(192+x*65,80+y*65,i+1,22)});
 }
 else if(kind==='lines'){
  if(scene.relation==='parallel'){line(100,100,540,100);line(100,210,540,210,blue)}else{line(100,155,540,155);line(320,45,320,270,blue);if(phase){rect(320,130,25,25);text(370,120,'90°',20,gold)}}
 }
 else if(kind==='circle'||kind==='angle'){
  if(kind==='circle'){e('circle',{cx:320,cy:145,r:105,fill:'#e7f0e9',stroke:ink,'stroke-width':3});circle(320,145,5);const diameter=scene.measure==='diameter';line(diameter?215:320,145,425,145,green);text(diameter?320:375,133,scene.circumference?'直径 ？':a+'cm',22);if(scene.circumference)text(320,30,'円周 '+scene.circumference+'cm',22);if(phase){line(215,145,425,145,gold);text(320,290,'直径は半径二つ分',22)}}
  else{const theta=a*Math.PI/2;line(320,170,450,170);line(320,170,320+130*Math.cos(-theta),170+130*Math.sin(-theta),blue);e('path',{d:`M 370 170 A 50 50 0 ${a>2?1:0} 0 ${320+50*Math.cos(-theta)} ${170+50*Math.sin(-theta)}`,fill:'none',stroke:gold,'stroke-width':3});text(320,285,`直角${a}個分`,22)}
 }
 else if(['geometry','polygon','rectangle','parallelogram','rhombus','split-square','congruent','scaled','right-triangle','trapezoid'].includes(kind)){
  if(kind==='polygon'||kind==='geometry'){
   const sides=scene.sides||3,pts=scene.equal===2?[[320,45],[235,235],[405,235]]:Array.from({length:sides},(_,i)=>{const angle=2*Math.PI*i/sides-Math.PI/2;return[320+115*Math.cos(angle),150+115*Math.sin(angle)]});polygon(pts);
   if(scene.center||phase)pts.forEach(([x,y])=>{circle(x,y,5,gold);if(scene.center)line(320,150,x,y,gold)});
   if(scene.equal){text(320,300,scene.equal===3?'三辺が等しい':'二辺が等しい',21);}
   if(scene.axis||phase&&sides===3)line(320,35,320,207,gold,'5 4');
  }else if(kind==='rectangle'||kind==='split-square'){const w=(scene.width||4)*60,h=(scene.height||3)*60;rect(320-w/2,150-h/2,w,h,'#e7f0e9');if(scene.diagonals||kind==='split-square'||phase){line(320-w/2,150-h/2,320+w/2,150+h/2,gold);if(scene.diagonals)line(320+w/2,150-h/2,320-w/2,150+h/2,blue)}}
  else if(kind==='right-triangle'){polygon([[185,70],[185,240],[440,240]]);rect(185,215,25,25);}
  else if(kind==='trapezoid')polygon([[170,230],[470,230],[420,80],[240,80]]);
  else if(kind==='parallelogram'){polygon([[175,220],[400,220],[465,80],[240,80]]);if(scene.diagonals){line(175,220,465,80,gold);line(400,220,240,80,blue)}}
  else if(kind==='rhombus'){polygon([[320,45],[495,150],[320,255],[145,150]]);if(scene.diagonals||phase){line(145,150,495,150,gold);line(320,45,320,255,blue)}}
  else{polygon([[80,225],[225,225],[125,80]]);polygon(kind==='congruent'?[[545,225],[400,225],[500,80]]:[[350,255],[595,255],[425,35]]);text(155,280,kind==='congruent'?'ABC':'元の図',21);text(470,300,kind==='congruent'?'DEF':'拡大図（模式図）',21);if(phase){line(130,200,495,200,gold,'5 5');text(320,30,'対応する辺・角を照合',21)}}
 }
 else text(320,160,'図の条件を確認します',22);
 svg.classList.add('textbook-scene');host.append(svg);
 const readable=document.createElement('p');readable.className='diagram-description';readable.textContent=description;host.append(readable);
 if(phase&&!(window.mathMotionReduced?.() ?? matchMedia('(prefers-reduced-motion: reduce)').matches)){
  [...svg.querySelectorAll('circle,rect,line,polygon,path')].forEach((node,i)=>{
   if(node.tagName==='line'&&!node.getAttribute('stroke-dasharray')){
    const length=Math.hypot(Number(node.getAttribute('x2'))-Number(node.getAttribute('x1')),Number(node.getAttribute('y2'))-Number(node.getAttribute('y1')));
    node.animate([{strokeDasharray:String(length),strokeDashoffset:String(length)},{strokeDasharray:String(length),strokeDashoffset:'0'}],{duration:650,delay:Math.min(i,14)*35,easing:'ease-out'});
   }else node.animate([{opacity:0},{opacity:1}],{duration:450,delay:Math.min(i,14)*35,easing:'ease-out'});
  });
 }
}
function renderTextbookTask(item,host){
 const marker='\n図データ：',index=item.prompt.indexOf(marker);
 if(index<0)return null;
 try{const scene=JSON.parse(item.prompt.slice(index+marker.length));host.hidden=false;host.className='visual-board';drawTextbookScene(scene,host);const question=item.prompt.slice(0,index);return scene.kind==='cards'?question.split('\n').filter(s=>!/^\d+：/.test(s)).join('\n'):question}catch{return item.prompt}
}
function renderTextbookLesson(lesson,host){
 stopTextbookPlayback();host.replaceChildren();host.hidden=!lesson;if(!lesson)return;
 let index=0;const caption=document.createElement('p'),drawing=document.createElement('div'),controls=document.createElement('div');
 caption.setAttribute('aria-live','polite');caption.className='lesson-caption';controls.className='actions lesson-controls';host.className='visual-board textbook-lesson';
 const create=(name,fn)=>{const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=name;b.onclick=fn;controls.append(b);return b};
 const prev=create('戻る',()=>{stopTextbookPlayback();index=Math.max(0,index-1);show()}),next=create('進む',()=>{stopTextbookPlayback();index=Math.min(lesson.frames.length-1,index+1);show()});
 const play=create('再生',()=>{if(textbookPlayback!==null){stopTextbookPlayback();show();return}if((window.mathMotionReduced?.() ?? matchMedia('(prefers-reduced-motion: reduce)').matches)){index=(index+1)%lesson.frames.length;show();return}index=0;show();textbookPlayback=setInterval(()=>{if(index>=lesson.frames.length-1){stopTextbookPlayback();show();return}index++;show()},3500);show()});
 const restart=create('最初から',()=>{stopTextbookPlayback();index=0;show()});
 function show(){const frame=lesson.frames[index];renderMathText(caption,frame.caption);caption.prepend(document.createTextNode(`${index+1} / ${lesson.frames.length}　`));drawTextbookScene(frame.scene,drawing,lesson.topic);prev.disabled=index===0;next.disabled=index===lesson.frames.length-1;play.textContent=textbookPlayback!==null?'停止':'再生'}
 host.append(drawing,caption,controls);show();
}
// Shared fraction typography for prose, questions and SVG diagrams. Data and
// exact response values remain unchanged; build nodes instead of HTML strings.
function mathTokens(value){
 const text=String(value),parts=[];let end=0;
 for(const m of text.matchAll(/(?<![\d./])(\d+)\s*\/\s*(\d+)(?![\d./])/g)){
  if(m.index>end)parts.push({text:text.slice(end,m.index)});
  parts.push({n:m[1],d:m[2]});end=m.index+m[0].length;
 }
 if(end<text.length)parts.push({text:text.slice(end)});return parts;
}
function mathSpokenText(value){return mathTokens(value).map(t=>t.n!==undefined?`${t.d}分の${t.n}`:t.text).join('');}
function renderMathText(host,value){
 host.replaceChildren();
 for(const t of mathTokens(value)){
  if(t.n===undefined){host.append(document.createTextNode(t.text));continue;}
  const f=document.createElement('span');f.className='math-fraction';f.setAttribute('role','img');f.setAttribute('aria-label',`${t.d}分の${t.n}`);
  for(const [cls,number]of [['fraction-numerator',t.n],['fraction-denominator',t.d]]){const s=document.createElement('span');s.className=cls;s.textContent=number;s.setAttribute('aria-hidden','true');f.append(s);}
  host.append(f);
 }
}
function drawMathSVGText(svg,x,y,value,size=20,color='#183334'){
 const ns='http://www.w3.org/2000/svg',tokens=mathTokens(value);
 const context=drawMathSVGText.context||(drawMathSVGText.context=document.createElement('canvas').getContext('2d'));
 context.font=`${size}px ${getComputedStyle(document.body).fontFamily}`;
 const width=t=>t.n===undefined?context.measureText(t.text).width:Math.max(context.measureText(t.n).width,context.measureText(t.d).width)+size*.5;
 let cursor=x-tokens.reduce((sum,t)=>sum+width(t),0)/2;
 const group=document.createElementNS(ns,'g');group.setAttribute('aria-hidden','true');svg.append(group);
 const text=(at,baseline,value,anchor='start')=>{const node=document.createElementNS(ns,'text');for(const[k,v]of Object.entries({x:at,y:baseline,'font-size':size,fill:color,'text-anchor':anchor}))node.setAttribute(k,String(v));node.textContent=value;group.append(node);};
 for(const t of tokens){const w=width(t);if(t.n===undefined)text(cursor,y,t.text);else{
  const center=cursor+w/2,bar=y-size*.27;
  text(center,bar-size*.25,t.n,'middle');text(center,bar+size*.95,t.d,'middle');
  const line=document.createElementNS(ns,'line');for(const[k,v]of Object.entries({x1:cursor+size*.08,x2:cursor+w-size*.08,y1:bar,y2:bar,stroke:color,'stroke-width':Math.max(1.2,size*.065)}))line.setAttribute(k,String(v));line.classList.add('fraction-bar');group.append(line);
 }cursor+=w;}
 return group;
}
