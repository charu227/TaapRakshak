/* Constants + pure helpers ported 1:1 from the prototype */
export const CFG={
  MAPTILER_KEY:'',     // https://cloud.maptiler.com/account/keys/  (free tier; map tiles). Empty = free OpenStreetMap tiles
  OPENWEATHER_KEY:''   // https://home.openweathermap.org/api_keys  (free tier; live temp/humidity/wind). Empty = demo values
};
export const R=['Low','Moderate','High','Very High','Extreme'],C=['#2e7d32','#f2c230','#f57c00','#d32f2f','#8e24aa'],E=['🟢','🟡','🟠','🔴','🟣'];
const rk=[0,1,1,2,1,2,2,3,2,3,3,4,0,1,2,3];
export const makeWards=()=>{const W=rk.map((r,i)=>({n:'Ward '+(i+1),r,t:Math.round(36+r*2.2+(i%3)),h:55+r*4+(i%4)*2,e:(i*37)%80+15,o:(i*53)%85+10,p:(i*29)%75+20,tree:Math.max(5,45-r*8+(i*11)%15),roof:Math.max(2,30-r*5+(i*9)%20)}));
W.forEach((w,i)=>w.htsi=Math.min(100,w.r*20+1+(i*7)%18));
W.forEach((w,i)=>w.aqi=Math.min(480,40+w.r*45+(i*17)%60));return W};
export const RG=['0–20','21–40','41–60','61–80','81–100'],AL=['No alert','⚠️ Advisory','🔔 Heat Alert','🚨 Strong Heat Alert','🚨 Emergency Heat Alert'];
export const AQL=['Good','Satisfactory','Moderate','Poor','Severe'],AQG=['0–50','51–100','101–200','201–300','300+'],aqLv=v=>v<=50?0:v<=100?1:v<=200?2:v<=300?3:4;
export const OSIadv=['Air and heat conditions are safe for normal outdoor activity.','Sensitive groups (elderly, children, respiratory/heart conditions) should reduce prolonged outdoor exertion.','Limit outdoor activity, especially 12–4 PM; wear a mask if pollution feels high.','Avoid outdoor exposure where possible — heat and pollution are compounding today.','Stay indoors — combined heat and air-quality risk is severe.'];
export const scoreTier=s=>s>=60?'#2e7d32':s>=35?'#f2c230':'#d32f2f';
export const lv=h=>h<=20?0:Math.min(4,Math.ceil(h/20)-1),DL=[0,6,13,9,1];
export const HS=[[10,[46,125,50]],[30,[242,194,48]],[50,[245,124,0]],[70,[211,47,47]],[90,[142,36,170]]];
export const hc=v=>{let a=HS[3],b=HS[4];for(let k=0;k<4;k++)if(v<=HS[k+1][0]){a=HS[k];b=HS[k+1];break}const f=Math.max(0,Math.min(1,(v-a[0])/(b[0]-a[0])));return`rgb(${a[1].map((c,j)=>Math.round(c+(b[1][j]-c)*f)).join(',')})`};
export const day=['Today','Tomorrow','Day 3','Day 4','Day 5'];
export const LN={en:'English',hi:'हिन्दी',ta:'தமிழ்',bn:'বাংলা'},SC=[3,3,0,3,1,4,1],GC=[2,0,1,4];

export const isOpen=c=>{const h=new Date().getHours();return h>=c.oh[0]&&h<c.oh[1]},tel=c=>'tel:'+c.ph.replace(/[^\d+]/g,'');
export const FA=['💧 Drinking water','🧂 ORS','🌬️ AC / coolers','🩺 First aid','♿ Wheelchair access','🛏️ Rest area','🔌 Phone charging'];
export const makeCC=()=>[
{n:'Cooling Center A',ward:7,addr:'Govt. School Hall, Main Road',ll:[28.67,77.29],cap:500,occ:320,d:'0.8 km',hr:'8 AM–8 PM',oh:[8,20],inc:'Mr. R. K. Sharma',ph:'011-4000-1101',fac:[FA[0],FA[1],FA[2],FA[3],FA[4]]},
{n:'Cooling Center B',ward:10,addr:'Community Hall, Block C Market',ll:[28.645,77.33],cap:300,occ:280,d:'1.4 km',hr:'9 AM–7 PM',oh:[9,19],inc:'Ms. Anita Verma',ph:'011-4000-1102',fac:[FA[0],FA[1],FA[2],FA[5],FA[6]]},
{n:'Cooling Center C',ward:3,addr:'Municipal Dharamshala, Bus Depot Road',ll:[28.685,77.25],cap:200,occ:200,d:'2.1 km',hr:'24 hours',oh:[0,24],inc:'Mr. Imran Khan',ph:'011-4000-1103',fac:[FA[0],FA[1],FA[3],FA[4],FA[5]]}];
export const HF=[
  {n:'Indira Gandhi Hospital',t:'Government Hospital',d:'2.1 km',addr:'Dwarka Sector 9, New Delhi, Delhi 110077',ll:[28.5829,77.0669],ph:'011-20895995',bed:1241,avail:186,icu:72,icuAvail:14,er:18,erAvail:7,vent:24,ventAvail:6,load:85,cap:'High',demo:true},
  {n:'Ayushman Hospital & Health Services',t:'Multispeciality Hospital',d:'2.6 km',addr:'Sector 10, Dwarka, Delhi 110075',ll:[28.5846,77.0662],ph:'011-49495566',bed:250,avail:64,icu:30,icuAvail:7,er:12,erAvail:4,vent:8,ventAvail:2,load:74,cap:'Moderate',demo:true},
  {n:'Aakash Healthcare Super Speciality Hospital',t:'Super Speciality Hospital',d:'3.4 km',addr:'Hospital Plot, Road No. 201, Sector 3, Dwarka, New Delhi 110075',ll:[28.5928,77.0615],ph:'011-43388888',bed:250,avail:58,icu:38,icuAvail:8,er:15,erAvail:5,vent:12,ventAvail:3,load:77,cap:'High',demo:true},
  {n:'Manipal Hospital Delhi',t:'Multispeciality Hospital',d:'4.1 km',addr:'Sector 6, Dwarka, Delhi 110075',ll:[28.5925,77.0740],ph:'011-49674967',bed:380,avail:91,icu:58,icuAvail:11,er:20,erAvail:6,vent:18,ventAvail:4,load:76,cap:'High',demo:true},
  {n:'Venkateshwar Super Speciality Hospital',t:'Super Speciality Hospital',d:'5.0 km',addr:'Sector 18, Sector 18A, Dwarka, New Delhi 110078',ll:[28.5920,77.0825],ph:'011-48555555',bed:325,avail:83,icu:46,icuAvail:9,er:16,erAvail:5,vent:14,ventAvail:3,load:74,cap:'Moderate',demo:true}
];
export const HP=HF.map(h=>h.ll);
const jit=(a,b)=>Math.sin(a*12.9898+b*78.233)*43758.5453%1;
/* Ward centres: intentionally irregular positions across the Delhi/NCR demo area.
   They are NOT arranged in rows/columns so the heat map reads like a city map rather than a chart. */
const WPOS=[
  [28.735,77.105],[28.714,77.185],[28.702,77.265],[28.681,77.335],
  [28.662,77.095],[28.650,77.165],[28.655,77.245],[28.645,77.315],
  [28.625,77.075],[28.620,77.145],[28.605,77.215],[28.615,77.295],
  [28.590,77.115],[28.575,77.205],[28.565,77.285],[28.600,77.350]
];
export const WP=i=>WPOS[i] || [28.65,77.20];
export const WPOLY=i=>{
  const [la,ln]=WP(i), n=9, rot=jit(i+20,7)*0.35, scale=1.0+0.12*jit(i+8,2);
  return Array.from({length:n},(_,k)=>{
    const a=k/n*2*Math.PI+rot, s=(0.82+0.24*jit(i+3,k+9))*scale;
    return [la+Math.sin(a)*.014*s, ln+Math.cos(a)*.019*s];
  });
};
export const WCEN=i=>WP(i);
export const CP=[[28.67,77.29],[28.645,77.33],[28.685,77.25]];
export const WBOUNDS=[[28.53,77.06],[28.74,77.35]];
export const LK={res:'🏘️ Residential',mkt:'🛍️ Market',hos:'🏥 Hospital',prk:'🌳 Park / Heritage',trn:'🚉 Transit hub',ind:'🏭 Industrial',edu:'🏫 Institution'};
/* Indicative localities covered by each ward: [name, kind] */
const WL=[
[['Rohini Sector 3','res'],['Pitampura','res'],['Bawana Industrial Area','ind'],['Rithala Metro','trn'],['Prashant Vihar','res']],
[['Model Town','res'],['Shalimar Bagh','res'],['Azadpur Mandi','mkt'],['Ashok Vihar','res'],['Jahangirpuri','res']],
[['Civil Lines','res'],['Kashmere Gate ISBT','trn'],['Timarpur','res'],['Burari','res'],['North Campus (DU)','edu']],
[['Karawal Nagar','res'],['Yamuna Vihar','res'],['Bhajanpura','mkt'],['Mustafabad','res'],['Wazirabad','res']],
[['Punjabi Bagh','res'],['Paschim Vihar','res'],['Peeragarhi','trn'],['Mangolpuri','ind'],['Rani Bagh Market','mkt']],
[['Karol Bagh Market','mkt'],['Patel Nagar','res'],['Rajendra Place','trn'],['Sir Ganga Ram Hospital','hos'],['Pusa Institute','edu']],
[['Chandni Chowk','mkt'],['Red Fort','prk'],['Daryaganj','mkt'],['ITO','trn'],['Old Delhi Railway Stn','trn']],
[['Shahdara','res'],['Vivek Vihar','res'],['Dilshad Garden','res'],['GTB Hospital','hos'],['Anand Vihar ISBT','trn']],
[['Janakpuri','res'],['Tilak Nagar','mkt'],['Uttam Nagar','res'],['Vikaspuri','res'],['Janakpuri West Metro','trn']],
[['Chanakyapuri','res'],['Delhi Cantt','res'],['RK Puram','res'],['Sarojini Nagar Market','mkt'],['Moti Bagh','res']],
[['Lajpat Nagar','mkt'],['Nizamuddin','res'],['Jangpura','res'],['Lodhi Garden','prk'],['Defence Colony','res']],
[['Mayur Vihar','res'],['Laxmi Nagar','mkt'],['Noida Sector 15','res'],['Noida Sector 18','mkt'],['Pandav Nagar','res']],
[['Dwarka Sector 21','trn'],['Palam','res'],['IGI Airport Area','trn'],['Mahavir Enclave','res'],['Najafgarh Road','mkt']],
[['Vasant Kunj','res'],['Mehrauli','prk'],['Munirka','res'],['JNU','edu'],['Vasant Vihar','res']],
[['Okhla Industrial Area','ind'],['Kalkaji','res'],['Govindpuri','res'],['Nehru Place','mkt'],['Jamia Nagar','res']],
[['Noida Sector 62','ind'],['Noida Sector 37','res'],['Sarita Vihar','res'],['Botanical Garden Metro','trn'],['Noida Sector 50','res']]];
const PAT=[[-.27,.22],[.27,.22],[-.27,-.22],[.27,-.22],[0,-.32]];
export const wardPlaces=i=>WL[i].map((x,k)=>({n:x[0],k:x[1],off:((i*13+k*29)%17)-8,ll:[WP(i)[0]+PAT[k][1]*.032,WP(i)[1]+PAT[k][0]*.038]}));

/* Ward-dependent helpers (W is React state, so they are built from the current wards) */
export const mk=W=>{
  const hs=i=>DL.map(d=>Math.max(0,Math.min(100,W[i].htsi+d)));
  const ts=i=>DL.map(d=>Math.round(W[i].t+d*.25));
  const hl=i=>{const H=hs(i);return H.map((h,k)=>Math.min(100,Math.round(15+.7*(k?(h+H[k-1])/2:h)+W[i].p*.15)))};
  const mr=i=>hs(i).map(h=>Math.min(100,Math.round(Math.pow(h/100,1.8)*100*(.75+W[i].e/300))));
  const fc=i=>hs(i).map(lv);
  const osiLv=i=>{const h=lv(W[i].htsi),a=aqLv(W[i].aqi);return Math.min(4,Math.max(h,a)+(h>=2&&a>=2?1:0))};
  const heatScore=i=>Math.min(100,Math.round(W[i].tree*.55+W[i].roof*.45));
  const htsiAt=p=>{let sw=0,sv=0,b=0,d=1e9;W.forEach((w,i)=>{const q=WP(i),e=(q[0]-p[0])**2+((q[1]-p[1])*.88)**2,k=Math.exp(-e/.004);sw+=k;sv+=k*w.htsi;if(e<d){d=e;b=i}});return sw<1e-6?W[b].htsi:sv/sw};
  return{hs,ts,hl,mr,fc,osiLv,heatScore,htsiAt};
};
export const nearestWard=(la,ln)=>{let b=0,d=1e9;for(let i=0;i<16;i++){const q=WP(i),k=(q[0]-la)**2+((q[1]-ln)*.88)**2;if(k<d){d=k;b=i}}return{b,d}};

/* Safest time */
export const HRS=[[8,'8 AM'],[10,'10 AM'],[12,'12 PM'],[14,'2 PM'],[17,'5 PM'],[19,'7 PM']],HMUL=[.42,.62,.85,1,.68,.38],HWIN={8:'7–9 AM',10:'9–11 AM',12:'11 AM–1 PM',14:'1–3 PM',17:'4–6 PM',19:'6–8 PM'};
export const safeHours=(W,i,age,job)=>{const w=W[i],adj=(age!=='Adult'?8:0)+(job==='Outdoor'?8:0);return HRS.map((h,k)=>({t:h[1],hr:h[0],v:Math.min(100,Math.round(w.htsi*HMUL[k]+adj))}))};
export const bestSlot=H=>{const lvl=Math.min(...H.map(h=>lv(h.v)));return{lvl,idx:H.findIndex(h=>lv(h.v)==lvl)}};

/* ===== HEAT-SAFE ROUTE ===== */
export const WT=[{n:'Water Point – Bus Stop',ll:[28.665,77.17]},{n:'Water Point – Park Gate',ll:[28.655,77.235]},{n:'Water Point – Market',ll:[28.68,77.285]},{n:'Water Point – Metro Exit',ll:[28.64,77.3]},{n:'Water Point – Chowk',ll:[28.69,77.21]},{n:'Water Point – Dispensary',ll:[28.61,77.15]}];
const RB=['https://routing.openstreetmap.de/routed-foot/route/v1/foot','https://router.project-osrm.org/route/v1/foot'];
export const RO=(loc,YOU)=>loc?[loc.la,loc.ln]:WP(YOU);
export const DEST=CC=>[...CC.map(c=>({n:'❄ '+c.n,ll:c.ll})),...HF.map((h,i)=>({n:'🏥 '+h.n,ll:HP[i]}))];
export const hv=(a,b)=>{const r=Math.PI/180;return Math.hypot((b[1]-a[1])*r*Math.cos((a[0]+b[0])*r/2),(b[0]-a[0])*r)*6371};
export function an(r,H,CC){const ll=r.geometry.coordinates.map(c=>[c[1],c[0]]),st=Math.max(1,Math.floor(ll.length/50)),sm=ll.filter((_,i)=>i%st==0),h=Math.round(sm.reduce((a,p)=>a+H.htsiAt(p),0)/sm.length),md=f=>Math.min(...ll.map(p=>hv(p,f)))*1000;
const wp=WT.filter(w=>md(w.ll)<350).length,cs=CC.map(c=>({c,d:md(c.ll)})).sort((a,b)=>a.d-b.d)[0];
return{ll,km:r.distance/1000,min:Math.max(1,Math.round(r.duration/60)),h,wp,cc:cs.c,ccd:Math.round(cs.d),sh:Math.round(Math.max(10,Math.min(85,88-h*.85))),st:r.legs.flatMap(l=>l.steps)}}
export async function rget(p,alt){let e;for(const b of RB){try{const d=await(await fetch(`${b}/${p.map(q=>q[1]+','+q[0]).join(';')}?overview=full&geometries=geojson&steps=true&alternatives=${alt}`)).json();if(d.code=='Ok')return d.routes}catch(x){e=x}}throw e||new Error('No route')}
export async function computeRoutes(o,d,H,CC){const rs=await rget([o,d],true),base=an(rs[0],H,CC);
const F=[...CC.filter(c=>c.occ<c.cap).map(c=>c.ll),...WT.map(w=>w.ll)].map(f=>({f,x:hv(o,f)+hv(f,d)-hv(o,d)})).filter(z=>z.x<Math.max(.8,base.km*.6)).sort((a,b)=>a.x-b.x).slice(0,3);
const vs=(await Promise.all(F.map(z=>rget([o,z.f,d],false).catch(()=>[])))).flat();
const sc=a=>a.h+25*Math.max(0,a.km/base.km-1)-3*Math.min(3,a.wp)-(a.ccd<600?5:0);
const all=[...rs.slice(1),...vs].map(x=>an(x,H,CC)).filter(a=>a.km<=base.km*1.6+.3&&(Math.abs(a.km-base.km)>.02||a.h!=base.h)).sort((a,b)=>sc(a)-sc(b)),best=all[0]&&sc(all[0])<sc(base)?all[0]:null;
return{n:base,h:best||base,same:!best,sel:best?'h':'n'}}

/* ===== Chatbot logic ===== */
export const SEV_RE=/behosh|unconscious|not waking|nahi utha|nahi jag|seizure|fit aa|convuls|collapse|gir gaya|gir gayi|confus/i;
export const SYM_RE=/chakkar|dizz|ghoom|ulti|vomit|nause|jee mich|ghabra|kamzori|weak(ness)?|thakan|zyada pasina|ziada pasina|heavy sweat|pasina nahi|no sweat|sar dard|headache|bukhar|fever|garmi lag|heat ?stroke|heat ?exhaustion|behosh|unconscious|faint|confus|dehydrat/i;
function nearestOf(o,list,getLL){let best=0,bd=1e9;list.forEach((x,i)=>{const d=hv(o,getLL(x,i));if(d<bd){bd=d;best=i}});return{i:best,d:bd}}
export function heatSymptomCheck(q,o,CC){const ql=q.toLowerCase();if(!SYM_RE.test(ql))return null;const severe=SEV_RE.test(ql);
let target,kind;if(severe){const k=nearestOf(o,HF,(h,idx)=>HP[idx]);target={n:HF[k.i].n,ll:HP[k.i],d:k.d};kind='hospital'}
else{const k=nearestOf(o,CC,c=>c.ll);target={n:CC[k.i].n,ll:CC[k.i].ll,d:k.d};kind='cooling center'}
const steps=severe?['🚑 Call 108 immediately — this can be heatstroke.','Move to shade / a cool place, loosen tight clothing.','Sponge exposed skin with cool wet cloth; fan the person.','Ice packs on neck, armpits and groin if available.','Do NOT give food or water if not fully conscious.']:['Move to shade or a cool place right away.','Sip water or ORS slowly — don’t gulp.','Loosen tight clothing; rest lying down, legs slightly raised.','Cool the skin with a wet cloth or a fan.','If it doesn’t improve in 20–30 min or gets worse, call 108.'];
return{sym:{severe,steps,target,kind}}}
export function reply(q,role,o,CC,KB){if(role!='a'){const sym=heatSymptomCheck(q,o,CC);if(sym)return sym}const r=(KB[role]||[]).find(k=>k[0].test(q.toLowerCase().trim()));return r?r[1]:role=='a'?'I can help with heatstroke basics, response steps, cooling centers, vulnerable groups, hospitals and alerts.':'I can help with symptoms, food and drink, going out, children and elders, or first aid. Try telling me how you feel, e.g. "mujhe chakkar aa raha hai".'}
