"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import RecordButton from "@mui/icons-material/RadioButtonChecked";
import ProfileIcon from "@mui/icons-material/PersonOutlineOutlined";

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

/* ───────────────────── Segmented Progress Bar ───────────────────── */
function SegmentedProgressBar({
  total,
  filled,
}: {
  total: number;
  filled: number;
}) {
  return (
    <Box sx={{ display: "flex", gap: "4px", mt: 1.5 }}>
      {Array.from({ length: total }).map((_, i) => (
        <Box
          key={i}
          sx={{
            flex: 1,
            height: 14,
            borderRadius: "3px",
            bgcolor: i < filled ? "#5b9bd5" : "#d4e6f6",
          }}
        />
      ))}
    </Box>
  );
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

        {/* 4 · Skill Card */}
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            mb: 2.5,
          }}
        >
          <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
            <Typography
              sx={{
                fontSize: "0.75rem",
                textTransform: "uppercase",
                color: "text.secondary",
                letterSpacing: 0.5,
                mb: 0.5,
              }}
            >
              Skill 1
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: "1rem", mb: 0.5 }}>
              Running Cadence and Pacing
            </Typography>
            <SegmentedProgressBar total={10} filled={4} />
          </CardContent>
        </Card>

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
