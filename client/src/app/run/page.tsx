"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SpeedIcon from "@mui/icons-material/Speed";
import StraightenIcon from "@mui/icons-material/Straighten";
import Map, { Marker, Source, Layer, type MapRef } from "react-map-gl/mapbox";
import type { LayerProps } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

/* ─────────────────────── Constants ─────────────────────── */
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const NODE_URL = process.env.NEXT_PUBLIC_NODE_URL ?? "https://bronson-nonignitable-waylon.ngrok-free.dev";
const NODE_WS_URL = NODE_URL.replace(/^https?/, NODE_URL.startsWith("https") ? "wss" : "ws");

// Default viewport — Irvine, CA
const DEFAULT_CENTER = { longitude: -117.826166, latitude: 33.684566 };
const DEFAULT_ZOOM = 15;

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

  /* ── Arduino WebSocket ── */
  useEffect(() => {
    const ws = new WebSocket(`${NODE_WS_URL}/ws/app`);
    ws.onmessage = (event) => {
      console.log("[Arduino]", event.data);
    };
    ws.onerror = (err) => {
      console.error("[Arduino WS error]", err);
    };
    return () => {
      ws.close();
    };
  }, []);

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

    // Primary: watchPosition with maximumAge=3000 so it can return cached
    // positions quickly instead of waiting for a brand new GPS fix each time
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      onError,
      {
        enableHighAccuracy: true,
        maximumAge: 3000,  // accept positions up to 3s old
        timeout: 10000,
      }
    );

    // Secondary: sequential polling — only requests a new position after
    // the previous one completes. This avoids jamming the GPS queue on iOS.
    let pollActive = true;

    const pollLoop = () => {
      if (!pollActive) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handlePosition(pos);
          // Wait 1 second then poll again
          setTimeout(pollLoop, 1000);
        },
        () => {
          // On error, retry after 2 seconds
          setTimeout(pollLoop, 2000);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,     // force fresh for the poll
          timeout: 8000,
        }
      );
    };

    // Start polling after a short delay to let watchPosition get the first fix
    const pollStartTimer = setTimeout(pollLoop, 2000);

    return () => {
      pollActive = false;
      clearTimeout(pollStartTimer);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once

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
    // Clean up
    if (timerRef.current) clearInterval(timerRef.current);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    setConfirmStop(false);
    // Navigate back to record/dashboard with summary
    router.push("/record");
  }, [router]);

  const handleBack = useCallback(() => {
    // Just minimize — in a real app this might go to a mini-player
    router.push("/record");
  }, [router]);

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
      <Box sx={{ position: "absolute", inset: 0, bottom: 280 }}>
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

          {/* User position dot — always visible */}
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
              {/* Pulsing outer ring */}
              <Box
                sx={{
                  position: "absolute",
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  bgcolor: "rgba(91,155,213,0.2)",
                  animation: "gps-pulse 2s ease-out infinite",
                  "@keyframes gps-pulse": {
                    "0%": {
                      transform: "scale(0.8)",
                      opacity: 1,
                    },
                    "100%": {
                      transform: "scale(2.2)",
                      opacity: 0,
                    },
                  },
                }}
              />
              {/* Inner dot */}
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

      {/* ═══════════ Bottom Metrics Panel ═══════════ */}
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          bgcolor: "#f2f2f2",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          boxShadow: "0 -4px 24px rgba(0,0,0,0.08)",
          pb: "env(safe-area-inset-bottom, 16px)",
          maxWidth: 600,
          mx: "auto",
        }}
      >
        {/* ── Drag handle ── */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            pt: 1.5,
            pb: 0.5,
          }}
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

        {/* ── Metrics Cards ── */}
        <Box sx={{ px: 2, mb: 2 }}>
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

        {/* ── Action Button(s) ── */}
        <Box sx={{ px: 2, pb: 2 }}>
          {status === "running" ? (
            /* ── Pause Button ── */
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
            /* ── Resume + Stop Buttons ── */
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                alignItems: "center",
              }}
            >
              {/* Stop */}
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

              {/* Resume */}
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
