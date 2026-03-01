"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Avatar from "@mui/material/Avatar";
import InputAdornment from "@mui/material/InputAdornment";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import RecordButton from "@mui/icons-material/RadioButtonChecked";
import ProfileIcon from "@mui/icons-material/PersonOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import CircularProgress from "@mui/material/CircularProgress";

/* ─────────────────────────────── Types ──────────────────────────── */
interface ProfileFormData {
  weight: string;
  height: string;
  age: string;
  sex: "male" | "female" | "other" | "";
}

type EditableField = keyof ProfileFormData | null;

/* ─────────────────────────── Constants ───────────────────────────── */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ───────────────────── Unit Conversion Helpers ──────────────────── */
const lbsToKg = (lbs: number) => +(lbs * 0.453592).toFixed(2);
const kgToLbs = (kg: number) => Math.round(kg / 0.453592);
const inToCm = (inches: number) => +(inches * 2.54).toFixed(2);
const cmToIn = (cm: number) => Math.round(cm / 2.54);

/** Convert a metric-stored profile to the given display unit system. */
function metricToDisplay(
  data: ProfileFormData,
  displayUnit: "imperial" | "metric"
): ProfileFormData {
  if (displayUnit === "metric") return data; // already metric
  return {
    ...data,
    weight: data.weight ? String(kgToLbs(Number(data.weight))) : "",
    height: data.height ? String(cmToIn(Number(data.height))) : "",
  };
}

/** Convert profile from one display unit to another. */
function convertProfile(
  data: ProfileFormData,
  to: "imperial" | "metric"
): ProfileFormData {
  if (to === "metric") {
    return {
      ...data,
      weight: data.weight ? String(lbsToKg(Number(data.weight))) : "",
      height: data.height ? String(inToCm(Number(data.height))) : "",
    };
  }
  return {
    ...data,
    weight: data.weight ? String(kgToLbs(Number(data.weight))) : "",
    height: data.height ? String(cmToIn(Number(data.height))) : "",
  };
}

/** Convert a display-unit profile to metric for the API. */
function displayToMetric(
  data: ProfileFormData,
  displayUnit: "imperial" | "metric"
): ProfileFormData {
  if (displayUnit === "metric") return data;
  return {
    ...data,
    weight: data.weight ? String(lbsToKg(Number(data.weight))) : "",
    height: data.height ? String(inToCm(Number(data.height))) : "",
  };
}

/* ═══════════════════════════ PROFILE PAGE ════════════════════════════ */
export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileFormData>({
    weight: "",
    height: "",
    age: "",
    sex: "",
  });

  /* profileMetric keeps the metric (DB) copy so we can always convert correctly */
  const [profileMetric, setProfileMetric] = useState<ProfileFormData>({
    weight: "",
    height: "",
    age: "",
    sex: "",
  });

  const [unitSystem, setUnitSystem] = useState<"imperial" | "metric">(
    "imperial"
  );
  const [editingField, setEditingField] = useState<EditableField>(null);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState("Profile updated");
  const [snackSeverity, setSnackSeverity] = useState<"success" | "error">("success");
  const [sexDialogOpen, setSexDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");

  /* ── Summary stats (fetched from /runs) ── */
  const [totalRuns, setTotalRuns] = useState(0);
  const [totalMiles, setTotalMiles] = useState(0);
  const [displayRunIQ, setDisplayRunIQ] = useState<number | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    defaultValues: profile,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  /* ── Fetch profile from backend on mount ── */
  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) setUsername(storedUsername);

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "1" },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("username");
          router.push("/login");
        }
        return;
      }

      const data = await res.json();
      const metricData: ProfileFormData = {
        weight: data.weight ?? "",
        height: data.height ?? "",
        age: data.age != null ? String(data.age) : "",
        sex: data.gender ?? "",
      };

      setProfileMetric(metricData);

      // Convert to display units
      const displayData = metricToDisplay(metricData, unitSystem);
      setProfile(displayData);
      reset(displayData);

      if (data.username) setUsername(data.username);
    } catch {
      // silently fail — profile will show empty
    } finally {
      setLoading(false);
    }
  }, [router, reset, unitSystem]);

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Fetch run history for summary stats ── */
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const headers: HeadersInit = {
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "1",
    };

    // Fetch profile for RunIQ cadence target
    const profileP = fetch(`${API_BASE}/auth/me`, { headers, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    // Fetch runs
    const runsP = fetch(`${API_BASE}/runs`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    Promise.all([profileP, runsP]).then(([profileData, runsData]) => {
      if (!runsData?.runs?.length) return;

      interface SummaryRun {
        distance_m: number;
        avg_cadence: number | null;
        avg_gct: number | null;
        avg_shock: number | null;
        midfoot_pct: number | null;
      }
      const runs: SummaryRun[] = runsData.runs;

      setTotalRuns(runs.length);
      setTotalMiles(
        runs.reduce((sum: number, r: SummaryRun) => sum + r.distance_m / 1609.344, 0)
      );

      // RunIQ — same logic as dashboard
      let heightCm = 175;
      let gender = 0;
      if (profileData) {
        const h = Number(profileData.height);
        if (h > 0) heightCm = h;
        if (profileData.gender?.toLowerCase?.() === "female") gender = 1;
      }
      const cTarget = Math.round(180 - (heightCm - 175) / 2 + gender * 3);

      const strideRuns = runs.filter((r: SummaryRun) => r.avg_cadence != null);
      const iqRuns = strideRuns.slice(0, 6);
      if (iqRuns.length === 0) return;

      const shockVals = iqRuns
        .map((r: SummaryRun) => r.avg_shock)
        .filter((v): v is number => v != null);
      const shockBaseline = shockVals.length > 0 ? Math.min(...shockVals) : 2.0;

      const scores = iqRuns.map((r: SummaryRun) => {
        const pC = r.avg_cadence != null ? Math.max(0, 50 - 2 * Math.abs(r.avg_cadence - cTarget)) : 0;
        const pZ = r.midfoot_pct != null ? 50 * (r.midfoot_pct / 100) : 0;
        const pS = r.avg_gct != null ? Math.max(0, Math.min(50, 50 - (r.avg_gct - 220) / 2)) : 0;
        let pI = 0;
        if (r.avg_shock != null && shockBaseline > 0) {
          const ratio = r.avg_shock / shockBaseline;
          const heavyPct = ratio > 1.15 ? Math.min(1, (ratio - 1.15) / 0.85) : 0;
          pI = 50 * (1 - heavyPct);
        }
        return Math.round(pC + pZ + pS + pI);
      });

      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      setDisplayRunIQ(avg);
    });
  }, []);

  /* ── Validation ── */
  const validationRules = {
    age: {
      required: "Required",
      min: { value: 13, message: "Min 13" },
      max: { value: 120, message: "Max 120" },
    },
    height: {
      required: "Required",
      min: {
        value: unitSystem === "imperial" ? 36 : 90,
        message: unitSystem === "imperial" ? "Min 36 in" : "Min 90 cm",
      },
      max: {
        value: unitSystem === "imperial" ? 96 : 245,
        message: unitSystem === "imperial" ? "Max 96 in" : "Max 245 cm",
      },
    },
    weight: {
      required: "Required",
      min: {
        value: unitSystem === "imperial" ? 50 : 23,
        message: unitSystem === "imperial" ? "Min 50 lbs" : "Min 23 kg",
      },
      max: {
        value: unitSystem === "imperial" ? 700 : 320,
        message: unitSystem === "imperial" ? "Max 700 lbs" : "Max 320 kg",
      },
    },
    sex: { required: "Required" },
  };

  /* ── Helpers ── */
  const startEditing = (field: EditableField) => {
    if (field === "sex") {
      setSexDialogOpen(true);
      return;
    }
    reset(profile);
    setEditingField(field);
  };

  const cancelEditing = () => {
    reset(profile);
    setEditingField(null);
  };

  /** Persist a single field update to the backend (always sends metric). */
  const saveToBackend = async (metricPayload: {
    height?: string | null;
    weight?: string | null;
    age?: number | null;
    gender?: string | null;
  }) => {
    const token = localStorage.getItem("access_token");
    if (!token) return false;

    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "1",
        },
        body: JSON.stringify(metricPayload),
      });

      if (!res.ok) {
        const err = await res.json();
        setSnackMessage(err.detail ?? "Failed to save.");
        setSnackSeverity("error");
        setSnackOpen(true);
        return false;
      }
      return true;
    } catch {
      setSnackMessage("Unable to connect to the server.");
      setSnackSeverity("error");
      setSnackOpen(true);
      return false;
    }
  };

  const saveField = async (data: ProfileFormData) => {
    if (!editingField) return;

    const updatedDisplay = { ...profile, [editingField]: data[editingField] };
    const updatedMetric = displayToMetric(updatedDisplay, unitSystem);

    // Build payload with only the changed field
    const payload: Record<string, string | number | null> = {};
    if (editingField === "weight") payload.weight = updatedMetric.weight || null;
    if (editingField === "height") payload.height = updatedMetric.height || null;
    if (editingField === "age") payload.age = updatedMetric.age ? Number(updatedMetric.age) : null;

    const ok = await saveToBackend(payload);
    if (!ok) return;

    setProfile(updatedDisplay);
    setProfileMetric(updatedMetric);
    setEditingField(null);
    setSnackMessage("Profile updated");
    setSnackSeverity("success");
    setSnackOpen(true);
  };

  const saveSex = async (value: "male" | "female" | "other") => {
    const ok = await saveToBackend({ gender: value });
    if (!ok) return;

    setProfile((prev) => ({ ...prev, sex: value }));
    setProfileMetric((prev) => ({ ...prev, sex: value }));
    setSexDialogOpen(false);
    setSnackMessage("Profile updated");
    setSnackSeverity("success");
    setSnackOpen(true);
  };

  const getSexLabel = (val: string) => {
    if (val === "male") return "Male";
    if (val === "female") return "Female";
    return "Prefer not to say";
  };

  const getUnit = (field: string) => {
    if (field === "weight") return unitSystem === "imperial" ? "lbs" : "kg";
    if (field === "height") return unitSystem === "imperial" ? "in" : "cm";
    if (field === "age") return "years";
    return "";
  };

  /* ── Metric Row Component ── */
  const MetricRow = ({
    label,
    field,
    icon,
  }: {
    label: string;
    field: keyof ProfileFormData;
    icon?: string;
  }) => {
    const isEditing = editingField === field;
    const isSex = field === "sex";
    const displayValue = isSex
      ? getSexLabel(profile[field])
      : `${profile[field]} ${getUnit(field)}`;

    if (isEditing && !isSex) {
      return (
        <Box sx={{ py: 1.5 }}>
          <Typography
            sx={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "text.secondary",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              mb: 1,
            }}
          >
            {label}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Controller
              name={field}
              control={control}
              rules={validationRules[field]}
              render={({ field: formField }) => (
                <TextField
                  {...formField}
                  type="number"
                  size="small"
                  autoFocus
                  fullWidth
                  error={!!errors[field]}
                  helperText={errors[field]?.message}
                  slotProps={{
                    input: {
                      endAdornment: !isSex ? (
                        <InputAdornment position="end">
                          <Typography
                            sx={{
                              fontSize: "0.85rem",
                              color: "text.secondary",
                            }}
                          >
                            {getUnit(field)}
                          </Typography>
                        </InputAdornment>
                      ) : undefined,
                      sx: {
                        borderRadius: 2,
                        fontSize: "1rem",
                        fontWeight: 600,
                        "& input": {
                          "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button":
                            {
                              WebkitAppearance: "none",
                              margin: 0,
                            },
                          MozAppearance: "textfield",
                        },
                      },
                    },
                  }}
                />
              )}
            />
            <IconButton
              onClick={handleSubmit(saveField)}
              sx={{
                bgcolor: "#5b9bd5",
                color: "#fff",
                "&:hover": { bgcolor: "#4a8bc4" },
                width: 36,
                height: 36,
              }}
            >
              <CheckIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton
              onClick={cancelEditing}
              sx={{
                bgcolor: "#eee",
                color: "#666",
                "&:hover": { bgcolor: "#ddd" },
                width: 36,
                height: 36,
              }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>
      );
    }

    return (
      <Box
        onClick={() => startEditing(field)}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 2,
          cursor: "pointer",
          borderRadius: 2,
          px: 0.5,
          transition: "background-color 0.15s",
          "&:hover": { bgcolor: "rgba(0,0,0,0.02)" },
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "text.secondary",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              mb: 0.25,
            }}
          >
            {label}
          </Typography>
          <Typography sx={{ fontSize: "1.05rem", fontWeight: 600, color: "#1a1a1a" }}>
            {displayValue}
          </Typography>
        </Box>
        <EditOutlinedIcon sx={{ fontSize: 20, color: "#999" }} />
      </Box>
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          bgcolor: "#f2f2f2",
        }}
      >
        <CircularProgress sx={{ color: "#5b9bd5" }} />
      </Box>
    );
  }

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
        {/* ── Profile Header ── */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mb: 3.5,
          }}
        >
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: "#5b9bd5",
              fontSize: "2rem",
              fontWeight: 700,
              mb: 1.5,
            }}
          >
            {username ? username[0].toUpperCase() : "U"}
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#1a1a1a" }}>
            {username || "User"}
          </Typography>
        </Box>

        {/* ── Unit Toggle ── */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <ToggleButtonGroup
            value={unitSystem}
            exclusive
            onChange={(_, val) => {
              if (val && val !== unitSystem) {
                // Always convert from the metric source-of-truth
                const converted = metricToDisplay(profileMetric, val);
                setProfile(converted);
                reset(converted);
                setUnitSystem(val);
              }
            }}
            sx={{
              bgcolor: "#fff",
              borderRadius: 3,
              "& .MuiToggleButton-root": {
                border: "none",
                px: 3,
                py: 0.75,
                fontSize: "0.85rem",
                fontWeight: 600,
                textTransform: "none",
                borderRadius: "12px !important",
                color: "#666",
                "&.Mui-selected": {
                  bgcolor: "#5b9bd5",
                  color: "#fff",
                  "&:hover": { bgcolor: "#4a8bc4" },
                },
              },
            }}
          >
            <ToggleButton value="imperial">Imperial</ToggleButton>
            <ToggleButton value="metric">Metric</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* ── Body Metrics Card ── */}
        <Typography
          sx={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "text.secondary",
            textTransform: "uppercase",
            letterSpacing: 0.8,
            mb: 1,
            px: 0.5,
          }}
        >
          Body Metrics
        </Typography>
        <Card
          sx={{
            borderRadius: 4,
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            mb: 3,
          }}
        >
          <CardContent sx={{ px: 2.5, py: 1, "&:last-child": { pb: 1 } }}>
            <MetricRow label="Sex" field="sex" />
            <Divider />
            <MetricRow label="Age" field="age" />
            <Divider />
            <MetricRow label="Height" field="height" />
            <Divider />
            <MetricRow label="Weight" field="weight" />
          </CardContent>
        </Card>

        {/* ── Quick Stats Summary ── */}
        <Typography
          sx={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "text.secondary",
            textTransform: "uppercase",
            letterSpacing: 0.8,
            mb: 1,
            px: 0.5,
          }}
        >
          Summary
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5, mb: 3 }}>
          {[
            { label: "Total Runs", value: String(totalRuns) },
            { label: "Miles", value: totalMiles.toFixed(1) },
            { label: "RunIQ", value: displayRunIQ != null ? String(displayRunIQ) : "—" },
          ].map((stat) => (
            <Card
              key={stat.label}
              sx={{
                flex: 1,
                borderRadius: 3,
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                textAlign: "center",
              }}
            >
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Typography
                  sx={{ fontSize: "1.5rem", fontWeight: 800, color: "#5b9bd5" }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    color: "text.secondary",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                    mt: 0.25,
                  }}
                >
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* ── Account Actions ── */}
        <Typography
          sx={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "text.secondary",
            textTransform: "uppercase",
            letterSpacing: 0.8,
            mb: 1,
            px: 0.5,
          }}
        >
          Account
        </Typography>
        <Card
          sx={{
            borderRadius: 4,
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            mb: 2,
          }}
        >
          <CardContent sx={{ px: 2.5, py: 0.5, "&:last-child": { pb: 0.5 } }}>
            <Button
              fullWidth
              sx={{
                justifyContent: "flex-start",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.95rem",
                color: "#1a1a1a",
                py: 1.5,
              }}
            >
              Settings
            </Button>
            <Divider />
            <Button
              fullWidth
              onClick={() => {
                localStorage.removeItem("access_token");
                localStorage.removeItem("username");
                router.push("/login");
              }}
              sx={{
                justifyContent: "flex-start",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.95rem",
                color: "#d32f2f",
                py: 1.5,
              }}
            >
              Log Out
            </Button>
          </CardContent>
        </Card>
      </Box>

      {/* ── Sex Selection Dialog ── */}
      <Dialog
        open={sexDialogOpen}
        onClose={() => setSexDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 4,
            maxWidth: 340,
            width: "100%",
            mx: 2,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.1rem", pb: 1 }}>
          Select Sex
        </DialogTitle>
        <DialogContent sx={{ pt: 1, pb: 0 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {(["male", "female", "other"] as const).map((option) => (
              <Button
                key={option}
                variant={profile.sex === option ? "contained" : "outlined"}
                onClick={() => saveSex(option)}
                sx={{
                  py: 1.5,
                  borderRadius: 3,
                  textTransform: "capitalize",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  borderColor:
                    profile.sex === option ? "transparent" : "#d0d0d0",
                  bgcolor:
                    profile.sex === option ? "#5b9bd5" : "transparent",
                  color: profile.sex === option ? "#fff" : "#333",
                  boxShadow:
                    profile.sex === option
                      ? "0 4px 14px rgba(91,155,213,0.35)"
                      : "none",
                  "&:hover": {
                    bgcolor:
                      profile.sex === option
                        ? "#4a8bc4"
                        : "rgba(91,155,213,0.08)",
                    borderColor:
                      profile.sex === option ? "transparent" : "#5b9bd5",
                  },
                }}
              >
                {option === "other" ? "Prefer not to say" : option}
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 2 }}>
          <Button
            onClick={() => setSexDialogOpen(false)}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: "text.secondary",
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={2500}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ maxWidth: 600, mx: "auto" }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity={snackSeverity}
          variant="filled"
          sx={{
            borderRadius: 3,
            fontWeight: 600,
            width: "100%",
          }}
        >
          {snackMessage}
        </Alert>
      </Snackbar>

      {/* ── Bottom Navigation ── */}
      <BottomNavigation
        value={2}
        showLabels
        onChange={(_, newValue) => {
          if (newValue === 0) router.push("/dashboard");
          if (newValue === 1) router.push("/record");
          // newValue === 2 → already on profile
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
