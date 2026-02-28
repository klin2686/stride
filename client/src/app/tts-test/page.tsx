"use client";

/**
 * TTS TEST PAGE — for development only.
 * Navigate to http://localhost:3000/tts-test
 */

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { initAudio, speak } from "@/lib/tts";

const PRESET_CUES = [
  "Great pace! Keep it up.",
  "Your cadence is a little low. Try to increase your steps per minute.",
  "Watch your foot strike. Land closer to your midfoot.",
  "Excellent form! You're running efficiently.",
  "Half a mile down. You're doing great.",
  "Slow down slightly to stay in your target heart rate zone.",
];

export default function TtsTestPage() {
  const [customText, setCustomText] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSpeak(text: string) {
    setError(null);
    setLoading(text);
    try {
      await initAudio();
      await speak(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} mb={0.5}>
        TTS Test
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Development only — tests ElevenLabs text-to-speech.
      </Typography>

      {/* Preset cues */}
      <Typography variant="subtitle2" fontWeight={600} mb={1}>
        Preset cues
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 3 }}>
        {PRESET_CUES.map((cue) => (
          <Button
            key={cue}
            variant="outlined"
            disabled={loading !== null}
            onClick={() => handleSpeak(cue)}
            sx={{ justifyContent: "flex-start", textTransform: "none", borderRadius: 2 }}
            endIcon={loading === cue ? <CircularProgress size={16} /> : null}
          >
            {cue}
          </Button>
        ))}
      </Box>

      {/* Custom input */}
      <Typography variant="subtitle2" fontWeight={600} mb={1}>
        Custom
      </Typography>
      <TextField
        fullWidth
        multiline
        minRows={2}
        placeholder="Type anything to speak..."
        value={customText}
        onChange={(e) => setCustomText(e.target.value)}
        sx={{ mb: 1.5 }}
      />
      <Button
        variant="contained"
        fullWidth
        disabled={!customText.trim() || loading !== null}
        onClick={() => handleSpeak(customText.trim())}
        sx={{ py: 1.5, borderRadius: 2 }}
        endIcon={loading === customText.trim() ? <CircularProgress size={16} color="inherit" /> : null}
      >
        Speak
      </Button>

      {error && (
        <Typography color="error" variant="body2" mt={2} sx={{ wordBreak: "break-all" }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
