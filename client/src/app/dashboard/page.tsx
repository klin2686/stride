"use client";

import { useState } from "react";
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
  },
  {
    id: 2,
    quote:
      "Keep a tall posture. Lean slightly from the ankles, not your waist, to let gravity pull you forward.",
    imageSrc:
      "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: 3,
    quote:
      "Imagine running on hot coals. Quick, light steps keep your ground contact time low and reduce impact stress.",
    imageSrc:
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1000&auto=format&fit=crop",
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
function HeatMapShoe({ zone = "midfoot" }: { zone?: "heel" | "midfoot" | "toe" }) {
  const heelColor = zone === "heel" ? "#ef4444" : "#e8edf2";
  const midColor = zone === "midfoot" ? "#22c55e" : "#e8edf2";
  const toeColor = zone === "toe" ? "#f59e0b" : "#e8edf2";

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mt: 2, mb: 1 }}>
      <svg width="200" height="100" viewBox="0 0 200 100">
        {/* Shoe outline */}
        <path
          d="M30,75 Q20,70 18,55 Q16,40 25,30 Q35,18 55,15 Q80,12 110,14 Q140,16 160,22 Q175,28 182,42 Q188,55 185,68 Q182,78 170,80 L30,80 Z"
          fill="none" stroke="#ccc" strokeWidth="2"
        />
        {/* Heel zone */}
        <ellipse cx="45" cy="58" rx="20" ry="16" fill={heelColor} opacity="0.7" />
        {/* Midfoot zone */}
        <ellipse cx="105" cy="50" rx="30" ry="18" fill={midColor} opacity="0.7" />
        {/* Toe zone */}
        <ellipse cx="165" cy="48" rx="18" ry="14" fill={toeColor} opacity="0.7" />
        {/* Labels */}
        <text x="45" y="62" textAnchor="middle" fontSize="9" fontWeight="600" fill="#555">Heel</text>
        <text x="105" y="54" textAnchor="middle" fontSize="9" fontWeight="600" fill="#555">Mid</text>
        <text x="165" y="52" textAnchor="middle" fontSize="9" fontWeight="600" fill="#555">Toe</text>
        {/* Active indicator */}
        <text x="100" y="95" textAnchor="middle" fontSize="11" fontWeight="700"
          fill={zone === "midfoot" ? "#22c55e" : zone === "heel" ? "#ef4444" : "#f59e0b"}>
          {zone === "midfoot" ? "✓ Midfoot Strike" : zone === "heel" ? "⚠ Heel Strike" : "⚠ Toe Strike"}
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
        {/* Value label */}
        <text x="60" y={10 + barHeight - fillH - 6} textAnchor="middle"
          fontSize="14" fontWeight="700" fill={barColor}>
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
function ShockWaveform() {
  // Simulated waveform data — each value is a peak G-force
  const points = [0.8, 1.5, 0.9, 2.1, 1.2, 0.7, 1.8, 1.0, 2.4, 1.3, 0.6, 1.6, 0.9, 1.1, 2.0];
  const threshold = 2.0;
  const w = 260;
  const h = 80;
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
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mt: 2, mb: 1 }}>
      <svg width="260" height="110" viewBox="0 0 260 110" style={{ maxWidth: "100%" }}>
        {/* Grid lines */}
        {[1, 2, 3].map((g) => {
          const y = h - (g / 3) * h;
          return (
            <g key={g}>
              <line x1="0" y1={y} x2={w} y2={y} stroke="#eee" strokeWidth="1" />
              <text x={w + 4} y={y + 4} fontSize="8" fill="#bbb">{g}G</text>
            </g>
          );
        })}
        {/* Threshold line */}
        <line x1="0" y1={thresholdY} x2={w} y2={thresholdY}
          stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.6" />
        {/* Waveform line */}
        <path d={pathD} fill="none" stroke="#5b9bd5" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />
        {/* Peak dots */}
        {points.map((v, i) => {
          const x = i * stepX;
          const y = h - (v / 3) * h;
          const isHigh = v >= threshold;
          return (
            <circle key={i} cx={x} cy={y} r={isHigh ? 4 : 3}
              fill={isHigh ? "#ef4444" : "#5b9bd5"} />
          );
        })}
        {/* Bottom label */}
        <text x={w / 2} y="105" textAnchor="middle" fontSize="10" fontWeight="500" fill="#888">
          Impact per step (G-force)
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
function SkillVisualization({ skillId }: { skillId: number }) {
  switch (skillId) {
    case 1:
      return <TargetRing />;
    case 2:
      return <HeatMapShoe />;
    case 3:
      return <SpringGauge />;
    case 4:
      return <ShockWaveform />;
    default:
      return null;
  }
}

/* ───────────────── Placeholder Trend Line (SVG) ─────────────────── */
function TrendLine() {
  // Points that mimic the rising trend in the design
  const points = [
    { x: 20, y: 70 },
    { x: 50, y: 55 },
    { x: 80, y: 50 },
    { x: 120, y: 60 },
    { x: 160, y: 30 },
    { x: 200, y: 15 },
  ];

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg
      viewBox="0 0 220 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%" }}
    >
      <polyline
        points={polyline}
        stroke="white"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" />
      ))}
    </svg>
  );
}

/* ════════════════════════════ DASHBOARD PAGE ═════════════════════════════ */
export default function DashboardPage() {
  const router = useRouter();
  const [navValue, setNavValue] = useState(0);
  const username = "username"; // Replace with dynamic value later

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
          Hello, {`{${username}}`}
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
              <Typography
                sx={{
                  fontSize: "3.5rem",
                  fontWeight: 700,
                  lineHeight: 1,
                  color: "#fff",
                }}
              >
                165
              </Typography>
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

            {/* Right – trend line */}
            <Box sx={{ flex: 1, maxWidth: 220, height: 80, ml: 2 }}>
              <TrendLine />
            </Box>
          </CardContent>
        </Card>

        {/* 3 · Last Run Card */}
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            mb: 2.5,
          }}
        >
          <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", mb: 0.5 }}>
              Last Run
            </Typography>
            <Typography sx={{ color: "text.secondary", fontSize: "0.9rem" }}>
              Tuesday May 5
            </Typography>
            <Typography
              sx={{ color: "text.secondary", fontSize: "0.9rem", mt: 0.25 }}
            >
              3.2 mi &nbsp;|&nbsp; 32 min
            </Typography>
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
                      <SkillVisualization skillId={skill.id} />
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
