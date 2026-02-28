"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Fade from "@mui/material/Fade";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";

/* ─────────────────────────── Constants ───────────────────────────── */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ═══════════════════════════ LOGIN PAGE ══════════════════════════════ */
export default function LoginPage() {
  const router = useRouter();

  /* ── State ── */
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* ── Submit handler ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please fill in both fields.");
      return;
    }

    if (mode === "register" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const endpoint =
        mode === "login" ? "/auth/login" : "/auth/register";

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // Store the token
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("username", data.username);

      // Route based on mode
      if (mode === "register") {
        router.push("/setup");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Unable to connect to the server. Please try again later.");
      setLoading(false);
    }
  };

  /* ── Toggle mode ── */
  const toggleMode = () => {
    setMode((prev) => (prev === "login" ? "register" : "login"));
    setError("");
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
        justifyContent: "center",
        px: 2,
      }}
    >
      {/* ── Logo / Brand ── */}
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            bgcolor: "#5b9bd5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
            boxShadow: "0 4px 20px rgba(91,155,213,0.3)",
          }}
        >
          <DirectionsRunIcon sx={{ fontSize: 38, color: "#fff" }} />
        </Box>
        <Typography
          variant="h4"
          sx={{ fontWeight: 900, color: "#1a1a1a", letterSpacing: -0.5 }}
        >
          Stride
        </Typography>
        <Typography
          sx={{ color: "text.secondary", fontSize: "0.9rem", mt: 0.5 }}
        >
          {mode === "login"
            ? "Welcome back. Let\u2019s get moving."
            : "Create an account to start running smarter."}
        </Typography>
      </Box>

      {/* ── Form Card ── */}
      <Card
        sx={{
          borderRadius: 4,
          boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
          overflow: "visible",
        }}
      >
        <CardContent sx={{ p: 3.5, "&:last-child": { pb: 3.5 } }}>
          {/* Mode Tabs */}
          <Box
            sx={{
              display: "flex",
              bgcolor: "#f2f2f2",
              borderRadius: 3,
              p: 0.5,
              mb: 3,
            }}
          >
            {(["login", "register"] as const).map((tab) => (
              <Button
                key={tab}
                onClick={() => {
                  setMode(tab);
                  setError("");
                }}
                sx={{
                  flex: 1,
                  py: 1,
                  borderRadius: 2.5,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  bgcolor: mode === tab ? "#fff" : "transparent",
                  color: mode === tab ? "#1a1a1a" : "#999",
                  boxShadow:
                    mode === tab ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  "&:hover": {
                    bgcolor: mode === tab ? "#fff" : "rgba(0,0,0,0.03)",
                  },
                }}
              >
                {tab === "login" ? "Log In" : "Sign Up"}
              </Button>
            ))}
          </Box>

          {/* Error Alert */}
          {error && (
            <Fade in>
              <Alert
                severity="error"
                onClose={() => setError("")}
                sx={{ mb: 2.5, borderRadius: 2, fontSize: "0.85rem" }}
              >
                {error}
              </Alert>
            </Fade>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              sx={{ mb: 2 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon sx={{ color: "#aaa", fontSize: 22 }} />
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: 3,
                    bgcolor: "#fafafa",
                    fontSize: "0.95rem",
                    "& fieldset": { borderColor: "#e8e8e8" },
                    "&:hover fieldset": { borderColor: "#ccc !important" },
                    "&.Mui-focused fieldset": {
                      borderColor: "#5b9bd5 !important",
                    },
                  },
                },
              }}
            />

            <TextField
              fullWidth
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              sx={{ mb: 3 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: "#aaa", fontSize: 22 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((s) => !s)}
                        edge="end"
                        size="small"
                        sx={{ color: "#aaa" }}
                      >
                        {showPassword ? (
                          <VisibilityOff sx={{ fontSize: 20 }} />
                        ) : (
                          <Visibility sx={{ fontSize: 20 }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: 3,
                    bgcolor: "#fafafa",
                    fontSize: "0.95rem",
                    "& fieldset": { borderColor: "#e8e8e8" },
                    "&:hover fieldset": { borderColor: "#ccc !important" },
                    "&.Mui-focused fieldset": {
                      borderColor: "#5b9bd5 !important",
                    },
                  },
                },
              }}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                py: 1.6,
                borderRadius: 3,
                fontSize: "1rem",
                fontWeight: 700,
                textTransform: "none",
                bgcolor: "#5b9bd5",
                boxShadow: "0 4px 14px rgba(91,155,213,0.35)",
                "&:hover": { bgcolor: "#4a8bc4" },
                "&.Mui-disabled": {
                  bgcolor: "#a8d4e6",
                  color: "#fff",
                },
              }}
            >
              {loading
                ? "Please wait…"
                : mode === "login"
                ? "Log In"
                : "Create Account"}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* ── Toggle prompt ── */}
      <Box sx={{ textAlign: "center", mt: 3 }}>
        <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
          {mode === "login"
            ? "Don\u2019t have an account?"
            : "Already have an account?"}{" "}
          <Typography
            component="span"
            onClick={toggleMode}
            sx={{
              color: "#5b9bd5",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "0.85rem",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {mode === "login" ? "Sign Up" : "Log In"}
          </Typography>
        </Typography>
      </Box>
    </Box>
  );
}
