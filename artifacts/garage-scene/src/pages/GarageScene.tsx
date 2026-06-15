import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════

const analytics = {
  sessionStartedAt: Date.now(),
  events: [] as { event: string; timestamp: number; data: Record<string, unknown> }[],
  flags: {
    clickedComputer: false, openedNewProject: false, startedFirstProject: false,
    reachedReleaseReady: false, releasedFirstGame: false, viewedReviewReport: false,
    earnedMoney: false, boughtUpgrade: false, startedSecondProject: false,
  },
  firstComputerClick: null as number | null,
  firstProjectStart: null as number | null,
  firstRelease: null as number | null,
  firstUpgradeBought: null as number | null,
  panelsOpened: 0,
  actionsUsed: 0,
  bubblesSpawned: 0,
};

function track(eventName: string, data: Record<string, unknown> = {}) {
  // Throttle high-freq events
  if (eventName === "point_bubble_spawned") { analytics.bubblesSpawned++; return; }
  analytics.events.push({ event: eventName, timestamp: Date.now(), data });
  const flagMap: Record<string, keyof typeof analytics.flags> = {
    computer_clicked:"clickedComputer", new_project_opened:"openedNewProject",
    project_started:"startedFirstProject", release_ready:"reachedReleaseReady",
    game_released:"releasedFirstGame", review_report_viewed:"viewedReviewReport",
    sales_tick:"earnedMoney", upgrade_bought:"boughtUpgrade", second_project_started:"startedSecondProject",
  };
  if (flagMap[eventName]) analytics.flags[flagMap[eventName]] = true;
  console.log("[analytics]", eventName, data);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: RANDOM TITLE GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

const TITLE_ADJ  = ["Dark","Ancient","Lost","Final","Iron","Neon","Crystal","Shadow","Phantom","Eternal"];
const TITLE_NOUN = ["Quest","Legend","Chronicle","Empire","Realm","Odyssey","Saga","Dawn","Frontier","Kingdom"];
const TITLE_PRE  = ["Star","Dragon","Thunder","Moon","Storm","Fire","Sky","Blood","Time","Void"];
function makeTitle(): string {
  const r = Math.random();
  if (r < 0.33) return `${TITLE_ADJ[~~(Math.random()*TITLE_ADJ.length)]} ${TITLE_NOUN[~~(Math.random()*TITLE_NOUN.length)]}`;
  if (r < 0.66) return `${TITLE_PRE[~~(Math.random()*TITLE_PRE.length)]}${TITLE_NOUN[~~(Math.random()*TITLE_NOUN.length)]}`;
  return `${TITLE_PRE[~~(Math.random()*TITLE_PRE.length)]} ${TITLE_ADJ[~~(Math.random()*TITLE_ADJ.length)]}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: DATA
// ═══════════════════════════════════════════════════════════════════════════════

const TOPICS    = ["Fantasy","Space","Racing","Business","Medieval","Horror","Detective"] as const;
const GENRES    = ["RPG","Strategy","Simulation","Action","Adventure"] as const;
const PLATFORMS = ["Home Computer","Arcade Cabinet","Early Console"] as const;

type Topic    = typeof TOPICS[number];
type Genre    = typeof GENRES[number];
type Platform = typeof PLATFORMS[number];
type FocusMode = "design"|"tech"|"fixBugs"|"crunch"|"rest"|"research"|null;
type Phase     = "idle"|"developing"|"releasing";
type TutorialStep = "start"|"pick"|"develop"|"release"|"upgrade"|"second"|"done";

const TOPIC_MOD: Record<Topic,{d:number;t:number}> = {
  Fantasy:{d:1.2,t:0.9},Space:{d:1.0,t:1.3},Racing:{d:1.1,t:1.1},
  Business:{d:0.9,t:1.2},Medieval:{d:1.3,t:0.8},Horror:{d:1.1,t:1.0},Detective:{d:1.0,t:1.1},
};
const GENRE_MOD: Record<Genre,{dw:number;tw:number;bugSens:number}> = {
  RPG:{dw:1.4,tw:1.0,bugSens:1.2},Strategy:{dw:0.9,tw:1.4,bugSens:1.0},
  Simulation:{dw:1.0,tw:1.3,bugSens:1.1},Action:{dw:1.2,tw:1.1,bugSens:1.3},
  Adventure:{dw:1.3,tw:0.9,bugSens:0.9},
};
const PLATFORM_MOD: Record<Platform,{fans:number;sales:number;techReq:number}> = {
  "Home Computer":{fans:1.0,sales:1.0,techReq:0},
  "Arcade Cabinet":{fans:1.3,sales:1.5,techReq:25},
  "Early Console":{fans:1.6,sales:2.2,techReq:50},
};
const COMBO: Record<Genre,Partial<Record<Topic,number>>> = {
  RPG:{Fantasy:1.5,Medieval:1.4,Horror:1.2,Space:1.1,Detective:1.0,Racing:0.8,Business:0.7},
  Strategy:{Business:1.5,Medieval:1.3,Detective:1.2,Space:1.2,Fantasy:1.0,Horror:0.9,Racing:0.8},
  Simulation:{Racing:1.5,Business:1.4,Space:1.2,Detective:1.0,Fantasy:0.9,Medieval:0.8,Horror:0.7},
  Action:{Horror:1.5,Racing:1.4,Space:1.3,Fantasy:1.2,Medieval:1.1,Detective:1.0,Business:0.7},
  Adventure:{Detective:1.5,Fantasy:1.4,Medieval:1.3,Horror:1.3,Space:1.1,Racing:0.8,Business:0.8},
};
const UPGRADE_DEFS = [
  {id:"betterPC",    name:"Faster PC",   cost:350,desc:"+20% tech generation",  mechanic:"techGen"},
  {id:"coffeemaker", name:"Coffee Maker",cost:150,desc:"-25% energy loss/week", mechanic:"energy"},
  {id:"books",       name:"Prog. Books", cost:250,desc:"+15% design generation",mechanic:"designGen"},
  {id:"whiteboard",  name:"Whiteboard",  cost:400,desc:"-20% bug generation",   mechanic:"bugs"},
] as const;
const REVIEW_OUTLETS = [
  {name:"Byte Magazine",      bias: 0.4},
  {name:"The Arcade Gazette", bias:-0.6},
  {name:"PC Gamer UK",        bias: 0.0},
  {name:"Digital Frontiers",  bias: 0.8},
];
const REVIEW_BLURBS: Record<string,string[]> = {
  high:["A genuine classic.","Couldn't put it down.","Memorable and fresh.","A must-play."],
  mid: ["Shows real promise.","Worth a look.","Decent effort.","Has its moments."],
  low: ["Struggles to engage.","Too many rough edges.","Needs more polish.","Disappointing."],
};
const EVENTS = [
  {text:"A gaming magazine featured you!",       fans:50, cash:0,   prog:0,  bugFix:false},
  {text:"Printer broke. Minor tech setback.",    fans:0,  cash:-60, prog:5,  bugFix:false},
  {text:"Local store wants to carry your games!",fans:80, cash:200, prog:0,  bugFix:false},
  {text:"Power outage! Lost some progress.",     fans:0,  cash:0,   prog:10, bugFix:false},
  {text:"Found a critical bug early!",           fans:0,  cash:0,   prog:0,  bugFix:true },
  {text:"A friend beta-tested your game!",       fans:25, cash:0,   prog:0,  bugFix:false},
  {text:"Computer Weekly gave you a mention!",   fans:60, cash:0,   prog:0,  bugFix:false},
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Project { name:string;topic:Topic;genre:Genre;platform:Platform;design:number;tech:number;bugs:number;progress:number;research:number; }
interface Reviewer { outlet:string;score:number;blurb:string; }
interface ReviewResult { gameName:string;score:number;reviewers:Reviewer[];unitsSold:number;revenue:number;fansGained:number; }
interface SalesTail { gameName:string;score:number;weeksLeft:number;weeksTotal:number;baseRevenue:number;baseFans:number; }
interface Bubble { id:number;text:string;color:string;svgX:number;svgY:number;born:number; }
interface ReleasedGame { name:string;score:number;revenue:number;fansGained:number;year:number;week:number; }

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: ISO HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const TW=60, TH=30, OX=400, OY=150;
function iso(x:number,y:number,z:number){return{x:(x-y)*TW/2+OX, y:(x+y)*TH/2-z*TH+OY};}
function pts(raw:number[][]){return raw.map(p=>{const c=iso(p[0],p[1],p[2]);return`${c.x},${c.y}`;}).join(" ");}

function P({p,fill,stroke="rgba(0,0,0,0.1)",sw=1,onClick,cursor}:{p:number[][];fill:string;stroke?:string;sw?:number;onClick?:(e:React.MouseEvent)=>void;cursor?:string;}){
  return <polygon points={pts(p)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" onClick={onClick} style={cursor?{cursor}:undefined}/>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: REVIEW
// ═══════════════════════════════════════════════════════════════════════════════

function generateReview(project:Project, upgrades:Set<string>): ReviewResult {
  const tm=TOPIC_MOD[project.topic], gm=GENRE_MOD[project.genre], pm=PLATFORM_MOD[project.platform];
  const combo=COMBO[project.genre]?.[project.topic]??1.0;
  const bugs=upgrades.has("whiteboard")?project.bugs*0.8:project.bugs;
  const design=project.design*gm.dw*tm.d*(upgrades.has("books")?1.15:1.0);
  const tech=project.tech*gm.tw*tm.t*(upgrades.has("betterPC")?1.2:1.0);
  const bugPen=1/(1+bugs*0.07*gm.bugSens);
  const resMod=1+(project.research??0)*0.004;
  const raw=((design+tech)/2)*bugPen*combo*pm.fans/14*resMod;
  const score=Math.max(1.0,Math.min(10.0,raw));
  const rounded=Math.round(score*10)/10;
  const reviewers:Reviewer[]=REVIEW_OUTLETS.map(o=>{
    const rv=Math.max(1,Math.min(10,rounded+o.bias+(Math.random()-0.5)*1.2));
    const rs=Math.round(rv*10)/10;
    const blurbSet=rs>=7?REVIEW_BLURBS.high:rs>=5?REVIEW_BLURBS.mid:REVIEW_BLURBS.low;
    return{outlet:o.name,score:rs,blurb:blurbSet[~~(Math.random()*blurbSet.length)]};
  });
  const baseSales=Math.floor((rounded*65+Math.random()*55)*pm.sales);
  const revenue=Math.floor(baseSales*(4+rounded*2));
  const fansGained=Math.floor((rounded*26+Math.random()*16)*pm.fans);
  return{gameName:project.name,score:rounded,reviewers,unitsSold:baseSales,revenue,fansGained};
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function GarageScene() {

  // ── Core state ──
  const [week,setWeek]=useState(1);
  const [year,setYear]=useState(1);
  const [cash,setCash]=useState(2000);
  const [fans,setFans]=useState(0);
  const [energy,setEnergy]=useState(100);
  const [phase,setPhase]=useState<Phase>("idle");
  const [project,setProject]=useState<Project|null>(null);
  const [focusMode,setFocusMode]=useState<FocusMode>(null);
  const [upgrades,setUpgrades]=useState<Set<string>>(new Set());
  const [history,setHistory]=useState<ReleasedGame[]>([]);
  const [salesTail,setSalesTail]=useState<SalesTail|null>(null);
  const [bubbles,setBubbles]=useState<Bubble[]>([]);
  const [reviewResult,setReviewResult]=useState<ReviewResult|null>(null);
  const [toast,setToast]=useState<string|null>(null);
  const [celebrating,setCelebrating]=useState(false);

  // ── UI panels ──
  const [showNewGame,setShowNewGame]=useState(false);
  const [showComputer,setShowComputer]=useState(false);
  const [showShop,setShowShop]=useState(false);
  const [showHistory,setShowHistory]=useState(false);

  // ── Form ──
  const [formName,setFormName]=useState(makeTitle);
  const [formTopic,setFormTopic]=useState<Topic>("Fantasy");
  const [formGenre,setFormGenre]=useState<Genre>("RPG");
  const [formPlatform,setFormPlatform]=useState<Platform>("Home Computer");

  // ── Tutorial ──
  const [tutorialStep,setTutorialStep]=useState<TutorialStep>("start");
  const [pillDismissed,setPillDismissed]=useState(false);
  const [actionBurst,setActionBurst]=useState<{type:string;key:number}|null>(null);

  // ── Refs ──
  const phaseRef=useRef(phase);
  const upgradesRef=useRef(upgrades);
  const focusRef=useRef(focusMode);
  const salesRef=useRef(salesTail);
  const weekRef=useRef(week);
  const yearRef=useRef(year);
  const weeksSinceEvent=useRef(0);
  const releaseReadyFired=useRef(false); // guard: only fire release_ready once per project
  phaseRef.current=phase;
  upgradesRef.current=upgrades;
  focusRef.current=focusMode;
  salesRef.current=salesTail;
  weekRef.current=week;
  yearRef.current=year;

  // ── ISO anchors ──
  const charHead      = iso(5.5,5.0,2.45);
  const monitorPos    = iso(4.73,5.1,2.3);
  const bookshelfPos  = iso(9.0,0.5,3.5);
  const deskTop       = iso(4.25,5.1,1.9);
  const computerPos   = iso(4.3,5.05,3.0);

  // ── Bubble spawner ──
  const spawnBubble=useCallback((text:string,color:string,svgX:number,svgY:number)=>{
    const ox=(Math.random()-0.5)*30;
    const oy=(Math.random()-0.5)*10;
    setBubbles(prev=>[
      ...prev.filter(b=>Date.now()-b.born<2000),
      {id:Date.now()+Math.random(),text,color,svgX:svgX+ox,svgY:svgY+oy,born:Date.now()}
    ]);
    track("point_bubble_spawned",{text});
  },[]);

  // ── Window helpers ──
  useEffect(()=>{
    track("session_start",{});
    (window as Record<string,unknown>).printSessionSummary = ()=>{
      const elapsed=(Date.now()-analytics.sessionStartedAt)/1000;
      console.group("[Session Summary]");
      console.log(`Time played: ${elapsed.toFixed(0)}s`);
      console.log("Funnel flags:",analytics.flags);
      console.log(`First computer click: ${analytics.firstComputerClick?((analytics.firstComputerClick-analytics.sessionStartedAt)/1000).toFixed(1)+"s":"never"}`);
      console.log(`First project start: ${analytics.firstProjectStart?((analytics.firstProjectStart-analytics.sessionStartedAt)/1000).toFixed(1)+"s":"never"}`);
      console.log(`First release: ${analytics.firstRelease?((analytics.firstRelease-analytics.sessionStartedAt)/1000).toFixed(1)+"s":"never"}`);
      console.log(`First upgrade: ${analytics.firstUpgradeBought?((analytics.firstUpgradeBought-analytics.sessionStartedAt)/1000).toFixed(1)+"s":"never"}`);
      console.log(`Panels opened: ${analytics.panelsOpened}`);
      console.log(`Actions used: ${analytics.actionsUsed}`);
      console.log(`Bubbles spawned: ${analytics.bubblesSpawned}`);
      console.log(`Second project: ${analytics.flags.startedSecondProject}`);
      console.groupEnd();
    };
    (window as Record<string,unknown>).resetGame = ()=>window.location.reload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // ── Release-ready effect (fires exactly once per project) ──
  useEffect(()=>{
    if(project?.progress!==undefined&&project.progress>=100&&!releaseReadyFired.current){
      releaseReadyFired.current=true;
      setCelebrating(true);
      track("release_ready",{});
      track("release_ready_visual_shown",{});
      if(tutorialStep==="develop") setTutorialStep("release");
      spawnBubble("🚀 Ready!","#22c55e",computerPos.x,computerPos.y-30);
      setTimeout(()=>setCelebrating(false),3000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[project?.progress]);

  // ── Main simulation tick ──
  useEffect(()=>{
    const id=setInterval(()=>{
      setWeek(w=>{const n=w+1;if(n>52){setYear(y=>y+1);return 1;}return n;});
      weeksSinceEvent.current+=1;

      const ph=phaseRef.current;
      const up=upgradesRef.current;
      const fm=focusRef.current;

      // Energy
      if(ph==="developing"){
        if(fm==="rest"){
          setEnergy(e=>Math.min(100,e+12));
          spawnBubble(`Energy +12`,"#10b981",charHead.x,charHead.y-15);
        } else {
          const drain=fm==="crunch"?8:fm==="fixBugs"?2:3;
          const mod=up.has("coffeemaker")?0.75:1.0;
          setEnergy(e=>Math.max(0,e-drain*mod));
        }
      } else {
        setEnergy(e=>Math.min(100,e+4));
      }

      // Development tick
      if(ph==="developing"&&fm!=="rest"){
        setEnergy(en=>{
          const energyMod=en<25?0.5:1.0;
          const speedMod=up.has("betterPC")?1.2:1.0;
          const bugMod=up.has("whiteboard")?0.8:1.0;
          const designMod=up.has("books")?1.15:1.0;
          const baseRate=fm==="crunch"?1.8:fm==="fixBugs"?0.5:fm==="research"?0.6:1.0;
          const rate=3.0*baseRate*speedMod*energyMod;

          const r=Math.random();
          if(fm==="fixBugs"){
            if(r<0.7){
              const bugFix=Math.floor(2+Math.random()*3);
              spawnBubble(`Bug −${bugFix}`,"#22c55e",monitorPos.x,monitorPos.y-20);
              setProject(p=>p?{...p,bugs:Math.max(0,p.bugs-bugFix)}:p);
            }
          } else if(fm==="research"){
            const rGain=Math.floor(1+Math.random()*2);
            spawnBubble(`Research +${rGain}`,"#a855f7",bookshelfPos.x,bookshelfPos.y-20);
            setProject(p=>p?{...p,research:(p.research??0)+rGain}:p);
            track("research_gained",{gain:rGain});
          } else {
            const dBoost=fm==="design"?1.5:fm==="tech"?0.7:1.0;
            const tBoost=fm==="tech"?1.5:fm==="design"?0.7:1.0;
            const bugChance=fm==="crunch"?0.45:0.25;

            if(r<0.30){
              const g=Math.floor((2+Math.random()*4)*dBoost*designMod*energyMod);
              spawnBubble(`Design +${g}`,"#f59e0b",charHead.x,charHead.y-12);
              setProject(p=>p?{...p,design:p.design+g}:p);
            } else if(r<0.55){
              const g=Math.floor((2+Math.random()*4)*tBoost*speedMod*energyMod);
              spawnBubble(`Tech +${g}`,"#3b82f6",monitorPos.x,monitorPos.y-15);
              setProject(p=>p?{...p,tech:p.tech+g}:p);
            } else if(r<0.55+bugChance){
              const b=Math.floor((1+Math.random()*2)*bugMod);
              spawnBubble(`Bug +${b}`,"#ef4444",monitorPos.x,monitorPos.y-10);
              setProject(p=>p?{...p,bugs:p.bugs+b}:p);
              track("bug_indicator_shown",{bugs:b});
            }
          }

          setProject(p=>p?{...p,progress:Math.min(100,p.progress+rate)}:p);
          return en;
        });
      }

      // Sales tail
      const tail=salesRef.current;
      if(tail&&tail.weeksLeft>0){
        const elapsed=tail.weeksTotal-tail.weeksLeft;
        const decay=0.72+tail.score*0.012;
        const wRev=Math.floor(tail.baseRevenue*Math.pow(decay,elapsed));
        const wFans=Math.floor(tail.baseFans*Math.pow(decay,elapsed));
        setCash(c=>c+wRev);
        setFans(f=>f+wFans);
        setSalesTail(s=>s?{...s,weeksLeft:s.weeksLeft-1}:null);
        setToast(`${tail.gameName}: +$${wRev.toLocaleString()} this week`);
        spawnBubble(`$${wRev.toLocaleString()}`,"#22c55e",deskTop.x,deskTop.y-20);
        track("sales_tick",{revenue:wRev});
        setTimeout(()=>setToast(null),3500);
      }

      // Random events
      if(weeksSinceEvent.current>=8&&Math.random()<0.18){
        weeksSinceEvent.current=0;
        const ev=EVENTS[~~(Math.random()*EVENTS.length)];
        setToast(ev.text);
        if(ev.fans){setFans(f=>f+ev.fans);spawnBubble(`Fans +${ev.fans}`,"#a855f7",charHead.x+20,charHead.y-25);}
        if(ev.cash){setCash(c=>c+ev.cash);spawnBubble(`${ev.cash>0?"+":""}$${Math.abs(ev.cash)}`,"#22c55e",deskTop.x,deskTop.y-15);}
        if(ev.prog&&phaseRef.current==="developing") setProject(p=>p?{...p,progress:Math.max(0,p.progress-ev.prog)}:p);
        if(ev.bugFix&&phaseRef.current==="developing") setProject(p=>p?{...p,bugs:Math.max(0,p.bugs-4)}:p);
        setTimeout(()=>setToast(null),4000);
      }

      console.log(`[week] Y${yearRef.current} W${weekRef.current+1}`);
    },2000);
    return()=>clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[spawnBubble]);

  // ── Handlers ──
  function onComputerClick(e:React.MouseEvent){
    e.stopPropagation(); // FIX: prevent bubble-up to root close handler
    if(phase==="idle"){
      if(!analytics.flags.clickedComputer){ analytics.firstComputerClick=Date.now(); }
      track("computer_clicked",{});
      track("new_project_opened",{});
      analytics.panelsOpened++;
      if(tutorialStep==="start") setTutorialStep("pick");
      setShowNewGame(true);
    } else if(phase==="developing"){
      analytics.panelsOpened++;
      track("computer_clicked",{phase:"developing"});
      setShowComputer(s=>!s);
      setShowShop(false);
    }
  }

  function onShelfClick(e:React.MouseEvent){
    e.stopPropagation(); // FIX: same propagation issue
    setShowShop(s=>!s);
    setShowComputer(false);
    track("upgrade_shop_opened",{});
    analytics.panelsOpened++;
  }

  function randomizeForm(){
    setFormTopic(TOPICS[~~(Math.random()*TOPICS.length)]);
    setFormGenre(GENRES[~~(Math.random()*GENRES.length)]);
    setFormPlatform(PLATFORMS[~~(Math.random()*PLATFORMS.length)]);
    setFormName(makeTitle());
  }

  function startProject(){
    releaseReadyFired.current=false; // reset for new project
    const p:Project={name:formName||makeTitle(),topic:formTopic,genre:formGenre,platform:formPlatform,design:0,tech:0,bugs:0,progress:0,research:0};
    setProject(p);
    setPhase("developing");
    setFocusMode(null);
    setShowNewGame(false);
    setShowComputer(false);
    const isSecond=history.length>0;
    if(!analytics.flags.startedFirstProject){ analytics.firstProjectStart=Date.now(); track("project_started",{name:p.name}); setTutorialStep("develop"); }
    else if(isSecond&&!analytics.flags.startedSecondProject){ track("second_project_started",{name:p.name}); setTutorialStep("done"); }
    track("project_pill_shown",{name:p.name});
    console.log(`[project] started: ${p.name}`);
  }

  function releaseGame(){
    if(!project)return;
    const result=generateReview(project,upgrades);
    setReviewResult(result);
    const weeksTotal=Math.floor(4+result.score*0.5);
    const tailRev=Math.floor(result.revenue*0.3/weeksTotal);
    const tailFans=Math.floor(result.fansGained*0.3/weeksTotal);
    setSalesTail({gameName:project.name,score:result.score,weeksLeft:weeksTotal,weeksTotal,baseRevenue:tailRev,baseFans:tailFans});
    setHistory(h=>[...h,{name:project.name,score:result.score,revenue:result.revenue,fansGained:result.fansGained,year,week}]);
    setPhase("releasing");
    setShowComputer(false);
    if(!analytics.flags.releasedFirstGame){ analytics.firstRelease=Date.now(); }
    track("game_released",{name:project.name,score:result.score,revenue:result.revenue});
    track("review_report_viewed",{});
    console.log(`[release] ${project.name} | score: ${result.score}`);
  }

  function dismissReview(){
    if(!reviewResult)return;
    setCash(c=>c+Math.floor(reviewResult.revenue*0.7));
    setFans(f=>f+Math.floor(reviewResult.fansGained*0.7));
    setReviewResult(null);
    setProject(null);
    setPhase("idle");
    setFocusMode(null);
    setCelebrating(false);
    if(tutorialStep==="release") setTutorialStep("upgrade");
  }

  function buyUpgrade(id:string,cost:number){
    if(upgrades.has(id)||cash<cost)return;
    setCash(c=>c-cost);
    setUpgrades(u=>new Set([...u,id]));
    setShowShop(false);
    if(!analytics.flags.boughtUpgrade){ analytics.firstUpgradeBought=Date.now(); }
    track("upgrade_bought",{id,cost});
    if(tutorialStep==="upgrade") setTutorialStep("second");
    spawnBubble(`✓ ${id}`,"#22c55e",bookshelfPos.x,bookshelfPos.y-20);
    console.log(`[upgrade] bought: ${id}`);
  }

  function handleFocusClick(id:FocusMode){
    setFocusMode(f=>f===id?null:id);
    setShowComputer(false);
    analytics.actionsUsed++;
    track("development_focus_changed",{from:focusMode,to:id});
    setActionBurst({type:id??"balanced",key:Date.now()});
    // Immediate visual feedback bubbles
    if(id==="design")   { spawnBubble("Design ↑","#f59e0b",charHead.x,charHead.y-20); spawnBubble("Design ↑","#f59e0b",charHead.x+25,charHead.y-30); }
    if(id==="tech")     { spawnBubble("Tech ↑","#3b82f6",monitorPos.x,monitorPos.y-25); spawnBubble("Tech ↑","#3b82f6",monitorPos.x+20,monitorPos.y-35); }
    if(id==="fixBugs")  { spawnBubble("Bug fix ✓","#22c55e",monitorPos.x,monitorPos.y-20); }
    if(id==="crunch")   { spawnBubble("⚡ Crunch!","#ef4444",charHead.x,charHead.y-25); }
    if(id==="rest")     { spawnBubble("💤 Resting","#10b981",charHead.x,charHead.y-20); }
    if(id==="research") { spawnBubble("Research ↑","#a855f7",bookshelfPos.x,bookshelfPos.y-20); }
  }

  // ── Derived ──
  const working        = phase==="developing";
  const tired          = energy<25;
  const readyToRelease = working&&(project?.progress??0)>=100;
  const combo          = COMBO[formGenre]?.[formTopic]??1.0;
  const bestScore      = history.length>0?Math.max(...history.map(g=>g.score)):0;
  const bestRevenue    = history.length>0?Math.max(...history.map(g=>g.revenue)):0;
  const bugCount       = Math.min(5,Math.ceil((project?.bugs??0)/8));
  const projectStatus  = !project?"":project.progress>=100?"Ready to Release":project.progress>=75?"Polishing":project.progress>=25?"In Development":"Planning";

  // ── Hint map ──
  const hintMap: Record<TutorialStep,string|null> = {
    start:"Click the computer to start your first game.",
    pick:"Pick a topic, genre, and platform.",
    develop:"Time is moving. Click the computer to guide development.",
    release:"Release your game from the computer panel.",
    upgrade:"Click the shelf to buy your first upgrade.",
    second:"Start a second game and beat your first score.",
    done:null,
  };
  const currentHint=hintMap[tutorialStep];

  // ── Objective pill ──
  const objectiveText=(()=>{
    if(phase==="idle"&&history.length===0) return "Start your first game";
    if(working&&(project?.progress??0)<100) return "Reach 100% progress";
    if(working&&(project?.progress??0)>=100) return "Release your game";
    if(phase==="releasing") return "See your review";
    if(phase==="idle"&&history.length>0&&upgrades.size===0) return "Buy an upgrade";
    if(phase==="idle"&&history.length>0&&upgrades.size>0&&history.length<2) return "Start your second game";
    return null;
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return(
    <div className="relative w-full h-[100dvh] overflow-hidden bg-background select-none"
      onClick={e=>{
        const t=e.target as HTMLElement;
        if(!t.closest("[data-panel]")){setShowComputer(false);setShowShop(false);}
      }}
    >

      {/* ── CSS ANIMATIONS ─────────────────────────────────────────────────── */}
      <style>{`
        @keyframes bugWiggle { 0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)} }
        @keyframes releasePulse { 0%,100%{box-shadow:0 0 0 0 #22c55e55}50%{box-shadow:0 0 0 8px #22c55e00} }
        @keyframes pillFadeIn { from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)} }
        .bug-wiggle { animation: bugWiggle 0.4s ease-in-out infinite; display:inline-block; }
        .release-pulse { animation: releasePulse 1.2s ease-in-out infinite; }
        .pill-appear { animation: pillFadeIn 0.3s ease-out both; }
      `}</style>

      {/* ── SVG SCENE ─────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center pt-12">
        <svg viewBox="0 0 800 600" className="w-full h-full max-h-[88vh] drop-shadow-xl" preserveAspectRatio="xMidYMid meet">

          {/* FLOOR */}
          <P p={[[0,0,0],[10,0,0],[10,10,0],[0,10,0]]} fill="#b0b0b0" stroke="#9a9a9a"/>
          {/* WALLS */}
          <P p={[[0,0,0],[10,0,0],[10,0,5],[0,0,5]]} fill="#91b27c" stroke="#7c9d68"/>
          <P p={[[0,0,0],[0,10,0],[0,10,5],[0,0,5]]} fill="#7c9d68" stroke="#6a8758"/>
          {/* DOOR */}
          <P p={[[2,0,0],[4,0,0],[4,0,4],[2,0,4]]} fill="#f3f3f3" stroke="#d0d0d0"/>
          <P p={[[2,0,0],[4,0,0],[4,0,0.18],[2,0,0.18]]} fill="#d0d0d0"/>
          <P p={[[3.65,0,1.85],[3.85,0,1.85],[3.85,0,2.05],[3.65,0,2.05]]} fill="#bbb" stroke="#999"/>
          {/* CORKBOARD */}
          <P p={[[6,0,2],[8,0,2],[8,0,4],[6,0,4]]} fill="#d0ac7e" stroke="#aa8856" sw={1.5}/>
          <P p={[[6.15,0,2],[8,0,2],[8,0,3.9],[6.15,0,3.9]]} fill="#c49a6c"/>
          {[[6.3,2.5,6.75,2.9,"#f4e57d"],[6.9,3.1,7.35,3.55,"#f07070"],[7.45,2.3,7.85,2.7,"#7de5f4"],[6.3,3.2,6.75,3.6,"#a0e878"]]
            .map(([x1,z1,x2,z2,fill],i)=>
              <P key={i} p={[[x1 as number,0,z1 as number],[x2 as number,0,z1 as number],[x2 as number,0,z2 as number],[x1 as number,0,z2 as number]]} fill={fill as string}/>)}
          {/* WHITEBOARD UPGRADE */}
          {upgrades.has("whiteboard")&&(
            <>
              <P p={[[4.2,0,2],[5.8,0,2],[5.8,0,4],[4.2,0,4]]} fill="#f8f8f8" stroke="#ccc" sw={2}/>
              <P p={[[4.3,0,2.1],[5.7,0,2.1],[5.7,0,3.9],[4.3,0,3.9]]} fill="#fff"/>
              <polygon points={`${iso(4.5,0,3.0).x},${iso(4.5,0,3.0).y} ${iso(4.9,0,2.5).x},${iso(4.9,0,2.5).y} ${iso(5.3,0,3.2).x},${iso(5.3,0,3.2).y} ${iso(5.6,0,2.7).x},${iso(5.6,0,2.7).y}`} fill="none" stroke="#3b82f6" strokeWidth={2}/>
            </>
          )}
          {/* BLACKBOARD */}
          <P p={[[0,1,2],[0,5.5,2],[0,5.5,4.6],[0,1,4.6]]} fill="#263d32" stroke="#1a2820" sw={2}/>
          <P p={[[0,1.2,2],[0,5.5,2],[0,5.5,2.1],[0,1.2,2.1]]} fill="#1a2820"/>
          <P p={[[0,1.6,3.1],[0,1.9,3.1],[0,1.9,3.7],[0,1.6,3.7]]} fill="#eee"/>
          <P p={[[0,4.8,2.7],[0,5.1,2.7],[0,5.1,3.3],[0,4.8,3.3]]} fill="#eee"/>
          <P p={[[0,3.2,3.1],[0,3.5,3.1],[0,3.5,3.4],[0,3.2,3.4]]} fill="#ddd"/>
          <line x1={iso(0,2,3.4).x} y1={iso(0,2,3.4).y} x2={iso(0,4.5,3.0).x} y2={iso(0,4.5,3.0).y} stroke="#ffffff45" strokeWidth={1} strokeDasharray="4 4"/>
          {/* LADDER */}
          <P p={[[0,6,0],[0,6.25,0],[0,6.25,4.5],[0,6,4.5]]} fill="#8c5a35"/>
          <P p={[[0,7,0],[0,7.25,0],[0,7.25,4.5],[0,7,4.5]]} fill="#8c5a35"/>
          {[1,1.8,2.6,3.4,4.1].map((z,i)=><P key={i} p={[[0,6,z],[0,7.25,z],[0,7.25,z+0.18],[0,6,z+0.18]]} fill="#a8754b"/>)}
          {/* BOOKSHELF */}
          <P p={[[8,0,0],[10,0,0],[10,1,0],[8,1,0]]} fill="#6e4225" onClick={onShelfClick} cursor="pointer"/>
          <P p={[[8,1,0],[10,1,0],[10,1,5],[8,1,5]]} fill="#5a341c" onClick={onShelfClick} cursor="pointer"/>
          <P p={[[8,0,0],[8,1,0],[8,1,5],[8,0,5]]} fill="#7a4e2c"/>
          <P p={[[8,0,5],[10,0,5],[10,1,5],[8,1,5]]} fill="#8c5a35"/>
          {[1.5,3.0].map((z,i)=><P key={i} p={[[8,0,z],[10,0,z],[10,1,z],[8,1,z]]} fill="#4a2a14"/>)}
          {/* Shelf hint glow */}
          {tutorialStep==="upgrade"&&(
            <motion.ellipse cx={bookshelfPos.x} cy={bookshelfPos.y+30} rx={30} ry={14}
              fill="#f59e0b" opacity={0}
              animate={{opacity:[0,0.3,0]}} transition={{repeat:Infinity,duration:1.6}}/>
          )}
          {/* Books */}
          {[
            [[8.3,0.15,1.5],[8.6,0.15,1.5],[8.6,0.85,1.5],[8.3,0.85,1.5],"#d94b4b"],
            [[8.3,0.15,1.5],[8.3,0.15,2.5],[8.6,0.15,2.5],[8.6,0.15,1.5],"#c23b3b"],
            [[8.8,0.15,1.5],[9.0,0.15,1.5],[9.0,0.85,1.5],[8.8,0.85,1.5],"#e8a020"],
            [[9.2,0.15,1.5],[9.5,0.15,1.5],[9.5,0.85,1.5],[9.2,0.85,1.5],"#4b8dd9"],
            [[9.2,0.15,1.5],[9.2,0.15,2.5],[9.5,0.15,2.5],[9.5,0.15,1.5],"#3a7cc8"],
            [[9.6,0.15,1.5],[9.85,0.15,1.5],[9.85,0.85,1.5],[9.6,0.85,1.5],"#7dc87d"],
            [[8.4,0.15,3.0],[8.7,0.15,3.0],[8.7,0.85,3.0],[8.4,0.85,3.0],"#c84bcb"],
            [[8.4,0.15,3.0],[8.4,0.15,4.1],[8.7,0.15,4.1],[8.7,0.15,3.0],"#a83bab"],
            [[9.0,0.15,3.0],[9.3,0.15,3.0],[9.3,0.85,3.0],[9.0,0.85,3.0],"#4bc8c8"],
            [[9.6,0.15,3.0],[9.85,0.15,3.0],[9.85,0.85,3.0],[9.6,0.85,3.0],"#e87050"],
          ].map(([p1,p2,p3,p4,fill],i)=><P key={i} p={[p1,p2,p3,p4] as number[][]} fill={fill as string}/>)}
          {/* FILING CABINET */}
          <P p={[[0,8,0],[2,8,0],[2,10,0],[0,10,0]]} fill="#4a3a2a"/>
          <P p={[[2,8,0],[2,10,0],[2,10,2.2],[2,8,2.2]]} fill="#8c6a4a"/>
          <P p={[[0,10,0],[2,10,0],[2,10,2.2],[0,10,2.2]]} fill="#6a4a3a"/>
          <P p={[[0,8,2.2],[2,8,2.2],[2,10,2.2],[0,10,2.2]]} fill="#aa8860"/>
          <P p={[[1.95,8.2,1.3],[1.95,9.8,1.3],[1.95,9.8,1.9],[1.95,8.2,1.9]]} fill="#5c422a" stroke="#442f1a"/>
          <P p={[[1.95,8.2,0.4],[1.95,9.8,0.4],[1.95,9.8,1.1],[1.95,8.2,1.1]]} fill="#5c422a" stroke="#442f1a"/>
          {/* FRAMED GRAPH */}
          <P p={[[0,7.5,2.8],[0,10.2,2.8],[0,10.2,4.8],[0,7.5,4.8]]} fill="#f0eedd" stroke="#555" sw={2}/>
          <P p={[[0,7.7,3.0],[0,10.0,3.0],[0,10.0,4.6],[0,7.7,4.6]]} fill="#fff"/>
          <polygon points={`${iso(0,7.9,3.3).x},${iso(0,7.9,3.3).y} ${iso(0,8.5,4.0).x},${iso(0,8.5,4.0).y} ${iso(0,9.0,3.5).x},${iso(0,9.0,3.5).y} ${iso(0,9.6,4.3).x},${iso(0,9.6,4.3).y}`} fill="none" stroke="#d94b4b" strokeWidth={2}/>
          <polygon points={`${iso(0,7.9,3.7).x},${iso(0,7.9,3.7).y} ${iso(0,8.4,3.2).x},${iso(0,8.4,3.2).y} ${iso(0,9.1,4.1).x},${iso(0,9.1,4.1).y} ${iso(0,9.6,3.9).x},${iso(0,9.6,3.9).y}`} fill="none" stroke="#4b8dd9" strokeWidth={2}/>
          {/* TEAL RUG */}
          <P p={[[3,3,0.01],[7,3,0.01],[7,7.2,0.01],[3,7.2,0.01]]} fill="#3a8c8c" stroke="#2e7070"/>
          {/* DESK LEGS */}
          {[[3.5,3.5],[3.5,6.5],[4.9,3.5],[4.9,6.5]].map(([dx,dy],i)=>(
            <P key={i} p={[[dx,dy,0],[dx+0.35,dy,0],[dx+0.35,dy,1.6],[dx,dy,1.6]]} fill="#5c422a"/>
          ))}
          {/* DESK TOP */}
          <P p={[[3.2,3.2,1.6],[5.3,3.2,1.6],[5.3,7.0,1.6],[3.2,7.0,1.6]]} fill="#cda87a"/>
          <P p={[[5.3,3.2,1.6],[5.3,7.0,1.6],[5.3,7.0,1.72],[5.3,3.2,1.72]]} fill="#b08a5a"/>
          <P p={[[3.2,7.0,1.6],[5.3,7.0,1.6],[5.3,7.0,1.72],[3.2,7.0,1.72]]} fill="#8c6a3a"/>
          <P p={[[3.2,3.2,1.72],[5.3,3.2,1.72],[5.3,7.0,1.72],[3.2,7.0,1.72]]} fill="#e5c89f"/>
          {/* FASTER PC UPGRADE */}
          {upgrades.has("betterPC")&&(
            <>
              <P p={[[3.3,6.6,1.72],[3.8,6.6,1.72],[3.8,7.1,1.72],[3.3,7.1,1.72]]} fill="#1a1a2e"/>
              <P p={[[3.8,6.6,1.72],[3.8,7.1,1.72],[3.8,7.1,2.5],[3.8,6.6,2.5]]} fill="#16213e"/>
              <P p={[[3.3,7.1,1.72],[3.8,7.1,1.72],[3.8,7.1,2.5],[3.3,7.1,2.5]]} fill="#0f3460"/>
              <P p={[[3.3,6.6,2.5],[3.8,6.6,2.5],[3.8,7.1,2.5],[3.3,7.1,2.5]]} fill="#1a1a4e"/>
              <P p={[[3.75,6.65,2.0],[3.75,7.05,2.0],[3.75,7.05,2.3],[3.75,6.65,2.3]]} fill="#4b8dd9"/>
            </>
          )}
          {/* COFFEE MAKER UPGRADE */}
          {upgrades.has("coffeemaker")&&(
            <>
              <P p={[[8.9,1.1,0],[9.5,1.1,0],[9.5,1.6,0],[8.9,1.6,0]]} fill="#2a2a2a"/>
              <P p={[[9.5,1.1,0],[9.5,1.6,0],[9.5,1.6,0.9],[9.5,1.1,0.9]]} fill="#333"/>
              <P p={[[8.9,1.6,0],[9.5,1.6,0],[9.5,1.6,0.9],[8.9,1.6,0.9]]} fill="#222"/>
              <P p={[[8.9,1.1,0.9],[9.5,1.1,0.9],[9.5,1.6,0.9],[8.9,1.6,0.9]]} fill="#444"/>
              <P p={[[9.1,1.2,0.9],[9.3,1.2,0.9],[9.3,1.5,0.9],[9.1,1.5,0.9]]} fill="#c0392b"/>
            </>
          )}
          {/* MONITOR BASE + STAND */}
          <P p={[[3.9,4.8,1.72],[4.7,4.8,1.72],[4.7,5.7,1.72],[3.9,5.7,1.72]]} fill="#d0d0d0"/>
          <P p={[[4.2,5.1,1.72],[4.4,5.1,1.72],[4.4,5.3,1.72],[4.2,5.3,1.72]]} fill="#aaa"/>
          <P p={[[4.2,5.1,1.72],[4.2,5.3,1.72],[4.2,5.3,2.3],[4.2,5.1,2.3]]} fill="#999"/>

          {/* COMPUTER GLOW before first click */}
          {tutorialStep==="start"&&(
            <motion.ellipse cx={computerPos.x} cy={computerPos.y+10} rx={55} ry={22}
              fill="#f59e0b" opacity={0}
              animate={{opacity:[0,0.22,0]}} transition={{repeat:Infinity,duration:1.6}}/>
          )}
          {/* RELEASE-READY computer green glow */}
          {readyToRelease&&(
            <motion.ellipse cx={computerPos.x} cy={computerPos.y+10} rx={55} ry={22}
              fill="#22c55e" opacity={0}
              animate={{opacity:[0,0.25,0]}} transition={{repeat:Infinity,duration:1.0}}/>
          )}

          {/* MONITOR HOUSING - clickable (stopPropagation via onComputerClick) */}
          <P p={[[3.85,4.5,1.72],[4.75,4.5,1.72],[4.75,5.75,1.72],[3.85,5.75,1.72]]}
            fill={upgrades.has("betterPC")?"#c8d8e8":"#e4e4e4"} onClick={onComputerClick} cursor="pointer"/>
          <P p={[[4.75,4.5,1.72],[4.75,5.75,1.72],[4.75,5.75,2.7],[4.75,4.5,2.7]]}
            fill={upgrades.has("betterPC")?"#a8c8e8":"#c8c8c8"} onClick={onComputerClick} cursor="pointer"/>
          <P p={[[3.85,5.75,1.72],[4.75,5.75,1.72],[4.75,5.75,2.7],[3.85,5.75,2.7]]} fill="#b0b0b0"/>
          <P p={[[3.85,4.5,2.7],[4.75,4.5,2.7],[4.75,5.75,2.7],[3.85,5.75,2.7]]}
            fill="#f0f0f0" onClick={onComputerClick} cursor="pointer"/>

          {/* MONITOR SCREEN */}
          <motion.g
            animate={{opacity:working?[0.85,1,0.9,1,0.85]:[0.5,0.6,0.5]}}
            transition={{repeat:Infinity,duration:working?0.65:3.5,ease:"linear"}}
          >
            <P p={[[4.72,4.6,1.9],[4.72,5.6,1.9],[4.72,5.6,2.55],[4.72,4.6,2.55]]}
              fill={working?(tired?"#7a4000":focusMode==="crunch"?"#6b0000":readyToRelease?"#003300":"#1e60c0"):"#1a2e20"}/>
            <P p={[[4.73,4.7,2.0],[4.73,5.5,2.0],[4.73,5.5,2.45],[4.73,4.7,2.45]]}
              fill={working?(tired?"#b06020":focusMode==="crunch"?"#cc2200":readyToRelease?"#22c55e":focusMode==="design"?"#4060d0":focusMode==="tech"?"#20a050":"#5aa0f0"):"#2e4a38"}/>
          </motion.g>

          {/* KEYBOARD */}
          <P p={[[4.5,4.7,1.74],[4.95,4.7,1.74],[4.95,5.3,1.74],[4.5,5.3,1.74]]} fill="#cccccc"/>
          <P p={[[4.6,5.35,1.74],[4.82,5.35,1.74],[4.82,5.48,1.74],[4.6,5.48,1.74]]} fill="#cccccc"/>

          {/* DIEGETIC PROGRESS BAR */}
          {working&&project&&(
            <g>
              <rect x={iso(4.3,4.2,2.85).x-40} y={iso(4.3,4.2,2.85).y-8} width={80} height={8} rx={4} fill="#33333366"/>
              <rect x={iso(4.3,4.2,2.85).x-40} y={iso(4.3,4.2,2.85).y-8} width={project.progress*0.8} height={8} rx={4}
                fill={project.progress>=100?"#22c55e":"#f59e0b"}/>
              <text x={iso(4.3,4.2,2.85).x} y={iso(4.3,4.2,2.85).y-12}
                textAnchor="middle" fontSize="9" fill="#fff" fontWeight="bold" stroke="#00000066" strokeWidth="1" paintOrder="stroke">
                {project.name} {Math.floor(project.progress)}%
              </text>
            </g>
          )}

          {/* RELEASE READY BADGE */}
          {readyToRelease&&(
            <motion.g animate={{opacity:[0.8,1,0.8],y:[0,-3,0]}} transition={{repeat:Infinity,duration:1.2}}>
              <rect x={computerPos.x-42} y={computerPos.y-24} width={84} height={20} rx={10} fill="#22c55e"/>
              <text x={computerPos.x} y={computerPos.y-10} textAnchor="middle" fontSize="10" fontWeight="bold" fill="white">🚀 Release Ready!</text>
            </motion.g>
          )}

          {/* BUG INDICATORS near monitor */}
          {working&&bugCount>0&&(
            <g>
              {Array.from({length:bugCount},(_,i)=>{
                const bx=monitorPos.x-20+(i*10);
                const by=monitorPos.y+12;
                return (
                  <text key={i} x={bx} y={by} fontSize="10" textAnchor="middle"
                    style={{animation:`bugWiggle ${0.3+i*0.05}s ease-in-out infinite`,display:"inline-block",transformOrigin:`${bx}px ${by}px`}}>
                    🐛
                  </text>
                );
              })}
            </g>
          )}

          {/* TRASH BIN */}
          <P p={[[2.4,6.1,0],[3.1,6.1,0],[3.1,6.6,0],[2.4,6.6,0]]} fill="#2a5bb4"/>
          <P p={[[3.1,6.1,0],[3.1,6.6,0],[3.1,6.6,0.9],[3.1,6.1,0.9]]} fill="#3a6bc4"/>
          <P p={[[2.4,6.6,0],[3.1,6.6,0],[3.1,6.6,0.9],[2.4,6.6,0.9]]} fill="#1a4ba4"/>

          {/* CHARACTER */}
          <motion.g
            animate={celebrating
              ?{y:[0,-8,0,-6,0,-4,0]}
              :focusMode==="rest"?{y:[0,-0.5,0]}
              :tired?{y:[0,-0.5,0]}
              :working?{y:[0,-3,0,-2.5,0,-1,0]}:{y:[0,-1,0]}}
            transition={{repeat:Infinity,duration:celebrating?0.5:focusMode==="rest"?3:tired?4:working?0.65:2.8,ease:"easeInOut"}}
          >
            <P p={[[5.2,4.8,0],[5.7,4.8,0],[5.7,5.3,0],[5.2,5.3,0]]} fill="#1e1e1e"/>
            <P p={[[5.35,4.95,0],[5.35,5.15,0],[5.35,5.15,0.85],[5.35,4.95,0.85]]} fill="#2e2e2e"/>
            <P p={[[5.05,4.6,0.85],[5.85,4.6,0.85],[5.85,5.4,0.85],[5.05,5.4,0.85]]} fill="#2e2e2e"/>
            <P p={[[5.85,4.6,0.85],[5.85,5.4,0.85],[5.85,5.4,0.95],[5.85,4.6,0.95]]} fill="#1e1e1e"/>
            <P p={[[5.05,4.6,0.95],[5.85,4.6,0.95],[5.85,5.4,0.95],[5.05,5.4,0.95]]} fill="#404040"/>
            <P p={[[5.8,4.6,0.95],[5.85,5.4,0.95],[5.85,5.4,1.95],[5.8,4.6,1.95]]} fill="#1e1e1e"/>
            <P p={[[5.2,4.7,0.95],[5.65,4.7,0.95],[5.65,5.3,0.95],[5.2,5.3,0.95]]} fill={tired?"#dde":focusMode==="rest"?"#e8f4e8":"#f0f0f0"}/>
            <P p={[[5.65,4.7,0.95],[5.65,5.3,0.95],[5.65,5.3,1.85],[5.65,4.7,1.85]]} fill="#d8d8d8"/>
            <P p={[[5.2,5.3,0.95],[5.65,5.3,0.95],[5.65,5.3,1.85],[5.2,5.3,1.85]]} fill="#c8c8c8"/>
            <P p={[[5.2,4.7,1.85],[5.65,4.7,1.85],[5.65,5.3,1.85],[5.2,5.3,1.85]]} fill={tired?"#eef":"#ffffff"}/>
            <P p={[[5.28,4.82,1.85],[5.72,4.82,1.85],[5.72,5.22,1.85],[5.28,5.22,1.85]]} fill="#ff8c42"/>
            <P p={[[5.72,4.82,1.85],[5.72,5.22,1.85],[5.72,5.22,2.25],[5.72,4.82,2.25]]} fill="#e6732e"/>
            <P p={[[5.28,5.22,1.85],[5.72,5.22,1.85],[5.72,5.22,2.25],[5.28,5.22,2.25]]} fill="#cc5c1a"/>
            <P p={[[5.28,4.82,2.25],[5.72,4.82,2.25],[5.72,5.22,2.25],[5.28,5.22,2.25]]} fill="#ffa572"/>
          </motion.g>

          {/* REST AURA */}
          {focusMode==="rest"&&working&&(
            <motion.ellipse cx={charHead.x} cy={charHead.y+15} rx={35} ry={18}
              fill="#22c55e" opacity={0}
              animate={{opacity:[0,0.18,0]}} transition={{repeat:Infinity,duration:2}}/>
          )}

          {/* ACTION BURST */}
          {actionBurst&&(
            <AnimatePresence>
              <motion.g key={actionBurst.key}
                initial={{opacity:1,scale:0.5}} animate={{opacity:0,scale:2.5}} exit={{opacity:0}}
                transition={{duration:0.6,ease:"easeOut"}}>
                {actionBurst.type==="design"&&([0,60,120,180,240,300].map((a,i)=>{
                  const r2=a*Math.PI/180;
                  return <circle key={i} cx={charHead.x+Math.cos(r2)*22} cy={charHead.y+Math.sin(r2)*22} r={5} fill="#f59e0b"/>;
                }))}
                {actionBurst.type==="tech"&&([0,45,90,135,180,225,270,315].map((a,i)=>{
                  const r2=a*Math.PI/180;
                  return <circle key={i} cx={monitorPos.x+Math.cos(r2)*20} cy={monitorPos.y+Math.sin(r2)*20} r={4} fill="#3b82f6"/>;
                }))}
                {actionBurst.type==="fixBugs"&&(
                  <circle cx={monitorPos.x} cy={monitorPos.y} r={36} fill="none" stroke="#22c55e" strokeWidth={3} opacity={0.8}/>
                )}
                {actionBurst.type==="crunch"&&(
                  <circle cx={computerPos.x} cy={computerPos.y} r={42} fill="none" stroke="#ef4444" strokeWidth={3} opacity={0.8}/>
                )}
                {actionBurst.type==="research"&&([0,60,120,180,240,300].map((a,i)=>{
                  const r2=a*Math.PI/180;
                  return <circle key={i} cx={bookshelfPos.x+Math.cos(r2)*22} cy={bookshelfPos.y+Math.sin(r2)*22} r={5} fill="#a855f7"/>;
                }))}
              </motion.g>
            </AnimatePresence>
          )}

          {/* BUBBLES */}
          <AnimatePresence>
            {bubbles.map(b=>(
              <motion.g key={b.id}
                initial={{opacity:1,y:0}} animate={{opacity:0,y:-50}} exit={{opacity:0}}
                transition={{duration:1.8,ease:"easeOut"}}>
                <text x={b.svgX} y={b.svgY} textAnchor="middle" fontSize="11" fontWeight="bold"
                  fill={b.color} stroke="white" strokeWidth="2.5" paintOrder="stroke">{b.text}</text>
              </motion.g>
            ))}
          </AnimatePresence>

          {/* PROGRESSIVE HINT */}
          {currentHint&&(
            <motion.g animate={{opacity:[0.7,1,0.7],y:[0,-4,0]}} transition={{repeat:Infinity,duration:1.8}}>
              <rect x={computerPos.x-92} y={computerPos.y-46} width={184} height={22} rx={11} fill="#f59e0b" opacity={0.93}/>
              <text x={computerPos.x} y={computerPos.y-31} textAnchor="middle" fontSize="9.5" fontWeight="bold"
                fill="white" stroke="rgba(0,0,0,0.2)" strokeWidth="1" paintOrder="stroke">{currentHint}</text>
              <polygon points={`${computerPos.x},${computerPos.y-8} ${computerPos.x-6},${computerPos.y-24} ${computerPos.x+6},${computerPos.y-24}`} fill="#f59e0b"/>
            </motion.g>
          )}

          {/* CAR UNDER TARP */}
          <g>
            <path d={[`M ${iso(7,5,0).x} ${iso(7,5,0).y}`,`C ${iso(7.8,3.8,1.0).x} ${iso(7.8,3.8,1.0).y}, ${iso(9,4.8,1.6).x} ${iso(9,4.8,1.6).y}, ${iso(10.2,5,0).x} ${iso(10.2,5,0).y}`,`C ${iso(10.2,6.5,0).x} ${iso(10.2,6.5,0).y}, ${iso(9.2,7.5,1.4).x} ${iso(9.2,7.5,1.4).y}, ${iso(8,7.5,0.8).x} ${iso(8,7.5,0.8).y}`,`C ${iso(7,8,0).x} ${iso(7,8,0).y}, ${iso(6.2,7,0).x} ${iso(6.2,7,0).y}, ${iso(7,5,0).x} ${iso(7,5,0).y}`].join(" ")} fill="#2a5bb4" stroke="#1a4ba4" strokeWidth={2}/>
            <path d={`M ${iso(8,4,1).x} ${iso(8,4,1).y} Q ${iso(8.6,4.8,1.3).x} ${iso(8.6,4.8,1.3).y} ${iso(9.2,5.4,0.6).x} ${iso(9.2,5.4,0.6).y}`} stroke="#3a6bc4" strokeWidth={3} fill="none"/>
            <path d={`M ${iso(8.5,6.5,1.1).x} ${iso(8.5,6.5,1.1).y} Q ${iso(9.1,6.0,1.3).x} ${iso(9.1,6.0,1.3).y} ${iso(9.7,5.5,0.5).x} ${iso(9.7,5.5,0.5).y}`} stroke="#4a7cd4" strokeWidth={2} fill="none"/>
          </g>

        </svg>
      </div>

      {/* ── STATUS CARD (top-left) ─────────────────────────────────────────── */}
      <div className="absolute top-3 left-3 z-20 pointer-events-none">
        <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-xl shadow px-3 py-2 text-xs font-mono w-[145px]">
          <div className="text-[10px] font-sans font-bold text-gray-400 uppercase tracking-wider mb-1">Y{year} · W{week}</div>
          <div className="font-black text-green-700 text-sm">${cash.toLocaleString()}</div>
          <div className="text-violet-600 font-semibold">{fans.toLocaleString()} fans</div>
          <div className="mt-1.5">
            <div className="flex justify-between text-[9px] font-bold text-gray-400 mb-0.5">
              <span>Energy</span><span>{Math.floor(energy)}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000"
                style={{width:`${energy}%`,background:energy>60?"#22c55e":energy>30?"#f59e0b":"#ef4444"}}/>
            </div>
          </div>
          {history.length>0&&(
            <button className="mt-1.5 w-full text-[9px] text-gray-400 hover:text-gray-600 pointer-events-auto transition-colors"
              onClick={()=>setShowHistory(h=>!h)}>
              {history.length} game{history.length>1?"s":""} released
            </button>
          )}
        </div>
      </div>

      {/* ── PROJECT PILL (top-center) ──────────────────────────────────────── */}
      <AnimatePresence>
        {working&&project&&(
          <motion.div
            initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
            transition={{duration:0.3}}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pill-appear"
          >
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow text-xs font-bold backdrop-blur
              ${readyToRelease?"bg-green-500/90 border-green-400 text-white release-pulse":"bg-white/90 border-gray-200 text-gray-700"}`}>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${readyToRelease?"bg-white":focusMode==="crunch"?"bg-red-500":focusMode==="design"?"bg-amber-400":focusMode==="tech"?"bg-blue-500":"bg-amber-400 animate-pulse"}`}/>
              <span className="font-black truncate max-w-[120px]">{project.name}</span>
              <span className={`text-[10px] font-semibold ${readyToRelease?"text-white/90":"text-gray-400"}`}>·</span>
              <span className={`text-[10px] whitespace-nowrap ${readyToRelease?"text-white/90":project.progress>=75?"text-orange-500":project.progress>=25?"text-blue-500":"text-gray-400"}`}>
                {projectStatus}
              </span>
              <span className={`text-[10px] font-black ${readyToRelease?"text-white":"text-gray-500"}`}>{Math.floor(project.progress)}%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── OBJECTIVE PILL (top-right) ─────────────────────────────────────── */}
      <AnimatePresence>
        {objectiveText&&!pillDismissed&&tutorialStep!=="done"&&(
          <motion.div
            initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}}
            className="absolute top-3 right-3 z-20 flex items-center gap-1.5"
          >
            <div className="bg-white/90 backdrop-blur border border-amber-200 rounded-full shadow px-3 py-1.5 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"/>
              <span className="text-[10px] font-bold text-gray-700 whitespace-nowrap">{objectiveText}</span>
              <button onClick={()=>setPillDismissed(true)} className="text-gray-300 hover:text-gray-500 text-[10px] leading-none ml-0.5 transition-colors">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Focus indicator when objective pill dismissed */}
      {focusMode&&working&&pillDismissed&&(
        <div className="absolute top-3 right-3 z-20 pointer-events-none">
          <div className={`text-[10px] font-black px-2.5 py-1 rounded-full border text-white ${
            focusMode==="crunch"?"bg-red-500 border-red-600":focusMode==="fixBugs"?"bg-green-500 border-green-600":
            focusMode==="design"?"bg-amber-500 border-amber-600":focusMode==="rest"?"bg-emerald-500 border-emerald-600":
            focusMode==="research"?"bg-purple-500 border-purple-600":"bg-blue-500 border-blue-600"}`}>
            {focusMode==="design"?"Design Focus":focusMode==="tech"?"Tech Focus":focusMode==="fixBugs"?"Fixing Bugs":focusMode==="rest"?"Resting":focusMode==="research"?"Researching":"CRUNCH MODE"}
          </div>
        </div>
      )}

      {/* ── COMPUTER PANEL ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showComputer&&working&&(
          <motion.div data-panel="computer"
            initial={{opacity:0,y:10,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:10,scale:0.95}}
            transition={{type:"spring",damping:22,stiffness:300}}
            className="absolute z-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-gray-200 p-3 w-[230px]"
          >
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Dev Actions</div>
            <div className="flex flex-col gap-1.5">
              {([
                {id:"design",   label:"Focus Design",  sub:"+D pts, −T pts",           color:"#f59e0b"},
                {id:"tech",     label:"Focus Tech",    sub:"+T pts, −D pts",           color:"#3b82f6"},
                {id:"fixBugs",  label:"Fix Bugs",      sub:"−bugs, slow progress",     color:"#22c55e"},
                {id:"crunch",   label:"Crunch",        sub:"2× speed, −energy, +bugs", color:"#ef4444"},
                {id:"rest",     label:"Rest",          sub:"pause dev, +energy fast",  color:"#10b981"},
                {id:"research", label:"Research",      sub:"+score bonus, slow prog",  color:"#a855f7"},
              ] as const).map(btn=>(
                <button key={btn.id} onClick={()=>handleFocusClick(btn.id)}
                  className="flex items-start gap-2 px-3 py-2 rounded-xl border text-left transition-all text-xs active:scale-95"
                  style={{background:focusMode===btn.id?`${btn.color}22`:"#f9f9f9",borderColor:focusMode===btn.id?btn.color:"#e5e7eb"}}>
                  <div className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0" style={{background:btn.color}}/>
                  <div>
                    <div className="font-bold text-gray-800">{btn.label}{focusMode===btn.id?" ✓":""}</div>
                    <div className="text-[10px] text-gray-400">{btn.sub}</div>
                  </div>
                </button>
              ))}
              {readyToRelease&&(
                <button onClick={releaseGame}
                  className="mt-1 w-full py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-black text-sm transition-colors active:scale-95"
                  data-testid="button-release">
                  🚀 Release Game!
                </button>
              )}
            </div>
            {project&&(
              <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-3 gap-1 text-center text-[9px]">
                <div><div className="text-amber-500 font-black">{Math.floor(project.design)}</div><div className="text-gray-400">Design</div></div>
                <div><div className="text-blue-500 font-black">{Math.floor(project.tech)}</div><div className="text-gray-400">Tech</div></div>
                <div><div className={`font-black ${project.bugs>10?"text-red-500":"text-gray-500"}`}>{Math.floor(project.bugs)}</div><div className="text-gray-400">Bugs</div></div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SHOP PANEL ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showShop&&(
          <motion.div data-panel="shop"
            initial={{opacity:0,x:60}} animate={{opacity:1,x:0}} exit={{opacity:0,x:60}}
            transition={{type:"spring",damping:22}}
            className="absolute top-12 right-3 z-30 bg-white/97 backdrop-blur rounded-2xl shadow-xl border border-gray-200 p-4 w-[210px]"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-wider">Upgrade Shop</h3>
              <div className="text-xs font-bold text-green-600">${cash.toLocaleString()}</div>
            </div>
            <div className="flex flex-col gap-2">
              {UPGRADE_DEFS.map(upg=>{
                const owned=upgrades.has(upg.id);
                const afford=cash>=upg.cost;
                return(
                  <div key={upg.id} data-testid={`upgrade-${upg.id}`}
                    onClick={()=>!owned&&afford&&buyUpgrade(upg.id,upg.cost)}
                    className={`p-2.5 rounded-xl border text-xs transition-all ${owned?"bg-green-50 border-green-200":afford?"bg-white border-gray-200 hover:bg-amber-50 cursor-pointer active:scale-95":"bg-gray-50 border-gray-100 opacity-50"}`}>
                    <div className="font-bold text-gray-800">{upg.name}</div>
                    <div className="text-gray-400 text-[10px] mt-0.5">{upg.desc}</div>
                    <div className={`font-black text-[11px] mt-1 ${owned?"text-green-600":afford?"text-amber-600":"text-gray-400"}`}>
                      {owned?"✓ Owned":`$${upg.cost.toLocaleString()}`}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-[9px] text-gray-300 text-center">Click bookshelf to close</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HISTORY PANEL ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showHistory&&(
          <motion.div data-panel="history"
            initial={{opacity:0,x:-60}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-60}}
            className="absolute top-36 left-3 z-30 bg-white/97 backdrop-blur rounded-2xl shadow-xl border border-gray-200 p-4 w-[190px] max-h-[260px] overflow-y-auto"
          >
            <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-wider mb-2">Games Released</h3>
            {history.map((g,i)=>(
              <div key={i} className="p-2 rounded-lg border border-gray-100 bg-gray-50 text-xs mb-1.5">
                <div className="font-bold text-gray-800 truncate">{g.name}</div>
                <div className="flex justify-between mt-0.5">
                  <span className={`font-black ${g.score>=7?"text-green-600":g.score>=5?"text-amber-600":"text-red-500"}`}>{g.score}/10</span>
                  <span className="text-green-600">${g.revenue.toLocaleString()}</span>
                </div>
                {g.score===bestScore&&history.length>1&&<div className="text-[9px] text-amber-500 font-bold mt-0.5">⭐ Best Score</div>}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NEW GAME PANEL ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showNewGame&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={e=>{if(e.target===e.currentTarget)setShowNewGame(false);}}>
            <motion.div data-panel="newgame"
              initial={{scale:0.88,y:24}} animate={{scale:1,y:0}} exit={{scale:0.88,y:24}}
              transition={{type:"spring",damping:22}}
              className="bg-white rounded-2xl shadow-2xl p-5 w-[340px] max-h-[90vh] overflow-y-auto border border-gray-100"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider">New Project</h2>
                <button onClick={randomizeForm} className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-violet-100 text-violet-600 hover:bg-violet-200 transition-colors active:scale-95">
                  🎲 Randomize
                </button>
              </div>
              {history.length>0&&(
                <div className="mb-3 px-2.5 py-2 rounded-lg bg-amber-50 border border-amber-100 text-[10px] text-amber-700">
                  <div className="font-black mb-0.5">Beat your record</div>
                  <div className="flex gap-3"><span>Best score: <b>{bestScore}/10</b></span><span>Best rev: <b>${bestRevenue.toLocaleString()}</b></span></div>
                </div>
              )}
              <label className="block mb-3">
                <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Title</span>
                <input type="text" value={formName} onChange={e=>setFormName(e.target.value)} maxLength={30}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-gray-50"
                  data-testid="input-game-name"/>
              </label>
              <div className="mb-3">
                <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Topic</span>
                <div className="grid grid-cols-4 gap-1">
                  {TOPICS.map(t=>(
                    <button key={t} onClick={()=>setFormTopic(t)}
                      className={`text-[11px] py-1.5 px-1 rounded-lg border font-semibold transition-all active:scale-95 ${formTopic===t?"bg-amber-400 border-amber-500 text-white shadow-sm":"bg-gray-50 border-gray-200 text-gray-600 hover:bg-amber-50"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Genre</span>
                <div className="grid grid-cols-3 gap-1">
                  {GENRES.map(g=>(
                    <button key={g} onClick={()=>setFormGenre(g)}
                      className={`text-[11px] py-1.5 px-1 rounded-lg border font-semibold transition-all active:scale-95 ${formGenre===g?"bg-blue-400 border-blue-500 text-white shadow-sm":"bg-gray-50 border-gray-200 text-gray-600 hover:bg-blue-50"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Platform</span>
                <div className="flex flex-col gap-1">
                  {PLATFORMS.map(pl=>(
                    <button key={pl} onClick={()=>setFormPlatform(pl)}
                      className={`text-[11px] py-1.5 px-3 rounded-lg border text-left font-semibold transition-all active:scale-95 ${formPlatform===pl?"bg-violet-400 border-violet-500 text-white shadow-sm":"bg-gray-50 border-gray-200 text-gray-600 hover:bg-violet-50"}`}>
                      {pl}{PLATFORM_MOD[pl].techReq>0?<span className="opacity-60 ml-1 text-[9px]">(needs T&gt;{PLATFORM_MOD[pl].techReq})</span>:""}
                    </button>
                  ))}
                </div>
              </div>
              <div className={`text-[11px] px-2.5 py-1.5 rounded-lg mb-4 font-semibold ${combo>=1.4?"bg-green-50 text-green-700 border border-green-200":combo<=0.8?"bg-red-50 text-red-600 border border-red-200":"bg-gray-50 text-gray-500 border border-gray-100"}`}>
                {combo>=1.4?`✓ Great combo! ${formTopic} × ${formGenre} works perfectly.`:combo<=0.8?`✗ Weak combo. ${formTopic} and ${formGenre} clash.`:`Decent combo for ${formTopic} ${formGenre}.`}
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setShowNewGame(false)} className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button onClick={startProject} data-testid="button-start" className="flex-2 px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm transition-colors active:scale-95">Start!</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── REVIEW OVERLAY ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {reviewResult&&phase==="releasing"&&(()=>{
          const prev=history.slice(0,-1);
          const prevBest=prev.length>0?Math.max(...prev.map(g=>g.score)):0;
          const prevBestRev=prev.length>0?Math.max(...prev.map(g=>g.revenue)):0;
          const isNewBestScore=prev.length>0&&reviewResult.score>prevBest;
          const isNewBestRevenue=prev.length>0&&reviewResult.revenue>prevBestRev;
          return(
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
              <motion.div data-panel="review"
                initial={{scale:0.85,y:30}} animate={{scale:1,y:0}} exit={{scale:0.85,y:30}}
                transition={{type:"spring",damping:20}}
                className="bg-gray-950 text-white rounded-2xl shadow-2xl p-6 w-[380px] max-h-[90vh] overflow-y-auto border border-gray-700"
              >
                <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="text-center mb-4">
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Game Released</div>
                  <div className="text-xl font-black text-white">{reviewResult.gameName}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{project?.topic} · {project?.genre} · {project?.platform}</div>
                  {(isNewBestScore||isNewBestRevenue)&&(
                    <div className="flex gap-2 justify-center mt-2">
                      {isNewBestScore&&<span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white">⭐ New best score!</span>}
                      {isNewBestRevenue&&<span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-600 text-white">💰 Revenue record!</span>}
                    </div>
                  )}
                </motion.div>
                <div className="flex flex-col gap-1.5 mb-4">
                  {reviewResult.reviewers.map((r,i)=>(
                    <motion.div key={i} initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:0.25+i*0.18}}
                      className="flex items-center gap-3 bg-gray-900 rounded-xl px-3 py-2">
                      <div className={`text-base font-black w-10 text-right flex-shrink-0 ${r.score>=7.5?"text-green-400":r.score>=5.5?"text-amber-400":"text-red-400"}`}>{r.score}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold text-gray-300 truncate">{r.outlet}</div>
                        <div className="text-[10px] text-gray-500 italic">{r.blurb}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.1}}
                  className="bg-gray-900 rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Avg Score</div>
                      <div className={`text-4xl font-black mt-0.5 ${reviewResult.score>=8?"text-green-400":reviewResult.score>=6.5?"text-amber-400":reviewResult.score>=5?"text-orange-400":"text-red-400"}`}>{reviewResult.score}</div>
                      <div className="text-[10px] text-gray-600">/ 10</div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right">
                      <div><div className="text-[9px] text-gray-500 uppercase">Units</div><div className="text-sm font-black text-white">{reviewResult.unitsSold.toLocaleString()}</div></div>
                      <div><div className="text-[9px] text-gray-500 uppercase">Revenue</div><div className="text-sm font-black text-green-400">${reviewResult.revenue.toLocaleString()}</div></div>
                      <div><div className="text-[9px] text-gray-500 uppercase">New Fans</div><div className="text-sm font-black text-violet-400">+{reviewResult.fansGained.toLocaleString()}</div></div>
                      <div><div className="text-[9px] text-gray-500 uppercase">Sales Tail</div><div className="text-sm font-black text-blue-400">{salesTail?.weeksTotal??0}wks</div></div>
                    </div>
                  </div>
                  {project&&project.bugs>5&&<div className="text-[10px] text-red-400 font-bold text-center mb-1">⚠ {Math.floor(project.bugs)} bugs hurt your score</div>}
                  {project&&(project.research??0)>5&&<div className="text-[10px] text-purple-400 font-bold text-center mb-1">🔬 Research gave a score bonus</div>}
                  <div className="text-[10px] text-gray-500 text-center">70% revenue paid now · 30% over {salesTail?.weeksTotal??0} weeks</div>
                  {history.length>=2&&(
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <div className="text-[9px] font-black text-gray-500 uppercase mb-1.5">vs. your best</div>
                      <div className="flex gap-3 text-[10px]">
                        <div>Score: <span className={`font-black ${isNewBestScore?"text-green-400":"text-gray-400"}`}>{reviewResult.score} {isNewBestScore?"↑":"↓"} {prevBest}</span></div>
                        <div>Rev: <span className={`font-black ${isNewBestRevenue?"text-green-400":"text-gray-400"}`}>${reviewResult.revenue.toLocaleString()} {isNewBestRevenue?"↑":"↓"}</span></div>
                      </div>
                    </div>
                  )}
                </motion.div>
                <motion.button initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.3}}
                  onClick={dismissReview} data-testid="button-back"
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black transition-colors active:scale-95">
                  Back to the Garage
                </motion.button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast&&(
          <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} exit={{opacity:0,y:30}}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/90 text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-xl whitespace-nowrap">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
