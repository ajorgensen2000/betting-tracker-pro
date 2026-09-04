import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase=createClient("https://swjjqzdsamyalnbzurnx.supabase.co","sb_publishable_QXkaV8HWhLKNfMUOBbNgsQ_1SlhK1Lw");
let currentUser=null;

const LEAGUES=["Premier League","La Liga","Serie A","Bundesliga","Ligue 1","Superliga","Champions League","Europa League","Conference League","Championship","Eredivisie","Primeira Liga","MLS","International","Flere ligaer","Other"];
const BET_TYPES=["Single","Double","Treble","4-fold","5-fold+","Systemspil","Byg væddemål"];
const RESULTS=["Pending","Won","Lost","Push","Half Win","Half Loss","Cash Out","Void"];
const PERIODS=["Fuldtid","1. halvleg","2. halvleg","Kamp"];
const LEG_CATEGORIES=["Resultat","Mål","BTTS","Handicap","Hjørnespark","Kort","Frispark","Skud","Skud på mål","Spiller","Tacklinger","Kombinationsspil","Andet"];
const MARKETS=["Home Win","Draw","Away Win","Double Chance 1X","Double Chance X2","Double Chance 12","Draw No Bet","Favourite Wins","Over 0.5 Goals","Over 1.5 Goals","Over 2.5 Goals","Over 3.5 Goals","Under 0.5 Goals","Under 1.5 Goals","Under 2.5 Goals","Under 3.5 Goals","BTTS Yes","BTTS No","Asian Handicap","European Handicap","Team Goals Over","Team Goals Under","Corners Over","Corners Under","Most Corners","Team Corners Over","Team Corners Under","Cards Over","Cards Under","Most Cards","Team Cards Over","Team Cards Under","Fouls Over","Fouls Under","Most Fouls","Shots Over","Shots Under","Most Shots","Shots on Target Over","Shots on Target Under","Most Shots on Target","Player to Score","Player Shots","Player Shots on Target","Player Assist","Player Tackles","Bet Builder","Other"];
const GOAL_TARGET_UNITS=2.8, GOAL_MIN_ODDS=1.5, GOAL_MAX_ODDS=2.0, GOAL_PERIOD_DAYS=14;
const GOAL_EPOCH=new Date("2026-08-31T12:00:00");

const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("da-DK",{style:"currency",currency:"DKK",maximumFractionDigits:2}).format(Number(n)||0);
const pct=n=>`${((Number(n)||0)*100).toFixed(1).replace(".",",")}%`;
const today=()=>new Date().toISOString().slice(0,10);
let state={settings:{startBankroll:3000,stakePercent:2},bets:[]};
let legCounter=0;

function settled(b){return["Won","Lost","Push","Half Win","Half Loss","Cash Out","Void"].includes(b.result)}
function profit(b){
  const stake=Number(b.stake)||0,odds=Number(b.odds)||0;
  if(b.result==="Won")return stake*(odds-1);
  if(b.result==="Lost")return-stake;
  if(b.result==="Push"||b.result==="Void")return 0;
  if(b.result==="Half Win")return .5*stake*(odds-1);
  if(b.result==="Half Loss")return-.5*stake;
  if(b.result==="Cash Out")return(Number(b.cashOutReturn)||0)-stake;
  return 0;
}
function cls(n){return n>0?"positive":n<0?"negative":"neutral"}
function labelResult(r){return({Won:"Vundet",Lost:"Tabt",Push:"Push",Pending:"Pending","Half Win":"Half Win","Half Loss":"Half Loss","Cash Out":"Cash Out",Void:"Void"})[r]||r}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function ordered(){return[...state.bets].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt))}
function series(){
  let bank=Number(state.settings.startBankroll)||0,peak=bank,minBank=bank,maxDD=0,points=[],currentWin=0,currentLoss=0,maxWin=0,maxLoss=0;
  ordered().forEach(b=>{if(settled(b)){
    bank+=profit(b);peak=Math.max(peak,bank);minBank=Math.min(minBank,bank);maxDD=Math.min(maxDD,bank-peak);points.push({date:b.date,value:bank});
    if(b.result==="Won"){currentWin++;currentLoss=0;maxWin=Math.max(maxWin,currentWin)}
    else if(b.result==="Lost"){currentLoss++;currentWin=0;maxLoss=Math.max(maxLoss,currentLoss)}
    else{currentWin=0;currentLoss=0}
  }});
  return{bank,peak,minBank,maxDD,points,currentWin,currentLoss,maxWin,maxLoss}
}
function stats(){
  const wins=state.bets.filter(b=>b.result==="Won").length,losses=state.bets.filter(b=>b.result==="Lost").length,totalProfit=state.bets.reduce((s,b)=>s+profit(b),0),stake=state.bets.filter(settled).reduce((s,b)=>s+(Number(b.stake)||0),0),s=series();
  const oddsRows=state.bets.filter(b=>Number(b.odds)>0),avg=oddsRows.length?oddsRows.reduce((a,b)=>a+Number(b.odds),0)/oddsRows.length:0;
  return{wins,losses,totalProfit,stake,roi:stake?totalProfit/stake:0,hit:(wins+losses)?wins/(wins+losses):0,count:state.bets.length,avg,...s}
}
function recent(days){return state.bets.filter(b=>(Date.now()-new Date(b.date+"T12:00:00"))/86400000<=days).reduce((s,b)=>s+profit(b),0)}
function monthKey(d){return d?.slice(0,7)||""}
function monthly(){const m={};state.bets.forEach(b=>{if(!b.date)return;const k=monthKey(b.date);m[k]=(m[k]||0)+profit(b)});const keys=Object.keys(m).sort().slice(-12);return keys.map(k=>({label:k,value:m[k]}))}
function dateOnly(s){return s?new Date(`${s}T12:00:00`):null}
function periodStartFor(d){
  const x=new Date(d);x.setHours(12,0,0,0);
  const diffDays=Math.floor((x-GOAL_EPOCH)/86400000),idx=Math.floor(diffDays/GOAL_PERIOD_DAYS);
  const start=new Date(GOAL_EPOCH);start.setDate(start.getDate()+idx*GOAL_PERIOD_DAYS);return start
}
function dateKey(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`}
function periodLabel(start){const end=new Date(start);end.setDate(end.getDate()+GOAL_PERIOD_DAYS-1);const f=d=>`${d.getDate()}/${d.getMonth()+1}`;return `${f(start)}–${f(end)}`}
function qualifiesForGoal(b){const o=Number(b.odds);return settled(b)&&o>=GOAL_MIN_ODDS&&o<=GOAL_MAX_ODDS}
function unitProfit(b){const stake=Number(b.stake)||0;return stake?profit(b)/stake:0}
function goalPeriodData(){
  const currentStart=periodStartFor(new Date()),periods=[];
  for(let i=7;i>=0;i--){const start=new Date(currentStart);start.setDate(start.getDate()-i*GOAL_PERIOD_DAYS);periods.push({start,key:dateKey(start),label:periodLabel(start),units:0,trackedBets:0,trackedProfit:0,allProfit:0})}
  const byKey=new Map(periods.map(p=>[p.key,p]));
  state.bets.forEach(b=>{if(!b.date)return;const d=dateOnly(b.date);if(!d)return;const key=dateKey(periodStartFor(d)),p=byKey.get(key);if(!p)return;p.allProfit+=profit(b);if(qualifiesForGoal(b)){p.trackedBets++;p.trackedProfit+=profit(b);p.units+=unitProfit(b)}});
  return periods
}
function goalPeriodStats(){
  const periods=goalPeriodData(),current=periods[periods.length-1]||{units:0,trackedBets:0,trackedProfit:0,allProfit:0};
  const missing=Math.max(0,GOAL_TARGET_UNITS-current.units),complete=current.units>=GOAL_TARGET_UNITS-1e-9;
  const eligibleDates=state.bets.filter(b=>b.date&&qualifiesForGoal(b)).map(b=>dateOnly(b.date)).filter(Boolean).sort((a,b)=>a-b);
  const firstPeriod=eligibleDates.length?periodStartFor(eligibleDates[0]):null;
  const completedPeriods=periods.slice(0,-1).filter(p=>!firstPeriod||p.start>=firstPeriod);
  const achieved=completedPeriods.filter(p=>p.units>=GOAL_TARGET_UNITS-1e-9).length;
  const rate=completedPeriods.length?achieved/completedPeriods.length:null;
  let streak=0,idx=periods.length-1;if(!complete)idx--;
  for(;idx>=0;idx--){if(periods[idx].units>=GOAL_TARGET_UNITS-1e-9)streak++;else break}
  return{periods,current,missing,complete,streak,rate,trackedPeriods:completedPeriods.length,achieved}
}
function oddsBand(o){o=Number(o);return o<1.5?"<1.50":o<1.7?"1.50-1.69":o<2?"1.70-1.99":o<2.5?"2.00-2.49":"2.50+"}
function aggregate(field){
  const map={};state.bets.forEach(b=>{const key=field==="oddsBand"?oddsBand(b.odds):(b[field]||"Ukendt");map[key]??={name:key,bets:0,wins:0,losses:0,pushes:0,stake:0,profit:0,odds:0};const x=map[key];x.bets++;x.wins+=b.result==="Won";x.losses+=b.result==="Lost";x.pushes+=b.result==="Push";x.stake+=settled(b)?Number(b.stake)||0:0;x.profit+=profit(b);x.odds+=Number(b.odds)||0});
  return Object.values(map).map(x=>({...x,roi:x.stake?x.profit/x.stake:0,hit:(x.wins+x.losses)?x.wins/(x.wins+x.losses):0,avg:x.bets?x.odds/x.bets:0}))
}
function aggregateLegs(){
  const map={};
  state.bets.filter(b=>Array.isArray(b.legs)&&b.legs.length).forEach(b=>{
    const seen=new Set();
    b.legs.forEach(leg=>{
      const key=leg.market||leg.category||"Andet";
      map[key]??={name:key,legs:0,tickets:0,wins:0,losses:0};
      map[key].legs++;
      if(!seen.has(key)){map[key].tickets++;if(b.result==="Won")map[key].wins++;if(b.result==="Lost")map[key].losses++;seen.add(key)}
    });
  });
  return Object.values(map).map(x=>({...x,hit:(x.wins+x.losses)?x.wins/(x.wins+x.losses):0})).sort((a,b)=>b.tickets-a.tickets)
}
function optionMarkup(arr,placeholder=""){return`${placeholder?`<option value="">${placeholder}</option>`:""}`+arr.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("")}
function resultOptions(includeAll=false){return(includeAll?'<option value="">Alle resultater</option>':"")+RESULTS.map(x=>`<option value="${x}">${labelResult(x)}</option>`).join("")}
function populate(){
  $("league").innerHTML=optionMarkup(LEAGUES,"Vælg liga");$("market").innerHTML=optionMarkup(MARKETS,"Vælg marked");$("betType").innerHTML=optionMarkup(BET_TYPES);
  $("editLeague").innerHTML=optionMarkup(LEAGUES,"Vælg liga");$("editMarket").innerHTML=optionMarkup(MARKETS,"Vælg marked");$("editBetType").innerHTML=optionMarkup(BET_TYPES);
  $("leagueFilter").innerHTML=optionMarkup(LEAGUES,"Alle ligaer");$("marketFilter").innerHTML=optionMarkup(MARKETS,"Alle markeder");$("betTypeFilter").innerHTML=optionMarkup(BET_TYPES,"Alle bettyper");
  $("result").innerHTML=resultOptions();$("editResult").innerHTML=resultOptions();$("resultFilter").innerHTML=resultOptions(true);
}
function suggestedStake(){return Math.max(0,series().bank*(Number(state.settings.stakePercent)||2)/100)}
function setSuggestedStake(force=false){if(force||!$("stake").value)$("stake").value=suggestedStake().toFixed(2)}
function showView(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===id));document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===id));
  $("pageTitle").textContent={dashboardView:"Dashboard",newBetView:"Nyt bet",historyView:"Historik",marketsView:"Markeder",leaguesView:"Ligaer",analysisView:"Analyse"}[id];
  if(id==="dashboardView")renderDashboard();if(id==="newBetView")setSuggestedStake();if(id==="historyView")renderHistory();if(id==="marketsView")renderStats("market","marketStats");if(id==="leaguesView")renderStats("league","leagueStats");if(id==="analysisView")renderAnalysis();scrollTo({top:0,behavior:"smooth"})
}
function renderDashboard(){
  const s=stats();$("currentBankroll").textContent=money(s.bank);$("heroProfit").textContent=(s.totalProfit>=0?"+":"")+money(s.totalProfit);$("heroProfit").className=`hero-profit ${cls(s.totalProfit)}`;
  const next=s.bank*(Number(state.settings.stakePercent)||2)/100;
  [["totalProfit",money(s.totalProfit),s.totalProfit],["roi",pct(s.roi)],["hitRate",pct(s.hit)],["betCount",s.count],["wins",s.wins],["losses",s.losses],["avgOdds",s.avg.toFixed(2).replace(".",",")],["nextStake",money(next)],["currentStreak",s.currentWin?`W${s.currentWin}`:s.currentLoss?`L${s.currentLoss}`:"–"],["longestStreak",`${s.maxWin} / ${s.maxLoss}`],["bankrollRange",`${money(s.peak)} / ${money(s.minBank)}`],["maxDrawdown",money(s.maxDD),s.maxDD]].forEach(([id,val,n])=>{const e=$(id);e.textContent=val;if(n!==undefined)e.className=cls(n)});
  [7,30,90].forEach(d=>{const n=recent(d),e=$("profit"+d);e.textContent=money(n);e.className=cls(n)});
  const g=goalPeriodStats(),progress=Math.max(0,Math.min(100,g.current.units/GOAL_TARGET_UNITS*100));
  $("weeklyGoalBadge").textContent=`${g.current.units>=0?"+":""}${g.current.units.toFixed(2).replace(".",",")}u / +${GOAL_TARGET_UNITS.toFixed(2).replace(".",",")}u`;$("weeklyGoalFill").style.width=`${progress}%`;
  $("weeklyGoalStatus").textContent=g.complete?"✓ 14-dagesmål gennemført":`Mangler +${g.missing.toFixed(2).replace(".",",")}u`;$("weeklyGoalStatus").className=g.complete?"positive":"";
  $("weeklyQualifiedWins").textContent=`${g.current.units>=0?"+":""}${g.current.units.toFixed(2).replace(".",",")} units`;$("weeklyQualifiedWins").className=cls(g.current.units);
  $("weeklyProfit").textContent=money(g.current.trackedProfit);$("weeklyProfit").className=cls(g.current.trackedProfit);
  $("weeklyTrackedBets").textContent=String(g.current.trackedBets);
  $("weeklyGoalStreak").textContent=`${g.streak} ${g.streak===1?"periode":"perioder"}`;$("weeklyGoalRate").textContent=g.rate===null?"–":`${Math.round(g.rate*100)}% (${g.achieved}/${g.trackedPeriods})`;
  drawUnitGoal($("weeklyGoalChart"),g.periods);drawBars($("weeklyProfitChart"),g.periods.map(p=>({label:p.label,value:p.allProfit})));
  drawLine($("bankrollChart"),[{label:"Start",value:Number(state.settings.startBankroll)},...s.points.map((p,i)=>({label:String(i+1),value:p.value}))]);drawBars($("monthlyChart"),monthly())
}
function canvasSetup(c,h){const d=devicePixelRatio||1,w=c.clientWidth;c.width=w*d;c.height=h*d;const x=c.getContext("2d");x.scale(d,d);x.clearRect(0,0,w,h);return{x,w,h}}
function drawLine(c,pts){const{x,w,h}=canvasSetup(c,210);x.strokeStyle="#293951";x.lineWidth=1;for(let i=0;i<4;i++){let y=20+i*(h-40)/3;x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke()}if(pts.length<2){x.fillStyle="#94a3b8";x.fillText("Tilføj et afgjort bet for at se grafen",15,h/2);return}const vals=pts.map(p=>p.value),min=Math.min(...vals),max=Math.max(...vals),range=max-min||1;x.strokeStyle="#3f8cff";x.lineWidth=3;x.beginPath();pts.forEach((p,i)=>{const px=10+i/(pts.length-1)*(w-20),py=h-18-(p.value-min)/range*(h-36);i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke()}
function drawBars(c,pts){const{x,w,h}=canvasSetup(c,190);if(!pts.length){x.fillStyle="#94a3b8";x.fillText("Ingen månedlig data endnu",15,h/2);return}const max=Math.max(...pts.map(p=>Math.abs(p.value)),1),gap=8,bw=Math.max(12,(w-gap*(pts.length+1))/pts.length),zero=h/2;x.strokeStyle="#293951";x.beginPath();x.moveTo(0,zero);x.lineTo(w,zero);x.stroke();pts.forEach((p,i)=>{const bh=Math.abs(p.value)/max*(h/2-28),px=gap+i*(bw+gap),py=p.value>=0?zero-bh:zero;x.fillStyle=p.value>=0?"#22c55e":"#ef4444";x.fillRect(px,py,bw,bh);x.fillStyle="#94a3b8";x.font="10px sans-serif";const lbl=/^\d{4}-\d{2}$/.test(p.label)?p.label.slice(5):String(p.label).split("–")[0];x.fillText(lbl,px,h-7)})}
function drawUnitGoal(c,periods){
  const{x,w,h}=canvasSetup(c,190);if(!periods.length)return;
  const vals=periods.map(p=>p.units),top=14,bottom=32,left=8,right=8,plotH=h-top-bottom;
  const maxY=Math.max(GOAL_TARGET_UNITS,...vals,0.5),minY=Math.min(0,...vals),pad=(maxY-minY||1)*0.08,hi=maxY+pad,lo=minY-pad,range=hi-lo||1;
  const yFor=v=>top+(hi-v)/range*plotH,zeroY=yFor(0),gap=7,bw=Math.max(12,(w-left-right-gap*(periods.length-1))/periods.length);
  x.strokeStyle="#293951";x.lineWidth=1;[lo,0,GOAL_TARGET_UNITS,hi].forEach(v=>{const y=yFor(v);x.beginPath();x.moveTo(left,y);x.lineTo(w-right,y);x.stroke()});
  periods.forEach((p,i)=>{const px=left+i*(bw+gap),vy=yFor(p.units),py=Math.min(zeroY,vy),bh=Math.max(1,Math.abs(vy-zeroY));x.fillStyle=p.units>=GOAL_TARGET_UNITS?"#22c55e":p.units<0?"#ef4444":"#3f8cff";x.fillRect(px,py,bw,bh);x.fillStyle="#94a3b8";x.font="9px sans-serif";x.fillText(p.label.split("–")[0],px,h-9);if(Math.abs(p.units)>.005){x.fillStyle="#f8fafc";x.font="bold 9px sans-serif";const t=`${p.units>=0?"+":""}${p.units.toFixed(1)}u`;x.fillText(t,px,Math.max(11,Math.min(h-bottom-2,vy+(p.units<0?12:-4))))}});
  const targetY=yFor(GOAL_TARGET_UNITS);x.save();x.setLineDash([6,5]);x.strokeStyle="#f59e0b";x.lineWidth=2;x.beginPath();x.moveTo(left,targetY);x.lineTo(w-right,targetY);x.stroke();x.restore();x.fillStyle="#f59e0b";x.font="10px sans-serif";x.fillText("Mål: +2,8u",left+4,Math.max(11,targetY-5))
}

function newLeg(data={}){
  const id=++legCounter;
  const wrap=document.createElement("article");wrap.className="leg-card";wrap.dataset.legId=String(id);
  wrap.innerHTML=`<div class="leg-card-head"><strong>Ben <span class="leg-number"></span></strong><button type="button" class="remove-leg" aria-label="Fjern ben">×</button></div>
  <div class="leg-grid">
    <label>Kategori<select class="leg-category">${optionMarkup(LEG_CATEGORIES,"Vælg kategori")}</select></label>
    <label>Marked<select class="leg-market">${optionMarkup(MARKETS,"Vælg marked")}</select></label>
    <label>Hold / spiller<input class="leg-subject" type="text" placeholder="AC Milan / spiller"></label>
    <label>Valg<input class="leg-selection" type="text" placeholder="Over, Under, Flest skud, 1+ …"></label>
    <label>Linje<input class="leg-line" type="number" step="0.01" inputmode="decimal" placeholder="fx 1.5"></label>
    <label>Periode<select class="leg-period">${optionMarkup(PERIODS)}</select></label>
    <label class="full">Note<input class="leg-note" type="text" placeholder="Valgfri"></label>
  </div>`;
  $("legsList").appendChild(wrap);
  wrap.querySelector(".leg-category").value=data.category||"";wrap.querySelector(".leg-market").value=data.market||"";wrap.querySelector(".leg-subject").value=data.subject||"";wrap.querySelector(".leg-selection").value=data.selection||"";wrap.querySelector(".leg-line").value=data.line??"";wrap.querySelector(".leg-period").value=data.period||"Fuldtid";wrap.querySelector(".leg-note").value=data.note||"";
  wrap.querySelector(".remove-leg").addEventListener("click",()=>{wrap.remove();renumberLegs()});renumberLegs()
}
function renumberLegs(){[...$("legsList").children].forEach((el,i)=>el.querySelector(".leg-number").textContent=String(i+1))}
function collectLegs(){return[...$("legsList").children].map((el,i)=>({number:i+1,category:el.querySelector(".leg-category").value,market:el.querySelector(".leg-market").value,subject:el.querySelector(".leg-subject").value.trim(),selection:el.querySelector(".leg-selection").value.trim(),line:el.querySelector(".leg-line").value===""?null:Number(el.querySelector(".leg-line").value),period:el.querySelector(".leg-period").value,note:el.querySelector(".leg-note").value.trim()}))}
function toggleBuilder(){
  const isBuilder=$("betType").value==="Byg væddemål";$("legsSection").classList.toggle("hidden",!isBuilder);
  if(isBuilder){$("market").value="Bet Builder";if(!$("legsList").children.length){newLeg();newLeg()}}
  else{$("legsList").innerHTML=""}
}
function legSummary(leg){const line=leg.line!==null&&leg.line!==undefined&&leg.line!==""?` ${leg.line}`:"";const subj=leg.subject?` · ${esc(leg.subject)}`:"";const period=leg.period&&leg.period!=="Fuldtid"?` · ${esc(leg.period)}`:"";return`<div class="history-leg"><strong>${esc(leg.market||leg.category||"Ben")}</strong><span>${esc(leg.selection||"")}${line}${subj}${period}</span></div>`}

function renderHistory(){
  const q=$("searchInput").value.toLowerCase(),rf=$("resultFilter").value,lf=$("leagueFilter").value,mf=$("marketFilter").value,tf=$("betTypeFilter").value;
  const arr=[...state.bets].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).filter(b=>{const legText=(b.legs||[]).map(l=>`${l.market} ${l.subject} ${l.selection}`).join(" ");const hay=`${b.match} ${b.league} ${b.market} ${b.betType} ${legText}`.toLowerCase();return(!q||hay.includes(q))&&(!rf||b.result===rf)&&(!lf||b.league===lf)&&(!mf||b.market===mf)&&(!tf||b.betType===tf)});
  const sum=arr.reduce((s,b)=>s+profit(b),0);$("historySummary").innerHTML=`${arr.length} bets · <strong class="${cls(sum)}">${money(sum)}</strong>`;
  $("historyList").innerHTML=arr.length?arr.map(b=>{const legs=Array.isArray(b.legs)?b.legs:[];const legBlock=legs.length?`<details class="legs-details"><summary>${legs.length} ben i byg væddemål</summary>${legs.map(legSummary).join("")}</details>`:"";return`<article class="history-item"><div class="history-top"><div><h3>${esc(b.match)}</h3><div class="meta"><span>${b.date}</span><span>${esc(b.league)}</span><span>${esc(b.betType||"Single")}</span><span>${esc(b.market)}</span></div></div><strong class="${cls(profit(b))}">${money(profit(b))}</strong></div><div class="meta"><span>Indsats ${money(b.stake)}</span><span>Odds ${Number(b.odds).toFixed(2)}</span><span>${labelResult(b.result)}</span></div>${legBlock}<div class="item-actions"><button onclick="editBet('${b.id}')">Redigér</button><button onclick="deleteBet('${b.id}')">Slet</button></div></article>`}).join(""):'<div class="empty">Ingen bets matcher filtrene.</div>'
}
function renderStats(field,target){const rows=aggregate(field).sort((a,b)=>b.profit-a.profit);$(target).innerHTML=rows.length?rows.map(x=>`<article class="stat-row"><div class="stat-top"><h3>${esc(x.name)}</h3><strong class="${cls(x.profit)}">${money(x.profit)}</strong></div><div class="stats-grid"><div><small>Bets</small><strong>${x.bets}</strong></div><div><small>ROI</small><strong>${pct(x.roi)}</strong></div><div><small>Hitrate</small><strong>${pct(x.hit)}</strong></div><div><small>Gns. odds</small><strong>${x.avg.toFixed(2)}</strong></div></div></article>`).join(""):'<div class="empty">Ingen statistik endnu.</div>'}
function renderLegStats(){const rows=aggregateLegs();$("legStats").innerHTML=rows.length?rows.map(x=>`<article class="stat-row"><div class="stat-top"><h3>${esc(x.name)}</h3><strong>${x.tickets} bets</strong></div><div class="stats-grid"><div><small>Ben brugt</small><strong>${x.legs}</strong></div><div><small>Vundne bets</small><strong>${x.wins}</strong></div><div><small>Tabte bets</small><strong>${x.losses}</strong></div><div><small>Hitrate</small><strong>${pct(x.hit)}</strong></div></div></article>`).join(""):'<div class="empty">Tilføj et byg væddemål for at se benanalyse.</div>'}
function renderAnalysis(){
  const m=aggregate("market"),l=aggregate("league"),s=stats(),best=a=>a.length?[...a].sort((x,y)=>y.profit-x.profit)[0].name:"Ingen data",worst=a=>a.length?[...a].sort((x,y)=>x.profit-y.profit)[0].name:"Ingen data";
  const cards=[["Bedste marked",best(m)],["Dårligste marked",worst(m)],["Bedste liga",best(l)],["Dårligste liga",worst(l)],["Længste winstreak",String(s.maxWin)],["Længste losestreak",String(s.maxLoss)],["Højeste bankroll",money(s.peak)],["Laveste bankroll",money(s.minBank)],["Største drawdown",money(s.maxDD)]];
  $("analysisCards").innerHTML=cards.map(([a,b])=>`<article class="analysis-card"><span>${a}</span><strong>${esc(b)}</strong></article>`).join("");$("startBankroll").value=state.settings.startBankroll;$("stakePercent").value=state.settings.stakePercent;renderStats("oddsBand","oddsStats");renderLegStats()
}

async function loadCloud(){
  if(!currentUser)return;setSync("Synkroniserer…");
  const [{data:rows,error:e1},{data:settingsRow,error:e2}]=await Promise.all([supabase.from("bets").select("id,data,created_at").order("created_at",{ascending:true}),supabase.from("user_settings").select("*").maybeSingle()]);
  if(e1||e2){console.error(e1||e2);setSync("Synk-fejl",true);return}
  state.bets=(rows||[]).map(r=>({...r.data,betType:r.data?.betType||"Single",legs:Array.isArray(r.data?.legs)?r.data.legs:[],id:r.id,createdAt:r.created_at}));
  state.settings.startBankroll=Number(settingsRow?.start_bankroll??3000);state.settings.stakePercent=Number(settingsRow?.stake_percentage??2);
  setSync("Synkroniseret");renderActive();
}
function setSync(text,bad=false){const e=$("syncState");if(e){e.textContent=text;e.className=`sync-state ${bad?"negative":"positive"}`}}
function renderActive(){const id=document.querySelector(".view.active")?.id||"dashboardView";if(id==="dashboardView")renderDashboard();if(id==="historyView")renderHistory();if(id==="marketsView")renderStats("market","marketStats");if(id==="leaguesView")renderStats("league","leagueStats");if(id==="analysisView")renderAnalysis()}
async function handleSession(session){currentUser=session?.user||null;$("authScreen").classList.toggle("hidden",!!currentUser);$("app").classList.toggle("hidden",!currentUser);if(currentUser)await loadCloud()}

$("authForm").addEventListener("submit",async e=>{e.preventDefault();$("authMessage").textContent="Logger ind…";const{error}=await supabase.auth.signInWithPassword({email:$("authEmail").value,password:$("authPassword").value});$("authMessage").textContent=error?error.message:""});
$("signupBtn").addEventListener("click",async()=>{$("authMessage").textContent="Opretter konto…";const{error}=await supabase.auth.signUp({email:$("authEmail").value,password:$("authPassword").value});$("authMessage").textContent=error?error.message:"Konto oprettet. Tjek din e-mail, hvis du skal bekræfte den."});

$("betForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const isBuilder=$("betType").value==="Byg væddemål",legs=isBuilder?collectLegs():[];
  if(isBuilder&&legs.length<2){alert("Et byg væddemål skal have mindst 2 ben.");return}
  if(isBuilder&&legs.some(l=>!l.market||!l.selection)){alert("Vælg marked og skriv valg på alle ben.");return}
  const data={date:$("date").value,betType:$("betType").value,league:$("league").value,match:$("match").value.trim(),market:isBuilder?"Bet Builder":$("market").value,stake:Number($("stake").value),odds:Number($("odds").value),result:$("result").value,note:$("note").value.trim(),cashOutReturn:Number($("cashOutReturn").value)||0,legs};
  setSync("Gemmer…");const{error}=await supabase.from("bets").insert({user_id:currentUser.id,data});if(error){alert(error.message);setSync("Synk-fejl",true);return}
  e.target.reset();$("date").value=today();$("betType").value="Single";$("result").value="Pending";$("cashOutWrap").classList.add("hidden");$("legsList").innerHTML="";toggleBuilder();await loadCloud();setSuggestedStake(true);showView("historyView")
});
$("result").addEventListener("change",()=>$("cashOutWrap").classList.toggle("hidden",$("result").value!=="Cash Out"));
$("betType").addEventListener("change",toggleBuilder);$("addLegBtn").addEventListener("click",()=>newLeg());
document.querySelectorAll(".bottom-nav button").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));$("quickAdd").addEventListener("click",()=>showView("newBetView"));
["searchInput","resultFilter","leagueFilter","marketFilter","betTypeFilter"].forEach(id=>$(id).addEventListener(id==="searchInput"?"input":"change",renderHistory));
window.deleteBet=async id=>{if(!confirm("Slet dette bet?"))return;const{error}=await supabase.from("bets").delete().eq("id",id);if(error)return alert(error.message);await loadCloud()};
window.editBet=id=>{const b=state.bets.find(x=>x.id===id);if(!b)return;$("editId").value=b.id;$("editDate").value=b.date;$("editBetType").value=b.betType||"Single";$("editLeague").value=b.league;$("editMatch").value=b.match;$("editMarket").value=b.market;$("editStake").value=b.stake;$("editOdds").value=b.odds;$("editResult").value=b.result;$("editNote").value=b.note||"";$("editDialog").showModal()};
$("cancelEdit").addEventListener("click",()=>$("editDialog").close());
$("editForm").addEventListener("submit",async e=>{e.preventDefault();const id=$("editId").value,old=state.bets.find(x=>x.id===id);const data={...old,date:$("editDate").value,betType:$("editBetType").value,league:$("editLeague").value,match:$("editMatch").value.trim(),market:$("editMarket").value,stake:Number($("editStake").value),odds:Number($("editOdds").value),result:$("editResult").value,note:$("editNote").value.trim()};delete data.id;delete data.createdAt;const{error}=await supabase.from("bets").update({data}).eq("id",id);if(error)return alert(error.message);$("editDialog").close();await loadCloud()});
$("settingsForm").addEventListener("submit",async e=>{e.preventDefault();const start_bankroll=Number($("startBankroll").value)||0,stake_percentage=Number($("stakePercent").value)||2;const{error}=await supabase.from("user_settings").upsert({user_id:currentUser.id,start_bankroll,stake_percentage},{onConflict:"user_id"});if(error){alert(error.message+"\n\nHvis fejlen nævner stake_percentage, kør SUPABASE_UPDATE_V2.sql én gang i Supabase.");return}await loadCloud();setSuggestedStake(true);alert("Indstillinger gemt")});
$("refreshBtn").addEventListener("click",loadCloud);$("logoutBtn").addEventListener("click",()=>supabase.auth.signOut());
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&currentUser)loadCloud()});window.addEventListener("focus",()=>currentUser&&loadCloud());
supabase.auth.onAuthStateChange((_e,session)=>handleSession(session));
if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
populate();$("date").value=today();$("betType").value="Single";$("result").value="Pending";const{data:{session}}=await supabase.auth.getSession();await handleSession(session);setSuggestedStake();
