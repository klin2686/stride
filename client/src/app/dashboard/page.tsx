"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import RecordButton from "@mui/icons-material/RadioButtonChecked";
import ProfileIcon from "@mui/icons-material/PersonOutlineOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

/* ───────────────────── Swiper Imports ───────────────────── */
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

/* ───────────────────── Coaching Tips Data ───────────────────── */
const coachingTips = [
  {
    id: 1,
    quote:
      "Don\u2019t overreach your strides. Instead, let your feet land directly under your center of mass.",
    imageSrc:
      "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=1000&auto=format&fit=crop",
    articleUrl:
      "https://www.runnersworld.com/training/a20811825/proper-running-form/",
  },
  {
    id: 2,
    quote:
      "Keep a tall posture. Lean slightly from the ankles, not your waist, to let gravity pull you forward.",
    imageSrc:
      "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?q=80&w=1000&auto=format&fit=crop",
    articleUrl:
      "https://www.nytimes.com/guides/well/how-to-start-running",
  },
  {
    id: 3,
    quote:
      "Imagine running on hot coals. Quick, light steps keep your ground contact time low and reduce impact stress.",
    imageSrc:
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1000&auto=format&fit=crop",
    articleUrl:
      "https://www.healthline.com/health/fitness-exercise/running-tips",
  },
];

/* ───────────────────── Skill Metrics Data ───────────────────── */
interface SkillMetric {
  id: number;
  label: string;
  title: string;
  summary: string;
}

const skillMetrics: SkillMetric[] = [
  {
    id: 1,
    label: "SKILL 1",
    title: "Step Rhythm",
    summary:
      "This tracks how many steps you take every minute. Maintaining a quicker, shorter rhythm reduces the heavy \u201Cthud\u201D on your knees and keeps your momentum moving forward.",
  },
  {
    id: 2,
    label: "SKILL 2",
    title: "Landing Zone",
    summary:
      "This identifies which part of your foot hits the ground first. Landing on your midfoot helps you stay balanced and significantly lowers your risk of common running injuries.",
  },
  {
    id: 3,
    label: "SKILL 3",
    title: "Ground Spring",
    summary:
      "This measures how many milliseconds your foot stays in contact with the pavement. A \u201Csnappier\u201D spring off the ground means you\u2019re running light and efficient rather than heavy and slow.",
  },
  {
    id: 4,
    label: "SKILL 4",
    title: "Landing Impact",
    summary:
      "This measures the \u201CG-force\u201D your legs absorb each time you land. Keeping this impact low is the secret to protecting your shins and joints from long-term wear and tear.",
  },
];

/* ───────── Viz 1: Target Ring (Cadence / Step Rhythm) ───────── */
function TargetRing({ value = 168, goal = 180 }: { value?: number; goal?: number }) {
  const pct = Math.min(value / goal, 1);
  const radius = 52;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);
  const color = pct >= 0.9 ? "#22c55e" : pct >= 0.7 ? "#5b9bd5" : "#f59e0b";

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mt: 2, mb: 1 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        {/* Background ring */}
        <circle
          cx="70" cy="70" r={radius}
          fill="none" stroke="#e8edf2" strokeWidth={stroke}
        />
        {/* Progress ring */}
        <circle
          cx="70" cy="70" r={radius}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        {/* Center text */}
        <text x="70" y="64" textAnchor="middle" fontSize="28" fontWeight="700" fill="#1a1a1a">
          {value}
        </text>
        <text x="70" y="84" textAnchor="middle" fontSize="11" fontWeight="500" fill="#888">
          SPM
        </text>
      </svg>
    </Box>
  );
}

/* ───────── Viz 2: Heat-Map Shoe (Foot Strike / Landing Zone) ───────── */
function HeatMapShoe({
  zone = "midfoot",
  heelPct,
  midPct,
  forePct,
}: {
  zone?: "heel" | "midfoot" | "forefoot";
  heelPct?: number | null;
  midPct?: number | null;
  forePct?: number | null;
}) {
  const heelColor = zone === "heel" ? "#ef4444" : "#efefef";
  const midColor = zone === "midfoot" ? "#22c55e" : "#efefef";
  const foreColor = zone === "forefoot" ? "#f59e0b" : "#efefef";
  const labelColor = zone === "midfoot" ? "#22c55e" : zone === "heel" ? "#ef4444" : "#f59e0b";
  const label = zone === "midfoot" ? "✓ Midfoot Strike" : zone === "heel" ? "⚠ Heel Strike" : "⚠ Forefoot Strike";

  const fmtPct = (v: number | null | undefined) => (v != null ? `${Math.round(v)}%` : "");

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mt: 2, mb: 1 }}>
      <svg width="200" height="110" viewBox="0 0 200 110" style={{ userSelect: "none" }}>
        {/* Shoe outline */}
        <path
          d="M30,75 Q20,70 18,55 Q16,40 25,30 Q35,18 55,15 Q80,12 110,14 Q140,16 160,22 Q175,28 182,42 Q188,55 185,68 Q182,78 170,80 L30,80 Z"
          fill="none" stroke="#ccc" strokeWidth="2"
        />
        {/* Heel zone */}
        <ellipse cx="45" cy="58" rx="20" ry="16" fill={heelColor} opacity="0.7" />
        {/* Midfoot zone */}
        <ellipse cx="105" cy="50" rx="30" ry="18" fill={midColor} opacity="0.7" />
        {/* Forefoot zone */}
        <ellipse cx="165" cy="48" rx="18" ry="14" fill={foreColor} opacity="0.7" />
        {/* Labels */}
        <text x="45" y="60" textAnchor="middle" fontSize="8" fontWeight="600" fill="#555">Heel</text>
        <text x="45" y="70" textAnchor="middle" fontSize="8" fill="#777">{fmtPct(heelPct)}</text>
        <text x="105" y="52" textAnchor="middle" fontSize="8" fontWeight="600" fill="#555">Mid</text>
        <text x="105" y="62" textAnchor="middle" fontSize="8" fill="#777">{fmtPct(midPct)}</text>
        <text x="165" y="50" textAnchor="middle" fontSize="8" fontWeight="600" fill="#555">Fore</text>
        <text x="165" y="60" textAnchor="middle" fontSize="8" fill="#777">{fmtPct(forePct)}</text>
        {/* Active indicator */}
        <text x="100" y="100" textAnchor="middle" fontSize="11" fontWeight="700" fill={labelColor}>
          {label}
        </text>
      </svg>
    </Box>
  );
}

/* ───────── Viz 3: Spring Gauge (Ground Contact Time) ───────── */
function SpringGauge({ value = 215, proLine = 200 }: { value?: number; proLine?: number }) {
  const maxVal = 350;
  const barHeight = 80;
  const fillPct = Math.min(value / maxVal, 1);
  const fillH = barHeight * fillPct;
  const proY = barHeight - (barHeight * (proLine / maxVal));
  const isGood = value <= proLine;
  const barColor = isGood ? "#5b9bd5" : "#f97316";

  // Scale font down when the bar is tall so the label fits above it
  const labelY = 10 + barHeight - fillH - 6;
  const fontSize = labelY < 12 ? 10 : 14;

  return (
    <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 2, mt: 2, mb: 1 }}>
      <svg width="120" height="110" viewBox="0 0 120 110">
        {/* Background bar */}
        <rect x="40" y="10" width="40" height={barHeight} rx="6" fill="#e8edf2" />
        {/* Filled bar (from bottom) */}
        <rect
          x="40" y={10 + barHeight - fillH} width="40" height={fillH}
          rx="6" fill={barColor}
          style={{ transition: "all 0.5s ease" }}
        />
        {/* Pro line */}
        <line
          x1="32" y1={10 + proY} x2="88" y2={10 + proY}
          stroke="#22c55e" strokeWidth="2" strokeDasharray="4,3"
        />
        <text x="94" y={10 + proY + 4} fontSize="9" fontWeight="600" fill="#22c55e">
          Pro
        </text>
        {/* Value label — placed inside the bar when it's too tall */}
        <text x="60" y={labelY < 12 ? 10 + barHeight - fillH + fontSize + 2 : labelY} textAnchor="middle"
          fontSize={fontSize} fontWeight="700" fill={labelY < 12 ? "#fff" : barColor}>
          {value}ms
        </text>
        {/* Bottom label */}
        <text x="60" y="105" textAnchor="middle" fontSize="10" fontWeight="500" fill="#888">
          Lower is better
        </text>
      </svg>
    </Box>
  );
}

/* ───────── Viz 4: Shock Waveform (Impact / Landing Impact) ───────── */
function ShockWaveform({
  points = [],
  threshold = 4.0,
}: {
  points?: number[];
  threshold?: number;
}) {
  // Padding so dots / labels at the edges don't clip
  const padL = 8;
  const padR = 28; // room for G-axis labels on the right
  const padT = 14; // room for "limit" text above threshold line
  const plotW = 230;
  const plotH = 70;
  const svgW = padL + plotW + padR;
  const svgH = padT + plotH + 24; // 24 for bottom label

  if (points.length === 0) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mt: 2, mb: 1 }}>
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
          Complete a run to see your impact history
        </Typography>
      </Box>
    );
  }

  const maxG = Math.max(...points, threshold) * 1.15;
  const stepX = points.length > 1 ? plotW / (points.length - 1) : 0;
  const yOf = (v: number) => padT + plotH - (v / maxG) * plotH;
  const thresholdY = yOf(threshold);

  const pathD = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${padL + i * stepX},${yOf(v)}`)
    .join(" ");

  const gridVals = [0, +(maxG / 2).toFixed(1), +maxG.toFixed(1)];

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mt: 2, mb: 1 }}>
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ maxWidth: "100%" }}>
        {/* Grid lines */}
        {gridVals.map((g) => {
          const y = yOf(g);
          return (
            <g key={g}>
              <line x1={padL} y1={y} x2={padL + plotW} y2={y} stroke="#eee" strokeWidth="1" />
              <text x={padL + plotW + 4} y={y + 4} fontSize="8" fill="#bbb">{g}G</text>
            </g>
          );
        })}
        {/* Threshold line */}
        <line x1={padL} y1={thresholdY} x2={padL + plotW} y2={thresholdY}
          stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.6" />
        <text x={padL + 2} y={Math.max(padT, thresholdY - 3)} fontSize="8" fill="#ef4444" opacity="0.8">limit</text>
        {/* Waveform line */}
        {points.length > 1 && (
          <path d={pathD} fill="none" stroke="#5b9bd5" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />
        )}
        {/* Dots */}
        {points.map((v, i) => {
          const x = padL + i * stepX;
          const y = yOf(v);
          const isHigh = v >= threshold;
          return (
            <circle key={i} cx={x} cy={y} r={isHigh ? 4 : 3}
              fill={isHigh ? "#ef4444" : "#5b9bd5"} />
          );
        })}
        {/* Bottom label */}
        <text x={padL + plotW / 2} y={padT + plotH + 18} textAnchor="middle" fontSize="10" fontWeight="500" fill="#888">
          Avg impact per run (G-force) · {points.length} run{points.length !== 1 ? "s" : ""}
        </text>
      </svg>
    </Box>
  );
}

/* ───────────── Info Button with Popover ───────────── */
function InfoPopover({ summary }: { summary: string }) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          color: "#999",
          p: 0.5,
          "&:hover": { color: "#666" },
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 22 }} />
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              maxWidth: 280,
              p: 2,
              borderRadius: 3,
              boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
            },
          },
        }}
      >
        <Typography sx={{ fontSize: "0.85rem", lineHeight: 1.6, color: "#444" }}>
          {summary}
        </Typography>
      </Popover>
    </>
  );
}

/* ───────────── Skill Visualization Router ───────────── */
function SkillVisualization({
  skillId,
  hasData,
  cadence,
  goal,
  gct,
  strikeZone,
  heelPct,
  midPct,
  forePct,
  shockPoints,
  shockThreshold,
}: {
  skillId: number;
  hasData: boolean;
  cadence: number | null;
  goal: number;
  gct: number | null;
  strikeZone: "heel" | "midfoot" | "forefoot";
  heelPct: number | null;
  midPct: number | null;
  forePct: number | null;
  shockPoints: number[];
  shockThreshold: number;
}) {
  if (!hasData && skillId !== 4) {
    return (
      <Box sx={{ textAlign: "center", py: 3 }}>
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
          Complete a run to see your stats
        </Typography>
      </Box>
    );
  }

  switch (skillId) {
    case 1:
      return <TargetRing value={Math.round(cadence ?? 0)} goal={goal} />;
    case 2:
      return (
        <HeatMapShoe
          zone={strikeZone}
          heelPct={heelPct}
          midPct={midPct}
          forePct={forePct}
        />
      );
    case 3:
      return <SpringGauge value={Math.round(gct ?? 0)} proLine={220} />;
    case 4:
      return <ShockWaveform points={shockPoints} threshold={shockThreshold} />;
    default:
      return null;
  }
}

/* ───────────────── RunIQ Trend Line (SVG) ─────────────────── */
function TrendLine({ scores }: { scores: number[] }) {
  // SVG canvas
  const W = 220, H = 90;
  const padL = 20, padR = 20, padT = 8, padB = 8;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // Map RunIQ (0–200) → SVG y (high score = top = small y)
  const toY = (s: number) => padT + plotH - (Math.min(s, 200) / 200) * plotH;
  const toX = (i: number) =>
    scores.length > 1
      ? padL + (i / (scores.length - 1)) * plotW
      : padL + plotW / 2;

  const pts = scores.map((s, i) => ({ x: toX(i), y: toY(s) }));
  const polyline = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%" }}
    >
      {pts.length > 1 && (
        <polyline
          points={polyline}
          stroke="white"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" />
      ))}
    </svg>
  );
}

/* ─────────────────── Constants ─────────────────── */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ─────────────────── Helpers ─────────────────── */
function formatDuration(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins} min`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/* ─────────────── RunIQ Calculator ─────────────── */
/**
 * Calculate a single-run RunIQ score (max 200) using the four-module formula:
 *
 *   P_C = max(0,  50 - 2 × |C_avg - C_target|)           cadence penalty
 *   P_Z = 50 × M_%                                         midfoot %
 *   P_S = max(0, min(50,  50 - (S_avg - 220) / 2))        ground contact
 *   P_I = 50 × (1 - H_%)                                  shock spike %
 *   RunIQ = P_C + P_Z + P_S + P_I
 *
 * H_% is approximated from avg_shock vs the run-group's minimum shock baseline.
 */
function calcRunIQ(
  run: RunRecord,
  cTarget: number,   // personalised cadence target (SPM)
  shockBaseline: number, // minimum avg_shock across the analysed runs
): number {
  // P_C — Cadence
  const pC =
    run.avg_cadence != null
      ? Math.max(0, 50 - 2 * Math.abs(run.avg_cadence - cTarget))
      : 0;

  // P_Z — Landing Zone (midfoot %)
  const pZ = run.midfoot_pct != null ? 50 * (run.midfoot_pct / 100) : 0;

  // P_S — Ground Spring (contact time)
  const pS =
    run.avg_gct != null
      ? Math.max(0, Math.min(50, 50 - (run.avg_gct - 220) / 2))
      : 0;

  // P_I — Landing Impact
  // H_% = what fraction of their impact was "stomping" above the baseline×1.15 limit.
  // We approximate linearly: 0% heavy at ratio=1.15 → 100% heavy at ratio=2.0.
  let pI = 0;
  if (run.avg_shock != null && shockBaseline > 0) {
    const ratio = run.avg_shock / shockBaseline;
    const heavyPct = ratio > 1.15 ? Math.min(1, (ratio - 1.15) / 0.85) : 0;
    pI = 50 * (1 - heavyPct);
  }

  return Math.round(pC + pZ + pS + pI);
}

/* ─────────────── Last Run type ─────────────── */
interface RunRecord {
  id: number;
  date: string;
  distance_m: number;
  duration_s: number;
  avg_pace:     string | null;
  avg_cadence:  number | null;
  avg_gct:      number | null;
  avg_shock:    number | null;
  heel_pct:     number | null;
  midfoot_pct:  number | null;
  forefoot_pct: number | null;
}

/* ════════════════════════════ DASHBOARD PAGE ═════════════════════════════ */
export default function DashboardPage() {
  const router = useRouter();
  const [navValue, setNavValue] = useState(0);
  const [username, setUsername] = useState("");
  const [lastRun, setLastRun] = useState<RunRecord | null>(null);
  const [recentRuns, setRecentRuns] = useState<RunRecord[]>([]);
  // User profile — needed for personalised cadence target in RunIQ
  const [userHeightCm, setUserHeightCm] = useState<number>(175);
  const [userGender, setUserGender] = useState<number>(0); // 0 = male, 1 = female

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (stored) setUsername(stored);

    const token = localStorage.getItem("access_token");
    if (!token) return;

    const headers: HeadersInit = {
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "1",
    };

    // Fetch user profile (height + gender for RunIQ cadence target)
    fetch(`${API_BASE}/auth/me`, { headers, cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const h = Number(data.height);
        if (h > 0) setUserHeightCm(h);
        if (data.gender?.toLowerCase?.() === "female") setUserGender(1);
      })
      .catch(() => {});

    // Fetch run history
    fetch(`${API_BASE}/runs`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.runs?.length > 0) {
          const runs: RunRecord[] = data.runs;
          setLastRun(runs[0]);              // newest for the Last Run card
          setRecentRuns(runs.slice(0, 10)); // up to 10 for skill aggregates
        }
      })
      .catch(() => {});
  }, []);

  /* ── Personalised cadence target (same formula as run page) ── */
  const cTarget = Math.round(180 - (userHeightCm - 175) / 2 + userGender * 3);

  /* ── Compute skill aggregates from the last ≤10 runs ── */
  const strideRuns = recentRuns.filter((r) => r.avg_cadence != null);

  const mean = (vals: (number | null)[]): number | null => {
    const valid = vals.filter((v): v is number => v != null);
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  };

  const aggCadence  = mean(strideRuns.map((r) => r.avg_cadence));
  const aggGct      = mean(strideRuns.map((r) => r.avg_gct));
  const aggHeelPct  = mean(strideRuns.map((r) => r.heel_pct));
  const aggMidPct   = mean(strideRuns.map((r) => r.midfoot_pct));
  const aggForePct  = mean(strideRuns.map((r) => r.forefoot_pct));

  // Dominant strike zone — whichever averaged % is highest
  const dominantZone: "heel" | "midfoot" | "forefoot" =
    aggHeelPct != null && aggMidPct != null && aggForePct != null
      ? aggHeelPct >= aggMidPct && aggHeelPct >= aggForePct
        ? "heel"
        : aggForePct > aggMidPct
        ? "forefoot"
        : "midfoot"
      : "midfoot";

  // Shock waveform: avg_shock per run, oldest → newest (left → right)
  const shockPoints: number[] = [...recentRuns]
    .reverse()
    .map((r) => r.avg_shock)
    .filter((v): v is number => v != null);

  const avgShock    = mean(shockPoints);
  const shockThresh = avgShock != null ? +(avgShock * 1.15).toFixed(2) : 4.0;

  const hasStrideData = strideRuns.length > 0;

  /* ── RunIQ: last ≤6 runs with stride data ── */
  // Take the most recent 6 stride runs (still newest-first from API)
  const runsForIQ = strideRuns.slice(0, 6);

  // Shock baseline = the minimum avg_shock in those runs (their "best form" reference)
  const shockValues = runsForIQ
    .map((r) => r.avg_shock)
    .filter((v): v is number => v != null);
  const shockBaseline = shockValues.length > 0 ? Math.min(...shockValues) : 2.0;

  // Calculate RunIQ for each run — reverse so the trend line goes oldest → newest
  const runIQScores: number[] = [...runsForIQ]
    .reverse()
    .map((r) => calcRunIQ(r, cTarget, shockBaseline));

  // Display score = average of those RunIQ values (rounded)
  const displayRunIQ =
    runIQScores.length > 0
      ? Math.round(runIQScores.reduce((a, b) => a + b, 0) / runIQScores.length)
      : null;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        bgcolor: "#f2f2f2",
        maxWidth: 600,
        mx: "auto",
      }}
    >
      {/* ─── Scrollable Content Area ─── */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 2,
          pt: 3,
          pb: "80px", // space for fixed bottom nav
        }}
      >
        {/* 1 · Greeting Header */}
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, mb: 2.5, color: "#1a1a1a" }}
        >
          Hello, {username || "there"}
        </Typography>

        {/* 2 · RunIQ Hero Card */}
        <Card
          sx={{
            bgcolor: "#8ec8e8",
            borderRadius: 3,
            border: "2px solid #8b5cf6",
            boxShadow: "none",
            mb: 2.5,
          }}
        >
          <CardContent
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 2.5,
              "&:last-child": { pb: 2.5 },
            }}
          >
            {/* Left – score + label */}
            <Box sx={{ minWidth: 100 }}>
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                <Typography
                  sx={{
                    fontSize: "3.5rem",
                    fontWeight: 700,
                    lineHeight: 1,
                    color: "#fff",
                  }}
                >
                  {displayRunIQ ?? "—"}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "1rem",
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.5)",
                    lineHeight: 1,
                    mb: 0.25,
                  }}
                >
                  / 200
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: "1rem",
                  fontStyle: "italic",
                  color: "#fff",
                  mt: 0.5,
                }}
              >
                RunIQ
              </Typography>
            </Box>

            {/* Right – RunIQ trend line */}
            <Box sx={{ flex: 1, maxWidth: 220, height: 80, ml: 2 }}>
              <TrendLine scores={runIQScores} />
            </Box>
          </CardContent>
        </Card>

        {/* 3 · Last Run Card (clickable → /runs) */}
        <Card
          onClick={() => router.push("/runs")}
          sx={{
            borderRadius: 3,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            mb: 2.5,
            cursor: "pointer",
            transition: "box-shadow 0.2s ease",
            "&:hover": { boxShadow: "0 2px 12px rgba(0,0,0,0.1)" },
          }}
        >
          <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                Last Run
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "#5b9bd5", fontWeight: 600 }}>
                View all →
              </Typography>
            </Box>
            {lastRun ? (
              <>
                <Typography sx={{ color: "text.secondary", fontSize: "0.9rem" }}>
                  {formatDate(lastRun.date)}
                </Typography>
                <Typography
                  sx={{ color: "text.secondary", fontSize: "0.9rem", mt: 0.25 }}
                >
                  {(lastRun.distance_m / 1609.344).toFixed(2)} mi &nbsp;|&nbsp; {formatDuration(lastRun.duration_s)}
                  {lastRun.avg_pace && lastRun.avg_pace !== "--:--" ? ` · ${lastRun.avg_pace}/mi` : ""}
                </Typography>
              </>
            ) : (
              <Typography sx={{ color: "text.secondary", fontSize: "0.9rem" }}>
                No runs yet — go for your first run!
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* 4 · Skill Cards — Swipeable */}
        <Box
          sx={{
            mb: 2.5,
            /* Pagination dot styling for skill swiper */
            "& .skill-swiper .swiper-pagination": {
              position: "relative",
              mt: 1.5,
              bottom: "auto !important",
            },
            "& .skill-swiper .swiper-pagination-bullet": {
              bgcolor: "#d4e6f6",
              width: 8,
              height: 8,
              opacity: 1,
              transition: "all 0.3s ease",
            },
            "& .skill-swiper .swiper-pagination-bullet-active": {
              bgcolor: "#5b9bd5",
              width: 20,
              borderRadius: "4px",
            },
            /* Make all slides equal height */
            "& .skill-swiper .swiper-wrapper": {
              alignItems: "stretch",
            },
            "& .skill-swiper .swiper-slide": {
              height: "auto",
            },
          }}
        >
          <Swiper
            className="skill-swiper"
            modules={[Pagination]}
            pagination={{ clickable: true }}
            spaceBetween={12}
            slidesPerView={1}
            autoHeight={false}
          >
            {skillMetrics.map((skill) => (
              <SwiperSlide key={skill.id} style={{ height: "auto" }}>
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    position: "relative",
                    overflow: "visible",
                    height: "100%",
                  }}
                >
                  <CardContent
                    sx={{
                      p: 2.5,
                      "&:last-child": { pb: 2.5 },
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                    }}
                  >
                    {/* Info icon — top right */}
                    <InfoPopover summary={skill.summary} />

                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        color: "text.secondary",
                        letterSpacing: 0.5,
                        mb: 0.5,
                      }}
                    >
                      {skill.label}
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: "1.05rem" }}>
                      {skill.title}
                    </Typography>

                    {/* Visualization — flex-grow to fill remaining space */}
                    <Box
                      sx={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <SkillVisualization
                        skillId={skill.id}
                        hasData={hasStrideData}
                        cadence={aggCadence}
                        goal={cTarget}
                        gct={aggGct}
                        strikeZone={dominantZone}
                        heelPct={aggHeelPct}
                        midPct={aggMidPct}
                        forePct={aggForePct}
                        shockPoints={shockPoints}
                        shockThreshold={shockThresh}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </SwiperSlide>
            ))}
          </Swiper>
        </Box>

        {/* 5 · How to Level Up — Swipeable Tips */}
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            mb: 2,
            overflow: "visible",
          }}
        >
          <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: "0.8rem",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                mb: 1.5,
              }}
            >
              How to Level Up
            </Typography>

            {/* Swiper Carousel */}
            <Box
              sx={{
                /* Pagination dot styling overrides */
                "& .swiper-pagination": {
                  bottom: "10px !important",
                },
                "& .swiper-pagination-bullet": {
                  bgcolor: "rgba(255,255,255,0.5)",
                  width: 8,
                  height: 8,
                  opacity: 1,
                  transition: "all 0.3s ease",
                },
                "& .swiper-pagination-bullet-active": {
                  bgcolor: "#fff",
                  width: 20,
                  borderRadius: "4px",
                },
              }}
            >
              <Swiper
                modules={[Pagination, Autoplay]}
                pagination={{ clickable: true }}
                autoplay={{ delay: 6000, disableOnInteraction: true }}
                loop
                spaceBetween={0}
                slidesPerView={1}
                style={{ borderRadius: 12 }}
              >
                {coachingTips.map((tip) => (
                  <SwiperSlide key={tip.id}>
                    <Box
                      component="a"
                      href={tip.articleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        position: "relative",
                        borderRadius: 3,
                        overflow: "hidden",
                        height: 200,
                        backgroundImage: `url(${tip.imageSrc})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        display: "flex",
                        alignItems: "flex-end",
                        p: 2.5,
                        textDecoration: "none",
                        cursor: "pointer",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      {/* Gradient overlay for readability */}
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.05) 100%)",
                        }}
                      />
                      <Typography
                        sx={{
                          position: "relative",
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          lineHeight: 1.55,
                          textShadow: "0 1px 6px rgba(0,0,0,0.4)",
                          pr: 1,
                        }}
                      >
                        &ldquo;{tip.quote}&rdquo;
                      </Typography>
                    </Box>
                  </SwiperSlide>
                ))}
              </Swiper>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 6 · Bottom Navigation (fixed) */}
      <BottomNavigation
        value={navValue}
        onChange={(_, newValue) => {
          setNavValue(newValue);
          if (newValue === 1) router.push("/record");
          if (newValue === 2) router.push("/profile");
        }}
        showLabels
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          maxWidth: 600,
          mx: "auto",
          bgcolor: "#a8d4e6",
          height: 64,
          borderTop: "1px solid rgba(0,0,0,0.06)",
          "& .MuiBottomNavigationAction-root": {
            color: "#1a1a1a",
            minWidth: 0,
            "&.Mui-selected": {
              color: "#1a1a1a",
            },
          },
          "& .MuiBottomNavigationAction-label": {
            fontSize: "0.7rem",
            "&.Mui-selected": {
              fontSize: "0.7rem",
            },
          },
        }}
      >
        <BottomNavigationAction
          label="Home"
          icon={<HomeOutlinedIcon sx={{ fontSize: 28 }} />}
        />
        <BottomNavigationAction
          label="Record"
          icon={<RecordButton sx={{ fontSize: 28 }} />}
        />
        <BottomNavigationAction
          label="Profile"
          icon={<ProfileIcon sx={{ fontSize: 28 }} />}
        />
      </BottomNavigation>
    </Box>
  );
}
