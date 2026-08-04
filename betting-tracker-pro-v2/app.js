import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const supabase=createClient("https://swjjqzdsamyalnbzurnx.supabase.co","sb_publishable_QXkaV8HWhLKNfMUOBbNgsQ_1SlhK1Lw");
let currentUser=null;
const LEAGUES=["Premier League","La Liga","Serie A","Bundesliga","Ligue 1","Superliga","Champions League","Europa League","Conference League","Championship","Eredivisie","Primeira Liga","MLS","International","Other"];
const MARKETS=["Home Win","Draw","Away Win","Double Chance 1X","Double Chance X2","Double Chance 12","Draw No Bet","Favourite Wins","Over 0.5 Goals","Over 1.5 Goals","Over 2.5 Goals","Over 3.5 Goals","Under 0.5 Goals","Under 1.5 Goals","Under 2.5 Goals","Under 3.5 Goals","BTTS Yes","BTTS No","Asian Handicap","European Handicap","Team Goals Over","Team Goals Under","Corners Over","Corners Under","Most Corners","Team Corners Over","Team Corners Under","Cards Over","Cards Under","Most Cards","Team Cards Over","Team Cards Under","Fouls Over","Fouls Under","Most Fouls","Shots Over","Shots Under","Most Shots","Shots on Target Over","Shots on Target Under","Most Shots on Target","Player to Score","Player Shots","Player Shots on Target","Player Assist","Other"];
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("da-DK",{style:"currency",currency:"DKK",maximumFractionDigits:2}).format(Number(n)||0);
const pct=n=>`${((Number(n)||0)*100).toFixed(1).replace(".",",")}%`;
const today=()=>new Date().toISOString().slice(0,10);
let state={settings:{startBankroll:3000},bets:[]};
function save(){}
function settled(b){return["Won","Lost","Push","Cash Out"].includes(b.result)}
function profit(b){if(b.result==="Won")return b.stake*(b.odds-1);if(b.result==="Lost")return-b.stake;if(b.result==="Push")return 0;if(b.result==="Cash Out")return(Number(b.cashOutReturn)||0)-b.stake;return 0}
function cls(n){return n>0?"positive":n<0?"negative":"neutral"}
function labelResult(r){return({Won:"Vundet",Lost:"Tabt",Push:"Push",Pending:"Pending","Cash Out":"Cash Out"})[r]||r}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function ordered(){return[...state.bets].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt))}
function series(){
  let bank=Number(state.settings.startBankroll)||0,peak=bank,maxDD=0,points=[],currentWin=0,currentLoss=0,maxWin=0,maxLoss=0;
  ordered().forEach(b=>{if(settled(b)){bank+=profit(b);peak=Math.max(peak,bank);maxDD=Math.min(maxDD,bank-peak);points.push({date:b.date,value:bank});if(b.result==="Won"){currentWin++;currentLoss=0;maxWin=Math.max(maxWin,currentWin)}else if(b.result==="Lost"){currentLoss++;currentWin=0;maxLoss=Math.max(maxLoss,currentLoss)}else{currentWin=0;currentLoss=0}}});
  return{bank,peak,maxDD,points,currentWin,currentLoss,maxWin,maxLoss}
}
function stats(){
  const wins=state.bets.filter(b=>b.result==="Won").length,losses=state.bets.filter(b=>b.result==="Lost").length,totalProfit=state.bets.reduce((s,b)=>s+profit(b),0),stake=state.bets.filter(settled).reduce((s,b)=>s+(Number(b.stake)||0),0),s=series(),avg=state.bets.length?state.bets.reduce((a,b)=>a+(Number(b.odds)||0),0)/state.bets.length:0;
  return{wins,losses,totalProfit,stake,roi:stake?totalProfit/stake:0,hit:(wins+losses)?wins/(wins+losses):0,count:state.bets.length,avg,...s}
}
function recent(days){return state.bets.filter(b=>(Date.now()-new Date(b.date+"T12:00:00"))/86400000<=days).reduce((s,b)=>s+profit(b),0)}
function monthKey(d){return d.slice(0,7)}
function monthly(){
  const m={};state.bets.forEach(b=>{const k=monthKey(b.date);m[k]=(m[k]||0)+profit(b)});
  const keys=Object.keys(m).sort().slice(-12);return keys.map(k=>({label:k,value:m[k]}))
}
function oddsBand(o){o=Number(o);return o<1.5?"<1.50":o<1.7?"1.50-1.69":o<2?"1.70-1.99":o<2.5?"2.00-2.49":"2.50+"}
function aggregate(field){
  const map={};state.bets.forEach(b=>{const key=field==="oddsBand"?oddsBand(b.odds):(b[field]||"Ukendt");map[key]??={name:key,bets:0,wins:0,losses:0,stake:0,profit:0,odds:0};const x=map[key];x.bets++;x.wins+=b.result==="Won";x.losses+=b.result==="Lost";x.stake+=settled(b)?Number(b.stake)||0:0;x.profit+=profit(b);x.odds+=Number(b.odds)||0});
  return Object.values(map).map(x=>({...x,roi:x.stake?x.profit/x.stake:0,hit:(x.wins+x.losses)?x.wins/(x.wins+x.losses):0,avg:x.bets?x.odds/x.bets:0}))
}
function populate(){
  const opts=(arr,p)=>`<option value="">${p}</option>`+arr.map(x=>`<option>${x}</option>`).join("");
  $("league").innerHTML=opts(LEAGUES,"Vælg liga");$("market").innerHTML=opts(MARKETS,"Vælg marked");
  $("editLeague").innerHTML=opts(LEAGUES,"Vælg liga");$("editMarket").innerHTML=opts(MARKETS,"Vælg marked");
  $("leagueFilter").innerHTML=opts(LEAGUES,"Alle ligaer");$("marketFilter").innerHTML=opts(MARKETS,"Alle markeder")
}
function showView(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===id));document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===id));
  $("pageTitle").textContent={dashboardView:"Dashboard",newBetView:"Nyt bet",historyView:"Historik",marketsView:"Markeder",leaguesView:"Ligaer",analysisView:"Analyse"}[id];
  if(id==="dashboardView")renderDashboard();if(id==="historyView")renderHistory();if(id==="marketsView")renderStats("market","marketStats");if(id==="leaguesView")renderStats("league","leagueStats");if(id==="analysisView")renderAnalysis();scrollTo({top:0,behavior:"smooth"})
}
function renderDashboard(){
  const s=stats();$("currentBankroll").textContent=money(s.bank);$("heroProfit").textContent=(s.totalProfit>=0?"+":"")+money(s.totalProfit);$("heroProfit").className=`hero-profit ${cls(s.totalProfit)}`;
  [["totalProfit",money(s.totalProfit),s.totalProfit],["roi",pct(s.roi)],["hitRate",pct(s.hit)],["betCount",s.count],["wins",s.wins],["losses",s.losses],["currentStreak",s.currentWin?`W${s.currentWin}`:s.currentLoss?`L${s.currentLoss}`:"–"],["maxDrawdown",money(s.maxDD),s.maxDD]].forEach(([id,val,n])=>{const e=$(id);e.textContent=val;if(n!==undefined)e.className=cls(n)});
  [7,30,90].forEach(d=>{const n=recent(d),e=$("profit"+d);e.textContent=money(n);e.className=cls(n)});
  drawLine($("bankrollChart"),[{label:"Start",value:Number(state.settings.startBankroll)},...s.points.map((p,i)=>({label:String(i+1),value:p.value}))]);
  drawBars($("monthlyChart"),monthly())
}
function canvasSetup(c,h){const d=devicePixelRatio||1,w=c.clientWidth;c.width=w*d;c.height=h*d;const x=c.getContext("2d");x.scale(d,d);x.clearRect(0,0,w,h);return{x,w,h}}
function drawLine(c,pts){const{x,w,h}=canvasSetup(c,210);x.strokeStyle="#293951";x.lineWidth=1;for(let i=0;i<4;i++){let y=20+i*(h-40)/3;x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke()}if(pts.length<2){x.fillStyle="#94a3b8";x.fillText("Tilføj et afgjort bet for at se grafen",15,h/2);return}const vals=pts.map(p=>p.value),min=Math.min(...vals),max=Math.max(...vals),range=max-min||1;x.strokeStyle="#3f8cff";x.lineWidth=3;x.beginPath();pts.forEach((p,i)=>{const px=10+i/(pts.length-1)*(w-20),py=h-18-(p.value-min)/range*(h-36);i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke()}
function drawBars(c,pts){const{x,w,h}=canvasSetup(c,190);if(!pts.length){x.fillStyle="#94a3b8";x.fillText("Ingen månedlig data endnu",15,h/2);return}const max=Math.max(...pts.map(p=>Math.abs(p.value)),1),gap=8,bw=Math.max(12,(w-gap*(pts.length+1))/pts.length),zero=h/2;x.strokeStyle="#293951";x.beginPath();x.moveTo(0,zero);x.lineTo(w,zero);x.stroke();pts.forEach((p,i)=>{const bh=Math.abs(p.value)/max*(h/2-28),px=gap+i*(bw+gap),py=p.value>=0?zero-bh:zero;x.fillStyle=p.value>=0?"#22c55e":"#ef4444";x.fillRect(px,py,bw,bh);x.fillStyle="#94a3b8";x.font="10px sans-serif";x.fillText(p.label.slice(5),px, h-7)})}
function renderHistory(){
  const q=$("searchInput").value.toLowerCase(),rf=$("resultFilter").value,lf=$("leagueFilter").value,mf=$("marketFilter").value;
  const arr=[...state.bets].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).filter(b=>{const hay=`${b.match} ${b.league} ${b.market}`.toLowerCase();return(!q||hay.includes(q))&&(!rf||b.result===rf)&&(!lf||b.league===lf)&&(!mf||b.market===mf)});
  const sum=arr.reduce((s,b)=>s+profit(b),0);$("historySummary").innerHTML=`${arr.length} bets · <strong class="${cls(sum)}">${money(sum)}</strong>`;
  $("historyList").innerHTML=arr.length?arr.map(b=>`<article class="history-item"><div class="history-top"><div><h3>${esc(b.match)}</h3><div class="meta"><span>${b.date}</span><span>${esc(b.league)}</span><span>${esc(b.market)}</span></div></div><strong class="${cls(profit(b))}">${money(profit(b))}</strong></div><div class="meta"><span>Indsats ${money(b.stake)}</span><span>Odds ${Number(b.odds).toFixed(2)}</span><span>${labelResult(b.result)}</span></div><div class="item-actions"><button onclick="editBet('${b.id}')">Redigér</button><button onclick="deleteBet('${b.id}')">Slet</button></div></article>`).join(""):'<div class="empty">Ingen bets matcher filtrene.</div>'
}
function renderStats(field,target){const rows=aggregate(field).sort((a,b)=>b.profit-a.profit);$(target).innerHTML=rows.length?rows.map(x=>`<article class="stat-row"><div class="stat-top"><h3>${esc(x.name)}</h3><strong class="${cls(x.profit)}">${money(x.profit)}</strong></div><div class="stats-grid"><div><small>Bets</small><strong>${x.bets}</strong></div><div><small>ROI</small><strong>${pct(x.roi)}</strong></div><div><small>Hitrate</small><strong>${pct(x.hit)}</strong></div><div><small>Gns. odds</small><strong>${x.avg.toFixed(2)}</strong></div></div></article>`).join(""):'<div class="empty">Ingen statistik endnu.</div>'}
function renderAnalysis(){
  const m=aggregate("market"),l=aggregate("league"),s=stats(),best=a=>a.length?[...a].sort((x,y)=>y.profit-x.profit)[0].name:"Ingen data",worst=a=>a.length?[...a].sort((x,y)=>x.profit-y.profit)[0].name:"Ingen data";
  const cards=[["Bedste marked",best(m)],["Dårligste marked",worst(m)],["Bedste liga",best(l)],["Dårligste liga",worst(l)],["Længste winstreak",String(s.maxWin)],["Længste losestreak",String(s.maxLoss)],["Højeste bankroll",money(s.peak)],["Største drawdown",money(s.maxDD)]];
  $("analysisCards").innerHTML=cards.map(([a,b])=>`<article class="analysis-card"><span>${a}</span><strong>${esc(b)}</strong></article>`).join("");$("startBankroll").value=state.settings.startBankroll;renderStats("oddsBand","oddsStats")
}
async function loadCloud(){
 if(!currentUser)return; setSync("Synkroniserer…");
 const [{data:rows,error:e1},{data:settingsRow,error:e2}]=await Promise.all([
  supabase.from("bets").select("id,data,created_at").order("created_at",{ascending:true}),
  supabase.from("user_settings").select("start_bankroll").maybeSingle()
 ]);
 if(e1||e2){console.error(e1||e2);setSync("Synk-fejl",true);return}
 state.bets=(rows||[]).map(r=>({...r.data,id:r.id,createdAt:r.created_at}));
 state.settings.startBankroll=Number(settingsRow?.start_bankroll??3000);
 setSync("Synkroniseret"); renderActive();
}
function setSync(text,bad=false){const e=$("syncState");if(e){e.textContent=text;e.className=`sync-state ${bad?"negative":"positive"}`}}
function renderActive(){const id=document.querySelector(".view.active")?.id||"dashboardView";if(id==="dashboardView")renderDashboard();if(id==="historyView")renderHistory();if(id==="marketsView")renderStats("market","marketStats");if(id==="leaguesView")renderStats("league","leagueStats");if(id==="analysisView")renderAnalysis()}
async function handleSession(session){currentUser=session?.user||null;$("authScreen").classList.toggle("hidden",!!currentUser);$("app").classList.toggle("hidden",!currentUser);if(currentUser)await loadCloud()}
$("authForm").addEventListener("submit",async e=>{e.preventDefault();$("authMessage").textContent="Logger ind…";const{error}=await supabase.auth.signInWithPassword({email:$("authEmail").value,password:$("authPassword").value});$("authMessage").textContent=error?error.message:""});
$("signupBtn").addEventListener("click",async()=>{$("authMessage").textContent="Opretter konto…";const{error}=await supabase.auth.signUp({email:$("authEmail").value,password:$("authPassword").value});$("authMessage").textContent=error?error.message:"Konto oprettet. Tjek din e-mail, hvis du skal bekræfte den."});
$("betForm").addEventListener("submit",async e=>{e.preventDefault();const data={date:$("date").value,league:$("league").value,match:$("match").value.trim(),market:$("market").value,stake:Number($("stake").value),odds:Number($("odds").value),result:$("result").value,note:$("note").value.trim(),cashOutReturn:Number($("cashOutReturn").value)||0};setSync("Gemmer…");const{error}=await supabase.from("bets").insert({user_id:currentUser.id,data});if(error){alert(error.message);setSync("Synk-fejl",true);return}e.target.reset();$("date").value=today();$("result").value="Pending";$("cashOutWrap").classList.add("hidden");await loadCloud();showView("historyView")});
$("result").addEventListener("change",()=>$("cashOutWrap").classList.toggle("hidden",$("result").value!=="Cash Out"));
document.querySelectorAll(".bottom-nav button").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));$("quickAdd").addEventListener("click",()=>showView("newBetView"));
["searchInput","resultFilter","leagueFilter","marketFilter"].forEach(id=>$(id).addEventListener(id==="searchInput"?"input":"change",renderHistory));
window.deleteBet=async id=>{if(!confirm("Slet dette bet?"))return;const{error}=await supabase.from("bets").delete().eq("id",id);if(error)return alert(error.message);await loadCloud()};
window.editBet=id=>{const b=state.bets.find(x=>x.id===id);if(!b)return;$("editId").value=b.id;$("editDate").value=b.date;$("editLeague").value=b.league;$("editMatch").value=b.match;$("editMarket").value=b.market;$("editStake").value=b.stake;$("editOdds").value=b.odds;$("editResult").value=b.result;$("editNote").value=b.note||"";$("editDialog").showModal()};
$("cancelEdit").addEventListener("click",()=>$("editDialog").close());
$("editForm").addEventListener("submit",async e=>{e.preventDefault();const id=$("editId").value,data={date:$("editDate").value,league:$("editLeague").value,match:$("editMatch").value.trim(),market:$("editMarket").value,stake:Number($("editStake").value),odds:Number($("editOdds").value),result:$("editResult").value,note:$("editNote").value.trim()};const{error}=await supabase.from("bets").update({data}).eq("id",id);if(error)return alert(error.message);$("editDialog").close();await loadCloud()});
$("settingsForm").addEventListener("submit",async e=>{e.preventDefault();const start_bankroll=Number($("startBankroll").value)||0;const{error}=await supabase.from("user_settings").upsert({user_id:currentUser.id,start_bankroll},{onConflict:"user_id"});if(error)return alert(error.message);await loadCloud();alert("Startbankroll gemt")});
$("refreshBtn").addEventListener("click",loadCloud);$("logoutBtn").addEventListener("click",()=>supabase.auth.signOut());
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&currentUser)loadCloud()});window.addEventListener("focus",()=>currentUser&&loadCloud());
supabase.auth.onAuthStateChange((_e,session)=>handleSession(session));
if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));populate();$("date").value=today();const{data:{session}}=await supabase.auth.getSession();await handleSession(session);
