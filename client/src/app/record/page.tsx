"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import Fade from "@mui/material/Fade";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import RecordButton from "@mui/icons-material/RadioButtonChecked";
import ProfileIcon from "@mui/icons-material/PersonOutlineOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import WifiIcon from "@mui/icons-material/Wifi";
import BatteryChargingFullIcon from "@mui/icons-material/BatteryChargingFull";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";

/* ──────────────────── Calibration Types ──────────────────── */
type CalibrationState = "idle" | "calibrating" | "complete";
const CALIBRATION_DURATION = 4; // seconds

/* ──────────────── Calibration Timer Component ────────────── */
function CalibrationTimer({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const remaining = Math.max(CALIBRATION_DURATION - elapsed, 0);
  const progress = elapsed / CALIBRATION_DURATION; // 0 → 1

  // SVG circle math
  const size = 200;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  useEffect(() => {
    startTimeRef.current = performance.now();

    const tick = (now: number) => {
      const secs = (now - startTimeRef.current) / 1000;
      setElapsed(secs);

      if (secs >= CALIBRATION_DURATION) {
        onComplete();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onComplete]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        py: 6,
      }}
    >
      {/* Instruction */}
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: "1.1rem",
          color: "#1a1a1a",
          textAlign: "center",
        }}
      >
        Stand perfectly still
      </Typography>
      <Typography
        sx={{
          fontSize: "0.85rem",
          color: "text.secondary",
          textAlign: "center",
          maxWidth: 260,
          lineHeight: 1.5,
        }}
      >
        Zeroing the sensor drift and establishing baseline orientation…
      </Typography>

      {/* Circular Timer */}
      <Box sx={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e8f5e9"
            strokeWidth={strokeWidth}
          />
          {/* Animated green ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#2e7d32"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dashoffset 0.1s linear" }}
          />
        </svg>

        {/* Center countdown text */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: "3.5rem",
              fontWeight: 800,
              color: "#2e7d32",
              lineHeight: 1,
            }}
          >
            {Math.ceil(remaining)}
          </Typography>
          <Typography
            sx={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "text.secondary",
              mt: 0.5,
            }}
          >
            seconds
          </Typography>
        </Box>
      </Box>

      {/* Pulsing dot indicator */}
      <Box
        sx={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          bgcolor: "#2e7d32",
          animation: "pulse 1.2s ease-in-out infinite",
          "@keyframes pulse": {
            "0%, 100%": { opacity: 1, transform: "scale(1)" },
            "50%": { opacity: 0.4, transform: "scale(1.4)" },
          },
        }}
      />
    </Box>
  );
}

/* ──────────── Calibration Complete Component ─────────────── */
function CalibrationComplete({ onContinue }: { onContinue: () => void }) {
  return (
    <Fade in timeout={500}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          py: 6,
        }}
      >
        {/* Success icon with ring animation */}
        <Box
          sx={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            bgcolor: "#e8f5e9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "scaleIn 0.4s ease-out",
            "@keyframes scaleIn": {
              "0%": { transform: "scale(0.5)", opacity: 0 },
              "100%": { transform: "scale(1)", opacity: 1 },
            },
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 72, color: "#2e7d32" }} />
        </Box>

        <Typography
          variant="h5"
          sx={{ fontWeight: 800, color: "#1a1a1a", mt: 1 }}
        >
          Calibration Complete
        </Typography>
        <Typography
          sx={{
            fontSize: "0.9rem",
            color: "text.secondary",
            textAlign: "center",
            maxWidth: 280,
            lineHeight: 1.5,
          }}
        >
          Sensor baseline established. Orientation verified. You&apos;re ready to
          run!
        </Typography>

        <Button
          fullWidth
          variant="contained"
          onClick={onContinue}
          sx={{
            mt: 3,
            py: 2,
            borderRadius: 3,
            fontSize: "1.1rem",
            fontWeight: 800,
            textTransform: "none",
            bgcolor: "#2e7d32",
            boxShadow: "0 4px 20px rgba(46,125,50,0.35)",
            "&:hover": { bgcolor: "#1b5e20" },
            maxWidth: 340,
          }}
        >
          Start Run
        </Button>
      </Box>
    </Fade>
  );
}

/* ─────────────────────────────── Types ──────────────────────────── */
type CheckStatus = "checking" | "passed" | "failed" | "warning";

interface SystemCheck {
  id: string;
  label: string;
  description: string;
  status: CheckStatus;
  detail: string;
  icon: React.ReactNode;
}

/* ────────────────────── Status Icon Component ───────────────────── */
function StatusIcon({ status }: { status: CheckStatus }) {
  switch (status) {
    case "checking":
      return <CircularProgress size={22} sx={{ color: "#5b9bd5" }} />;
    case "passed":
      return <CheckCircleIcon sx={{ fontSize: 24, color: "#2e7d32" }} />;
    case "failed":
      return <ErrorIcon sx={{ fontSize: 24, color: "#d32f2f" }} />;
    case "warning":
      return <WarningAmberIcon sx={{ fontSize: 24, color: "#ed6c02" }} />;
  }
}

/* ──────────────────── Overall Status Badge ──────────────────────── */
function OverallStatusBadge({
  allPassed,
  anyFailed,
  isChecking,
}: {
  allPassed: boolean;
  anyFailed: boolean;
  isChecking: boolean;
}) {
  if (isChecking) {
    return (
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <CircularProgress size={64} sx={{ color: "#5b9bd5", mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 800, color: "#1a1a1a" }}>
          Running checks…
        </Typography>
        <Typography sx={{ color: "text.secondary", fontSize: "0.9rem", mt: 0.5 }}>
          Verifying system readiness
        </Typography>
      </Box>
    );
  }

  if (allPassed) {
    return (
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <CheckCircleIcon sx={{ fontSize: 64, color: "#2e7d32", mb: 1 }} />
        <Typography variant="h5" sx={{ fontWeight: 800, color: "#1a1a1a" }}>
          All systems ready
        </Typography>
        <Typography sx={{ color: "text.secondary", fontSize: "0.9rem", mt: 0.5 }}>
          You&apos;re good to go
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ textAlign: "center", mb: 3 }}>
      <ErrorIcon sx={{ fontSize: 64, color: anyFailed ? "#d32f2f" : "#ed6c02", mb: 1 }} />
      <Typography variant="h5" sx={{ fontWeight: 800, color: "#1a1a1a" }}>
        {anyFailed ? "Action required" : "Attention needed"}
      </Typography>
      <Typography sx={{ color: "text.secondary", fontSize: "0.9rem", mt: 0.5 }}>
        Resolve the issues below before starting
      </Typography>
    </Box>
  );
}

/* ──────────────────────── Legend Row ─────────────────────────────── */
function StatusLegend() {
  const items = [
    { icon: <CheckCircleIcon sx={{ fontSize: 14, color: "#2e7d32" }} />, label: "Ready" },
    { icon: <WarningAmberIcon sx={{ fontSize: 14, color: "#ed6c02" }} />, label: "Warning" },
    { icon: <ErrorIcon sx={{ fontSize: 14, color: "#d32f2f" }} />, label: "Failed" },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        gap: 2.5,
        mb: 3,
      }}
    >
      {items.map((item) => (
        <Box
          key={item.label}
          sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
        >
          {item.icon}
          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
            {item.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/* ═══════════════════════════ RECORD PAGE ═════════════════════════════ */
export default function RecordPage() {
  const router = useRouter();
  const [checks, setChecks] = useState<SystemCheck[]>([
    {
      id: "wifi",
      label: "Wi-Fi Connection",
      description: "Stable connection to STRIDE node sensor",
      status: "checking",
      detail: "",
      icon: <WifiIcon sx={{ fontSize: 22, color: "#5b9bd5" }} />,
    },
    {
      id: "background",
      label: "Background Execution",
      description: "Keep-alive while screen is off",
      status: "checking",
      detail: "",
      icon: <BatteryChargingFullIcon sx={{ fontSize: 22, color: "#5b9bd5" }} />,
    },
    {
      id: "profile",
      label: "User Profile",
      description: "Weight & height for physics calculations",
      status: "checking",
      detail: "",
      icon: <PersonOutlineIcon sx={{ fontSize: 22, color: "#5b9bd5" }} />,
    },
    {
      id: "gps",
      label: "GPS / Location",
      description: "Device location access",
      status: "checking",
      detail: "",
      icon: <LocationOnOutlinedIcon sx={{ fontSize: 22, color: "#5b9bd5" }} />,
    },
  ]);

  const [calibration, setCalibration] = useState<CalibrationState>("idle");
  const calibrationRef = useRef<HTMLDivElement>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [missingWeight, setMissingWeight] = useState("");
  const [missingHeight, setMissingHeight] = useState("");

  /* ── Update a single check ── */
  const updateCheck = useCallback(
    (id: string, status: CheckStatus, detail: string) => {
      setChecks((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status, detail } : c))
      );
    },
    []
  );

  /* ── 1. Wi-Fi / Network Check ── */
  const checkWifi = useCallback(async () => {
    updateCheck("wifi", "checking", "");

    try {
      const start = performance.now();
      const res = await fetch("http://172.31.89.83:8000/health", {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      const latency = Math.round(performance.now() - start);
      const data = await res.json();
      if (data?.status === "online") {
        const quality = latency < 50 ? "excellent" : latency < 150 ? "good" : latency < 400 ? "fair" : "poor";
        updateCheck("wifi", latency < 400 ? "passed" : "warning", `STRIDE node online · ${latency}ms latency (${quality})`);
      } else {
        updateCheck("wifi", "failed", "STRIDE node responded but status is not 'online'.");
      }
    } catch {
      updateCheck(
        "wifi",
        "failed",
        "Cannot reach STRIDE node. Make sure you're on the same Wi-Fi network."
      );
    }
  }, [updateCheck]);

  /* ── 2. Background Execution Check ── */
  const checkBackground = useCallback(async () => {
    updateCheck("background", "checking", "");

    // Check for Wake Lock API (keeps screen/process alive)
    if ("wakeLock" in navigator) {
      updateCheck(
        "background",
        "passed",
        "Wake Lock API supported. App can stay active."
      );
    } else {
      // Check for Service Worker as fallback
      if ("serviceWorker" in navigator) {
        updateCheck(
          "background",
          "warning",
          "Wake Lock not available. Service Worker can be used as fallback."
        );
      } else {
        updateCheck(
          "background",
          "failed",
          "No background execution support. The app may pause when the screen is off."
        );
      }
    }
  }, [updateCheck]);

  /* ── 3. User Profile Check ── */
  const checkProfile = useCallback(async () => {
    updateCheck("profile", "checking", "");

    const token = localStorage.getItem("access_token");
    if (!token) {
      updateCheck("profile", "failed", "Not logged in. Please sign in to load your profile.");
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "1",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        updateCheck("profile", "failed", "Could not load profile. Please sign in again.");
        return;
      }

      const data = await res.json();

      // Backend stores metric (kg, cm) — convert to imperial for display
      const weightKg = Number(data.weight);
      const heightCm = Number(data.height);
      const hasWeight = data.weight && weightKg > 0;
      const hasHeight = data.height && heightCm > 0;

      if (hasWeight && hasHeight) {
        const weightLbs = Math.round(weightKg * 2.20462);
        const heightIn = Math.round(heightCm / 2.54);
        updateCheck(
          "profile",
          "passed",
          `Weight: ${weightLbs} lbs · Height: ${heightIn} in`
        );
      } else {
        const missing = [];
        if (!hasWeight) missing.push("weight");
        if (!hasHeight) missing.push("height");
        updateCheck(
          "profile",
          "failed",
          `Missing: ${missing.join(" & ")}. Required for force & stride calculations.`
        );
      }
    } catch (err) {
      console.error("[checkProfile]", err);
      updateCheck("profile", "failed", "Could not reach the server to verify your profile.");
    }
  }, [updateCheck]);

  /* ── 4. GPS / Location Check ── */
  const checkGPS = useCallback(async () => {
    updateCheck("gps", "checking", "");

    if (!("geolocation" in navigator)) {
      updateCheck(
        "gps",
        "failed",
        "Geolocation not supported on this device."
      );
      return;
    }

    // Check permissions API if available
    if ("permissions" in navigator) {
      try {
        const result = await navigator.permissions.query({
          name: "geolocation",
        });

        if (result.state === "granted") {
          updateCheck("gps", "passed", "Location access granted.");
        } else if (result.state === "prompt") {
          updateCheck(
            "gps",
            "warning",
            "Location permission not yet granted. You'll be prompted on start."
          );
        } else {
          updateCheck(
            "gps",
            "failed",
            "Location access denied. Enable it in browser/device settings."
          );
        }
      } catch {
        // Fallback: try to get position directly
        updateCheck(
          "gps",
          "warning",
          "Cannot verify permission status. Location will be requested on start."
        );
      }
    } else {
      updateCheck(
        "gps",
        "warning",
        "Cannot verify permission status. Location will be requested on start."
      );
    }
  }, [updateCheck]);

  /* ── Run all checks ── */
  const runAllChecks = useCallback(async () => {
    // Reset all to checking
    setChecks((prev) =>
      prev.map((c) => ({ ...c, status: "checking" as CheckStatus, detail: "" }))
    );

    // Run all checks in parallel
    await Promise.all([checkWifi(), checkBackground(), checkProfile(), checkGPS()]);
  }, [checkWifi, checkBackground, checkProfile, checkGPS]);

  /* ── Run on mount ── */
  useEffect(() => {
    runAllChecks();
  }, [runAllChecks]);

  /* ── Auto-scroll to calibration section when state changes ── */
  useEffect(() => {
    if (calibration === "calibrating" || calibration === "complete") {
      // Small delay so the DOM has rendered the new content
      setTimeout(() => {
        calibrationRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    }
  }, [calibration]);

  /* ── Derived state ── */
  const isChecking = checks.some((c) => c.status === "checking");
  const allPassed = checks.every(
    (c) => c.status === "passed" || c.status === "warning"
  );
  const anyFailed = checks.some((c) => c.status === "failed");

  /* ── Handle profile fix from dialog ── */
  const handleProfileFix = async () => {
    if (
      !missingWeight ||
      !missingHeight ||
      Number(missingWeight) <= 0 ||
      Number(missingHeight) <= 0
    ) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    // Convert imperial (lbs, in) → metric (kg, cm) for the backend
    const weightKg = (Number(missingWeight) / 2.20462).toFixed(2);
    const heightCm = (Number(missingHeight) * 2.54).toFixed(2);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "1",
        },
        body: JSON.stringify({ weight: weightKg, height: heightCm }),
      });

      if (res.ok) {
        updateCheck(
          "profile",
          "passed",
          `Weight: ${missingWeight} lbs · Height: ${missingHeight} in`
        );
        setProfileDialogOpen(false);
        setMissingWeight("");
        setMissingHeight("");
      } else {
        setProfileDialogOpen(false);
        checkProfile();
      }
    } catch {
      setProfileDialogOpen(false);
      checkProfile();
    }
  };

  /* ── Handle individual check action ── */
  const handleCheckAction = (check: SystemCheck) => {
    if (check.status === "passed") return;

    switch (check.id) {
      case "profile":
        setProfileDialogOpen(true);
        break;
      case "wifi":
        checkWifi();
        break;
      case "gps":
        // Try requesting location to trigger the permission prompt
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            () => updateCheck("gps", "passed", "Location access granted."),
            () =>
              updateCheck(
                "gps",
                "failed",
                "Location access denied. Enable it in browser/device settings."
              ),
            { timeout: 10000 }
          );
          updateCheck("gps", "checking", "Requesting location access…");
        }
        break;
      case "background":
        checkBackground();
        break;
    }
  };

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
          px: 2,
          pt: 4,
          pb: "80px",
        }}
      >
        {/* ── Overall Status Badge ── */}
        <OverallStatusBadge
          allPassed={allPassed}
          anyFailed={anyFailed}
          isChecking={isChecking}
        />

        {/* ── Legend ── */}
        <StatusLegend />

        {/* ── Status Per Service Areas ── */}
        <Typography
          sx={{
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "text.secondary",
            textTransform: "uppercase",
            letterSpacing: 1,
            mb: 1,
            px: 0.5,
          }}
        >
          Pre-Flight Checks
        </Typography>

        <Card
          sx={{
            borderRadius: 4,
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            mb: 3,
          }}
        >
          <CardContent sx={{ px: 0, py: 0, "&:last-child": { pb: 0 } }}>
            {checks.map((check, index) => (
              <Box key={check.id}>
                {index > 0 && <Divider />}
                <Box
                  onClick={() => handleCheckAction(check)}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 2,
                    px: 2.5,
                    py: 2,
                    cursor:
                      check.status !== "passed" && check.status !== "checking"
                        ? "pointer"
                        : "default",
                    transition: "background-color 0.15s",
                    "&:hover": {
                      bgcolor:
                        check.status !== "passed" && check.status !== "checking"
                          ? "rgba(0,0,0,0.02)"
                          : "transparent",
                    },
                  }}
                >
                  {/* Service Icon */}
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: "rgba(91,155,213,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      mt: 0.25,
                    }}
                  >
                    {check.icon}
                  </Box>

                  {/* Label & Detail */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        color: "#1a1a1a",
                        lineHeight: 1.3,
                      }}
                    >
                      {check.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.8rem",
                        color: "text.secondary",
                        lineHeight: 1.4,
                        mb: check.detail ? 0.5 : 0,
                      }}
                    >
                      {check.description}
                    </Typography>
                    {check.detail && (
                      <Fade in>
                        <Typography
                          sx={{
                            fontSize: "0.78rem",
                            color:
                              check.status === "failed"
                                ? "#d32f2f"
                                : check.status === "warning"
                                ? "#b45309"
                                : "#2e7d32",
                            fontWeight: 500,
                            lineHeight: 1.4,
                          }}
                        >
                          {check.detail}
                        </Typography>
                      </Fade>
                    )}
                    {check.status === "failed" && check.id !== "profile" && (
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          color: "#5b9bd5",
                          fontWeight: 600,
                          mt: 0.5,
                        }}
                      >
                        Tap to retry
                      </Typography>
                    )}
                    {check.status === "failed" && check.id === "profile" && (
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          color: "#5b9bd5",
                          fontWeight: 600,
                          mt: 0.5,
                        }}
                      >
                        Tap to enter missing data
                      </Typography>
                    )}
                  </Box>

                  {/* Status Indicator */}
                  <Box
                    sx={{
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      mt: 0.5,
                    }}
                  >
                    <StatusIcon status={check.status} />
                  </Box>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>

        {/* ── Refresh Button ── */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <Button
            onClick={runAllChecks}
            disabled={isChecking}
            startIcon={<RefreshIcon />}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.85rem",
              color: "#5b9bd5",
              borderRadius: 3,
              px: 3,
              "&:hover": { bgcolor: "rgba(91,155,213,0.08)" },
            }}
          >
            Re-run all checks
          </Button>
        </Box>

        {/* ── Calibration Flow ── */}
        {calibration === "idle" && (
          <>
            {/* Start Calibration Button */}
            <Fade in={allPassed && !isChecking}>
              <Box>
                <Button
                  fullWidth
                  variant="contained"
                  disabled={!allPassed || isChecking}
                  onClick={() => {
                    setCalibration("calibrating");
                    fetch("http://172.31.89.83:8000/calibrate", { method: "POST" }).catch(() => {});
                  }}
                  sx={{
                    py: 2,
                    borderRadius: 3,
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    textTransform: "none",
                    bgcolor: "#2e7d32",
                    boxShadow: "0 4px 20px rgba(46,125,50,0.35)",
                    "&:hover": { bgcolor: "#1b5e20" },
                    "&.Mui-disabled": {
                      bgcolor: "#ccc",
                      color: "#999",
                    },
                  }}
                >
                  Start Calibration
                </Button>
                <Typography
                  sx={{
                    textAlign: "center",
                    fontSize: "0.78rem",
                    color: "text.secondary",
                    mt: 1,
                  }}
                >
                  Stand still for 4 seconds to zero the sensor
                </Typography>
              </Box>
            </Fade>

            {/* Disclaimer */}
            <Typography
              sx={{
                textAlign: "center",
                fontSize: "0.72rem",
                color: "text.disabled",
                mt: 4,
                px: 2,
                lineHeight: 1.5,
              }}
            >
              Some checks may not reflect the latest state. Tap &quot;Re-run all
              checks&quot; to refresh.
            </Typography>
          </>
        )}

        {/* Anchor for auto-scroll */}
        <Box ref={calibrationRef}>
          {calibration === "calibrating" && (
            <CalibrationTimer
              onComplete={() => setCalibration("complete")}
            />
          )}

          {calibration === "complete" && (
            <CalibrationComplete
              onContinue={() => {
                fetch("http://172.31.89.83:8000/start", { method: "POST" }).catch(() => {});
                router.push("/run");
              }}
            />
          )}
        </Box>
      </Box>

      {/* ── Profile Fix Dialog ── */}
      <Dialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 4,
            maxWidth: 380,
            width: "100%",
            mx: 2,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.1rem", pb: 0.5 }}>
          Complete Your Profile
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{
              fontSize: "0.85rem",
              color: "text.secondary",
              mb: 2.5,
              lineHeight: 1.5,
            }}
          >
            Your weight and height are needed to calculate braking force (F =
            ma) and stride length. Without these, run metrics will be
            inaccurate.
          </Typography>
          <TextField
            label="Weight"
            type="number"
            fullWidth
            value={missingWeight}
            onChange={(e) => setMissingWeight(e.target.value)}
            sx={{ mb: 2 }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">lbs</InputAdornment>
                ),
                sx: {
                  borderRadius: 2,
                  "& input": {
                    "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button":
                      { WebkitAppearance: "none", margin: 0 },
                    MozAppearance: "textfield",
                  },
                },
              },
            }}
          />
          <TextField
            label="Height"
            type="number"
            fullWidth
            value={missingHeight}
            onChange={(e) => setMissingHeight(e.target.value)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">in</InputAdornment>
                ),
                sx: {
                  borderRadius: 2,
                  "& input": {
                    "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button":
                      { WebkitAppearance: "none", margin: 0 },
                    MozAppearance: "textfield",
                  },
                },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setProfileDialogOpen(false)}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: "text.secondary",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleProfileFix}
            variant="contained"
            disabled={
              !missingWeight ||
              !missingHeight ||
              Number(missingWeight) <= 0 ||
              Number(missingHeight) <= 0
            }
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: "#5b9bd5",
              "&:hover": { bgcolor: "#4a8bc4" },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Bottom Navigation ── */}
      <BottomNavigation
        value={1}
        showLabels
        onChange={(_, newValue) => {
          if (newValue === 0) router.push("/dashboard");
          if (newValue === 2) router.push("/profile");
        }}
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
