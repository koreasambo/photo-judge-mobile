// 사진보정소 브라우저 엔진 v2.5.0
const clamp=(v,a=0,b=255)=>Math.max(a,Math.min(b,v));
const luma=(r,g,b)=>(0.2126*r+0.7152*g+0.0722*b)/255;

function mkImageData(w,h){return new ImageData(new Uint8ClampedArray(w*h*4),w,h)}
function downscale(src,maxLong=360){
  const {width:w,height:h,data}=src,s=Math.min(1,maxLong/Math.max(w,h));
  if(s>=.999)return {imageData:src,scale:1};
  const tw=Math.max(1,Math.round(w*s)),th=Math.max(1,Math.round(h*s)),out=mkImageData(tw,th);
  for(let y=0;y<th;y++)for(let x=0;x<tw;x++){
    const sx=Math.min(w-1,Math.round(x/s)),sy=Math.min(h-1,Math.round(y/s));
    const si=(sy*w+sx)*4,di=(y*tw+x)*4;
    out.data[di]=data[si];out.data[di+1]=data[si+1];out.data[di+2]=data[si+2];out.data[di+3]=255;
  }
  return {imageData:out,scale:s};
}
function analyze(img){
  const {width:w,height:h,data}=img,n=w*h,ls=new Float32Array(n),arr=new Array(n);
  let hi=0,sh=0;
  for(let i=0,p=0;i<n;i++,p+=4){const v=luma(data[p],data[p+1],data[p+2]);ls[i]=v;arr[i]=v;if(v>.88)hi++;if(v<.18)sh++;}
  arr.sort((a,b)=>a-b);const pct=q=>arr[Math.floor((n-1)*q)];
  const p25=pct(.25),p50=pct(.5),p75=pct(.75),p90=pct(.9);
  let sum=0,c=0;
  for(let y=Math.floor(h*.16);y<Math.floor(h*.88);y++)for(let x=Math.floor(w*.18);x<Math.floor(w*.82);x++){sum+=ls[y*w+x];c++;}
  const center=sum/Math.max(1,c);
  const back=Math.max(0,(.49-center)/.49)*.48+Math.min(1,Math.max(0,p90-center)/.42)*.34+Math.min(1,(hi/n)/.22)*.18;
  return {w,h,ls,p25,p50,p75,p90,center,hiFrac:hi/n,shadowFrac:sh/n,backlight:Math.max(0,Math.min(1,back))};
}
function isSkin(r,g,b){
  const y=.299*r+.587*g+.114*b,cr=(r-y)*.713+128,cb=(b-y)*.564+128;
  return cr>=132&&cr<=184&&cb>=75&&cb<=136&&y>=34;
}
function skyMask(img){
  const {width:w,height:h,data}=img,m=new Float32Array(w*h);
  for(let y=0;y<h;y++){
    const top=Math.max(0,1-y/(h*.79));
    for(let x=0;x<w;x++){
      const i=y*w+x,p=i*4,r=data[p],g=data[p+1],b=data[p+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b),v=mx/255,s=mx?((mx-mn)/mx):0;
      const blue=(b>r*1.03&&b>g*.98&&v>.25),bright=(v>.72&&s<.48),warm=(r>g&&g>=b*.92&&v>.53&&s<.56);
      m[i]=(y<h*.77&&(blue||bright||warm))?top:0;
    }
  }
  return blurMask(m,w,h,4);
}
function blurMask(mask,w,h,r=4){
  const t=new Float32Array(mask.length),o=new Float32Array(mask.length);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0,c=0;for(let d=-r;d<=r;d++){const xx=x+d;if(xx>=0&&xx<w){s+=mask[y*w+xx];c++;}}t[y*w+x]=s/c;}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0,c=0;for(let d=-r;d<=r;d++){const yy=y+d;if(yy>=0&&yy<h){s+=t[yy*w+x];c++;}}o[y*w+x]=s/c;}
  return o;
}
function subjectMask(img,a,sky){
  const {width:w,height:h,data}=img,n=w*h,cand=new Uint8Array(n),visited=new Uint8Array(n),mask=new Float32Array(n);
  const lowCut=Math.min(.46,Math.max(.17,a.p50*.78));
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x,p=i*4,lv=a.ls[i],cx=(x-w*.5)/(w*.39),cy=(y-h*.56)/(h*.48),ellipse=(cx*cx+cy*cy)<1;
    const skin=isSkin(data[p],data[p+1],data[p+2]);
    if(ellipse&&sky[i]<.58&&(lv<lowCut||skin))cand[i]=1;
  }
  // 연결 성분 중 화면 중앙과 가장 많이 맞닿는 큰 덩어리만 선택
  const comps=[];const qx=new Int32Array(n),qy=new Int32Array(n);
  for(let sy=0;sy<h;sy+=2)for(let sx=0;sx<w;sx+=2){
    const si=sy*w+sx;if(!cand[si]||visited[si])continue;
    let head=0,tail=0,area=0,score=0;qx[tail]=sx;qy[tail++]=sy;visited[si]=1;const pix=[];
    while(head<tail){
      const x=qx[head],y=qy[head++],i=y*w+x;pix.push(i);area++;
      const dx=(x-w*.5)/(w*.28),dy=(y-h*.56)/(h*.34);score+=Math.exp(-(dx*dx+dy*dy)*1.7);
      for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
        if(nx<0||ny<0||nx>=w||ny>=h)continue;const ni=ny*w+nx;
        if(cand[ni]&&!visited[ni]){visited[ni]=1;qx[tail]=nx;qy[tail++]=ny;}
      }
    }
    if(area>n*.003)comps.push({pix,area,score});
  }
  comps.sort((A,B)=>(B.score+B.area*.015)-(A.score+A.area*.015));
  for(const comp of comps.slice(0,2))for(const i of comp.pix)mask[i]=1;
  // 피부와 중앙 암부를 약하게 보강
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x,p=i*4,dx=(x-w*.5)/(w*.27),dy=(y-h*.56)/(h*.36),cw=Math.exp(-(dx*dx+dy*dy)*1.9);
    if(isSkin(data[p],data[p+1],data[p+2])&&sky[i]<.55)mask[i]=Math.max(mask[i],.65);
    if(mask[i]===0&&a.ls[i]<lowCut*.8)mask[i]=Math.max(mask[i],cw*.12);
  }
  return blurMask(mask,w,h,5);
}
function upscale(mask,sw,sh,tw,th){
  const out=new Float32Array(tw*th);
  for(let y=0;y<th;y++)for(let x=0;x<tw;x++){const xx=Math.min(sw-1,Math.floor(x*sw/tw)),yy=Math.min(sh-1,Math.floor(y*sh/th));out[y*tw+x]=mask[yy*sw+xx];}
  return out;
}
function curve(v){
  let x=v/255;
  if(x<.12)x=Math.max(0,x-.016*(1-x/.12));
  if(x>.89)x=.89+(x-.89)*.80;
  return clamp(Math.round(x*255));
}
export function autoCorrectImageData(source,{preset="beach_backlight"}={}){
  const ds=downscale(source,360),a=analyze(ds.imageData),skyS=skyMask(ds.imageData),subjS=subjectMask(ds.imageData,a,skyS);
  const subject=upscale(subjS,ds.imageData.width,ds.imageData.height,source.width,source.height);
  const sky=upscale(skyS,ds.imageData.width,ds.imageData.height,source.width,source.height);
  const out=mkImageData(source.width,source.height);out.data.set(source.data);
  const cfg={
    beach_backlight:{lift:.122,warm:.24,sat:.19,sky:.052},
    photographer:{lift:.106,warm:.16,sat:.14,sky:.043},
    natural:{lift:.082,warm:.10,sat:.09,sky:.033},
    rescue:{lift:.155,warm:.17,sat:.15,sky:.064}
  }[preset]||{lift:.106,warm:.16,sat:.14,sky:.043};
  for(let i=0,p=0;i<subject.length;i++,p+=4){
    let r=curve(out.data[p]),g=curve(out.data[p+1]),b=curve(out.data[p+2]);
    const s=Math.pow(subject[i],1.38),edge=Math.max(0,subject[i]-s),sk=sky[i],lv=luma(r,g,b);
    const lift=(s*cfg.lift+edge*cfg.lift*.28)*Math.pow(1-lv,1.75)*(.65+a.backlight*.58);
    r=clamp(Math.round(r+(255-r)*lift));g=clamp(Math.round(g+(255-g)*lift));b=clamp(Math.round(b+(255-b)*lift));
    const dark=sk*cfg.sky*(.42+a.backlight*.58);
    r=clamp(Math.round(r*(1-dark)));g=clamp(Math.round(g*(1-dark)));b=clamp(Math.round(b*(1-dark)));
    const v=Math.max(r,g,b),darkW=Math.max(0,(150-v)/150),boost=1+cfg.sat*darkW*(s+.3*edge),avg=(r+g+b)/3;
    r=clamp(Math.round(avg+(r-avg)*boost));g=clamp(Math.round(avg+(g-avg)*boost));b=clamp(Math.round(avg+(b-avg)*boost));
    const warm=(1-sk)*(.5+.5*subject[i])*cfg.warm;
    r=clamp(Math.round(r+17*warm));g=clamp(Math.round(g+7*warm));b=clamp(Math.round(b-5*warm));
    out.data[p]=r;out.data[p+1]=g;out.data[p+2]=b;out.data[p+3]=255;
  }
  return {imageData:out,meta:{preset,backlightScore:a.backlight,midLuma:a.p50,subjectCoverage:subject.reduce((s,v)=>s+v,0)/subject.length}};
}
