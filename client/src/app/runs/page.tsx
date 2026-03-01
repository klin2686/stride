"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import CircularProgress from "@mui/material/CircularProgress";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import RecordButton from "@mui/icons-material/RadioButtonChecked";
import ProfileIcon from "@mui/icons-material/PersonOutlineOutlined";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import StraightenIcon from "@mui/icons-material/Straighten";
import SpeedIcon from "@mui/icons-material/Speed";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

/* ─────────────────── Constants ─────────────────── */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ─────────────────── Types ─────────────────── */
interface RunRecord {
  id: number;
  date: string;
  distance_m: number;
  duration_s: number;
  avg_pace: string | null;
}

/* ─────────────────── Helpers ─────────────────── */
function formatDuration(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ════════════════════════════ RUNS PAGE ═════════════════════════════ */
export default function RunsPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [navValue, setNavValue] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/runs`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "1",
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.runs) setRuns(data.runs);
      })
      .catch((err) => console.warn("[Runs] Fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  /* ── Stats summary ── */
  const totalRuns = runs.length;
  const totalDistanceMi = runs.reduce((sum, r) => sum + r.distance_m / 1609.344, 0);
  const totalDurationS = runs.reduce((sum, r) => sum + r.duration_s, 0);

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
      {/* ─── Scrollable Content ─── */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          pb: "80px",
        }}
      >
        {/* ── Header ── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 1.5,
            pt: 3,
            pb: 1.5,
          }}
        >
          <IconButton onClick={() => router.push("/dashboard")} sx={{ mr: 1 }}>
            <ArrowBackIosNewIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#1a1a1a" }}>
            Run History
          </Typography>
        </Box>

        {/* ── Summary Stats ── */}
        <Box sx={{ px: 2, mb: 2 }}>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              background: "linear-gradient(135deg, #5b9bd5 0%, #8ec8e8 100%)",
            }}
          >
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: "rgba(255,255,255,0.8)",
                  mb: 1.5,
                }}
              >
                All Time Stats
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-around" }}>
                <Box sx={{ textAlign: "center" }}>
                  <DirectionsRunIcon sx={{ fontSize: 22, color: "#fff", mb: 0.5 }} />
                  <Typography sx={{ fontWeight: 800, fontSize: "1.5rem", color: "#fff", lineHeight: 1.1 }}>
                    {totalRuns}
                  </Typography>
                  <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.8)", mt: 0.25 }}>
                    Runs
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <StraightenIcon sx={{ fontSize: 22, color: "#fff", mb: 0.5 }} />
                  <Typography sx={{ fontWeight: 800, fontSize: "1.5rem", color: "#fff", lineHeight: 1.1 }}>
                    {totalDistanceMi.toFixed(1)}
                  </Typography>
                  <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.8)", mt: 0.25 }}>
                    Miles
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <AccessTimeIcon sx={{ fontSize: 22, color: "#fff", mb: 0.5 }} />
                  <Typography sx={{ fontWeight: 800, fontSize: "1.5rem", color: "#fff", lineHeight: 1.1 }}>
                    {formatDuration(totalDurationS)}
                  </Typography>
                  <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.8)", mt: 0.25 }}>
                    Total Time
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* ── Run List ── */}
        <Box sx={{ px: 2 }}>
          <Typography
            sx={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: "text.secondary",
              mb: 1,
            }}
          >
            Past Runs
          </Typography>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={32} sx={{ color: "#5b9bd5" }} />
            </Box>
          ) : runs.length === 0 ? (
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                mb: 1.5,
              }}
            >
              <CardContent sx={{ py: 4, textAlign: "center" }}>
                <DirectionsRunIcon sx={{ fontSize: 40, color: "#ccc", mb: 1 }} />
                <Typography sx={{ color: "text.secondary", fontSize: "0.9rem" }}>
                  No runs yet — go for your first run!
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                overflow: "hidden",
              }}
            >
              {runs.map((run, idx) => {
                const miles = (run.distance_m / 1609.344).toFixed(2);
                return (
                  <Box key={run.id}>
                    {idx > 0 && <Divider />}
                    <CardContent
                      sx={{
                        p: 2,
                        "&:last-child": { pb: 2 },
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      {/* Run icon */}
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 2.5,
                          bgcolor: "rgba(91,155,213,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <DirectionsRunIcon sx={{ fontSize: 22, color: "#5b9bd5" }} />
                      </Box>

                      {/* Details */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.25 }}>
                          <CalendarTodayIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                          <Typography sx={{ fontWeight: 600, fontSize: "0.85rem", color: "#1a1a1a" }}>
                            {formatDate(run.date)}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                          {formatTime(run.date)}
                        </Typography>
                      </Box>

                      {/* Metrics */}
                      <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5, mb: 0.25 }}>
                          <StraightenIcon sx={{ fontSize: 14, color: "#5b9bd5" }} />
                          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#1a1a1a" }}>
                            {miles} mi
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5 }}>
                          <AccessTimeIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                            {formatDuration(run.duration_s)}
                          </Typography>
                          {run.avg_pace && run.avg_pace !== "--:--" && (
                            <>
                              <SpeedIcon sx={{ fontSize: 13, color: "text.secondary", ml: 0.5 }} />
                              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                                {run.avg_pace}/mi
                              </Typography>
                            </>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Box>
                );
              })}
            </Card>
          )}
        </Box>
      </Box>

      {/* ─── Bottom Navigation ─── */}
      <BottomNavigation
        value={navValue}
        onChange={(_, newValue) => {
          setNavValue(newValue);
          if (newValue === 0) router.push("/dashboard");
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
            "&.Mui-selected": { color: "#1a1a1a" },
          },
          "& .MuiBottomNavigationAction-label": {
            fontSize: "0.7rem",
            "&.Mui-selected": { fontSize: "0.7rem" },
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
