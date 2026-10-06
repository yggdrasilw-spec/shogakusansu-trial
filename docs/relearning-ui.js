/* Shared presentation; learningTransport selects Python or browser execution. */
let state, busy=false, screen='home', domain=0, selectedNode=null, choice=null, rationalMode='fraction', draftItem=null, drafts={};
const $=id=>document.getElementById(id);
const names={new:'これから',trying:'やってみた',checked:'別の問題で、2問続けてできた！',review:'そろそろ、おさらい'};
const marks={new:'○',trying:'●',checked:'✓',review:'↻'};
const domains=['数・たしひき','かけわり','小数・分数','形・大きさ','割合・変わり方','表・グラフ','考え方・式'];
const domainIcons=['＋','×','½','△','％','▥','＝'];
const domainColors=['#e8f2ff','#fff1dc','#eeeaff','#e3f5ed','#ffe9ef','#e2f5f6','#f2ecdf'];
const easyTitles={
 'm-partwhole':'全部と、その一部','m-equalgroups':'同じ数ずつ','m-equivalence':'表し方がちがっても同じ',
 'm-relative':'もとの数の何倍？','m-covariation':'いっしょに変わる数','m-model':'お話を式にしよう',
 'm-reference-unit':'もとにする「1」','m-corresponding-pairs':'組になる数をさがそう',
 'me1-indirect-compare':'ひもなどを使ってくらべよう','me1-arbitrary-unit':'いくつ分の長さかな？',
 'me1-length-compare':'どれだけ長い？','me1-area-compare':'広さをますでくらべよう',
 'me1-capacity-compare':'同じ入れ物でくらべよう','me1-quantity-attribute':'何をはかる？',
 'x-all-model':'式が合うお話','x-all-communicate':'「どうして？」を伝えよう'
};
function friendly(text){return String(text)
 .replaceAll('まず、図の量と問いを対応させます。','図を見て、わかっている数をさがそう。')
 .replaceAll('条件を一つずつ照合し、選択肢を根拠と結び付けます。','ひとつずつ、どれが合うか見てみよう。')
 .replaceAll('辺・角・頂点の条件と、対応する場所を確かめます。','辺や角を見て、同じところをさがそう。')
 .replaceAll('左端は含み、右端は含まない階級に記録を振り分けます。','左の数以上、右の数より小さいグループに分けよう。')
 .replaceAll('記録を小さい順に並べ、中央・度数・範囲を問いに合わせて見ます。','小さい順に並べて、真ん中や数の広がりを見よう。')
 .replaceAll('一つの印を一個へ対応させて数えます。','印をひとつずつ数えよう。')
 .replaceAll('最初の選び方ごとに枝を分け、次の選び方を対応させます。','ひとつえらんだら、次にえらべるものをさがそう。')
 .replaceAll('区画を細かくしても色の量は変わりません。区画の個数と新しい分母を対応させます。','細かく分けても、色の量は同じだね。いくつに分かれたかな？')
 .replaceAll('同じ一つ分を繰り返して集めます。分母は同じ単位のまま、個数が増えます。','同じ大きさを集めよう。分母はそのまま、分子が増えるよ。')
 .replaceAll('被除数','わられる数').replaceAll('除数','わる数').replaceAll('被乗数','かけられる数').replaceAll('乗数','かける数').replaceAll('乗法','かけ算').replaceAll('除法','わり算').replaceAll('基準量','もとにする量').replaceAll('根拠','理由')
 .replaceAll('足し算','たし算').replaceAll('引き算','ひき算').replaceAll('異なる','ちがう').replaceAll('等しく分ける','同じ数ずつ分ける').replaceAll('大小','大きさくらべ').replaceAll('個数','数').replaceAll('を求めてください。','はいくつ？').replaceAll('を求めよ。','はいくつ？').replaceAll('入力してください。','入力してください。').replaceAll('比較する','くらべる');}
const label=id=>{const t=state.topics.find(t=>t.id===id);return visualObjectText(easyTitles[t?.owner]||friendly(t?.label||id),id);};
function element(tag,text,cls){const e=document.createElement(tag);renderMathText(e,text);if(cls)e.className=cls;return e;}
function button(text,fn,cls='secondary'){const e=element('button',text,cls);e.type='button';e.onclick=fn;return e;}
function family(t){const o=t.owner;if(o.startsWith('f'))return 2;if(o.startsWith('me')||o.startsWith('g'))return 3;if(o.startsWith('r'))return 4;if(o.startsWith('d'))return 5;if(o.startsWith('x')||o.startsWith('m-'))return 6;if(o.startsWith('i')||o.startsWith('o')&&!/^o[12]-(add|sub|compose|three)/.test(o))return 1;return 0;}
function openDialog(id){if(!$(id).open)$(id).showModal();}
function closeSupport(){stopTextbookPlayback();$('support-dialog').close();}
function navigate(next){if(state?.pending)return;screen=next;$('feedback').hidden=true;render();window.scrollTo(0,0);}
async function act(action,data={}){
 if(busy)return;busy=true;const locked=[...document.querySelectorAll('button')].map(b=>[b,b.disabled]);locked.forEach(([b])=>b.disabled=true);$('error').hidden=true;
 try{const result=await learningTransport.action(action,{...data,revision:state.revision});state=result;if(action==='start'||action==='recommended'){draftItem=null;drafts={};}
  if(action==='support'){
   const s=result.support, item=data.completed?result.feedback.item:result.pending.item;
   $('support-title').textContent=data.completed?'前の問題の答えと考え方':s.answer===null?'ヒント':'答えと考え方';
   if(s.motion){
    $('support').hidden=true;window.meaningMotion.render(s.motion,$('textbook-lesson'));
   }else{
    renderMathText($('support'),friendly(visualObjectText(s.guidance,data.completed?result.feedback.topic:result.pending.topic))+(s.answer!==null?'\n答え：'+answerLabel(s.answer,item):'')+(!s.storyboard&&s.worked_steps?.length?'\n\n'+s.worked_steps.map(friendly).join('\n'):''));
    $('support').hidden=false;const lesson=s.storyboard?structuredClone(s.storyboard):null;
    if(lesson)lesson.frames.forEach(f=>f.caption=friendly(f.caption));renderTextbookLesson(lesson,$('textbook-lesson'));
   }
   openDialog('support-dialog');
  }
  else{closeSupport();$('node-dialog').close();render();window.scrollTo(0,0);}
 }catch(e){const messages={v2_event_budget_exceeded:'回答記録が10,000件に達しました。記録は残っています。メニューの「学習記録の書き出し・復元」から保存できます。',browser_pack_unavailable:'教材を読み込めませんでした。通信を確認して、もう一度試してください。学習記録は変えていません。',browser_pack_invalid:'教材データを確認できませんでした。ページを開き直してください。学習記録は変えていません。',relearning_revision_stale:'別のタブで記録が変わりました。読み直したので、今の問題を確認してください。',relearning_attempt_pending:'今の問題を終えてから、えらぼう。',relearning_no_recommendation:'この学年のおさらいは、また今度。ほかの学年もえらべるよ。',browser_storage_full:'保存場所がいっぱいです。回答はまだ保存されていません。空きを作ってもう一度試してください。',browser_record_corrupt:'保存記録を読み取れません。記録は残っています。「このアプリについて」から書き出せます。',browser_version_stale:'以前の版の記録が残っています。自動では消しません。「このアプリについて」から書き出せます。'};$('error').textContent=messages[e.message]||'うまく保存できなかったよ。もう一度ためしてね。';$('error').hidden=false;if(e.message==='relearning_revision_stale'){draftItem=null;drafts={};state=await learningTransport.state();render();}}
 finally{busy=false;locked.forEach(([b,disabled])=>{if(b.isConnected)b.disabled=disabled;});if(state){for(const id of ['go-home','go-map','go-review'])$(id).disabled=!!state.pending||!!state.feedback?.item&&state.session?.stop!=='paused';if(!state.pending)updateRecommendation();}}
}
function start(topic,mode='diagnostic'){screen='home';act('start',{topic,mode});}
function formatAnswer(a){return typeof a==='object'?a.n+'/'+a.d:String(a);}
function answerLabel(a,item){if(a===null)return '今回は回答なし';const match=[...item.prompt.split('\n図データ：')[0].matchAll(/(?:^|\n)(\d+)[：:]\s*([^\n]+)/g)].find(m=>Number(m[1])===a);return match?friendly(match[2]):formatAnswer(a);}
function render(){
 const p=state.pending,s=state.session;
 const completed=state.session?.stop!=='paused'&&state.feedback?.item;
 if(completed){renderResult();return;}
 $('result-screen').hidden=true;
 document.body.classList.toggle('learning',!!p);
 for(const [id,key]of [['home','home'],['map-screen','map'],['review-screen','review']])$(id).hidden=!!p||screen!==key;
 $('attempt').hidden=!p;
 for(const [id,key]of [['go-home','home'],['go-map','map'],['go-review','review']]){$(id).classList.toggle('active',!p&&screen===key);$(id).disabled=!!p;}
 $('due-count').textContent=state.due.length||'';
 $('feedback').hidden=true;
 if(p){renderAttempt(p,s);return;}
 stopTextbookPlayback();
 if(screen==='map'){renderMap();return;}
 if(screen==='review'){renderReviews();return;}
 if(s?.stop){document.querySelector('#home details').open=false;if(s.stop==='paused')$('feedback').hidden=true;}
 const picks={'as-add-transfer':'くり上がりを確かめる','s2-kuku':'九九を確かめる','b-basic':'わり算をやり直す','c-add':'分数をやり直す','s5-part':'割合を確かめる'};const available=Object.entries(picks).filter(([t])=>state.topics.some(row=>row.id===t));if(!available.length)available.push(...state.topics.slice(0,5).map(t=>[t.id,friendly(t.label)]));$('entries').replaceChildren(...available.map(([t,text])=>topicButton(t,text,()=>start(t))));renderTopics();updateRecommendation();renderTrialCatalog();
 $('summary').hidden=!s?.stop;if(s?.stop)renderSummary();
}
function topicButton(id,text,fn){const t=state.topics.find(t=>t.id===id),f=family(t),b=button(domainIcons[f]+' '+text,fn,'topic-pick');b.style.setProperty('--topic-color',domainColors[f]);return b;}
function renderResult(){
 const f=state.feedback;document.body.classList.remove('learning');
 for(const id of ['home','map-screen','review-screen','attempt','feedback'])$(id).hidden=true;
 $('result-screen').hidden=false;
 for(const id of ['go-home','go-map','go-review'])$(id).disabled=true;
 const messages={correct:'正解です！',incorrect:'ここを、一緒に確かめましょう',form_unmet:'大きさは合っています。答えの形を確かめましょう',no_response:'考え方から確かめられます',invalid_response:'答えの入れ方を確かめましょう'};
 $('result-title').textContent=messages[f.status]||'回答を記録しました';
 $('result-mark').textContent=f.status==='correct'?'✓':'💡';
 $('result-screen').classList.toggle('correct',f.status==='correct');
 renderMathText($('result-question'),friendly(visualObjectText(f.item.prompt.split('\n図データ：')[0],f.topic)));
 renderVisualTask(f.item,$('result-visual'),f.topic);
 renderMathText($('result-response'),'自分の回答：'+answerLabel(f.response,f.item));
 $('result-evidence').textContent=f.supported?'ヒント・答えを使って取り組みました。':f.recall?'前の問題を思い出す練習を記録しました。':'今回の回答を保存しました。';
 $('next-question').textContent=state.pending?'次の問題へ →':'今回の振り返りへ →';
 $('finish-result').hidden=!state.pending;
 $('next-question').focus();
}
function renderSummary(){
 const box=$('summary'),rows=state.session_summary||[];box.parentElement.prepend(box);box.replaceChildren(element('h2',state.session.stop==='paused'?'取り組みを保存しました':'今日のステップ、おつかれさまでした！'));
 const list=element('div','','summary-records');for(const row of rows){const card=element('div','','summary-record');card.append(element('strong',label(row.topic)),element('p',`${row.attempts}問に取り組みました`));if(row.independent_correct)card.append(element('p',`自力で正答：${row.independent_correct}問`));if(row.confirmed)card.append(element('p','✓ 別の問題で自力2連続正答','checked'));if(row.supported)card.append(element('p',`ヒント・答えを使った取り組み：${row.supported}問`));const review=state.reviews[row.topic];if(review)card.append(element('p','次のおさらい：'+new Date(review.due_at).toLocaleDateString('ja-JP',{month:'short',day:'numeric'})));list.append(card);}box.append(list);
 if(!rows.length)box.append(element('p','問題を選んだところまで保存しました。'));
 box.append(button('次の一歩を見る →',()=>navigate('map')));
}
function updateRecommendation(){const g=$('auto-grade').value;const t=state.next_topics.find(id=>!g||String(state.topics.find(t=>t.id===id).grade)===g);renderMathText($('recommended-label'),t?'まずは「'+label(t)+'」': '今はおさらい待ち。マップからもえらべるよ。');$('start-recommended').disabled=!t;}
function renderTopics(){const old=$('topic').value,g=$('grade').value;const groups=new Map();for(const t of state.topics.filter(t=>!g||String(t.grade)===g)){const key=t.grade?'小'+t.grade+'のめやす':'考え方';if(!groups.has(key)){const group=document.createElement('optgroup');group.label=key;groups.set(key,group);}const option=element('option',label(t.id));option.value=t.id;groups.get(key).append(option);}$('topic').replaceChildren(...groups.values());if([...$('topic').options].some(o=>o.value===old))$('topic').value=old;}
function renderAttempt(p,s){
 $('mode').textContent=s.automatic?'おまかせコース':p.mode==='recall'?'おさらい':'やってみよう';renderMathText($('topic-title'),label(p.topic));$('counter').textContent=`${s.count+1}問目 / ${s.automatic?6:state.max_questions}問まで`;$('bar').style.width=(s.count/(s.automatic?6:state.max_questions)*100)+'%';
 if(draftItem!==p.item_id){draftItem=p.item_id;drafts={};choice=null;rationalMode='fraction';}const raw=p.item.prompt.split('\n図データ：')[0];const listed=[...raw.matchAll(/\n(\d+)[：:]\s*([^\n]+)/g)].map(m=>({value:Number(m[1]),text:m[2]}));const options=listed.length>=2?listed:[];
 const question=renderVisualTask(p.item,$('visual-task'),p.topic);renderMathText($('question'),friendly(options.length?question.replace(/\n正しいものの番号を入力してください。/g,'').replace(/\n\d+[：:][^\n]*/g,''):question));
 document.querySelector('.problem-scroll').classList.toggle('equation',!options.length&&$('visual-task').hidden&&!question.includes('\n')&&/^[\d\s＋+−×÷=＝\/?.-]+$/.test(question));
 $('choice-answers').hidden=!options.length;$('choice-answers').replaceChildren(...options.map(o=>{const b=button(friendly(o.text),()=>{choice=o.value;$('choice-answers').querySelectorAll('button').forEach(x=>{const selected=x===b;x.classList.toggle('selected',selected);x.setAttribute('aria-pressed',String(selected));});$('format').textContent='選んだら「答えを確かめる」';});b.dataset.value=o.value;b.classList.toggle('selected',choice===o.value);b.setAttribute('aria-pressed',String(choice===o.value));return b;}));
 $('answer-fields').hidden=!!options.length;if(options.length){$('answer-fields').replaceChildren();$('format').textContent='答えを選んでください。';}else renderInputs(p.item.response_type==='rational');
 $('reveal').textContent=p.topic.startsWith('tb-')?'答えと図解を見る':'答えと考え方を見る';
 $('steps').replaceChildren(...Array.from({length:s.automatic?6:state.max_questions},(_,i)=>element('span',i<s.count?'✓':String(i+1),i<s.count?'done':i===s.count?'current':'')));
 const f=family(state.topics.find(t=>t.id===p.topic));$('topic-title').style.setProperty('--topic-color',domainColors[f]);$('mode').textContent=domainIcons[f]+' '+$('mode').textContent;
}
function renderInputs(rational){
 const host=$('answer-fields');host.replaceChildren();const fields=rational?(rationalMode==='fraction'?[['n','分子'],['d','分母']]:[['decimal','答え']]):[['value','答え']];
 const stack=rational&&rationalMode==='fraction'?element('div','','fraction-input'):host;
 if(stack!==host){stack.setAttribute('role','group');stack.setAttribute('aria-label','分数の答え。上が分子、下が分母');host.append(stack);}
 for(const [id,text]of fields){const l=element('label',''),i=document.createElement('input');l.append(element('span',text,stack!==host?'fraction-field-label':''));i.id=id;i.type='text';i.inputMode='decimal';i.autocomplete='off';i.required=true;i.value=drafts[id]||'';i.oninput=()=>drafts[id]=i.value;l.append(i);stack.append(l);}
 const policy=state.pending?.item.form_policy;
 if(rational&&(!policy||policy.kind==='value_only'))host.append(button(rationalMode==='fraction'?'小数・整数で入れる':'分数で入れる',()=>{for(const i of host.querySelectorAll('input'))drafts[i.id]=i.value;rationalMode=rationalMode==='fraction'?'decimal':'fraction';renderInputs(true);},'input-switch'));
 $('format').textContent=policy?.kind==='required_denominator'?`分母を${state.pending.item.required_denominator}にして、分子と分母を入力してください。`:policy?.kind==='reduced_fraction'?'これ以上約分できない分数で、分子と分母を入力してください。':rational?(rationalMode==='fraction'?'分数で答えよう。':'小数・整数で答えよう。'):'答えを入力してください。';
 // Keep mobile keyboards closed until the learner taps the answer field.
 if(matchMedia('(min-width:701px)').matches)requestAnimationFrame(()=>host.querySelector('input')?.focus());
}
function connections(){
 const owners=new Map();for(const t of state.topics){if(!owners.has(t.owner))owners.set(t.owner,[]);owners.get(t.owner).push(t.id);}
 const links=[];for(const t of state.topics)for(const q of t.prerequisites)links.push([q,t.id]);
 for(const e of state.connections){const from=owners.get(e.source),to=owners.get(e.target);if(from&&to)links.push([from[0],to[0]]);}
 return [...new Map(links.filter(([a,b])=>a!==b).map(e=>[e.join('|'),e])).values()];
}
function renderMap(){
 renderPath();
 $('domains').replaceChildren(...domains.map((text,i)=>{const b=button(domainIcons[i]+' '+text,()=>{domain=i;renderMap();$('tree-scroll').scrollTop=0;$('tree-scroll').scrollLeft=0;},i===domain?'active':'');b.style.setProperty('--topic-color',domainColors[i]);return b;}));
 const g=$('map-grade').value,topics=state.topics.filter(t=>family(t)===domain&&(!g||String(t.grade)===g));
 const checked=state.topics.filter(t=>t.progress==='checked'||t.progress==='review').length;$('map-count').textContent=checked?`自力2連続正答の記録：${checked}内容`:'まずは、ひとつから';
 const grades=g?[Number(g)]:[1,2,3,4,5,6],col=160,gap=15,row=78,pos={};
 const grouped=grades.map(grade=>topics.filter(t=>t.grade===grade));
 const height=Math.max(160,50+Math.max(...grouped.map(ts=>ts.length))*row),width=grades.length*col;
 const tree=$('tree');tree.replaceChildren();tree.style.width=width+'px';tree.style.height=height+'px';
 for(let c=0;c<grades.length;c++){const head=element('div',grades[c]+'年','tree-grade');head.style.left=c*col+'px';head.style.width=col+'px';tree.append(head);grouped[c].forEach((t,r)=>{pos[t.id]={x:c*col+gap/2,y:45+r*row};});}
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('tree-links');svg.setAttribute('width',width);svg.setAttribute('height',height);
 for(const [a,b]of connections()){if(!pos[a]||!pos[b])continue;const p=pos[a],q=pos[b],path=document.createElementNS(ns,'path');const x1=p.x+col-gap,y1=p.y+30,x2=q.x,y2=q.y+30;
 // Route along column gutters, so a crossing does not look like an extra node connection.
 const gutter=p.x+col-gap/2;path.setAttribute('d',p.x===q.x?`M ${x1} ${y1} H ${gutter} V ${y2} H ${x2+col-gap}`:`M ${x1} ${y1} C ${x1+18} ${y1}, ${x2-18} ${y2}, ${x2} ${y2}`);path.dataset.from=a;path.dataset.to=b;svg.append(path);}
 tree.append(svg);
 for(const t of topics){const b=button('',()=>openNode(t.id),'tree-node '+t.progress);b.dataset.id=t.id;b.style.left=pos[t.id].x+'px';b.style.top=pos[t.id].y+'px';b.style.width=(col-gap)+'px';b.append(element('span',marks[t.progress],'mark'),element('span',label(t.id),'node-label'));b.setAttribute('aria-label',label(t.id)+'、'+names[t.progress]);b.onpointerenter=()=>highlightNode(t.id);b.onfocus=()=>highlightNode(t.id);tree.append(b);}
 if(!topics.length)tree.append(element('p','この学年の内容は、ほかの系統を見てね。','empty'));
}
function renderPath(){
 const host=$('small-path');host.replaceChildren();
 const rows=state.session_summary||[];host.append(element('h2','今日やったこと'));
 host.append(element('p',rows.length?rows.map(r=>label(r.topic)+'・'+r.attempts+'問').join(' / '):'ここから、ひとつずつ始められます。'));
 const next=state.next_topics[0];host.append(element('h2','次におすすめ'));
 if(next){host.append(topicButton(next,label(next),()=>start(next,state.due.includes(next)?'review':'diagnostic')));const weak=state.plan?.remaining||[],t=state.topics.find(t=>t.id===next);const reason=state.due.includes(next)?'おさらいの時期です':weak.includes(next)?'前の取り組みから確かめたい内容です':t.prerequisites.length&&t.prerequisites.every(q=>state.topics.find(x=>x.id===q)?.progress==='checked')?'前に取り組んだ内容の先につながります':t.progress==='trying'?'前に取り組んだ内容を続けられます':'これから取り組める内容です';host.append(element('p',reason,'format'));
 const related=[...new Set(connections().filter(e=>e.includes(next)).flat())].filter(id=>id!==next).slice(0,3);if(related.length){host.append(element('h2','つながる内容'));const list=element('div','','path-relations');list.append(...related.map(id=>topicButton(id,label(id),()=>openNode(id))));host.append(list);}}
 else host.append(element('p','全体マップから、気になる内容を選べます。'));
}
function highlightNode(id){const links=connections(),related=new Set([id,...links.filter(e=>e.includes(id)).flat()]);$('tree').querySelectorAll('.tree-node').forEach(b=>b.classList.toggle('related',related.has(b.dataset.id)));$('tree').querySelectorAll('path').forEach(p=>p.classList.toggle('highlight',p.dataset.from===id||p.dataset.to===id));}
function openNode(id){selectedNode=id;highlightNode(id);const t=state.topics.find(t=>t.id===id);$('node-title').textContent=label(id);$('node-status').textContent=names[t.progress];const host=$('node-relations');host.replaceChildren();const links=connections();for(const [direction,title]of [['before','つながる土台'],['after','この先のつながり']]){const ids=[...new Set(links.filter(([a,b])=>direction==='before'?b===id:a===id).map(([a,b])=>direction==='before'?a:b))];host.append(element('h3',title,'relation-heading'));const list=element('div','','relation-list');list.append(...ids.map(q=>button(label(q),()=>openNode(q))));if(!ids.length)list.append(element('p','マップから、ほかの内容もえらべるよ。','format'));host.append(list);}openDialog('node-dialog');}
function renderReviews(){$('due').replaceChildren(...state.due.map(t=>{const row=element('div','','review-row');row.append(element('span',label(t)),button('やってみる',()=>start(t,'review')));return row;}));if(!state.due.length)$('due').append(element('p','今日のおさらいは、まだないよ。','empty'));$('scheduled').replaceChildren(...Object.entries(state.reviews).filter(([t])=>!state.due.includes(t)).sort((a,b)=>a[1].due_at.localeCompare(b[1].due_at)).map(([t,r])=>{const row=element('div','','scheduled-row');row.append(element('span',label(t)),element('span',new Date(r.due_at).toLocaleDateString('ja-JP',{month:'short',day:'numeric'})));return row;}));}
function normalized(id){return $(id).value.trim().replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0)).replace(/−|－/g,'-').replace(/．/g,'.');}
function integer(id){const raw=normalized(id);if(!/^-?\d+$/.test(raw))throw Error();const n=Number(raw);if(!Number.isSafeInteger(n))throw Error();return n;}
function decimalResponse(){const raw=normalized('decimal');if(!/^-?\d+(\.\d{1,6})?$/.test(raw))throw Error();const parts=raw.split('.'),d=10**(parts[1]?.length||0),n=Number(parts.join(''));if(!Number.isSafeInteger(n))throw Error();return {n,d};}
$('answer-form').onsubmit=e=>{e.preventDefault();try{let response;if(!$('choice-answers').hidden){if(choice===null)throw Error();response=choice;}else if(state.pending.item.response_type==='rational'){response=rationalMode==='decimal'?decimalResponse():{n:integer('n'),d:integer('d')};if(response.d<=0)throw Error();}else response=integer('value');act('submit',{item_id:state.pending.item_id,response});}catch{$('error').textContent= !$('choice-answers').hidden?'答えをひとつ選んでください。':'数字を入力してください。分母は1以上だよ。';$('error').hidden=false;}};
$('start-selected').onclick=()=>start($('topic').value);$('start-recommended').onclick=()=>{screen='home';act('recommended',{grade:$('auto-grade').value?Number($('auto-grade').value):null});};$('auto-grade').onchange=updateRecommendation;$('grade').onchange=renderTopics;$('map-grade').onchange=renderMap;
$('skip').onclick=()=>act('submit',{item_id:state.pending.item_id,response:null});$('hint').onclick=()=>act('support',{kind:'hint'});$('reveal').onclick=()=>act('support',{kind:'answer'});$('pause').onclick=()=>{screen='home';act('pause');};
$('next-question').onclick=()=>act('continue');$('review-answer').onclick=()=>act('support',{kind:'answer',completed:true});
$('finish-result').onclick=()=>{screen='home';act('pause');};
$('go-home').onclick=()=>navigate('home');$('go-map').onclick=$('browse').onclick=()=>navigate('map');$('go-review').onclick=()=>navigate('review');$('close-support').onclick=$('back-question').onclick=closeSupport;$('support-dialog').addEventListener('close',stopTextbookPlayback);$('close-node').onclick=()=>$('node-dialog').close();$('node-start').onclick=()=>start(selectedNode);$('about').onclick=()=>openDialog('about-dialog');$('close-about').onclick=()=>$('about-dialog').close();
learningTransport.state().then(s=>{state=s;render();const topic=new URLSearchParams(location.search).get('topic');if(topic&&state.topics.some(t=>t.id===topic)&&!state.pending){document.querySelector('#home details').open=true;$('topic').value=topic;$('start-selected').focus();}}).catch(e=>{$('error').textContent=e.message==='browser_record_corrupt'?'保存記録を読み取れません。記録は消していません。「このアプリについて」から書き出せます。':e.message==='browser_version_stale'?'以前の版の記録が残っています。自動では消しません。「このアプリについて」から書き出せます。':'読みこめなかったよ。ページを開きなおしてね。';$('error').hidden=false;});
