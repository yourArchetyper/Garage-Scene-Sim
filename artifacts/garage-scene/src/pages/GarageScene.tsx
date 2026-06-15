import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createGameEventBus, type GameEvent, type WeeklySalesPoint } from "../simulation/gameEvents";
import {
  createActiveMarketGame,
  generateScoreRollFrames,
  processActiveMarketGames,
  type ActiveMarketGame,
} from "../simulation/market";
import {
  getDeveloperSprite,
  levelAssets,
  PNG_SCENE_HEIGHT,
  PNG_SCENE_WIDTH,
  type DeveloperSpriteState,
} from "../sceneAssets";

// ── Global window type declarations ──
declare global {
  interface Window {
    printSessionSummary?: () => void;
    resetGame?: () => void;
    runSmokeTest?: () => void;
  }
}

const PLAYTEST_MODE = true;
const DEBUG_HITBOXES = false;

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
    firstGameCompleted: false, secondGameReleased: false,
    beatPreviousScore: false, beatPreviousRevenue: false, usedUpgradeBeforeSecond: false,
  },
  firstComputerClick: null as number | null,
  firstProjectStart: null as number | null,
  firstRelease: null as number | null,
  firstUpgradeBought: null as number | null,
  firstObjectHover: null as number | null,
  firstModalOpen: null as number | null,
  releaseFlowStartedAt: null as number | null,
  reviewsRevealed: 0,
  salesWeeksViewed: 0,
  skippedSales: false,
  autoPlayedSales: false,
  reachedSummary: false,
  menuOpens: 0,
  menuItemClicks: 0,
  contractWorkOpened: 0,
  contractsStarted: 0,
  contractsCompleted: 0,
  gameHistoryOpened: 0,
  panelsOpened: 0,
  actionsUsed: 0,
  bubblesSpawned: 0,
  bestScore: 0,
  bestRevenue: 0,
  totalGamesReleased: 0,
  missedClicksBeforeStart: 0,
  usedDefaultProjectSettings: false,
  formChangedFromDefaults: false,
  // Market trend analytics
  trendsSeen: 0,
  gamesMatchingTrend: 0,
  gamesIgnoringTrend: 0,
  trendMatchedRevenue: [] as number[],
  trendBadgeSeen: false,
  usedTrendAfterSeeing: false,
  // Playtest extras
  gamesStarted: 0,
  newProjectClosedWithoutStart: 0,
  menuOpenedWithNoAction: 0,
  clickedLockedMenuItem: 0,
  releaseFlowAbandoned: 0,
  idleDetected: false,
  firstReleaseReady: null as number | null,
  firstReleaseClicked: null as number | null,
  firstReviewRevealed: null as number | null,
  finalSummaryViewedAt: null as number | null,
  playtestSurvey: { q1: 0, q2: 0, q3: 0, q4: 0, feedback: "" },
  // Release-flow playtest analytics
  watchedReviewsWithoutSkip: false,
  reviewSkipClicked: false,
  reviewFastForwardClicked: false,
  salesWasPaused: false,
  salesSpeedChanged: false,
  watchedFullSalesTail: false,
  releasePayoffCompleted: false,
  releaseToSummaryMs: null as number | null,
  marketGamesEntered: 0,
  marketGamesFinished: 0,
  totalSalesWeeksSimulated: 0,
  watchedAutomaticReviewReveal: false,
  sawLiveSalesFeed: false,
  startedProjectWhileGameSelling: false,
  highestWeeklySales: 0,
  bestTotalRevenue: 0,
  bestUnitsSold: 0,
  liveSalesProducedMoneyFans: false,
};

function track(eventName: string, data: Record<string, unknown> = {}) {
  if (eventName === "point_bubble_spawned") { analytics.bubblesSpawned++; return; }
  analytics.events.push({ event: eventName, timestamp: Date.now(), data });
  type FlagKey = keyof typeof analytics.flags;
  const flagMap: Record<string, FlagKey> = {
    computer_clicked:"clickedComputer", new_project_opened:"openedNewProject",
    project_started:"startedFirstProject", release_ready:"reachedReleaseReady",
    game_released:"releasedFirstGame", review_report_viewed:"viewedReviewReport",
    sales_tick:"earnedMoney", upgrade_bought:"boughtUpgrade",
    second_project_started:"startedSecondProject",
    first_game_completed:"firstGameCompleted", second_game_released:"secondGameReleased",
    beat_previous_score:"beatPreviousScore", beat_previous_revenue:"beatPreviousRevenue",
    upgrade_bonus_used:"usedUpgradeBeforeSecond",
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
type TutorialStep = "start"|"pick"|"develop"|"release"|"upgrade"|"second"|"beat"|"done";

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
  {id:"betterPC",    name:"Faster PC",   cost:350,desc:"+20% tech generation",  nextGame:"Your next game will generate more Tech."},
  {id:"coffeemaker", name:"Coffee Maker",cost:150,desc:"-25% energy loss/week", nextGame:"Your developer loses less energy during work."},
  {id:"books",       name:"Prog. Books", cost:250,desc:"+15% design generation",nextGame:"Your next game will generate more Design."},
  {id:"whiteboard",  name:"Whiteboard",  cost:400,desc:"-20% bug generation",   nextGame:"Your next game should produce fewer bugs."},
] as const;
const REVIEW_OUTLETS = [
  {name:"Byte Magazine",      bias: 0.4},
  {name:"The Arcade Gazette", bias:-0.6},
  {name:"PC Gamer UK",        bias: 0.0},
  {name:"Digital Frontiers",  bias: 0.8},
];

const TREND_POOL: Omit<MarketTrendDef,"startsWeek"|"endsWeek">[] = [
  // Topic trends
  {id:"fantasy_boom",    type:"topic",    target:"Fantasy",        title:"Fantasy Boom",       description:"Fantasy games are flying off shelves this season.",        salesMultiplier:1.25, hypeBonus:2},
  {id:"space_craze",     type:"topic",    target:"Space",          title:"Space Craze",        description:"Players are obsessed with space exploration.",              salesMultiplier:1.20, hypeBonus:1},
  {id:"horror_hype",     type:"topic",    target:"Horror",         title:"Horror Season",      description:"Horror games are all the rage right now.",                 salesMultiplier:1.22, hypeBonus:2},
  {id:"detective_trend", type:"topic",    target:"Detective",      title:"Mystery Mania",      description:"Detective mysteries are trending hard.",                    salesMultiplier:1.18, hypeBonus:1},
  {id:"racing_surge",    type:"topic",    target:"Racing",         title:"Racing Surge",       description:"Speed demons are hungry for racing games.",                 salesMultiplier:1.20, hypeBonus:1},
  // Genre trends
  {id:"sim_trend",       type:"genre",    target:"Simulation",     title:"Simulation Surge",   description:"Simulation games are having a massive moment.",             salesMultiplier:1.20, reviewBonus:0.25},
  {id:"action_craze",    type:"genre",    target:"Action",         title:"Action Craze",       description:"Players want fast-paced action games right now.",           salesMultiplier:1.25, reviewBonus:0.20},
  {id:"rpg_wave",        type:"genre",    target:"RPG",            title:"RPG Wave",           description:"Role-playing games are back in a big way.",                salesMultiplier:1.22, reviewBonus:0.30},
  {id:"adventure_trend", type:"genre",    target:"Adventure",      title:"Adventure Season",   description:"Adventure games are winning hearts this season.",           salesMultiplier:1.18, hypeBonus:1},
  {id:"strategy_boom",   type:"genre",    target:"Strategy",       title:"Strategy Boom",      description:"Strategy enthusiasts are buying everything in sight.",      salesMultiplier:1.20, reviewBonus:0.20},
  // Platform trends
  {id:"arcade_craze",    type:"platform", target:"Arcade Cabinet", title:"Arcade Craze",       description:"Arcades are packed — cabinet games are everywhere.",        salesMultiplier:1.35, reviewBonus:0.30},
  {id:"console_boom",    type:"platform", target:"Early Console",  title:"Console Boom",       description:"Home consoles are the hot new thing this season.",          salesMultiplier:1.30, hypeBonus:2},
  // Combo trends
  {id:"space_action",    type:"combo",    topic:"Space",   genre:"Action",      title:"Space Action is Hot!",  description:"Space Action games are the hottest combo right now.",     salesMultiplier:1.45, reviewBonus:0.40},
  {id:"fantasy_rpg",     type:"combo",    topic:"Fantasy", genre:"RPG",         title:"Fantasy RPG Rush",      description:"Fantasy RPGs are having a golden moment.",               salesMultiplier:1.40, reviewBonus:0.35},
  {id:"horror_action",   type:"combo",    topic:"Horror",  genre:"Action",      title:"Horror Action Wave",    description:"Horror Action mashups are trending everywhere.",          salesMultiplier:1.38, reviewBonus:0.30},
  {id:"detective_adv",   type:"combo",    topic:"Detective",genre:"Adventure",  title:"Detective Adventure",   description:"Mystery adventures are the talk of gaming circles.",      salesMultiplier:1.35, reviewBonus:0.25},
];
const CONTRACT_POOL: ContractDef[] = [
  {name:"Jingle Port",      client:"RadioFX Ltd",      payout:400,  durationWeeks:4,  difficulty:"Easy",   fansBonus:10, icon:"🎵"},
  {name:"Arcade Port",      client:"Pixel Palace",     payout:600,  durationWeeks:5,  difficulty:"Easy",   fansBonus:15, icon:"🕹️"},
  {name:"School Quiz App",  client:"EduSoft Co",       payout:350,  durationWeeks:3,  difficulty:"Easy",   fansBonus:5,  icon:"📚"},
  {name:"Shooter Port",     client:"BulletStorm Inc",  payout:900,  durationWeeks:7,  difficulty:"Medium", fansBonus:25, icon:"🚀"},
  {name:"Business Sim",     client:"CorpSoft Ltd",     payout:800,  durationWeeks:7,  difficulty:"Medium", fansBonus:12, icon:"💼"},
  {name:"Engine Overhaul",  client:"MythOS Studios",   payout:1400, durationWeeks:12, difficulty:"Hard",   fansBonus:40, icon:"⚔️"},
  {name:"Multiplayer Rig",  client:"DevNet Labs",      payout:1100, durationWeeks:10, difficulty:"Hard",   fansBonus:30, icon:"🔗"},
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

function comboLabel(score: number): string {
  if (score >= 1.4) return "Great Match";
  if (score >= 1.1) return "Good Match";
  if (score >= 0.9) return "Weak Match";
  return "Bad Match";
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface MarketTrendDef {
  id: string;
  type: "topic"|"genre"|"platform"|"combo";
  target?: string;
  topic?: Topic;
  genre?: Genre;
  title: string;
  description: string;
  salesMultiplier: number;
  hypeBonus?: number;
  reviewBonus?: number;
  startsWeek: number;
  endsWeek: number;
}
interface TrendEntry { gameName:string;matched:boolean;trendName:string;revenueImpact:number;scoreImpact:number; }

interface Project { name:string;topic:Topic;genre:Genre;platform:Platform;design:number;tech:number;bugs:number;progress:number;research:number;hype:number; }
interface Reviewer { outlet:string;score:number;blurb:string; }
interface ReviewResult { gameName:string;score:number;reviewers:Reviewer[];unitsSold:number;revenue:number;fansGained:number;trendMatched:boolean;trendName:string;trendRevenueBonus:number;trendScoreBonus:number; }
interface SalesTail { gameName:string;score:number;weeksLeft:number;weeksTotal:number;baseRevenue:number;baseFans:number; }
interface SalesWeekData { week:number;units:number;revenue:number;fans:number; }
interface ReleaseFlowState {
  phase:"reviews"|"reaction"|"sales"|"summary";
  gameId:string;
  marketGame:ActiveMarketGame;
  reviewIndex:number;
  reviewSubPhase:"entering"|"rolling"|"settled";
  salesWeeks:SalesWeekData[];
  salesIndex:number;
  runningRevenue:number;
  runningFans:number;
  runningUnits:number;
  salesSpeed:1|2;
  salesPaused:boolean;
  skippedSales:boolean;
  skippedReviews:boolean;
  reviewPhaseStartAt:number;
}
interface Bubble { id:number;text:string;color:string;svgX:number;svgY:number;born:number; }
interface ReleasedGame { id:string;name:string;score:number;reviewScores:number[];revenue:number;fansGained:number;unitsSold:number;bugs:number;year:number;week:number;topic:Topic;genre:Genre;platform:Platform;status:"reviewing"|"active_on_market"|"finished";weeklySales:WeeklySalesPoint[];diagnosis:DiagFactor[]; }
interface DiscoveredCombo { topic:Topic;genre:Genre;platform:Platform;score:number;label:string; }
interface DiagFactor { icon:string;text:string;sentiment:"pos"|"neu"|"neg"; }
interface NextTarget { text:string;type:string; }
interface ContractDef { name:string;client:string;payout:number;durationWeeks:number;difficulty:"Easy"|"Medium"|"Hard";fansBonus:number;icon:string; }
interface ActiveContract { job:ContractDef;weeksLeft:number;weeksTotal:number; }
interface StudioMenuItem { icon:string;label:string;action:string;disabled?:boolean;sub?:string; }
interface SalesLogRow { id:string;gameId:string;text:string;week:number;highlight:boolean; }

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
// SECTION: HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function trendMatchesProject(project:Project, trend:MarketTrendDef): boolean {
  if(trend.type==="topic")    return project.topic === trend.target;
  if(trend.type==="genre")    return project.genre === trend.target;
  if(trend.type==="platform") return project.platform === trend.target;
  if(trend.type==="combo")    return project.topic === trend.topic && project.genre === trend.genre;
  return false;
}

function trendMatchesForm(topic:Topic, genre:Genre, platform:Platform, trend:MarketTrendDef|null): boolean {
  if(!trend) return false;
  if(trend.type==="topic")    return topic === trend.target;
  if(trend.type==="genre")    return genre === trend.target;
  if(trend.type==="platform") return platform === trend.target;
  if(trend.type==="combo")    return topic === trend.topic && genre === trend.genre;
  return false;
}

function generateReview(project:Project, upgrades:Set<string>, trend:MarketTrendDef|null=null): ReviewResult {
  const tm=TOPIC_MOD[project.topic], gm=GENRE_MOD[project.genre], pm=PLATFORM_MOD[project.platform];
  const combo=COMBO[project.genre]?.[project.topic]??1.0;
  const bugs=upgrades.has("whiteboard")?project.bugs*0.8:project.bugs;
  const design=project.design*gm.dw*tm.d*(upgrades.has("books")?1.15:1.0);
  const tech=project.tech*gm.tw*tm.t*(upgrades.has("betterPC")?1.2:1.0);
  const bugPen=1/(1+bugs*0.07*gm.bugSens);
  const resMod=1+(project.research??0)*0.004;
  const hypeMod=1+(project.hype??0)*0.005;
  const raw=((design+tech)/2)*bugPen*combo*pm.fans/14*resMod*hypeMod;

  // Market trend bonuses
  const matched = trend ? trendMatchesProject(project, trend) : false;
  const trendScoreBonus = (matched && trend?.reviewBonus) ? trend.reviewBonus : 0;
  const trendSalesMultiplier = (matched && trend) ? trend.salesMultiplier : 1.0;

  const score=Math.max(1.0,Math.min(10.0,raw));
  const scorePlusTrend=Math.max(1.0,Math.min(10.0,score+trendScoreBonus));
  const rounded=Math.round(scorePlusTrend*10)/10;

  const reviewers:Reviewer[]=REVIEW_OUTLETS.map(o=>{
    const rv=Math.max(1,Math.min(10,rounded+o.bias+(Math.random()-0.5)*1.2));
    const rs=Math.round(rv*10)/10;
    const blurbSet=rs>=7?REVIEW_BLURBS.high:rs>=5?REVIEW_BLURBS.mid:REVIEW_BLURBS.low;
    return{outlet:o.name,score:rs,blurb:blurbSet[~~(Math.random()*blurbSet.length)]};
  });
  const baseSales=Math.floor((rounded*65+Math.random()*55)*pm.sales);
  const baseRevenue=Math.floor(baseSales*(4+rounded*2));
  const trendedRevenue=Math.floor(baseRevenue*trendSalesMultiplier);
  const trendRevenueBonus=trendedRevenue-baseRevenue;
  const fansGained=Math.floor((rounded*26+Math.random()*16)*pm.fans);
  return{gameName:project.name,score:rounded,reviewers,unitsSold:baseSales,revenue:trendedRevenue,fansGained,
    trendMatched:matched,trendName:trend?.title??"",trendRevenueBonus,trendScoreBonus};
}

function buildDiagnosis(project:Project, result:ReviewResult, upgrades:Set<string>): DiagFactor[] {
  const factors: DiagFactor[] = [];
  const combo = COMBO[project.genre]?.[project.topic] ?? 1.0;
  const effectiveBugs = upgrades.has("whiteboard") ? project.bugs*0.8 : project.bugs;
  const pm = PLATFORM_MOD[project.platform];
  const gm = GENRE_MOD[project.genre];
  const designAdj = project.design * gm.dw;
  const techAdj   = project.tech  * gm.tw;

  // Combo quality
  if (combo >= 1.4)      factors.push({icon:"✓",text:`Strong combo: ${project.topic} + ${project.genre} work great together`,sentiment:"pos"});
  else if (combo <= 0.8) factors.push({icon:"✗",text:`Weak combo: ${project.topic} and ${project.genre} clash — try different genres`,sentiment:"neg"});
  else                   factors.push({icon:"○",text:`Decent combo: ${project.topic} + ${project.genre} is fine but not ideal`,sentiment:"neu"});

  // Bugs
  if (effectiveBugs > 15)     factors.push({icon:"🐛",text:`${Math.floor(effectiveBugs)} bugs hurt the score badly — use Fix Bugs or get a Whiteboard`,sentiment:"neg"});
  else if (effectiveBugs > 5) factors.push({icon:"🐛",text:`${Math.floor(effectiveBugs)} bugs pulled reviews down a little`,sentiment:"neg"});
  else                        factors.push({icon:"✓",text:"Clean release — bugs were well managed",sentiment:"pos"});

  // Platform tech requirement
  if (pm.techReq > 0 && project.tech < pm.techReq) {
    factors.push({icon:"⚠",text:`Tech too low for ${project.platform} (needed ${pm.techReq}+, had ${Math.floor(project.tech)}) — hurt sales`,sentiment:"neg"});
  } else if (pm.techReq > 0) {
    factors.push({icon:"✓",text:`Met tech requirements for ${project.platform}`,sentiment:"pos"});
  }

  // Design/Tech balance
  const totalPoints = designAdj + techAdj;
  if (totalPoints > 0) {
    const dRatio = designAdj / totalPoints;
    if (dRatio > 0.72)      factors.push({icon:"⚠",text:"Very design-heavy — spending more time on Tech would help balance",sentiment:"neg"});
    else if (dRatio < 0.28) factors.push({icon:"⚠",text:"Very tech-heavy — spending more time on Design would help balance",sentiment:"neg"});
    else                    factors.push({icon:"✓",text:"Good balance between Design and Tech points",sentiment:"pos"});
  }

  // Research
  if ((project.research??0) >= 10) factors.push({icon:"🔬",text:`Research bonus boosted quality (${Math.floor(project.research)} research pts)`,sentiment:"pos"});

  // Market trend
  if (result.trendMatched) {
    factors.push({icon:"📈",text:`Matched current market trend — "${result.trendName}"`,sentiment:"pos"});
  }

  // Score context
  if (result.score >= 8)      factors.push({icon:"⭐",text:"Outstanding quality — players loved it",sentiment:"pos"});
  else if (result.score < 4)  factors.push({icon:"↓",text:"Low score — a stronger combo and fewer bugs can turn this around",sentiment:"neg"});

  return factors.slice(0, 6);
}

function buildNextTarget(result:ReviewResult, history:ReleasedGame[], fans:number): NextTarget {
  const targets: NextTarget[] = [
    {text:`Beat score ${result.score}`,type:"score"},
    {text:`Earn more than $${result.revenue.toLocaleString()}`,type:"revenue"},
  ];
  if (result.score < 7)   targets.push({text:"Release with fewer than 5 bugs",type:"bugs"});
  if (fans < 100)         targets.push({text:"Reach 100 fans",type:"fans"});
  if (history.length >= 2)targets.push({text:`Earn $${(Math.ceil((Math.max(...history.map(g=>g.revenue))*1.5)/100)*100).toLocaleString()} total revenue`,type:"totalrev"});
  // Pick a varied target — not always score
  const idx = history.length % targets.length;
  return targets[idx];
}

function scoreRecommendation(score:number): {text:string;color:string} {
  if (score >= 7.5) return {text:"Strong release. Try beating this score with a bigger platform or fewer bugs.",color:"text-green-400"};
  if (score >= 5)   return {text:"Good start. Improve balance and reduce bugs to score higher next time.",color:"text-amber-400"};
  return {text:"Try a stronger topic/genre combo and fix bugs before releasing next time.",color:"text-red-400"};
}

function generateSalesWeeks(result:ReviewResult): SalesWeekData[] {
  const numWeeks = result.score>=8.5?8:result.score>=7?6:result.score>=5?4:3;
  const weights:number[] = [];
  let w = 1.0;
  for(let i=0;i<numWeeks;i++){
    weights.push(w*(0.85+Math.random()*0.3));
    w *= 0.56+Math.random()*0.12;
  }
  const total = weights.reduce((a,b)=>a+b,0);
  return weights.map((wt,i)=>({
    week:i+1,
    revenue:Math.max(10,Math.round(result.revenue*wt/total)),
    fans:Math.max(0,Math.round(result.fansGained*wt/total)),
    units:Math.max(1,Math.round(result.unitsSold*wt/total)),
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function GarageScene() {

  // ── Core state ──
  const [week,setWeek]           = useState(1);
  const [year,setYear]           = useState(1);
  const [cash,setCash]           = useState(2000);
  const [fans,setFans]           = useState(0);
  const [energy,setEnergy]       = useState(100);
  const [phase,setPhase]         = useState<Phase>("idle");
  const [project,setProject]     = useState<Project|null>(null);
  const [focusMode,setFocusMode] = useState<FocusMode>(null);
  const [upgrades,setUpgrades]   = useState<Set<string>>(new Set());
  const [history,setHistory]     = useState<ReleasedGame[]>([]);
  const [salesTail,setSalesTail] = useState<SalesTail|null>(null);
  const [activeMarketGames,setActiveMarketGames] = useState<ActiveMarketGame[]>([]);
  const [salesLogRows,setSalesLogRows] = useState<SalesLogRow[]>([]);
  const [bubbles,setBubbles]     = useState<Bubble[]>([]);
  const [reviewResult,setReviewResult] = useState<ReviewResult|null>(null);
  const [diagnosis,setDiagnosis] = useState<DiagFactor[]>([]);
  const [nextTarget,setNextTarget] = useState<NextTarget|null>(null);
  const [discoveredCombos,setDiscoveredCombos] = useState<DiscoveredCombo[]>([]);
  const [lastBuyMessage,setLastBuyMessage] = useState<string|null>(null);
  const [toast,setToast]         = useState<string|null>(null);
  const [celebrating,setCelebrating] = useState(false);

  // ── Market trend state ──
  const [currentTrend,setCurrentTrend] = useState<MarketTrendDef|null>(null);
  const [trendHistory,setTrendHistory] = useState<TrendEntry[]>([]);

  // ── UI panels ──
  const [showNewGame,setShowNewGame]   = useState(false);
  const [showComputer,setShowComputer] = useState(false);
  const [showShop,setShowShop]         = useState(false);
  const [showHistory,setShowHistory]   = useState(false);

  // ── Affordance state ──
  const [hoveredObject,setHoveredObject] = useState<string|null>(null);
  const [clickRipple,setClickRipple]     = useState<{id:number;x:number;y:number;color:string}|null>(null);
  const [missedClicks,setMissedClicks]   = useState(0);
  const missedClicksRef = useRef(0);

  // ── Studio menu state ──
  const [studioMenu,setStudioMenu]       = useState<{x:number;y:number}|null>(null);
  const [menuSelectedIdx,setMenuSelectedIdx] = useState(0);
  const [showContractWork,setShowContractWork] = useState(false);
  const [contractJobs,setContractJobs]   = useState<ContractDef[]>([]);
  const [activeContract,setActiveContract] = useState<ActiveContract|null>(null);
  const activeContractRef = useRef<ActiveContract|null>(null);
  activeContractRef.current = activeContract;

  // ── Release flow state ──
  const [releaseFlow,setReleaseFlow]   = useState<ReleaseFlowState|null>(null);
  const [showDiagnosis,setShowDiagnosis] = useState(false);
  const releaseFlowRef = useRef<ReleaseFlowState|null>(null);
  const reviewResultRef = useRef<ReviewResult|null>(null);
  const autoPlayIntervalRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const gameEventBusRef = useRef(createGameEventBus());
  const activeMarketGamesRef = useRef<ActiveMarketGame[]>([]);
  const historyRef = useRef<ReleasedGame[]>([]);
  const salesMilestonesRef = useRef<Record<string, Set<string>>>({});
  releaseFlowRef.current = releaseFlow;
  reviewResultRef.current = reviewResult;
  activeMarketGamesRef.current = activeMarketGames;
  historyRef.current = history;

  // ── Form ──
  const [formName,setFormName]         = useState(makeTitle);
  const [formTopic,setFormTopic]       = useState<Topic>("Fantasy");
  const [formGenre,setFormGenre]       = useState<Genre>("RPG");
  const [formPlatform,setFormPlatform] = useState<Platform>("Home Computer");

  // ── Tutorial / objectives ──
  const [tutorialStep,setTutorialStep] = useState<TutorialStep>("start");
  const [pillDismissed,setPillDismissed] = useState(false);
  const [actionBurst,setActionBurst]   = useState<{type:string;key:number}|null>(null);

  // ── Playtest state ──
  const [showPlaytestSummary,setShowPlaytestSummary] = useState(false);
  const [surveyAnswers,setSurveyAnswers] = useState({q1:0,q2:0,q3:0,q4:0,feedback:""});
  // ── Release cinematic state ──
  const [reviewDisplayScore,setReviewDisplayScore] = useState(0);
  const [typingFrame,setTypingFrame] = useState(0);
  const scoreRollIntervalRef = useRef<ReturnType<typeof setInterval>|null>(null);

  // ── Refs ──
  const phaseRef     = useRef(phase);
  const upgradesRef  = useRef(upgrades);
  const focusRef     = useRef(focusMode);
  const salesRef     = useRef(salesTail);
  const weekRef      = useRef(week);
  const yearRef      = useRef(year);
  const fansRef      = useRef(fans);
  const projectRef   = useRef(project);
  const weeksSinceEvent = useRef(0);
  const releaseReadyFired = useRef(false);
  // Confusion signal tracking refs
  const menuActionTakenRef = useRef(false);
  const newGameProjectStartedRef = useRef(false);
  // Market trend refs
  const currentTrendRef  = useRef<MarketTrendDef|null>(null);
  const nextTrendWeekRef = useRef(16); // first trend around week 16
  const totalWeeksRef    = useRef(0);
  phaseRef.current      = phase;
  upgradesRef.current   = upgrades;
  focusRef.current      = focusMode;
  salesRef.current      = salesTail;
  weekRef.current       = week;
  yearRef.current       = year;
  fansRef.current       = fans;
  projectRef.current    = project;
  currentTrendRef.current = currentTrend;

  // ── ISO anchors (1100 × 800 coordinate space, level1_garage_base_clean.png) ──
  // percentages from spec × scene dims: computer@73%,44% shelf@15%,43% char@69%,46%
  const charHead     = {x:759, y:368};
  const monitorPos   = {x:814, y:328};
  const bookshelfPos = {x:165, y:344};
  const deskTop      = {x:803, y:376};
  const computerPos  = {x:803, y:352};

  // ── Bubble spawner ──
  const spawnBubble = useCallback((text:string,color:string,svgX:number,svgY:number)=>{
    const ox = (Math.random()-0.5)*30;
    const oy = (Math.random()-0.5)*10;
    setBubbles(prev=>[
      ...prev.filter(b=>Date.now()-b.born<2000),
      {id:Date.now()+Math.random(),text,color,svgX:svgX+ox,svgY:svgY+oy,born:Date.now()}
    ]);
    track("point_bubble_spawned",{text});
  },[]);

  function updateHistoryFromMarketGame(game: ActiveMarketGame) {
    setHistory(prev=>prev.map(g=>g.id===game.id?{
      ...g,
      revenue: game.totalRevenue,
      fansGained: game.totalFansGained,
      unitsSold: game.totalUnits,
      status: game.status,
      weeklySales: game.weeklySales,
    }:g));
  }

  function trackSalesMilestone(game: ActiveMarketGame) {
    const seen = salesMilestonesRef.current[game.id] ?? new Set<string>();
    salesMilestonesRef.current[game.id] = seen;
    const milestones: {key:string;hit:boolean;text:string}[] = [
      {key:"units_1000", hit:game.totalUnits>=1000, text:`${game.title} crossed 1,000 units sold`},
      {key:"revenue_10000", hit:game.totalRevenue>=10000, text:`${game.title} passed $10,000 revenue`},
      {key:"breakout", hit:game.reviewScore>=8.5&&game.totalUnits>=750, text:`Breakout hit: ${game.title} is still selling`},
    ];
    for(const milestone of milestones){
      if(!milestone.hit||seen.has(milestone.key)) continue;
      seen.add(milestone.key);
      track("sales_milestone_reached",{gameId:game.id,milestone:milestone.key,totalUnits:game.totalUnits,totalRevenue:game.totalRevenue});
      setToast(milestone.text);
      setTimeout(()=>setToast(null),4200);
    }
  }

  useEffect(()=>{
    const bus = gameEventBusRef.current;
    const unsubUpdated = bus.subscribeGameEvent("sales_updated",(event)=>{
      const game = activeMarketGamesRef.current.find(g=>g.id===event.gameId);
      if(!game) return;
      const point = event.payload;
      analytics.salesWeeksViewed++;
      analytics.totalSalesWeeksSimulated++;
      analytics.sawLiveSalesFeed = true;
      analytics.liveSalesProducedMoneyFans = analytics.liveSalesProducedMoneyFans || point.revenue>0 || point.fans>0;
      analytics.highestWeeklySales = Math.max(analytics.highestWeeklySales, point.units);
      analytics.bestTotalRevenue = Math.max(analytics.bestTotalRevenue, game.totalRevenue);
      analytics.bestUnitsSold = Math.max(analytics.bestUnitsSold, game.totalUnits);
      track("sales_updated",{gameId:event.gameId,week:point.week,units:point.units,revenue:point.revenue,fans:point.fans});
      track("sales_feed_row_added",{gameId:event.gameId,week:point.week});
      track("sales_chart_bar_added",{gameId:event.gameId,week:point.week,units:point.units});
      setSalesLogRows(prev=>[
        ...prev.slice(-6),
        {
          id:`${event.gameId}-${point.week}-${Date.now()}`,
          gameId:event.gameId,
          week:point.week,
          highlight:true,
          text:`Week ${point.week} · ${game.title} · ${point.units.toLocaleString()} units · $${point.revenue.toLocaleString()} · +${point.fans} fans`,
        },
      ]);
      spawnBubble(`$${point.revenue.toLocaleString()}`,"#22c55e",deskTop.x,deskTop.y-20);
      if(point.fans>0) spawnBubble(`+${point.fans} fans`,"#a855f7",charHead.x,charHead.y-22);
      updateHistoryFromMarketGame(game);
      trackSalesMilestone(game);
    });
    const unsubFinished = bus.subscribeGameEvent("sales_finished",(event)=>{
      const game = activeMarketGamesRef.current.find(g=>g.id===event.gameId);
      if(!game) return;
      analytics.marketGamesFinished++;
      analytics.watchedFullSalesTail = true;
      analytics.reachedSummary = true;
      analytics.bestRevenue = Math.max(analytics.bestRevenue, game.totalRevenue);
      analytics.bestTotalRevenue = Math.max(analytics.bestTotalRevenue, game.totalRevenue);
      analytics.bestUnitsSold = Math.max(analytics.bestUnitsSold, game.totalUnits);
      if(game.marketTrendMultiplier&&game.marketTrendMultiplier>1){
        analytics.trendMatchedRevenue.push(game.totalRevenue);
      }
      const previousFinished = historyRef.current.filter(g=>g.id!==game.id&&g.status==="finished");
      if(previousFinished.length>0){
        const prevBestRevenue = Math.max(...previousFinished.map(g=>g.revenue));
        if(game.totalRevenue>prevBestRevenue) track("beat_previous_revenue",{revenue:game.totalRevenue,prev:prevBestRevenue});
      }
      track("sales_finished",{gameId:event.gameId,totalRevenue:game.totalRevenue,totalUnits:game.totalUnits,fans:game.totalFansGained});
      updateHistoryFromMarketGame(game);
      setToast(`${game.title} finished its market run: $${game.totalRevenue.toLocaleString()} revenue · ${game.totalFansGained.toLocaleString()} fans`);
      setTimeout(()=>setToast(null),5200);
    });
    return ()=>{
      unsubUpdated();
      unsubFinished();
    };
  },[spawnBubble]);

  // ── Window helpers ──
  useEffect(()=>{
    track("session_start",{});
    window.printSessionSummary = ()=>{
      try {
        const elapsed = (Date.now()-analytics.sessionStartedAt)/1000;
        const t0 = analytics.sessionStartedAt;
        const rel = (ts:number|null)=>ts?((ts-t0)/1000).toFixed(1)+"s":"never";
        console.group("[Session Summary]");
        console.log(`Time played: ${elapsed.toFixed(0)}s`);
        console.log("Funnel flags:", {...analytics.flags});
        console.group("[Progression]");
        console.log(`First project started: ${analytics.flags.startedFirstProject}`);
        console.log(`First game released: ${analytics.flags.releasedFirstGame}`);
        console.log(`Second project started: ${analytics.flags.startedSecondProject}`);
        console.log(`Second game released: ${analytics.flags.secondGameReleased}`);
        console.log(`Beat previous score: ${analytics.flags.beatPreviousScore}`);
        console.log(`Beat previous revenue: ${analytics.flags.beatPreviousRevenue}`);
        console.log(`Bought upgrade before second game: ${analytics.flags.usedUpgradeBeforeSecond}`);
        console.log(`Best score: ${analytics.bestScore}`);
        console.log(`Best revenue: $${analytics.bestRevenue.toLocaleString()}`);
        console.log(`Total games released: ${analytics.totalGamesReleased}`);
        console.groupEnd();
        console.group("[Global Menu]");
        console.log(`Menu opened: ${analytics.menuOpens} times`);
        console.log(`Menu item clicks: ${analytics.menuItemClicks}`);
        console.groupEnd();
        console.group("[Contract Work]");
        console.log(`Contract work panel opened: ${analytics.contractWorkOpened}`);
        console.log(`Contracts started: ${analytics.contractsStarted}`);
        console.log(`Contracts completed: ${analytics.contractsCompleted}`);
        console.groupEnd();
        console.group("[Game History]");
        console.log(`History panel opened: ${analytics.gameHistoryOpened}`);
        console.groupEnd();
        console.group("[Affordance Timing]");
        console.log(`Time to first object hover: ${rel(analytics.firstObjectHover)}`);
        console.log(`Time to first computer click: ${rel(analytics.firstComputerClick)}`);
        console.log(`Time to new project panel: ${rel(analytics.firstModalOpen)}`);
        console.log(`Time to first project start: ${rel(analytics.firstProjectStart)}`);
        console.log(`Missed clicks before first project: ${analytics.missedClicksBeforeStart}`);
        console.log(`Used default project settings: ${analytics.usedDefaultProjectSettings}`);
        console.log(`Changed form from defaults: ${analytics.formChangedFromDefaults}`);
        console.groupEnd();
        console.group("[Release Flow]");
        console.log(`Did player finish release flow: ${analytics.reachedSummary}`);
        console.log(`Release flow started at: ${rel(analytics.releaseFlowStartedAt)}`);
        console.log(`Reviews revealed: ${analytics.reviewsRevealed}`);
        console.log(`Sales weeks viewed: ${analytics.salesWeeksViewed}`);
        console.log(`Skipped sales: ${analytics.skippedSales}`);
        console.log(`Auto-played sales: ${analytics.autoPlayedSales}`);
        console.log(`Games entered market: ${analytics.marketGamesEntered}`);
        console.log(`Games finished sales tail: ${analytics.marketGamesFinished}`);
        console.log(`Total sales weeks simulated: ${analytics.totalSalesWeeksSimulated}`);
        console.log(`Watched automatic review reveal: ${analytics.watchedAutomaticReviewReveal}`);
        console.log(`Saw live sales feed: ${analytics.sawLiveSalesFeed}`);
        console.log(`Started project while game selling: ${analytics.startedProjectWhileGameSelling}`);
        console.log(`Highest weekly sales: ${analytics.highestWeeklySales.toLocaleString()} units`);
        console.log(`Best total revenue: $${analytics.bestTotalRevenue.toLocaleString()}`);
        console.log(`Best units sold: ${analytics.bestUnitsSold.toLocaleString()}`);
        console.groupEnd();
        console.group("[Market Trends]");
        console.log(`Trends seen this session: ${analytics.trendsSeen}`);
        console.log(`Games matching a trend: ${analytics.gamesMatchingTrend}`);
        console.log(`Games ignoring a trend: ${analytics.gamesIgnoringTrend}`);
        const avgTrendRev = analytics.trendMatchedRevenue.length>0
          ? Math.round(analytics.trendMatchedRevenue.reduce((a,b)=>a+b,0)/analytics.trendMatchedRevenue.length)
          : 0;
        console.log(`Avg revenue of trend-matched games: $${avgTrendRev.toLocaleString()}`);
        console.log(`Player used trend after seeing it: ${analytics.usedTrendAfterSeeing}`);
        console.log(`Trend badge seen: ${analytics.trendBadgeSeen}`);
        console.groupEnd();
        console.log(`Panels opened: ${analytics.panelsOpened}  Actions used: ${analytics.actionsUsed}  Bubbles spawned: ${analytics.bubblesSpawned}`);
        console.groupEnd();
      } catch(e) {
        console.error("[printSessionSummary] failed:", e);
      }
    };
    window.resetGame = ()=>window.location.reload();
    window.runSmokeTest = ()=>{
      console.group("[runSmokeTest]");
      const checks: {label:string;ok:boolean;detail?:string}[] = [];
      checks.push({label:"window.printSessionSummary exists", ok: typeof window.printSessionSummary==="function"});
      checks.push({label:"window.resetGame exists",           ok: typeof window.resetGame==="function"});
      checks.push({label:"analytics object valid",            ok: typeof analytics==="object" && typeof analytics.flags==="object"});
      checks.push({label:"analytics.flags has required keys", ok: "startedFirstProject" in analytics.flags && "releasedFirstGame" in analytics.flags});
      checks.push({label:"analytics.menuOpens is number",     ok: typeof analytics.menuOpens==="number"});
      checks.push({label:"analytics.contractsStarted is num", ok: typeof analytics.contractsStarted==="number"});
      const phaseEl = document.querySelector("[data-panel='release-flow']");
      const menuEl  = document.querySelector("[data-panel='studio-menu']");
      const newGameEl = document.querySelector("[data-panel='newgame']");
      checks.push({label:"No conflicting open panels (release+menu)", ok: !(phaseEl && menuEl), detail: phaseEl&&menuEl?"release flow and studio menu both open":"ok"});
      checks.push({label:"No conflicting open panels (release+newgame)", ok: !(phaseEl && newGameEl), detail: phaseEl&&newGameEl?"release flow and new game both open":"ok"});
      let passed = 0;
      for(const c of checks){
        if(c.ok){ console.log(`✓ ${c.label}`); passed++; }
        else     { console.warn(`✗ ${c.label}${c.detail?" — "+c.detail:""}`); }
      }
      console.log(`Result: ${passed}/${checks.length} checks passed`);
      console.groupEnd();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // ── Idle detection (60s with no project started) ──
  useEffect(()=>{
    const id = setTimeout(()=>{
      if(!analytics.flags.startedFirstProject){
        analytics.idleDetected = true;
        track("idle_60_seconds_no_project",{elapsed:60});
      }
    },60000);
    return ()=>clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{
    const id = setInterval(()=>setTypingFrame(frame=>frame+1),420);
    return ()=>clearInterval(id);
  },[]);

  // ── New project closed without starting ──
  useEffect(()=>{
    if(showNewGame){
      newGameProjectStartedRef.current = false;
    } else if(analytics.flags.clickedComputer){
      if(!newGameProjectStartedRef.current){
        analytics.newProjectClosedWithoutStart++;
        track("opened_new_project_then_closed",{count:analytics.newProjectClosedWithoutStart});
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[showNewGame]);

  // ── Menu opened with no action ──
  useEffect(()=>{
    if(!studioMenu) return;
    menuActionTakenRef.current = false;
    return ()=>{
      if(!menuActionTakenRef.current){
        analytics.menuOpenedWithNoAction++;
        track("opened_menu_but_no_action",{count:analytics.menuOpenedWithNoAction});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[studioMenu]);

  // ── Release-ready effect (fires exactly once per project) ──
  useEffect(()=>{
    if(project?.progress!==undefined&&project.progress>=100&&!releaseReadyFired.current){
      releaseReadyFired.current = true;
      if(!analytics.firstReleaseReady) analytics.firstReleaseReady = Date.now();
      setCelebrating(true);
      track("release_ready",{});
      track("release_ready_visual_shown",{});
      if(tutorialStep==="develop") setTutorialStep("release");
      spawnBubble("🚀 Ready!","#22c55e",computerPos.x,computerPos.y-30);
      setTimeout(()=>setCelebrating(false),3000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[project?.progress]);

  // ── Enter key starts project when new game panel is open ──
  useEffect(()=>{
    if(!showNewGame) return;
    function onKey(e:KeyboardEvent){
      if(e.key==="Enter"&&!e.isComposing){
        e.preventDefault();
        startProject();
      }
    }
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[showNewGame,formName,formTopic,formGenre,formPlatform]);

  // ── Studio menu keyboard navigation ──
  useEffect(()=>{
    if(!studioMenu) return;
    function onKey(e:KeyboardEvent){
      if(e.isComposing) return;
      const items=menuItemsRef.current;
      if(e.key==="Escape"){ setStudioMenu(null); return; }
      if(e.key==="ArrowDown"){ e.preventDefault(); setMenuSelectedIdx(i=>(i+1)%items.length); }
      if(e.key==="ArrowUp"){ e.preventDefault(); setMenuSelectedIdx(i=>(i-1+items.length)%items.length); }
      if(e.key==="Enter"){
        e.preventDefault();
        const item=items[menuSelectedIdx];
        if(item&&!item.disabled) handleMenuAction(item.action);
      }
    }
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[studioMenu,menuSelectedIdx]);

  // ── Release flow: reaction phase auto-advance after 3 s ──
  useEffect(()=>{
    if(!releaseFlow||releaseFlow.phase!=="reaction") return;
    const id = setTimeout(()=>{
      if(releaseFlowRef.current?.phase==="reaction") handleStartSalesPhase();
    },3000);
    return ()=>clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[releaseFlow?.phase]);

  // ── Release flow: auto-advance reviews ──
  useEffect(()=>{
    if(!releaseFlow||releaseFlow.phase!=="reviews") return;
    const sub=releaseFlow.reviewSubPhase;
    const idx=releaseFlow.reviewIndex;
    const delay=sub==="entering"?500:sub==="rolling"?1450:idx>=4?2200:950;
    const id=setTimeout(()=>{
      const cur=releaseFlowRef.current;
      if(!cur||cur.phase!=="reviews"||cur.reviewSubPhase!==sub||cur.reviewIndex!==idx) return;
      if(sub==="entering"){
        setReleaseFlow(f=>f?{...f,reviewSubPhase:"rolling"}:f);
      } else if(sub==="rolling"){
        const finalScore=idx>=4?(reviewResultRef.current?.score??5):(reviewResultRef.current?.reviewers[idx]?.score??5);
        setReviewDisplayScore(finalScore);
        track("review_score_final_landed",{gameId:cur.gameId,index:idx,score:finalScore});
        setReleaseFlow(f=>f?{...f,reviewSubPhase:"settled"}:f);
      } else {
        if(idx>=4){
          if(!cur.skippedReviews) analytics.watchedReviewsWithoutSkip=true;
          analytics.watchedAutomaticReviewReveal=true;
          const score=reviewResultRef.current?.score??0;
          if(score>=7) setCelebrating(true);
          track("all_reviews_revealed",{avgScore:score});
          track("review_sequence_finished",{gameId:cur.gameId,avgScore:score});
          gameEventBusRef.current.emitGameEvent({type:"review_sequence_finished",gameId:cur.gameId});
          setReleaseFlow(f=>f?{...f,phase:"reaction"}:f);
        } else {
          const nextIdx=idx+1;
          if(analytics.reviewsRevealed===0) analytics.firstReviewRevealed=Date.now();
          analytics.reviewsRevealed++;
          const reviewer = reviewResultRef.current?.reviewers[idx];
          if(reviewer) gameEventBusRef.current.emitGameEvent({type:"review_revealed",gameId:cur.gameId,outlet:reviewer.outlet,score:reviewer.score});
          track("review_revealed",{gameId:cur.gameId,index:idx,outlet:reviewer?.outlet,score:reviewer?.score});
          if(nextIdx>=4){
            track("review_average_revealed",{avg:reviewResultRef.current?.score});
            setReleaseFlow(f=>f?{...f,reviewIndex:4,reviewSubPhase:"entering"}:f);
          } else {
            setReleaseFlow(f=>f?{...f,reviewIndex:nextIdx,reviewSubPhase:"entering"}:f);
          }
        }
      }
    },delay);
    return ()=>clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[releaseFlow?.reviewSubPhase,releaseFlow?.reviewIndex,releaseFlow?.phase]);

  // ── Release flow: score roll animation ──
  useEffect(()=>{
    if(!releaseFlow||releaseFlow.phase!=="reviews"||releaseFlow.reviewSubPhase!=="rolling"){
      if(scoreRollIntervalRef.current){clearInterval(scoreRollIntervalRef.current);scoreRollIntervalRef.current=null;}
      return;
    }
    const idx=releaseFlow.reviewIndex;
    const target=idx>=4?(reviewResultRef.current?.score??5):(reviewResultRef.current?.reviewers[idx]?.score??5);
    const frames=generateScoreRollFrames(target);
    let frameIndex=0;
    track("review_score_roll_started",{gameId:releaseFlow.gameId,index:idx,target});
    setReviewDisplayScore(frames[0]??target);
    const id=setInterval(()=>{
      frameIndex+=1;
      const next=frames[frameIndex]??target;
      setReviewDisplayScore(next);
      if(frameIndex>=frames.length-1){clearInterval(id);scoreRollIntervalRef.current=null;}
    },220);
    scoreRollIntervalRef.current=id;
    return ()=>{clearInterval(id);scoreRollIntervalRef.current=null;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[releaseFlow?.reviewSubPhase,releaseFlow?.reviewIndex]);

  // ── Release flow: auto-run sales ──
  useEffect(()=>{
    if(!releaseFlow||releaseFlow.phase!=="sales"||releaseFlow.salesPaused) return;
    const ms=releaseFlow.salesSpeed===2?650:1250;
    const id=setInterval(()=>{
      const flow=releaseFlowRef.current;
      if(!flow||flow.phase!=="sales"||flow.salesPaused){clearInterval(id);return;}
      if(flow.salesIndex>=flow.salesWeeks.length){clearInterval(id);return;}
      handleNextSalesWeek();
    },ms);
    return ()=>clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[releaseFlow?.salesPaused,releaseFlow?.salesSpeed,releaseFlow?.phase]);

  // Release reviews are intentionally automatic; no click-through or shortcut path.

  // ── Main simulation tick ──
  useEffect(()=>{
    const id = setInterval(()=>{
      setWeek(w=>{const n=w+1;if(n>52){setYear(y=>y+1);return 1;}return n;});
      weeksSinceEvent.current += 1;

      const ph = phaseRef.current;
      const up = upgradesRef.current;
      const fm = focusRef.current;

      // Energy
      if(ph==="developing"){
        if(fm==="rest"){
          setEnergy(e=>Math.min(100,e+12));
          spawnBubble("Energy +12","#10b981",charHead.x,charHead.y-15);
        } else {
          const drain = fm==="crunch"?8:fm==="fixBugs"?2:3;
          const mod   = up.has("coffeemaker")?0.75:1.0;
          setEnergy(e=>Math.max(0,e-drain*mod));
        }
      } else {
        setEnergy(e=>Math.min(100,e+4));
      }

      // Development tick
      if(ph==="developing"&&fm!=="rest"){
        setEnergy(en=>{
          const energyMod = en<25?0.5:1.0;
          const speedMod  = up.has("betterPC")?1.2:1.0;
          const bugMod    = up.has("whiteboard")?0.8:1.0;
          const designMod = up.has("books")?1.15:1.0;
          const baseRate  = fm==="crunch"?1.8:fm==="fixBugs"?0.5:fm==="research"?0.6:1.0;
          const rate      = 3.0*baseRate*speedMod*energyMod;
          const r = Math.random();

          if(fm==="fixBugs"){
            if(r<0.7){
              const bugFix = Math.floor(2+Math.random()*3);
              spawnBubble(`Bug −${bugFix}`,"#22c55e",monitorPos.x,monitorPos.y-20);
              setProject(p=>p?{...p,bugs:Math.max(0,p.bugs-bugFix)}:p);
            }
          } else if(fm==="research"){
            const rGain = Math.floor(1+Math.random()*2);
            spawnBubble(`Research +${rGain}`,"#a855f7",bookshelfPos.x,bookshelfPos.y-20);
            setProject(p=>p?{...p,research:(p.research??0)+rGain}:p);
            track("research_gained",{gain:rGain});
          } else {
            const dBoost   = fm==="design"?1.5:fm==="tech"?0.7:1.0;
            const tBoost   = fm==="tech"?1.5:fm==="design"?0.7:1.0;
            const bugChance= fm==="crunch"?0.45:0.25;
            if(r<0.30){
              const g = Math.floor((2+Math.random()*4)*dBoost*designMod*energyMod);
              spawnBubble(`Design +${g}`,"#f59e0b",charHead.x,charHead.y-12);
              setProject(p=>p?{...p,design:p.design+g}:p);
            } else if(r<0.55){
              const g = Math.floor((2+Math.random()*4)*tBoost*speedMod*energyMod);
              spawnBubble(`Tech +${g}`,"#3b82f6",monitorPos.x,monitorPos.y-15);
              setProject(p=>p?{...p,tech:p.tech+g}:p);
            } else if(r<0.55+bugChance){
              const b = Math.floor((1+Math.random()*2)*bugMod);
              spawnBubble(`Bug +${b}`,"#ef4444",monitorPos.x,monitorPos.y-10);
              setProject(p=>p?{...p,bugs:p.bugs+b}:p);
              track("bug_indicator_shown",{bugs:b});
            }
          }
          setProject(p=>p?{...p,progress:Math.min(100,p.progress+rate)}:p);
          return en;
        });
      }

      // Active market sales tick
      const marketGames = activeMarketGamesRef.current;
      if(marketGames.some(g=>g.status==="active_on_market")){
        const result = processActiveMarketGames(marketGames);
        activeMarketGamesRef.current = result.games;
        setActiveMarketGames(result.games);
        if(result.payouts.revenue>0) setCash(c=>c+result.payouts.revenue);
        if(result.payouts.fans>0) setFans(f=>f+result.payouts.fans);
        for(const event of result.events){
          gameEventBusRef.current.emitGameEvent(event);
        }
      }

      // Random events
      if(weeksSinceEvent.current>=8&&Math.random()<0.18){
        weeksSinceEvent.current = 0;
        const ev = EVENTS[~~(Math.random()*EVENTS.length)];
        setToast(ev.text);
        if(ev.fans){setFans(f=>f+ev.fans);spawnBubble(`Fans +${ev.fans}`,"#a855f7",charHead.x+20,charHead.y-25);}
        if(ev.cash){setCash(c=>c+ev.cash);spawnBubble(`${ev.cash>0?"+":""}$${Math.abs(ev.cash)}`,"#22c55e",deskTop.x,deskTop.y-15);}
        if(ev.prog&&phaseRef.current==="developing") setProject(p=>p?{...p,progress:Math.max(0,p.progress-ev.prog)}:p);
        if(ev.bugFix&&phaseRef.current==="developing") setProject(p=>p?{...p,bugs:Math.max(0,p.bugs-4)}:p);
        setTimeout(()=>setToast(null),4000);
      }

      // ── Market trend tick ──
      totalWeeksRef.current += 1;
      const tw = totalWeeksRef.current;
      const activeTrend = currentTrendRef.current;

      // Expire old trend
      if(activeTrend && tw > activeTrend.endsWeek){
        setCurrentTrend(null);
        track("market_trend_expired",{id:activeTrend.id,title:activeTrend.title});
        console.log(`[trend] expired: ${activeTrend.title}`);
      }

      // Spawn new trend
      if(tw >= nextTrendWeekRef.current && !currentTrendRef.current){
        const duration = 12+Math.floor(Math.random()*13);
        const gap      = 12+Math.floor(Math.random()*9);
        // Pick a trend not recently used
        const pick = TREND_POOL[~~(Math.random()*TREND_POOL.length)];
        const newTrend:MarketTrendDef = {...pick, startsWeek:tw, endsWeek:tw+duration};
        setCurrentTrend(newTrend);
        nextTrendWeekRef.current = tw + duration + gap;
        analytics.trendsSeen++;
        track("market_trend_started",{id:newTrend.id,title:newTrend.title});
        setToast(`📰 Market Trend: ${newTrend.description}`);
        setTimeout(()=>setToast(null),5500);
        console.log(`[trend] started: ${newTrend.title} (lasts ${duration}wks)`);
      }

      // Hype bubbles during development if project matches active trend
      if(phaseRef.current==="developing" && currentTrendRef.current){
        const t = currentTrendRef.current;
        const proj = projectRef.current;
        if(proj && trendMatchesProject(proj, t) && Math.random()<0.12){
          spawnBubble("📈 Trending!","#f59e0b",monitorPos.x+10,monitorPos.y-30);
          if(t.hypeBonus && Math.random()<0.5){
            setProject(p=>p?{...p,hype:(p.hype??0)+Math.ceil(t.hypeBonus!/2)}:p);
          }
        }
      }

      // ── Contract tick ──
      const ac = activeContractRef.current;
      if(ac){
        const newLeft = ac.weeksLeft-1;
        if(newLeft<=0){
          setCash(c=>c+ac.job.payout);
          setFans(f=>f+ac.job.fansBonus);
          setActiveContract(null);
          spawnBubble(`✓ $${ac.job.payout.toLocaleString()}`,"#22c55e",deskTop.x,deskTop.y-20);
          if(ac.job.fansBonus>0) spawnBubble(`+${ac.job.fansBonus} fans`,"#a855f7",charHead.x,charHead.y-22);
          setToast(`Contract complete: ${ac.job.name} · +$${ac.job.payout.toLocaleString()} · +${ac.job.fansBonus} fans`);
          setTimeout(()=>setToast(null),5000);
          analytics.contractsCompleted++;
          track("contract_completed",{name:ac.job.name,payout:ac.job.payout,fans:ac.job.fansBonus});
        } else {
          setActiveContract(prev=>prev?{...prev,weeksLeft:newLeft}:null);
        }
      }

      console.log(`[week] Y${yearRef.current} W${weekRef.current+1}`);
    }, 2000);
    return ()=>clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[spawnBubble]);

  // ── Handlers ──
  function triggerRipple(x:number,y:number,color:string){
    setClickRipple({id:Date.now(),x,y,color});
    setTimeout(()=>setClickRipple(null),600);
  }

  function onObjectHover(name:string|null){
    if(name&&!analytics.firstObjectHover){
      analytics.firstObjectHover=Date.now();
      track("object_hovered",{object:name,firstHover:true});
    } else if(name){
      track("object_hovered",{object:name});
    }
    setHoveredObject(name);
  }

  function onComputerClick(e:React.MouseEvent){
    e.stopPropagation();
    if(phase==="idle"){
      const isFirst = !analytics.flags.clickedComputer;
      if(isFirst){ analytics.firstComputerClick=Date.now(); }
      if(!analytics.firstModalOpen){ analytics.firstModalOpen=Date.now(); }
      track("computer_first_click",{isFirst});
      track("computer_clicked",{});
      track("first_project_modal_opened",{});
      track("new_project_opened",{});
      analytics.panelsOpened++;
      if(tutorialStep==="start") setTutorialStep("pick");
      if(history.length>0) track("second_project_prompt_shown",{});
      triggerRipple(computerPos.x,computerPos.y,"#f59e0b");
      setShowNewGame(true);
    } else if(phase==="developing"){
      analytics.panelsOpened++;
      track("computer_clicked",{phase:"developing"});
      track("contextual_panel_opened",{panel:"computer"});
      triggerRipple(computerPos.x,computerPos.y,"#3b82f6");
      setShowComputer(s=>!s);
      if(!showComputer) track("contextual_panel_closed",{panel:"computer"});
      setShowShop(false);
    }
  }

  function onShelfClick(e:React.MouseEvent){
    e.stopPropagation();
    const opening = !showShop;
    setShowShop(s=>!s);
    setShowComputer(false);
    track("upgrade_shop_opened",{});
    track(opening?"contextual_panel_opened":"contextual_panel_closed",{panel:"shop"});
    triggerRipple(bookshelfPos.x,bookshelfPos.y,"#a855f7");
    analytics.panelsOpened++;
  }

  function randomizeForm(){
    setFormTopic(TOPICS[~~(Math.random()*TOPICS.length)]);
    setFormGenre(GENRES[~~(Math.random()*GENRES.length)]);
    setFormPlatform(PLATFORMS[~~(Math.random()*PLATFORMS.length)]);
    setFormName(makeTitle());
  }

  function startProject(){
    releaseReadyFired.current = false;
    newGameProjectStartedRef.current = true;
    analytics.gamesStarted++;
    if(activeMarketGamesRef.current.some(g=>g.status==="active_on_market")){
      analytics.startedProjectWhileGameSelling = true;
      track("player_started_new_project_while_previous_game_selling",{activeGames:activeMarketGamesRef.current.filter(g=>g.status==="active_on_market").length});
    }
    const p:Project = {name:formName||makeTitle(),topic:formTopic,genre:formGenre,platform:formPlatform,design:0,tech:0,bugs:0,progress:0,research:0,hype:0};
    setProject(p);
    setPhase("developing");
    setFocusMode(null);
    setShowNewGame(false);
    setShowComputer(false);
    const isDefault = formTopic==="Fantasy"&&formGenre==="RPG"&&formPlatform==="Home Computer";
    const isSecond = history.length>0;
    if(!analytics.flags.startedFirstProject){
      analytics.usedDefaultProjectSettings = isDefault;
      analytics.formChangedFromDefaults = !isDefault;
      track(isDefault?"first_project_started_from_default":"first_project_started_after_changes",{name:p.name});
    }
    if(!analytics.flags.startedFirstProject){
      analytics.firstProjectStart = Date.now();
      track("project_started",{name:p.name});
      setTutorialStep("develop");
    } else if(isSecond&&!analytics.flags.startedSecondProject){
      track("second_project_started",{name:p.name});
      if(upgrades.size>0) track("upgrade_bonus_used",{upgrades:[...upgrades]});
      setTutorialStep("beat");
    }
    track("project_pill_shown",{name:p.name});
    console.log(`[project] started: ${p.name}`);
  }

  function releaseGame(){
    if(!project) return;
    if(!analytics.firstReleaseClicked) analytics.firstReleaseClicked = Date.now();
    const gameId = `game-${Date.now()}-${Math.floor(Math.random()*10000)}`;
    const result = generateReview(project, upgrades, currentTrend);
    const diag   = buildDiagnosis(project, result, upgrades);
    const tgt    = buildNextTarget(result, history, fansRef.current);
    const reviewScores = result.reviewers.map(r=>r.score);
    const marketGame = createActiveMarketGame({
      id: gameId,
      title: project.name,
      topic: project.topic,
      genre: project.genre,
      platform: project.platform,
      reviewScore: result.score,
      reviewScores,
      hype: project.hype,
      bugs: Math.floor(project.bugs),
      fansAtRelease: fansRef.current,
      marketTrendMultiplier: result.trendMatched ? (currentTrend?.salesMultiplier ?? 1) : 1,
    });

    setReviewResult(result);
    setDiagnosis(diag);
    setNextTarget(tgt);

    // Discover combo
    const comboScore = COMBO[project.genre]?.[project.topic]??1.0;
    const label      = comboLabel(comboScore);
    setDiscoveredCombos(prev=>{
      const key = `${project.topic}|${project.genre}|${project.platform}`;
      const existing = prev.find(c=>`${c.topic}|${c.genre}|${c.platform}`===key);
      if(existing) return prev.map(c=>`${c.topic}|${c.genre}|${c.platform}`===key?{...c,score:result.score,label}:c);
      track("combo_discovered",{topic:project.topic,genre:project.genre,score:result.score,label});
      return [...prev,{topic:project.topic,genre:project.genre,platform:project.platform,score:result.score,label}];
    });

    const newGame:ReleasedGame = {
      id: gameId,
      name: project.name,
      score: result.score,
      reviewScores,
      revenue: 0,
      fansGained: 0,
      unitsSold: 0,
      bugs: Math.floor(project.bugs),
      year,
      week,
      topic: project.topic,
      genre: project.genre,
      platform: project.platform,
      status: "reviewing",
      weeklySales: [],
      diagnosis: diag,
    };
    setHistory(h=>{
      const newH = [...h, newGame];
      // analytics comparisons
      analytics.totalGamesReleased = newH.length;
      if(result.score > analytics.bestScore){ analytics.bestScore = result.score; }
      if(h.length > 0){
        const prevBest = Math.max(...h.map(g=>g.score));
        if(result.score > prevBest)  { track("beat_previous_score",{score:result.score,prev:prevBest}); }
        if(h.length === 1)           { track("second_game_released",{score:result.score}); }
      }
      return newH;
    });

    // Market trend tracking
    if(result.trendMatched){
      analytics.gamesMatchingTrend++;
      analytics.usedTrendAfterSeeing = true;
      track("trend_matched_by_project",{trendName:result.trendName,revBonus:result.trendRevenueBonus,scoreBonus:result.trendScoreBonus});
      track("trend_bonus_applied",{revenue:result.trendRevenueBonus,score:result.trendScoreBonus});
      if(result.trendRevenueBonus>0) track("trend_revenue_impact",{impact:result.trendRevenueBonus});
    } else if(currentTrend){
      analytics.gamesIgnoringTrend++;
      track("trend_ignored_by_project",{activeTrend:currentTrend.title});
    }
    setTrendHistory(prev=>[...prev,{
      gameName:project.name,
      matched:result.trendMatched,
      trendName:result.trendMatched?result.trendName:(currentTrend?.title??"none"),
      revenueImpact:result.trendRevenueBonus,
      scoreImpact:result.trendScoreBonus,
    }]);

    setPhase("releasing");
    setShowComputer(false);
    if(!analytics.flags.releasedFirstGame){ analytics.firstRelease = Date.now(); }
    if(!analytics.flags.firstGameCompleted) track("first_game_completed",{score:result.score});
    track("release_clicked",{gameId,name:project.name});
    track("game_released",{gameId,name:project.name,score:result.score});
    analytics.releaseFlowStartedAt = Date.now();
    track("release_flow_started",{gameId,score:result.score,weeks:marketGame.maxSalesWeeks});
    track("review_sequence_started",{gameId,score:result.score});
    console.log(`[release] ${project.name} | score: ${result.score} | trendMatched:${result.trendMatched}`);

    // Initialise phased release flow
    setReviewDisplayScore(0);
    setReleaseFlow({
      phase:"reviews",
      gameId,
      marketGame,
      reviewIndex:0,
      reviewSubPhase:"entering",
      salesWeeks:[],
      salesIndex:0,
      runningRevenue:0,
      runningFans:0,
      runningUnits:0,
      salesSpeed:1,
      salesPaused:false,
      skippedSales:false,
      skippedReviews:false,
      reviewPhaseStartAt:Date.now(),
    });
  }

  function completeRelease(){
    if(autoPlayIntervalRef.current){ clearInterval(autoPlayIntervalRef.current); autoPlayIntervalRef.current=null; }
    setReleaseFlow(null);
    setShowDiagnosis(false);
    setReviewResult(null);
    setProject(null);
    setPhase("idle");
    setFocusMode(null);
    setCelebrating(false);
    // Objective transition
    if(tutorialStep==="release")  setTutorialStep("upgrade");
    if(tutorialStep==="beat")     setTutorialStep("done");
  }

  // ── Studio menu handlers ──
  function openContractWork(){
    analytics.contractWorkOpened++;
    const pool=[...CONTRACT_POOL].sort(()=>Math.random()-0.5).slice(0,3);
    setContractJobs(pool);
    setShowContractWork(true);
    track("contract_work_opened",{hasActive:!!activeContract});
  }
  function acceptContract(job:ContractDef){
    setActiveContract({job,weeksLeft:job.durationWeeks,weeksTotal:job.durationWeeks});
    setShowContractWork(false);
    analytics.contractsStarted++;
    track("contract_work_started",{name:job.name,payout:job.payout,weeks:job.durationWeeks});
    setToast(`Contract started: ${job.name} · ${job.durationWeeks} weeks`);
    setTimeout(()=>setToast(null),3500);
  }
  function handleMenuAction(action:string){
    analytics.menuItemClicks++;
    menuActionTakenRef.current = true;
    setStudioMenu(null);
    track("global_menu_item_clicked",{action,phase});
    if(action==="newGame")       { setShowNewGame(true); }
    else if(action==="contractWork"){ openContractWork(); }
    else if(action==="history")  {
      analytics.gameHistoryOpened++;
      setShowHistory(true);
      track("game_history_opened",{games:history.length});
    }
    else if(action==="develop")  { setShowComputer(true); }
    else if(action==="viewProject"){ setShowComputer(true); }
    else if(action==="release")  { releaseGame(); }
  }

  // ── Release flow handlers ──
  function skipReviews(){
    analytics.reviewSkipClicked=true;
    track("review_skip_clicked",{atIndex:releaseFlowRef.current?.reviewIndex??0});
    const score=reviewResultRef.current?.score??0;
    if(score>=7) setCelebrating(true);
    setReleaseFlow(f=>f?{...f,phase:"reaction",skippedReviews:true}:f);
  }

  function fastForwardReview(){
    analytics.reviewFastForwardClicked=true;
    track("review_fast_forward_clicked",{atIndex:releaseFlowRef.current?.reviewIndex??0});
    const flow=releaseFlowRef.current;
    if(!flow||flow.phase!=="reviews") return;
    const idx=flow.reviewIndex;
    if(flow.reviewSubPhase==="entering"){
      setReleaseFlow({...flow,reviewSubPhase:"rolling"});
    } else if(flow.reviewSubPhase==="rolling"){
      const finalScore=idx>=4?(reviewResultRef.current?.score??5):(reviewResultRef.current?.reviewers[idx]?.score??5);
      setReviewDisplayScore(finalScore);
      setReleaseFlow({...flow,reviewSubPhase:"settled"});
    } else {
      if(idx>=4){
        const score=reviewResultRef.current?.score??0;
        if(score>=7) setCelebrating(true);
        track("all_reviews_revealed",{avgScore:score});
        setReleaseFlow({...flow,phase:"reaction"});
      } else {
        const nextIdx=idx+1;
        if(nextIdx>=4){
          track("review_average_revealed",{avg:reviewResultRef.current?.score});
          setReleaseFlow({...flow,reviewIndex:4,reviewSubPhase:"entering"});
        } else {
          setReleaseFlow({...flow,reviewIndex:nextIdx,reviewSubPhase:"entering"});
        }
      }
    }
  }

  function handleStartSalesPhase(){
    const flow=releaseFlowRef.current;
    if(!flow) return;
    const nextGames = [...activeMarketGamesRef.current, flow.marketGame];
    activeMarketGamesRef.current = nextGames;
    setActiveMarketGames(nextGames);
    analytics.marketGamesEntered++;
    analytics.releasePayoffCompleted = true;
    if(analytics.firstReleaseClicked) analytics.releaseToSummaryMs = Date.now()-analytics.firstReleaseClicked;
    if(!analytics.finalSummaryViewedAt) analytics.finalSummaryViewedAt = Date.now();
    track("game_entered_market",{gameId:flow.gameId,title:flow.marketGame.title,maxSalesWeeks:flow.marketGame.maxSalesWeeks});
    setHistory(h=>h.map(g=>g.id===flow.gameId?{...g,status:"active_on_market"}:g));
    setCelebrating(false);
    setReleaseFlow(null);
    setReviewResult(null);
    setProject(null);
    setPhase("idle");
    setFocusMode(null);
    if(tutorialStep==="release")  setTutorialStep("upgrade");
    if(tutorialStep==="beat")     setTutorialStep("done");
  }

  function handleNextSalesWeek(){
    const flow = releaseFlowRef.current;
    if(!flow||flow.phase!=="sales") return;
    if(flow.salesIndex>=flow.salesWeeks.length){
      if(!analytics.finalSummaryViewedAt) analytics.finalSummaryViewedAt=Date.now();
      if(!flow.skippedSales) analytics.watchedFullSalesTail=true;
      analytics.releasePayoffCompleted=true;
      if(analytics.firstReleaseClicked) analytics.releaseToSummaryMs=Date.now()-analytics.firstReleaseClicked;
      setReleaseFlow({...flow,phase:"summary"});
      track("final_summary_viewed",{});
      analytics.reachedSummary=true;
      return;
    }
    const week = flow.salesWeeks[flow.salesIndex];
    setCash(c=>c+week.revenue);
    setFans(f=>f+week.fans);
    spawnBubble(`$${week.revenue.toLocaleString()}`,"#22c55e",deskTop.x,deskTop.y-20);
    if(week.fans>0) spawnBubble(`+${week.fans} fans`,"#a855f7",charHead.x,charHead.y-22);
    analytics.salesWeeksViewed++;
    track("sales_week_revealed",{week:week.week,revenue:week.revenue,fans:week.fans});
    const nextIdx = flow.salesIndex+1;
    const newRev = flow.runningRevenue+week.revenue;
    const newFans = flow.runningFans+week.fans;
    const newUnits = flow.runningUnits+week.units;
    if(nextIdx>=flow.salesWeeks.length){
      if(!analytics.finalSummaryViewedAt) analytics.finalSummaryViewedAt=Date.now();
      if(!flow.skippedSales){ analytics.watchedFullSalesTail=true; track("watched_full_sales_tail",{weeks:flow.salesWeeks.length}); }
      analytics.releasePayoffCompleted=true;
      if(analytics.firstReleaseClicked) analytics.releaseToSummaryMs=Date.now()-analytics.firstReleaseClicked;
      setReleaseFlow({...flow,salesIndex:nextIdx,runningRevenue:newRev,runningFans:newFans,runningUnits:newUnits,phase:"summary"});
      track("final_summary_viewed",{});
      analytics.reachedSummary=true;
    } else {
      setReleaseFlow({...flow,salesIndex:nextIdx,runningRevenue:newRev,runningFans:newFans,runningUnits:newUnits});
    }
  }

  function handleSkipToSummary(){
    const flow = releaseFlowRef.current;
    if(!flow) return;
    // Add all remaining week revenues at once
    let remRev=0,remFans=0,remUnits=0;
    for(let i=flow.salesIndex;i<flow.salesWeeks.length;i++){
      remRev+=flow.salesWeeks[i].revenue;
      remFans+=flow.salesWeeks[i].fans;
      remUnits+=flow.salesWeeks[i].units;
    }
    if(remRev>0) setCash(c=>c+remRev);
    if(remFans>0) setFans(f=>f+remFans);
    analytics.skippedSales=true;
    if(!analytics.finalSummaryViewedAt) analytics.finalSummaryViewedAt=Date.now();
    analytics.releasePayoffCompleted=true;
    if(analytics.firstReleaseClicked) analytics.releaseToSummaryMs=Date.now()-analytics.firstReleaseClicked;
    track("sales_skipped",{weeksRemaining:flow.salesWeeks.length-flow.salesIndex});
    track("final_summary_viewed",{});
    analytics.reachedSummary=true;
    setReleaseFlow({...flow,phase:"summary",salesIndex:flow.salesWeeks.length,runningRevenue:flow.runningRevenue+remRev,runningFans:flow.runningFans+remFans,runningUnits:flow.runningUnits+remUnits,skippedSales:true});
  }

  function buyUpgrade(id:string,cost:number){
    if(upgrades.has(id)||cash<cost) return;
    setCash(c=>c-cost);
    setUpgrades(u=>new Set([...u,id]));
    const def = UPGRADE_DEFS.find(u=>u.id===id);
    if(def) { setLastBuyMessage(def.nextGame); setTimeout(()=>setLastBuyMessage(null),5000); }
    setShowShop(false);
    if(!analytics.flags.boughtUpgrade){ analytics.firstUpgradeBought=Date.now(); }
    track("upgrade_bought",{id,cost});
    if(tutorialStep==="upgrade") setTutorialStep("second");
    spawnBubble(`✓ ${def?.name??id}`,"#22c55e",bookshelfPos.x,bookshelfPos.y-20);
    console.log(`[upgrade] bought: ${id}`);
  }

  function handleFocusClick(id:FocusMode){
    setFocusMode(f=>f===id?null:id);
    setShowComputer(false);
    analytics.actionsUsed++;
    track("development_focus_changed",{from:focusMode,to:id});
    setActionBurst({type:id??"balanced",key:Date.now()});
    if(id==="design")   { spawnBubble("Design ↑","#f59e0b",charHead.x,charHead.y-20); spawnBubble("Design ↑","#f59e0b",charHead.x+25,charHead.y-30); }
    if(id==="tech")     { spawnBubble("Tech ↑","#3b82f6",monitorPos.x,monitorPos.y-25); spawnBubble("Tech ↑","#3b82f6",monitorPos.x+20,monitorPos.y-35); }
    if(id==="fixBugs")  { spawnBubble("Bug fix ✓","#22c55e",monitorPos.x,monitorPos.y-20); }
    if(id==="crunch")   { spawnBubble("⚡ Crunch!","#ef4444",charHead.x,charHead.y-25); }
    if(id==="rest")     { spawnBubble("💤 Resting","#10b981",charHead.x,charHead.y-20); }
    if(id==="research") { spawnBubble("Research ↑","#a855f7",bookshelfPos.x,bookshelfPos.y-20); }
  }

  // ── Studio menu items (contextual) ──
  const menuItems: StudioMenuItem[] = (()=>{
    if(phase==="developing"&&(project?.progress??0)>=100) return [
      {icon:"🚀",label:"Release Game",action:"release"},
      {icon:"📊",label:"View Current Project",action:"viewProject"},
      {icon:"📜",label:"Game History",action:"history"},
    ];
    if(phase==="developing") return [
      {icon:"💻",label:"Continue Development",action:"develop"},
      {icon:"📊",label:"View Current Project",action:"viewProject"},
      {icon:"📜",label:"Game History",action:"history"},
    ];
    return [
      {icon:"🎮",label:"Develop New Game",action:"newGame"},
      {icon:"📋",label:"Find Contract Work",action:"contractWork"},
      {icon:"📜",label:"Game History",action:"history"},
      {icon:"🔧",label:"Create Custom Engine",action:"engine",disabled:true,sub:"Requires 3 released games"},
      {icon:"🤝",label:"Find Publishing Deal",action:"publishing",disabled:true,sub:"Requires 50+ fans"},
    ];
  })();
  const menuItemsRef = useRef(menuItems);
  menuItemsRef.current = menuItems;

  // ── Derived ──
  const working        = phase==="developing";
  const tired          = energy<25;
  const readyToRelease = working&&(project?.progress??0)>=100;
  const formCombo      = COMBO[formGenre]?.[formTopic]??1.0;
  const bestScore      = history.length>0?Math.max(...history.map(g=>g.score)):0;
  const bestRevenue    = history.length>0?Math.max(...history.map(g=>g.revenue)):0;
  const bugCount       = Math.min(5,Math.ceil((project?.bugs??0)/8));
  const projectStatus  = !project?"":project.progress>=100?"Ready to Release":project.progress>=75?"Polishing":project.progress>=25?"In Development":"Planning";
  const lastGame       = history.length>0?history[history.length-1]:null;
  const marketFeedGames = activeMarketGames
    .filter(g=>g.status==="active_on_market"||g.weeklySales.length>0)
    .slice(-3)
    .reverse();
  const activeSellingGame = activeMarketGames.find(g=>g.status==="active_on_market");
  const latestSellingWeek = activeSellingGame?.weeklySales[activeSellingGame.weeklySales.length-1] ?? null;
  const developerSpriteState: DeveloperSpriteState = celebrating
    ? "celebrating"
    : working&&focusMode==="rest"
    ? "resting"
    : tired
    ? "tired"
    : activeSellingGame&&latestSellingWeek&&latestSellingWeek.units<=2
    ? "worried"
    : working
    ? "working"
    : activeSellingGame
    ? "thinking"
    : showNewGame||showShop||studioMenu
    ? "thinking"
    : "idle";
  const developerSprite = getDeveloperSprite(developerSpriteState, typingFrame);
  // Developer anchor: fixed percentage position so all sprite states stay stable
  const devLeft  = developerSpriteState === "celebrating" ? 67 : 69;
  const devTop   = developerSpriteState === "celebrating" ? 47 : 49;
  const devWidth = developerSpriteState === "celebrating" ? 16 : 14;
  // Hitbox helper — args are percentages of scene wrapper
  const sceneHitboxStyle = (leftPct:number,topPct:number,widthPct:number,heightPct:number,z=12): CSSProperties => ({
    left:`${leftPct}%`,
    top:`${topPct}%`,
    width:`${widthPct}%`,
    height:`${heightPct}%`,
    zIndex:z,
    ...(DEBUG_HITBOXES ? {outline:"2px dashed rgba(255,100,0,0.7)",background:"rgba(255,100,0,0.08)"} : {}),
  });

  // Active upgrade bonuses label
  const activeBonuses: string[] = [];
  if(upgrades.has("betterPC"))    activeBonuses.push("+20% Tech");
  if(upgrades.has("books"))       activeBonuses.push("+15% Design");
  if(upgrades.has("whiteboard"))  activeBonuses.push("-20% Bugs");
  if(upgrades.has("coffeemaker")) activeBonuses.push("-25% Energy drain");

  // Discovered combo lookup for current form selection
  const discoveredKey = `${formTopic}|${formGenre}|${formPlatform}`;
  const priorCombo    = discoveredCombos.find(c=>`${c.topic}|${c.genre}|${c.platform}`===discoveredKey);

  // ── Hint map ──
  const hintMap: Record<TutorialStep,string|null> = {
    start:"Click the computer",
    pick:"Pick a topic, genre, and platform.",
    develop:"Time is moving. Click the computer to guide development.",
    release:"Release your game from the computer panel.",
    upgrade:"Click the shelf to buy your first upgrade.",
    second:"Start a second game and beat your first score.",
    beat:null,
    done:null,
  };
  const currentHint = hintMap[tutorialStep];

  // ── Monitor glow state ──
  const monitorGlowColor = readyToRelease
    ? "#22c55e"
    : !working
      ? (tutorialStep==="start" ? "#f59e0b" : null)
      : bugCount>4 ? "#ef4444"
      : focusMode==="crunch" ? "#ef4444"
      : focusMode==="tech" ? "#3b82f6"
      : focusMode==="design" ? "#f59e0b"
      : "#3b82f6";

  const monitorGlowCssClass = readyToRelease
    ? "monitor-release"
    : !working
      ? (tutorialStep==="start" ? "monitor-breath" : "")
      : bugCount>4 ? "monitor-bug"
      : focusMode==="crunch" ? "monitor-bug"
      : working ? "monitor-flicker"
      : "";

  // ── Objective pill ──
  const objectiveText = (()=>{
    if(phase==="idle"&&history.length===0)                          return "Start your first game";
    if(working&&(project?.progress??0)<100)                         return nextTarget?`Target: ${nextTarget.text}`:"Reach 100% progress";
    if(working&&(project?.progress??0)>=100)                        return "Release your game!";
    if(phase==="releasing")                                         return "See your review";
    if(phase==="idle"&&history.length>0&&upgrades.size===0)         return "Buy an upgrade";
    if(phase==="idle"&&history.length===1&&upgrades.size>0)         return "Start your second game";
    if(phase==="idle"&&history.length>=2&&fans<100)                 return "Reach 100 fans";
    if(phase==="idle"&&history.length>=2&&fans>=100)                return `Earn $${(Math.ceil(bestRevenue*1.5/100)*100).toLocaleString()} total`;
    return null;
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return(
    <div className="relative w-full h-[100dvh] overflow-hidden bg-background select-none"
      onClick={e=>{
        const t=e.target as HTMLElement;
        const isPanel = !!t.closest("[data-panel]");
        const isInteractive = !!t.closest("[data-interactive]");
        if(!isPanel){
          setShowComputer(false);
          setShowShop(false);
          if(!analytics.flags.startedFirstProject){
            missedClicksRef.current += 1;
            analytics.missedClicksBeforeStart = missedClicksRef.current;
            setMissedClicks(missedClicksRef.current);
            track("missed_scene_click",{count:missedClicksRef.current});
          }
        }
        // Open/close studio menu on empty background clicks
        if(!isPanel&&!isInteractive&&phase!=="releasing"){
          if(studioMenu){
            setStudioMenu(null);
          } else {
            const rect=(e.currentTarget as HTMLElement).getBoundingClientRect();
            setStudioMenu({x:e.clientX-rect.left, y:e.clientY-rect.top});
            setMenuSelectedIdx(0);
            analytics.menuOpens++;
            track("global_menu_opened",{phase});
          }
        } else if(studioMenu&&!isPanel){
          setStudioMenu(null);
        }
      }}
    >

      {/* ── CSS ANIMATIONS ─────────────────────────────────────────────────── */}
      <style>{`
        @keyframes bugWiggle { 0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)} }
        @keyframes releasePulse { 0%,100%{box-shadow:0 0 0 0 #22c55e55}50%{box-shadow:0 0 0 8px #22c55e00} }
        @keyframes pillFadeIn { from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)} }
        @keyframes hoverLabelIn { from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)} }
        @keyframes monitorBreath { 0%,100%{opacity:0.10}50%{opacity:0.30} }
        @keyframes monitorFlicker { 0%{opacity:0.22}20%{opacity:0.08}40%{opacity:0.28}60%{opacity:0.06}80%{opacity:0.25}100%{opacity:0.22} }
        @keyframes monitorRelease { 0%,100%{opacity:0.14}50%{opacity:0.44} }
        @keyframes monitorBug { 0%{opacity:0.28}33%{opacity:0.10}66%{opacity:0.32}100%{opacity:0.28} }
        @keyframes liveDot { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.7)} }
        @keyframes latestBarPulse { 0%,100%{filter:brightness(1)}50%{filter:brightness(1.35)} }
        @keyframes dustDrift {
          0%   { transform:translate(0,0);          opacity:0 }
          12%  { opacity:0.75 }
          80%  { opacity:0.45 }
          100% { transform:translate(var(--dx,6px),var(--dy,-55px)); opacity:0 }
        }
        @keyframes lampFlicker {
          0%,100% { opacity:0.58 }
          22%     { opacity:0.50 }
          44%     { opacity:0.63 }
          66%     { opacity:0.53 }
          88%     { opacity:0.61 }
        }
        @keyframes steamRise {
          0%   { transform:translateY(0) scaleX(1);   opacity:0   }
          18%  { opacity:0.38 }
          70%  { opacity:0.18 }
          100% { transform:translateY(-30px) scaleX(1.6); opacity:0 }
        }
        @keyframes shelfUpgradePulse {
          0%,100% { box-shadow:0 0 0 0 rgba(168,85,247,0);  border-color:rgba(168,85,247,0.25) }
          50%     { box-shadow:0 0 18px 4px rgba(168,85,247,0.18); border-color:rgba(168,85,247,0.55) }
        }
        @keyframes paperWiggle {
          0%,100% { transform:rotate(0deg)   }
          35%     { transform:rotate(0.7deg) }
          70%     { transform:rotate(-0.5deg)}
        }
        .bug-wiggle   { animation: bugWiggle 0.4s ease-in-out infinite; display:inline-block; }
        .release-pulse { animation: releasePulse 1.2s ease-in-out infinite; }
        .pill-appear  { animation: pillFadeIn 0.3s ease-out both; }
        .hover-label  { animation: hoverLabelIn 0.15s ease-out both; }
        .monitor-breath  { animation: monitorBreath  1.8s ease-in-out infinite; }
        .monitor-flicker { animation: monitorFlicker 0.55s linear   infinite; }
        .monitor-release { animation: monitorRelease 1.0s ease-in-out infinite; }
        .monitor-bug     { animation: monitorBug     0.38s linear   infinite; }
        .live-dot     { animation: liveDot       1.1s ease-in-out infinite; }
        .latest-bar   { animation: latestBarPulse 1.1s ease-in-out infinite; }
        .dust-particle    { position:absolute; border-radius:50%; pointer-events:none;
                            animation: dustDrift var(--dur,4s) var(--delay,0s) ease-in infinite; }
        .lamp-glow-div    { animation: lampFlicker 3.2s ease-in-out infinite; }
        .steam-wisp       { position:absolute; pointer-events:none; border-radius:40%;
                            animation: steamRise var(--dur,2.4s) var(--delay,0s) ease-out infinite; }
        .shelf-upgrade-pulse { animation: shelfUpgradePulse 1.8s ease-in-out infinite;
                               position:absolute; border-radius:14px; border:2px solid rgba(168,85,247,0.25);
                               pointer-events:none; }
        .poster-wiggle    { animation: paperWiggle 5.5s ease-in-out infinite; transform-origin: bottom center; }
        .garage-png-scene { filter: drop-shadow(0 20px 24px rgba(30, 20, 8, .18)); }
        .scene-layer  { position:absolute; height:auto; pointer-events:none; user-select:none; -webkit-user-drag:none; }
        .scene-hitbox { position:absolute; appearance:none; border:0; padding:0; margin:0; background:transparent; cursor:pointer; }
        .scene-hitbox:focus-visible { outline:2px solid #f59e0b; outline-offset:3px; border-radius:12px; }
        .level1-base {
          position:absolute; inset:0; width:100%; height:100%;
          object-fit:contain; pointer-events:none; user-select:none; display:block;
        }
        .developer-anchor {
          position:absolute; transform:translate(-50%,-20%);
          z-index:12; pointer-events:none;
        }
        .developer-anchor img { width:100%; height:auto; display:block; }
        @media (prefers-reduced-motion: reduce) {
          .dust-particle, .steam-wisp, .lamp-glow-div, .poster-wiggle,
          .monitor-breath, .monitor-flicker, .monitor-release, .monitor-bug,
          .live-dot, .latest-bar, .shelf-upgrade-pulse, .bug-wiggle { animation: none !important; }
        }
      `}</style>

      {/* ── PNG SCENE ─────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center pt-10 pointer-events-none">
        <div
          className="garage-png-scene relative pointer-events-auto"
          style={{width:"min(1100px, min(92vw, calc(86vh * 11 / 8)))",aspectRatio:"11 / 8"}}
          onMouseLeave={()=>onObjectHover(null)}
        >
          {/* ── LEVEL 1 BASE IMAGE (transparent background, clean) ── */}
          <img
            className="level1-base"
            src={levelAssets.level1BaseClean}
            alt=""
            draggable={false}
          />

          {/* ── MONITOR GLOW (CRT screen, right-side desk ≈73%,40%) ── */}
          {monitorGlowColor&&(
            <div
              className={monitorGlowCssClass}
              style={{
                position:"absolute",
                left:"70%",
                top:"38%",
                width:"7%",
                height:"5%",
                borderRadius:"40%",
                background:monitorGlowColor,
                filter:"blur(16px)",
                zIndex:6,
                pointerEvents:"none",
                mixBlendMode:"screen",
              }}
            />
          )}

          {/* ── LAMP WARM GLOW (desk lamp, right side ≈68%,32%) ── */}
          <div className="lamp-glow-div" style={{
            position:"absolute",
            left:"65%",
            top:"30%",
            width:"22%",
            height:"22%",
            background:"radial-gradient(ellipse at 52% 18%, rgba(255,215,90,0.26) 0%, rgba(255,190,60,0.09) 38%, transparent 68%)",
            pointerEvents:"none",
            zIndex:3,
          }}/>

          {/* ── DUST MOTES (lamp / monitor area, right side) ── */}
          {([
            {lp:68,tp:37,s:2,dx:4,dy:-52,dur:4.2,delay:0},
            {lp:71,tp:33,s:1,dx:-3,dy:-48,dur:3.8,delay:0.7},
            {lp:74,tp:38,s:2,dx:7,dy:-58,dur:4.6,delay:1.5},
            {lp:69,tp:40,s:1,dx:-5,dy:-45,dur:3.5,delay:2.2},
            {lp:73,tp:35,s:2,dx:3,dy:-62,dur:5.0,delay:0.4},
            {lp:68,tp:30,s:1,dx:6,dy:-50,dur:4.1,delay:3.0},
            {lp:72,tp:32,s:2,dx:-4,dy:-55,dur:4.8,delay:1.1},
            {lp:76,tp:37,s:1,dx:5,dy:-44,dur:3.6,delay:2.8},
            {lp:70,tp:39,s:2,dx:-2,dy:-60,dur:4.4,delay:0.9},
            {lp:74,tp:31,s:1,dx:4,dy:-50,dur:3.9,delay:3.5},
            {lp:77,tp:36,s:2,dx:-6,dy:-48,dur:4.7,delay:1.8},
            {lp:67,tp:34,s:1,dx:3,dy:-53,dur:4.3,delay:2.5},
          ] as const).map((p,i)=>(
            <div key={i} className="dust-particle" style={{
              left:`${p.lp}%`,
              top:`${p.tp}%`,
              width:`${p.s}px`,
              height:`${p.s}px`,
              background:`rgba(255,248,210,${0.50+((i%3)*0.10)})`,
              ["--dx" as string]:`${p.dx}px`,
              ["--dy" as string]:`${p.dy}px`,
              ["--dur" as string]:`${p.dur}s`,
              ["--delay" as string]:`${p.delay}s`,
              zIndex:14,
            }}/>
          ))}

          {/* ── COFFEE STEAM (workbench/shelf area ≈18%,40%) ── */}
          {upgrades.has("coffeemaker")&&([
            {lp:18,tp:40,dur:2.3,delay:0},
            {lp:19,tp:39,dur:2.8,delay:1.1},
            {lp:18.5,tp:41,dur:2.5,delay:0.6},
          ] as const).map((w,i)=>(
            <div key={i} className="steam-wisp" style={{
              left:`${w.lp}%`,
              top:`${w.tp}%`,
              width:"3px",
              height:"14px",
              background:"rgba(240,240,240,0.40)",
              filter:"blur(2px)",
              ["--dur" as string]:`${w.dur}s`,
              ["--delay" as string]:`${w.delay}s`,
              zIndex:9,
            }}/>
          ))}

          {/* ── SHELF / UPGRADE OBJECTIVE PULSE (left shelf ≈10%,29%) ── */}
          {objectiveText==="Buy an upgrade"&&(
            <div className="shelf-upgrade-pulse" style={{
              left:"10%",
              top:"29%",
              width:"20%",
              height:"34%",
              zIndex:11,
            }}/>
          )}

          {/* ── DEVELOPER SPRITE — fixed anchor at computer desk (≈69%,49%) ── */}
          <div
            className="developer-anchor"
            style={{left:`${devLeft}%`,top:`${devTop}%`,width:`${devWidth}%`}}
          >
            <motion.img
              key={developerSprite}
              src={developerSprite}
              alt="Developer"
              draggable={false}
              style={{width:"100%",height:"auto",display:"block"}}
              initial={{opacity:0.88}}
              animate={{
                opacity:1,
                y:celebrating?[0,-10,0,-6,0]:working&&developerSpriteState==="working"?[0,-2,0]:[0,-1.5,0],
              }}
              transition={{
                duration:celebrating?0.55:working?0.42:3.2,
                repeat:Infinity,
                ease:"easeInOut",
                repeatType:"mirror",
              }}
            />
          </div>

          {/* ── INTERACTION HITBOXES ── */}

          {/* A. COMPUTER — right-side CRT desk (71%,39% 18×19%) */}
          <button
            className="scene-hitbox"
            data-interactive="computer"
            aria-label="Computer"
            style={sceneHitboxStyle(71,39,18,19)}
            onMouseEnter={()=>onObjectHover("computer")}
            onClick={onComputerClick}
          />
          {/* B. UPGRADES — left-wall shelf (10%,29% 20×34%) */}
          <button
            className="scene-hitbox"
            data-interactive="shelf"
            aria-label="Upgrade shelf"
            style={sceneHitboxStyle(10,29,20,34)}
            onMouseEnter={()=>onObjectHover("shelf")}
            onClick={(e)=>{e.stopPropagation();onShelfClick(e);}}
          />
          {/* C. WORKBENCH — back wall workbench / chalkboard (43%,24% 28×25%) */}
          <button
            className="scene-hitbox"
            data-interactive="workbench"
            aria-label="Workbench"
            style={sceneHitboxStyle(43,24,28,25)}
            onMouseEnter={()=>onObjectHover("desk")}
            onClick={(e)=>e.stopPropagation()}
          />
          {/* D. DEVELOPER — at computer desk (65%,44% 20×30%) */}
          <button
            className="scene-hitbox"
            data-interactive="developer"
            aria-label="Developer"
            style={sceneHitboxStyle(65,44,20,30)}
            onMouseEnter={()=>onObjectHover("char")}
            onClick={(e)=>e.stopPropagation()}
          />
          {/* E. COVERED CAR — locked future area (25%,52% 35×26%) */}
          <button
            className="scene-hitbox"
            data-interactive="car"
            aria-label="Covered car – locked"
            style={sceneHitboxStyle(25,52,35,26)}
            onMouseEnter={()=>onObjectHover(null)}
            onClick={(e)=>e.stopPropagation()}
            title="Locked for future upgrade"
          />

          <svg viewBox={`0 0 ${PNG_SCENE_WIDTH} ${PNG_SCENE_HEIGHT}`} className="absolute inset-0 h-full w-full pointer-events-none" preserveAspectRatio="none" style={{zIndex:20}}>
            {tutorialStep==="start"&&(
              <motion.ellipse cx={computerPos.x} cy={computerPos.y+45}
                rx={missedClicks>=2?130:105} ry={missedClicks>=2?52:42}
                fill="#f59e0b" opacity={0}
                animate={{opacity:missedClicks>=2?[0,0.36,0]:[0,0.2,0]}}
                transition={{repeat:Infinity,duration:missedClicks>=2?1.1:1.6}}/>
            )}
            {readyToRelease&&(
              <motion.ellipse cx={computerPos.x} cy={computerPos.y+45} rx={110} ry={44}
                fill="#22c55e" opacity={0}
                animate={{opacity:[0,0.25,0]}} transition={{repeat:Infinity,duration:1.0}}/>
            )}
            {tutorialStep==="upgrade"&&(
              <motion.ellipse cx={bookshelfPos.x} cy={bookshelfPos.y+150} rx={90} ry={150}
                fill="#f59e0b" opacity={0}
                animate={{opacity:[0,0.24,0]}} transition={{repeat:Infinity,duration:1.6}}/>
            )}
            {focusMode==="rest"&&working&&(
              <motion.ellipse cx={charHead.x} cy={charHead.y+90} rx={75} ry={55}
                fill="#22c55e" opacity={0}
                animate={{opacity:[0,0.18,0]}} transition={{repeat:Infinity,duration:2}}/>
            )}
            {readyToRelease&&(
              <motion.g animate={{opacity:[0.85,1,0.85],y:[0,-5,0]}} transition={{repeat:Infinity,duration:1.2}}>
                <rect x={computerPos.x-78} y={computerPos.y-92} width={156} height={34} rx={17} fill="#22c55e"/>
                <text x={computerPos.x} y={computerPos.y-70} textAnchor="middle" fontSize="18" fontWeight="bold" fill="white">Release Ready!</text>
              </motion.g>
            )}
            {working&&bugCount>0&&(
              <g>
                {Array.from({length:bugCount},(_,i)=>{
                  const bx=monitorPos.x-42+(i*22);
                  const by=monitorPos.y+80;
                  return(
                    <text key={i} x={bx} y={by} fontSize="20" textAnchor="middle"
                      style={{animation:`bugWiggle ${0.3+i*0.05}s ease-in-out infinite`,display:"inline-block",transformOrigin:`${bx}px ${by}px`}}>
                      🐛
                    </text>
                  );
                })}
              </g>
            )}
            {actionBurst&&(
              <motion.g key={actionBurst.key}
                initial={{opacity:1,scale:0.5}} animate={{opacity:0,scale:2.5}} exit={{opacity:0}}
                transition={{duration:0.6,ease:"easeOut"}}>
                {actionBurst.type==="design"&&([0,60,120,180,240,300].map((a,i)=>{const r2=a*Math.PI/180;return<circle key={i} cx={charHead.x+Math.cos(r2)*48} cy={charHead.y+Math.sin(r2)*48} r={10} fill="#f59e0b"/>; }))}
                {actionBurst.type==="tech"&&([0,45,90,135,180,225,270,315].map((a,i)=>{const r2=a*Math.PI/180;return<circle key={i} cx={monitorPos.x+Math.cos(r2)*44} cy={monitorPos.y+Math.sin(r2)*44} r={8} fill="#3b82f6"/>; }))}
                {actionBurst.type==="fixBugs"&&(<circle cx={monitorPos.x} cy={monitorPos.y} r={72} fill="none" stroke="#22c55e" strokeWidth={6} opacity={0.8}/>)}
                {actionBurst.type==="crunch"&&(<circle cx={computerPos.x} cy={computerPos.y} r={82} fill="none" stroke="#ef4444" strokeWidth={6} opacity={0.8}/>)}
                {actionBurst.type==="research"&&([0,60,120,180,240,300].map((a,i)=>{const r2=a*Math.PI/180;return<circle key={i} cx={bookshelfPos.x+Math.cos(r2)*48} cy={bookshelfPos.y+Math.sin(r2)*48} r={10} fill="#a855f7"/>; }))}
              </motion.g>
            )}
            <AnimatePresence>
              {bubbles.map(b=>(
                <motion.g key={b.id}
                  initial={{opacity:1,y:0}} animate={{opacity:0,y:-80}} exit={{opacity:0}}
                  transition={{duration:1.8,ease:"easeOut"}}>
                  <text x={b.svgX} y={b.svgY} textAnchor="middle" fontSize="20" fontWeight="bold"
                    fill={b.color} stroke="white" strokeWidth="5" paintOrder="stroke">{b.text}</text>
                </motion.g>
              ))}
            </AnimatePresence>
            {hoveredObject==="computer"&&(
              <>
                <ellipse cx={computerPos.x} cy={computerPos.y+45} rx={145} ry={58} fill="#f59e0b" opacity={tutorialStep==="start"?0.22:0.14}/>
                <rect x={computerPos.x-148} y={computerPos.y-18} width={296} height={160} rx={22} fill="#f59e0b" opacity={0.04} stroke="#f59e0b" strokeWidth="2" strokeOpacity="0.30"/>
              </>
            )}
            {hoveredObject==="shelf"&&(
              <>
                <ellipse cx={bookshelfPos.x+10} cy={bookshelfPos.y+155} rx={108} ry={168} fill="#a855f7" opacity={0.13}/>
                <rect x={bookshelfPos.x-118} y={bookshelfPos.y-30} width={236} height={360} rx={22} fill="#a855f7" opacity={0.04} stroke="#a855f7" strokeWidth="2" strokeOpacity="0.30"/>
              </>
            )}
            {hoveredObject==="char"&&(
              <ellipse cx={charHead.x} cy={charHead.y+130} rx={80} ry={60} fill="#3b82f6" opacity={0.11}/>
            )}
            {hoveredObject==="desk"&&(
              <ellipse cx={deskTop.x} cy={deskTop.y+70} rx={185} ry={70} fill="#d97706" opacity={0.08}/>
            )}
            {hoveredObject==="computer"&&(
              <g className="hover-label">
                <rect x={computerPos.x-74} y={computerPos.y-148} width={148} height={34} rx={17} fill="#111827" opacity={0.90}/>
                <text x={computerPos.x} y={computerPos.y-124} textAnchor="middle" fontSize="18" fontWeight="bold" fill="white">🖥 Computer</text>
              </g>
            )}
            {hoveredObject==="shelf"&&(
              <g className="hover-label">
                <rect x={bookshelfPos.x-76} y={bookshelfPos.y-56} width={152} height={34} rx={17} fill="#111827" opacity={0.90}/>
                <text x={bookshelfPos.x} y={bookshelfPos.y-32} textAnchor="middle" fontSize="18" fontWeight="bold" fill="white">📚 Upgrades</text>
              </g>
            )}
            {hoveredObject==="char"&&(
              <g className="hover-label">
                <rect x={charHead.x-72} y={charHead.y-82} width={144} height={32} rx={16} fill="#111827" opacity={0.84}/>
                <text x={charHead.x} y={charHead.y-60} textAnchor="middle" fontSize="17" fontWeight="bold" fill="white">Developer</text>
              </g>
            )}
            {hoveredObject==="desk"&&(
              <g className="hover-label">
                <rect x={deskTop.x-44} y={deskTop.y-36} width={88} height={32} rx={16} fill="#111827" opacity={0.84}/>
                <text x={deskTop.x} y={deskTop.y-14} textAnchor="middle" fontSize="17" fontWeight="bold" fill="white">Desk</text>
              </g>
            )}
            <AnimatePresence>
              {clickRipple&&(
                <motion.circle key={clickRipple.id}
                  cx={clickRipple.x} cy={clickRipple.y} r={18}
                  fill="none" stroke={clickRipple.color} strokeWidth={5}
                  initial={{r:18,opacity:0.85}} animate={{r:92,opacity:0}}
                  exit={{opacity:0}} transition={{duration:0.52,ease:"easeOut"}}/>
              )}
            </AnimatePresence>
            {currentHint&&(
              <motion.g animate={{opacity:[0.72,1,0.72],y:[0,-5,0]}} transition={{repeat:Infinity,duration:1.8}}>
                <rect x={monitorPos.x-190} y={monitorPos.y-145} width={380} height={38} rx={19} fill="#f59e0b" opacity={0.94}/>
                <text x={monitorPos.x} y={monitorPos.y-120} textAnchor="middle" fontSize="17" fontWeight="bold"
                  fill="white" stroke="rgba(0,0,0,0.2)" strokeWidth="2" paintOrder="stroke">{currentHint}</text>
                <polygon points={`${monitorPos.x},${monitorPos.y-65} ${monitorPos.x-12},${monitorPos.y-98} ${monitorPos.x+12},${monitorPos.y-98}`} fill="#f59e0b"/>
              </motion.g>
            )}
          </svg>
        </div>
      </div>

      {/* ── LEGACY SVG SCENE (hidden after PNG asset migration) ───────────── */}
      {false && (
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
          {tutorialStep==="upgrade"&&(
            <motion.ellipse cx={bookshelfPos.x} cy={bookshelfPos.y+30} rx={30} ry={14}
              fill="#f59e0b" opacity={0}
              animate={{opacity:[0,0.3,0]}} transition={{repeat:Infinity,duration:1.6}}/>
          )}
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

          {/* COMPUTER GLOW before first click — intensifies after 2 missed clicks */}
          {tutorialStep==="start"&&(
            <motion.ellipse cx={computerPos.x} cy={computerPos.y+10}
              rx={missedClicks>=2?72:55} ry={missedClicks>=2?28:22}
              fill="#f59e0b" opacity={0}
              animate={{opacity:missedClicks>=2?[0,0.42,0]:[0,0.22,0]}}
              transition={{repeat:Infinity,duration:missedClicks>=2?1.1:1.6}}/>
          )}
          {/* RELEASE-READY green glow */}
          {readyToRelease&&(
            <motion.ellipse cx={computerPos.x} cy={computerPos.y+10} rx={55} ry={22}
              fill="#22c55e" opacity={0}
              animate={{opacity:[0,0.25,0]}} transition={{repeat:Infinity,duration:1.0}}/>
          )}

          {/* MONITOR HOUSING */}
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
              <rect x={iso(4.3,4.2,2.85).x-40} y={iso(4.3,4.2,2.85).y-8} width={(project?.progress??0)*0.8} height={8} rx={4}
                fill={(project?.progress??0)>=100?"#22c55e":"#f59e0b"}/>
              <text x={iso(4.3,4.2,2.85).x} y={iso(4.3,4.2,2.85).y-12}
                textAnchor="middle" fontSize="9" fill="#fff" fontWeight="bold" stroke="#00000066" strokeWidth="1" paintOrder="stroke">
                {project?.name??""} {Math.floor(project?.progress??0)}%
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

          {/* BUG INDICATORS */}
          {working&&bugCount>0&&(
            <g>
              {Array.from({length:bugCount},(_,i)=>{
                const bx=monitorPos.x-20+(i*10);
                const by=monitorPos.y+12;
                return(
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
            animate={celebrating?{y:[0,-8,0,-6,0,-4,0]}:focusMode==="rest"?{y:[0,-0.5,0]}:tired?{y:[0,-0.5,0]}:working?{y:[0,-3,0,-2.5,0,-1,0]}:{y:[0,-1,0]}}
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
              <motion.g key={actionBurst?.key}
                initial={{opacity:1,scale:0.5}} animate={{opacity:0,scale:2.5}} exit={{opacity:0}}
                transition={{duration:0.6,ease:"easeOut"}}>
                {actionBurst?.type==="design"&&([0,60,120,180,240,300].map((a,i)=>{const r2=a*Math.PI/180;return<circle key={i} cx={charHead.x+Math.cos(r2)*22} cy={charHead.y+Math.sin(r2)*22} r={5} fill="#f59e0b"/>; }))}
                {actionBurst?.type==="tech"&&([0,45,90,135,180,225,270,315].map((a,i)=>{const r2=a*Math.PI/180;return<circle key={i} cx={monitorPos.x+Math.cos(r2)*20} cy={monitorPos.y+Math.sin(r2)*20} r={4} fill="#3b82f6"/>; }))}
                {actionBurst?.type==="fixBugs"&&(<circle cx={monitorPos.x} cy={monitorPos.y} r={36} fill="none" stroke="#22c55e" strokeWidth={3} opacity={0.8}/>)}
                {actionBurst?.type==="crunch"&&(<circle cx={computerPos.x} cy={computerPos.y} r={42} fill="none" stroke="#ef4444" strokeWidth={3} opacity={0.8}/>)}
                {actionBurst?.type==="research"&&([0,60,120,180,240,300].map((a,i)=>{const r2=a*Math.PI/180;return<circle key={i} cx={bookshelfPos.x+Math.cos(r2)*22} cy={bookshelfPos.y+Math.sin(r2)*22} r={5} fill="#a855f7"/>; }))}
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

          {/* ── INVISIBLE HITBOXES (larger click targets) ── */}
          {/* Computer / monitor / desk hitbox */}
          <polygon
            points={`${iso(3.4,4.0,1.72).x},${iso(3.4,4.0,1.72).y} ${iso(5.4,4.0,1.72).x},${iso(5.4,4.0,1.72).y} ${iso(5.4,4.0,2.85).x},${iso(5.4,4.0,2.85).y} ${iso(3.4,4.0,2.85).x},${iso(3.4,4.0,2.85).y}`}
            fill="transparent" style={{cursor:"pointer"}}
            onMouseEnter={()=>onObjectHover("computer")} onMouseLeave={()=>onObjectHover(null)}
            onClick={onComputerClick}/>
          <polygon
            points={`${iso(3.85,5.75,1.72).x},${iso(3.85,5.75,1.72).y} ${iso(4.75,5.75,1.72).x},${iso(4.75,5.75,1.72).y} ${iso(4.75,5.75,2.85).x},${iso(4.75,5.75,2.85).y} ${iso(3.85,5.75,2.85).x},${iso(3.85,5.75,2.85).y}`}
            fill="transparent" style={{cursor:"pointer"}}
            onMouseEnter={()=>onObjectHover("computer")} onMouseLeave={()=>onObjectHover(null)}
            onClick={onComputerClick}/>
          {/* Bookshelf hitbox */}
          <polygon
            points={`${iso(7.6,0,0).x},${iso(7.6,0,0).y} ${iso(10.5,0,0).x},${iso(10.5,0,0).y} ${iso(10.5,0,5.2).x},${iso(10.5,0,5.2).y} ${iso(7.6,0,5.2).x},${iso(7.6,0,5.2).y}`}
            fill="transparent" style={{cursor:"pointer"}}
            onMouseEnter={()=>onObjectHover("shelf")} onMouseLeave={()=>onObjectHover(null)}
            onClick={(e)=>{e.stopPropagation();onShelfClick(e);}}/>
          {/* Desk hitbox */}
          <polygon
            points={`${iso(3.0,3.0,1.72).x},${iso(3.0,3.0,1.72).y} ${iso(5.5,3.0,1.72).x},${iso(5.5,3.0,1.72).y} ${iso(5.5,7.2,1.72).x},${iso(5.5,7.2,1.72).y} ${iso(3.0,7.2,1.72).x},${iso(3.0,7.2,1.72).y}`}
            fill="transparent" style={{cursor:phase==="idle"?"default":"pointer",pointerEvents:"none"}}
            onMouseEnter={()=>onObjectHover("desk")} onMouseLeave={()=>onObjectHover(null)}/>
          {/* Developer character hitbox */}
          <polygon
            points={`${iso(4.9,4.5,0).x},${iso(4.9,4.5,0).y} ${iso(6.1,4.5,0).x},${iso(6.1,4.5,0).y} ${iso(6.1,4.5,2.5).x},${iso(6.1,4.5,2.5).y} ${iso(4.9,4.5,2.5).x},${iso(4.9,4.5,2.5).y}`}
            fill="transparent" style={{cursor:"default"}}
            onMouseEnter={()=>onObjectHover("char")} onMouseLeave={()=>onObjectHover(null)}/>

          {/* ── HOVER GLOWS ── */}
          {hoveredObject==="computer"&&tutorialStep!=="start"&&(
            <ellipse cx={computerPos.x} cy={computerPos.y+12} rx={62} ry={26} fill="#f59e0b" opacity={0.1}/>
          )}
          {hoveredObject==="computer"&&tutorialStep==="start"&&(
            <ellipse cx={computerPos.x} cy={computerPos.y+12} rx={62} ry={26} fill="#f59e0b" opacity={0.15}/>
          )}
          {hoveredObject==="shelf"&&(
            <ellipse cx={bookshelfPos.x} cy={bookshelfPos.y+28} rx={44} ry={18} fill="#a855f7" opacity={0.1}/>
          )}
          {hoveredObject==="char"&&(
            <ellipse cx={charHead.x} cy={charHead.y+14} rx={30} ry={13} fill="#3b82f6" opacity={0.1}/>
          )}
          {hoveredObject==="desk"&&(
            <ellipse cx={deskTop.x} cy={deskTop.y+10} rx={50} ry={20} fill="#d97706" opacity={0.07}/>
          )}

          {/* ── HOVER LABELS ── */}
          {hoveredObject==="computer"&&(
            <g className="hover-label" style={{pointerEvents:"none"}}>
              <rect x={computerPos.x-36} y={computerPos.y-76} width={72} height={19} rx={9} fill="#111827" opacity={0.82}/>
              <text x={computerPos.x} y={computerPos.y-62} textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="white">Computer</text>
            </g>
          )}
          {hoveredObject==="shelf"&&(
            <g className="hover-label" style={{pointerEvents:"none"}}>
              <rect x={bookshelfPos.x-34} y={bookshelfPos.y-42} width={68} height={19} rx={9} fill="#111827" opacity={0.82}/>
              <text x={bookshelfPos.x} y={bookshelfPos.y-28} textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="white">Upgrades</text>
            </g>
          )}
          {hoveredObject==="char"&&(
            <g className="hover-label" style={{pointerEvents:"none"}}>
              <rect x={charHead.x-36} y={charHead.y-48} width={72} height={19} rx={9} fill="#111827" opacity={0.82}/>
              <text x={charHead.x} y={charHead.y-34} textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="white">Developer</text>
            </g>
          )}
          {hoveredObject==="desk"&&(
            <g className="hover-label" style={{pointerEvents:"none"}}>
              <rect x={deskTop.x-22} y={deskTop.y-42} width={44} height={19} rx={9} fill="#111827" opacity={0.82}/>
              <text x={deskTop.x} y={deskTop.y-28} textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="white">Desk</text>
            </g>
          )}

          {/* ── CLICK RIPPLE ── */}
          <AnimatePresence>
            {clickRipple&&(
              <motion.circle key={clickRipple?.id}
                cx={clickRipple?.x??0} cy={clickRipple?.y??0} r={8}
                fill="none" stroke={clickRipple?.color??"#f59e0b"} strokeWidth={2.5}
                initial={{r:8,opacity:0.85}} animate={{r:46,opacity:0}}
                exit={{opacity:0}} transition={{duration:0.52,ease:"easeOut"}}/>
            )}
          </AnimatePresence>

          {/* PROGRESSIVE HINT — repositioned above monitor screen */}
          {currentHint&&(
            <motion.g animate={{opacity:[0.7,1,0.7],y:[0,-3,0]}} transition={{repeat:Infinity,duration:1.8}}>
              <rect x={monitorPos.x-94} y={monitorPos.y-72} width={188} height={22} rx={11} fill="#f59e0b" opacity={0.93}/>
              <text x={monitorPos.x} y={monitorPos.y-57} textAnchor="middle" fontSize="9.5" fontWeight="bold"
                fill="white" stroke="rgba(0,0,0,0.2)" strokeWidth="1" paintOrder="stroke">{currentHint}</text>
              <polygon points={`${monitorPos.x},${monitorPos.y-20} ${monitorPos.x-6},${monitorPos.y-38} ${monitorPos.x+6},${monitorPos.y-38}`} fill="#f59e0b"/>
            </motion.g>
          )}

          {/* "Try the computer" nudge after 2 missed clicks */}
          {missedClicks>=2&&tutorialStep==="start"&&(
            <motion.g animate={{opacity:[0.8,1,0.8]}} transition={{repeat:Infinity,duration:1.4}}>
              <rect x={computerPos.x-56} y={computerPos.y+28} width={112} height={20} rx={10} fill="#92400e" opacity={0.88}/>
              <text x={computerPos.x} y={computerPos.y+42} textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="#fef3c7">
                Try the computer. →
              </text>
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
      )}

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

      {/* ── ACTIVE CONTRACT PILL ──────────────────────────────────────────── */}
      <AnimatePresence>
        {activeContract&&(
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
            className="absolute top-3 z-20 pointer-events-none"
            style={{left:"160px"}}>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-500/90 border border-amber-400 shadow text-white text-[10px] font-black backdrop-blur whitespace-nowrap">
              <span>{activeContract.job.icon}</span>
              <span className="max-w-[80px] truncate">{activeContract.job.name}</span>
              <span className="opacity-75">·</span>
              <span>{activeContract.weeksLeft}wk</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PROJECT PILL (top-center) ──────────────────────────────────────── */}
      <AnimatePresence>
        {working&&project&&(
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.3}}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pill-appear">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow text-xs font-bold backdrop-blur
              ${readyToRelease?"bg-green-500/90 border-green-400 text-white release-pulse":"bg-white/90 border-gray-200 text-gray-700"}`}>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${readyToRelease?"bg-white":focusMode==="crunch"?"bg-red-500":focusMode==="design"?"bg-amber-400":focusMode==="tech"?"bg-blue-500":"bg-amber-400 animate-pulse"}`}/>
              <span className="font-black truncate max-w-[120px]">{project.name}</span>
              <span className={`text-[10px] ${readyToRelease?"text-white/90":"text-gray-400"}`}>·</span>
              <span className={`text-[10px] whitespace-nowrap ${readyToRelease?"text-white/90":project.progress>=75?"text-orange-500":project.progress>=25?"text-blue-500":"text-gray-400"}`}>{projectStatus}</span>
              <span className={`text-[10px] font-black ${readyToRelease?"text-white":"text-gray-500"}`}>{Math.floor(project.progress)}%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── OBJECTIVE PILL (top-right) ─────────────────────────────────────── */}
      <AnimatePresence>
        {objectiveText&&!pillDismissed&&(
          <motion.div key={objectiveText}
            initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}}
            className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1">
            <div className="bg-white/90 backdrop-blur border border-amber-200 rounded-full shadow px-3 py-1.5 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"/>
              <span className="text-[10px] font-bold text-gray-700 whitespace-nowrap max-w-[180px] truncate">{objectiveText}</span>
              <button onClick={()=>setPillDismissed(true)} className="text-gray-300 hover:text-gray-500 text-[10px] leading-none ml-0.5 transition-colors">✕</button>
            </div>
            {currentTrend&&(
              <div className="bg-amber-50/95 backdrop-blur border border-amber-300 rounded-full shadow-sm px-2.5 py-1 flex items-center gap-1 cursor-default"
                onClick={()=>{analytics.trendBadgeSeen=true; track("trend_badge_seen",{trend:currentTrend.title});}}>
                <span className="text-[9px]">📈</span>
                <span className="text-[9px] font-bold text-amber-700 whitespace-nowrap">Trend: {currentTrend.title} ↑</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LIVE SALES FEED ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {marketFeedGames.length>0&&(
          <motion.div
            data-panel="live-sales-feed"
            initial={{opacity:0,x:24}}
            animate={{opacity:1,x:0}}
            exit={{opacity:0,x:24}}
            className="absolute top-24 right-3 z-20 w-[260px] pointer-events-none"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot"/>
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-700">Live Sales</div>
              </div>
              <div className="text-[9px] font-bold text-gray-400">week-by-week</div>
            </div>
            <div className="flex flex-col gap-2">
              {marketFeedGames.map(game=>{
                const recentBars = game.weeklySales.slice(-10);
                const maxBar = Math.max(1,...recentBars.map(w=>w.chartValue));
                const latest = game.weeklySales[game.weeklySales.length-1] ?? null;
                const first = game.weeklySales[0]?.units ?? 0;
                const isLive = game.status==="active_on_market";
                const cooling = isLive && latest!==null && first>0 && latest.units<first*0.45;
                const statusLabel = game.status==="finished"?"Finished":cooling?"Cooling Down":"Selling";
                const statusColor = game.status==="finished"?"text-gray-400":cooling?"text-amber-500":"text-green-600";
                return(
                  <motion.div
                    key={game.id}
                    layout
                    initial={{opacity:0,y:8}}
                    animate={{opacity:1,y:0}}
                    exit={{opacity:0,y:-8}}
                    className={`rounded-xl border backdrop-blur shadow-lg p-2.5 transition-colors ${
                      game.status==="finished"
                        ?"border-gray-200 bg-white/70 opacity-70"
                        :"border-green-300/60 bg-white/95"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="font-black text-[12px] text-gray-900 truncate">{game.title}</div>
                        <div className="text-[9px] text-gray-400 truncate">{game.topic} · {game.genre}</div>
                      </div>
                      <div className={`flex items-center gap-1 shrink-0`}>
                        {isLive&&!cooling&&(
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot"/>
                        )}
                        <div className={`text-[9px] font-black ${statusColor}`}>{statusLabel}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 mb-2">
                      <div className="rounded-lg bg-gray-50 px-1.5 py-1 text-center">
                        <div className="text-[10px] font-black text-gray-800">{game.totalUnits.toLocaleString()}</div>
                        <div className="text-[8px] font-bold text-gray-400">units</div>
                      </div>
                      <div className="rounded-lg bg-green-50 px-1.5 py-1 text-center">
                        <div className="text-[11px] font-black text-green-700">${game.totalRevenue.toLocaleString()}</div>
                        <div className="text-[8px] font-bold text-green-500">revenue</div>
                      </div>
                      <div className="rounded-lg bg-amber-50 px-1.5 py-1 text-center">
                        <div className="text-[10px] font-black text-amber-700">{latest?latest.units.toLocaleString():"-"}</div>
                        <div className="text-[8px] font-bold text-amber-500">this wk</div>
                      </div>
                    </div>
                    <div className="h-12 rounded-lg bg-gray-900/90 px-2 py-1.5 flex items-end gap-1 overflow-hidden">
                      {recentBars.length===0?(
                        <div className="w-full text-center text-[9px] font-bold text-gray-600 pb-3">waiting for week 1</div>
                      ):recentBars.map(bar=>(
                        <motion.div
                          key={`${game.id}-${bar.week}`}
                          initial={{height:0,opacity:0.5}}
                          animate={{height:Math.max(4,Math.round((bar.chartValue/maxBar)*34)),opacity:1}}
                          transition={{duration:0.35,ease:"easeOut"}}
                          className={`flex-1 rounded-t ${
                            game.status==="finished"
                              ?"bg-gray-500"
                              :bar.week===latest?.week
                                ?"bg-amber-400 latest-bar"
                                :"bg-green-500"
                          }`}
                        />
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {salesLogRows.length>0&&(
              <div className="mt-2 rounded-xl border border-gray-800 bg-gray-950/90 backdrop-blur shadow-lg p-2 overflow-hidden">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1 h-1 rounded-full bg-amber-500 live-dot"/>
                  <div className="text-[9px] font-black uppercase tracking-widest text-gray-500">Sales ticker</div>
                </div>
                <div className="flex flex-col gap-1 max-h-[128px] overflow-hidden">
                  <AnimatePresence initial={false}>
                    {salesLogRows.slice(-6).map((row,i,rows)=>(
                      <motion.div
                        layout
                        key={row.id}
                        initial={{opacity:0,y:10}}
                        animate={{opacity:i===rows.length-1?1:0.45+0.08*i,y:0}}
                        exit={{opacity:0,y:-10}}
                        transition={{duration:0.22}}
                        className={`rounded-lg px-2 py-1.5 text-[9px] leading-tight ${i===rows.length-1?"bg-amber-500/15 text-amber-100":"bg-gray-900/80 text-gray-500"}`}
                      >
                        {row.text}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── UPGRADE BOUGHT TOAST ──────────────────────────────────────────── */}
      <AnimatePresence>
        {lastBuyMessage&&(
          <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}}
            className="absolute top-14 right-3 z-30 bg-green-600 text-white text-[11px] font-bold px-4 py-2 rounded-xl shadow-lg max-w-[200px] leading-snug">
            ✓ {lastBuyMessage}
          </motion.div>
        )}
      </AnimatePresence>

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
                const owned  = upgrades.has(upg.id);
                const afford = cash>=upg.cost;
                return(
                  <div key={upg.id} data-testid={`upgrade-${upg.id}`}
                    onClick={()=>!owned&&afford&&buyUpgrade(upg.id,upg.cost)}
                    className={`p-2.5 rounded-xl border text-xs transition-all ${owned?"bg-green-50 border-green-200":afford?"bg-white border-gray-200 hover:bg-amber-50 cursor-pointer active:scale-95":"bg-gray-50 border-gray-100 opacity-50"}`}>
                    <div className="font-bold text-gray-800">{upg.name}</div>
                    <div className="text-gray-400 text-[10px] mt-0.5">{upg.desc}</div>
                    {owned&&<div className="text-[10px] text-green-600 mt-1 italic">{upg.nextGame}</div>}
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

      {/* ── STUDIO CONTEXT MENU ───────────────────────────────────────────── */}
      <AnimatePresence>
        {studioMenu&&phase!=="releasing"&&(
          <motion.div
            initial={{opacity:0,scale:0.92,y:-8}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.92,y:-8}}
            transition={{duration:0.13,ease:"easeOut"}}
            data-panel="studio-menu"
            onClick={e=>e.stopPropagation()}
            className="absolute z-50 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-xl shadow-2xl overflow-hidden w-52"
            style={{
              left:`min(${studioMenu.x}px, calc(100% - 216px))`,
              top:`min(${studioMenu.y}px, calc(100% - ${menuItems.length*48+12}px))`,
            }}
          >
            <div className="px-3 pt-2.5 pb-1.5 border-b border-gray-700/60">
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Studio Actions</div>
            </div>
            {menuItems.map((item,i)=>(
              <button key={item.action}
                disabled={item.disabled}
                onClick={item.disabled
                  ? ()=>{ analytics.clickedLockedMenuItem++; track("clicked_locked_menu_item",{action:item.action,count:analytics.clickedLockedMenuItem}); }
                  : ()=>handleMenuAction(item.action)}
                onMouseEnter={()=>setMenuSelectedIdx(i)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                  item.disabled
                    ?"opacity-35 cursor-not-allowed"
                    :i===menuSelectedIdx
                    ?"bg-amber-500 text-white"
                    :"text-gray-200 hover:bg-gray-700/70"
                }`}
              >
                <span className="text-[15px] leading-none">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold leading-tight">{item.label}</div>
                  {item.disabled&&item.sub&&(
                    <div className="text-[9px] opacity-60 mt-0.5">{item.sub}</div>
                  )}
                </div>
              </button>
            ))}
            <div className="px-3 py-1.5 border-t border-gray-700/60">
              <div className="text-[9px] text-gray-600">Esc to close · ↑↓ navigate · Enter select</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HISTORY MODAL ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showHistory&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={e=>{if(e.target===e.currentTarget)setShowHistory(false);}}>
            <motion.div data-panel="history"
              initial={{scale:0.9,y:20}} animate={{scale:1,y:0}} exit={{scale:0.9,y:20}}
              transition={{type:"spring",damping:22}}
              className="bg-white rounded-2xl shadow-2xl p-5 w-[370px] max-h-[80vh] overflow-y-auto border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Studio Catalog</div>
                  <div className="text-lg font-black text-gray-900">Game History</div>
                </div>
                <button onClick={()=>setShowHistory(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
              </div>
              {history.length===0?(
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">🎮</div>
                  <div className="text-sm">No games released yet.</div>
                  <div className="text-xs mt-1 text-gray-300">Start developing to build your catalog.</div>
                </div>
              ):(
                <>
                  <div className="flex flex-col gap-2">
                    {[...history].reverse().map((g,i)=>(
                      <div key={i} className="border border-gray-100 rounded-xl p-3 hover:border-gray-200 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-black text-sm text-gray-900 truncate">{g.name}</div>
                            <div className="text-[10px] text-gray-400">{g.topic} · {g.genre} · {g.platform}</div>
                            <div className="text-[10px] text-gray-300">Y{g.year} W{g.week}</div>
                            <div className={`text-[9px] font-black mt-1 ${g.status==="finished"?"text-gray-400":g.status==="active_on_market"?"text-green-600":"text-amber-500"}`}>
                              {g.status==="finished"?"Finished":g.status==="active_on_market"?"Active on market":"In review"}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`text-xl font-black ${g.score>=7?"text-green-600":g.score>=5?"text-amber-500":"text-red-500"}`}>{g.score}<span className="text-sm font-normal text-gray-300">/10</span></div>
                            <div className="text-[10px] text-green-600 font-bold">${g.revenue.toLocaleString()}</div>
                            <div className="text-[10px] text-violet-500">+{g.fansGained} fans</div>
                            <div className="text-[10px] text-gray-400">{g.unitsSold.toLocaleString()} units</div>
                          </div>
                        </div>
                        <details className="mt-2 rounded-lg bg-gray-50 px-2 py-1.5">
                          <summary className="cursor-pointer select-none text-[10px] font-black text-gray-500">Why this score?</summary>
                          <div className="mt-1.5 flex flex-col gap-1">
                            {g.diagnosis.map((f,idx)=>(
                              <div key={idx} className={`flex items-start gap-1.5 text-[10px] rounded-md px-2 py-1 ${f.sentiment==="pos"?"bg-green-50 text-green-700":f.sentiment==="neg"?"bg-red-50 text-red-600":"bg-white text-gray-500"}`}>
                                <span className="shrink-0">{f.icon}</span>
                                <span>{f.text}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                        {g.score===bestScore&&history.length>1&&(
                          <div className="mt-1 text-[9px] text-amber-500 font-black">⭐ Best score</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-5 text-xs text-gray-500">
                    <span>Games: <b className="text-gray-800">{history.length}</b></span>
                    <span>Best: <b className="text-gray-800">{bestScore}/10</b></span>
                    <span>Best rev: <b className="text-green-600">${bestRevenue.toLocaleString()}</b></span>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CONTRACT WORK MODAL ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showContractWork&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={e=>{if(e.target===e.currentTarget)setShowContractWork(false);}}>
            <motion.div data-panel="contract-work"
              initial={{scale:0.9,y:20}} animate={{scale:1,y:0}} exit={{scale:0.9,y:20}}
              transition={{type:"spring",damping:22}}
              className="bg-white rounded-2xl shadow-2xl p-5 w-[380px] max-h-[85vh] overflow-y-auto border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Freelance Board</div>
                  <div className="text-lg font-black text-gray-900">Contract Work</div>
                </div>
                <button onClick={()=>setShowContractWork(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
              </div>

              {activeContract&&(
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{activeContract.job.icon}</span>
                    <div>
                      <div className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Active Contract</div>
                      <div className="font-black text-sm text-gray-900">{activeContract.job.name}</div>
                      <div className="text-[10px] text-gray-500">{activeContract.job.client}</div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-xs font-black text-green-600">${activeContract.job.payout.toLocaleString()}</div>
                      <div className="text-[10px] text-gray-400">{activeContract.weeksLeft}wk left</div>
                    </div>
                  </div>
                  <div className="bg-amber-200/50 rounded-full h-2 overflow-hidden">
                    <div className="bg-amber-500 h-2 rounded-full transition-all"
                      style={{width:`${((activeContract.weeksTotal-activeContract.weeksLeft)/activeContract.weeksTotal)*100}%`}}/>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {contractJobs.map((job,i)=>(
                  <div key={i} className="border border-gray-100 rounded-xl p-3.5 hover:border-gray-200 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{job.icon}</span>
                        <div>
                          <div className="font-black text-sm text-gray-900">{job.name}</div>
                          <div className="text-[10px] text-gray-400">{job.client}</div>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${job.difficulty==="Easy"?"bg-green-100 text-green-700":job.difficulty==="Medium"?"bg-amber-100 text-amber-700":"bg-red-100 text-red-700"}`}>
                        {job.difficulty}
                      </span>
                    </div>
                    <div className="flex gap-3 text-[10px] text-gray-500 mb-2.5">
                      <span>💰 <b className="text-green-600">${job.payout.toLocaleString()}</b></span>
                      <span>⏱ {job.durationWeeks} weeks</span>
                      <span>👥 +{job.fansBonus} fans</span>
                    </div>
                    <button
                      disabled={!!activeContract}
                      onClick={()=>acceptContract(job)}
                      className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs transition-colors active:scale-95">
                      {activeContract?"Contract Active":"Accept Contract"}
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[10px] text-gray-400 text-center">Contracts run in the background while you develop games.</div>
            </motion.div>
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
              className="bg-white rounded-2xl shadow-2xl p-5 w-[350px] max-h-[92vh] overflow-y-auto border border-gray-100"
            >
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider">New Project</h2>
                <button onClick={randomizeForm} className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-violet-100 text-violet-600 hover:bg-violet-200 transition-colors active:scale-95">
                  🎲 Randomize
                </button>
              </div>

              {/* Previous game comparison card */}
              {lastGame&&(
                <div className="mb-3 p-3 rounded-xl border border-gray-100 bg-gray-50 text-xs">
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Last Release</div>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-gray-700 truncate max-w-[120px]">{lastGame.name}</div>
                      <div className="text-[10px] text-gray-400">{lastGame.topic} · {lastGame.genre}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-black ${lastGame.score>=7?"text-green-600":lastGame.score>=5?"text-amber-600":"text-red-500"}`}>{lastGame.score}/10</div>
                      <div className="text-green-600 text-[10px]">${lastGame.revenue.toLocaleString()}</div>
                    </div>
                  </div>
                  {history.length>1&&(
                    <div className="flex gap-3 mt-1.5 text-[10px] text-gray-400">
                      <span>Best score: <b className="text-gray-600">{bestScore}/10</b></span>
                      <span>Best rev: <b className="text-green-600">${bestRevenue.toLocaleString()}</b></span>
                    </div>
                  )}
                  {nextTarget&&(
                    <div className="mt-1.5 pt-1.5 border-t border-gray-100 text-[10px] font-bold text-amber-600">
                      🎯 {nextTarget.text}
                    </div>
                  )}
                </div>
              )}

              {/* Active upgrade bonuses */}
              {activeBonuses.length>0&&(
                <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-[10px] text-blue-700 font-semibold">
                  Active bonuses: {activeBonuses.join(" · ")}
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
                  {TOPICS.map(t=>{
                    const isTrendingTopic = currentTrend&&(currentTrend.type==="topic"&&currentTrend.target===t||(currentTrend.type==="combo"&&currentTrend.topic===t));
                    return(
                      <button key={t} onClick={()=>setFormTopic(t)}
                        className={`relative text-[11px] py-1.5 px-1 rounded-lg border font-semibold transition-all active:scale-95 ${formTopic===t?"bg-amber-400 border-amber-500 text-white shadow-sm":"bg-gray-50 border-gray-200 text-gray-600 hover:bg-amber-50"}`}>
                        {t}
                        {isTrendingTopic&&<span className="absolute -top-1.5 -right-1 text-[7px] font-black bg-orange-400 text-white rounded-full px-1 leading-tight">↑</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-3">
                <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Genre</span>
                <div className="grid grid-cols-3 gap-1">
                  {GENRES.map(g=>{
                    const isTrendingGenre = currentTrend&&(currentTrend.type==="genre"&&currentTrend.target===g||(currentTrend.type==="combo"&&currentTrend.genre===g));
                    return(
                      <button key={g} onClick={()=>setFormGenre(g)}
                        className={`relative text-[11px] py-1.5 px-1 rounded-lg border font-semibold transition-all active:scale-95 ${formGenre===g?"bg-blue-400 border-blue-500 text-white shadow-sm":"bg-gray-50 border-gray-200 text-gray-600 hover:bg-blue-50"}`}>
                        {g}
                        {isTrendingGenre&&<span className="absolute -top-1.5 -right-1 text-[7px] font-black bg-orange-400 text-white rounded-full px-1 leading-tight">↑</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-3">
                <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Platform</span>
                <div className="flex flex-col gap-1">
                  {PLATFORMS.map(pl=>{
                    const isTrendingPlatform = currentTrend&&currentTrend.type==="platform"&&currentTrend.target===pl;
                    return(
                      <button key={pl} onClick={()=>setFormPlatform(pl)}
                        className={`relative text-[11px] py-1.5 px-3 rounded-lg border text-left font-semibold transition-all active:scale-95 ${formPlatform===pl?"bg-violet-400 border-violet-500 text-white shadow-sm":"bg-gray-50 border-gray-200 text-gray-600 hover:bg-violet-50"}`}>
                        {pl}{PLATFORM_MOD[pl].techReq>0?<span className="opacity-60 ml-1 text-[9px]">(needs T&gt;{PLATFORM_MOD[pl].techReq})</span>:""}
                        {isTrendingPlatform&&<span className="ml-1.5 text-[8px] font-black text-orange-500 align-middle">↑ Trending</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Market trend match indicator */}
              {currentTrend&&trendMatchesForm(formTopic,formGenre,formPlatform,currentTrend)&&(
                <div className="mb-2 px-2.5 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-[10px] font-bold text-orange-700 flex items-center gap-1.5">
                  <span>📈</span>
                  <span>This matches the current market trend — <em>{currentTrend.title}</em></span>
                </div>
              )}

              {/* Combo quality + discovered history */}
              <div className={`text-[11px] px-2.5 py-1.5 rounded-lg mb-2 font-semibold ${formCombo>=1.4?"bg-green-50 text-green-700 border border-green-200":formCombo<=0.8?"bg-red-50 text-red-600 border border-red-200":"bg-gray-50 text-gray-500 border border-gray-100"}`}>
                {formCombo>=1.4?`✓ Great combo! ${formTopic} × ${formGenre} works perfectly.`:formCombo<=0.8?`✗ Weak combo. ${formTopic} and ${formGenre} clash.`:`Decent combo for ${formTopic} ${formGenre}.`}
              </div>

              {/* Discovered combo memory */}
              {priorCombo&&(
                <div className={`text-[11px] px-2.5 py-1.5 rounded-lg mb-3 border flex items-center gap-2 ${priorCombo.label==="Great Match"?"bg-green-50 border-green-200 text-green-700":priorCombo.label==="Good Match"?"bg-blue-50 border-blue-200 text-blue-700":priorCombo.label==="Weak Match"?"bg-orange-50 border-orange-200 text-orange-700":"bg-red-50 border-red-200 text-red-600"}`}>
                  <span>🕹</span>
                  <span>You tried this before — scored <b>{priorCombo.score}/10</b> · <b>{priorCombo.label}</b></span>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={()=>setShowNewGame(false)} className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button onClick={startProject} data-testid="button-start" className="flex-2 px-8 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-sm transition-colors active:scale-95 shadow-md shadow-amber-200">▶ Start Game</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── RELEASE FLOW OVERLAY ───────────────────────────────────────────── */}
      <AnimatePresence>
        {releaseFlow&&reviewResult&&phase==="releasing"&&(()=>{
          const flow = releaseFlow;
          const sc = (s:number) => s>=8?"text-green-400":s>=6.5?"text-amber-400":s>=5?"text-orange-400":"text-red-400";
          const OUTLET_ICONS = ["💾","🕹️","💻","🌐"];
          const prev = history.slice(0,-1);
          const prevBest    = prev.length>0?Math.max(...prev.map(g=>g.score)):0;
          const prevBestRev = prev.length>0?Math.max(...prev.map(g=>g.revenue)):0;
          const prevBugs    = prev.length>0?prev[prev.length-1].bugs:null;
          const currBugs    = history[history.length-1]?.bugs??0;
          const isNewBestScore   = prev.length>0&&reviewResult.score>prevBest;
          const isNewBestRevenue = prev.length>0&&reviewResult.revenue>prevBestRev;
          const fewerBugs        = prevBugs!==null&&currBugs<prevBugs;

          const reactionData = reviewResult.score>=8.5
            ?{emoji:"🎉",title:"Breakout Hit!",sub:"Critics are raving. Players love it.",bg:"from-green-950 to-gray-950",ring:"border-green-700"}
            :reviewResult.score>=7
            ?{emoji:"😊",title:"The game is getting attention!",sub:"Strong reviews. Well done.",bg:"from-blue-950 to-gray-950",ring:"border-blue-700"}
            :reviewResult.score>=5
            ?{emoji:"😐",title:"A decent first step.",sub:"Shows promise. Some rough edges to smooth out.",bg:"from-amber-950 to-gray-950",ring:"border-amber-700"}
            :{emoji:"😰",title:"Critics were not impressed.",sub:"Stronger combo and fewer bugs next time.",bg:"from-red-950 to-gray-950",ring:"border-red-800"};

          const rec = scoreRecommendation(reviewResult.score);
          const maxUnits = flow.salesWeeks.length>0?Math.max(...flow.salesWeeks.map(w=>w.units)):1;

          return(
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <motion.div data-panel="release-flow"
                key={flow.phase}
                initial={{scale:0.88,opacity:0,y:24}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.88,opacity:0,y:24}}
                transition={{type:"spring",damping:22,stiffness:280}}
                className="bg-gray-950 text-white rounded-2xl shadow-2xl border border-gray-800 w-[380px] overflow-hidden"
              >

                {/* ── PHASE: REVIEWS ── */}
                {flow.phase==="reviews"&&(
                  <div className="p-5">
                    <div className="text-center mb-3">
                      <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Press Reviews</div>
                      <div className="text-base font-black text-white mt-0.5 truncate">{reviewResult.gameName}</div>
                      <div className="text-[10px] text-gray-500">{project?.topic} · {project?.genre} · {project?.platform}</div>
                    </div>

                    {/* 4 reviewer slots */}
                    <div className="flex gap-1.5 mb-3">
                      {reviewResult.reviewers.map((r,i)=>(
                        <div key={i} className={`flex-1 flex flex-col items-center gap-1 rounded-xl py-2 px-1 transition-all ${
                          i<flow.reviewIndex?"bg-gray-800/80"
                          :i===flow.reviewIndex&&flow.reviewIndex<4?"bg-gray-800 ring-1 ring-amber-500/50"
                          :"bg-gray-900"
                        }`}>
                          <span className="text-base leading-none">{OUTLET_ICONS[i]}</span>
                          <div className={`text-[10px] font-black transition-all ${i<flow.reviewIndex?sc(r.score):"text-gray-700"}`}>
                            {i<flow.reviewIndex?r.score:"—"}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Review card or average */}
                    <AnimatePresence mode="wait">
                      {flow.reviewIndex<4?(
                        <motion.div key={`rev-${flow.reviewIndex}`}
                          initial={{opacity:0,x:28}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-28}}
                          transition={{duration:0.18}}
                          className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-3" style={{minHeight:"130px"}}>
                          <div className="flex items-center gap-2.5 mb-3">
                            <span className="text-2xl leading-none">{OUTLET_ICONS[flow.reviewIndex]}</span>
                            <div>
                              <div className="font-black text-sm text-white leading-tight">{reviewResult.reviewers[flow.reviewIndex].outlet}</div>
                              <div className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">
                                {flow.reviewSubPhase==="entering"?"reading…":"review"}
                              </div>
                            </div>
                          </div>
                          <AnimatePresence>
                            {flow.reviewSubPhase!=="entering"&&(
                              <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.22}}>
                                <div className="text-[11px] text-gray-400 italic mb-3 leading-relaxed">
                                  "{reviewResult.reviewers[flow.reviewIndex].blurb}"
                                </div>
                                <div className={`text-5xl font-black text-center transition-colors ${
                                  flow.reviewSubPhase==="rolling"
                                    ?sc(reviewDisplayScore||reviewResult.reviewers[flow.reviewIndex].score)
                                    :sc(reviewResult.reviewers[flow.reviewIndex].score)
                                }`}>
                                  {flow.reviewSubPhase==="settled"
                                    ?reviewResult.reviewers[flow.reviewIndex].score
                                    :reviewDisplayScore>0?reviewDisplayScore.toFixed(1):"…"}
                                  <span className="text-lg text-gray-600 ml-1">/10</span>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ):(
                        <motion.div key="avg"
                          initial={{opacity:0,scale:0.88}} animate={{opacity:1,scale:1}}
                          className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-3 text-center" style={{minHeight:"130px"}}>
                          <div className="text-[10px] text-gray-500 uppercase font-black tracking-wider mb-3">Average Score</div>
                          <div className={`text-6xl font-black transition-colors ${
                            flow.reviewSubPhase==="rolling"
                              ?sc(reviewDisplayScore||reviewResult.score)
                              :sc(reviewResult.score)
                          }`}>
                            {flow.reviewSubPhase==="settled"
                              ?reviewResult.score
                              :reviewDisplayScore>0?reviewDisplayScore.toFixed(1):"…"}
                            <span className="text-lg text-gray-600 ml-1">/10</span>
                          </div>
                          <div className="flex justify-center gap-4 mt-3">
                            {reviewResult.reviewers.map((r,i)=>(
                              <div key={i} className={`text-[11px] font-black ${sc(r.score)}`}>{r.score}</div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="text-center text-[9px] text-gray-700 mt-1.5">Reviews continue automatically.</div>
                  </div>
                )}

                {/* ── PHASE: REACTION ── */}
                {flow.phase==="reaction"&&(
                  <div className={`p-6 bg-gradient-to-b ${reactionData.bg}`}>
                    <div className={`border ${reactionData.ring} rounded-2xl p-6 text-center`}>
                      <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:"spring",damping:10}}
                        className="text-6xl mb-4">{reactionData.emoji}</motion.div>
                      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.18}}
                        className="text-xl font-black text-white mb-2">{reactionData.title}</motion.div>
                      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.35}}
                        className="text-sm text-gray-400">{reactionData.sub}</motion.div>
                      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.6}}
                        className={`text-4xl font-black mt-4 ${sc(reviewResult.score)}`}>{reviewResult.score}<span className="text-base text-gray-500">/10</span></motion.div>
                    </div>
                    <motion.button initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5}}
                      onClick={handleStartSalesPhase}
                      className="mt-4 w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black text-sm active:scale-95">
                      Back to Garage
                    </motion.button>
                    <div className="text-center text-[10px] text-gray-600 mt-2">Sales start on the side panel in 3s...</div>
                  </div>
                )}

                {/* ── PHASE: SALES ── */}
                {flow.phase==="sales"&&(
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 mr-2">
                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Sales Results</div>
                        <div className="text-sm font-black text-white truncate">{reviewResult.gameName}</div>
                      </div>
                      <div className={`text-xl font-black flex-shrink-0 ${sc(reviewResult.score)}`}>
                        {reviewResult.score}<span className="text-xs text-gray-600">/10</span>
                      </div>
                    </div>

                    {/* Mini bar chart */}
                    <div className="bg-gray-900 rounded-xl px-2 pt-2 pb-1 mb-3 border border-gray-800">
                      <div className="text-[9px] text-gray-600 font-bold mb-1 px-1">Weekly Sales</div>
                      <svg width="100%" height="48" viewBox={`0 0 ${Math.max(1,flow.salesWeeks.length)*26} 48`} preserveAspectRatio="none" className="overflow-visible">
                        {flow.salesWeeks.map((w,i)=>{
                          const barH=maxUnits>0?Math.max(3,Math.round((w.units/maxUnits)*40)):3;
                          const revealed=i<flow.salesIndex;
                          const isCurr=i===flow.salesIndex-1;
                          const fill=!revealed?"#1f2937":isCurr?"#f59e0b":reviewResult.score>=7?"#22c55e":reviewResult.score>=5?"#f59e0b":"#ef4444";
                          return(
                            <motion.rect key={i}
                              x={i*26+3} y={48-barH} width={20} height={barH}
                              fill={fill} rx={3}
                              initial={revealed&&isCurr?{opacity:0}:undefined}
                              animate={{opacity:1}}
                              transition={{duration:0.3}}
                            />
                          );
                        })}
                      </svg>
                    </div>

                    {/* Latest week row */}
                    <AnimatePresence mode="popLayout">
                      {flow.salesIndex>0&&(
                        <motion.div key={flow.salesIndex}
                          initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                          transition={{duration:0.22}}
                          className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 mb-2.5 text-[11px]">
                          <span className="text-amber-400 font-black">W{flow.salesWeeks[flow.salesIndex-1].week}</span>
                          <span className="text-gray-300">{flow.salesWeeks[flow.salesIndex-1].units.toLocaleString()} units</span>
                          <span className="text-green-400 font-black">${flow.salesWeeks[flow.salesIndex-1].revenue.toLocaleString()}</span>
                          <span className="text-violet-400">+{flow.salesWeeks[flow.salesIndex-1].fans}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Running totals */}
                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                      {[
                        {label:"Revenue",val:`$${flow.runningRevenue.toLocaleString()}`,cls:"text-green-400"},
                        {label:"Fans",val:`+${flow.runningFans}`,cls:"text-violet-400"},
                        {label:"Progress",val:`${flow.salesIndex}/${flow.salesWeeks.length}`,cls:flow.salesPaused?"text-amber-400":"text-gray-400"},
                      ].map(s=>(
                        <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-2 text-center">
                          <div className="text-[9px] text-gray-500 uppercase font-black">{s.label}</div>
                          <div className={`text-sm font-black mt-0.5 ${s.cls}`}>{s.val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Controls */}
                    <div className="flex gap-2">
                      <button
                        onClick={()=>{
                          if(!flow.salesPaused) analytics.salesWasPaused=true;
                          track(flow.salesPaused?"sales_resumed":"sales_paused",{week:flow.salesIndex});
                          setReleaseFlow(f=>f?{...f,salesPaused:!f.salesPaused}:f);
                        }}
                        className={`flex-1 py-2 rounded-xl font-black text-xs active:scale-95 transition-colors ${
                          flow.salesPaused?"bg-amber-500 text-white hover:bg-amber-600":"bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}>
                        {flow.salesPaused?"▶ Resume":"⏸ Pause"}
                      </button>
                      <button
                        onClick={()=>{
                          analytics.salesSpeedChanged=true;
                          const newSpeed:1|2=flow.salesSpeed===2?1:2;
                          track("sales_speed_changed",{speed:newSpeed});
                          setReleaseFlow(f=>f?{...f,salesSpeed:newSpeed}:f);
                        }}
                        className={`px-3 py-2 rounded-xl font-black text-xs active:scale-95 transition-colors border ${
                          flow.salesSpeed===2?"bg-blue-600 text-white border-blue-500":"bg-gray-900 text-gray-400 border-gray-700 hover:bg-gray-800"
                        }`}>
                        {flow.salesSpeed===2?"x2":"x1"}
                      </button>
                      <button onClick={handleSkipToSummary}
                        className="px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 text-gray-500 hover:text-gray-300 text-xs active:scale-95 transition-colors">
                        Skip →
                      </button>
                    </div>
                    <div className="text-center text-[9px] text-gray-700 mt-1.5">Esc to skip to summary</div>
                  </div>
                )}

                {/* ── PHASE: SUMMARY ── */}
                {flow.phase==="summary"&&(
                  <div className="p-6">
                    {/* Title + score */}
                    <div className="text-center mb-4">
                      <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Final Summary</div>
                      <div className="text-lg font-black text-white mt-0.5 truncate">{reviewResult.gameName}</div>
                      <motion.div initial={{scale:0.5,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring",damping:12,delay:0.1}}
                        className={`text-5xl font-black mt-2 ${sc(reviewResult.score)}`}>{reviewResult.score}
                        <span className="text-base text-gray-600">/10</span>
                      </motion.div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        {label:"Revenue",val:`$${flow.runningRevenue.toLocaleString()}`,cls:"text-green-400"},
                        {label:"Fans",val:`+${flow.runningFans.toLocaleString()}`,cls:"text-violet-400"},
                        {label:"Units",val:flow.runningUnits.toLocaleString(),cls:"text-white"},
                      ].map(s=>(
                        <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-2 text-center">
                          <div className="text-[9px] text-gray-500 uppercase font-black">{s.label}</div>
                          <div className={`text-sm font-black mt-0.5 ${s.cls}`}>{s.val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Celebration badges */}
                    {(isNewBestScore||isNewBestRevenue||fewerBugs||reviewResult.trendMatched)&&(
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {isNewBestScore  &&<span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white">⭐ New best score!</span>}
                        {isNewBestRevenue&&<span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-600 text-white">💰 Revenue record!</span>}
                        {fewerBugs       &&<span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-600 text-white">🐛 Fewer bugs!</span>}
                        {reviewResult.trendMatched&&<span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-500 text-white">📈 Trend matched!</span>}
                      </div>
                    )}

                    {/* Prev comparison */}
                    {prev.length>0&&(
                      <div className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 mb-3 flex gap-3 text-[11px]">
                        <div>Score: <span className={`font-black ${isNewBestScore?"text-green-400":"text-gray-400"}`}>{reviewResult.score} {isNewBestScore?"↑ new best":"(best "+prevBest+")"}</span></div>
                        <div>Rev: <span className={`font-black ${isNewBestRevenue?"text-green-400":"text-gray-400"}`}>${flow.runningRevenue.toLocaleString()} {isNewBestRevenue?"↑":""}</span></div>
                      </div>
                    )}

                    {/* Why this score? — collapsible */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl mb-3 overflow-hidden">
                      <button onClick={()=>setShowDiagnosis(d=>!d)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-black text-gray-400 hover:text-gray-200">
                        <span>🔍 Why this score?</span>
                        <span className={`text-gray-600 transition-transform ${showDiagnosis?"rotate-180":""}`}>▾</span>
                      </button>
                      <AnimatePresence>
                        {showDiagnosis&&(
                          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}
                            className="overflow-hidden">
                            <div className="px-3 pb-3 flex flex-col gap-1">
                              {diagnosis.map((f,i)=>(
                                <div key={i} className={`flex items-start gap-2 text-[11px] rounded-lg px-2 py-1.5 ${f.sentiment==="pos"?"bg-green-950/60 text-green-300":f.sentiment==="neg"?"bg-red-950/60 text-red-300":"bg-gray-800 text-gray-400"}`}>
                                  <span className="text-sm leading-none mt-0.5 flex-shrink-0">{f.icon}</span>
                                  <span>{f.text}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Next target */}
                    {nextTarget&&(
                      <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl">
                        <span className="text-amber-400">🎯</span>
                        <div>
                          <div className="text-[9px] text-gray-500 uppercase font-black">Next target</div>
                          <div className="text-xs font-black text-white">{nextTarget.text}</div>
                        </div>
                      </div>
                    )}
                    <div className={`text-[11px] mb-4 ${rec.color}`}>{rec.text}</div>

                    <button onClick={completeRelease} data-testid="button-back"
                      className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm transition-colors active:scale-95">
                      Back to the Garage
                    </button>
                  </div>
                )}

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

      {/* ── PLAYTEST MODE ──────────────────────────────────────────────────── */}
      {PLAYTEST_MODE&&(
        <>
          {/* End Playtest button */}
          {!showPlaytestSummary&&(
            <button
              data-interactive="true"
              onClick={()=>setShowPlaytestSummary(true)}
              className="absolute bottom-3 left-3 z-50 text-[10px] font-bold text-gray-400 hover:text-white bg-gray-900/70 backdrop-blur border border-gray-700/60 hover:border-gray-500 rounded-lg px-2.5 py-1.5 transition-all select-none">
              End Playtest
            </button>
          )}

          {/* Playtest Summary Modal */}
          <AnimatePresence>
            {showPlaytestSummary&&(()=>{
              const t0 = analytics.sessionStartedAt;
              const now = Date.now();
              const elapsedSec = (now-t0)/1000;
              const relSec = (ts:number|null)=>ts===null?"—":((ts-t0)/1000).toFixed(1)+"s";
              const f = analytics.flags;
              const verdict = !f.startedFirstProject
                ? {label:"Onboarding failed",color:"bg-red-600",text:"No project started within the session. Onboarding did not activate the player."}
                : !f.releasedFirstGame
                  ? {label:"Release never reached",color:"bg-orange-500",text:"Player started a project but never released it. Check dev loop clarity."}
                  : !f.startedSecondProject&&!f.boughtUpgrade
                    ? {label:"Payoff weak",color:"bg-yellow-500 text-gray-900",text:"First game released but player did not buy an upgrade or start a second game."}
                    : f.startedSecondProject
                      ? {label:"Retention signal passed",color:"bg-green-600",text:"Player completed the full core loop and started a second game."}
                      : {label:"Activation passed",color:"bg-blue-500",text:"First game released and upgrade bought. Second game not yet started."};

              const questions = [
                {key:"q1",label:"I understood what to do first."},
                {key:"q2",label:"Releasing a game felt rewarding."},
                {key:"q3",label:"I wanted to make a second game."},
                {key:"q4",label:"The UI felt clear."},
              ] as {key:"q1"|"q2"|"q3"|"q4";label:string}[];

              function copySummaryJson(){
                const payload = {
                  session: {
                    startedAt: t0,
                    elapsedSeconds: Math.round(elapsedSec),
                  },
                  flags: f,
                  timers: {
                    firstObjectHover:      relSec(analytics.firstObjectHover),
                    firstComputerClick:    relSec(analytics.firstComputerClick),
                    firstNewProjectOpen:   relSec(analytics.firstModalOpen),
                    firstProjectStart:     relSec(analytics.firstProjectStart),
                    firstReleaseReady:     relSec(analytics.firstReleaseReady),
                    firstReleaseClicked:   relSec(analytics.firstReleaseClicked),
                    firstReviewRevealed:   relSec(analytics.firstReviewRevealed),
                    finalSummaryViewed:    relSec(analytics.finalSummaryViewedAt),
                    firstUpgradeBought:    relSec(analytics.firstUpgradeBought),
                  },
                  metrics: {
                    gamesStarted:          analytics.gamesStarted,
                    gamesReleased:         analytics.totalGamesReleased,
                    bestScore:             analytics.bestScore,
                    bestRevenue:           analytics.bestRevenue,
                    totalFans:             fans,
                    upgradesBought:        upgrades.size,
                    panelsOpened:          analytics.panelsOpened,
                    actionsUsed:           analytics.actionsUsed,
                    missedClicksBeforeStart: analytics.missedClicksBeforeStart,
                    reviewsRevealed:       analytics.reviewsRevealed,
                    salesWeeksViewed:      analytics.salesWeeksViewed,
                    skippedSales:          analytics.skippedSales,
                    marketGamesEntered:    analytics.marketGamesEntered,
                    marketGamesFinished:   analytics.marketGamesFinished,
                    totalSalesWeeksSimulated: analytics.totalSalesWeeksSimulated,
                    highestWeeklySales:    analytics.highestWeeklySales,
                    bestUnitsSold:         analytics.bestUnitsSold,
                    menuOpens:             analytics.menuOpens,
                    menuItemClicks:        analytics.menuItemClicks,
                  },
                  confusionSignals: {
                    newProjectClosedWithoutStart: analytics.newProjectClosedWithoutStart,
                    menuOpenedWithNoAction:       analytics.menuOpenedWithNoAction,
                    clickedLockedMenuItem:        analytics.clickedLockedMenuItem,
                    releaseFlowAbandoned:         analytics.releaseFlowAbandoned,
                    idleDetected:                 analytics.idleDetected,
                    missedClicksBeforeStart:      analytics.missedClicksBeforeStart,
                  },
                  releaseFlowBehavior: {
                    watchedReviewsWithoutSkip: analytics.watchedReviewsWithoutSkip,
                    reviewSkipClicked:         analytics.reviewSkipClicked,
                    reviewFastForwardClicked:  analytics.reviewFastForwardClicked,
                    salesWasPaused:            analytics.salesWasPaused,
                    salesSpeedChanged:         analytics.salesSpeedChanged,
                    watchedFullSalesTail:      analytics.watchedFullSalesTail,
                    releasePayoffCompleted:    analytics.releasePayoffCompleted,
                    releaseToSummaryMs:        analytics.releaseToSummaryMs,
                    watchedAutomaticReviewReveal: analytics.watchedAutomaticReviewReveal,
                    sawLiveSalesFeed:          analytics.sawLiveSalesFeed,
                    startedProjectWhileGameSelling: analytics.startedProjectWhileGameSelling,
                    liveSalesProducedMoneyFans: analytics.liveSalesProducedMoneyFans,
                  },
                  releases: history,
                  upgradesBought: [...upgrades],
                  trendUsage: {
                    trendsSeen: analytics.trendsSeen,
                    gamesMatchingTrend: analytics.gamesMatchingTrend,
                    gamesIgnoringTrend: analytics.gamesIgnoringTrend,
                    usedTrendAfterSeeing: analytics.usedTrendAfterSeeing,
                  },
                  contractUsage: {
                    opened: analytics.contractWorkOpened,
                    started: analytics.contractsStarted,
                    completed: analytics.contractsCompleted,
                  },
                  survey: surveyAnswers,
                  events: analytics.events,
                };
                const json = JSON.stringify(payload, null, 2);
                navigator.clipboard.writeText(json).catch(()=>{});
                console.log("[playtest session JSON]", payload);
              }

              return (
                <motion.div
                  initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                  className="absolute inset-0 z-[60] flex items-start justify-center bg-black/75 backdrop-blur-sm overflow-y-auto py-4"
                  onClick={e=>{if(e.target===e.currentTarget)setShowPlaytestSummary(false);}}>
                  <motion.div
                    data-panel="playtest-summary"
                    initial={{scale:0.93,y:16}} animate={{scale:1,y:0}} exit={{scale:0.93,y:16}}
                    transition={{type:"spring",damping:24,stiffness:320}}
                    className="bg-gray-950 text-white rounded-2xl shadow-2xl border border-gray-800 w-[440px] mx-4 my-2 overflow-hidden">

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-800">
                      <div>
                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Playtest</div>
                        <div className="text-lg font-black leading-none">Session Summary</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-gray-500 uppercase font-bold">Time played</div>
                        <div className="text-xl font-black text-amber-400">
                          {elapsedSec>=3600
                            ? `${Math.floor(elapsedSec/3600)}h ${Math.floor((elapsedSec%3600)/60)}m`
                            : `${Math.floor(elapsedSec/60)}m ${Math.floor(elapsedSec%60)}s`}
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-4 flex flex-col gap-4">

                      {/* Core loop checklist */}
                      <div>
                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Core Loop</div>
                        <div className="grid grid-cols-2 gap-1">
                          {([
                            [f.startedFirstProject,  "Started first project"],
                            [f.releasedFirstGame,     "Released first game"],
                            [analytics.sawLiveSalesFeed,"Observed live sales feed"],
                            [f.boughtUpgrade,         "Bought an upgrade"],
                            [f.startedSecondProject,  "Started second game"],
                            [analytics.menuOpens>0,   "Used global menu"],
                          ] as [boolean,string][]).map(([ok,label])=>(
                            <div key={label} className={`flex items-center gap-1.5 text-[11px] rounded-lg px-2.5 py-1.5 ${ok?"bg-green-950/60 text-green-300":"bg-gray-900 text-gray-500"}`}>
                              <span className="text-sm">{ok?"✓":"✗"}</span>
                              <span className={ok?"font-semibold":""}>{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Metrics */}
                      <div>
                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Metrics</div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {([
                            ["Games started",   analytics.gamesStarted],
                            ["Games released",  analytics.totalGamesReleased],
                            ["Fans",            fans],
                            ["Best score",      analytics.bestScore>0?analytics.bestScore+"/10":"—"],
                            ["Best revenue",    analytics.bestRevenue>0?"$"+analytics.bestRevenue.toLocaleString():"—"],
                            ["Upgrades",        upgrades.size],
                            ["Panels opened",   analytics.panelsOpened],
                            ["Dev actions",     analytics.actionsUsed],
                            ["Reviews seen",    analytics.reviewsRevealed],
                            ["Watched all reviews", analytics.watchedReviewsWithoutSkip?"yes":"no"],
                            ["Sales weeks", analytics.totalSalesWeeksSimulated],
                            ["Highest week", analytics.highestWeeklySales>0?analytics.highestWeeklySales.toLocaleString():"—"],
                            ["Release→summary", analytics.releaseToSummaryMs!==null?Math.round(analytics.releaseToSummaryMs/1000)+"s":"—"],
                          ] as [string,string|number][]).map(([label,val])=>(
                            <div key={label} className="bg-gray-900 rounded-lg px-2.5 py-2 text-center">
                              <div className="text-sm font-black text-white leading-none">{val}</div>
                              <div className="text-[9px] text-gray-500 mt-0.5">{label}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Live release loop */}
                      <div>
                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Live Release Loop</div>
                        <div className="flex flex-col gap-1">
                          {([
                            ["Watched automatic review reveal", analytics.watchedAutomaticReviewReveal],
                            ["Observed live sales feed", analytics.sawLiveSalesFeed],
                            ["Started second project while first game sold", analytics.startedProjectWhileGameSelling],
                            ["Money/fans arrived week by week", analytics.liveSalesProducedMoneyFans&&analytics.totalSalesWeeksSimulated>0],
                            ["Money increase was explained by sales ticker", analytics.sawLiveSalesFeed&&analytics.liveSalesProducedMoneyFans],
                          ] as [string,boolean][]).map(([label,ok])=>(
                            <div key={label} className={`flex items-center justify-between text-[11px] rounded-lg px-2.5 py-1.5 ${ok?"bg-green-950/60 text-green-300":"bg-gray-900 text-gray-500"}`}>
                              <span>{label}</span>
                              <span className="font-black ml-2">{ok?"yes":"no"}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Confusion signals */}
                      <div>
                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Confusion Signals</div>
                        <div className="flex flex-col gap-1">
                          {([
                            ["Missed clicks before first project", analytics.missedClicksBeforeStart, analytics.missedClicksBeforeStart>=3],
                            ["New project closed without starting", analytics.newProjectClosedWithoutStart, analytics.newProjectClosedWithoutStart>=2],
                            ["Menu opened with no action",          analytics.menuOpenedWithNoAction, analytics.menuOpenedWithNoAction>=2],
                            ["Locked menu items clicked",           analytics.clickedLockedMenuItem, analytics.clickedLockedMenuItem>=1],
                            ["60s idle with no project",            analytics.idleDetected?1:0, analytics.idleDetected],
                            ["Reviews skipped",                     analytics.reviewSkipClicked?1:0, analytics.reviewSkipClicked],
                            ["Sales skipped",                       analytics.skippedSales?1:0, analytics.skippedSales],
                            ["Sales paused mid-run",                analytics.salesWasPaused?1:0, false],
                          ] as [string,number,boolean][]).map(([label,val,warn])=>(
                            <div key={label} className={`flex items-center justify-between text-[11px] rounded-lg px-2.5 py-1.5 ${warn?"bg-red-950/50 text-red-300":"bg-gray-900 text-gray-400"}`}>
                              <span>{label}</span>
                              <span className={`font-black ml-2 ${warn?"text-red-400":"text-gray-500"}`}>{typeof val==="boolean"?val?"yes":"no":val}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* First-session timers */}
                      <details className="group">
                        <summary className="text-[9px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-gray-300 select-none list-none flex items-center gap-1">
                          <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                          First-session timers
                        </summary>
                        <div className="mt-2 flex flex-col gap-1">
                          {([
                            ["First object hover",     analytics.firstObjectHover],
                            ["First computer click",   analytics.firstComputerClick],
                            ["New project panel open", analytics.firstModalOpen],
                            ["First project started",  analytics.firstProjectStart],
                            ["Release ready",          analytics.firstReleaseReady],
                            ["Release clicked",        analytics.firstReleaseClicked],
                            ["First review revealed",  analytics.firstReviewRevealed],
                            ["Sales summary viewed",   analytics.finalSummaryViewedAt],
                            ["First upgrade bought",   analytics.firstUpgradeBought],
                          ] as [string,number|null][]).map(([label,ts])=>(
                            <div key={label} className="flex items-center justify-between text-[11px] bg-gray-900 rounded-lg px-2.5 py-1.5">
                              <span className="text-gray-400">{label}</span>
                              <span className={`font-black ml-2 ${ts?"text-amber-400":"text-gray-600"}`}>{relSec(ts)}</span>
                            </div>
                          ))}
                        </div>
                      </details>

                      {/* Verdict */}
                      <div className={`rounded-xl px-4 py-3 ${verdict.color}`}>
                        <div className="font-black text-sm leading-none mb-1">{verdict.label}</div>
                        <div className="text-[11px] opacity-90 leading-snug">{verdict.text}</div>
                      </div>

                      {/* Survey */}
                      <div className="border-t border-gray-800 pt-4">
                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Player Survey</div>
                        <div className="flex flex-col gap-3">
                          {questions.map(({key,label})=>(
                            <div key={key}>
                              <div className="text-[11px] text-gray-300 mb-1.5 font-semibold">{label}</div>
                              <div className="flex gap-1.5">
                                {([1,2,3,4,5] as const).map(n=>(
                                  <button key={n}
                                    data-interactive="true"
                                    onClick={()=>{
                                      const next = {...surveyAnswers,[key]:n};
                                      setSurveyAnswers(next);
                                      analytics.playtestSurvey = {...analytics.playtestSurvey,[key]:n};
                                    }}
                                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-black transition-colors border ${
                                      surveyAnswers[key]===n
                                        ?"bg-amber-500 border-amber-400 text-white"
                                        :"bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
                                    }`}>{n}</button>
                                ))}
                              </div>
                            </div>
                          ))}
                          <div>
                            <div className="text-[11px] text-gray-300 mb-1.5 font-semibold">What confused you? <span className="text-gray-600 font-normal">(optional)</span></div>
                            <textarea
                              data-interactive="true"
                              rows={3}
                              placeholder="Describe anything that felt unclear…"
                              value={surveyAnswers.feedback}
                              onChange={e=>{
                                const next = {...surveyAnswers,feedback:e.target.value};
                                setSurveyAnswers(next);
                                analytics.playtestSurvey = {...analytics.playtestSurvey,feedback:e.target.value};
                              }}
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-[11px] text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-gray-500 resize-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <button data-interactive="true"
                          onClick={copySummaryJson}
                          className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-[11px] transition-colors border border-gray-700">
                          Copy Session JSON
                        </button>
                        <button data-interactive="true"
                          onClick={()=>setShowPlaytestSummary(false)}
                          className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[11px] transition-colors active:scale-95">
                          Close
                        </button>
                      </div>

                    </div>
                  </motion.div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </>
      )}

    </div>
  );
}
