import { autoCorrectImageData } from './autoCorrectEngine.js';

const $=s=>document.querySelector(s);
const state={items:[],index:0,original:null,corrected:null,busy:false,preset:'beach_backlight',objectUrl:null};

function api(){return window.__photoJudgeIntegration;}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function editedName(name){const i=name.lastIndexOf('.');return i<0?name+'_EDITED.jpg':name.slice(0,i)+'_EDITED'+name.slice(i);}
function setStatus(t){const el=$('#editorStatus');if(el)el.textContent=t;}
function show(id){for(const x of ['photoHub','photoEditor']){const e=$('#'+x);if(e)e.classList.toggle('show',x===id);}}
function goJudge(){show('');$('#app')?.classList.remove('hubHidden');$('#results')?.classList.remove('show');}
function goHub(){show('photoHub');$('#app')?.classList.add('hubHidden');$('#results')?.classList.remove('show');}
function goEditorDirect(){const A=api();if(!A){alert('사진판정소 연결이 준비되지 않았습니다.');return;}const all=A.getAllFiles().map((file,i)=>({file,index:i,status:A.getDecision(file)}));openEditor(all);}
function openEditorGO(){const A=api();if(!A)return;const items=A.getGoItems();if(!items.length){alert('GO 사진이 없습니다. 먼저 판정소에서 GO를 선택해 주세요.');return;}openEditor(items);}
function openEditor(items){state.items=items;state.index=0;state.original=null;state.corrected=null;show('photoEditor');$('#app')?.classList.add('hubHidden');$('#results')?.classList.remove('show');renderEditor();}
function current(){return state.items[state.index]||null;}
function revoke(){if(state.objectUrl){URL.revokeObjectURL(state.objectUrl);state.objectUrl=null;}}
function drawFile(file){
  return new Promise((resolve,reject)=>{
    const img=new Image(),u=URL.createObjectURL(file);revoke();state.objectUrl=u;
    img.onload=()=>{
      const c=$('#editorCanvas'),ctx=c.getContext('2d',{willReadFrequently:true});
      c.width=img.naturalWidth;c.height=img.naturalHeight;ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(img,0,0);
      state.original=ctx.getImageData(0,0,c.width,c.height);state.corrected=null;resolve();
    };
    img.onerror=reject;img.src=u;
  });
}
async function renderEditor(){
  const it=current(),title=$('#editorFileName'),counter=$('#editorCounter');
  if(!it){title.textContent='보정할 사진이 없습니다.';counter.textContent='0 / 0';return;}
  title.textContent=it.file.name;counter.textContent=(state.index+1)+' / '+state.items.length;
  setStatus('원본 불러오는 중...');
  try{await drawFile(it.file);setStatus('원본 준비됨');updateButtons();}catch(e){setStatus('사진을 열 수 없습니다.');console.error(e);}
}
function updateButtons(){
  const prev=$('#editorPrev'),next=$('#editorNext');if(prev)prev.disabled=state.index<=0;if(next)next.disabled=state.index>=state.items.length-1;
}
function reset(){if(!state.original)return;const c=$('#editorCanvas');c.getContext('2d').putImageData(state.original,0,0);state.corrected=null;setStatus('원본 보기');}
async function apply(){
  if(!state.original||state.busy)return;
  state.busy=true;setStatus('자동 보정 중...');
  await new Promise(r=>setTimeout(r,20));
  try{
    const input=new ImageData(new Uint8ClampedArray(state.original.data),state.original.width,state.original.height);
    const result=autoCorrectImageData(input,{preset:state.preset});
    state.corrected=result.imageData;$('#editorCanvas').getContext('2d').putImageData(result.imageData,0,0);
    setStatus('보정 적용 · 역광 '+Math.round((result.meta.backlightScore||0)*100)+'%');
  }catch(e){console.error(e);setStatus('보정 오류');alert('보정 중 문제가 생겼습니다: '+e);}
  finally{state.busy=false;}
}
async function canvasBlob(){
  const c=$('#editorCanvas');return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('보정본 생성 실패')),'image/jpeg',.94));
}
async function saveCurrent(){
  const A=api(),it=current();if(!A||!it)return;
  try{
    setStatus('저장 중...');
    const root=await A.getRootHandle();if(!root)return;
    const dir=await root.getDirectoryHandle('EDITOR_OUTPUT',{create:true});
    const blob=await canvasBlob(),fh=await dir.getFileHandle(editedName(it.file.name),{create:true}),w=await fh.createWritable();
    await w.write(blob);await w.close();setStatus('EDITOR_OUTPUT 저장 완료');
  }catch(e){console.error(e);setStatus('저장 오류');alert('보정본 저장 중 문제가 생겼습니다: '+e);}
}
async function saveAll(){
  if(state.busy||!state.items.length)return;
  const A=api();state.busy=true;
  try{
    const root=await A.getRootHandle();if(!root)return;
    const dir=await root.getDirectoryHandle('EDITOR_OUTPUT',{create:true});
    for(let i=0;i<state.items.length;i++){
      state.index=i;await renderEditor();await apply();
      setStatus('전체 저장 중 · '+(i+1)+'/'+state.items.length);
      const blob=await canvasBlob(),it=current(),fh=await dir.getFileHandle(editedName(it.file.name),{create:true}),w=await fh.createWritable();
      await w.write(blob);await w.close();
      await new Promise(r=>setTimeout(r,0));
    }
    setStatus('전체 저장 완료 · '+state.items.length+'장');
  }catch(e){console.error(e);alert('전체 저장 중 문제가 생겼습니다: '+e);}
  finally{state.busy=false;updateButtons();}
}
function buildUI(){
  document.body.insertAdjacentHTML('beforeend',`
  <div id="photoHub" class="photoHub">
    <div class="hubCard"><div class="hubKicker">PHOTO WORKROOM</div><h1>사진 작업실</h1><p>판정하고, 남길 사진만 보정한다.</p>
      <div class="hubButtons"><button id="hubJudge">사진판정소<span>GO / HOLD / DROP</span></button><button id="hubEditor">사진보정소<span>자동 보정 · 별도 저장</span></button></div>
    </div>
  </div>
  <div id="photoEditor" class="photoEditor">
    <header class="editorHead"><button id="editorBack">‹ 메인</button><div><b>사진보정소</b><span id="editorCounter">0 / 0</span></div><button id="editorJudgeBack">판정소</button></header>
    <main class="editorMain"><div class="editorStage"><canvas id="editorCanvas"></canvas></div>
      <aside class="editorSide"><div class="editorName" id="editorFileName"></div>
        <label>보정 스타일<select id="editorPreset"><option value="beach_backlight">해변 역광</option><option value="photographer">Photographer</option><option value="natural">Natural</option><option value="rescue">Rescue</option></select></label>
        <button id="editorApply" class="editorPrimary">자동 보정</button><button id="editorReset">원본 보기</button>
        <div class="editorNav"><button id="editorPrev">이전</button><button id="editorNext">다음</button></div>
        <button id="editorSave">현재 보정본 저장</button><button id="editorSaveAll" class="editorGold">전체 자동보정 + 저장</button>
        <div id="editorStatus" class="editorStatus">대기</div><div class="editorHint">보정본은 판정소 저장 루트 안 <b>EDITOR_OUTPUT</b> 폴더에 저장됩니다. 원본은 변경하지 않습니다.</div>
      </aside></main>
  </div>`);
  $('#hubJudge').onclick=goJudge;$('#hubEditor').onclick=goEditorDirect;$('#editorBack').onclick=goHub;$('#editorJudgeBack').onclick=goJudge;
  $('#editorApply').onclick=apply;$('#editorReset').onclick=reset;$('#editorSave').onclick=saveCurrent;$('#editorSaveAll').onclick=saveAll;
  $('#editorPrev').onclick=()=>{if(state.index>0){state.index--;renderEditor();}};$('#editorNext').onclick=()=>{if(state.index<state.items.length-1){state.index++;renderEditor();}};
  $('#editorPreset').onchange=e=>{state.preset=e.target.value;};
  const rhead=$('#results .resultTopBtns');if(rhead){const b=document.createElement('button');b.id='moveToEditorBtn';b.className='btn smallBtn';b.textContent='GO를 보정소로 이동';b.onclick=openEditorGO;rhead.appendChild(b);}
  const bottom=$('#bottom .actionRow');if(bottom){const b=document.createElement('button');b.className='btn';b.textContent='사진보정소';b.onclick=goEditorDirect;bottom.appendChild(b);}
  setTimeout(goHub,3900);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',buildUI);else buildUI();
