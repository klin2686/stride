"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import Map, { Marker, Source, Layer, type MapRef } from "react-map-gl/mapbox";
import type { LayerProps } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

/* ─────────────────────── Constants ─────────────────────── */
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

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

  /* ── Refs ── */
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<MapRef | null>(null);

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

  /* ── Geolocation watcher ── */
  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    const onPosition = (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setUserPosition({ lat, lng });

      // Pan the map to follow the user
      mapRef.current?.flyTo({
        center: [lng, lat],
        duration: 1000,
        essential: true,
      });

      if (status === "running") {
        // Accumulate distance
        if (lastPositionRef.current) {
          const d = haversine(
            lastPositionRef.current.lat,
            lastPositionRef.current.lng,
            lat,
            lng
          );
          // Only count movement > 2m to filter GPS jitter
          if (d > 2) {
            setDistanceMeters((prev) => prev + d);
            setRouteCoords((prev) => [...prev, [lng, lat]]);
            lastPositionRef.current = { lat, lng };
          }
        } else {
          // First position
          lastPositionRef.current = { lat, lng };
          setRouteCoords([[lng, lat]]);
        }
      }
    };

    const onError = (err: GeolocationPositionError) => {
      console.warn("Geolocation error:", err.message);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      onPosition,
      onError,
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [status]);

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
  }, []);

  const handleResume = useCallback(() => {
    setStatus("running");
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
        bgcolor: "#000",
      }}
    >
      {/* ═══════════ Full-Screen Map ═══════════ */}
      <Box sx={{ position: "absolute", inset: 0 }}>
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: mapCenter.longitude,
            latitude: mapCenter.latitude,
            zoom: DEFAULT_ZOOM,
          }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
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
                  bgcolor: "rgba(66,133,244,0.2)",
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
                  bgcolor: "#4285F4",
                  border: "3px solid #fff",
                  boxShadow: "0 0 12px rgba(66,133,244,0.6)",
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
        <IconButton onClick={handleBack} sx={{ color: "#fff" }}>
          <KeyboardArrowDownIcon sx={{ fontSize: 32 }} />
        </IconButton>
      </Box>

      {/* ═══════════ Bottom Metrics Sheet ═══════════ */}
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          bgcolor: "#1c1c1e",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          pb: "env(safe-area-inset-bottom, 16px)",
        }}
      >
        {/* ── Drag handle ── */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            pt: 1.5,
            pb: 1,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 4,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.25)",
            }}
          />
        </Box>

        {/* ── Run label ── */}
        <Typography
          sx={{
            textAlign: "center",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.95rem",
            mb: 2,
          }}
        >
          Run
        </Typography>

        {/* ── Metrics Grid ── */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "flex-start",
            px: 2,
            pb: 2.5,
          }}
        >
          {/* Time */}
          <Box sx={{ textAlign: "center", flex: 1 }}>
            <Typography
              sx={{
                color: "#fff",
                fontWeight: 800,
                fontSize: "2rem",
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatTime(elapsedSeconds)}
            </Typography>
            <Typography
              sx={{
                color: "rgba(255,255,255,0.55)",
                fontSize: "0.75rem",
                fontWeight: 500,
                mt: 0.5,
              }}
            >
              Time
            </Typography>
          </Box>

          {/* Pace */}
          <Box sx={{ textAlign: "center", flex: 1 }}>
            <Typography
              sx={{
                color: "#fff",
                fontWeight: 800,
                fontSize: "2rem",
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {pace}
            </Typography>
            <Typography
              sx={{
                color: "rgba(255,255,255,0.55)",
                fontSize: "0.75rem",
                fontWeight: 500,
                mt: 0.5,
              }}
            >
              Split avg. pace (/mi)
            </Typography>
          </Box>

          {/* Distance */}
          <Box sx={{ textAlign: "center", flex: 1 }}>
            <Typography
              sx={{
                color: "#fff",
                fontWeight: 800,
                fontSize: "2rem",
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {distanceMiles.toFixed(2)}
            </Typography>
            <Typography
              sx={{
                color: "rgba(255,255,255,0.55)",
                fontSize: "0.75rem",
                fontWeight: 500,
                mt: 0.5,
              }}
            >
              Distance (mi)
            </Typography>
          </Box>
        </Box>

        {/* ── Action Button(s) ── */}
        <Box sx={{ px: 3, pb: 2 }}>
          {status === "running" ? (
            /* ── Pause Button ── */
            <Button
              fullWidth
              variant="contained"
              onClick={handlePause}
              startIcon={<PauseIcon sx={{ fontSize: 28 }} />}
              sx={{
                py: 2,
                borderRadius: "50px",
                fontSize: "1.15rem",
                fontWeight: 800,
                textTransform: "none",
                bgcolor: "#ff5722",
                color: "#fff",
                boxShadow: "0 4px 24px rgba(255,87,34,0.45)",
                "&:hover": { bgcolor: "#e64a19" },
              }}
            >
              Pause
            </Button>
          ) : (
            /* ── Resume + Stop Buttons ── */
            <Box
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "center",
              }}
            >
              {/* Stop */}
              <IconButton
                onClick={() => setConfirmStop(true)}
                sx={{
                  width: 60,
                  height: 60,
                  bgcolor: "#d32f2f",
                  color: "#fff",
                  boxShadow: "0 4px 16px rgba(211,47,47,0.4)",
                  "&:hover": { bgcolor: "#b71c1c" },
                }}
              >
                <StopIcon sx={{ fontSize: 32 }} />
              </IconButton>

              {/* Resume */}
              <Button
                fullWidth
                variant="contained"
                onClick={handleResume}
                startIcon={<PlayArrowIcon sx={{ fontSize: 28 }} />}
                sx={{
                  py: 2,
                  borderRadius: "50px",
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  textTransform: "none",
                  bgcolor: "#2e7d32",
                  color: "#fff",
                  boxShadow: "0 4px 24px rgba(46,125,50,0.45)",
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
            bgcolor: "#1c1c1e",
            color: "#fff",
            maxWidth: 340,
            width: "100%",
            mx: 2,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.15rem" }}>
          End Run?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>
            Your run will be saved with{" "}
            <strong>{distanceMiles.toFixed(2)} mi</strong> in{" "}
            <strong>{formatTime(elapsedSeconds)}</strong>.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setConfirmStop(false)}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleStopConfirm();
              fetch("http://172.31.89.83:8000/stop", { method: "POST" }).catch(() => {});
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
