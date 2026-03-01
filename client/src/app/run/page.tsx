"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { speak } from "@/lib/tts";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Divider from "@mui/material/Divider";
import Popover from "@mui/material/Popover";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SpeedIcon from "@mui/icons-material/Speed";
import StraightenIcon from "@mui/icons-material/Straighten";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Map, { Marker, Source, Layer, type MapRef } from "react-map-gl/mapbox";
import type { LayerProps } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

/* ─────────────────────── Constants ─────────────────────── */
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const NODE_URL = process.env.NEXT_PUBLIC_NODE_URL ?? "https://bronson-nonignitable-waylon.ngrok-free.dev";
const NODE_WS_URL = NODE_URL.replace(/^https?/, NODE_URL.startsWith("https") ? "wss" : "ws");

// Default viewport — Irvine, CA
const DEFAULT_CENTER = { longitude: -117.826166, latitude: 33.684566 };
const DEFAULT_ZOOM = 15;

/* ─── Collapsed / expanded drawer heights ─── */
const COLLAPSED_HEIGHT = 290; // px – compact metrics + buttons
const EXPANDED_HEIGHT_VH = 82; // vh – 2×2 skill grid view

/* ─────────────────── Helper: format time ─────────────────── */
function formatTime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");

  if (hrs > 0) {
    const hh = String(hrs).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/* ────────────── Helper: format pace (min/mi) ─────────────── */
function formatPace(distanceMiles: number, totalSeconds: number): string {
  if (distanceMiles <= 0.01 || totalSeconds <= 0) return "--:--";
  const paceSeconds = totalSeconds / distanceMiles;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.floor(paceSeconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/* ──────────── Helper: haversine distance (meters) ────────── */
function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ────────────── Route line style (Mapbox layer) ──────────── */
const routeLineStyle: LayerProps = {
  id: "route-line",
  type: "line",
  paint: {
    "line-color": "#5b9bd5",
    "line-width": 4,
    "line-opacity": 0.9,
  },
};

/* ══════════════════ Stride Sensor Data Types ═══════════════════ */
interface StrideData {
  cadence: number; // steps per minute
  gct: number; // ground contact time in ms
  shock: number; // impact shock in g
  strike: string; // e.g. "Forefoot Strike", "Heel Strike", "Midfoot Strike"
}

const DEFAULT_STRIDE_DATA: StrideData = {
  cadence: 0,
  gct: 0,
  shock: 0,
  strike: "---",
};

/* ══════════════════ User Profile for Goal Calc ═══════════════════ */
interface UserProfile {
  height_cm: number; // centimeters
  weight_kg: number; // kilograms
  gender: number; // 0 = male, 1 = female
}

/* ══════════════════ Goal Targets (computed from profile) ═══════════════════ */
interface StrideGoals {
  /** Personalized cadence target (SPM). Ring fills when within ±5 of this. */
  cadenceTarget: number;
  /** Lower bound of cadence "green zone" */
  cadenceLow: number;
  /** Upper bound of cadence "green zone" */
  cadenceHigh: number;
  /** Personalized "pro line" for GCT (ms). Below = blue, above = orange. */
  gctProLine: number;
  /** GCT threshold where it turns orange (gctProLine + buffer) */
  gctWarnLine: number;
  /** Shock baseline (G) — either rolling average from first 60s or static fallback */
  shockBaseline: number;
  /** Shock spike threshold = baseline × 1.15 */
  shockSpikeThreshold: number;
}

const DEFAULT_GOALS: StrideGoals = {
  cadenceTarget: 170,
  cadenceLow: 165,
  cadenceHigh: 175,
  gctProLine: 220,
  gctWarnLine: 260,
  shockBaseline: 2.0,
  shockSpikeThreshold: 2.3,
};

/**
 * Calculate personalized stride goals from user profile.
 *
 * Cadence: Anchored at 180 SPM for a 175 cm runner.
 *   - Subtract 1 SPM per 2 cm above 175 cm (taller = longer leg pendulum = slower cadence).
 *   - Add 1 SPM per 2 cm below 175 cm (shorter = faster cadence).
 *   - Females get +3 SPM adjustment (shorter average stride length at same height).
 *   - Target zone is ±5 SPM around the computed value.
 *   Sources: Heiderscheit et al. (2011), Burns et al. (2019)
 *
 * Ground Contact Time: Anchored at 210 ms for a 70 kg / 175 cm runner.
 *   - +0.5 ms per kg over 70 kg (heavier runners spend slightly more time on ground).
 *   - +0.4 ms per cm over 175 cm (longer legs = longer ground phase).
 *   - +5 ms for females (wider pelvis → slightly longer stance phase).
 *   - "Pro Line" = computed value. Warning at +40 ms above pro line.
 *   Sources: Lienhard et al. (2014), Nummela et al. (2007)
 *
 * Shock: Rolling baseline from first 60 seconds of the run.
 *   - Captures the runner's "fresh form" G-force.
 *   - Any spike >15% above baseline indicates form breakdown.
 *   - Fallback to 2.0 G if no baseline yet.
 */
function calculateGoals(profile: UserProfile | null, shockBaselineOverride?: number): StrideGoals {
  if (!profile) return DEFAULT_GOALS;

  const { height_cm: h, weight_kg: w, gender: g } = profile;

  // ── Cadence ──
  const cadenceTarget = Math.round(180 - (h - 175) / 2 + g * 3);
  const cadenceLow = cadenceTarget - 5;
  const cadenceHigh = cadenceTarget + 5;

  // ── Ground Contact Time ──
  const gctProLine = Math.round(210 + (w - 70) * 0.5 + (h - 175) * 0.4 + g * 5);
  const gctWarnLine = gctProLine + 40;

  // ── Shock ──
  const shockBaseline = shockBaselineOverride ?? 2.0;
  const shockSpikeThreshold = +(shockBaseline * 1.15).toFixed(2);

  return {
    cadenceTarget,
    cadenceLow,
    cadenceHigh,
    gctProLine,
    gctWarnLine,
    shockBaseline,
    shockSpikeThreshold,
  };
}

/* ═══════════════ Skill Metric Definitions ═══════════════════ */
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

/* ═══════════════ Viz 1: Target Ring (Cadence) — Compact ═══════════════ */
function TargetRing({
  value,
  target,
  low,
  high,
}: {
  value: number;
  target: number;
  low: number;
  high: number;
}) {
  // Ring fills based on how close value is to the target zone [low, high].
  // 100% fill when value is within the zone.
  const pct = value === 0 ? 0 : Math.min(value / target, 1);
  const inZone = value >= low && value <= high;
  const radius = 34;
  const stroke = 7;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);
  const color = inZone ? "#22c55e" : pct >= 0.85 ? "#5b9bd5" : "#f59e0b";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={radius} fill="none" stroke="#e8edf2" strokeWidth={stroke} />
        <circle
          cx="45" cy="45" r={radius}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 45 45)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text x="45" y="42" textAnchor="middle" fontSize="20" fontWeight="700" fill="#1a1a1a">
          {value === 0 ? "—" : value}
        </text>
        <text x="45" y="56" textAnchor="middle" fontSize="9" fontWeight="500" fill="#888">
          SPM
        </text>
      </svg>
      <Typography sx={{ fontSize: "0.55rem", color: "#999", mt: -0.5 }}>
        Goal: {low}–{high}
      </Typography>
    </Box>
  );
}

/* ═══════════════ Viz 2: Heat-Map Shoe (Foot Strike) — Compact ═══════════════ */
function HeatMapShoe({ zone, hasData }: { zone: "heel" | "midfoot" | "toe"; hasData: boolean }) {
  const heelColor = !hasData ? "#e8edf2" : zone === "heel" ? "#ef4444" : "#e8edf2";
  const midColor = !hasData ? "#e8edf2" : zone === "midfoot" ? "#22c55e" : "#e8edf2";
  const toeColor = !hasData ? "#e8edf2" : zone === "toe" ? "#f59e0b" : "#e8edf2";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <svg width="130" height="65" viewBox="0 0 200 100" style={{ maxWidth: "100%" }}>
        <path
          d="M30,75 Q20,70 18,55 Q16,40 25,30 Q35,18 55,15 Q80,12 110,14 Q140,16 160,22 Q175,28 182,42 Q188,55 185,68 Q182,78 170,80 L30,80 Z"
          fill="none" stroke="#ccc" strokeWidth="2.5"
        />
        <ellipse cx="45" cy="58" rx="20" ry="16" fill={heelColor} opacity="0.7" />
        <ellipse cx="105" cy="50" rx="30" ry="18" fill={midColor} opacity="0.7" />
        <ellipse cx="165" cy="48" rx="18" ry="14" fill={toeColor} opacity="0.7" />
        <text x="45" y="62" textAnchor="middle" fontSize="10" fontWeight="600" fill="#555">Heel</text>
        <text x="105" y="54" textAnchor="middle" fontSize="10" fontWeight="600" fill="#555">Mid</text>
        <text x="165" y="52" textAnchor="middle" fontSize="10" fontWeight="600" fill="#555">Toe</text>
      </svg>
      <Typography
        sx={{
          fontSize: "0.65rem",
          fontWeight: 700,
          mt: 0.25,
          color: !hasData ? "#bbb" : zone === "midfoot" ? "#22c55e" : zone === "heel" ? "#ef4444" : "#f59e0b",
        }}
      >
        {!hasData ? "Waiting…" : zone === "midfoot" ? "✓ Midfoot" : zone === "heel" ? "⚠ Heel" : "⚠ Toe"}
      </Typography>
      <Typography sx={{ fontSize: "0.55rem", color: "#999" }}>
        Goal: Midfoot
      </Typography>
    </Box>
  );
}

/* ═══════════════ Viz 3: Spring Gauge (Ground Contact Time) — Compact ═══════════════ */
function SpringGauge({
  value,
  proLine,
  warnLine,
}: {
  value: number;
  proLine: number;
  warnLine: number;
}) {
  const maxVal = 350;
  const barHeight = 60;
  const fillPct = value === 0 ? 0 : Math.min(value / maxVal, 1);
  const fillH = barHeight * fillPct;
  const proY = barHeight - barHeight * (proLine / maxVal);
  const isGood = value <= proLine;
  const isWarn = value > warnLine;
  const barColor = value === 0 ? "#e8edf2" : isGood ? "#5b9bd5" : isWarn ? "#ef4444" : "#f97316";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <svg width="90" height="85" viewBox="0 0 90 85">
        <rect x="25" y="5" width="30" height={barHeight} rx="5" fill="#e8edf2" />
        <rect
          x="25" y={5 + barHeight - fillH} width="30" height={fillH}
          rx="5" fill={barColor}
          style={{ transition: "all 0.5s ease" }}
        />
        <line
          x1="19" y1={5 + proY} x2="61" y2={5 + proY}
          stroke="#22c55e" strokeWidth="1.5" strokeDasharray="3,2"
        />
        <text x="66" y={5 + proY + 3} fontSize="7" fontWeight="600" fill="#22c55e">
          Pro
        </text>
        <text x="40" y={5 + barHeight - fillH - 4} textAnchor="middle"
          fontSize="11" fontWeight="700" fill={barColor}>
          {value === 0 ? "—" : `${value}ms`}
        </text>
        <text x="45" y="80" textAnchor="middle" fontSize="8" fontWeight="500" fill="#888">
          Lower is better
        </text>
      </svg>
      <Typography sx={{ fontSize: "0.55rem", color: "#999", mt: -0.5 }}>
        Pro: {proLine}ms
      </Typography>
    </Box>
  );
}

/* ═══════════════ Viz 4: Shock Waveform (Impact) — Compact ═══════════════ */
function ShockWaveform({ history, threshold }: { history: number[]; threshold: number }) {
  const points = history.length > 0 ? history : [];
  if (points.length === 0) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 75 }}>
        <Typography sx={{ fontSize: "0.75rem", color: "#bbb" }}>Waiting for data…</Typography>
        <Typography sx={{ fontSize: "0.55rem", color: "#999", mt: 0.5 }}>
          Spike threshold: {threshold.toFixed(1)}G
        </Typography>
      </Box>
    );
  }
  const w = 120;
  const h = 55;
  const stepX = w / (points.length - 1);

  const pathD = points
    .map((v, i) => {
      const x = i * stepX;
      const y = h - (v / 3) * h;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  const thresholdY = h - (threshold / 3) * h;

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="140" height="75" viewBox="0 0 140 75" style={{ maxWidth: "100%" }}>
        {[1, 2, 3].map((g) => {
          const y = h - (g / 3) * h;
          return (
            <g key={g}>
              <line x1="0" y1={y} x2={w} y2={y} stroke="#eee" strokeWidth="0.5" />
              <text x={w + 3} y={y + 3} fontSize="6" fill="#bbb">{g}G</text>
            </g>
          );
        })}
        <line x1="0" y1={thresholdY} x2={w} y2={thresholdY}
          stroke="#ef4444" strokeWidth="1" strokeDasharray="3,2" opacity="0.6" />
        <path d={pathD} fill="none" stroke="#5b9bd5" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
        {points.map((v, i) => {
          const x = i * stepX;
          const y = h - (v / 3) * h;
          const isHigh = v >= threshold;
          return (
            <circle key={i} cx={x} cy={y} r={isHigh ? 3 : 2}
              fill={isHigh ? "#ef4444" : "#5b9bd5"} />
          );
        })}
        <text x={w / 2} y="70" textAnchor="middle" fontSize="7" fontWeight="500" fill="#888">
          G-force per step
        </text>
      </svg>
      <Typography sx={{ fontSize: "0.55rem", color: "#999", mt: -0.5 }}>
        Spike line: {threshold.toFixed(1)}G
      </Typography>
    </Box>
  );
}

/* ═══════════════ Info Popover ═══════════════ */
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
        <InfoOutlinedIcon sx={{ fontSize: 20 }} />
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

/* ═══════════════ Skill Visualization Router ═══════════════ */
function SkillVisualization({
  skillId,
  strideData,
  shockHistory,
  goals,
}: {
  skillId: number;
  strideData: StrideData;
  shockHistory: number[];
  goals: StrideGoals;
}) {
  const strike = strideData.strike.toLowerCase();
  const strikeZone: "heel" | "midfoot" | "toe" =
    strike.includes("heel") ? "heel"
    : strike.includes("midfoot") || strike.includes("mid") ? "midfoot"
    : strike === "---" ? "midfoot" // default before data arrives
    : "toe";

  switch (skillId) {
    case 1:
      return (
        <TargetRing
          value={Math.round(strideData.cadence)}
          target={goals.cadenceTarget}
          low={goals.cadenceLow}
          high={goals.cadenceHigh}
        />
      );
    case 2:
      return <HeatMapShoe zone={strikeZone} hasData={strideData.strike !== "---"} />;
    case 3:
      return (
        <SpringGauge
          value={Math.round(strideData.gct)}
          proLine={goals.gctProLine}
          warnLine={goals.gctWarnLine}
        />
      );
    case 4:
      return <ShockWaveform history={shockHistory} threshold={goals.shockSpikeThreshold} />;
    default:
      return null;
  }
}

/* ═══════════════════════ RUN PAGE ════════════════════════════ */
export default function RunPage() {
  const router = useRouter();

  /* ── Run state ── */
  type RunStatus = "running" | "paused";
  const [status, setStatus] = useState<RunStatus>("running");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [userPosition, setUserPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const [geoDebug, setGeoDebug] = useState("Initializing...");

  /* ── Drawer state ── */
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const touchStartRef = useRef<number | null>(null);

  /* ── User profile & computed goals ── */
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [shockBaselineComputed, setShockBaselineComputed] = useState<number | null>(null);
  const shockCalibrationSamples = useRef<number[]>([]); // first 60s of shock readings
  const shockCalibrationDone = useRef(false);
  const runStartTime = useRef(Date.now());

  /* ── Stride sensor data (from Arduino WebSocket) ── */
  const [strideData, setStrideData] = useState<StrideData>(DEFAULT_STRIDE_DATA);
  const [shockHistory, setShockHistory] = useState<number[]>([]);

  /* ── Computed goals (recalculated when profile or shock baseline changes) ── */
  const goals = calculateGoals(userProfile, shockBaselineComputed ?? undefined);

  /* ── Refs ── */
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<MapRef | null>(null);
  const statusRef = useRef<RunStatus>(status);
  const positionCountRef = useRef(0);

  // Keep the ref in sync with state
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  /* ── TTS queue: process audio cues one at a time ── */
  const ttsQueueRef = useRef<string[]>([]);
  const ttsPlayingRef = useRef(false);

  const processTtsQueue = useCallback(async () => {
    if (ttsPlayingRef.current) return;
    const next = ttsQueueRef.current.shift();
    if (!next) return;
    ttsPlayingRef.current = true;
    try {
      await speak(next);
    } catch (err: unknown) {
      console.warn("[TTS]", err);
    } finally {
      ttsPlayingRef.current = false;
      processTtsQueue();
    }
  }, []);

  /* ── Welcome greeting on mount ── */
  /* ── Fetch user profile on mount (for goal calculations) ── */
  useEffect(() => {
    const username = localStorage.getItem("username") ?? "runner";
    ttsQueueRef.current.push(`Welcome back ${username}! Ready to run?`);
    processTtsQueue();
    const token = localStorage.getItem("access_token");
    if (!token) return;

    fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "1",
      },
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const h = Number(data.height);
        const w = Number(data.weight);
        if (h > 0 && w > 0) {
          const g = data.gender?.toLowerCase?.() === "female" ? 1 : 0;
          setUserProfile({ height_cm: h, weight_kg: w, gender: g });
          console.log("[Goals] Profile loaded:", { h, w, g });
        }
      })
      .catch((err) => console.warn("[Goals] Failed to load profile:", err));
  }, []);

  /* ── Arduino WebSocket ── */
  useEffect(() => {
    const ws = new WebSocket(`${NODE_WS_URL}/ws/app`);
    ws.onmessage = (event) => {
      console.log("[Arduino]", event.data);
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === "audio_cue" && typeof data.message === "string") {
          ttsQueueRef.current.push(data.message);
          processTtsQueue();
        }
      } catch {
        // non-JSON frame — ignore
        const msg = JSON.parse(event.data);

        // ── Telemetry: stride metric moving averages ──
        if (msg?.type === "telemetry" && msg.data) {
          const d = msg.data;
          setStrideData((prev) => ({
            cadence: typeof d.cadence === "number" ? d.cadence : prev.cadence,
            gct: typeof d.gct === "number" ? d.gct : prev.gct,
            shock: typeof d.shock === "number" ? d.shock : prev.shock,
            strike: typeof d.strike === "string" ? d.strike : prev.strike,
          }));

          // ── Shock rolling baseline (first 60 seconds) ──
          if (typeof d.shock === "number") {
            // Append to waveform history (keep last 20 points)
            setShockHistory((prev) => {
              const next = [...prev, d.shock];
              return next.length > 20 ? next.slice(-20) : next;
            });

            // Build baseline from first 60 seconds of data
            if (!shockCalibrationDone.current) {
              const elapsed = (Date.now() - runStartTime.current) / 1000;
              shockCalibrationSamples.current.push(d.shock);

              if (elapsed >= 60 && shockCalibrationSamples.current.length >= 5) {
                // Compute average of calibration samples
                const samples = shockCalibrationSamples.current;
                const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
                setShockBaselineComputed(+avg.toFixed(2));
                shockCalibrationDone.current = true;
                console.log(
                  `[Goals] Shock baseline established: ${avg.toFixed(2)}G from ${samples.length} samples`
                );
              }
            }
          }
        }

      }
    };
    ws.onerror = (err) => {
      console.error("[Arduino WS error]", err);
    };
    return () => {
      ws.close();
    };
  }, [processTtsQueue]);

  /* ── Timer ── */
  useEffect(() => {
    if (status === "running") {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  /* ── Shared position handler (used by both watchPosition and polling) ── */
  const handlePosition = useCallback((pos: GeolocationPosition) => {
    const { latitude: lat, longitude: lng, accuracy, speed } = pos.coords;
    positionCountRef.current += 1;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const speedInfo = speed !== null ? `${(speed * 3.6).toFixed(1)}km/h` : "n/a";
    setGeoDebug(
      `✅ ${lat.toFixed(6)}, ${lng.toFixed(6)} | acc:${accuracy.toFixed(0)}m spd:${speedInfo} | #${positionCountRef.current} @ ${time}`
    );

    // Always update the blue dot position
    setUserPosition({ lat, lng });

    // Pan the map to follow the user
    mapRef.current?.flyTo({
      center: [lng, lat],
      duration: 800,
      essential: true,
    });

    // ── Only record route/distance when running ──
    if (statusRef.current !== "running") return;

    // Skip positions with very poor accuracy
    if (accuracy > 50) return;

    // Dynamic minimum distance: at least 5m, scaled with accuracy
    const minDistance = Math.max(accuracy * 0.4, 5);

    // If device reports speed and it's basically zero, skip (stationary drift)
    if (speed !== null && speed < 0.3) return;

    if (lastPositionRef.current) {
      const d = haversine(
        lastPositionRef.current.lat,
        lastPositionRef.current.lng,
        lat,
        lng
      );
      if (d > minDistance) {
        setDistanceMeters((prev) => prev + d);
        setRouteCoords((prev) => [...prev, [lng, lat]]);
        lastPositionRef.current = { lat, lng };
      }
    } else {
      lastPositionRef.current = { lat, lng };
      setRouteCoords([[lng, lat]]);
    }
  }, []);

  /* ── Geolocation: watchPosition + aggressive polling fallback ── */
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoDebug("❌ Geolocation API not available");
      return;
    }

    setGeoDebug("⏳ Requesting location permission...");

    const onError = (err: GeolocationPositionError) => {
      const reasons: Record<number, string> = {
        1: "Permission denied",
        2: "Position unavailable",
        3: "Timeout",
      };
      setGeoDebug(`❌ ${reasons[err.code] || "Unknown"}: ${err.message}`);
      console.warn("Geolocation error:", err.code, err.message);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      onError,
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      }
    );

    let pollActive = true;

    const pollLoop = () => {
      if (!pollActive) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handlePosition(pos);
          setTimeout(pollLoop, 1000);
        },
        () => {
          setTimeout(pollLoop, 2000);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 8000,
        }
      );
    };

    const pollStartTimer = setTimeout(pollLoop, 2000);

    return () => {
      pollActive = false;
      clearTimeout(pollStartTimer);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Derived values ── */
  const distanceMiles = distanceMeters / 1609.344;
  const pace = formatPace(distanceMiles, elapsedSeconds);

  /* ── Map viewport ── */
  const mapCenter = userPosition
    ? { longitude: userPosition.lng, latitude: userPosition.lat }
    : DEFAULT_CENTER;

  /* ── Route GeoJSON ── */
  const routeGeoJSON: GeoJSON.Feature<GeoJSON.Geometry> = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: routeCoords,
    },
  };

  /* ── Handlers ── */
  const handlePause = useCallback(() => {
    setStatus("paused");
    fetch(`${NODE_URL}/pause`, { method: "POST" }).catch(() => {});
  }, []);

  const handleResume = useCallback(() => {
    setStatus("running");
    fetch(`${NODE_URL}/start`, { method: "POST" }).catch(() => {});
  }, []);

  const handleStopConfirm = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    setConfirmStop(false);
    router.push("/record");
  }, [router]);

  const handleBack = useCallback(() => {
    router.push("/record");
  }, [router]);

  /* ── Drawer swipe handlers ── */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartRef.current === null) return;
      const delta = touchStartRef.current - e.changedTouches[0].clientY;
      const threshold = 50; // px
      if (delta > threshold && !drawerExpanded) {
        setDrawerExpanded(true);
      } else if (delta < -threshold && drawerExpanded) {
        setDrawerExpanded(false);
      }
      touchStartRef.current = null;
    },
    [drawerExpanded]
  );

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        bgcolor: "#f2f2f2",
      }}
    >
      {/* ═══════════ Geo Debug Banner ═══════════ */}
      <Box
        sx={{
          position: "absolute",
          top: 8,
          left: 8,
          right: 8,
          zIndex: 20,
          bgcolor: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(8px)",
          color: "#1a1a1a",
          px: 1.5,
          py: 0.75,
          borderRadius: 2,
          fontSize: 11,
          fontFamily: "monospace",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        GPS: {geoDebug}
      </Box>

      {/* ═══════════ Map Area ═══════════ */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          bottom: drawerExpanded ? `${EXPANDED_HEIGHT_VH}vh` : `${COLLAPSED_HEIGHT}px`,
          transition: "bottom 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: mapCenter.longitude,
            latitude: mapCenter.latitude,
            zoom: DEFAULT_ZOOM,
          }}
          mapStyle="mapbox://styles/mapbox/light-v11"
          mapboxAccessToken={MAPBOX_TOKEN}
          style={{ width: "100%", height: "100%" }}
          attributionControl={false}
        >
          {/* Route polyline */}
          {routeCoords.length >= 2 && (
            <Source id="route" type="geojson" data={routeGeoJSON}>
              <Layer {...routeLineStyle} />
            </Source>
          )}

          {/* User position dot */}
          <Marker
            longitude={userPosition?.lng ?? DEFAULT_CENTER.longitude}
            latitude={userPosition?.lat ?? DEFAULT_CENTER.latitude}
            anchor="center"
          >
            <Box
              sx={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  bgcolor: "rgba(91,155,213,0.2)",
                  animation: "gps-pulse 2s ease-out infinite",
                  "@keyframes gps-pulse": {
                    "0%": { transform: "scale(0.8)", opacity: 1 },
                    "100%": { transform: "scale(2.2)", opacity: 0 },
                  },
                }}
              />
              <Box
                sx={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  bgcolor: "#5b9bd5",
                  border: "3px solid #fff",
                  boxShadow: "0 0 12px rgba(91,155,213,0.5)",
                  zIndex: 1,
                }}
              />
            </Box>
          </Marker>
        </Map>
      </Box>

      {/* ═══════════ Top Bar — Back / Minimize ═══════════ */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          pt: "env(safe-area-inset-top, 12px)",
          px: 1,
          py: 1.5,
        }}
      >
        <IconButton
          onClick={handleBack}
          sx={{
            color: "#1a1a1a",
            bgcolor: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.95)" },
          }}
        >
          <KeyboardArrowDownIcon sx={{ fontSize: 28 }} />
        </IconButton>
      </Box>

      {/* ═══════════ Bottom Drawer (Swipe-Up) ═══════════ */}
      <Box
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          height: drawerExpanded ? `${EXPANDED_HEIGHT_VH}vh` : `${COLLAPSED_HEIGHT}px`,
          transition: "height 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          bgcolor: "#f2f2f2",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          boxShadow: "0 -4px 24px rgba(0,0,0,0.08)",
          pb: "env(safe-area-inset-bottom, 16px)",
          maxWidth: 600,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ── Drag handle ── */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            pt: 1.5,
            pb: 0.5,
            cursor: "grab",
          }}
          onClick={() => setDrawerExpanded((prev) => !prev)}
        >
          <Box
            sx={{
              width: 36,
              height: 4,
              borderRadius: 2,
              bgcolor: "rgba(0,0,0,0.12)",
            }}
          />
        </Box>

        {/* ── Expand/collapse hint ── */}
        <Box
          sx={{ display: "flex", justifyContent: "center", mb: 0.5 }}
          onClick={() => setDrawerExpanded((prev) => !prev)}
        >
          {drawerExpanded ? (
            <KeyboardArrowDownIcon sx={{ fontSize: 20, color: "rgba(0,0,0,0.3)" }} />
          ) : (
            <KeyboardArrowUpIcon sx={{ fontSize: 20, color: "rgba(0,0,0,0.3)" }} />
          )}
        </Box>

        {/* ── Status pill ── */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              px: 2,
              py: 0.5,
              borderRadius: 3,
              bgcolor: status === "running" ? "rgba(46,125,50,0.08)" : "rgba(237,108,2,0.08)",
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: status === "running" ? "#2e7d32" : "#ed6c02",
                animation: status === "running" ? "statusPulse 1.5s ease-in-out infinite" : "none",
                "@keyframes statusPulse": {
                  "0%, 100%": { opacity: 1 },
                  "50%": { opacity: 0.4 },
                },
              }}
            />
            <Typography
              sx={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: status === "running" ? "#2e7d32" : "#ed6c02",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {status === "running" ? "Running" : "Paused"}
            </Typography>
          </Box>
        </Box>

        {/* ── Compact Metrics Card (always visible) ── */}
        <Box sx={{ px: 2, mb: 2, flexShrink: 0 }}>
          <Card
            sx={{
              borderRadius: 4,
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <CardContent sx={{ px: 0, py: 0, "&:last-child": { pb: 0 } }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "stretch",
                }}
              >
                {/* Time */}
                <Box sx={{ flex: 1, textAlign: "center", py: 2, px: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "center", mb: 0.75 }}>
                    <AccessTimeIcon sx={{ fontSize: 18, color: "#5b9bd5" }} />
                  </Box>
                  <Typography
                    sx={{
                      color: "#1a1a1a",
                      fontWeight: 800,
                      fontSize: "1.75rem",
                      lineHeight: 1.1,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatTime(elapsedSeconds)}
                  </Typography>
                  <Typography
                    sx={{
                      color: "text.secondary",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.3,
                      mt: 0.5,
                    }}
                  >
                    Time
                  </Typography>
                </Box>

                <Divider orientation="vertical" flexItem />

                {/* Pace */}
                <Box sx={{ flex: 1, textAlign: "center", py: 2, px: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "center", mb: 0.75 }}>
                    <SpeedIcon sx={{ fontSize: 18, color: "#5b9bd5" }} />
                  </Box>
                  <Typography
                    sx={{
                      color: "#1a1a1a",
                      fontWeight: 800,
                      fontSize: "1.75rem",
                      lineHeight: 1.1,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {pace}
                  </Typography>
                  <Typography
                    sx={{
                      color: "text.secondary",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.3,
                      mt: 0.5,
                    }}
                  >
                    Pace (/mi)
                  </Typography>
                </Box>

                <Divider orientation="vertical" flexItem />

                {/* Distance */}
                <Box sx={{ flex: 1, textAlign: "center", py: 2, px: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "center", mb: 0.75 }}>
                    <StraightenIcon sx={{ fontSize: 18, color: "#5b9bd5" }} />
                  </Box>
                  <Typography
                    sx={{
                      color: "#1a1a1a",
                      fontWeight: 800,
                      fontSize: "1.75rem",
                      lineHeight: 1.1,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {distanceMiles.toFixed(2)}
                  </Typography>
                  <Typography
                    sx={{
                      color: "text.secondary",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.3,
                      mt: 0.5,
                    }}
                  >
                    Distance (mi)
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* ── Expanded: 2×2 Skill Metrics Grid ── */}
        {drawerExpanded && (
          <Box
            sx={{
              flex: 1,
              overflow: "auto",
              px: 2,
              mb: 1,
            }}
          >
            <Typography
              sx={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "text.secondary",
                mb: 1.5,
                textAlign: "center",
              }}
            >
              Live Stride Metrics
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 1.5,
              }}
            >
              {skillMetrics.map((skill) => (
                <Card
                  key={skill.id}
                  sx={{
                    borderRadius: 3,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    position: "relative",
                    overflow: "visible",
                  }}
                >
                  <CardContent
                    sx={{
                      p: 1.5,
                      "&:last-child": { pb: 1.5 },
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      minHeight: 150,
                    }}
                  >
                    <InfoPopover summary={skill.summary} />

                    <Typography
                      sx={{
                        fontSize: "0.6rem",
                        textTransform: "uppercase",
                        color: "text.secondary",
                        letterSpacing: 0.5,
                        mb: 0.25,
                        alignSelf: "flex-start",
                      }}
                    >
                      {skill.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        mb: 0.5,
                        alignSelf: "flex-start",
                      }}
                    >
                      {skill.title}
                    </Typography>

                    <Box
                      sx={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                      }}
                    >
                      <SkillVisualization
                        skillId={skill.id}
                        strideData={strideData}
                        shockHistory={shockHistory}
                        goals={goals}
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        )}

        {/* ── Swipe hint text (when collapsed) ── */}
        {!drawerExpanded && (
          <Box sx={{ textAlign: "center", mb: 1 }}>
            <Typography
              sx={{
                fontSize: "0.7rem",
                color: "rgba(0,0,0,0.35)",
                fontWeight: 500,
              }}
            >
              Swipe up for stride metrics
            </Typography>
          </Box>
        )}

        {/* ── Action Button(s) ── */}
        <Box sx={{ px: 2, pb: 2, flexShrink: 0 }}>
          {status === "running" ? (
            <Button
              fullWidth
              variant="contained"
              onClick={handlePause}
              startIcon={<PauseIcon sx={{ fontSize: 24 }} />}
              sx={{
                py: 1.75,
                borderRadius: 3,
                fontSize: "1rem",
                fontWeight: 700,
                textTransform: "none",
                bgcolor: "#5b9bd5",
                color: "#fff",
                boxShadow: "0 4px 20px rgba(91,155,213,0.35)",
                "&:hover": { bgcolor: "#4a8bc4" },
              }}
            >
              Pause Run
            </Button>
          ) : (
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                alignItems: "center",
              }}
            >
              <IconButton
                onClick={() => setConfirmStop(true)}
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: "#fff",
                  color: "#d32f2f",
                  border: "2px solid #d32f2f",
                  boxShadow: "0 2px 12px rgba(211,47,47,0.15)",
                  "&:hover": { bgcolor: "rgba(211,47,47,0.04)" },
                }}
              >
                <StopIcon sx={{ fontSize: 28 }} />
              </IconButton>

              <Button
                fullWidth
                variant="contained"
                onClick={handleResume}
                startIcon={<PlayArrowIcon sx={{ fontSize: 24 }} />}
                sx={{
                  py: 1.75,
                  borderRadius: 3,
                  fontSize: "1rem",
                  fontWeight: 700,
                  textTransform: "none",
                  bgcolor: "#2e7d32",
                  color: "#fff",
                  boxShadow: "0 4px 20px rgba(46,125,50,0.35)",
                  "&:hover": { bgcolor: "#1b5e20" },
                }}
              >
                Resume
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* ═══════════ Confirm Stop Dialog ═══════════ */}
      <Dialog
        open={confirmStop}
        onClose={() => setConfirmStop(false)}
        PaperProps={{
          sx: {
            borderRadius: 4,
            bgcolor: "#fff",
            color: "#1a1a1a",
            maxWidth: 340,
            width: "100%",
            mx: 2,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.15rem", color: "#1a1a1a" }}>
          End Run?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.9rem", color: "text.secondary", lineHeight: 1.6 }}>
            Your run will be saved with{" "}
            <strong style={{ color: "#1a1a1a" }}>{distanceMiles.toFixed(2)} mi</strong> in{" "}
            <strong style={{ color: "#1a1a1a" }}>{formatTime(elapsedSeconds)}</strong>.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setConfirmStop(false)}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: "text.secondary",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleStopConfirm();
              fetch(`${NODE_URL}/stop`, { method: "POST" }).catch(() => {});
            }}
            variant="contained"
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: "#d32f2f",
              "&:hover": { bgcolor: "#b71c1c" },
            }}
          >
            End Run
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
