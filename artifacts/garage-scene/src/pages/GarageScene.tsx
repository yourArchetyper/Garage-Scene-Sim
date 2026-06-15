import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── DATA DEFINITIONS ──────────────────────────────────────────────────────────

const TOPICS = ["Fantasy", "Space", "Racing", "Business", "Medieval", "Horror", "Detective"] as const;
const GENRES = ["RPG", "Strategy", "Simulation", "Action", "Adventure"] as const;
const PLATFORMS = ["Home Computer", "Arcade Cabinet", "Early Console"] as const;

type Topic = typeof TOPICS[number];
type Genre = typeof GENRES[number];
type Platform = typeof PLATFORMS[number];

const topicMod: Record<Topic, { d: number; t: number }> = {
  Fantasy:   { d: 1.2, t: 0.9 },
  Space:     { d: 1.0, t: 1.3 },
  Racing:    { d: 1.1, t: 1.1 },
  Business:  { d: 0.9, t: 1.2 },
  Medieval:  { d: 1.3, t: 0.8 },
  Horror:    { d: 1.1, t: 1.0 },
  Detective: { d: 1.0, t: 1.1 },
};

const genreMod: Record<Genre, { dw: number; tw: number; bugSens: number }> = {
  RPG:        { dw: 1.4, tw: 1.0, bugSens: 1.2 },
  Strategy:   { dw: 0.9, tw: 1.4, bugSens: 1.0 },
  Simulation: { dw: 1.0, tw: 1.3, bugSens: 1.1 },
  Action:     { dw: 1.2, tw: 1.1, bugSens: 1.3 },
  Adventure:  { dw: 1.3, tw: 0.9, bugSens: 0.9 },
};

const platformMod: Record<Platform, { fans: number; sales: number; techReq: number }> = {
  "Home Computer":  { fans: 1.0, sales: 1.0, techReq: 0  },
  "Arcade Cabinet": { fans: 1.3, sales: 1.5, techReq: 25 },
  "Early Console":  { fans: 1.6, sales: 2.2, techReq: 50 },
};

const comboTable: Record<Genre, Partial<Record<Topic, number>>> = {
  RPG:        { Fantasy: 1.5, Medieval: 1.4, Horror: 1.2, Space: 1.1, Detective: 1.0, Racing: 0.8, Business: 0.7 },
  Strategy:   { Business: 1.5, Medieval: 1.3, Detective: 1.2, Space: 1.2, Fantasy: 1.0, Horror: 0.9, Racing: 0.8 },
  Simulation: { Racing: 1.5, Business: 1.4, Space: 1.2, Detective: 1.0, Fantasy: 0.9, Medieval: 0.8, Horror: 0.7 },
  Action:     { Horror: 1.5, Racing: 1.4, Space: 1.3, Fantasy: 1.2, Medieval: 1.1, Detective: 1.0, Business: 0.7 },
  Adventure:  { Detective: 1.5, Fantasy: 1.4, Medieval: 1.3, Horror: 1.3, Space: 1.1, Racing: 0.8, Business: 0.8 },
};

interface UpgradeDef {
  id: string;
  name: string;
  cost: number;
  desc: string;
}

const UPGRADE_DEFS: UpgradeDef[] = [
  { id: "betterPC",    name: "Faster PC",       cost: 350, desc: "+30% dev speed"         },
  { id: "coffeemaker", name: "Coffee Maker",     cost: 150, desc: "+20% weekly progress"   },
  { id: "books",       name: "Prog. Books",      cost: 250, desc: "-30% bugs at release"   },
  { id: "whiteboard",  name: "Whiteboard",       cost: 400, desc: "+40% design points"     },
];

const EVENTS = [
  { text: "A gaming magazine featured you!",   fans:  50, cash:   0, progressHit: 0,  bugFix: false },
  { text: "Printer broke. Tech setback.",       fans:   0, cash: -60, progressHit: 5,  bugFix: false },
  { text: "Local store stocks your games!",     fans:  80, cash: 200, progressHit: 0,  bugFix: false },
  { text: "Power outage! Lost some work.",      fans:   0, cash:   0, progressHit: 10, bugFix: false },
  { text: "Found a critical bug early!",        fans:   0, cash:   0, progressHit: 0,  bugFix: true  },
  { text: "A friend play-tested your demo!",   fans:  20, cash:   0, progressHit: 0,  bugFix: false },
  { text: "Computer Weekly gave you a shout!", fans:  60, cash:   0, progressHit: 0,  bugFix: false },
];

// ── TYPES ─────────────────────────────────────────────────────────────────────

type Phase = "idle" | "developing" | "releasing";

interface Project {
  name: string;
  topic: Topic;
  genre: Genre;
  platform: Platform;
  design: number;
  tech: number;
  bugs: number;
  progress: number;
}

interface ReleasedGame {
  name: string;
  topic: Topic;
  genre: Genre;
  score: number;
  revenue: number;
  fansGained: number;
  year: number;
  week: number;
}

interface Bubble {
  id: number;
  text: string;
  color: string;
  svgX: number;
  svgY: number;
  born: number;
}

interface ReviewResult {
  score: number;
  headline: string;
  subline: string;
  revenue: number;
  fansGained: number;
}

// ── ISO HELPERS ───────────────────────────────────────────────────────────────

const TW = 60;
const TH = 30;
const OX = 400;
const OY = 150;

function iso(x: number, y: number, z: number) {
  return {
    x: (x - y) * TW / 2 + OX,
    y: (x + y) * TH / 2 - z * TH + OY,
  };
}

function pts(raw: number[][]): string {
  return raw.map(p => {
    const c = iso(p[0], p[1], p[2]);
    return `${c.x},${c.y}`;
  }).join(" ");
}

function P({
  p, fill, stroke = "rgba(0,0,0,0.12)", sw = 1, onClick, cursor,
}: {
  p: number[][]; fill: string; stroke?: string; sw?: number;
  onClick?: () => void; cursor?: string;
}) {
  return (
    <polygon
      points={pts(p)}
      fill={fill}
      stroke={stroke}
      strokeWidth={sw}
      strokeLinejoin="round"
      onClick={onClick}
      style={cursor ? { cursor } : undefined}
    />
  );
}

// ── SCORE CALCULATION ─────────────────────────────────────────────────────────

function calcScore(project: Project, upgrades: Set<string>): ReviewResult {
  const tm = topicMod[project.topic];
  const gm = genreMod[project.genre];
  const pm = platformMod[project.platform];
  const combo = comboTable[project.genre]?.[project.topic] ?? 1.0;

  const bugs = upgrades.has("books") ? project.bugs * 0.7 : project.bugs;
  const design = project.design * gm.dw * tm.d * (upgrades.has("whiteboard") ? 1.4 : 1.0);
  const tech = project.tech * gm.tw * tm.t;
  const bugPenalty = 1 / (1 + bugs * 0.07 * gm.bugSens);

  const raw = ((design + tech) / 2) * bugPenalty * combo * pm.fans / 14;
  const score = Math.max(1.0, Math.min(10.0, raw));
  const rounded = Math.round(score * 10) / 10;

  const rows: [number, string, string][] = [
    [1.0, "Crash City",       "It barely runs. Reviewers are not amused."],
    [3.0, "Rough Start",      "Rough around the edges, but shows some promise."],
    [5.0, "Decent Effort",    "A few players enjoyed it. Keep going."],
    [6.5, "Solid Game",       "Word is spreading. Sales are picking up."],
    [7.5, "Great Game",       "Fans are excited! Nice work!"],
    [8.5, "Masterpiece",      "The whole town is buzzing. You're a star!"],
  ];
  const row = [...rows].reverse().find(([min]) => rounded >= min) ?? rows[0];

  const baseSales = Math.floor((rounded * 70 + Math.random() * 60) * pm.sales);
  const revenue = Math.floor(baseSales * (4 + rounded * 2));
  const fansGained = Math.floor((rounded * 28 + Math.random() * 18) * pm.fans);

  const comboNote = combo >= 1.4
    ? ` ${project.topic} ${project.genre} is a great combo!`
    : combo <= 0.8 ? ` Weak combo: ${project.topic} + ${project.genre}.` : "";

  return { score: rounded, headline: row[1], subline: row[2] + comboNote, revenue, fansGained };
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export default function GarageScene() {
  const [week, setWeek] = useState(1);
  const [year, setYear] = useState(1);
  const [cash, setCash] = useState(2000);
  const [fans, setFans] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [project, setProject] = useState<Project | null>(null);
  const [upgrades, setUpgrades] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<ReleasedGame[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [bubbleCount, setBubbleCount] = useState(0);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [eventMsg, setEventMsg] = useState<string | null>(null);
  const [showNewGame, setShowNewGame] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [formName, setFormName] = useState("Pixel Quest");
  const [formTopic, setFormTopic] = useState<Topic>("Fantasy");
  const [formGenre, setFormGenre] = useState<Genre>("RPG");
  const [formPlatform, setFormPlatform] = useState<Platform>("Home Computer");

  const weeksSinceEvent = useRef(0);
  const phaseRef = useRef(phase);
  const upgradesRef = useRef(upgrades);
  const weekRef = useRef(week);
  phaseRef.current = phase;
  upgradesRef.current = upgrades;
  weekRef.current = week;

  // Character head position in SVG for bubbles
  const charHead = iso(5.5, 5.0, 2.4);

  const spawnBubble = useCallback((text: string, color: string) => {
    const ox = (Math.random() - 0.5) * 50;
    setBubbleCount(n => n + 1);
    setBubbles(prev => [
      ...prev.filter(b => Date.now() - b.born < 1800),
      { id: Date.now() + Math.random(), text, color, svgX: charHead.x + ox, svgY: charHead.y - 15, born: Date.now() },
    ]);
  }, [charHead.x, charHead.y]);

  // Main game tick
  useEffect(() => {
    const id = setInterval(() => {
      // Advance time
      setWeek(w => {
        const next = w + 1;
        if (next > 52) { setYear(y => y + 1); return 1; }
        return next;
      });

      weeksSinceEvent.current += 1;

      // Development progress
      if (phaseRef.current === "developing") {
        const up = upgradesRef.current;
        const speedMod = up.has("betterPC") ? 1.3 : 1.0;
        const proMod = up.has("coffeemaker") ? 1.2 : 1.0;
        const rate = 6 * speedMod * proMod;

        const r = Math.random();
        if (r < 0.30) {
          const g = Math.floor(2 + Math.random() * 4);
          spawnBubble(`Design +${g}`, "#f59e0b");
          setProject(p => p ? { ...p, design: p.design + g } : p);
        } else if (r < 0.55) {
          const g = Math.floor(2 + Math.random() * 4);
          spawnBubble(`Tech +${g}`, "#3b82f6");
          setProject(p => p ? { ...p, tech: p.tech + g } : p);
        } else if (r < 0.78) {
          const b = Math.floor(1 + Math.random() * 2);
          spawnBubble(`Bug +${b}`, "#ef4444");
          setProject(p => p ? { ...p, bugs: p.bugs + b } : p);
        }

        setProject(p => p ? { ...p, progress: Math.min(100, p.progress + rate) } : p);
      }

      // Random events
      if (weeksSinceEvent.current >= 8 && Math.random() < 0.18) {
        weeksSinceEvent.current = 0;
        const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
        setEventMsg(ev.text);
        if (ev.fans) setFans(f => f + ev.fans);
        if (ev.cash) setCash(c => c + ev.cash);
        if (ev.progressHit && phaseRef.current === "developing")
          setProject(p => p ? { ...p, progress: Math.max(0, p.progress - ev.progressHit) } : p);
        if (ev.bugFix && phaseRef.current === "developing")
          setProject(p => p ? { ...p, bugs: Math.max(0, p.bugs - 4) } : p);
        setTimeout(() => setEventMsg(null), 4000);
      }
    }, 2000);

    return () => clearInterval(id);
  }, [spawnBubble]);

  function startProject() {
    setProject({ name: formName || "Unnamed Game", topic: formTopic, genre: formGenre, platform: formPlatform, design: 0, tech: 0, bugs: 0, progress: 0 });
    setPhase("developing");
    setShowNewGame(false);
  }

  function releaseGame() {
    if (!project) return;
    const result = calcScore(project, upgrades);
    setReviewResult(result);
    setCash(c => c + result.revenue);
    setFans(f => f + result.fansGained);
    setHistory(h => [...h, { name: project.name, topic: project.topic, genre: project.genre, score: result.score, revenue: result.revenue, fansGained: result.fansGained, year, week }]);
    setPhase("releasing");
  }

  function dismissReview() {
    setReviewResult(null);
    setProject(null);
    setPhase("idle");
  }

  function buyUpgrade(upg: UpgradeDef) {
    if (cash < upg.cost || upgrades.has(upg.id)) return;
    setCash(c => c - upg.cost);
    setUpgrades(u => new Set([...u, upg.id]));
  }

  const working = phase === "developing";
  const canRelease = working && (project?.progress ?? 0) >= 100;
  const combo = comboTable[formGenre]?.[formTopic] ?? 1.0;

  // ── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-[100dvh] flex flex-col overflow-hidden bg-background select-none">

      {/* ─── HUD ──────────────────────────────────────────────────────────────── */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-start justify-between gap-2 pointer-events-none">

        {/* Left panel */}
        <div className="pointer-events-auto flex flex-col gap-1.5">
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl shadow px-3 py-2 text-xs font-mono flex flex-col gap-0.5">
            <span className="text-gray-400 font-sans text-[10px] font-semibold uppercase tracking-wider">Year {year} · Week {week}</span>
            <span className="text-green-700 font-bold text-sm">${cash.toLocaleString()}</span>
            <span className="text-violet-700 font-medium">{fans.toLocaleString()} fans</span>
          </div>
          {history.length > 0 && (
            <button
              data-testid="button-history"
              onClick={() => setShowHistory(h => !h)}
              className="bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors"
            >
              {history.length} released
            </button>
          )}
        </div>

        {/* Center */}
        <div className="flex flex-col items-center gap-2 pointer-events-auto">
          {phase === "idle" && (
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="bg-white/80 backdrop-blur border border-amber-200 text-amber-700 text-xs font-semibold px-4 py-1.5 rounded-full shadow"
            >
              Click the computer to start a project
            </motion.div>
          )}

          {working && project && (
            <div className="bg-white/92 backdrop-blur border border-gray-200 rounded-2xl shadow-md px-5 py-2.5 flex flex-col items-center min-w-[230px]">
              <span className="font-bold text-gray-800 text-sm">{project.name}</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">{project.topic} · {project.genre} · {project.platform}</span>
              <div className="w-full h-2.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-1000"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <div className="flex gap-4 mt-1.5 text-[11px] font-semibold">
                <span className="text-amber-600">D {Math.floor(project.design)}</span>
                <span className="text-blue-600">T {Math.floor(project.tech)}</span>
                <span className="text-red-500">B {Math.floor(project.bugs)}</span>
                <span className="text-gray-400">{Math.floor(project.progress)}%</span>
              </div>
            </div>
          )}

          {canRelease && (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.04, 1], opacity: 1 }}
              transition={{ scale: { repeat: Infinity, duration: 1.5 }, opacity: { duration: 0.3 } }}
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.95 }}
              onClick={releaseGame}
              data-testid="button-release"
              className="bg-green-500 hover:bg-green-600 text-white font-black px-8 py-2.5 rounded-full shadow-xl text-sm"
            >
              Release Game!
            </motion.button>
          )}
        </div>

        {/* Right */}
        <div className="pointer-events-auto">
          <button
            data-testid="button-shop"
            onClick={() => setShowUpgrades(s => !s)}
            className="bg-white/90 backdrop-blur border border-gray-200 rounded-xl shadow text-xs font-bold text-gray-700 px-3 py-2 hover:bg-amber-50 transition-colors"
          >
            Shop
          </button>
        </div>
      </div>

      {/* ─── ISOMETRIC SCENE ─────────────────────────────────────────────────── */}
      <div className="flex-1 w-full flex items-center justify-center pt-14">
        <svg
          viewBox="0 0 800 600"
          className="w-full h-full max-h-[82vh] drop-shadow-xl"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Floor */}
          <P p={[[0,0,0],[10,0,0],[10,10,0],[0,10,0]]} fill="#b2b2b2" stroke="#9a9a9a" />
          {/* Left Wall */}
          <P p={[[0,0,0],[10,0,0],[10,0,5],[0,0,5]]} fill="#91b27c" stroke="#7c9d68" />
          {/* Right Wall */}
          <P p={[[0,0,0],[0,10,0],[0,10,5],[0,0,5]]} fill="#7c9d68" stroke="#6a8758" />

          {/* Door */}
          <P p={[[2,0,0],[4,0,0],[4,0,4],[2,0,4]]} fill="#f3f3f3" stroke="#d8d8d8" />
          <P p={[[2,0,0],[4,0,0],[4,0,0.15],[2,0,0.15]]} fill="#d8d8d8" />
          <P p={[[3.65,0,1.9],[3.85,0,1.9],[3.85,0,2.1],[3.65,0,2.1]]} fill="#bbb" stroke="#999" />

          {/* Corkboard */}
          <P p={[[6,0,2],[8,0,2],[8,0,4],[6,0,4]]} fill="#d0ac7e" stroke="#aa8856" sw={1.5} />
          <P p={[[6.15,0,2.15],[8,0,2.15],[8,0,3.9],[6.15,0,3.9]]} fill="#c49a6c" stroke="none" />
          <P p={[[6.3,0,2.5],[6.75,0,2.5],[6.75,0,2.9],[6.3,0,2.9]]} fill="#f4e57d" />
          <P p={[[6.9,0,3.1],[7.35,0,3.1],[7.35,0,3.55],[6.9,0,3.55]]} fill="#f07070" />
          <P p={[[7.45,0,2.3],[7.85,0,2.3],[7.85,0,2.7],[7.45,0,2.7]]} fill="#7de5f4" />
          <P p={[[6.3,0,3.2],[6.75,0,3.2],[6.75,0,3.6],[6.3,0,3.6]]} fill="#a0e878" />

          {/* Blackboard */}
          <P p={[[0,1,2],[0,5.5,2],[0,5.5,4.6],[0,1,4.6]]} fill="#263d32" stroke="#1a2820" sw={2} />
          <P p={[[0,1.2,2],[0,5.5,2],[0,5.5,2.1],[0,1.2,2.1]]} fill="#1a2820" />
          {/* Pong game chalk marks */}
          <P p={[[0,1.6,3.1],[0,1.9,3.1],[0,1.9,3.7],[0,1.6,3.7]]} fill="#eee" stroke="none" />
          <P p={[[0,4.8,2.7],[0,5.1,2.7],[0,5.1,3.3],[0,4.8,3.3]]} fill="#eee" stroke="none" />
          <P p={[[0,3.2,3.1],[0,3.5,3.1],[0,3.5,3.4],[0,3.2,3.4]]} fill="#ddd" stroke="none" />
          <line x1={iso(0,2,3.4).x} y1={iso(0,2,3.4).y} x2={iso(0,4.5,3.0).x} y2={iso(0,4.5,3.0).y} stroke="#ffffff50" strokeWidth={1} strokeDasharray="4 4" />

          {/* Ladder */}
          <P p={[[0,6,0],[0,6.25,0],[0,6.25,4.5],[0,6,4.5]]} fill="#8c5a35" />
          <P p={[[0,7,0],[0,7.25,0],[0,7.25,4.5],[0,7,4.5]]} fill="#8c5a35" />
          {[1, 1.8, 2.6, 3.4, 4.1].map((z, i) => (
            <P key={i} p={[[0,6,z],[0,7.25,z],[0,7.25,z+0.18],[0,6,z+0.18]]} fill="#a8754b" />
          ))}

          {/* Bookshelf body */}
          <P p={[[8,0,0],[10,0,0],[10,1,0],[8,1,0]]} fill="#6e4225" />
          <P p={[[8,1,0],[10,1,0],[10,1,5],[8,1,5]]} fill="#5a341c" />
          <P p={[[8,0,0],[8,1,0],[8,1,5],[8,0,5]]} fill="#7a4e2c" />
          <P p={[[8,0,5],[10,0,5],[10,1,5],[8,1,5]]} fill="#8c5a35" />
          {[1.5, 3.0].map((z, i) => (
            <P key={i} p={[[8,0,z],[10,0,z],[10,1,z],[8,1,z]]} fill="#4a2a14" />
          ))}
          {/* Books on shelves */}
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
          ].map(([p1, p2, p3, p4, fill], i) => (
            <P key={i} p={[p1, p2, p3, p4] as number[][]} fill={fill as string} />
          ))}

          {/* Filing cabinet (right wall) */}
          <P p={[[0,8,0],[2,8,0],[2,10,0],[0,10,0]]} fill="#4a3a2a" />
          <P p={[[2,8,0],[2,10,0],[2,10,2.2],[2,8,2.2]]} fill="#8c6a4a" />
          <P p={[[0,10,0],[2,10,0],[2,10,2.2],[0,10,2.2]]} fill="#6a4a3a" />
          <P p={[[0,8,2.2],[2,8,2.2],[2,10,2.2],[0,10,2.2]]} fill="#aa8860" />
          {/* Drawer lines */}
          <P p={[[1.95,8.2,1.3],[1.95,9.8,1.3],[1.95,9.8,1.9],[1.95,8.2,1.9]]} fill="#5c422a" stroke="#442f1a" />
          <P p={[[1.95,8.2,0.4],[1.95,9.8,0.4],[1.95,9.8,1.1],[1.95,8.2,1.1]]} fill="#5c422a" stroke="#442f1a" />

          {/* Framed graph */}
          <P p={[[0,7.5,2.8],[0,10.2,2.8],[0,10.2,4.8],[0,7.5,4.8]]} fill="#f0eedd" stroke="#555" sw={2} />
          <P p={[[0,7.7,3.0],[0,10.0,3.0],[0,10.0,4.6],[0,7.7,4.6]]} fill="#fff" stroke="none" />
          <polygon
            points={`${iso(0,7.9,3.3).x},${iso(0,7.9,3.3).y} ${iso(0,8.5,4.0).x},${iso(0,8.5,4.0).y} ${iso(0,9.0,3.5).x},${iso(0,9.0,3.5).y} ${iso(0,9.6,4.3).x},${iso(0,9.6,4.3).y}`}
            fill="none" stroke="#d94b4b" strokeWidth={2} />
          <polygon
            points={`${iso(0,7.9,3.7).x},${iso(0,7.9,3.7).y} ${iso(0,8.4,3.2).x},${iso(0,8.4,3.2).y} ${iso(0,9.1,4.1).x},${iso(0,9.1,4.1).y} ${iso(0,9.6,3.9).x},${iso(0,9.6,3.9).y}`}
            fill="none" stroke="#4b8dd9" strokeWidth={2} />

          {/* Teal rug */}
          <P p={[[3,3,0.01],[7,3,0.01],[7,7.2,0.01],[3,7.2,0.01]]} fill="#3a8c8c" stroke="#2e7070" />

          {/* Desk legs */}
          {[[3.5,3.5],[3.5,6.5],[4.9,3.5],[4.9,6.5]].map(([dx,dy], i) => (
            <P key={i} p={[[dx,dy,0],[dx+0.35,dy,0],[dx+0.35,dy,1.6],[dx,dy,1.6]]} fill="#5c422a" />
          ))}
          {/* Desk top */}
          <P p={[[3.2,3.2,1.6],[5.3,3.2,1.6],[5.3,7.0,1.6],[3.2,7.0,1.6]]} fill="#cda87a" />
          <P p={[[5.3,3.2,1.6],[5.3,7.0,1.6],[5.3,7.0,1.72],[5.3,3.2,1.72]]} fill="#b08a5a" />
          <P p={[[3.2,7.0,1.6],[5.3,7.0,1.6],[5.3,7.0,1.72],[3.2,7.0,1.72]]} fill="#8c6a3a" />
          <P p={[[3.2,3.2,1.72],[5.3,3.2,1.72],[5.3,7.0,1.72],[3.2,7.0,1.72]]} fill="#e5c89f" />

          {/* Monitor base */}
          <P p={[[3.9,4.8,1.72],[4.7,4.8,1.72],[4.7,5.7,1.72],[3.9,5.7,1.72]]} fill="#d0d0d0" />
          {/* Monitor stand */}
          <P p={[[4.2,5.1,1.72],[4.4,5.1,1.72],[4.4,5.3,1.72],[4.2,5.3,1.72]]} fill="#aaa" />
          <P p={[[4.2,5.1,1.72],[4.2,5.3,1.72],[4.2,5.3,2.3],[4.2,5.1,2.3]]} fill="#999" />

          {/* Monitor housing */}
          <P
            p={[[3.85,4.5,1.72],[4.75,4.5,1.72],[4.75,5.75,1.72],[3.85,5.75,1.72]]}
            fill="#e4e4e4"
            onClick={phase === "idle" ? () => setShowNewGame(true) : undefined}
            cursor={phase === "idle" ? "pointer" : undefined}
          />
          <P p={[[4.75,4.5,1.72],[4.75,5.75,1.72],[4.75,5.75,2.7],[4.75,4.5,2.7]]} fill="#c8c8c8"
            onClick={phase === "idle" ? () => setShowNewGame(true) : undefined}
            cursor={phase === "idle" ? "pointer" : undefined}
          />
          <P p={[[3.85,5.75,1.72],[4.75,5.75,1.72],[4.75,5.75,2.7],[3.85,5.75,2.7]]} fill="#b0b0b0" />
          <P p={[[3.85,4.5,2.7],[4.75,4.5,2.7],[4.75,5.75,2.7],[3.85,5.75,2.7]]} fill="#f0f0f0"
            onClick={phase === "idle" ? () => setShowNewGame(true) : undefined}
            cursor={phase === "idle" ? "pointer" : undefined}
          />

          {/* Monitor screen */}
          <motion.g
            animate={{ opacity: working ? [0.85, 1, 0.9, 1, 0.85] : [0.5, 0.6, 0.5] }}
            transition={{ repeat: Infinity, duration: working ? 0.7 : 3.5, ease: "linear" }}
          >
            <P p={[[4.72,4.6,1.9],[4.72,5.6,1.9],[4.72,5.6,2.55],[4.72,4.6,2.55]]} fill={working ? "#1e60c0" : "#1a2e20"} />
            <P p={[[4.73,4.7,2.0],[4.73,5.5,2.0],[4.73,5.5,2.45],[4.73,4.7,2.45]]} fill={working ? "#5aa0f0" : "#2e4a38"} />
          </motion.g>

          {/* Keyboard */}
          <P p={[[4.5,4.7,1.74],[4.95,4.7,1.74],[4.95,5.3,1.74],[4.5,5.3,1.74]]} fill="#cccccc" />
          <P p={[[4.6,5.35,1.74],[4.82,5.35,1.74],[4.82,5.48,1.74],[4.6,5.48,1.74]]} fill="#cccccc" />

          {/* Trash bin */}
          <P p={[[2.4,6.1,0],[3.1,6.1,0],[3.1,6.6,0],[2.4,6.6,0]]} fill="#2a5bb4" />
          <P p={[[3.1,6.1,0],[3.1,6.6,0],[3.1,6.6,0.9],[3.1,6.1,0.9]]} fill="#3a6bc4" />
          <P p={[[2.4,6.6,0],[3.1,6.6,0],[3.1,6.6,0.9],[2.4,6.6,0.9]]} fill="#1a4ba4" />

          {/* Character */}
          <motion.g
            animate={{ y: working ? [0, -3, 0, -2.5, 0, -1, 0] : [0, -1, 0] }}
            transition={{ repeat: Infinity, duration: working ? 0.65 : 2.8, ease: "easeInOut" }}
          >
            {/* Chair base + pole */}
            <P p={[[5.2,4.8,0],[5.7,4.8,0],[5.7,5.3,0],[5.2,5.3,0]]} fill="#1e1e1e" />
            <P p={[[5.35,4.95,0],[5.35,5.15,0],[5.35,5.15,0.85],[5.35,4.95,0.85]]} fill="#2e2e2e" />
            {/* Chair seat */}
            <P p={[[5.05,4.6,0.85],[5.85,4.6,0.85],[5.85,5.4,0.85],[5.05,5.4,0.85]]} fill="#2e2e2e" />
            <P p={[[5.85,4.6,0.85],[5.85,5.4,0.85],[5.85,5.4,0.95],[5.85,4.6,0.95]]} fill="#1e1e1e" />
            <P p={[[5.05,5.4,0.85],[5.85,5.4,0.85],[5.85,5.4,0.95],[5.05,5.4,0.95]]} fill="#111" />
            <P p={[[5.05,4.6,0.95],[5.85,4.6,0.95],[5.85,5.4,0.95],[5.05,5.4,0.95]]} fill="#404040" />
            {/* Chair back */}
            <P p={[[5.8,4.6,0.95],[5.85,5.4,0.95],[5.85,5.4,1.95],[5.8,4.6,1.95]]} fill="#1e1e1e" />
            {/* Body */}
            <P p={[[5.2,4.7,0.95],[5.65,4.7,0.95],[5.65,5.3,0.95],[5.2,5.3,0.95]]} fill="#f0f0f0" />
            <P p={[[5.65,4.7,0.95],[5.65,5.3,0.95],[5.65,5.3,1.85],[5.65,4.7,1.85]]} fill="#d8d8d8" />
            <P p={[[5.2,5.3,0.95],[5.65,5.3,0.95],[5.65,5.3,1.85],[5.2,5.3,1.85]]} fill="#c8c8c8" />
            <P p={[[5.2,4.7,1.85],[5.65,4.7,1.85],[5.65,5.3,1.85],[5.2,5.3,1.85]]} fill="#ffffff" />
            {/* Head */}
            <P p={[[5.28,4.82,1.85],[5.72,4.82,1.85],[5.72,5.22,1.85],[5.28,5.22,1.85]]} fill="#ff8c42" />
            <P p={[[5.72,4.82,1.85],[5.72,5.22,1.85],[5.72,5.22,2.25],[5.72,4.82,2.25]]} fill="#e6732e" />
            <P p={[[5.28,5.22,1.85],[5.72,5.22,1.85],[5.72,5.22,2.25],[5.28,5.22,2.25]]} fill="#cc5c1a" />
            <P p={[[5.28,4.82,2.25],[5.72,4.82,2.25],[5.72,5.22,2.25],[5.28,5.22,2.25]]} fill="#ffa572" />
          </motion.g>

          {/* Floating dev bubbles */}
          <AnimatePresence>
            {bubbles.map(b => (
              <motion.g
                key={b.id}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -38 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.6, ease: "easeOut" }}
              >
                <text
                  x={b.svgX} y={b.svgY}
                  textAnchor="middle"
                  fontSize="11" fontWeight="bold"
                  fill={b.color} stroke="white" strokeWidth="2.5" paintOrder="stroke"
                >
                  {b.text}
                </text>
              </motion.g>
            ))}
          </AnimatePresence>

          {/* Click-to-start prompt over computer */}
          {phase === "idle" && (
            <motion.g
              animate={{ opacity: [0.5, 1, 0.5], y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            >
              <text
                x={iso(4.3, 5.1, 3.1).x} y={iso(4.3, 5.1, 3.1).y}
                textAnchor="middle" fontSize="11" fontWeight="bold"
                fill="#f59e0b" stroke="white" strokeWidth="2.5" paintOrder="stroke"
              >
                Click to start!
              </text>
            </motion.g>
          )}

          {/* Car under tarp */}
          {!upgrades.has("sellCar") && (
            <g>
              <path
                d={[
                  `M ${iso(7,5,0).x} ${iso(7,5,0).y}`,
                  `C ${iso(7.8,3.8,1.0).x} ${iso(7.8,3.8,1.0).y}, ${iso(9,4.8,1.6).x} ${iso(9,4.8,1.6).y}, ${iso(10.2,5,0).x} ${iso(10.2,5,0).y}`,
                  `C ${iso(10.2,6.5,0).x} ${iso(10.2,6.5,0).y}, ${iso(9.2,7.5,1.4).x} ${iso(9.2,7.5,1.4).y}, ${iso(8,7.5,0.8).x} ${iso(8,7.5,0.8).y}`,
                  `C ${iso(7,8,0).x} ${iso(7,8,0).y}, ${iso(6.2,7,0).x} ${iso(6.2,7,0).y}, ${iso(7,5,0).x} ${iso(7,5,0).y}`,
                ].join(" ")}
                fill="#2a5bb4" stroke="#1a4ba4" strokeWidth={2}
              />
              {/* Tarp folds */}
              <path d={`M ${iso(8,4,1).x} ${iso(8,4,1).y} Q ${iso(8.6,4.8,1.3).x} ${iso(8.6,4.8,1.3).y} ${iso(9.2,5.4,0.6).x} ${iso(9.2,5.4,0.6).y}`} stroke="#3a6bc4" strokeWidth={3} fill="none" />
              <path d={`M ${iso(8.5,6.5,1.1).x} ${iso(8.5,6.5,1.1).y} Q ${iso(9.1,6.0,1.3).x} ${iso(9.1,6.0,1.3).y} ${iso(9.7,5.5,0.5).x} ${iso(9.7,5.5,0.5).y}`} stroke="#4a7cd4" strokeWidth={2} fill="none" />
              <path d={`M ${iso(7.2,7.2,0.6).x} ${iso(7.2,7.2,0.6).y} Q ${iso(7.8,6.8,0.9).x} ${iso(7.8,6.8,0.9).y} ${iso(8.4,6.2,1.2).x} ${iso(8.4,6.2,1.2).y}`} stroke="#3a6bc4" strokeWidth={2} fill="none" />
            </g>
          )}
        </svg>
      </div>

      {/* ─── MODALS ───────────────────────────────────────────────────────────── */}

      {/* New Game Modal */}
      <AnimatePresence>
        {showNewGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/45 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setShowNewGame(false); }}
          >
            <motion.div
              initial={{ scale: 0.88, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.88, y: 24 }}
              transition={{ type: "spring", damping: 20 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-[340px] max-h-[90vh] overflow-y-auto border border-gray-200"
              data-testid="modal-new-game"
            >
              <h2 className="text-base font-black text-gray-800 mb-4">New Project</h2>

              <label className="block mb-3">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Game Title</span>
                <input
                  data-testid="input-game-name"
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  maxLength={30}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-gray-50"
                />
              </label>

              <div className="mb-3">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Topic</span>
                <div className="grid grid-cols-4 gap-1">
                  {TOPICS.map(t => (
                    <button
                      key={t}
                      data-testid={`topic-${t}`}
                      onClick={() => setFormTopic(t)}
                      className={`text-[11px] py-1 px-1.5 rounded-md border transition-colors font-medium ${formTopic === t ? "bg-amber-400 border-amber-500 text-white" : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-amber-50"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Genre</span>
                <div className="grid grid-cols-3 gap-1">
                  {GENRES.map(g => (
                    <button
                      key={g}
                      data-testid={`genre-${g}`}
                      onClick={() => setFormGenre(g)}
                      className={`text-[11px] py-1 px-1.5 rounded-md border transition-colors font-medium ${formGenre === g ? "bg-blue-400 border-blue-500 text-white" : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-blue-50"}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Platform</span>
                <div className="flex flex-col gap-1">
                  {PLATFORMS.map(pl => {
                    const pm = platformMod[pl];
                    return (
                      <button
                        key={pl}
                        data-testid={`platform-${pl}`}
                        onClick={() => setFormPlatform(pl)}
                        className={`text-[11px] py-1.5 px-3 rounded-md border text-left transition-colors font-medium ${formPlatform === pl ? "bg-violet-400 border-violet-500 text-white" : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-violet-50"}`}
                      >
                        {pl}{pm.techReq > 0 ? <span className="opacity-70 ml-1">(tech &gt; {pm.techReq} needed)</span> : ""}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Combo hint */}
              <div className={`text-[11px] px-2.5 py-2 rounded-lg mb-4 font-medium ${combo >= 1.4 ? "bg-green-50 text-green-700 border border-green-200" : combo <= 0.8 ? "bg-red-50 text-red-700 border border-red-200" : "bg-gray-50 text-gray-500 border border-gray-100"}`}>
                {combo >= 1.4 ? `Great combo! ${formTopic} ${formGenre} works really well.` : combo <= 0.8 ? `Weak combo. ${formTopic} and ${formGenre} don't mix well.` : `Decent combo for ${formTopic} ${formGenre}.`}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewGame(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  data-testid="button-start"
                  onClick={startProject}
                  className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-black text-sm"
                >
                  Start!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {reviewResult && phase === "releasing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/45 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              transition={{ type: "spring", damping: 18 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-[320px] border border-gray-200"
              data-testid="modal-review"
            >
              <div className="text-center mb-5">
                <div className={`text-6xl font-black mb-0.5 ${reviewResult.score >= 8 ? "text-green-500" : reviewResult.score >= 6.5 ? "text-amber-500" : reviewResult.score >= 5 ? "text-orange-500" : "text-red-500"}`}>
                  {reviewResult.score}
                </div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">/ 10</div>
                <div className="text-sm font-black text-gray-800">{reviewResult.headline}</div>
                <div className="text-xs text-gray-500 mt-1 leading-relaxed">{reviewResult.subline}</div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-green-600 font-black text-xl">${reviewResult.revenue.toLocaleString()}</div>
                  <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Revenue</div>
                </div>
                <div>
                  <div className="text-violet-600 font-black text-xl">+{reviewResult.fansGained}</div>
                  <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">New Fans</div>
                </div>
              </div>

              <button
                data-testid="button-back-to-garage"
                onClick={dismissReview}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm transition-colors"
              >
                Back to the Garage
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shop / Upgrades panel */}
      <AnimatePresence>
        {showUpgrades && (
          <motion.div
            initial={{ opacity: 0, x: 110 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 110 }}
            transition={{ type: "spring", damping: 22 }}
            className="absolute top-14 right-3 z-30 bg-white/97 backdrop-blur rounded-2xl shadow-xl border border-gray-200 p-4 w-[210px]"
            data-testid="panel-shop"
          >
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">Shop</h3>
            <div className="flex flex-col gap-2">
              {UPGRADE_DEFS.map(upg => {
                const owned = upgrades.has(upg.id);
                const afford = cash >= upg.cost;
                return (
                  <div
                    key={upg.id}
                    data-testid={`upgrade-${upg.id}`}
                    onClick={!owned && afford ? () => buyUpgrade(upg) : undefined}
                    className={`p-2.5 rounded-xl border text-xs transition-colors ${owned ? "bg-green-50 border-green-200" : afford ? "bg-white border-gray-200 hover:bg-amber-50 cursor-pointer" : "bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed"}`}
                  >
                    <div className="font-bold text-gray-800">{upg.name}</div>
                    <div className="text-gray-500 mt-0.5">{upg.desc}</div>
                    <div className={`font-black mt-1 ${owned ? "text-green-600" : afford ? "text-amber-600" : "text-gray-400"}`}>
                      {owned ? "Owned" : `$${upg.cost.toLocaleString()}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, x: -110 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -110 }}
            transition={{ type: "spring", damping: 22 }}
            className="absolute top-28 left-3 z-30 bg-white/97 backdrop-blur rounded-2xl shadow-xl border border-gray-200 p-4 w-[210px] max-h-[300px] overflow-y-auto"
            data-testid="panel-history"
          >
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">Released Games</h3>
            <div className="flex flex-col gap-2">
              {history.map((g, i) => (
                <div key={i} className="p-2.5 rounded-xl border border-gray-100 bg-gray-50 text-xs">
                  <div className="font-bold text-gray-800 truncate">{g.name}</div>
                  <div className="text-gray-400">{g.topic} {g.genre}</div>
                  <div className="flex justify-between mt-1">
                    <span className={`font-black ${g.score >= 7 ? "text-green-600" : g.score >= 5 ? "text-amber-600" : "text-red-600"}`}>{g.score}/10</span>
                    <span className="text-green-600 font-bold">${g.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event toast */}
      <AnimatePresence>
        {eventMsg && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/88 text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-xl whitespace-nowrap"
          >
            {eventMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
