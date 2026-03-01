"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import CircularProgress from "@mui/material/CircularProgress";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import RecordButton from "@mui/icons-material/RadioButtonChecked";
import ProfileIcon from "@mui/icons-material/PersonOutlineOutlined";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import CloseIcon from "@mui/icons-material/Close";
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
  avg_cadence:  number | null;
  avg_gct:      number | null;
  avg_shock:    number | null;
  heel_pct:     number | null;
  midfoot_pct:  number | null;
  forefoot_pct: number | null;
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
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/* ─────────────────── Stat Tile (used in the modal) ─────────────────── */
function StatTile({
  label,
  value,
  unit,
  color = "#5b9bd5",
}: {
  label: string;
  value: string;
  unit?: string;
  color?: string;
}) {
  return (
    <Box
      sx={{
        flex: "1 1 0",
        minWidth: 0,
        bgcolor: `${color}12`,
        borderRadius: 2.5,
        p: 1.5,
        textAlign: "center",
      }}
    >
      <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.4, mb: 0.25 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: "1.15rem", fontWeight: 800, color: "#1a1a1a", lineHeight: 1.1 }}>
        {value}
      </Typography>
      {unit && (
        <Typography sx={{ fontSize: "0.6rem", color: "text.secondary", mt: 0.1 }}>
          {unit}
        </Typography>
      )}
    </Box>
  );
}

/* ─────────────────── Strike Bar (modal foot-strike breakdown) ─────────────────── */
function StrikeBar({
  heel,
  midfoot,
  forefoot,
}: {
  heel: number | null;
  midfoot: number | null;
  forefoot: number | null;
}) {
  if (heel == null && midfoot == null && forefoot == null) return null;

  const h = heel ?? 0;
  const m = midfoot ?? 0;
  const f = forefoot ?? 0;
  const total = h + m + f || 1;

  const segments = [
    { label: "Heel", pct: +(h / total * 100).toFixed(0), color: "#ef4444" },
    { label: "Midfoot", pct: +(m / total * 100).toFixed(0), color: "#22c55e" },
    { label: "Forefoot", pct: +(f / total * 100).toFixed(0), color: "#f59e0b" },
  ].filter((s) => s.pct > 0);

  return (
    <Box>
      <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "text.secondary", mb: 0.75 }}>
        Foot Strike
      </Typography>
      {/* Stacked bar */}
      <Box sx={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", mb: 1 }}>
        {segments.map((s) => (
          <Box key={s.label} sx={{ width: `${s.pct}%`, bgcolor: s.color }} />
        ))}
      </Box>
      {/* Legend */}
      <Box sx={{ display: "flex", gap: 1.5 }}>
        {segments.map((s) => (
          <Box key={s.label} sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: s.color, flexShrink: 0 }} />
            <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>
              {s.label} <strong style={{ color: "#1a1a1a" }}>{s.pct}%</strong>
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/* ════════════════════════════ RUN DETAIL MODAL ═════════════════════════════ */
function RunDetailModal({
  run,
  onClose,
}: {
  run: RunRecord | null;
  onClose: () => void;
}) {
  if (!run) return null;

  const miles = (run.distance_m / 1609.344).toFixed(2);
  const hasStride =
    run.avg_cadence != null || run.avg_gct != null || run.avg_shock != null;
  const hasStrike =
    run.heel_pct != null || run.midfoot_pct != null || run.forefoot_pct != null;

  return (
    <Dialog
      open={!!run}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            mx: 2,
            overflow: "hidden",
          },
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* ── Gradient header ── */}
        <Box
          sx={{
            background: "linear-gradient(135deg, #5b9bd5 0%, #8ec8e8 100%)",
            px: 2.5,
            pt: 2.5,
            pb: 2,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#fff" }}>
                {formatDate(run.date)}
              </Typography>
              <Typography sx={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.75)", mt: 0.25 }}>
                {formatTime(run.date)}
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small" sx={{ color: "rgba(255,255,255,0.85)", mt: -0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Primary stats row */}
          <Box sx={{ display: "flex", gap: 1.5, mt: 2 }}>
            <Box sx={{ textAlign: "center", flex: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: "1.6rem", color: "#fff", lineHeight: 1 }}>
                {miles}
              </Typography>
              <Typography sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.75)" }}>miles</Typography>
            </Box>
            <Box sx={{ width: "1px", bgcolor: "rgba(255,255,255,0.3)", my: 0.5 }} />
            <Box sx={{ textAlign: "center", flex: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: "1.6rem", color: "#fff", lineHeight: 1 }}>
                {formatDuration(run.duration_s)}
              </Typography>
              <Typography sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.75)" }}>duration</Typography>
            </Box>
            {run.avg_pace && run.avg_pace !== "--:--" && (
              <>
                <Box sx={{ width: "1px", bgcolor: "rgba(255,255,255,0.3)", my: 0.5 }} />
                <Box sx={{ textAlign: "center", flex: 1 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.6rem", color: "#fff", lineHeight: 1 }}>
                    {run.avg_pace}
                  </Typography>
                  <Typography sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.75)" }}>min/mi</Typography>
                </Box>
              </>
            )}
          </Box>
        </Box>

        {/* ── Stride metrics body ── */}
        {(hasStride || hasStrike) ? (
          <Box sx={{ px: 2.5, pt: 2, pb: 2.5 }}>
            <Typography
              sx={{
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "text.secondary",
                mb: 1.5,
              }}
            >
              Stride Metrics
            </Typography>

            {/* Metric tiles */}
            {hasStride && (
              <Box sx={{ display: "flex", gap: 1, mb: hasStrike ? 2 : 0 }}>
                {run.avg_cadence != null && (
                  <StatTile label="Cadence" value={run.avg_cadence.toFixed(0)} unit="SPM" color="#5b9bd5" />
                )}
                {run.avg_gct != null && (
                  <StatTile label="Contact" value={run.avg_gct.toFixed(0)} unit="ms" color="#8ec8e8" />
                )}
                {run.avg_shock != null && (
                  <StatTile label="Shock" value={run.avg_shock.toFixed(2)} unit="G" color="#a78bfa" />
                )}
              </Box>
            )}

            {/* Strike breakdown */}
            {hasStrike && (
              <StrikeBar
                heel={run.heel_pct}
                midfoot={run.midfoot_pct}
                forefoot={run.forefoot_pct}
              />
            )}
          </Box>
        ) : (
          <Box sx={{ px: 2.5, py: 2.5 }}>
            <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", textAlign: "center" }}>
              No stride data recorded for this run.
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ════════════════════════════ RUNS PAGE ═════════════════════════════ */
export default function RunsPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [navValue, setNavValue] = useState(0);
  const [selectedRun, setSelectedRun] = useState<RunRecord | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setLoading(false); return; }

    fetch(`${API_BASE}/runs`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "1",
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.runs) setRuns(data.runs); })
      .catch((err) => console.warn("[Runs] Fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  const totalRuns = runs.length;
  const totalDistanceMi = runs.reduce((sum, r) => sum + r.distance_m / 1609.344, 0);
  const totalDurationS = runs.reduce((sum, r) => sum + r.duration_s, 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100dvh", bgcolor: "#f2f2f2", maxWidth: 600, mx: "auto" }}>
      {/* ─── Scrollable Content ─── */}
      <Box sx={{ flex: 1, overflowY: "auto", pb: "80px" }}>

        {/* ── Header ── */}
        <Box sx={{ display: "flex", alignItems: "center", px: 1.5, pt: 3, pb: 1.5 }}>
          <IconButton onClick={() => router.push("/dashboard")} sx={{ mr: 1 }}>
            <ArrowBackIosNewIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#1a1a1a" }}>
            Run History
          </Typography>
        </Box>

        {/* ── Summary banner ── */}
        <Box sx={{ px: 2, mb: 2 }}>
          <Card sx={{ borderRadius: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", background: "linear-gradient(135deg, #5b9bd5 0%, #8ec8e8 100%)" }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(255,255,255,0.8)", mb: 1.5 }}>
                All Time Stats
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-around" }}>
                {[
                  { Icon: DirectionsRunIcon, val: totalRuns, label: "Runs" },
                  { Icon: StraightenIcon,    val: totalDistanceMi.toFixed(1), label: "Miles" },
                  { Icon: AccessTimeIcon,    val: formatDuration(totalDurationS), label: "Total Time" },
                ].map(({ Icon, val, label }) => (
                  <Box key={label} sx={{ textAlign: "center" }}>
                    <Icon sx={{ fontSize: 22, color: "#fff", mb: 0.5 }} />
                    <Typography sx={{ fontWeight: 800, fontSize: "1.5rem", color: "#fff", lineHeight: 1.1 }}>{val}</Typography>
                    <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.8)", mt: 0.25 }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* ── Run list ── */}
        <Box sx={{ px: 2 }}>
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary", mb: 1 }}>
            Past Runs
          </Typography>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={32} sx={{ color: "#5b9bd5" }} />
            </Box>
          ) : runs.length === 0 ? (
            <Card sx={{ borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <CardContent sx={{ py: 4, textAlign: "center" }}>
                <DirectionsRunIcon sx={{ fontSize: 40, color: "#ccc", mb: 1 }} />
                <Typography sx={{ color: "text.secondary", fontSize: "0.9rem" }}>
                  No runs yet — go for your first run!
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Card sx={{ borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
              {runs.map((run, idx) => {
                const miles = (run.distance_m / 1609.344).toFixed(2);
                return (
                  <Box key={run.id}>
                    {idx > 0 && <Divider />}
                    <CardContent
                      onClick={() => setSelectedRun(run)}
                      sx={{
                        p: 2,
                        "&:last-child": { pb: 2 },
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                        "&:hover": { bgcolor: "rgba(0,0,0,0.02)" },
                        "&:active": { bgcolor: "rgba(0,0,0,0.04)" },
                      }}
                    >
                      {/* Run icon */}
                      <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: "rgba(91,155,213,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <DirectionsRunIcon sx={{ fontSize: 22, color: "#5b9bd5" }} />
                      </Box>

                      {/* Date + time */}
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

                      {/* Distance + duration + pace */}
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

      {/* ─── Run Detail Modal ─── */}
      <RunDetailModal run={selectedRun} onClose={() => setSelectedRun(null)} />

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
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1200,
          maxWidth: 600, mx: "auto", bgcolor: "#a8d4e6", height: 64,
          borderTop: "1px solid rgba(0,0,0,0.06)",
          "& .MuiBottomNavigationAction-root": { color: "#1a1a1a", minWidth: 0, "&.Mui-selected": { color: "#1a1a1a" } },
          "& .MuiBottomNavigationAction-label": { fontSize: "0.7rem", "&.Mui-selected": { fontSize: "0.7rem" } },
        }}
      >
        <BottomNavigationAction label="Home"    icon={<HomeOutlinedIcon sx={{ fontSize: 28 }} />} />
        <BottomNavigationAction label="Record"  icon={<RecordButton sx={{ fontSize: 28 }} />} />
        <BottomNavigationAction label="Profile" icon={<ProfileIcon sx={{ fontSize: 28 }} />} />
      </BottomNavigation>
    </Box>
  );
}
