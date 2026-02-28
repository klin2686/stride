"use client";

import { useState } from "react";
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

/* ─────────────────────────────── Types ──────────────────────────── */
interface ProfileFormData {
  weight: string;
  height: string;
  age: string;
  sex: "male" | "female" | "other" | "";
}

type EditableField = keyof ProfileFormData | null;

/* ───────────────────── Unit Conversion Helpers ──────────────────── */
const lbsToKg = (lbs: number) => Math.round(lbs * 0.453592);
const kgToLbs = (kg: number) => Math.round(kg / 0.453592);
const inToCm = (inches: number) => Math.round(inches * 2.54);
const cmToIn = (cm: number) => Math.round(cm / 2.54);

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

/* ═══════════════════════════ PROFILE PAGE ════════════════════════════ */
export default function ProfilePage() {
  const router = useRouter();

  // TODO: Replace with real user data from backend/context
  const [profile, setProfile] = useState<ProfileFormData>({
    weight: "160",
    height: "68",
    age: "25",
    sex: "male",
  });

  const [unitSystem, setUnitSystem] = useState<"imperial" | "metric">(
    "imperial"
  );
  const [editingField, setEditingField] = useState<EditableField>(null);
  const [snackOpen, setSnackOpen] = useState(false);
  const [sexDialogOpen, setSexDialogOpen] = useState(false);

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

  const saveField = (data: ProfileFormData) => {
    if (!editingField) return;
    const updated = { ...profile, [editingField]: data[editingField] };
    setProfile(updated);
    setEditingField(null);
    setSnackOpen(true);
  };

  const saveSex = (value: "male" | "female" | "other") => {
    setProfile((prev) => ({ ...prev, sex: value }));
    setSexDialogOpen(false);
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
            U
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#1a1a1a" }}>
            username
          </Typography>
          <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
            Member since 2025
          </Typography>
        </Box>

        {/* ── Unit Toggle ── */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <ToggleButtonGroup
            value={unitSystem}
            exclusive
            onChange={(_, val) => {
              if (val && val !== unitSystem) {
                const converted = convertProfile(profile, val);
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
            { label: "Total Runs", value: "24" },
            { label: "Miles", value: "76.4" },
            { label: "RunIQ", value: "165" },
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

      {/* ── Success Snackbar ── */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={2000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ maxWidth: 600, mx: "auto" }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity="success"
          variant="filled"
          sx={{
            borderRadius: 3,
            fontWeight: 600,
            width: "100%",
          }}
        >
          Profile updated
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
