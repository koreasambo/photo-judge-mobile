/* Human Preference Lab 0.1 — experimental, opt-in. No automated aesthetic AI.
 * All comparison records use a separate key. Existing verdicts and original files are untouched.
 */
(() => {
  'use strict';
  const KEY='photoJudge.tasteLab.v1', LIMIT=5000, $=id=>document.getElementById(id);
  let items=[], votes=[], pair=null, urls=[], skipped=new Set(), shownAt=0, saveError=false;
  const idOf=f=>[f.webkitRelativePath||f.name||'',f.size||0,f.lastModified||0].join('::');
  const pairId=(a,b)=>JSON.stringify([a,b].sort());
  function load(){
    try{
      const d=JSON.parse(localStorage.getItem(KEY)||'null');
      votes=d&&d.version===1&&Array.isArray(d.votes)?d.votes.slice(-LIMIT).filter(v=>v&&typeof v.a==='string'&&typeof v.b==='string'&&['a','b','tie'].includes(v.choice)):[];
    }catch{votes=[];}
  }
  function save(){
    try{localStorage.setItem(KEY,JSON.stringify({version:1,votes:votes.slice(-LIMIT)}));saveError=false;}
    catch{saveError=true;$('tasteWarning').textContent='브라우저 저장 실패. CSV 내보내기로 기록을 보관해 주세요.';}
  }
  function currentFiles(){
    const api=window.__photoJudgeIntegration;
    if(!api||typeof api.getAllFiles!=='function')return [];
    return api.getAllFiles().filter(x=>x&&x.file&&typeof x.file.name==='string')
      .map(x=>({file:x.file,name:x.file.name,id:idOf(x.file),index:x.index}));
  }
  function ratings(){
    const map=new Map(items.map(x=>[x.id,{elo:1500,n:0,w:0}]));
    let comparisons=0;
    for(const v of votes){
      const a=map.get(v.a),b=map.get(v.b);
      if(!a||!b||a===b)continue;
      const expected=1/(1+Math.pow(10,(b.elo-a.elo)/400));
      const score=v.choice==='a'?1:v.choice==='b'?0:0.5;
      const delta=24*(score-expected);
      a.elo+=delta;b.elo-=delta;a.n++;b.n++;
      if(score===1)a.w++;if(score===0)b.w++;
      comparisons++;
    }
    return {map,comparisons};
  }
  function isBurst(a,b){
    const pa=a.file.webkitRelativePath||a.name, pb=b.file.webkitRelativePath||b.name;
    if(pa.slice(0,pa.lastIndexOf('/')+1)!==pb.slice(0,pb.lastIndexOf('/')+1))return false;
    const dt=Math.abs((a.file.lastModified||0)-(b.file.lastModified||0));
    const na=a.name.match(/^(.*?)(\d{2,})(?:\.[^.]+)?$/), nb=b.name.match(/^(.*?)(\d{2,})(?:\.[^.]+)?$/);
    return (dt>0&&dt<120000)||!!(na&&nb&&na[1]===nb[1]&&Math.abs(Number(na[2])-Number(nb[2]))<=4);
  }
  function pick(){
    if(items.length<2)return null;
    const seen=new Set(votes.map(v=>pairId(v.a,v.b)));
    for(const k of skipped)seen.add(k);
    const candidates=[];
    for(let i=0;i<items.length-1;i++){
      const a=items[i],b=items[i+1];
      if(a.id===b.id||seen.has(pairId(a.id,b.id)))continue;
      if($('tasteMode').value==='all'||isBurst(a,b))candidates.push([a,b]);
    }
    if(candidates.length)return candidates[Math.floor(Math.random()*candidates.length)];
    if($('tasteMode').value!=='all')return null;
    for(let i=0;i<300;i++){
      const a=items[Math.floor(Math.random()*items.length)],b=items[Math.floor(Math.random()*items.length)];
      if(a&&b&&a.id!==b.id&&!seen.has(pairId(a.id,b.id)))return [a,b];
    }
    return null;
  }
  function cleanup(){for(const url of urls)URL.revokeObjectURL(url);urls=[];for(const id of ['tasteA','tasteB'])$(id).removeAttribute('src');}
  function photo(which,item){
    const url=URL.createObjectURL(item.file);urls.push(url);
    $(which==='A'?'tasteNameA':'tasteNameB').textContent=item.name;
    const img=$(which==='A'?'tasteA':'tasteB');
    img.onerror=()=>{$(which==='A'?'tasteNameA':'tasteNameB').textContent=item.name+' — 미리보기 실패: 건너뛰세요';};
    img.src=url;
  }
  function showStats(){
    const r=ratings();
    $('tasteStats').textContent=items.length+'장 · 현재 사진 집합의 비교 '+r.comparisons+'회 · 기록은 브라우저에만 보관';
  }
  function next(){
    cleanup();showStats();const p=pick();
    if(!p){
      pair=null;$('tasteImages').hidden=true;$('tasteChoices').hidden=true;$('tasteEmpty').hidden=false;
      $('tasteEmpty').textContent=items.length<2?'사진을 2장 이상 불러와 주세요.':
        $('tasteMode').value==='near'?'촬영 시간이나 연속 파일 번호가 가까운 미비교 사진이 없습니다. 전체 사진 비교를 선택해 주세요.':'새로운 비교 쌍이 없습니다.';
      return;
    }
    pair=Math.random()<0.5?p:[p[1],p[0]];
    $('tasteImages').hidden=false;$('tasteChoices').hidden=false;$('tasteEmpty').hidden=true;
    photo('A',pair[0]);photo('B',pair[1]);shownAt=performance.now();
  }
  function vote(choice){
    if(!pair)return;
    const [a,b]=pair;
    if(choice==='skip')skipped.add(pairId(a.id,b.id));
    else{
      votes.push({a:a.id,b:b.id,choice,reason:$('tasteReason').value,stage:$('tasteStage').value,elapsedMs:Math.round(performance.now()-shownAt),at:new Date().toISOString()});
      if(votes.length>LIMIT)votes=votes.slice(-LIMIT);
      save();
    }
    next();
  }
  function showRank(){
    cleanup();pair=null;$('tasteCompare').hidden=true;$('tasteRanking').hidden=false;
    $('tasteTabCompare').setAttribute('aria-selected','false');$('tasteTabRank').setAttribute('aria-selected','true');
    const r=ratings(),box=$('tasteRankRows');box.replaceChildren();
    items.slice().sort((a,b)=>(r.map.get(b.id).elo-r.map.get(a.id).elo)||a.index-b.index).slice(0,80).forEach((item,i)=>{
      const d=document.createElement('div'),s=r.map.get(item.id),name=document.createElement('span'),score=document.createElement('span');
      d.className='tasteRank';name.textContent=(i+1)+'. '+item.name;
      score.textContent=s.n?Math.round(s.elo)+'점 · '+s.n+'회'+(s.n<3?' (표본 부족)':''):'미평가';
      d.append(name,score);box.append(d);
    });
    showStats();
  }
  function showCompare(){
    $('tasteCompare').hidden=false;$('tasteRanking').hidden=true;
    $('tasteTabCompare').setAttribute('aria-selected','true');$('tasteTabRank').setAttribute('aria-selected','false');
    next();
  }
  function csvField(v){
    let s=String(v==null?'':v);
    if(/^\s*[=+\-@\t\r]/.test(s))s="'"+s;
    return '"'+s.replace(/"/g,'""')+'"';
  }
  function exportCsv(){
    const lines=[['left_id','right_id','choice','reason','stage','view_time_ms','timestamp'].map(csvField).join(',')];
    for(const v of votes)lines.push([v.a,v.b,v.choice,v.reason||'',v.stage||'',v.elapsedMs||0,v.at||''].map(csvField).join(','));
    const u=URL.createObjectURL(new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=u;a.download='photojudge-human-preference-'+new Date().toISOString().slice(0,10)+'.csv';
    a.click();setTimeout(()=>URL.revokeObjectURL(u),30000);
  }
  function open(){
    items=currentFiles();
    if(items.length<2){window.__photoJudgeIntegration?.showToast?.('사진을 2장 이상 불러와 주세요.');return;}
    skipped.clear();load();saveError=false;
    $('tasteOverlay').hidden=false;
    $('tasteWarning').textContent='원본·GO/HOLD/DROP 기록은 변경하지 않습니다. 이는 현재 사용자의 선호 실험이며 일반인 전체의 미적 점수를 예측하는 AI가 아닙니다.';
    showCompare();
  }
  function close(){cleanup();pair=null;$('tasteOverlay').hidden=true;}
  function init(){
    const css=document.createElement('style');
    css.textContent='#tasteOverlay[hidden],#tasteImages[hidden],#tasteChoices[hidden],#tasteEmpty[hidden],#tasteCompare[hidden],#tasteRanking[hidden]{display:none!important}'+
      '#tasteOverlay{position:fixed;inset:0;z-index:3000;padding:14px;overflow:auto;background:#080706ef;color:#f1e7d9;font-family:inherit}'+
      '#tasteDialog{box-sizing:border-box;max-width:1050px;margin:2vh auto;background:#211e1a;border:1px solid #6a5948;border-radius:18px;padding:18px;box-shadow:0 16px 55px #000b}'+
      '#tasteHeader{display:flex;align-items:center;justify-content:space-between;gap:12px}#tasteTitle{margin:0;font-size:21px}'+
      '#tasteOverlay button,#tasteOverlay select{cursor:pointer;border:1px solid #826b51;border-radius:9px;background:#362e27;color:#fff0de;padding:10px}'+
      '#tasteTabs{display:flex;gap:8px;margin:14px 0}#tasteTabs [aria-selected="true"]{background:#7b202c}'+
      '#tasteStats,#tasteWarning,#tasteHelp{font-size:12px;line-height:1.6;color:#cbbba8;margin:10px 0}'+
      '#tasteConfig{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}#tasteConfig label{display:flex;flex-direction:column;font-size:12px;gap:6px}'+
      '#tasteImages{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}'+
      '.tastePhoto{min-width:0;padding:6px;background:#0e0d0b;border:1px solid #4b4035;border-radius:12px;text-align:center}'+
      '.tastePhoto img{width:100%;height:min(50vh,440px);object-fit:contain;display:block}'+
      '.tastePhoto figcaption{font-size:11px;color:#decbb3;margin-top:7px;overflow-wrap:anywhere}'+
      '#tasteChoices{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:16px 0}#tasteChoices button{min-height:48px}'+
      '#tasteChoices [data-choice="a"],#tasteChoices [data-choice="b"]{background:#7b202c}'+
      '#tasteEmpty{text-align:center;padding:30px}#tasteRanking{max-height:60vh;overflow:auto}'+
      '.tasteRank{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #4d4032;padding:9px 4px;font-size:12px}'+
      '.tasteRank span{overflow-wrap:anywhere}.tasteRank span:last-child{text-align:right;min-width:105px;color:#d2b387}'+
      '@media(max-width:600px){#tasteOverlay{padding:5px}#tasteDialog{margin:0;padding:10px}#tasteTitle{font-size:16px}.tastePhoto img{height:30vh}#tasteChoices button{flex:1 1 43%;font-size:12px}}';
    document.head.append(css);
    const root=document.createElement('div');root.id='tasteOverlay';root.hidden=true;
    root.innerHTML='<section id="tasteDialog" role="dialog" aria-modal="true" aria-labelledby="tasteTitle">'+
      '<header id="tasteHeader"><h2 id="tasteTitle">사람의 눈 · 취향 연구실 (시험판)</h2><button id="tasteClose" type="button">닫기</button></header>'+
      '<p id="tasteHelp">사진 두 장을 보고 더 잘 찍혔다고 느낀 쪽을 선택하세요. 첫인상과 저장하고 싶은 마음을 구분해서 기록합니다.</p>'+
      '<nav id="tasteTabs"><button id="tasteTabCompare" aria-selected="true">두 장 비교</button><button id="tasteTabRank" aria-selected="false">선호 순위</button></nav>'+
      '<div id="tasteStats"></div>'+
      '<section id="tasteCompare"><div id="tasteConfig">'+
      '<label>비교 대상<select id="tasteMode"><option value="near">연속·비슷한 촬영 우선</option><option value="all">전체 사진 비교</option></select></label>'+
      '<label>판단 방식<select id="tasteStage"><option value="first">첫인상: 와, 잘 찍었다</option><option value="keep">다시 보고·공유하고 싶다</option></select></label>'+
      '<label>선택 이유<select id="tasteReason"><option value="">직감·종합</option><option value="moment">표정·결정적 순간</option><option value="subject">피사체·내용</option><option value="light">빛·색감</option><option value="composition">구도·시선 집중</option><option value="emotion">감정·이야기</option><option value="technical">선명함·완성도</option></select></label>'+
      '</div><div id="tasteImages"><figure class="tastePhoto"><img id="tasteA" alt="사진 A"><figcaption id="tasteNameA"></figcaption></figure>'+
      '<figure class="tastePhoto"><img id="tasteB" alt="사진 B"><figcaption id="tasteNameB"></figcaption></figure></div>'+
      '<div id="tasteEmpty" hidden></div>'+
      '<div id="tasteChoices"><button data-choice="a">A가 더 좋다</button><button data-choice="b">B가 더 좋다</button><button data-choice="tie">비슷하다</button><button data-choice="skip">건너뛰기</button></div></section>'+
      '<section id="tasteRanking" hidden><div id="tasteRankRows"></div><p id="tasteRankHelp">Elo 상대 순위는 비교 수가 적으면 불안정합니다. 3회 미만은 표본 부족으로 표시합니다.</p></section>'+
      '<p id="tasteWarning"></p><button id="tasteExport">비교 기록 CSV 내보내기</button></section>';
    document.body.append(root);
    $('tasteClose').onclick=close;$('tasteTabCompare').onclick=showCompare;$('tasteTabRank').onclick=showRank;
    $('tasteMode').onchange=next;$('tasteExport').onclick=exportCsv;
    root.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>vote(b.dataset.choice));
    root.addEventListener('click',e=>{if(e.target===root)close();});
    document.addEventListener('keydown',e=>{
      if(root.hidden)return;
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}
      else if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&!(e.target instanceof HTMLSelectElement)){
        e.preventDefault();e.stopImmediatePropagation();vote(e.key==='ArrowLeft'?'a':'b');
      }
    },true);
    const toolbar=$('autoToolbar');
    if(toolbar){const b=document.createElement('button');b.type='button';b.id='tasteLabBtn';b.className='btn';b.textContent='사람의 눈';b.onclick=open;toolbar.append(b);}
    const anchor=$('mReview');
    if(anchor){const b=document.createElement('button');b.id='mTasteLab';b.className='drawerItem';b.type='button';b.innerHTML='<b>사람의 눈 · 취향 연구</b><span>두 장 비교로 더 좋은 사진 찾기</span>';b.onclick=open;anchor.parentNode.insertBefore(b,anchor);}
  }
  init();
  window.__photoJudgeTasteLab={version:'0.1',open,close,getStats:()=>({loaded:items.length,comparisons:ratings().comparisons})};
})();