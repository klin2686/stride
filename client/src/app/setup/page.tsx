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
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import InputAdornment from "@mui/material/InputAdornment";
import Fade from "@mui/material/Fade";
import IconButton from "@mui/material/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

/* ─────────────────────────────── Types ──────────────────────────── */
interface SetupFormData {
  weight: string;
  height: string;
  age: string;
  sex: "male" | "female" | "other" | "";
}

/* ───────────────────── Step Progress Indicator ──────────────────── */
function StepIndicator({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <Box sx={{ display: "flex", gap: 1, mb: 4, mt: 1 }}>
      {Array.from({ length: total }).map((_, i) => (
        <Box
          key={i}
          sx={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            bgcolor: i <= current ? "#5b9bd5" : "#d4e6f6",
            transition: "background-color 0.3s ease",
          }}
        />
      ))}
    </Box>
  );
}

/* ═══════════════════════════ SETUP PAGE ═════════════════════════════ */
export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [unitSystem, setUnitSystem] = useState<"imperial" | "metric">(
    "imperial"
  );

  const [attempted, setAttempted] = useState(false);

  const {
    control,
    handleSubmit,
    trigger,
    getValues,
    clearErrors,
    formState: { errors },
  } = useForm<SetupFormData>({
    defaultValues: {
      weight: "",
      height: "",
      age: "",
      sex: "",
    },
    mode: "onTouched",
    reValidateMode: "onChange",
  });

  const steps = [
    { key: "sex" as const, label: "What's your sex?", subtitle: "This helps us personalize your training plan." },
    { key: "age" as const, label: "How old are you?", subtitle: "Age affects your target heart rate zones." },
    { key: "height" as const, label: "How tall are you?", subtitle: "Used to calculate stride length & cadence targets." },
    { key: "weight" as const, label: "What's your weight?", subtitle: "Helps estimate calorie burn & pacing." },
  ];

  const currentStep = steps[step];

  /* ── Navigation ── */
  const handleNext = async () => {
    setAttempted(true);
    const valid = await trigger(currentStep.key);
    if (!valid) return;

    if (step < steps.length - 1) {
      setAttempted(false);
      setStep((s) => s + 1);
    } else {
      handleSubmit(onSubmit)();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setAttempted(false);
      clearErrors();
      setStep((s) => s - 1);
    }
  };

  const onSubmit = (data: SetupFormData) => {
    // TODO: send data to backend / context
    console.log("Setup complete:", data);
    router.push("/dashboard");
  };

  /* ── Validation rules ── */
  const validationRules = {
    sex: { required: "Please select an option" },
    age: {
      required: "Age is required",
      min: { value: 13, message: "Must be at least 13" },
      max: { value: 120, message: "Please enter a valid age" },
    },
    height: {
      required: "Height is required",
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
      required: "Weight is required",
      min: {
        value: unitSystem === "imperial" ? 50 : 23,
        message: unitSystem === "imperial" ? "Min 50 lbs" : "Min 23 kg",
      },
      max: {
        value: unitSystem === "imperial" ? 700 : 320,
        message: unitSystem === "imperial" ? "Max 700 lbs" : "Max 320 kg",
      },
    },
  };

  /* ── Render the field for the current step ── */
  const renderStepContent = () => {
    switch (currentStep.key) {
      case "sex":
        return (
          <Controller
            name="sex"
            control={control}
            rules={validationRules.sex}
            render={({ field }) => (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {(["male", "female", "other"] as const).map((option) => (
                  <Button
                    key={option}
                    variant={field.value === option ? "contained" : "outlined"}
                    onClick={() => field.onChange(option)}
                    sx={{
                      py: 2,
                      borderRadius: 3,
                      textTransform: "capitalize",
                      fontSize: "1rem",
                      fontWeight: 600,
                      borderColor: field.value === option ? "transparent" : "#d0d0d0",
                      bgcolor: field.value === option ? "#5b9bd5" : "transparent",
                      color: field.value === option ? "#fff" : "#333",
                      boxShadow: field.value === option ? "0 4px 14px rgba(91,155,213,0.35)" : "none",
                      "&:hover": {
                        bgcolor: field.value === option ? "#4a8bc4" : "rgba(91,155,213,0.08)",
                        borderColor: field.value === option ? "transparent" : "#5b9bd5",
                      },
                    }}
                  >
                    {option === "other" ? "Prefer not to say" : option}
                  </Button>
                ))}
                {attempted && errors.sex && (
                  <Typography sx={{ color: "error.main", fontSize: "0.8rem", mt: 0.5 }}>
                    {errors.sex.message}
                  </Typography>
                )}
              </Box>
            )}
          />
        );

      case "age":
        return (
          <Controller
            name="age"
            control={control}
            rules={validationRules.age}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                placeholder="25"
                fullWidth
                autoFocus
                error={attempted && !!errors.age}
                helperText={attempted ? errors.age?.message : undefined}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography sx={{ color: "text.secondary", fontWeight: 500 }}>
                          years
                        </Typography>
                      </InputAdornment>
                    ),
                    sx: {
                      fontSize: "2rem",
                      fontWeight: 700,
                      borderRadius: 3,
                      "& input": {
                        textAlign: "center",
                        py: 2,
                        /* Hide number spinners */
                        "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
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
        );

      case "height":
        return (
          <Controller
            name="height"
            control={control}
            rules={validationRules.height}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                placeholder={unitSystem === "imperial" ? "68" : "173"}
                fullWidth
                autoFocus
                error={attempted && !!errors.height}
                helperText={attempted ? errors.height?.message : undefined}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography sx={{ color: "text.secondary", fontWeight: 500 }}>
                          {unitSystem === "imperial" ? "in" : "cm"}
                        </Typography>
                      </InputAdornment>
                    ),
                    sx: {
                      fontSize: "2rem",
                      fontWeight: 700,
                      borderRadius: 3,
                      "& input": {
                        textAlign: "center",
                        py: 2,
                        "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
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
        );

      case "weight":
        return (
          <Controller
            name="weight"
            control={control}
            rules={validationRules.weight}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                placeholder={unitSystem === "imperial" ? "160" : "73"}
                fullWidth
                autoFocus
                error={attempted && !!errors.weight}
                helperText={attempted ? errors.weight?.message : undefined}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography sx={{ color: "text.secondary", fontWeight: 500 }}>
                          {unitSystem === "imperial" ? "lbs" : "kg"}
                        </Typography>
                      </InputAdornment>
                    ),
                    sx: {
                      fontSize: "2rem",
                      fontWeight: 700,
                      borderRadius: 3,
                      "& input": {
                        textAlign: "center",
                        py: 2,
                        "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
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
        );
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
      {/* ─── Top Bar ─── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 1,
          pt: 2,
        }}
      >
        <IconButton
          onClick={handleBack}
          sx={{
            visibility: step > 0 ? "visible" : "hidden",
            color: "#333",
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }} />
        <Typography
          sx={{
            fontSize: "0.85rem",
            color: "text.secondary",
            pr: 2,
          }}
        >
          {step + 1} / {steps.length}
        </Typography>
      </Box>

      {/* ─── Main Content ─── */}
      <Box sx={{ flex: 1, px: 3, pt: 1 }}>
        <StepIndicator total={steps.length} current={step} />

        <Fade in key={step} timeout={300}>
          <Box>
            {/* Question */}
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: "#1a1a1a",
                mb: 0.75,
                lineHeight: 1.3,
              }}
            >
              {currentStep.label}
            </Typography>
            <Typography
              sx={{
                color: "text.secondary",
                fontSize: "0.9rem",
                mb: 3.5,
                lineHeight: 1.5,
              }}
            >
              {currentStep.subtitle}
            </Typography>

            {/* Unit toggle (only for height & weight steps) */}
            {(currentStep.key === "height" || currentStep.key === "weight") && (
              <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                <ToggleButtonGroup
                  value={unitSystem}
                  exclusive
                  onChange={(_, val) => {
                    if (val) setUnitSystem(val);
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
            )}

            {/* Step field */}
            <Card
              sx={{
                borderRadius: 4,
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                overflow: "visible",
              }}
            >
              <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
                {renderStepContent()}
              </CardContent>
            </Card>
          </Box>
        </Fade>
      </Box>

      {/* ─── Bottom CTA ─── */}
      <Box sx={{ px: 3, pb: 4, pt: 2 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={handleNext}
          sx={{
            py: 1.75,
            borderRadius: 3,
            fontSize: "1rem",
            fontWeight: 700,
            textTransform: "none",
            bgcolor: "#5b9bd5",
            boxShadow: "0 4px 14px rgba(91,155,213,0.35)",
            "&:hover": { bgcolor: "#4a8bc4" },
          }}
        >
          {step < steps.length - 1 ? "Continue" : "Finish Setup"}
        </Button>

        {step < steps.length - 1 && (
          <Button
            fullWidth
            onClick={() => setStep((s) => s + 1)}
            sx={{
              mt: 1.5,
              py: 1,
              borderRadius: 3,
              fontSize: "0.85rem",
              fontWeight: 500,
              textTransform: "none",
              color: "text.secondary",
              "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
            }}
          >
            Skip for now
          </Button>
        )}
      </Box>
    </Box>
  );
}
