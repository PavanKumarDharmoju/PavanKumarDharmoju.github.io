(()=>{
'use strict';
/* ================= utilities ================= */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const median=a=>{if(!a.length) return 0;const s=[...a].sort((x,y)=>x-y);return s[s.length>>1];};
const centsTxt=c=>(c>=0?'+':'−')+Math.abs(Math.round(c))+'¢';
const secs=ms=>(ms/1000).toFixed(1)+' s';
const mmss=(ms,ceil)=>{const t=Math.max(0,ceil?Math.ceil(ms/1000):Math.floor(ms/1000));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');};
const pct=v=>Math.round(v*100)+'%';
const setT=(sel,txt)=>{const e=typeof sel==='string'?document.querySelector(sel):sel;if(e&&e.textContent!==String(txt)) e.textContent=txt;};
function toast(msg){const t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(t._h);t._h=setTimeout(()=>{t.hidden=true;},3600);}

/* ================= storage ================= */
let storageOK=true;
try{localStorage.setItem('bansuri:probe','1');localStorage.removeItem('bansuri:probe');}catch(e){storageOK=false;}
const store={
  get(k,d){if(!storageOK) return d;try{const v=localStorage.getItem('bansuri:'+k);return v===null?d:JSON.parse(v);}catch(e){return d;}},
  set(k,v){if(!storageOK) return;try{localStorage.setItem('bansuri:'+k,JSON.stringify(v));}catch(e){storageOK=false;$('#storeNote').hidden=false;}},
  del(k){if(!storageOK) return;try{localStorage.removeItem('bansuri:'+k);}catch(e){}}
};
/* Instruments. A bansuri's Sa (top three holes closed) is roughly 24700 / length in cm, e.g. 63 cm ≈ G4.
   Each flute stores its own Sa; Find my Sa replaces the estimate with a measured value. */
const KEYS=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const midiOf=f=>69+12*Math.log2(f/440),hzOf=m=>440*Math.pow(2,(m-69)/12);
const estSa=len=>24700/len;
const estFor=len=>Math.round(hzOf(Math.round(midiOf(estSa(len))))*100)/100;
const regOf=f=>f<400?'bass':f<620?'medium':'high';
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function keyOptions(k){
  const pc=KEYS.indexOf(k),out=[];
  for(let oct=3;oct<=6;oct++){const m=12*(oct+1)+pc,f=hzOf(m),len=24700/f;if(len>=24.5&&len<=105) out.push({m,f:Math.round(f*100)/100,len:Math.round(len),name:k+oct,reg:regOf(f)});}
  return out;
}
const DEFAULT_VOICE={sa:138.59,fine:0,cal:false};
const newId=()=>'f'+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36);
const demoFlute=()=>({id:newId(),name:'G bass',key:'G',len:63,sa:392,est:392,fine:0,cal:false,demo:true});
const savedS=store.get('settings',{});
const S=Object.assign({cur:null,welcomed:false,inton:'et',vol:55,gap:1.4,strict:0,gate:-58,autoMute:false,stand:false,chime:true,click:true,bpm:54,alank:0,alLoop:true,egRange:'all'},savedS);
if(!Array.isArray(S.inst)){
  /* migrate the earlier two-flute layout (E/F/Voice) */
  S.inst=[];
  const old=savedS.flutes||{};
  ['E','F'].forEach(k=>{
    const sv=old[k];if(!sv) return;
    const len=sv.len||({E:50,F:43})[k],stale=(k==='E'&&sv.sa===329.63)||(k==='F'&&sv.sa===349.23),ok=sv.sa&&!stale;
    S.inst.push({id:k,name:`${k} flute`,key:k,len,sa:ok?sv.sa:estFor(len),est:estFor(len),fine:sv.fine||0,cal:ok?(sv.cal===undefined?true:sv.cal):false});
  });
  if(!S.inst.length&&savedS.sa) S.inst.push({id:'F',name:'F flute',key:'F',len:null,sa:savedS.sa,est:349.23,fine:savedS.fine||0,cal:true});
  if(old.V&&old.V.sa) S.voice={sa:old.V.sa,fine:old.V.fine||0,cal:old.V.cal===undefined?true:old.V.cal};
  S.cur=savedS.flute==='V'?'V':(S.inst.some(x=>x.id===savedS.flute)?savedS.flute:null);
  if(S.inst.length) S.welcomed=true;
}
['flutes','flute','sa','fine'].forEach(k=>delete S[k]);
if(!S.voice) S.voice=Object.assign({},DEFAULT_VOICE);
if(!S.inst.length) S.inst.push(demoFlute());
if(!S.inst.some(x=>x.id===S.cur)) S.cur=S.inst[0].id;
/* Each page is one tool: <html data-mode="voice"> is the Singing Companion, anything else the Bansuri Companion.
   Both share this engine and the same saved settings; the voice keeps its own Sa (S.voice), bests ('V') and riyaz log. */
const VOICE=document.documentElement.dataset.mode==='voice';
const isVoice=()=>VOICE;
const curId=()=>VOICE?'V':S.cur;
/* each tool shows its welcome once; singers who already chose a Sa have seen enough of it */
const welcomeKey=VOICE?'welcomedV':'welcomed';
if(VOICE&&S.voice.cal) S.welcomedV=true;
function welcomeDone(){S[welcomeKey]=true;saveS();$('#welcome').hidden=true;}
/* Named usage events for the site's PostHog analytics (assets/js/analytics.js); a no-op when analytics isn't loaded.
   Only feature use and scores are sent, never audio or pitch data. */
function track(event,props){try{if(window.posthog&&window.posthog.capture) window.posthog.capture(event,Object.assign({tool:VOICE?'singing':'bansuri'},props));}catch(e){}}
const dayPfx=()=>isVoice()?'dayV:':'day:';
const HARM=['Safed 1','Kali 1','Safed 2','Kali 2','Safed 3','Safed 4','Kali 3','Safed 5','Kali 4','Safed 6','Kali 5','Safed 7'];
const harmName=f=>HARM[((Math.round(69+12*Math.log2(f/440))%12)+12)%12];
const FL=()=>isVoice()?S.voice:(S.inst.find(x=>x.id===S.cur)||S.inst[0]);
const saveS=()=>store.set('settings',S);
const loadBests=id=>store.get('bests:'+id,id==='F'?store.get('bests',{}):{});
let bests=loadBests(curId());

/* ================= notes ================= */
const NOTES=[
 {id:'lpa', sg:'Pạ', name:'Low Pa', dev:'प़', semi:-5,ratio:3/4, holes:[1,1,1,1,1,1],over:false,air:25,aim:'deep',mouth:'“Hoo”',cue:'Warm, slow sigh. Barely more than breathing out.'},
 {id:'ldha',sg:'Dhạ',name:'Low Dha',dev:'ध़', semi:-3,ratio:5/6, holes:[1,1,1,1,1,0],over:false,air:32,aim:'deep',mouth:'“Hoo”',cue:'Slow, warm air, a touch faster than Low Pa. Keep the jaw dropped.'},
 {id:'lni', sg:'Nị', name:'Low Ni', dev:'ऩि',semi:-1,ratio:15/16,holes:[1,1,1,1,0,0],over:false,air:40,aim:'low', mouth:'“Hoo”',cue:'Relaxed and warm. Index finger flat on hole 4.'},
 {id:'sa',  sg:'Sa', name:'Sa',      dev:'सा', semi:0, ratio:1,   holes:[1,1,1,0,0,0],over:false,air:50,aim:'mid', mouth:'“Hoo”',cue:'Steady stream. This is home: tune it against the tanpura.'},
 {id:'re',  sg:'Re', name:'Re',      dev:'रे', semi:2, ratio:9/8, holes:[1,1,0,0,0,0],over:false,air:55,aim:'mid', mouth:'“Hoo”',cue:'Steady stream, a little faster than Sa.'},
 {id:'ga',  sg:'Ga', name:'Ga',      dev:'ग',  semi:4, ratio:5/4, holes:[1,0,0,0,0,0],over:false,air:60,aim:'mid', mouth:'“Hoo”',cue:'Steady stream. Keep the flute still as fingers lift.'},
 {id:'ma',  sg:'Ma', name:'Ma',      dev:'म',  semi:5, ratio:4/3, holes:[0.5,0,0,0,0,0],over:false,air:62,aim:'mid',mouth:'“Hoo”',cue:'Half-cover hole 1 only. Roll the finger back to open part of the hole; all other holes open.'},
 {id:'mpa', sg:'Pa', name:'Middle Pa',dev:'प', semi:7, ratio:3/2, holes:[1,1,1,1,1,1],over:true, air:80,aim:'high',mouth:'“Too”',cue:'Overblow: firm, narrow stream. Same fingers as Low Pa.'},
 {id:'mdha',sg:'Dha',name:'Middle Dha',dev:'ध',semi:9, ratio:5/3, holes:[1,1,1,1,1,0],over:true, air:84,aim:'high',mouth:'“Too”',cue:'Overblow: narrow, faster air. Same fingers as Low Dha.'},
 {id:'mni', sg:'Ni', name:'Middle Ni',dev:'नि',semi:11,ratio:15/8,holes:[1,1,1,1,0,0],over:true, air:88,aim:'high',mouth:'“Too”',cue:'Overblow: fast, focused stream. Same fingers as Low Ni.'},
 {id:'hsa', sg:"Sa'",name:"High Sa'",dev:'सं', semi:12,ratio:2,   holes:[1,1,1,0,0,0],over:true, air:92,aim:'top', mouth:'“Too”',cue:'Overblow: fast, narrow stream with lips slightly forward. Same fingers as Sa.'},
];
const NOTE=Object.fromEntries(NOTES.map(n=>[n.id,n]));
const GROUPS=[{label:'Low · mandra',ids:['lpa','ldha','lni']},{label:'Middle · madhya',ids:['sa','re','ga','ma']},{label:'Overblown',ids:['mpa','mdha','mni','hsa']}];
const noteClass=n=>n.semi<0?'low':n.over?'over':'';
const saEff=()=>FL().sa*Math.pow(2,FL().fine/1200);
const freqOf=n=>saEff()*(S.inton==='just'?n.ratio:Math.pow(2,n.semi/12));
const WN_FLAT=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],WN_SHARP=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const useSharps=()=>{const pc=((Math.round(69+12*Math.log2(saEff()/440))%12)+12)%12;return [0,1,2,4,6,7,9,11].includes(pc);};
function western(f){const WN=useSharps()?WN_SHARP:WN_FLAT,m=69+12*Math.log2(f/440),r=Math.round(m);return{name:WN[((r%12)+12)%12]+(Math.floor(r/12)-1),cents:Math.round((m-r)*100)};}

/* ================= audio engine ================= */
let AC=null,master,droneBus,refBus,chimeBus;
const volCurve=v=>Math.pow(v/100,2)*0.9;
function audio(){
  if(!AC){
    const C=window.AudioContext||window.webkitAudioContext;
    AC=new C({latencyHint:'interactive'});
    master=AC.createGain();master.gain.value=0.9;
    const comp=AC.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=4;
    master.connect(comp);comp.connect(AC.destination);
    droneBus=AC.createGain();droneBus.gain.value=volCurve(S.vol);droneBus.connect(master);
    refBus=AC.createGain();refBus.connect(master);
    chimeBus=AC.createGain();chimeBus.gain.value=0.3;chimeBus.connect(master);
  }
  if(AC.state==='suspended') AC.resume();
  return AC;
}
let tanWave=null;
function tanpuraWave(){
  if(tanWave) return tanWave;
  const n=36,re=new Float32Array(n),im=new Float32Array(n);
  for(let k=1;k<n;k++) im[k]=(0.25+Math.abs(Math.sin(k*Math.PI*0.137)))/Math.pow(k,0.85);
  return tanWave=AC.createPeriodicWave(re,im);
}
function pluck(f,t,amp,dest){
  const o1=AC.createOscillator(),o2=AC.createOscillator();
  o1.setPeriodicWave(tanpuraWave());o2.setPeriodicWave(tanpuraWave());
  o1.frequency.value=f;o2.frequency.value=f;o2.detune.value=3.5;
  const mix=AC.createGain();mix.gain.value=0.5;
  const jaw=AC.createBiquadFilter();jaw.type='peaking';jaw.Q.value=4;jaw.gain.value=9;
  jaw.frequency.setValueAtTime(650,t);jaw.frequency.exponentialRampToValueAtTime(3400,t+2.4);jaw.frequency.exponentialRampToValueAtTime(1500,t+4.8);
  const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(5200,t);lp.frequency.exponentialRampToValueAtTime(2000,t+4.5);
  const g=AC.createGain();
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(amp,t+0.012);
  g.gain.exponentialRampToValueAtTime(amp*0.4,t+0.9);g.gain.exponentialRampToValueAtTime(0.0001,t+5);
  o1.connect(mix);o2.connect(mix);mix.connect(jaw);jaw.connect(lp);lp.connect(g);g.connect(dest);
  o1.start(t);o2.start(t);o1.stop(t+5.1);o2.stop(t+5.1);
  o1.onended=()=>{try{g.disconnect();}catch(e){}};
}
const drone={on:false,next:0,idx:0,timer:0,sess:null};
function droneTick(){
  if(!drone.on) return;
  const now=AC.currentTime,s3=isVoice()?saEff():saEff()/2,fs=[s3*0.75,s3,s3*Math.pow(2,3/1200),s3/2];
  while(drone.next<now+1.2){
    const i=drone.idx%4;
    pluck(fs[i],Math.max(drone.next,now+0.01),i===3?0.2:0.15,drone.sess);
    drone.next+=S.gap*(i===3?1.3:1);drone.idx++;
  }
}
function droneStart(){
  audio();if(drone.on) return;
  drone.sess=AC.createGain();drone.sess.connect(droneBus);
  drone.on=true;drone.idx=0;drone.next=AC.currentTime+0.06;droneTick();
  drone.timer=setInterval(droneTick,200);syncDrone();
}
function droneStop(){
  if(!drone.on) return;
  drone.on=false;clearInterval(drone.timer);
  const g=drone.sess,t=AC.currentTime;g.gain.setValueAtTime(1,t);g.gain.linearRampToValueAtTime(0,t+0.5);
  setTimeout(()=>{try{g.disconnect();}catch(e){}},6500);drone.sess=null;syncDrone();
}
const droneToggle=()=>{track('tanpura_toggled',{on:!drone.on});return drone.on?droneStop():droneStart();};

let refWave=null,refWaveV=null,ref={id:null,osc:null,g:null};
function ensureWaves(){
  if(!refWave) refWave=AC.createPeriodicWave(new Float32Array(4),new Float32Array([0,1,0.12,0.04]));
  if(!refWaveV){const n=14,im=new Float32Array(n);for(let k=1;k<n;k++) im[k]=1/Math.pow(k,1.1);refWaveV=AC.createPeriodicWave(new Float32Array(n),im);}
}
function playHz(f,dur){
  audio();refStop();ensureWaves();const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime;
  o.setPeriodicWave(isVoice()?refWaveV:refWave);o.frequency.value=f;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(isVoice()?0.2:0.3,t+0.08);
  g.gain.setValueAtTime(isVoice()?0.2:0.3,t+dur);g.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.2);o.connect(g);g.connect(refBus);o.start(t);o.stop(t+dur+0.25);
  oneShot={o,g};o.onended=()=>{if(oneShot&&oneShot.o===o) oneShot=null;};
}
let oneShot=null;
function stopOneShot(){
  if(!oneShot) return;
  try{const t=AC.currentTime,g=oneShot.g;g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(Math.max(g.gain.value,0.0001),t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.1);oneShot.o.stop(t+0.12);}catch(e){}
  oneShot=null;
}
function refPlay(id){
  audio();refStop();
  ensureWaves();
  const o=AC.createOscillator();o.setPeriodicWave(isVoice()?refWaveV:refWave);o.frequency.value=freqOf(NOTE[id]);
  const g=AC.createGain(),t=AC.currentTime;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(isVoice()?0.2:0.3,t+0.08);
  o.connect(g);g.connect(refBus);o.start(t);ref={id,osc:o,g};syncRefs();
}
function refStop(){
  stopOneShot();
  if(ref.osc){const t=AC.currentTime,g=ref.g,o=ref.osc;g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(Math.max(g.gain.value,0.0001),t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.15);o.stop(t+0.2);}
  ref={id:null,osc:null,g:null};syncRefs();
}
const refToggle=id=>ref.id===id?refStop():refPlay(id);
function applyRefMute(){if(refBus) refBus.gain.setTargetAtTime((coach.on&&S.autoMute&&!coach.testing)?0:1,AC.currentTime,0.03);}
function chime(kind){
  if(!S.chime) return;audio();const t=AC.currentTime,base=kind==='end'?660:880;
  [[1,0.22],[1.5,0.1],[2.5,0.04]].forEach(([m,a])=>{const o=AC.createOscillator();o.frequency.value=base*m;const g=AC.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(a,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+1.5);o.connect(g);g.connect(chimeBus);o.start(t);o.stop(t+1.6);});
}
function click(accent){
  if(!S.click) return;audio();const t=AC.currentTime;const o=AC.createOscillator();o.frequency.value=accent?1900:1400;const g=AC.createGain();
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(accent?0.35:0.22,t+0.003);g.gain.exponentialRampToValueAtTime(0.0001,t+0.05);o.connect(g);g.connect(chimeBus);o.start(t);o.stop(t+0.06);
}

/* ================= DSP: FFT, McLeod pitch, tone purity ================= */
const FFTC={};
function fftTables(n){
  if(FFTC[n]) return FFTC[n];
  const rev=new Uint32Array(n),bits=Math.round(Math.log2(n));
  for(let i=0;i<n;i++){let r=0,x=i;for(let b=0;b<bits;b++){r=(r<<1)|(x&1);x>>=1;}rev[i]=r;}
  const cos=new Float64Array(n/2),sin=new Float64Array(n/2);
  for(let i=0;i<n/2;i++){cos[i]=Math.cos(2*Math.PI*i/n);sin[i]=Math.sin(2*Math.PI*i/n);}
  return FFTC[n]={rev,cos,sin};
}
function fft(re,im,inv){
  const n=re.length,{rev,cos,sin}=fftTables(n);
  for(let i=0;i<n;i++){const j=rev[i];if(j>i){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t;}}
  for(let size=2;size<=n;size<<=1){
    const half=size>>1,step=n/size;
    for(let i=0;i<n;i+=size){for(let j=0,k=0;j<half;j++,k+=step){
      const wr=cos[k],wi=inv?sin[k]:-sin[k],a=i+j,b=a+half,tr=re[b]*wr-im[b]*wi,ti=re[b]*wi+im[b]*wr;
      re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;
    }}
  }
  if(inv){for(let i=0;i<n;i++){re[i]/=n;im[i]/=n;}}
}
let MINF=110;const MAXF=2400;
function makeAnalyzer(N){
  const M=2*N,aRe=new Float64Array(M),aIm=new Float64Array(M),sRe=new Float64Array(N),sIm=new Float64Array(N);
  const win=new Float64Array(N);for(let i=0;i<N;i++) win[i]=0.42-0.5*Math.cos(2*Math.PI*i/(N-1))+0.08*Math.cos(4*Math.PI*i/(N-1));
  const cs=new Float64Array(N+1),nsdf=new Float64Array(N),db=new Float64Array(N/2);
  const peakAt=(f,bh)=>{const c=Math.round(f/bh);let m=-300;for(let k=Math.max(1,c-2);k<=Math.min(N/2-1,c+2);k++) if(db[k]>m) m=db[k];return m;};
  const med=(lo,hi,bh)=>{lo=Math.max(1,Math.floor(lo/bh));hi=Math.min(N/2-1,Math.ceil(hi/bh));if(hi<lo) return -300;const a=Array.from(db.subarray(lo,hi+1)).sort((p,q)=>p-q);return a[a.length>>1];};
  return function analyze(x,sr){
    let mean=0;for(let i=0;i<N;i++) mean+=x[i];mean/=N;
    let sum=0;for(let i=0;i<N;i++){const v=x[i]-mean;sum+=v*v;}
    const rms=Math.sqrt(sum/N),out={rmsDb:20*Math.log10(rms+1e-12),f:0,clarity:0,hnr:0,hiss:0};
    if(rms<1e-6) return out;
    aRe.fill(0);aIm.fill(0);cs[0]=0;
    for(let i=0;i<N;i++){const v=x[i]-mean;aRe[i]=v;cs[i+1]=cs[i]+v*v;}
    fft(aRe,aIm,false);
    for(let k=0;k<M;k++){aRe[k]=aRe[k]*aRe[k]+aIm[k]*aIm[k];aIm[k]=0;}
    fft(aRe,aIm,true);
    const maxLag=Math.min((N>>1)-2,Math.floor(sr/MINF)+2),minLag=Math.max(2,Math.floor(sr/MAXF)),tot=cs[N];
    for(let t=0;t<=maxLag+1;t++){const m=cs[N-t]+(tot-cs[t]);nsdf[t]=m>0?2*aRe[t]/m:0;}
    let t=1;while(t<maxLag&&nsdf[t]>0) t++;
    const keys=[];let inLobe=false,best=-1,bt=0;
    for(;t<=maxLag;t++){const v=nsdf[t];if(v>0){if(!inLobe){inLobe=true;best=-1;}if(v>best){best=v;bt=t;}}else if(inLobe){inLobe=false;keys.push(bt);}}
    if(inLobe) keys.push(bt);
    let maxV=0;for(const k of keys) if(nsdf[k]>maxV) maxV=nsdf[k];
    let pick=-1;for(const k of keys){if(k>=minLag&&nsdf[k]>=0.88*maxV){pick=k;break;}}
    if(pick<1||maxV<0.3){out.clarity=maxV;return out;}
    const a=nsdf[pick-1],b=nsdf[pick],c=nsdf[pick+1],den=a-2*b+c;
    let sh=den!==0?0.5*(a-c)/den:0;if(Math.abs(sh)>1) sh=0;
    out.f=sr/(pick+sh);out.clarity=Math.min(1,b-0.25*(a-c)*sh);
    for(let i=0;i<N;i++){sRe[i]=(x[i]-mean)*win[i];sIm[i]=0;}
    fft(sRe,sIm,false);
    for(let k=0;k<N/2;k++) db[k]=10*Math.log10(sRe[k]*sRe[k]+sIm[k]*sIm[k]+1e-20);
    const bh=sr/N,f0=out.f,p1=peakAt(f0,bh);
    const p2=peakAt(2*f0,bh),p3=peakAt(3*f0,bh);
    const h1=p1-med(1.3*f0,1.7*f0,bh),h2=p2-med(2.3*f0,2.7*f0,bh);
    out.hnr=Math.max((3*h1+Math.max(h2,h1-25))/4,(h1+3*h2)/4);
    out.hiss=Math.max(p1,p2,p3)-med(3000,Math.min(8000,sr/2-200),bh);
    let ws=0,hs=0;for(let h=1;h*f0<Math.min(5000,sr/2-f0);h++){const pk=peakAt(h*f0,bh),fl=med((h+0.3)*f0,(h+0.7)*f0,bh),w=Math.pow(10,pk/10);ws+=w;hs+=w*(pk-fl);}
    out.hnrW=ws?hs/ws:0;
    return out;
  };
}
function purityScore(r){
  if(!r.f) return 0;
  const sh=(S.strict||0)*2.5;
  if(isVoice()){const vc=clamp((r.clarity-0.8)/0.18,0,1),vh=clamp((r.hnrW-(18+sh))/20,0,1);return Math.round(100*(0.35*vc+0.65*vh));}
  const cl=clamp((r.clarity-0.85)/0.13,0,1),h=clamp((r.hnr-(24+sh))/30,0,1),s=clamp((r.hiss-(30+sh))/30,0,1);
  return Math.round(100*(0.3*cl+0.4*h+0.3*s));
}
const AIRY_BELOW=50;
const purBand=p=>p<AIRY_BELOW?'airy':p<75?'mid':'clear';
const purLabel=p=>p<AIRY_BELOW?'Airy':p<75?'Getting there':'Clear';

/* ================= Tone Coach ================= */
const coach={on:false,stream:null,src:null,hp:null,an:null,buf:null,analyze:null,raf:0,last:0,testing:false,blocked:null,frame:null,view:null,lastView:0,trace:[],subs:new Set(),vsubs:new Set(),fh:{f:[],p:null},override:null,sel:'page'};
const anSize=()=>isVoice()?4096:2048;
function coachInit(){
  audio();
  if(!coach.an){
    coach.an=AC.createAnalyser();coach.an.smoothingTimeConstant=0;
    const sink=AC.createGain();sink.gain.value=0;coach.an.connect(sink);sink.connect(AC.destination);
  }
  const n=anSize();
  if(coach.size!==n){coach.an.fftSize=n;coach.buf=new Float32Array(n);coach.analyze=makeAnalyzer(n);coach.size=n;}
}
async function micStart(){
  coachInit();
  if(coach.on) return true;
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){micBlocked('unsupported');return false;}
  try{coach.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});}
  catch(e){micBlocked(e&&e.name);return false;}
  coach.blocked=null;renderBlocked();
  coach.src=AC.createMediaStreamSource(coach.stream);
  coach.hp=AC.createBiquadFilter();coach.hp.type='highpass';coach.hp.frequency.value=isVoice()?55:90;
  coach.src.connect(coach.hp);coach.hp.connect(coach.an);
  coach.on=true;applyRefMute();startLoop();syncMic();setTimeout(showCalNag,400);track('mic_started');return true;
}
function micStop(){
  if(coach.stream) coach.stream.getTracks().forEach(t=>t.stop());
  try{coach.src&&coach.src.disconnect();coach.hp&&coach.hp.disconnect();}catch(e){}
  coach.stream=null;coach.src=null;coach.hp=null;coach.on=false;coach.frame=null;coach.fh={f:[],p:null};
  endSustain();resetView();coach.view=null;applyRefMute();syncMic();
  coach.subs.forEach(fn=>{try{fn(null);}catch(e){}});coach.vsubs.forEach(fn=>{try{fn(null);}catch(e){}});
}
const micToggle=()=>coach.on?micStop():micStart();
function micBlocked(name){
  track('mic_blocked',{reason:name||'unsupported'});
  let framed=true;try{framed=window.self!==window.top;}catch(e){}
  let msg;
  if(name==='NotFoundError'||name==='OverconstrainedError') msg='No microphone was found. Plug one in or check your sound settings, then press Listen again.';
  else if(!window.isSecureContext) msg='The microphone only works on secure (https) pages. Open this page with an https:// address, or use "Analyze a recording" below.';
  else if(framed) msg='Live listening is blocked because this page is shown inside another page. Open it in its own browser tab and allow the microphone there. Meanwhile, record yourself on your phone and use "Analyze a recording" below.';
  else if(name==='NotAllowedError'||name==='SecurityError') msg='Microphone access was denied. Click the microphone or lock icon in the address bar, allow the microphone, then press Listen again.';
  else msg='This browser can\'t open the microphone here. Try Chrome or Edge, or use "Analyze a recording" below.';
  coach.blocked=msg;renderBlocked();openSheet('coach');
}
function renderBlocked(){
  const b=$('#coachBlocked');b.hidden=!coach.blocked;
  if(coach.blocked) b.innerHTML='<b>Microphone unavailable.</b> '+coach.blocked;
  $('#t1LiveState').textContent=coach.on?'Listening':coach.blocked?'Mic blocked':'Mic off';
}
function startLoop(){if(!coach.raf) coach.raf=requestAnimationFrame(loop);}
function loop(ts){
  coach.raf=0;
  if(!coach.on&&!coach.testing) return;
  if(ts-coach.last>=30){coach.last=ts;coach.an.getFloatTimeDomainData(coach.buf);processFrame(coach.analyze(coach.buf,AC.sampleRate),performance.now());}
  coach.raf=requestAnimationFrame(loop);
}
function buildFrame(raw,t,gate,fh){
  const fr={t,db:raw.rmsDb,loud:raw.rmsDb>gate,f:0,clarity:raw.clarity,purity:0};
  if(fr.loud&&raw.f&&raw.clarity>=0.72){
    fh.f.push(raw.f);if(fh.f.length>5) fh.f.shift();
    fr.f=median(fh.f);
    const p=purityScore(raw);fh.p=fh.p===null?p:fh.p*0.6+p*0.4;fr.purity=Math.round(fh.p);
  }else{fh.f.length=0;fh.p=null;}
  return fr;
}
function nearestNote(f){let best=null,bc=1e9;for(const n of NOTES){const c=1200*Math.log2(f/freqOf(n));if(Math.abs(c)<Math.abs(bc)){bc=c;best=n;}}return{note:best,cents:bc};}
const tuneCls=c=>Math.abs(c)<=15?'intune':c<0?'flat':'sharp';
function classify(fr,tgt){
  if(!fr.loud) return{cls:'silent'};
  if(!fr.f) return{cls:'air'};
  const nn=nearestNote(fr.f),out={near:Math.abs(nn.cents)<=60?nn.note:null,nearCents:nn.cents};
  if(!tgt){out.target=out.near;out.cents=nn.cents;out.cls=!out.near||Math.abs(nn.cents)>50?'between':fr.purity<AIRY_BELOW?'airy':tuneCls(nn.cents);return out;}
  const c=1200*Math.log2(fr.f/freqOf(tgt));out.target=tgt;out.cents=c;
  if(Math.abs(c-1200)<70){out.cls='octave';return out;}
  if(Math.abs(c-1902)<70||Math.abs(c-2400)<70){out.cls='twelfth';return out;}
  if(Math.abs(c)>60){out.cls='wrong';return out;}
  out.cls=fr.purity<AIRY_BELOW?'airy':tuneCls(c);return out;
}
const goodish=fr=>!!fr&&(fr.cls==='intune'||fr.cls==='flat'||fr.cls==='sharp')&&Math.abs(fr.cents)<=25;
const onTarget=fr=>!!fr&&['intune','flat','sharp','airy'].includes(fr.cls);
const TONE={silent:'idle',air:'bad',octave:'bad',twelfth:'bad',wrong:'warn',airy:'warn',flat:'warn',sharp:'warn',intune:'ok',between:'warn'};
function holeHint(t,p){
  const d=[];
  t.holes.forEach((hv,i)=>{const pv=p.holes[i];if(hv===pv) return;
    if(hv===0.5) d.push('half-cover hole '+(i+1));else if(hv>pv) d.push('seal hole '+(i+1));else d.push('lift hole '+(i+1));});
  return d.slice(0,2).join(' and ');
}
function hintFor(fr){
  if(!fr) return{tone:'idle',text:coach.on?`Listening… ${isVoice()?'sing':'play'} a long, steady note.`:'Not listening'};
  const T=fr.target?fr.target.sg:'';
  if(isVoice()) switch(fr.cls){
    case 'silent':return{tone:'idle',text:'Listening… sing a long, steady “aa”.'};
    case 'air':return{tone:'bad',text:'I hear breath but no clear pitch. Sing a little fuller on “aa”.'};
    case 'octave':case 'twelfth':return{tone:'bad',text:'Your voice is an octave above the target. Sing softer and keep the throat relaxed.'};
    case 'wrong':return{tone:'warn',text:fr.near?`You're on ${fr.near.sg} (${fr.near.name}), not ${T}. Tap Hear it, hum the note, then sing.`:`That's ${western(fr.f).name}, not ${T}.`};
    case 'airy':return{tone:'warn',text:'Breathy tone. Use less air and let the sound be fuller, like a gentle hum.'};
    case 'flat':return{tone:'warn',text:'A little flat. Lift the pitch slightly and keep the breath supported.'};
    case 'sharp':return{tone:'warn',text:'A little sharp. Relax and let the pitch settle down.'};
    case 'intune':return{tone:'ok',text:'In tune and clear. Hold it steady!'};
  }
  switch(fr.cls){
    case 'silent':return{tone:'idle',text:'Listening… play a long, steady note.'};
    case 'air':return{tone:'bad',text:'All air, no note. Press every hole flat (check for a leak), then try less air.'};
    case 'octave':return{tone:'bad',text:`Jumped up an octave! Slow the air and open to “Hoo”.`};
    case 'twelfth':return{tone:'bad',text:'Overblown to a high harmonic. Cut the air speed in half.'};
    case 'wrong':{
      const p=fr.near,t=fr.target;
      if(!p) return{tone:'warn',text:`That's ${western(fr.f).name}, not ${T}.`};
      let s=`You're on ${p.sg} (${p.name}), not ${T}.`;
      if(p.over&&!t.over) s+=' Slow the air: you are in the overblown register.';
      else if(!p.over&&t.over) s+=' Use faster, narrower air to overblow.';
      else{const h=holeHint(t,p);if(h) s+=' '+h.charAt(0).toUpperCase()+h.slice(1)+'.';}
      return{tone:'warn',text:s};
    }
    case 'airy':return{tone:'warn',text:'Airy tone. Smaller lip opening, centered on the hole. Less air, not more.'};
    case 'flat':return{tone:'warn',text:'A little flat. Add a touch of air or roll the flute slightly outward.'};
    case 'sharp':return{tone:'warn',text:'A little sharp. Ease the air or roll the flute slightly inward.'};
    case 'intune':return{tone:'ok',text:'In tune and clear. Hold it!'};
    case 'between':return{tone:'warn',text:`That's ${western(fr.f).name}, between the notes of your scale.`};
  }
  return{tone:'idle',text:''};
}
function currentTarget(){
  if(coach.override) return coach.override;
  if(coach.sel!=='page') return NOTE[coach.sel];
  return activeTab==='flute'&&!T1.follow?NOTE[T1.sel]:null;
}
function processFrame(raw,now){
  const fr=buildFrame(raw,now,S.gate,coach.fh);
  Object.assign(fr,classify(fr,currentTarget()));
  checkMismatch(fr);
  coach.frame=fr;coach.trace.push(fr);
  while(coach.trace.length&&now-coach.trace[0].t>9000) coach.trace.shift();
  trackSustain(fr);trackClear(fr);
  coach.subs.forEach(fn=>{try{fn(fr);}catch(e){console.error(e);}});
  const u=updateView(fr);
  if(u.changed||now-coach.lastView>=200){coach.lastView=now;coach.view=u.v;coach.vsubs.forEach(fn=>{try{fn(u.v);}catch(e){console.error(e);}});}
}
/* Display smoothing: the screen shows a steadied version of the detector so text doesn't flicker.
   Pitch and purity are averaged, short gaps (breaths, single bad frames) are bridged,
   and a new state (note or verdict) must hold for ~0.45 s before the screen switches to it. */
const V={key:null,pkey:null,pt:0,f:0,pur:null,lastLoud:-1e9,lastPitch:-1e9,shown:null};
function resetView(){V.tid=undefined;V.key=V.pkey=null;V.f=0;V.pur=null;V.shown=null;V.lastLoud=V.lastPitch=-1e9;}
function updateView(fr){
  const now=fr.t;let changed=false;
  if(fr.loud) V.lastLoud=now;
  if(fr.f){
    const jump=!V.f||Math.abs(1200*Math.log2(fr.f/V.f))>70;
    V.f=jump?fr.f:V.f*0.7+fr.f*0.3;V.pur=(V.pur===null||jump)?fr.purity:V.pur*0.85+fr.purity*0.15;V.lastPitch=now;
  }else if(now-V.lastPitch>300){V.f=0;V.pur=null;}
  const sm={t:now,db:fr.db,loud:now-V.lastLoud<350,f:V.f,clarity:fr.clarity,purity:V.pur===null?0:Math.round(V.pur)};
  Object.assign(sm,classify(sm,currentTarget()));
  const tgt=currentTarget(),tid=tgt?tgt.id:null,tgtChanged=V.tid!==undefined&&V.tid!==tid;V.tid=tid;
  const key=sm.cls+'|'+(sm.near?sm.near.id:'');
  if(V.key===null||key===V.key||tgtChanged){changed=V.key!==key||tgtChanged;V.key=key;V.pkey=null;V.shown=sm;}
  else{
    if(V.pkey!==key){V.pkey=key;V.pt=now;}
    if(now-V.pt>=450){V.key=key;V.pkey=null;V.shown=sm;changed=true;}
  }
  return{v:V.shown,changed};
}
const sus={note:null,t0:0,last:0,dur:0};
function trackSustain(fr){
  const now=fr.t;
  if(goodish(fr)&&fr.target){
    if(sus.note!==fr.target.id||now-sus.last>250){endSustain();sus.note=fr.target.id;sus.t0=now;}
    sus.last=now;sus.dur=now-sus.t0;
  }else if(sus.note&&now-sus.last>250) endSustain();
}
function endSustain(){
  if(sus.note&&sus.dur>1000&&sus.dur>(bests[sus.note]||0)){bests[sus.note]=Math.round(sus.dur);store.set('bests:'+curId(),bests);renderBests();}
  sus.note=null;sus.dur=0;
}
const susFor=id=>sus.note===id?sus.dur:0;
const clr={on:false,t0:0,last:0,dur:0};
function trackClear(fr){
  const now=fr.t;
  if(fr.f&&fr.purity>=AIRY_BELOW){
    if(!clr.on||now-clr.last>250){clr.on=true;clr.t0=now;}
    clr.last=now;clr.dur=now-clr.t0;
    if(clr.dur>(day.longest||0)) day.longest=Math.round(clr.dur);
  }else if(clr.on&&now-clr.last>250){clr.on=false;clr.dur=0;saveDay();}
}
function steadiness(){
  const now=performance.now(),fs=coach.trace.filter(f=>f.f&&f.near&&now-f.t<2000);
  if(fs.length<12) return null;
  const ref=fs[fs.length-1].near,cs=fs.filter(f=>f.near===ref).map(f=>1200*Math.log2(f.f/freqOf(ref)));
  if(cs.length<12) return null;
  const m=avg(cs);return Math.sqrt(avg(cs.map(c=>(c-m)*(c-m))));
}

/* ================= pitch trace ================= */
let COL=null;
function cols(){if(!COL){const cs=getComputedStyle(document.documentElement),g=k=>cs.getPropertyValue(k).trim();COL={ok:g('--ok'),acc:g('--accent'),warn:g('--warn'),bad:g('--bad'),muted:g('--muted'),line:'rgba(216,180,118,.16)',cream:g('--cream'),band:'rgba(127,206,145,.16)',lowband:'rgba(214,176,114,.06)'};}return COL;}
function drawTrace(cv,frames,tEnd,span,target){
  const dpr=window.devicePixelRatio||1,W=cv.clientWidth,H=cv.clientHeight;if(!W||!H) return;
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);}
  const g=cv.getContext('2d'),C=cols();g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
  const lo=-6.5,hi=13.5,padL=40,padB=12,y=s=>(H-padB)-(clamp(s,lo,hi)-lo)/(hi-lo)*(H-padB-6),sa=saEff();
  const semOf=f=>12*Math.log2(f/sa);
  g.fillStyle=C.lowband;g.fillRect(padL,y(-0.5),W-padL,y(lo)-y(-0.5));
  if(target){const s=semOf(freqOf(target));g.fillStyle=C.band;g.fillRect(padL,y(s+0.25),W-padL,Math.max(2,y(s-0.25)-y(s+0.25)));}
  g.font='600 12px Eczar, Georgia, serif';g.textBaseline='middle';
  for(const n of NOTES){const yy=y(semOf(freqOf(n)));g.strokeStyle=C.line;g.lineWidth=1;g.beginPath();g.moveTo(padL,yy);g.lineTo(W,yy);g.stroke();g.fillStyle=target&&target.id===n.id?C.ok:n.semi<0?'#D6B072':n.over?C.acc:C.muted;g.fillText(n.sg,4,yy);}
  const x=t=>padL+(t-(tEnd-span))/span*(W-padL);
  let prev=null;
  for(const fr of frames){
    if(fr.t<tEnd-span) continue;
    const xx=x(fr.t);
    if(fr.f){
      const yy=y(semOf(fr.f)),col=fr.purity>=75?C.ok:fr.purity>=AIRY_BELOW?C.acc:C.warn;
      if(prev&&fr.t-prev.t<120){g.strokeStyle=col;g.lineWidth=2.5;g.beginPath();g.moveTo(prev.x,prev.y);g.lineTo(xx,yy);g.stroke();}
      else{g.fillStyle=col;g.beginPath();g.arc(xx,yy,2,0,7);g.fill();}
      prev={t:fr.t,x:xx,y:yy};
    }else{prev=null;if(fr.loud){g.fillStyle=C.muted;g.fillRect(xx-1,H-padB+3,2.5,7);}}
  }
}

/* ================= flute drawing ================= */
const HX=[470,545,620,735,810,885],BX=170;
const FING=['L index','L middle','L ring','R index','R middle','R ring'];
let fuid=0;
const holeWord=v=>v===1?'closed':v===0.5?'half':'open';
function fluteSVG(holes,{labels=true,leak=false,over=false}={}){
  const u='fl'+(++fuid),H=labels?200:112,cy=labels?96:56,top=cy-27;
  let s=`<svg viewBox="0 0 1000 ${H}" role="img" aria-label="Fingering, hole 1 to 6: ${holes.map(holeWord).join(', ')}"><defs>
<linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A3F1D"/><stop offset=".15" stop-color="#B38A4D"/><stop offset=".33" stop-color="#EDD49E"/><stop offset=".55" stop-color="#CBA161"/><stop offset=".85" stop-color="#8A6331"/><stop offset="1" stop-color="#4B3417"/></linearGradient>
<radialGradient id="${u}p" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#FFE0AE"/><stop offset=".55" stop-color="#EBA954"/><stop offset="1" stop-color="#A9692A"/></radialGradient>
<radialGradient id="${u}h" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="#090604"/><stop offset=".72" stop-color="#22150A"/><stop offset="1" stop-color="#5C401D"/></radialGradient>
<clipPath id="${u}c"><rect x="24" y="${top}" width="952" height="54" rx="27"/></clipPath></defs>`;
  s+=`<rect x="24" y="${top}" width="952" height="54" rx="27" fill="url(#${u}b)"/>`;
  s+=`<g clip-path="url(#${u}c)"><g stroke="#3B2810" stroke-opacity=".2" stroke-width="1.2">${[9,16,39,46].map(d=>`<path d="M24 ${top+d}H976"/>`).join('')}</g>`;
  [345,678].forEach(x=>{s+=`<rect x="${x-4}" y="${top}" width="7" height="54" fill="#5E421F" opacity=".75"/><rect x="${x+3}" y="${top}" width="3" height="54" fill="#F5E0B0" opacity=".35"/>`;});
  [62,926].forEach(x=>{s+=`<rect x="${x}" y="${top}" width="32" height="54" fill="#9C362E"/>${[4,11,18,25].map(d=>`<rect x="${x+d}" y="${top}" width="2.5" height="54" fill="#E8C47C" opacity=".85"/>`).join('')}`;});
  s+=`</g><ellipse cx="${BX}" cy="${cy}" rx="18" ry="13" fill="url(#${u}h)" stroke="#3A2610" stroke-width="2"/>`;
  holes.forEach((v,i)=>{const x=HX[i];
    s+=`<circle cx="${x}" cy="${cy}" r="15" fill="url(#${u}h)" stroke="#3A2610" stroke-width="2"/>`;
    if(v===1) s+=`<circle cx="${x}" cy="${cy}" r="19.5" fill="url(#${u}p)" stroke="#FBE6BC" stroke-width="2"/>`;
    else if(v===0.5) s+=`<path d="M${x} ${cy-19.5}A19.5 19.5 0 0 0 ${x} ${cy+19.5}Z" fill="url(#${u}p)" stroke="#FBE6BC" stroke-width="2"/>`;
  });
  if(leak) [3,4].forEach(i=>{s+=`<circle cx="${HX[i]}" cy="${cy}" r="25" fill="none" stroke="#F58A3A" stroke-width="3"/><circle class="leak-ring" cx="${HX[i]}" cy="${cy}" r="25" fill="none" stroke="#F58A3A" stroke-width="3"/>`;});
  if(labels){
    s+=`<text x="${BX}" y="${top-14}" class="fl-lab" text-anchor="middle">BLOW</text>`;
    const br=(x1,x2,txt)=>`<path d="M${x1} ${top-10}V${top-16}H${x2}V${top-10}" fill="none" stroke="#AFAAC4" stroke-opacity=".5" stroke-width="1.5"/><text x="${(x1+x2)/2}" y="${top-24}" class="fl-lab" text-anchor="middle">${txt}</text>`;
    s+=br(HX[0]-22,HX[2]+22,'LEFT HAND')+br(HX[3]-22,HX[5]+22,'RIGHT HAND');
    HX.forEach((x,i)=>{s+=`<text x="${x}" y="${cy+62}" class="fl-num" text-anchor="middle">${i+1}</text><text x="${x}" y="${cy+88}" class="fl-fing" text-anchor="middle">${FING[i]}</text>`;});
    if(over) s+=`<g transform="translate(${BX+42},${top-40})"><rect width="154" height="30" rx="15" fill="#EBB453"/><text x="77" y="20.5" text-anchor="middle" class="fl-over">OVERBLOW ↑</text></g>`;
  }
  return s+'</svg>';
}
const holesFor=k=>[0,1,2,3,4,5].map(i=>i<k?1:0);
function stripHTML(holes,warn){
  return holes.map((v,i)=>{
    const g=v===1?'●':v===0.5?'◐':'○';
    return (i===3?'<span></span>':'')+`<div class="cell ${warn&&(i===3||i===4)?'warn':''}"><span class="g ${holeWord(v)}">${g}</span><span class="w">${i+1} · ${v===1?'Closed':v===0.5?'Half':'Open'}</span><span class="f">${FING[i]}</span></div>`;
  }).join('');
}
const AIM_TXT={deep:'Aim deeper into the hole. Split the air about 50/50 on the far edge.',low:'Aim slightly into the hole with warm, slow air.',mid:'Aim straight at the far edge with a steady stream.',high:'Aim higher, more across the far edge, with a narrow stream.',top:'Aim across the far edge. Keep the stream narrow and fast.'};
function angleSVG(aim){
  const T={deep:[201,96],low:[205,88],mid:[209,79],high:[214,69],top:[218,62]}[aim];
  const split={deep:[5,5],low:[5.5,4],mid:[4.5,4.5],high:[3,6],top:[2.5,6.5]}[aim];
  const sx=70,sy=70,ang=Math.atan2(T[1]-sy,T[0]-sx),ah=(a,len)=>[T[0]-len*Math.cos(ang+a),T[1]-len*Math.sin(ang+a)];
  const p1=ah(0.45,13),p2=ah(-0.45,13);
  return `<svg class="angle-svg" viewBox="0 0 300 175" role="img" aria-label="${AIM_TXT[aim]}">
<path d="M209.4 70.3A46 46 0 1 1 170.6 70.3" fill="#1A1108" stroke="#C9A263" stroke-width="12" stroke-linecap="round"/>
<text x="190" y="125" text-anchor="middle" style="fill:var(--muted);font:500 12px var(--f-body)">into the hole</text>
<path d="M18 52q22-14 46 6q-22 4-46-6z" fill="#C97B6A"/><path d="M18 88q22 14 46-6q-22-4-46 6z" fill="#B86A5B"/>
<line x1="${sx}" y1="${sy}" x2="${T[0]}" y2="${T[1]}" stroke="#EBB453" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 9"/>
<path d="M${T[0]} ${T[1]}L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}L${p2[0].toFixed(1)} ${p2[1].toFixed(1)}Z" fill="#EBB453"/>
<path d="M212 74q4 18-10 34" fill="none" stroke="#7FCE91" stroke-width="${split[0]}" stroke-linecap="round" opacity=".85"/>
<path d="M214 66q22-10 46-8" fill="none" stroke="#7FCE91" stroke-width="${split[1]}" stroke-linecap="round" opacity=".85"/>
<text x="262" y="50" text-anchor="end" style="fill:var(--muted);font:500 12px var(--f-body)">across the edge</text>
<text x="40" y="118" text-anchor="middle" style="fill:var(--muted);font:500 12px var(--f-body)">lips</text>
</svg>`;
}

/* ================= top bar ================= */
const IC={
  play:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>',
  pause:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
  stop:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>',
  mic:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  drone:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5v12"/><circle cx="12" cy="18" r="3.5"/><path d="M9.5 5.5h5M9.5 8.5h5"/></svg>',
  speaker:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>'
};
function buildRefs(){
  const el=$('#refs');let h='';
  GROUPS.forEach((g,gi)=>{if(gi) h+='<span class="sep" aria-hidden="true"></span>';g.ids.forEach(id=>{const n=NOTE[id];h+=`<button class="ref ${noteClass(n)}" data-ref="${id}" aria-pressed="false" title="Play ${n.name}"><b>${n.sg}</b><small></small></button>`;});});
  el.innerHTML=h;
}
function labelRefs(){$$('#refs .ref').forEach(b=>{b.querySelector('small').textContent=western(freqOf(NOTE[b.dataset.ref])).name;});}
function syncRefs(){
  $$('#refs .ref').forEach(b=>b.setAttribute('aria-pressed',b.dataset.ref===ref.id));
  const hear=$('#t1Hear');if(hear){const on=ref.id===T1.sel;hear.innerHTML=(on?IC.stop+'Stop':IC.speaker+'Hear it');hear.setAttribute('aria-pressed',on);}
  syncHpTip();
}
function syncDrone(){
  const b=$('#droneBtn');b.innerHTML=IC.drone+(drone.on?'Tanpura on':'Tanpura');b.setAttribute('aria-pressed',drone.on);
  const g=$('#gdDrone');if(g) g.setAttribute('aria-pressed',drone.on);
  const r=$('#rzDrone');if(r){r.setAttribute('aria-pressed',drone.on);r.innerHTML=IC.drone+(drone.on?'Stop tanpura':'Start tanpura');}
  syncHpTip();
}
function syncMic(){
  $$('[data-mic]').forEach(b=>{b.innerHTML=IC.mic+(coach.on?'Stop listening':'Listen');b.setAttribute('aria-pressed',coach.on);});
  $('#t1LiveOff').hidden=coach.on;$('#t1LiveOn').hidden=!coach.on;
  renderBlocked();chipUpdate(coach.view);syncHpTip();
}
function syncHpTip(){const show=coach.on&&(drone.on||!!ref.id);$('#hpTip').hidden=!show;$('#hpTip2').hidden=!show;}
const instLabel=()=>isVoice()?'Voice':FL().name+(FL().len?` · ${FL().len} cm`:'');
function syncSaLabel(){
  const v=isVoice(),fl=FL(),w=western(saEff()),t=`${w.name}${w.cents?(' '+centsTxt(w.cents)):''}${v?' ('+harmName(saEff())+')':''} · ${saEff().toFixed(2)} Hz`;
  $('#saLabel').textContent=t;
  const how=fl.cal==='picked'?'set by you':fl.cal?'measured':v?'default':fl.len?'estimated from length':'estimated from key';
  $('#setSa').textContent=`${t} · ${how}`;
  $('#fluteName').textContent=instLabel();const sn=$('#setInstName');if(sn) sn.textContent=instLabel();
  $('#calBtn').textContent=v?'Find my comfortable Sa':'Find my Sa';
  $('#calResetTxt').textContent=v?'Reset to default':'Reset to estimate';
  $('#calResetRef').textContent=v?'C#3':western(fl.est||392).name;
  buildInstSel();
}
function buildInstSel(){
  const sel=$('#instSel');if(!sel) return;
  const h=S.inst.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')+'<option value="__manage">Add or edit instruments…</option>';
  if(sel.dataset.h!==h){sel.innerHTML=h;sel.dataset.h=h;}
  sel.value=S.cur;
}
const nagged=new Set();
function showCalNag(force){
  if((!coach.on&&!force)||FL().cal||nagged.has(curId())||!$('#saBanner').hidden||$('#calBtn').disabled) return;
  nagged.add(curId());const b=$('#saBanner'),w=western(saEff());
  if(isVoice()){b.innerHTML=`<p><b>Choose your singing Sa.</b> Right now it's a default (${w.name}, ${harmName(saEff())}). Pick the one closest to your voice, or let me find a comfortable Sa from your range.</p><div class="row"><button class="btn" id="bnLow">Lower voice · Sa C#3 (Kali 1)</button><button class="btn" id="bnHigh">Higher voice · Sa A3 (Safed 6)</button><button class="btn primary" id="bnFind">Find my comfortable Sa</button><button class="btn" id="bnHide">Later</button></div>`;b.hidden=false;return;}
  const fl=FL(),src=fl.len?`its ${fl.len} cm length`:`its key`;
  b.innerHTML=`<p>Your <b>${esc(fl.name)}</b>'s Sa is an estimate from ${src} (${w.name}, ${Math.round(saEff())} Hz). Makers differ, so run <b>Find my Sa</b> once to match every note, the tanpura and the tuner to your flute. It takes about 10 seconds.</p><div class="row"><button class="btn primary" id="bnFind">Find my Sa</button><button class="btn" id="bnHide">Later</button></div>`;
  b.hidden=false;
}
function setInstrument(id,quiet){
  if(VOICE||!S.inst.some(x=>x.id===id)||id===S.cur){buildInstSel();return;}
  endSustain();if(D.started) gdReset();if(F.running) fStop(true);blkPause();
  S.cur=id;saveS();bests=loadBests(id);hideSaBanner();
  syncSettings();retune();renderBests();renderInstSheet();showCalNag();
  if(!quiet) toast(`${FL().name} selected. Sa is ${western(saEff()).name} (${saEff().toFixed(2)} Hz).`);
}
/* ---------- instrument manager ---------- */
const A={key:null,m:null,nameDirty:false,armed:null};
function renderInstSheet(){
  const list=$('#instList');if(!list) return;
  const row=(id,name,sub,isCur,canRemove)=>`<div class="inst ${isCur?'cur':''}"><div style="min-width:0"><input type="text" value="${esc(name)}" data-rename="${esc(id)}" maxlength="32" aria-label="Name"><small>${sub}</small></div><div class="row">${isCur?'<span class="pill">In use</span>':`<button class="btn" data-use="${esc(id)}">Use</button>`}${canRemove?`<button class="btn" data-remove="${esc(id)}">${A.armed===id?'Tap again to remove':'Remove'}</button>`:''}</div></div>`;
  const subFor=x=>{const w=western(x.sa*Math.pow(2,(x.fine||0)/1200));return `Sa ${w.name} · ${x.sa.toFixed(1)} Hz · ${x.cal==='picked'?'set by you':x.cal?'measured':'estimate'}${x.len?' · '+x.len+' cm':''}`;};
  list.innerHTML=S.inst.map(x=>row(x.id,x.name,subFor(x),S.cur===x.id,S.inst.length>1)).join('');
}
function renderAddForm(){
  $('#addKeys').innerHTML=KEYS.map(k=>`<button data-addkey="${k}" aria-pressed="${A.key===k}" title="${k.includes('#')?k+' / '+KEYS[KEYS.indexOf(k)+1]+'b':k}">${k}</button>`).join('')+`<button class="wide" data-addkey="?" aria-pressed="${A.key==='?'}">Not sure</button>`;
  const wrap=$('#addSizeWrap'),len=parseFloat($('#addLen').value)||0;
  if(!A.key||A.key==='?'){wrap.hidden=true;}
  else{
    const opts=keyOptions(A.key);
    if(len) A.m=opts.reduce((b,o)=>Math.abs(Math.log(o.len/len))<Math.abs(Math.log(b.len/len))?o:b,opts[0]).m;
    if(!opts.some(o=>o.m===A.m)) A.m=opts.reduce((b,o)=>Math.abs(Math.log(o.len/55))<Math.abs(Math.log(b.len/55))?o:b,opts[0]).m;
    $('#addSizes').innerHTML=opts.map(o=>`<label class="size"><input type="radio" name="addSize" value="${o.m}" ${o.m===A.m?'checked':''}><span><b>${o.name}</b> · ${o.reg} · about ${o.len} cm</span></label>`).join('');
    wrap.hidden=false;
  }
  const est=len?estFor(len):null;
  $('#addHint').textContent=!A.key?'Choose the key printed or written on your flute.':A.key==='?'?(est?`A ${len} cm flute usually has its Sa near ${western(est).name}. Find my Sa will measure it exactly.`:'Type the length if you can, or just add it and let Find my Sa measure it.'):'Not sure of the size? Measure the flute end to end and type the length; the closest size is picked.';
  if(!A.nameDirty) $('#addName').value=addDefaultName();
  $('#addGo').disabled=!A.key;
}
function addDefaultName(){
  if(!A.key) return '';
  if(A.key==='?') return 'My flute';
  const o=keyOptions(A.key).find(x=>x.m===A.m);return o?`${A.key} ${o.reg}`:A.key;
}
function uniqueName(n){let k=n,i=2;while(S.inst.some(x=>x.name===k)) k=`${n} ${i++}`;return k;}
function addFlute(){
  if(!A.key) return;
  const len=parseFloat($('#addLen').value)||null;
  let sa;
  if(A.key==='?') sa=len?estFor(len):392;
  else{const o=keyOptions(A.key).find(x=>x.m===A.m)||keyOptions(A.key)[0];sa=o.f;}
  const name=uniqueName(($('#addName').value||'').trim()||addDefaultName());
  const id=newId();
  S.inst.push({id,name,key:A.key,len:len?Math.round(len*2)/2:null,sa,est:sa,fine:0,cal:false});track('flute_added',{key:A.key});
  S.inst=S.inst.filter(x=>!(x.demo&&!x.cal));
  welcomeDone();
  A.key=null;A.m=null;A.nameDirty=false;$('#addLen').value='';$('#addName').value='';
  setInstrument(id,true);renderAddForm();renderInstSheet();
  toast(`${name} added. Sa is ${western(saEff()).name} for now.`);
  if($('#addMeasure').checked) findSa();
}
function removeInst(id){
  if(S.inst.length<2) return;
  if(A.armed!==id){A.armed=id;renderInstSheet();setTimeout(()=>{if(A.armed===id){A.armed=null;renderInstSheet();}},3000);return;}
  A.armed=null;const x=S.inst.find(i=>i.id===id);if(!x) return;
  S.inst=S.inst.filter(i=>i.id!==id);store.del('bests:'+id);
  if(S.cur===id) setInstrument(S.inst[0].id,true);
  saveS();syncSaLabel();renderInstSheet();toast(`${x.name} removed.`);
}
/* ---------- backup ---------- */
function exportData(){
  saveDay();saveS();
  const data={};
  try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('bansuri:')) data[k.slice(8)]=JSON.parse(localStorage.getItem(k));}}catch(e){}
  const json=JSON.stringify({app:'bansuri-companion',version:2,exported:new Date().toISOString(),data},null,1);
  const out=$('#bkOut');
  try{
    const url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');
    a.href=url;a.download=`${VOICE?'singing':'bansuri'}-companion-backup-${keyFor(0)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
  }catch(e){}
  out.innerHTML='<p class="muted" style="font-size:.85rem">If no file appeared, copy the backup instead and keep it in a note.</p><button class="btn" id="bkCopy">Copy backup text</button>';
  $('#bkCopy').onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(json).then(()=>toast('Backup copied.'),()=>toast('Copy was blocked in this view.'));};
}
function importData(file){
  const out=$('#bkOut');
  file.text().then(txt=>{
    const j=JSON.parse(txt);
    if(!j||j.app!=='bansuri-companion'||typeof j.data!=='object') throw new Error('not a backup');
    if(!storageOK) throw new Error('storage');
    Object.entries(j.data).forEach(([k,v])=>localStorage.setItem('bansuri:'+k,JSON.stringify(v)));
    out.innerHTML='<p><b>Restored.</b> Reloading…</p>';setTimeout(()=>location.reload(),700);
  }).catch(e=>{out.innerHTML=`<p class="muted">${e&&e.message==='storage'?'This view can\'t save data, so the backup can\'t be restored here.':'That file isn\'t a Bansuri or Singing Companion backup.'}</p>`;});
}
function applyInstrument(){
  const v=isVoice();document.body.classList.toggle('voice',v);
  MINF=v?65:110;
  if(coach.an) coachInit();
  if(coach.hp) coach.hp.frequency.value=v?55:90;
  coach.fh={f:[],p:null};resetView();
  $('#tb-flute').textContent=v?'Swara trainer':'Flute & fingering';
  const fb=$('#t1Mode [data-t1mode="follow"]');if(fb) fb.textContent=v?'Follow my singing':'Follow my playing';
  $$('.verb').forEach(e=>e.textContent=v?'sing':'play');
  $('#gdLede').textContent=v?'Step down from Sa to low Pa one note at a time, staying relaxed and steady. This kharaj (low-note) drill builds a full, settled voice. In Listen mode the ring only fills while you are on the note.':'Lower one finger at a time and slow the air as you go. In Listen mode the ring only fills while you\'re really on the note.';
  symSel='A';buildPicker();buildFix();
  BLOCKS=v?BLOCKS_V:BLOCKS_F;day=loadDay(dayKey);buildBlocks();renderWeek();
  syncGdSettings();renderT1();
}
function retune(){
  syncSaLabel();labelRefs();renderT1();
  if(ref.osc) ref.osc.frequency.setTargetAtTime(freqOf(NOTE[ref.id]),AC.currentTime,0.02);
}
function chipUpdate(fr){
  const c=$('#coachChip'),nn=$('#ccNote'),cc=$('#ccCents'),bar=$('#ccBar');
  if(!coach.on){c.dataset.tone='off';setT(nn,'Off');setT(cc,'Tone Coach');bar.style.width='0';return;}
  if(egMasked()){c.dataset.tone='idle';setT(nn,'?');setT(cc,'ear test');bar.style.width='0';return;}
  if(!fr||!fr.loud){c.dataset.tone='idle';setT(nn,'—');setT(cc,'listening');bar.style.width='0';return;}
  if(fr.cls==='air'){c.dataset.tone='bad';setT(nn,'air');setT(cc,'no note');bar.style.width='0';return;}
  c.dataset.tone=TONE[fr.cls];
  const n=fr.near;setT(nn,n?n.sg:western(fr.f).name);
  setT(cc,(fr.cls==='octave'||fr.cls==='twelfth')?'jumped up':centsTxt(n?fr.nearCents:western(fr.f).cents));
  bar.style.width=fr.purity+'%';bar.style.background=fr.purity>=75?'var(--ok)':fr.purity>=AIRY_BELOW?'var(--accent)':'var(--warn)';
}

/* ================= Tab 1 ================= */
const T1={sel:NOTE[store.get('t1sel','ldha')]?store.get('t1sel','ldha'):'ldha',glow:false,follow:!!store.get('t1follow',false)};
function buildPicker(){
  $('#t1Picker').innerHTML=GROUPS.map(g=>`<div class="pick-group"><span class="eyebrow">${isVoice()&&g.ids[0]==='mpa'?'Upper · Pa to Sa\'':g.label}</span><div class="pick-row">${g.ids.map(id=>{const n=NOTE[id];return `<button class="pick ${noteClass(n)}" role="radio" data-pick="${id}" aria-checked="false" title="${n.name}">${n.sg}</button>`;}).join('')}</div></div>`).join('');
}
function renderT1(){
  const n=NOTE[T1.sel],f=freqOf(n),w=western(f),leak=n.id==='lpa'||n.id==='ldha';
  $('#t1Sg').textContent=n.sg;$('#t1Dev').textContent=n.dev;$('#t1Name').textContent=n.name;
  $('#t1West').textContent=`${w.name} · ${f.toFixed(1)} Hz`;$('#t1Over').hidden=!n.over||isVoice();
  $$('#t1Picker .pick').forEach(b=>b.setAttribute('aria-checked',b.dataset.pick===n.id));
  $$('#t1Mode button').forEach(b=>b.setAttribute('aria-pressed',(b.dataset.t1mode==='follow')===T1.follow));
  $('#t1Eyebrow').textContent=T1.follow?(isVoice()?'Following your singing':'Following your playing'):'Target note (the one you picked)';
  $('#t1Flute').innerHTML=fluteSVG(n.holes,{leak,over:n.over});
  $('#t1Strip').innerHTML=stripHTML(n.holes,leak);$('#t1Leak').hidden=!leak;
  $('#t1Air').style.width=n.air+'%';$('#t1AirPct').textContent=n.air+'%';$('#t1Mouth').textContent=n.mouth;$('#t1Cue').textContent=n.cue;
  $('#t1Angle').innerHTML=angleSVG(n.aim);$('#t1AngleTxt').textContent=AIM_TXT[n.aim];
  $$('.t1-inline-name').forEach(e=>e.textContent=n.name);
  $('#t1Best').textContent=bests[n.id]?secs(bests[n.id]):'—';
  if(isVoice()){const vt=VTIPS[n.id],rg=VREG[vt.r];$('#t1VTip').textContent=vt.tip;$('#t1VReg').textContent=rg.reg;$('#t1VHow').textContent=rg.how;drawLadder();}
  syncRefs();
}
const VREG={low:{reg:'Mandra · chest',how:'Low notes: relax the jaw and throat and let the sound sit in your chest. Use less breath as you go down, not more.'},mid:{reg:'Madhya',how:'Middle notes: speak-sing on “aa” with steady breath from the belly. Match the tanpura before you add volume.'},high:{reg:'Upper · lift',how:'Upper notes: lift the soft palate (the start of a yawn), keep the throat low and relaxed, and don\'t reach up with your chin.'}};
const VTIPS={
  lpa:{r:'low',tip:'Low Pa is the tanpura\'s lowest string. Hum it first with lips closed, then open gently to “aa”.'},
  ldha:{r:'low',tip:'Drop the jaw a little more and keep the tone warm. Don\'t push to make it louder.'},
  lni:{r:'low',tip:'Ni leans toward Sa. Keep it close below Sa; it often slips flat.'},
  sa:{r:'mid',tip:'Your home note. Sing it with the tanpura and adjust until the wavering (beats) between you disappears.'},
  re:{r:'mid',tip:'A small step up from Sa. Keep the same open “aa” and steady breath.'},
  ga:{r:'mid',tip:'Ga blends with the tanpura when it sits a little lower than a piano note. Listen for it to lock in.'},
  ma:{r:'mid',tip:'Ma is easy to sing sharp. Keep it relaxed and a touch lower.'},
  mpa:{r:'high',tip:'Pa is the tanpura\'s other string, so it should feel locked and still. Don\'t push volume.'},
  mdha:{r:'high',tip:'Keep the mouth open on “aa” (not “ee”) and the breath steady as you rise.'},
  mni:{r:'high',tip:'Ni pulls toward upper Sa. Aim slightly higher than feels natural; it often goes flat.'},
  hsa:{r:'high',tip:'Upper Sa: place it forward instead of reaching up. If it strains, practise up to Ni for now.'}
};
function drawLadder(){if(isVoice()&&activeTab==='flute'){const cv=$('#t1Ladder');if(cv) drawTrace(cv,coach.trace,performance.now(),8000,currentTarget()||NOTE[T1.sel]);}}
function t1Live(fr){
  if(activeTab!=='flute') return;
  if(T1.follow&&fr&&fr.f&&fr.near&&fr.near.id!==T1.sel&&onTarget(fr)){T1.sel=fr.near.id;T1.glow=false;$('#t1Stage').classList.remove('glow');$('#t1Live').classList.remove('glow');renderT1();}
  const hn=$('#t1Heard');
  setT(hn,fr&&fr.f?(fr.near?fr.near.sg:western(fr.f).name):(fr&&fr.cls==='air'?'air':'—'));
  hn.dataset.tone=!fr||!fr.loud?'idle':fr.cls==='air'?'bad':fr.target&&fr.target.id===T1.sel?TONE[fr.cls]:'warn';
  const n=NOTE[T1.sel],needle=$('#t1Needle'),h=hintFor(fr);
  setT('#t1Hint',h.text);$('#t1Hint').dataset.tone=h.tone;
  if(fr&&fr.f&&fr.target&&fr.target.id===n.id&&onTarget(fr)){needle.style.left=(50+clamp(fr.cents,-50,50))+'%';needle.dataset.tone=TONE[fr.cls];setT('#t1CentsTxt',centsTxt(fr.cents));}
  else{needle.style.left='50%';needle.dataset.tone='';setT('#t1CentsTxt',fr&&fr.cls==='wrong'?'off target':'0¢');}
  const p=fr&&fr.f?fr.purity:0;$('#t1Pur').style.width=p+'%';$('#t1PurM').dataset.band=purBand(p);setT('#t1PurN',fr&&fr.f?`${Math.round(p/5)*5} · ${purLabel(p)}`:'—');
  setT('#t1Hz',fr&&fr.f?`${fr.f.toFixed(1)} Hz · ${western(fr.f).name}`:'');
  const d=susFor(n.id);setT('#t1Hold',secs(d));
  setT('#t1Best',Math.max(bests[n.id]||0,d)?secs(Math.max(bests[n.id]||0,d)):'—');
  const glow=d>=2000;if(glow!==T1.glow){T1.glow=glow;$('#t1Stage').classList.toggle('glow',glow);$('#t1Live').classList.toggle('glow',glow);}
  const gh=$('#t1Ghost');
  if(!isVoice()&&fr&&fr.near&&fr.near.id!==n.id&&(fr.cls==='wrong'||fr.cls==='octave'||fr.cls==='twelfth')){
    if(gh.dataset.id!==fr.near.id){gh.dataset.id=fr.near.id;setT('#t1GhostName',`${fr.near.sg} (${fr.near.name})`);$('#t1GhostFlute').innerHTML=fluteSVG(fr.near.holes,{labels:false});}
    gh.hidden=false;
  }else gh.hidden=true;
}

/* ================= Tab 2: Gravity Drop ================= */
const PHASES=[
  {key:'inhale',title:'Inhale',dur:4,note:null,holes:3,vtext:'Deep belly breath. Shoulders down, jaw loose, neck long.',text:'Deep belly breath. Relax your right shoulder and bring your right elbow slightly forward.'},
  {key:'sa',title:'Soft Sa',dur:4,note:'sa',holes:3,vtext:'Sing Sa on “aa” at about half volume. Match the tanpura.',text:'Play Sa at about half volume, three holes closed. Warm and steady.'},
  {key:'lni',title:'Low Ni',dur:4,note:'lni',holes:4,vtext:'Glide down to Ni. Keep the breath steady and the tone full.',text:'Drop your right index finger flat onto hole 4. Slow the air by about 10%.'},
  {key:'ldha',title:'Low Dha',dur:5,note:'ldha',holes:5,vtext:'Down to Dha. Relax the jaw and let the sound settle in your chest. Use less breath, not more.',text:'Drop your right middle finger onto hole 5. Check the hole 4 seal. Drop your jaw slightly (“Hoo”).'},
  {key:'lpa',title:'Low Pa',dur:6,note:'lpa',holes:6,vtext:'Settle on low Pa, the tanpura\'s lowest string. If “aa” strains, hum it.',text:'Drop your right ring finger onto hole 6. Barely whisper warm air down into the hole.'}
];
const D={running:false,started:false,phase:0,rep:1,prog:0,last:0,mode:store.get('gdMode','timed'),mult:store.get('gdMult',1),reps:store.get('gdReps',3),stats:null,raf:0,elapsed:0};
const phaseNeed=i=>PHASES[i].dur*1000*D.mult;
function buildGd(){
  $('#gdList').innerHTML=PHASES.map((p,i)=>`<li data-i="${i}"><b>${p.title}</b><span>${p.dur} s · ${p.holes} holes</span></li>`).join('');
  $('#gdMult').value=D.mult;$('#gdReps').value=D.reps;syncGdSettings();
}
function syncGdSettings(){
  $('#gdMultV').textContent='×'+Number(D.mult).toFixed(2).replace(/0$/,'');$('#gdRepsV').textContent=D.reps;
  $$('#gdMode button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===D.mode));
  $('#gdChime').setAttribute('aria-pressed',S.chime);
  $$('#gdList li span').forEach((s,i)=>s.textContent=`${(PHASES[i].dur*D.mult).toFixed(D.mult%1?1:0)} s${isVoice()?'':' · '+PHASES[i].holes+' holes'}`);
  renderGd();
}
function renderGd(){
  const ph=PHASES[D.phase],need=phaseNeed(D.phase);
  $('#gdStart').innerHTML=D.running?IC.pause+'Pause':IC.play+(D.started?'Resume':'Start');
  $('#gdPhase').textContent=D.started?ph.title:'Ready';
  const total=PHASES.reduce((a,p)=>a+p.dur,0)*D.mult*1000;
  $('#gdTime').textContent=D.started?mmss(need-D.prog,true):mmss(total,true);
  $('#gdSub').textContent=D.started?`Rep ${D.rep} of ${D.reps}${D.mode==='listen'&&ph.note?' · listening':''}`:`${PHASES.length} phases · ${D.reps} rep${D.reps>1?'s':''}`;
  $('#gdProg').style.strokeDashoffset=703.7*(1-(D.started?clamp(D.prog/need,0,1):0));
  $('#gdNowEyebrow').textContent=`Phase ${D.phase+1} of ${PHASES.length}`;
  $('#gdNowTitle').textContent=ph.title+(ph.note?` · ${NOTE[ph.note].sg}`:'');
  $('#gdNowText').textContent=isVoice()?ph.vtext:ph.text;
  const nf=$('#gdNowFlute');if(nf.dataset.k!==ph.key){nf.dataset.k=ph.key;nf.innerHTML=fluteSVG(holesFor(ph.holes),{labels:false,leak:ph.key==='ldha'||ph.key==='lpa'});}
  $$('#gdList li').forEach((li,i)=>{li.classList.toggle('now',D.started&&i===D.phase);li.classList.toggle('done',D.started&&i<D.phase);});
  $('#gdSkip').disabled=!D.started;
  if(!D.started){$('#gdRing').dataset.mode='';}
}
function gdStart(){
  if(D.running) return gdPause();
  if(D.mode==='listen'&&!coach.on){micStart().then(ok=>{if(ok) gdStart();else{D.mode='timed';store.set('gdMode',D.mode);syncGdSettings();toast('Listen mode needs the microphone, so the drill is set to Timed.');}});return;}
  audio();
  if(!D.started){track('gravity_drop_started',{mode:D.mode,reps:D.reps});D.started=true;D.phase=0;D.rep=1;D.prog=0;D.elapsed=0;D.stats=PHASES.map(()=>({held:0,sumC:0,sumP:0,n:0,air:0,oct:0,loud:0}));$('#gdResults').hidden=true;enterPhase();}
  else enterPhase();
  D.running=true;D.last=performance.now();D.raf=requestAnimationFrame(gdTick);renderGd();wakeSync();
}
function gdPause(){D.running=false;cancelAnimationFrame(D.raf);coach.override=null;$('#gdStatus').hidden=true;renderGd();wakeSync();}
function gdReset(){gdPause();D.started=false;D.phase=0;D.rep=1;D.prog=0;renderGd();}
function enterPhase(){const ph=PHASES[D.phase];coach.override=ph.note?NOTE[ph.note]:null;$('#gdRing').dataset.mode=ph.note?'':'inhale';renderGd();}
function gdTick(ts){
  if(!D.running) return;
  const dt=Math.min(100,ts-D.last);D.last=ts;D.elapsed+=dt;
  const ph=PHASES[D.phase],st=D.stats[D.phase];let add=dt;
  if(ph.note){
    const fr=coach.on?coach.frame:null,fresh=fr&&ts-fr.t<250,ok=fresh&&fr.target&&fr.target.id===ph.note&&goodish(fr);
    if(fresh&&fr.loud){st.loud+=dt;if(fr.cls==='air') st.air+=dt;if(fr.cls==='octave'||fr.cls==='twelfth') st.oct+=dt;if(fr.target&&fr.target.id===ph.note&&onTarget(fr)){st.sumC+=fr.cents;st.sumP+=fr.purity;st.n++;}}
    if(ok) st.held+=dt;
    if(D.mode==='listen'){add=ok?dt:0;$('#gdRing').dataset.mode=ok?'ok':'hold';}
    if(coach.on) gdStatus(fresh?(coach.view||fr):null,ph);
  }else $('#gdStatus').hidden=true;
  D.prog+=add;
  if(D.prog>=phaseNeed(D.phase)) advancePhase();
  renderGd();
  if(D.running) D.raf=requestAnimationFrame(gdTick);
}
function gdStatus(fr,ph){
  const el=$('#gdStatus'),T=NOTE[ph.note].sg;let tone,txt;
  if(!fr||!fr.loud){tone='idle';txt='Waiting for sound…';}
  else if(fr.cls==='air'){tone='bad';txt=isVoice()?'Breath but no clear pitch':'Leak? All air, no note';}
  else if(fr.cls==='octave'||fr.cls==='twelfth'){tone='bad';txt=isVoice()?'An octave too high. Sing softer':'Octave jump. Slow the air';}
  else if(fr.cls==='wrong'){tone='warn';txt=`Hearing ${fr.near?fr.near.sg:western(fr.f).name}, not ${T}`;}
  else if(fr.cls==='airy'){tone='warn';txt=isVoice()?`Breathy ${T}. Fuller tone`:`Airy ${T}. Smaller lip opening`;}
  else if(goodish(fr)){tone='ok';txt=`On ${T} ✓ ${centsTxt(fr.cents)}`;}
  else{tone='warn';txt=`${fr.cents<0?'Flat':'Sharp'} ${centsTxt(fr.cents)}`;}
  el.hidden=false;el.dataset.tone=tone;setT(el,txt);
}
function advancePhase(){
  D.prog=0;chime();
  if(D.phase<PHASES.length-1){D.phase++;enterPhase();}
  else if(D.rep<D.reps){D.rep++;D.phase=0;enterPhase();}
  else gdFinish();
}
function gdFinish(){
  D.running=false;D.started=false;coach.override=null;$('#gdStatus').hidden=true;chime('end');
  track('gravity_drop_finished',{mode:D.mode,reps:D.reps,seconds:Math.round(D.elapsed/1000)});
  const r=$('#gdResults'),reps=D.reps;
  const anyData=D.stats.some(s=>s.loud>0);
  let h=`<div class="card-head"><h3 style="font-size:1.3rem">Run complete</h3><span class="muted mono">${reps} rep${reps>1?'s':''} · ${mmss(D.elapsed)}</span></div>`;
  if(!anyData) h+=`<p class="muted">Turn on Listen (top bar) during the drill to get a per-phase report: time held in tune, average pitch and tone purity.</p>`;
  else{
    h+=`<div class="table-wrap"><table class="res-table"><thead><tr><th>Phase</th><th>Held in tune / rep</th><th>Average pitch</th><th>Purity</th><th>Notes</th></tr></thead><tbody>`;
    PHASES.forEach((p,i)=>{if(!p.note) return;const s=D.stats[i],c=s.n?s.sumC/s.n:null,pu=s.n?Math.round(s.sumP/s.n):null,air=s.loud?s.air/s.loud:0,oc=s.loud?s.oct/s.loud:0;
      const flags=[];if(air>0.3) flags.push(`<span class="flag bad">${isVoice()?'No clear pitch':'Leak?'}</span>`);if(oc>0.2) flags.push('<span class="flag bad">Octave jumps</span>');if(pu!==null&&pu<AIRY_BELOW) flags.push('<span class="flag warn">Airy</span>');if(!flags.length&&s.held>0) flags.push('<span class="flag ok">Solid</span>');
      h+=`<tr><td><b>${p.title}</b> <span class="muted">${NOTE[p.note].sg}</span></td><td class="mono">${secs(s.held/reps)}</td><td class="mono">${c===null?'—':(Math.abs(c)<=15?'in tune ':c<0?'flat ':'sharp ')+centsTxt(c)}</td><td class="mono">${pu===null?'—':pu}</td><td>${flags.join('')||'<span class="muted">No sound</span>'}</td></tr>`;});
    h+=`</tbody></table></div>`;
  }
  r.innerHTML=h;r.hidden=false;renderGd();wakeSync();
}

/* ================= Tab 3: troubleshooting ================= */
const PIC={
  print:'<ellipse cx="24" cy="26" rx="13" ry="17"/><circle cx="24" cy="22" r="7"/><path d="M14 36c4 3 16 3 20 0"/>',
  thumb:'<rect x="4" y="12" width="40" height="10" rx="5"/><circle cx="16" cy="17" r="2.5"/><circle cx="32" cy="17" r="2.5"/><path d="M24 40V27M19 32l5-5 5 5"/>',
  chin:'<path d="M12 8c10 2 18 10 18 20 0 6-4 10-10 12"/><path d="M34 30l8 6M42 30v6h-6"/>',
  lips:'<path d="M6 24c6-8 12-10 18-6 6-4 12-2 18 6-6 8-12 10-18 8-6 2-12 0-18-8z"/><path d="M6 24h36"/>',
  hoo:'<circle cx="24" cy="24" r="16"/><ellipse cx="24" cy="26" rx="6" ry="8"/>',
  fog:'<rect x="6" y="6" width="36" height="36" rx="3"/><path d="M14 30c0-4 4-6 7-4 1-4 7-5 9-1 4 0 5 5 2 6H16c-2 0-2-1-2-1z"/>',
  mirror:'<rect x="10" y="4" width="28" height="36" rx="12"/><path d="M18 14l6-4M18 22l10-7"/><path d="M24 40v4M16 44h16"/>',
  elbow:'<path d="M8 10l14 16 18-6"/><circle cx="22" cy="26" r="3"/><path d="M28 36c-4 0-8-2-10-5M16 34l2-3 3 2"/>',
  pad:'<rect x="4" y="30" width="40" height="10" rx="5"/><circle cx="24" cy="35" r="3"/><path d="M18 8v18c0 2 2 4 6 4s6-2 6-4V8"/>',
  aperture:'<circle cx="24" cy="30" r="12"/><ellipse cx="24" cy="14" rx="9" ry="3"/><path d="M24 17v7"/>',
  cover:'<circle cx="24" cy="24" r="14"/><path d="M10 28a14 14 0 0 0 28 0z" fill="currentColor" fill-opacity=".35"/>',
  roll:'<circle cx="24" cy="24" r="10"/><path d="M8 18a17 17 0 0 1 10-10M40 30a17 17 0 0 1-10 10"/><path d="M14 6l4 2-2 4M34 42l-4-2 2-4"/>',
  corners:'<path d="M10 24c6-6 22-6 28 0-6 6-22 6-28 0z"/><path d="M4 18l4 4M4 22l4-4M40 18l4 4M40 22l4-4"/>'
};
const SYMPTOMS={
  A:{title:'Pure rushing wind, no note on Low Pa or Dha',short:'Air leak somewhere',steps:[
    {t:'Press all 6 holes firmly for 10 seconds, then look at your fingertips. You want 6 complete, unbroken circles. A half-moon means that hole leaks.',ic:'print'},
    {t:'Slide your right thumb up so it sits between holes 4 and 5.',ic:'thumb'},
    {t:'Tuck your chin slightly to aim the air deeper into the hole.',ic:'chin'}]},
  B:{title:'Note squeaks or jumps to Middle Pa or Dha',short:'Too much air speed',steps:[
    {t:'Relax pinched lip corners.',ic:'lips'},
    {t:'Switch your mouth shape from a tight “Too” to a yawning “Hoo”.',ic:'hoo'},
    {t:'Cut your air speed in half, like fogging up a cold window.',ic:'fog'}]},
  C:{title:'Low Dha works, but dies the instant my ring finger touches hole 6',short:'Finger roll on holes 4–5',steps:[
    {t:'Watch holes 4 and 5 in a mirror while you drop finger 6. Your index or middle finger is rolling onto its side.',ic:'mirror'},
    {t:'Rotate your right elbow slightly forward, toward your ribs.',ic:'elbow'},
    {t:'Use the flat, fleshy pads of your fingers (piper’s grip), not curved fingertips.',ic:'pad'}]},
  D:{title:'There’s a note, but it’s airy or hissy',short:'Air stream too wide',steps:[
    {t:'Make the lip opening smaller and center it over the hole. Hiss usually means the air stream is too wide.',ic:'aperture'},
    {t:'Let your lower lip cover about a third of the hole. Keep the lips relaxed, not pressed.',ic:'cover'},
    {t:'Use less air, not more. Then roll the flute in and out a few millimetres while watching the Tone Purity meter to find the sweet spot.',ic:'roll'},
    {t:'Check that no air escapes from the corners of your mouth.',ic:'corners'}]}
};
const SYMPTOMS_V={
  A:{title:'Low notes go breathy, weak or disappear',short:'Too much air or a tight throat',steps:[
    {t:'Sing softer as you go down. Low notes need less breath, not more.',ic:'fog'},
    {t:'Drop the jaw and relax the tongue; think of the vowel “aw”.',ic:'hoo'},
    {t:'Hum the low note first with lips closed, then open gently to “aa”.',ic:'lips'}]},
  B:{title:'I keep landing sharp or flat (besur)',short:'Pitch accuracy',steps:[
    {t:'Tap Hear it, listen, and hum the note before you sing it.',ic:'ear'},
    {t:'Sing with the tanpura. When you are off you hear a slow wavering (beats); adjust until it stops.',ic:'beats'},
    {t:'Slide slowly into the note from below and stop when the needle turns green.',ic:'slide'}]},
  C:{title:'My voice flips or jumps up an octave',short:'Break between registers',steps:[
    {t:'Approach high notes with less volume, not more.',ic:'fog'},
    {t:'Keep the throat open and low, like the start of a yawn.',ic:'yawn'},
    {t:'Practise slow slides (meend) across the break until it smooths out.',ic:'slide'}]},
  D:{title:'My voice is shaky or wobbly',short:'Breath support',steps:[
    {t:'Breathe low into the belly and keep the shoulders still.',ic:'belly'},
    {t:'Hold Sa for 10 seconds at medium volume and watch Steadiness in the Tone Coach.',ic:'still'},
    {t:'Aim for a straight, still tone first. Vibrato can come later.',ic:'beats'}]}
};
Object.assign(PIC,{
  ear:'<path d="M15 20a9 9 0 0 1 18 0c0 6-6 7-6 12a5 5 0 0 1-10 0"/><path d="M20 20a4 4 0 0 1 8 0"/>',
  beats:'<path d="M4 24c3-8 7-8 10 0s7 8 10 0 7-8 10 0 7 8 10 0"/>',
  slide:'<path d="M6 38L18 32 30 22 42 12"/><path d="M35 12h7v7"/>',
  belly:'<circle cx="24" cy="12" r="6"/><path d="M13 44c0-13 5-21 11-21s11 8 11 21"/><path d="M18 35h12"/>',
  still:'<path d="M6 24h36"/><path d="M10 17v14M38 17v14"/>',
  yawn:'<ellipse cx="24" cy="27" rx="10" ry="14"/><path d="M17 13c3-3 11-3 14 0"/>'
});
const SYM=()=>isVoice()?SYMPTOMS_V:SYMPTOMS,symKey=()=>(isVoice()?'v':'f')+symSel;
let symSel='A';const symChecks={};
function buildFix(){
  $('#symList').innerHTML=Object.entries(SYM()).map(([k,s])=>`<button class="sym" data-sym="${k}" aria-pressed="false"><span class="letter">${k}</span><span><b>${s.title}</b><small>${s.short}</small></span></button>`).join('');
  $('#dgNote').innerHTML=NOTES.map(n=>`<option value="${n.id}">${n.sg} · ${n.name}</option>`).join('');
  $('#dgNote').value='lpa';renderSym();
}
function renderSym(){
  $$('#symList .sym').forEach(b=>b.setAttribute('aria-pressed',b.dataset.sym===symSel));
  const s=SYM()[symSel],ch=symChecks[symKey()]||(symChecks[symKey()]=[]);
  $('#symDetail').innerHTML=`<div class="eyebrow">Symptom ${symSel} · checklist</div><h3 style="font-size:1.5rem;margin-top:.3rem">${s.title}</h3><ol class="steps">${s.steps.map((st,i)=>`<li class="step ${ch[i]?'checked':''}"><input type="checkbox" id="stp-${symSel}-${i}" data-step="${i}" ${ch[i]?'checked':''} aria-label="Done: step ${i+1}"><span class="pic"><svg viewBox="0 0 48 48" aria-hidden="true">${PIC[st.ic]}</svg></span><label for="stp-${symSel}-${i}"><p><b>${i+1}.</b> ${st.t}</p></label></li>`).join('')}</ol>
  <div class="row" style="margin-top:1rem"><button class="btn" data-goto="flute">${isVoice()?'Practise in the Swara trainer':'Practise on the flute view'}</button><button class="btn" data-goto="drop">Try the Gravity Drop</button></div>`;
}
function diagnose(frames,tgt){
  const loud=frames.filter(f=>f.loud);
  if(!frames.length||loud.length<frames.length*0.2) return{sym:null,title:'Too quiet to judge',text:'I barely heard anything. Move closer to the microphone, or measure room noise in the Tone Coach, then try again.'};
  const L=loud.length,pitched=loud.filter(f=>f.f),P=Math.max(1,pitched.length);
  const air=loud.filter(f=>f.cls==='air').length/L;
  const oct=pitched.filter(f=>f.cls==='octave'||f.cls==='twelfth').length/P;
  const onT=pitched.filter(onTarget),airy=onT.filter(f=>f.cls==='airy').length/Math.max(1,onT.length);
  const good=pitched.filter(goodish).length/L;
  const counts={};pitched.forEach(f=>{if(f.near) counts[f.near.id]=(counts[f.near.id]||0)+1;});
  const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0],avgP=pitched.length?Math.round(avg(pitched.map(f=>f.purity))):0;
  const stats=`air only ${pct(air)} · octave jumps ${pct(oct)} · airy ${pct(airy)} · in tune & clear ${pct(good)} · avg purity ${avgP}`;
  const r=(sym,title,text)=>({sym,title,text,stats});
  if(isVoice()){
    const ct=onT.map(f=>f.cents),mean=avg(ct),sd=Math.sqrt(avg(ct.map(c=>(c-mean)*(c-mean))));
    if(air>0.4) return r('A','Looks like Symptom A',`${pct(air)} of the attempt had breath but no clear pitch.`);
    if(oct>0.25) return r('C','Looks like Symptom C',`${pct(oct)} of the time your voice was an octave or more above ${tgt.sg}.`);
    if(top&&top[0]!==tgt.id&&top[1]>L*0.4){const h=NOTE[top[0]];return r('B',`Mostly ${h.sg} instead of ${tgt.sg}`,`You were mostly on ${h.sg} (${h.name}). Hear the target, hum it, then sing.`);}
    if(onT.length>L*0.3&&sd>18) return r('D','Looks like Symptom D',`Your pitch wobbled about ±${Math.round(sd)}¢ around ${tgt.sg}.`);
    if(onT.length>L*0.3&&Math.abs(mean)>20) return r('B',`A little ${mean<0?'flat':'sharp'}`,`On average you were ${centsTxt(mean)} from ${tgt.sg}.`);
    if(onT.length>L*0.3&&airy>0.4) return r('A','Breathy tone',`You found ${tgt.sg}, but ${pct(airy)} of it was breathy.`);
    if(good>0.5) return r(null,'No major problem detected',`${pct(good)} of the attempt was in tune and clear. Keep going!`);
    return r(null,'Mixed result','No single problem stands out. Try a slower, softer attempt and diagnose again.');
  }
  if(tgt.id==='lpa'&&(counts.ldha||0)/L>0.15&&air>0.2) return r('C','Looks like Symptom C',`I heard Low Dha for ${pct((counts.ldha||0)/L)} of the attempt, then air with no note when Pa should sound. Something leaks as finger 6 comes down.`);
  if(air>0.4) return r('A','Looks like Symptom A',`${pct(air)} of the attempt was air with no stable pitch. That usually means a leak.`);
  if(oct>0.25) return r('B','Looks like Symptom B',`${pct(oct)} of the sounding time jumped up an octave or higher.`);
  if(onT.length>L*0.3&&airy>0.4) return r('D','Looks like Symptom D',`You found ${tgt.sg}, but ${pct(airy)} of it was airy (average purity ${avgP}).`);
  if(top&&top[0]!==tgt.id&&top[1]>L*0.4){
    const h=NOTE[top[0]],sym=(tgt.id==='lpa'&&h.id==='ldha')?'C':(h.over&&!tgt.over)?'B':(h.semi>tgt.semi)?'A':null;
    const hh=!h.over&&!tgt.over?holeHint(tgt,h):'';
    return r(sym,`Mostly ${h.sg} instead of ${tgt.sg}`,`You were mostly on ${h.sg} (${h.name}).${hh?' '+hh.charAt(0).toUpperCase()+hh.slice(1)+'.':''}`);
  }
  if(good>0.5) return r(null,'No major problem detected',`${pct(good)} of the attempt was in tune and clear. Keep going!`);
  return r(air>0.2?'A':airy>0.25?'D':null,'Mixed result','No single problem stands out. Try a slower, warmer attempt and diagnose again.');
}
function showDiag(res,el){
  el.hidden=false;track('note_diagnosed',{symptom:res.sym||'none',result:res.title});
  el.innerHTML=`<h4>${res.title}</h4><p>${res.text}</p>${res.stats?`<div class="diag-stats">${res.stats}</div>`:''}${res.sym?`<div class="row" style="margin-top:.7rem"><button class="btn primary" data-sym-open="${res.sym}">Open checklist ${res.sym}</button></div>`:''}`;
  if(res.sym){symSel=res.sym;renderSym();}
}
async function dgListen(){
  if(!(await micStart())) return;
  const tgt=NOTE[$('#dgNote').value],btn=$('#dgListen'),msg=$('#dgMsg'),pw=$('#dgProgWrap'),pb=$('#dgProg');
  btn.disabled=true;$('#dgResult').hidden=true;msg.hidden=false;
  for(let i=3;i>0;i--){msg.textContent=`Get ready to play ${tgt.sg} (${tgt.name})… ${i}`;await sleep(1000);}
  msg.textContent=`Play ${tgt.sg} now and keep going for 5 seconds.`;
  coach.override=tgt;const frames=[],sub=fr=>{if(fr) frames.push(fr);};coach.subs.add(sub);
  pw.hidden=false;const t0=performance.now();
  while(performance.now()-t0<5000){pb.style.width=((performance.now()-t0)/50)+'%';await sleep(50);}
  coach.subs.delete(sub);coach.override=null;pw.hidden=true;msg.hidden=true;btn.disabled=false;
  showDiag(diagnose(frames,tgt),$('#dgResult'));
}
async function analyzeFile(file,onProg){
  audio();
  const ab=await file.arrayBuffer();
  const buf=await new Promise((res,rej)=>{const p=AC.decodeAudioData(ab,res,rej);if(p&&p.then) p.then(res,rej);});
  const sr=buf.sampleRate,len=Math.min(buf.length,Math.floor(sr*120)),mono=new Float32Array(len);
  for(let c=0;c<buf.numberOfChannels;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++) mono[i]+=d[i]/buf.numberOfChannels;}
  const N=anSize(),hop=1024,an=makeAnalyzer(N),raws=[],tmp=new Float32Array(N);
  for(let i=0,k=0;i+N<=len;i+=hop,k++){tmp.set(mono.subarray(i,i+N));raws.push({raw:an(tmp,sr),t:i/sr*1000});if(k%150===0){onProg(i/len);await sleep(0);}}
  const dbs=raws.map(r=>r.raw.rmsDb).sort((a,b)=>a-b),q=p=>dbs.length?dbs[Math.floor((dbs.length-1)*p)]:-90;
  const gate=Math.max(-75,Math.min(q(0.15)+10,q(0.9)-15));
  return{raws,gate,duration:len/sr*1000,truncated:buf.length>len};
}
function framesFrom(an,tgt){const fh={f:[],p:null};return an.raws.map(r=>{const fr=buildFrame(r.raw,r.t,an.gate,fh);return Object.assign(fr,classify(fr,tgt));});}
async function handleUpload(input,progWrap,progBar,done){
  const file=input.files&&input.files[0];input.value='';if(!file) return;
  progWrap.hidden=false;progBar.style.width='0';
  try{const an=await analyzeFile(file,p=>{progBar.style.width=(p*100)+'%';});progWrap.hidden=true;done(an,file);}
  catch(e){progWrap.hidden=true;toast('That file could not be read as audio. Try a WAV, MP3 or M4A recording.');}
}

/* ================= Tab 4: daily riyaz ================= */
const BLOCKS_F=[
  {id:'b1',min:5,title:'Blowing hole only',sub:'Eliminate the hiss and find the sweet spot. Hold one easy note (Sa) and chase a clear tone.'},
  {id:'b2',min:10,title:'Long notes & the Gravity Drop',sub:'Swara sadhana: hold each note as long as it stays clear, then step down from Sa to Low Pa.'},
  {id:'b3',min:10,title:'Basic alankars',sub:'Four beginner patterns plus the Low Octave Lock. Slow and clean beats fast and airy.'},
  {id:'b4',min:5,title:'Free play & ear training',sub:'Improvise slowly over the tanpura, then test your ear.'}
];
const BLOCKS_V=[
  {id:'b1',min:5,title:'Omkar & Sa sadhana',sub:'Hum “Om”, then hold Sa on “aa” with the tanpura. Chase a clear, steady tone, not a loud one.'},
  {id:'b2',min:10,title:'Long notes & the kharaj drop',sub:'Hold each swara as long as it stays steady, then step down from Sa to low Pa in the Gravity Drop.'},
  {id:'b3',min:10,title:'Basic alankars',sub:'Four beginner patterns plus the Low Octave Lock. Slow and in tune beats fast and loud.'},
  {id:'b4',min:5,title:'Free singing & ear training',sub:'Sing slowly over the tanpura, then test your ear.'}
];
let BLOCKS=isVoice()?BLOCKS_V:BLOCKS_F;
const fmtKey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const keyFor=off=>{const d=new Date();d.setDate(d.getDate()-off);return fmtKey(d);};
let dayKey=keyFor(0),day=loadDay(dayKey);
function loadDay(k){const d=store.get(dayPfx()+k,{});return{done:d.done||{},el:d.el||{},longest:d.longest||0};}
const RT={run:null,start:0,timer:0,n:0};
const blkMs=id=>BLOCKS.find(b=>b.id===id).min*60000;
const blkEl=id=>Math.min(blkMs(id),(day.el[id]||0)+(RT.run===id?Date.now()-RT.start:0));
function saveDay(){const el={};BLOCKS.forEach(b=>el[b.id]=Math.round(blkEl(b.id)));store.set(dayPfx()+dayKey,{done:day.done,el,longest:day.longest});}
function blkStart(id){
  if(RT.run===id) return blkPause();
  if(RT.run) blkPause();
  if(blkEl(id)>=blkMs(id)) day.el[id]=0;
  audio();RT.run=id;RT.start=Date.now();if(!RT.timer) RT.timer=setInterval(blkTick,250);
  wakeSync();renderBlocks();
}
function blkPause(){if(!RT.run) return;day.el[RT.run]=blkEl(RT.run);RT.run=null;saveDay();wakeSync();renderBlocks();}
function blkReset(id){if(RT.run===id) RT.run=null;day.el[id]=0;saveDay();wakeSync();renderBlocks();}
function blkSkip(id){blkPause();const i=BLOCKS.findIndex(b=>b.id===id),nx=BLOCKS.slice(i+1).find(b=>!day.done[b.id]);if(nx){blkStart(nx.id);const el=$('#blk-'+nx.id);if(el) el.scrollIntoView({behavior:'smooth',block:'start'});}}
function blkTick(){
  if(keyFor(0)!==dayKey){blkPause();dayKey=keyFor(0);day=loadDay(dayKey);renderBlocks();renderWeek();}
  if(RT.run){
    const id=RT.run;
    if(blkEl(id)>=blkMs(id)){track('riyaz_block_completed',{block:BLOCKS.find(b=>b.id===id).title,how:'timer'});day.el[id]=blkMs(id);day.done[id]=true;RT.run=null;chime('end');saveDay();wakeSync();renderBlocks();renderWeek();toast(`${BLOCKS.find(b=>b.id===id).title}: done.`);}
    else if(++RT.n%20===0) saveDay();
  }
  updateClocks();
}
function updateClocks(){
  let tot=0;BLOCKS.forEach(b=>{const e=blkEl(b.id);tot+=e;const c=$('#rzT-'+b.id);if(c) c.textContent=mmss(blkMs(b.id)-e,true);const bar=$('#rzB-'+b.id);if(bar) bar.style.width=(e/blkMs(b.id)*100)+'%';});
  $('#rzSession').textContent=`${mmss(tot)} / 30:00`;$('#rzSessBar').style.width=(tot/1800000*100)+'%';
  const lg=$('#rzLongest');if(lg) lg.textContent=day.longest?secs(day.longest):'—';
}
function doneCount(k){const d=k===dayKey?day:store.get(dayPfx()+k,null);return d&&d.done?BLOCKS.filter(b=>d.done[b.id]).length:0;}
function renderWeek(){
  let s=0;for(let off=doneCount(keyFor(0))===4?0:1;off<400;off++){if(doneCount(keyFor(off))===4) s++;else break;}
  $('#rzStreak').textContent=`${s} day${s===1?'':'s'}`;
  const W=['Su','Mo','Tu','We','Th','Fr','Sa'];let h='';
  for(let off=6;off>=0;off--){const d=new Date();d.setDate(d.getDate()-off);const n=doneCount(fmtKey(d));h+=`<div class="d ${off===0?'today':''}" title="${fmtKey(d)}: ${n} of 4 blocks"><i><b style="height:${n*25}%"></b></i>${W[d.getDay()]}</div>`;}
  $('#rzWeek').innerHTML=h;
}
const SCALE=['sa','re','ga','ma','mpa','mdha','mni','hsa'],RSC=[...SCALE].reverse();
const AL=[
  {name:'Alankar 1',sub:'Scale',aroh:SCALE.map(x=>[x]),avroh:RSC.map(x=>[x])},
  {name:'Alankar 2',sub:'Pairs',aroh:SCALE.slice(0,7).map((x,i)=>[x,SCALE[i+1]]),avroh:RSC.slice(0,7).map((x,i)=>[x,RSC[i+1]])},
  {name:'Alankar 3',sub:'Triplets',aroh:SCALE.slice(0,6).map((x,i)=>[x,SCALE[i+1],SCALE[i+2]]),avroh:RSC.slice(0,6).map((x,i)=>[x,RSC[i+1],RSC[i+2]])},
  {name:'Alankar 4',sub:'Skips',aroh:SCALE.slice(0,6).map((x,i)=>[x,SCALE[i+2]]),avroh:RSC.slice(0,6).map((x,i)=>[x,RSC[i+2]])},
  {name:'Low Octave Lock',sub:'Sa down to Low Pa and back',aroh:[['sa','lni','ldha','lpa','ldha','lni','sa']],avroh:[]}
];
const alSeq=a=>[...AL[a].aroh.flat(),...AL[a].avroh.flat()];
const F={running:false,idx:-1,count:0,rest:0,round:1,best:0,next:0,beatStart:0,frames:[],res:[],timer:0};
function blockBody(b){
  if(b.id==='b1') return `<div class="kv"><span class="muted">Tone purity right now</span><b class="mono" id="rzPurN">—</b></div><div class="meter pur" id="rzPurM"><i id="rzPur"></i></div>
  <div class="kv"><span class="muted">Longest clear tone today</span><b class="mono" id="rzLongest">—</b></div>
  <div class="row" style="margin-top:.8rem"><button class="btn" data-mic></button><button class="btn" data-open-coach>Open Tone Coach</button></div>`;
  if(b.id==='b2') return `<div class="kv"><span class="muted">Holding now</span><b class="mono" id="rzHold">—</b></div>
  <div class="muted" style="margin-top:.7rem;font-size:.9rem">Personal bests (held in tune and clear)</div><div class="bests" id="rzBests"></div>
  <div class="row" style="margin-top:.9rem"><button class="btn" data-mic></button><button class="btn primary" data-goto="drop">Open the Gravity Drop</button></div>`;
  if(b.id==='b3') return `<div class="al-tabs" id="alTabs">${AL.map((a,i)=>`<button data-al="${i}" aria-pressed="false">${a.name}</button>`).join('')}</div><div id="alView"></div>
  <div class="al-ctl"><button class="btn primary" id="alGo"></button><label class="field" for="alBpm"><span>Tempo <b class="mono" id="alBpmV"></b></span><input type="range" id="alBpm" min="40" max="120" step="2"></label><label class="check"><input type="checkbox" id="alClick"> Click</label><label class="check"><input type="checkbox" id="alLoop"> Loop</label><span class="muted" id="alStatus" style="font-size:.9rem"></span></div>
  <div class="diag-res" id="alScore" hidden></div>`;
  return `<div class="row"><button class="btn primary" id="rzDrone" aria-pressed="false"></button></div>
  <div style="margin-top:1rem"><b>Ear training</b> <span class="muted">· score <span class="mono" id="egScore">0 / 0</span></span></div>
  <div class="row" style="margin-top:.5rem"><button class="btn primary" id="egPlay">Play a mystery note</button><button class="btn" id="egAgain" disabled>Hear again</button><button class="btn" id="egBack" disabled>${isVoice()?'Sing it back':'Play it back on the flute'}</button><select id="egRange" aria-label="Notes to include"><option value="all">All 11 notes</option><option value="low">Low Pa to Ma</option></select></div>
  <div class="answers" id="egAns">${NOTES.map(n=>`<button class="pick ${noteClass(n)}" data-eg="${n.id}" title="${n.name}">${n.sg}</button>`).join('')}</div>
  <p id="egStatus" class="muted" style="margin-top:.6rem">Press "Play a mystery note", then tap the note you heard.</p>`;
}
function buildBlocks(){
  $('#rzBlocks').innerHTML=BLOCKS.map((b,i)=>`<article class="card blk" id="blk-${b.id}">
    <div class="blk-side"><div class="blk-num"><span>${i+1}</span><b class="eyebrow">${b.min} minutes</b></div>
      <div class="blk-clock" id="rzT-${b.id}">${b.min}:00</div><div class="meter"><i id="rzB-${b.id}"></i></div>
      <div class="row"><button class="btn primary" data-blk-go="${b.id}"></button><button class="btn" data-blk-reset="${b.id}" aria-label="Reset timer">${'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>'}</button><button class="btn" data-blk-skip="${b.id}" aria-label="Skip to next block"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l10 7-10 7z"/><path d="M19 5v14"/></svg></button></div>
      <label class="check"><input type="checkbox" data-blk-done="${b.id}" id="done-${b.id}"> Done today</label></div>
    <div class="blk-main"><h3>${b.title}</h3><p>${b.sub}</p>${blockBody(b)}</div></article>`).join('');
  $('#alBpm').value=S.bpm;$('#alClick').checked=S.click;$('#alLoop').checked=S.alLoop;$('#egRange').value=S.egRange;
  renderBlocks();renderBests();renderAlankar();syncDrone();syncMic();
}
function renderBlocks(){
  BLOCKS.forEach(b=>{
    const el=$('#blk-'+b.id);if(!el) return;const run=RT.run===b.id;
    el.classList.toggle('running',run);el.classList.toggle('done',!!day.done[b.id]);
    $(`[data-blk-go="${b.id}"]`).innerHTML=run?IC.pause+'Pause':IC.play+(blkEl(b.id)>0&&blkEl(b.id)<blkMs(b.id)?'Resume':'Start');
    $(`[data-blk-done="${b.id}"]`).checked=!!day.done[b.id];
  });
  updateClocks();
}
function renderBests(){
  const el=$('#rzBests');if(!el) return;
  el.innerHTML=['lpa','ldha','lni','sa','re','ga','ma','mpa'].map(id=>`<span><b>${NOTE[id].sg}</b> <span class="mono">${bests[id]?secs(bests[id]):'—'}</span></span>`).join('');
  if(activeTab==='flute') $('#t1Best').textContent=bests[T1.sel]?secs(bests[T1.sel]):'—';
}
function rzLive(fr){
  if(activeTab!=='riyaz') return;
  const p=fr&&fr.f?fr.purity:0;$('#rzPur').style.width=p+'%';$('#rzPurM').dataset.band=purBand(p);setT('#rzPurN',fr&&fr.f?`${Math.round(p/5)*5} · ${purLabel(p)}`:'—');
  setT('#rzHold',sus.note?`${NOTE[sus.note].sg} · ${secs(sus.dur)}`:'—');updateClocks();
}
function renderAlankar(){
  const a=AL[S.alank],seq=alSeq(S.alank);
  $$('#alTabs button').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.al===S.alank));
  let i=0;const grp=g=>`<span class="al-grp">${g.map(id=>`<span class="al-n" data-i="${i++}">${NOTE[id].sg}</span>`).join('')}</span>`;
  $('#alView').innerHTML=`<div class="muted" style="font-size:.9rem;margin-bottom:.3rem">${a.sub}${a.avroh.length&&!isVoice()?' · overblow Pa, Dha, Ni and Sa\'':''}</div>`+
    `<div class="al-line"><span class="lbl">${a.avroh.length?'Aroh':'Pattern'}</span>${a.aroh.map(grp).join('')}</div>`+
    (a.avroh.length?`<div class="al-line"><span class="lbl">Avroh</span>${a.avroh.map(grp).join('')}</div>`:'');
  $('#alBpmV').textContent=S.bpm+' bpm';$('#alGo').innerHTML=F.running?IC.stop+'Stop':IC.play+'Start follow mode';
  $('#alStatus').textContent=F.running?'':`${seq.length} notes · ${coach.on?'grading with the mic':'turn on Listen to get graded'}`;
}
function fStart(){
  if(F.running) return fStop(true);
  audio();F.running=true;F.idx=-1;F.count=4;F.rest=0;F.round=1;F.best=0;F.res=[];F.frames=[];F.next=performance.now()+150;$('#alScore').hidden=true;
  $$('#alView .al-n').forEach(e=>e.className='al-n');
  F.timer=setInterval(fTick,10);renderAlankar();wakeSync();
  track('alankar_started',{alankar:AL[S.alank].name,bpm:S.bpm,loop:S.alLoop,graded:coach.on});
}
function fStop(manual){
  clearInterval(F.timer);F.running=false;coach.override=null;$$('#alView .al-n.cur').forEach(e=>e.classList.remove('cur'));
  renderAlankar();wakeSync();
  if(manual) track('alankar_stopped',{alankar:AL[S.alank].name,rounds:F.round});
  if(!manual) alScore(false);
}
/* Score for the pass just finished. In loop mode each round is scored as it ends, with the best round so far. */
function alScore(looping){
  if(!coach.on||!F.res.length) return;
  const c=F.res.filter(r=>r==='clean').length,a=F.res.filter(r=>r==='airy').length,m=F.res.length-c-a,el=$('#alScore');
  F.best=Math.max(F.best,c);track('alankar_scored',{alankar:AL[S.alank].name,bpm:S.bpm,round:F.round,clean:c,airy:a,missed:m,total:F.res.length});
  el.hidden=false;el.innerHTML=`<h4>${looping?`Round ${F.round}: `:''}${c} of ${F.res.length} notes clean</h4><p class="muted">${a} airy · ${m} missed or off pitch.${looping&&F.round>1?` Best round so far: ${F.best} of ${F.res.length}.`:''} Missed notes are underlined; try them slower.</p>`;
}
function fTick(){
  const now=performance.now();if(now<F.next) return;
  const beat=60000/S.bpm,seq=alSeq(S.alank);F.next+=beat;
  if(F.count>0){click(F.count===4);$('#alStatus').textContent=`Count-in… ${F.count}`;F.count--;return;}
  if(F.rest>0){click(true);F.rest--;$('#alStatus').textContent=`Breathe… round ${F.round} next`;return;}
  if(F.idx>=0) gradeNote(F.idx,F.beatStart,now,seq);
  F.idx++;F.beatStart=now;
  if(F.idx>=seq.length){
    if(!S.alLoop){fStop(false);return;}
    /* loop: score this round, take one beat to breathe, then start again from the first note */
    alScore(true);F.round++;F.idx=-1;F.res=[];F.rest=1;coach.override=null;
    $$('#alView .al-n.cur').forEach(e=>e.classList.remove('cur'));
    F.next-=beat;return;
  }
  if(F.idx===0) $$('#alView .al-n').forEach(e=>e.className='al-n');
  click(false);coach.override=NOTE[seq[F.idx]];
  $$('#alView .al-n.cur').forEach(e=>e.classList.remove('cur'));
  const cur=$(`#alView .al-n[data-i="${F.idx}"]`);if(cur) cur.classList.add('cur');
  $('#alStatus').textContent=`${S.alLoop?`Round ${F.round} · `:''}${F.idx+1} / ${seq.length} · ${NOTE[seq[F.idx]].name}`;
}
function gradeNote(i,t0,t1,seq){
  const el=$(`#alView .al-n[data-i="${i}"]`);if(!coach.on){return;}
  const fs=F.frames.filter(f=>f.t>=t0+0.25*(t1-t0)&&f.t<=t1+40);F.frames=F.frames.filter(f=>f.t>t1);
  let r='miss';
  if(fs.length){const on=fs.filter(f=>f.target&&f.target.id===seq[i]&&onTarget(f)&&Math.abs(f.cents)<=35),clean=on.filter(f=>f.cls!=='airy');
    if(clean.length>=fs.length*0.4) r='clean';else if(on.length>=fs.length*0.4) r='airy';}
  F.res.push(r);if(el) el.classList.add('r-'+r);
}
const EG={note:null,score:0,total:0,answered:true};
function egPool(){return S.egRange==='low'?NOTES.slice(0,7):NOTES;}
/* The mystery note plays without lighting any note button, and live note readouts are hidden while it sounds. */
function egHear(){if(!EG.note) return;playHz(freqOf(EG.note),1.5);EG.maskUntil=performance.now()+1900;}
const egMasked=()=>performance.now()<(EG.maskUntil||0);
function egPlay(){const p=egPool();EG.note=p[Math.floor(Math.random()*p.length)];EG.answered=false;egHear();$('#egAgain').disabled=false;$('#egBack').disabled=false;$('#egStatus').textContent=`Which note was that? Tap it, or ${isVoice()?'sing it back':'play it back on your flute'}.`;}
function egAnswer(id){
  if(!EG.note||EG.answered) return;EG.answered=true;EG.total++;
  const ok=id===EG.note.id;if(ok) EG.score++;track('ear_test_answered',{correct:ok,note:EG.note.id});
  $('#egStatus').textContent=ok?`Yes! That was ${EG.note.sg} (${EG.note.name}).`:`That was ${EG.note.sg} (${EG.note.name}), not ${NOTE[id].sg}. Press "Hear again" to compare.`;
  $('#egScore').textContent=`${EG.score} / ${EG.total}`;$('#egBack').disabled=true;
}
async function egPlayBack(){
  if(!EG.note||EG.answered) return;if(!(await micStart())) return;
  refStop();EG.maskUntil=0;$('#egStatus').textContent=`Listening… ${isVoice()?'sing':'play'} the note you heard and hold it.`;
  const got=await new Promise(res=>{let cand=null,since=0;const t0=performance.now();
    const sub=fr=>{const now=performance.now();if(now-t0<350) return;if(fr&&fr.near&&fr.f&&Math.abs(fr.nearCents)<45){if(cand!==fr.near.id){cand=fr.near.id;since=now;}else if(now-since>700){coach.subs.delete(sub);res(cand);return;}}else{cand=null;}if(now-t0>5000){coach.subs.delete(sub);res(null);}};
    coach.subs.add(sub);});
  if(!got){$('#egStatus').textContent='I didn\'t catch a steady note. Try again, holding it a little longer.';return;}
  egAnswer(got);
}

/* ================= Tone Coach sheet ================= */
const polar=(r,deg)=>[160+r*Math.sin(deg*Math.PI/180),172-r*Math.cos(deg*Math.PI/180)];
function buildTuner(){
  const R=135,a=(d,r=R)=>polar(r,d).map(v=>v.toFixed(1)).join(' ');
  let s=`<path class="tn-arc" d="M${a(-60)}A${R} ${R} 0 0 1 ${a(60)}"/><path class="tn-zone" d="M${a(-18)}A${R} ${R} 0 0 1 ${a(18)}"/>`;
  for(let c=-50;c<=50;c+=10){const d=c*1.2,[x1,y1]=polar(c%50===0?118:124,d),[x2,y2]=polar(R-8,d);s+=`<line class="tn-tick" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;}
  [[-50,'−50'],[0,'0'],[50,'+50']].forEach(([c,t])=>{const[x,y]=polar(R+16,c*1.2);s+=`<text class="tn-lab" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle">${t}</text>`;});
  s+=`<g class="tn-needle" id="tnNeedle" data-tone="idle"><line x1="160" y1="172" x2="160" y2="58"/><circle cx="160" cy="172" r="8" fill="#EBB453"/></g>`;
  $('#tnSvg').innerHTML=s;
  const opts='<option value="page">Follow the page</option>'+NOTES.map(n=>`<option value="${n.id}">${n.sg} · ${n.name}</option>`).join('');
  $('#coachTarget').innerHTML=opts;$('#recTarget').innerHTML='<option value="auto">Any note (auto)</option>'+NOTES.map(n=>`<option value="${n.id}">${n.sg} · ${n.name}</option>`).join('');
  $('#noiseVal').textContent=`Gate ${S.gate} dB`;
}
function coachLive(fr){
  if(openSheetName!=='coach') return;
  if(egMasked()){setT('#tnNote','?');setT('#tnCents','');setT('#tnHint','Ear test in progress');$('#tnHint').dataset.tone='idle';$('#tnNeedle').dataset.tone='idle';return;}
  const h=hintFor(fr),nd=$('#tnNeedle'),tg=currentTarget();
  setT('#tnHint',h.text);$('#tnHint').dataset.tone=h.tone;
  setT('#tnTarget',tg?`Target: ${tg.sg} · ${tg.name} · ${freqOf(tg).toFixed(1)} Hz`:'Target: nearest note');
  if(fr&&fr.f){
    const n=fr.near;setT('#tnNote',n?n.sg:western(fr.f).name);
    const c=onTarget(fr)||fr.cls==='between'?fr.cents:null;
    setT('#tnCents',(c===null?'':centsTxt(c)+' · ')+`${fr.f.toFixed(1)} Hz · ${western(fr.f).name}`);
    nd.style.transform=`rotate(${c===null?0:clamp(c,-50,50)*1.2}deg)`;nd.dataset.tone=c===null?'bad':TONE[fr.cls];
  }else{setT('#tnNote',fr&&fr.cls==='air'?'air':'—');setT('#tnCents','');nd.style.transform='rotate(0deg)';nd.dataset.tone='idle';}
  const p=fr&&fr.f?fr.purity:0;setT('#mPurV',fr&&fr.f?`${Math.round(p/5)*5} ${purLabel(p)}`:'—');$('#mPur').style.width=p+'%';$('#mPurM').dataset.band=purBand(p);
  const sd=steadiness();setT('#mStdV',sd===null?'—':`±${sd.toFixed(1)}¢`);setT('#mStdL',sd===null?' ':sd<6?'Very steady':sd<12?'Steady':'Wobbly, support the breath');
  const dbv=fr?fr.db:-90;setT('#mDbV',fr?`${Math.round(dbv)} dB`:'—');$('#mDb').style.width=clamp((dbv+70)/60*100,0,100)+'%';
  const bn=tg?tg.id:(sus.note||null);setT('#tnHold',secs(sus.dur));setT('#tnBestN',bn?NOTE[bn].sg:'—');setT('#tnBest',bn&&bests[bn]?secs(Math.max(bests[bn],susFor(bn))):'—');
  drawTrace($('#traceCv'),coach.trace,performance.now(),8000,tg);
}
async function measureNoise(){
  if(!(await micStart())) return;
  const vals=[],sub=fr=>{if(fr) vals.push(fr.db);};
  ['#noiseVal','#gateV'].forEach(s=>$(s).textContent='Stay quiet…');
  coach.subs.add(sub);await sleep(2000);coach.subs.delete(sub);
  vals.sort((a,b)=>a-b);const p80=vals.length?vals[Math.floor(vals.length*0.8)]:-70;
  S.gate=clamp(Math.round(p80+8),-75,-25);saveS();
  $('#noiseVal').textContent=`Gate ${S.gate} dB (room ≈ ${Math.round(p80)} dB)`;$('#gateV').textContent=`${S.gate} dB`;toast(`Room noise measured. Sounds above ${S.gate} dB count as playing.`);
}
async function selfTest(){
  if(coach.testing) return;coachInit();refStop();
  const btn=$('#stBtn');btn.disabled=true;
  if(coach.hp){try{coach.hp.disconnect();}catch(e){}}
  const tap=AC.createGain();refBus.connect(tap);tap.connect(coach.an);
  coach.testing=true;applyRefMute();refBus.gain.setValueAtTime(1,AC.currentTime);startLoop();
  const grid=$('#stGrid');grid.innerHTML=NOTES.map(n=>`<div id="st-${n.id}"><b>${n.sg}</b>…</div>`).join('');$('#stSum').textContent='Testing…';
  const saved=coach.override;let pass=0;
  for(const n of NOTES){
    coach.override=n;refPlay(n.id);await sleep(420);
    const fs=[],sub=fr=>{if(fr&&fr.f) fs.push(fr);};coach.subs.add(sub);await sleep(380);coach.subs.delete(sub);
    const f=median(fs.map(x=>x.f)),c=f?1200*Math.log2(f/freqOf(n)):NaN,ok=isFinite(c)&&Math.abs(c)<=5,pu=fs.length?Math.round(avg(fs.map(x=>x.purity))):0;
    if(ok) pass++;
    const cell=$('#st-'+n.id);cell.className=ok?'pass':'fail';cell.innerHTML=`<b>${n.sg}</b>${isFinite(c)?centsTxt(c):'no read'} · ${pu}`;
  }
  refStop();coach.override=saved;coach.testing=false;
  try{refBus.disconnect(tap);tap.disconnect();}catch(e){}
  if(coach.on&&coach.hp) coach.hp.connect(coach.an);
  applyRefMute();btn.disabled=false;
  $('#stSum').textContent=pass===NOTES.length?`All ${pass} notes passed. Second number is tone purity (a pure synthetic tone should read near 100).`:`${pass} of ${NOTES.length} passed. If several fail, reload the page and run it again.`;
}
function showRecording(an,file){
  track('recording_analyzed',{seconds:Math.round(an.duration/1000)});
  const tgtId=$('#recTarget').value,tgt=tgtId==='auto'?null:NOTE[tgtId],frames=framesFrom(an,tgt),out=$('#recOut');
  const loud=frames.filter(f=>f.loud),pitched=loud.filter(f=>f.f),L=Math.max(1,loud.length),hop=an.raws.length>1?an.raws[1].t-an.raws[0].t:21;
  const clear=pitched.filter(f=>f.purity>=75).length/L,airy=pitched.filter(f=>f.purity<AIRY_BELOW).length/L,air=loud.filter(f=>f.cls==='air').length/L;
  const byNote={};pitched.forEach(f=>{if(!f.near) return;const b=byNote[f.near.id]||(byNote[f.near.id]={n:0,c:0,p:0});b.n++;b.c+=f.nearCents;b.p+=f.purity;});
  const rows=NOTES.filter(n=>byNote[n.id]&&byNote[n.id].n*hop>250).map(n=>{const b=byNote[n.id];return `<tr><td><b>${n.sg}</b> <span class="muted">${n.name}</span></td><td class="mono">${secs(b.n*hop)}</td><td class="mono">${centsTxt(b.c/b.n)}</td><td class="mono">${Math.round(b.p/b.n)}</td></tr>`;}).join('');
  let h=`<div class="diag-res"><h4>${esc(file.name)}</h4><div class="diag-stats">${secs(an.duration)}${an.truncated?' (first 2 min)':''} · sounding ${secs(L*hop)} · clear ${pct(clear)} · airy ${pct(airy)} · air only ${pct(air)}</div>`;
  if(tgt){const d=diagnose(frames,tgt);h+=`<p style="margin-top:.6rem"><b>${d.title}.</b> ${d.text}</p>${d.sym?`<div class="row" style="margin-top:.5rem"><button class="btn" data-sym-open="${d.sym}">Open checklist ${d.sym}</button></div>`:''}`;}
  h+=`</div>${rows?`<div class="table-wrap" style="margin-top:.7rem"><table class="res-table"><thead><tr><th>Note heard</th><th>Time</th><th>Avg pitch</th><th>Purity</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p class="muted" style="margin-top:.6rem">No steady notes found in this recording.</p>'}<canvas class="trace" id="recCv" aria-label="Pitch trace of the recording"></canvas>`;
  out.innerHTML=h;
  requestAnimationFrame(()=>drawTrace($('#recCv'),frames,an.duration,Math.max(1000,an.duration),tgt));
}

/* ================= settings sheet ================= */
function syncSettings(){
  $('#fine').value=FL().fine;$('#fineV').textContent=(FL().fine>0?'+':'')+FL().fine+'¢';
  $$('#inton button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===S.inton));
  $('#gap').value=S.gap;$('#gapV').textContent=S.gap.toFixed(1)+' s';
  $('#strict').value=S.strict;$('#strictV').textContent=(S.strict>0?'+':'')+S.strict;
  $('#gateV').textContent=S.gate+' dB';$('#autoMute').checked=S.autoMute;$('#chimeOn').checked=S.chime;$('#clickOn').checked=S.click;$('#standOn').checked=S.stand;
  $('#standBtn').setAttribute('aria-pressed',S.stand);document.documentElement.classList.toggle('stand',S.stand);
  const ac=$('#alClick');if(ac) ac.checked=S.click;const gc=$('#gdChime');if(gc) gc.setAttribute('aria-pressed',S.chime);
  buildSaPick();syncSaLabel();
}
function setSaTo(f,why,how){
  const p=FL();Object.assign(p,{sa:Math.round(f*100)/100,fine:0,cal:how||true});track('sa_set',{how:how||'measured',note:western(f).name});
  if(!isVoice()){delete p.demo;if(p.key==='?'){const k=western(f).name.replace(/-?\d+$/,'');const kk=KEYS.includes(k)?k:KEYS[((Math.round(midiOf(f))%12)+12)%12];if(p.name==='My flute'||/^My flute \d+$/.test(p.name)) p.name=uniqueName(`${kk} ${regOf(f)}`);p.key=kk;}}
  saveS();syncSettings();retune();hideSaBanner();renderInstSheet();
  toast(`${isVoice()?'Voice':FL().name}: Sa set to ${western(f).name}${isVoice()?' ('+harmName(f)+')':''} (${f.toFixed(2)} Hz)${why?'. '+why:''}. Everything is retuned.`);
}
function buildSaPick(){
  const sel=$('#saPick'),cur=Math.round(69+12*Math.log2(FL().sa/440)),[lo,hi]=isVoice()?[40,72]:[52,84];let h='';
  for(let m=lo;m<=hi;m++){const f=440*Math.pow(2,(m-69)/12);h+=`<option value="${m}">${western(f).name}${isVoice()?' · '+harmName(f):''} · ${f.toFixed(1)} Hz</option>`;}
  sel.innerHTML=h;sel.value=String(clamp(cur,lo,hi));
}
function captureStable(maxMs,needMs,onProg,tol){
  tol=tol||35;
  return new Promise(res=>{
    let run=[];const t0=performance.now();
    const sub=fr=>{
      const now=performance.now();
      if(fr&&fr.f&&fr.clarity>0.85){
        if(run.length&&Math.abs(1200*Math.log2(fr.f/median(run.map(x=>x.f))))>tol) run=[];
        run.push({t:now,f:fr.f});
        if(run[run.length-1].t-run[0].t>=needMs){coach.subs.delete(sub);res(median(run.map(x=>x.f)));return;}
      }else if(run.length&&now-run[run.length-1].t>250) run=[];
      if(onProg) onProg(run.length?(run[run.length-1].t-run[0].t)/needMs:0);
      if(now-t0>maxMs){coach.subs.delete(sub);res(null);}
    };
    coach.subs.add(sub);
  });
}
async function findSa(){
  if(isVoice()) return findSaVoice();
  openSheet('settings');
  if(!(await micStart())) return;
  const out=$('#calOut'),btn=$('#calBtn'),fl=FL().key,flName=esc(FL().name),saved=coach.override;
  out.hidden=false;btn.disabled=true;coach.override=null;
  const prog=p=>{const e=$('#calProg');if(e) e.style.width=clamp(p,0,1)*100+'%';};
  const finish=html=>{out.innerHTML=html;coach.override=saved;btn.disabled=false;};
  out.innerHTML=`<p><b>Step 1 of 2: lowest note.</b> Close <b>all six holes</b> and play your lowest note softly, a warm “Hoo”. Hold it until the bar fills.</p>${fluteSVG(holesFor(6),{labels:false})}<div class="prog"><i id="calProg"></i></div>`;
  let f1=await captureStable(10000,1500,prog);
  if(!f1) return finish('<p>I couldn\'t hear a steady low note. Seal every hole with flat finger pads, play softly, and press Find my Sa again.</p>');
  out.innerHTML=`<p>Lowest note: <b class="mono">${f1.toFixed(1)} Hz</b> (${western(f1).name}).</p><p style="margin-top:.4rem"><b>Step 2 of 2: Sa.</b> Lift your whole right hand so <b>only the top three holes</b> are closed, and play. Hold it until the bar fills.</p>${fluteSVG(holesFor(3),{labels:false})}<div class="prog"><i id="calProg"></i></div>`;
  await sleep(700);
  let f2=await captureStable(10000,1500,prog);
  if(!f2) return finish('<p>I couldn\'t hear a steady Sa. Press Find my Sa again and hold the second note a little longer.</p>');
  let iv=1200*Math.log2(f2/f1),note='';
  if(Math.abs(iv-1698)<80){f2/=2;iv-=1200;note=' Your Sa jumped up an octave, so I used the lower octave. Play Sa a little softer.';}
  else if(Math.abs(iv+702)<80){f1/=2;iv+=1200;note=' Your lowest note jumped up an octave, so I used the lower octave.';}
  const fourth=Math.abs(iv-498)<60;
  if(!fourth) note+=Math.abs(iv)<60?' Both notes sounded the same; check that your right hand lifted for step 2.':` The two notes are ${Math.round(iv)}¢ apart instead of a fourth (about 498¢). That usually means a leak on the low note, so I trust the Sa reading.`;
  const strip=s=>s.replace(/-?\d+$/,''),w=western(f2),saName=strip(w.name),lowName=strip(western(f2*0.75).name);
  const label=fl==='?'?`Your flute's Sa is ${saName}.`:saName===fl?`That matches the ${fl} label: your flute is named after its Sa.`:lowName===fl?`Your flute is named after its lowest note (${fl}, all six holes closed), so its Sa is ${saName}.`:`Your flute's Sa is ${saName}, not ${fl}.`;
  finish(`<p>Your Sa: <b class="mono">${f2.toFixed(2)} Hz</b> = ${w.name} ${centsTxt(w.cents)}.${fourth?' Lowest note to Sa is a clean fourth ✓':''}</p><p class="muted" style="margin-top:.35rem">${label}${note}</p><div class="row" style="margin-top:.7rem"><button class="btn primary" id="calUse">Use this Sa for ${flName}</button><button class="btn" id="calCancel">Cancel</button></div>`);
  $('#calUse').onclick=()=>{setSaTo(f2);out.hidden=true;};
  $('#calCancel').onclick=()=>{out.hidden=true;};
}
async function findSaVoice(){
  openSheet('settings');
  if(!(await micStart())) return;
  const out=$('#calOut'),btn=$('#calBtn'),saved=coach.override;
  out.hidden=false;btn.disabled=true;coach.override=null;
  const prog=p=>{const e=$('#calProg');if(e) e.style.width=clamp(p,0,1)*100+'%';};
  const finish=html=>{out.innerHTML=html;coach.override=saved;btn.disabled=false;};
  out.innerHTML='<p><b>Step 1 of 2: lowest comfortable note.</b> Sing “aa” on a low note that still feels easy, not gravelly. Hold it until the bar fills.</p><div class="prog"><i id="calProg"></i></div>';
  const lo=await captureStable(12000,1200,prog,50);
  if(!lo) return finish('<p>I couldn\'t hear a steady note. Sing a little louder and hold it, then press the button again.</p>');
  out.innerHTML=`<p>Lowest: <b class="mono">${western(lo).name}</b> (${lo.toFixed(1)} Hz).</p><p style="margin-top:.4rem"><b>Step 2 of 2: highest comfortable note.</b> Sing “aa” on a high note that's still your normal voice: not strained, not falsetto. Hold it.</p><div class="prog"><i id="calProg"></i></div>`;
  await sleep(700);
  const hi=await captureStable(12000,1200,prog,50);
  if(!hi||hi<=lo*1.06) return finish('<p>I couldn\'t hear a steady high note clearly above your low one. Press the button and try again.</p>');
  const mLo=69+12*Math.log2(lo/440),mHi=69+12*Math.log2(hi/440),range=mHi-mLo;
  const sa=Math.round(mLo+5+clamp((range-17)/2,0,2)),f=440*Math.pow(2,(sa-69)/12),fits=range>=17;
  finish(`<p>Your comfortable range: <b>${western(lo).name}</b> to <b>${western(hi).name}</b> (${Math.round(range)} semitones).</p><p style="margin-top:.35rem">Suggested Sa: <b class="mono">${western(f).name}</b> (${harmName(f)}) · ${f.toFixed(1)} Hz. That puts low Pa near the bottom of your range${fits?' and upper Sa within reach.':'. Upper Sa may feel high for now, so practise up to Ni until it opens up.'}</p><div class="row" style="margin-top:.7rem"><button class="btn" id="calHear">Hear this Sa</button><button class="btn primary" id="calUse">Use this Sa</button><button class="btn" id="calCancel">Cancel</button></div>`);
  $('#calHear').onclick=()=>playHz(f,1.6);
  $('#calUse').onclick=()=>{setSaTo(f,'','measured');out.hidden=true;};
  $('#calCancel').onclick=()=>{out.hidden=true;};
}
/* Sa mismatch watcher: Sa selected, but a different steady pitch is held */
const mm={midi:null,acc:0,last:0,fs:[],shown:new Set()};
function checkMismatch(fr){
  if(isVoice()) return;
  if(!fr||!fr.target||fr.target.id!=='sa'||coach.override||coach.testing) return;
  const bad=fr.f&&fr.clarity>0.85&&fr.purity>=35&&['wrong','octave'].includes(fr.cls);
  if(!bad){if(fr.f&&onTarget(fr)){mm.midi=null;mm.acc=0;}return;}
  const midi=Math.round(69+12*Math.log2(fr.f/440)),now=fr.t;
  if(mm.midi!==midi){mm.midi=midi;mm.acc=0;mm.fs=[];mm.last=now;}
  mm.acc+=Math.min(100,now-mm.last);mm.last=now;mm.fs.push(fr.f);if(mm.fs.length>150) mm.fs.shift();
  const key=curId()+':'+midi;
  if(mm.acc>2500&&!mm.shown.has(key)&&$('#saBanner').hidden){mm.shown.add(key);showSaBanner(median(mm.fs));}
}
function showSaBanner(f){
  const w=western(f),sa=saEff(),ws=western(sa),iv=1200*Math.log2(f/sa),fl=esc(FL().name),b=$('#saBanner');
  let msg;
  if(Math.abs(iv+498)<50) msg=`I hear <b>${w.name}</b> (${f.toFixed(1)} Hz). With Sa set to ${ws.name}, that is <b>Low Pa</b>: the note with <b>all six holes closed</b>. Sa uses only the top three holes, so lift your right-hand fingers. If your three-hole note really sounds at ${w.name}, set Sa to it.`;
  else if(Math.abs(iv-1200)<50) msg=`You're holding <b>${w.name}</b> (${f.toFixed(1)} Hz), an octave above the Sa I expect (${ws.name}). If that is your flute's normal Sa, set Sa to it.`;
  else msg=`You're holding <b>${w.name}</b> (${f.toFixed(1)} Hz) with Sa selected, but Sa for your ${fl} is set to <b>${ws.name}</b> (${sa.toFixed(1)} Hz). If ${w.name} is what your flute plays with the top three holes closed, set Sa to it.`;
  b.innerHTML=`<p>${msg}</p><div class="row"><button class="btn primary" id="bnSet">Set Sa to ${w.name}</button><button class="btn" id="bnFind">Find my Sa (guided)</button><button class="btn" id="bnHide">Dismiss</button></div>`;
  b.dataset.f=f;b.hidden=false;
}
function hideSaBanner(){$('#saBanner').hidden=true;mm.midi=null;mm.acc=0;}

/* ================= sheets, tabs, keyboard, wake lock ================= */
let openSheetName=null,lastFocus=null;
function openSheet(name){
  if(openSheetName===name) return;if(openSheetName) closeSheet();
  lastFocus=document.activeElement;openSheetName=name;$('#scrim').hidden=false;const sh=$('#sheet-'+name);sh.hidden=false;
  if(name==='coach'){coachLive(coach.view);if(!coach.on) drawTrace($('#traceCv'),coach.trace,performance.now(),8000,currentTarget());}
  if(name==='settings') syncSettings();
  if(name==='inst'){renderInstSheet();renderAddForm();}
  const c=sh.querySelector('[data-close]');if(c) c.focus();
}
function closeSheet(){if(!openSheetName) return;$('#sheet-'+openSheetName).hidden=true;$('#scrim').hidden=true;openSheetName=null;if(lastFocus&&lastFocus.focus) lastFocus.focus();}
let activeTab='flute';
const TABS=['flute','drop','fix','riyaz'];
function setTab(t,initial){
  if(!TABS.includes(t)) t='flute';
  if(!initial&&t!==activeTab) track('tool_tab_viewed',{tab:t});
  activeTab=t;
  TABS.forEach(x=>{$('#tab-'+x).hidden=x!==t;$('#tb-'+x).setAttribute('aria-selected',x===t);});
  store.set('tab',t);
  if(t==='flute'){renderT1();t1Live(coach.view);}
  if(t==='riyaz'){renderAlankar();renderWeek();updateClocks();}
}
let wakeSentinel=null;
async function wakeSync(){
  const need=D.running||!!RT.run||F.running;
  try{
    if(need&&!wakeSentinel&&'wakeLock' in navigator){wakeSentinel=await navigator.wakeLock.request('screen');wakeSentinel.addEventListener('release',()=>{wakeSentinel=null;});}
    else if(!need&&wakeSentinel){await wakeSentinel.release();wakeSentinel=null;}
  }catch(e){wakeSentinel=null;}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible') wakeSync();});

/* ================= events ================= */
document.addEventListener('click',e=>{
  const t=e.target.closest('button,[data-close]');
  if(e.target.id==='scrim'){closeSheet();return;}
  if(!t) return;
  const d=t.dataset;
  if(d.openInst!==undefined){openSheet('inst');return;}
  if(d.use) return setInstrument(d.use);
  if(d.remove) return removeInst(d.remove);
  if(d.addkey){A.key=d.addkey;A.m=null;renderAddForm();return;}
  if(d.ref) return refToggle(d.ref);
  if(d.mic!==undefined) return micToggle();
  if(d.t1mode){T1.follow=d.t1mode==='follow';store.set('t1follow',T1.follow);renderT1();t1Live(coach.view);if(T1.follow&&!coach.on) micStart();return;}
  if(d.pick){if(T1.follow){T1.follow=false;store.set('t1follow',false);}T1.sel=d.pick;store.set('t1sel',T1.sel);T1.glow=false;$('#t1Stage').classList.remove('glow');$('#t1Live').classList.remove('glow');$('#t1Ghost').hidden=true;if(ref.id&&ref.id!==T1.sel) refPlay(T1.sel);renderT1();return;}
  if(d.tab) return setTab(d.tab);
  if(d.goto){closeSheet();setTab(d.goto);window.scrollTo({top:0,behavior:'smooth'});return;}
  if(d.close!==undefined) return closeSheet();
  if(d.sym){symSel=d.sym;renderSym();if(window.innerWidth<900) $('#symDetail').scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(d.symOpen){closeSheet();setTab('fix');symSel=d.symOpen;renderSym();$('#symDetail').scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(d.blkGo) return blkStart(d.blkGo);
  if(d.blkReset) return blkReset(d.blkReset);
  if(d.blkSkip) return blkSkip(d.blkSkip);
  if(d.al!==undefined){if(F.running) fStop(true);S.alank=+d.al;saveS();$('#alScore').hidden=true;renderAlankar();return;}
  if(d.eg) return egAnswer(d.eg);
  if(d.openCoach!==undefined) return openSheet('coach');
  if(d.v&&t.parentElement.id==='gdMode'){D.mode=d.v;store.set('gdMode',D.mode);if(D.mode==='listen'&&!coach.on) micStart();syncGdSettings();return;}
  if(d.v&&t.parentElement.id==='inton'){S.inton=d.v;saveS();syncSettings();retune();return;}
  switch(t.id){
    case 'droneBtn':return droneToggle();
    case 'coachChip':return openSheet('coach');
    case 'settingsBtn':return openSheet('settings');
    case 'standBtn':S.stand=!S.stand;saveS();syncSettings();return;
    case 't1Hear':return refToggle(T1.sel);
    case 'gdStart':return gdStart();
    case 'gdReset':return gdReset();
    case 'gdSkip':if(D.started){D.prog=phaseNeed(D.phase);if(!D.running){advancePhase();renderGd();}}return;
    case 'gdChime':S.chime=!S.chime;saveS();syncSettings();return;
    case 'gdDrone':case 'rzDrone':return droneToggle();
    case 'dgListen':return dgListen();
    case 'noiseBtn':case 'noiseBtn2':return measureNoise();
    case 'stBtn':return selfTest();
    case 'calBtn':return findSa();
    case 'bnSet':return setSaTo(+$('#saBanner').dataset.f);
    case 'bnFind':hideSaBanner();return findSa();
    case 'bnHide':return hideSaBanner();
    case 'bnLow':return setSaTo(138.59,'','picked');
    case 'bnHigh':return setSaTo(220,'','picked');
    case 'calReset':{if(isVoice()){S.voice=Object.assign({},DEFAULT_VOICE);saveS();syncSettings();retune();renderInstSheet();toast('Voice: Sa reset to C#3 (Kali 1).');return;}const p=FL(),f=p.est||(p.len?estFor(p.len):392);Object.assign(p,{sa:f,fine:0,cal:false});saveS();syncSettings();retune();renderInstSheet();toast(`${p.name}: Sa reset to the estimate, ${western(f).name} (${f} Hz).`);return;}
    case 'wcFind':welcomeDone();return findSa();
    case 'wcSkip':welcomeDone();return;
    case 'addGo':return addFlute();
    case 'bkExport':return exportData();
    case 'alGo':return fStart();
    case 'egPlay':return egPlay();
    case 'egAgain':return egHear();
    case 'egBack':return egPlayBack();
  }
});
document.addEventListener('change',e=>{
  const t=e.target,d=t.dataset;
  if(d.rename){const x=S.inst.find(i=>i.id===d.rename),n=t.value.trim();if(x&&n){x.name=n===x.name?n:uniqueName(n);saveS();syncSaLabel();}renderInstSheet();return;}
  if(t.name==='addSize'){A.m=+t.value;renderAddForm();return;}
  if(d.step!==undefined){(symChecks[symKey()]||(symChecks[symKey()]=[]))[+d.step]=t.checked;t.closest('.step').classList.toggle('checked',t.checked);return;}
  if(d.blkDone){if(t.checked) track('riyaz_block_completed',{block:BLOCKS.find(b=>b.id===d.blkDone).title,how:'checkbox'});day.done[d.blkDone]=t.checked;saveDay();renderBlocks();renderWeek();return;}
  switch(t.id){
    case 'coachTarget':coach.sel=t.value;return;
    case 'autoMute':S.autoMute=t.checked;saveS();if(AC) applyRefMute();return;
    case 'chimeOn':S.chime=t.checked;saveS();syncSettings();return;
    case 'clickOn':case 'alClick':S.click=t.checked;saveS();syncSettings();return;
    case 'standOn':S.stand=t.checked;saveS();syncSettings();return;
    case 'egRange':S.egRange=t.value;saveS();return;
    case 'alLoop':S.alLoop=t.checked;saveS();return;
    case 'addLen':renderAddForm();return;
    case 'saPick':setSaTo(440*Math.pow(2,(+t.value-69)/12),'','picked');return;
    case 'instSel':if(t.value==='__manage'){t.value=S.cur;openSheet('inst');}else setInstrument(t.value);return;
    case 'bkImport':{const f=t.files&&t.files[0];t.value='';if(f) importData(f);return;}
    case 'dgFile':return handleUpload(t,$('#dgProgWrap'),$('#dgProg'),an=>{const tgt=NOTE[$('#dgNote').value];showDiag(diagnose(framesFrom(an,tgt),tgt),$('#dgResult'));});
    case 'recFile':return handleUpload(t,$('#recProgWrap'),$('#recProg'),showRecording);
  }
});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.id==='addName'){A.nameDirty=!!t.value.trim();return;}
  if(t.id==='addLen'){renderAddForm();return;}
  switch(t.id){
    case 'droneVol':S.vol=+t.value;saveS();if(droneBus) droneBus.gain.setTargetAtTime(volCurve(S.vol),AC.currentTime,0.05);return;
    case 'fine':FL().fine=+t.value;saveS();$('#fineV').textContent=(FL().fine>0?'+':'')+FL().fine+'¢';retune();return;
    case 'gap':S.gap=+t.value;saveS();$('#gapV').textContent=S.gap.toFixed(1)+' s';return;
    case 'strict':S.strict=+t.value;saveS();$('#strictV').textContent=(S.strict>0?'+':'')+S.strict;return;
    case 'gdMult':D.mult=+t.value;store.set('gdMult',D.mult);syncGdSettings();return;
    case 'gdReps':D.reps=+t.value;store.set('gdReps',D.reps);if(D.rep>D.reps) D.rep=D.reps;syncGdSettings();return;
    case 'alBpm':S.bpm=+t.value;saveS();$('#alBpmV').textContent=S.bpm+' bpm';return;
  }
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&openSheetName){closeSheet();return;}
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  const tag=(e.target.tagName||'').toLowerCase();
  if(['input','select','textarea'].includes(tag)) return;
  const k=e.key.toLowerCase();
  if(k===' '||e.code==='Space'){
    if(tag==='button') return;
    e.preventDefault();
    if(activeTab==='drop') gdStart();
    else if(activeTab==='riyaz'){if(RT.run) blkPause();else{const nx=BLOCKS.find(b=>!day.done[b.id])||BLOCKS[0];blkStart(nx.id);}}
    else if(activeTab==='flute') refToggle(T1.sel);
    return;
  }
  if(k==='d'){droneToggle();return;}
  if(k==='m'){micToggle();return;}
  if(['1','2','3','4'].includes(k)&&!openSheetName){setTab(TABS[+k-1]);return;}
});
window.addEventListener('resize',()=>{drawLadder();if(openSheetName==='coach') drawTrace($('#traceCv'),coach.trace,performance.now(),8000,currentTarget());});

/* ================= init ================= */
coach.vsubs.add(chipUpdate);coach.vsubs.add(t1Live);coach.vsubs.add(coachLive);coach.vsubs.add(rzLive);
coach.subs.add(fr=>{if(F.running&&fr) F.frames.push(fr);});
buildRefs();buildGd();buildTuner();applyInstrument();
coach.subs.add(fr=>{if(fr) drawLadder();});
$('#droneVol').value=S.vol;
labelRefs();syncSettings();syncDrone();syncMic();renderWeek();
if(!storageOK) $('#storeNote').hidden=false;
if(!S[welcomeKey]) $('#welcome').hidden=false;
const hashTab=(location.hash||'').replace('#','');
setTab(TABS.includes(hashTab)?hashTab:store.get('tab','flute'),true);
window.addEventListener('beforeunload',()=>{saveDay();endSustain();});
})();
