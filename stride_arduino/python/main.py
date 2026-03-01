from arduino.app_utils import *
import time
import math
import struct
import threading
import asyncio
import collections
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import json

# ---------------------------------------------------------------------------
# Wire format: must match the packed struct on the MCU
# ---------------------------------------------------------------------------
SAMPLE_FORMAT = "<I6f"
SAMPLE_BYTES = struct.calcsize(SAMPLE_FORMAT)  # 28

# ---------------------------------------------------------------------------
# Fixed (non-heuristic) constants
# ---------------------------------------------------------------------------
POLL_INTERVAL_S = 0.05
IDLE_POLL_INTERVAL_S = 0.5
CALIBRATION_DURATION_S = 3.0
SLIDING_WINDOW_SIZE = 2000
TELEMETRY_INTERVAL_S = 0.5

# ---------------------------------------------------------------------------
# Mutable runtime configuration (heuristic thresholds + tuning toggle)
# ---------------------------------------------------------------------------
cfg = {
    "impact_threshold_g": 3.8,
    "impact_debounce_ms": 300,
    "impact_shock_window_ms": 50,
    "toe_off_gyro_threshold_dps": 470.0,
    "toe_off_accel_threshold_g": 1.5,
    "min_stance_duration_ms": 100,
    "cadence_low_spm": 160,
    "cadence_high_spm": 190,
    "heel_strike_deg": 5.0,
    "forefoot_strike_deg": -5.0,
    "tuning_mode": False,
}

# ---------------------------------------------------------------------------
# Application state
# ---------------------------------------------------------------------------
class State:
    IDLE = "idle"
    CALIBRATING = "calibrating"
    RUNNING = "running"

class GaitPhase:
    SWING = "swing"
    STANCE = "stance"

state = State.IDLE
flush_pending = False

calibration_start_ts = None
calibration_samples: list[dict] = []

gyro_bias_x = 0.0
gyro_bias_y = 0.0
gyro_bias_z = 0.0
baseline_pitch_rad = 0.0
calibrated = False

gait_phase = GaitPhase.SWING
last_impact_ts = 0
current_impact_ts = 0
tracking_shock = False
shock_peak_g = 0.0
shock_end_ts = 0

data_window: collections.deque = collections.deque(maxlen=SLIDING_WINDOW_SIZE)

# ---------------------------------------------------------------------------
# Telemetry heartbeat accumulators
# ---------------------------------------------------------------------------
telemetry_max_amag = 0.0
telemetry_max_gyro = 0.0
telemetry_last_broadcast = 0.0  # Python monotonic time

# ---------------------------------------------------------------------------
# Metric buffers for app telemetry (rolling window of recent events)
# ---------------------------------------------------------------------------
METRIC_BUFFER_SIZE = 10
APP_TELEMETRY_INTERVAL_S = 1.0
AUDIO_CUE_COOLDOWN_S = 30

recent_cadence: collections.deque = collections.deque(maxlen=METRIC_BUFFER_SIZE)
recent_gct: collections.deque = collections.deque(maxlen=METRIC_BUFFER_SIZE)
recent_shock: collections.deque = collections.deque(maxlen=METRIC_BUFFER_SIZE)
recent_strikes: collections.deque = collections.deque(maxlen=METRIC_BUFFER_SIZE)

last_cue_time: dict[str, float] = {
    "cadence": 0.0,
    "strike": 0.0,
    "gct": 0.0,
}

# ---------------------------------------------------------------------------
# WebSocket bookkeeping
# ---------------------------------------------------------------------------
ws_clients: set[WebSocket] = set()
app_ws_clients: set[WebSocket] = set()
_loop: asyncio.AbstractEventLoop | None = None

async def _broadcast(message: str):
    stale = set()
    for ws in ws_clients:
        try:
            await ws.send_text(message)
        except Exception:
            stale.add(ws)
    ws_clients.difference_update(stale)

def broadcast(message: str):
    """Thread-safe: schedules send on the uvicorn event loop."""
    print(message)
    if _loop is not None and _loop.is_running():
        asyncio.run_coroutine_threadsafe(_broadcast(message), _loop)

async def _broadcast_app(data: dict):
    stale = set()
    for ws in app_ws_clients:
        try:
            await ws.send_text(json.dumps(data))
        except Exception:
            stale.add(ws)
    app_ws_clients.difference_update(stale)

def broadcast_app(data: dict):
    """Thread-safe: sends JSON to all /ws/app clients."""
    if _loop is not None and _loop.is_running():
        asyncio.run_coroutine_threadsafe(_broadcast_app(data), _loop)

# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------
app = FastAPI(title="Stride")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def _capture_loop():
    global _loop
    _loop = asyncio.get_running_loop()
    asyncio.create_task(_app_telemetry_loop())

async def _app_telemetry_loop():
    while True:
        await asyncio.sleep(APP_TELEMETRY_INTERVAL_S)
        if state != State.RUNNING:
            continue
        avg_cadence = round(sum(recent_cadence) / len(recent_cadence)) if recent_cadence else 0
        avg_gct = round(sum(recent_gct) / len(recent_gct)) if recent_gct else 0
        avg_shock = round(sum(recent_shock) / len(recent_shock), 2) if recent_shock else 0.0
        strike_mode = max(set(recent_strikes), key=lambda s: list(recent_strikes).count(s)) if recent_strikes else "Unknown"
        await _broadcast_app({
            "type": "telemetry",
            "data": {
                "cadence": avg_cadence,
                "gct": avg_gct,
                "shock": avg_shock,
                "strike": strike_mode,
            },
        })

# ---- control endpoints ---------------------------------------------------

@app.get("/health")
async def health_check():
    return {"status": "online"}

@app.post("/calibrate")
async def calibrate_endpoint():
    global state, flush_pending, calibration_start_ts, calibration_samples
    if state == State.CALIBRATING:
        return {"status": "already calibrating"}
    state = State.CALIBRATING
    flush_pending = True
    calibration_start_ts = None
    calibration_samples = []
    broadcast("STATE: Calibrating — stand still for 3 seconds")
    return {"status": "calibrating"}

@app.post("/start")
async def start_endpoint():
    global state, flush_pending, gait_phase, last_impact_ts
    if state == State.CALIBRATING:
        return {"error": "calibration in progress"}
    if not calibrated:
        broadcast("WARNING: Starting without calibration — biases are zero")
    state = State.RUNNING
    flush_pending = True
    gait_phase = GaitPhase.SWING
    last_impact_ts = 0
    broadcast("STATE: Running analysis started")
    return {"status": "running"}

@app.post("/pause")
async def pause_endpoint():
    global state
    state = State.IDLE
    broadcast("STATE: Paused")
    return {"status": "idle"}

@app.post("/stop")
async def stop_endpoint():
    global state
    state = State.IDLE
    recent_cadence.clear()
    recent_gct.clear()
    recent_shock.clear()
    recent_strikes.clear()
    broadcast("STATE: Stopped")
    return {"status": "idle"}

# ---- live tuning endpoints -----------------------------------------------

@app.get("/config")
async def get_config():
    return dict(cfg)

@app.post("/config")
async def set_config(body: dict):
    updated = []
    for key, value in body.items():
        if key not in cfg:
            continue
        expected_type = type(cfg[key])
        try:
            cfg[key] = expected_type(value)
            updated.append(key)
        except (ValueError, TypeError):
            pass
    if updated:
        broadcast(f"CONFIG: Updated {', '.join(updated)}")
    return dict(cfg)

# ---- WebSocket & feed page -----------------------------------------------

@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    ws_clients.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_clients.discard(websocket)

@app.websocket("/ws/app")
async def ws_app_endpoint(websocket: WebSocket):
    await websocket.accept()
    app_ws_clients.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        app_ws_clients.discard(websocket)

@app.get("/feed")
async def feed():
    return HTMLResponse(FEED_HTML)

# ---------------------------------------------------------------------------
# Data decoding
# ---------------------------------------------------------------------------
def decode_hex_buffer(hex_str: str) -> list[dict]:
    if not hex_str:
        return []
    try:
        raw = bytes.fromhex(hex_str)
    except ValueError:
        broadcast("ERROR: malformed hex from MCU")
        return []

    count = len(raw) // SAMPLE_BYTES
    samples = []
    for i in range(count):
        ts, ax, ay, az, gx, gy, gz = struct.unpack_from(
            SAMPLE_FORMAT, raw, i * SAMPLE_BYTES
        )
        samples.append(
            {"ts": ts, "ax": ax, "ay": ay, "az": az, "gx": gx, "gy": gy, "gz": gz}
        )
    return samples

# ---------------------------------------------------------------------------
# Calibration
# ---------------------------------------------------------------------------
def finish_calibration():
    global gyro_bias_x, gyro_bias_y, gyro_bias_z
    global baseline_pitch_rad, calibrated, state

    n = len(calibration_samples)
    if n == 0:
        broadcast("CALIBRATION: Failed — no data collected")
        state = State.IDLE
        return

    sum_ax = sum_ay = sum_az = 0.0
    sum_gx = sum_gy = sum_gz = 0.0
    for s in calibration_samples:
        sum_ax += s["ax"]; sum_ay += s["ay"]; sum_az += s["az"]
        sum_gx += s["gx"]; sum_gy += s["gy"]; sum_gz += s["gz"]

    gyro_bias_x = sum_gx / n
    gyro_bias_y = sum_gy / n
    gyro_bias_z = sum_gz / n

    avg_ax = sum_ax / n
    avg_ay = sum_ay / n
    avg_az = sum_az / n

    baseline_pitch_rad = math.atan2(avg_ay, math.sqrt(avg_ax ** 2 + avg_az ** 2))
    calibrated = True
    state = State.IDLE

    broadcast(
        f"CALIBRATION: Complete — {n} samples | "
        f"gyro bias ({gyro_bias_x:.3f}, {gyro_bias_y:.3f}, {gyro_bias_z:.3f}) dps | "
        f"baseline pitch {math.degrees(baseline_pitch_rad):.1f}°"
    )

# ---------------------------------------------------------------------------
# Gait analysis
# ---------------------------------------------------------------------------
def process_running(samples: list[dict]):
    global gait_phase, last_impact_ts, current_impact_ts
    global tracking_shock, shock_peak_g, shock_end_ts
    global telemetry_max_amag, telemetry_max_gyro, telemetry_last_broadcast

    for s in samples:
        s["gx"] -= gyro_bias_x
        s["gy"] -= gyro_bias_y
        s["gz"] -= gyro_bias_z
        data_window.append(s)

        ax, ay, az = s["ax"], s["ay"], s["az"]
        ts = s["ts"]
        a_mag = math.sqrt(ax * ax + ay * ay + az * az)
        gyro_pitch = abs(s["gy"])

        # ---- Telemetry accumulation (always, cheap) ----
        if a_mag > telemetry_max_amag:
            telemetry_max_amag = a_mag
        if gyro_pitch > telemetry_max_gyro:
            telemetry_max_gyro = gyro_pitch

        # ---- Continuous: shock tracking window ----
        if tracking_shock:
            if a_mag > shock_peak_g:
                shock_peak_g = a_mag
            if ts >= shock_end_ts:
                tracking_shock = False
                recent_shock.append(shock_peak_g)
                broadcast(f"  Impact Shock: {shock_peak_g:.2f}g peak")

        # ---- Gait state machine ----
        if gait_phase == GaitPhase.SWING:
            debounce_ok = (ts - last_impact_ts) > cfg["impact_debounce_ms"]
            if a_mag > cfg["impact_threshold_g"] and debounce_ok:
                _on_impact(s, ts, a_mag)

        elif gait_phase == GaitPhase.STANCE:
            time_in_stance = ts - current_impact_ts
            if time_in_stance > cfg["min_stance_duration_ms"]:
                if gyro_pitch > cfg["toe_off_gyro_threshold_dps"] and a_mag > cfg["toe_off_accel_threshold_g"]:
                    _on_toe_off(ts)

    # ---- Telemetry heartbeat (500 ms wall-clock) ----
    now = time.monotonic()
    if cfg["tuning_mode"] and (now - telemetry_last_broadcast) >= TELEMETRY_INTERVAL_S:
        broadcast(
            f"TELEMETRY | Max A_mag: {telemetry_max_amag:.2f}g | "
            f"Max Gyro: {telemetry_max_gyro:.1f} dps"
        )
        telemetry_max_amag = 0.0
        telemetry_max_gyro = 0.0
        telemetry_last_broadcast = now


def _on_impact(s: dict, ts: int, a_mag: float):
    global gait_phase, last_impact_ts, current_impact_ts
    global tracking_shock, shock_peak_g, shock_end_ts

    prev_phase = gait_phase
    gait_phase = GaitPhase.STANCE
    current_impact_ts = ts

    if cfg["tuning_mode"] and prev_phase != GaitPhase.STANCE:
        broadcast(f"PHASE: {prev_phase} -> {GaitPhase.STANCE} @ ts={ts}")

    tracking_shock = True
    shock_peak_g = a_mag
    shock_end_ts = ts + cfg["impact_shock_window_ms"]

    if last_impact_ts > 0:
        stride_time_s = (ts - last_impact_ts) / 1000.0
        cadence_spm = 120.0 / stride_time_s if stride_time_s > 0 else 0.0
    else:
        cadence_spm = 0.0

    ax, ay, az = s["ax"], s["ay"], s["az"]
    pitch_rad = math.atan2(ay, math.sqrt(ax * ax + az * az))
    relative_pitch_deg = math.degrees(pitch_rad - baseline_pitch_rad)

    if relative_pitch_deg > cfg["heel_strike_deg"]:
        strike = "Heel Strike"
    elif relative_pitch_deg < cfg["forefoot_strike_deg"]:
        strike = "Forefoot Strike"
    else:
        strike = "Midfoot Strike"

    last_impact_ts = ts

    recent_strikes.append(strike)
    if cadence_spm > 0:
        recent_cadence.append(cadence_spm)
        broadcast(
            f"IMPACT: {cadence_spm:.0f} SPM | {strike} (pitch {relative_pitch_deg:+.1f}°)"
        )
        _audio_cues()
    else:
        broadcast(f"IMPACT: First strike | {strike}")


def _on_toe_off(ts: int):
    global gait_phase

    prev_phase = gait_phase
    gait_phase = GaitPhase.SWING
    gct_ms = ts - current_impact_ts

    if cfg["tuning_mode"] and prev_phase != GaitPhase.SWING:
        broadcast(f"PHASE: {prev_phase} -> {GaitPhase.SWING} @ ts={ts}")

    recent_gct.append(gct_ms)
    broadcast(f"TOE-OFF: GCT = {gct_ms} ms ({gct_ms / 1000:.3f} s)")
    _audio_cue_gct()


def _audio_cues():
    """Trigger cues based on moving averages so a single outlier is ignored."""
    if len(recent_cadence) < 5:
        return
    now = time.monotonic()
    avg_cadence = sum(recent_cadence) / len(recent_cadence)
    strike_mode = max(set(recent_strikes), key=lambda s: list(recent_strikes).count(s)) if recent_strikes else "Unknown"

    if avg_cadence < cfg["cadence_low_spm"]:
        broadcast(f"AUDIO CUE: Cadence low (avg {avg_cadence:.0f} SPM)")
        if now - last_cue_time["cadence"] >= AUDIO_CUE_COOLDOWN_S:
            last_cue_time["cadence"] = now
            broadcast_app({"type": "audio_cue", "message": "Cadence low, increase turnover."})
    elif avg_cadence > cfg["cadence_high_spm"]:
        broadcast(f"AUDIO CUE: Cadence high (avg {avg_cadence:.0f} SPM)")
        if now - last_cue_time["cadence"] >= AUDIO_CUE_COOLDOWN_S:
            last_cue_time["cadence"] = now
            broadcast_app({"type": "audio_cue", "message": "Cadence high, consider slowing turnover."})

    if strike_mode == "Heel Strike":
        broadcast("AUDIO CUE: Heel striking trend detected, aim for midfoot")
        if now - last_cue_time["strike"] >= AUDIO_CUE_COOLDOWN_S:
            last_cue_time["strike"] = now
            broadcast_app({"type": "audio_cue", "message": "Heel striking detected, aim for midfoot."})
    elif strike_mode == "Forefoot Strike":
        broadcast("AUDIO CUE: Forefoot striking trend detected, aim for midfoot")
        if now - last_cue_time["strike"] >= AUDIO_CUE_COOLDOWN_S:
            last_cue_time["strike"] = now
            broadcast_app({"type": "audio_cue", "message": "Forefoot striking detected, aim for midfoot."})


def _audio_cue_gct():
    """Trigger GCT cue based on moving average."""
    if len(recent_gct) < 5:
        return
    avg_gct = sum(recent_gct) / len(recent_gct)
    if avg_gct > 300:
        now = time.monotonic()
        broadcast(f"AUDIO CUE: GCT high (avg {avg_gct:.0f} ms)")
        if now - last_cue_time["gct"] >= AUDIO_CUE_COOLDOWN_S:
            last_cue_time["gct"] = now
            broadcast_app({"type": "audio_cue", "message": "Ground contact time high, work on quick turnover."})

# ---------------------------------------------------------------------------
# Main polling loop (called repeatedly by App.run)
# ---------------------------------------------------------------------------
def loop():
    global state, flush_pending, calibration_start_ts

    if state == State.IDLE:
        time.sleep(IDLE_POLL_INTERVAL_S)
        return

    hex_data = Bridge.call("get_buffer")

    if flush_pending:
        flush_pending = False
        time.sleep(POLL_INTERVAL_S)
        return

    samples = decode_hex_buffer(hex_data)

    if state == State.CALIBRATING:
        if samples:
            if calibration_start_ts is None:
                calibration_start_ts = samples[0]["ts"]
            for s in samples:
                elapsed = (s["ts"] - calibration_start_ts) / 1000.0
                if elapsed <= CALIBRATION_DURATION_S:
                    calibration_samples.append(s)
                else:
                    finish_calibration()
                    time.sleep(POLL_INTERVAL_S)
                    return

    elif state == State.RUNNING:
        if samples:
            process_running(samples)

    time.sleep(POLL_INTERVAL_S)

# ---------------------------------------------------------------------------
# Feed page (HTML + vanilla JS WebSocket client + tuning panel)
# ---------------------------------------------------------------------------
FEED_HTML = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Stride — Live Feed</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: monospace; background: #fff; color: #111; padding: 24px; }
  h1 { font-size: 1.4rem; margin-bottom: 12px; }
  .controls { margin-bottom: 16px; }
  .controls button, .panel button {
    font-family: monospace; font-size: 0.9rem;
    padding: 6px 16px; margin-right: 8px; cursor: pointer;
    border: 1px solid #333; background: #f5f5f5; border-radius: 4px;
  }
  .controls button:hover, .panel button:hover { background: #e0e0e0; }
  details { margin-bottom: 16px; }
  summary {
    cursor: pointer; font-weight: bold; font-size: 1rem;
    padding: 4px 0; user-select: none;
  }
  .panel { padding: 12px 0; }
  .cfg-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 6px 24px; margin-bottom: 12px;
  }
  .cfg-grid label { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .cfg-grid input[type="number"] {
    width: 90px; font-family: monospace; font-size: 0.9rem;
    padding: 3px 6px; border: 1px solid #999; border-radius: 3px; text-align: right;
  }
  .tuning-toggle { margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
  #log {
    white-space: pre-wrap; line-height: 1.5;
    border-top: 1px solid #ccc; padding-top: 12px; max-height: 60vh;
    overflow-y: auto;
  }
</style>
</head>
<body>
<h1>Stride &mdash; Running Form Analyzer</h1>

<div class="controls">
  <button onclick="post('/calibrate')">Calibrate</button>
  <button onclick="post('/start')">Start</button>
  <button onclick="post('/stop')">Stop</button>
</div>

<details>
  <summary>Tuning Panel</summary>
  <div class="panel">
    <div class="tuning-toggle">
      <label><input type="checkbox" id="tuning_mode"> Tuning Mode (telemetry heartbeat + phase logs)</label>
    </div>
    <div class="cfg-grid">
      <label>Impact Threshold (g)       <input type="number" step="0.1"  id="impact_threshold_g"></label>
      <label>Impact Debounce (ms)       <input type="number" step="10"   id="impact_debounce_ms"></label>
      <label>Impact Shock Window (ms)   <input type="number" step="5"    id="impact_shock_window_ms"></label>
      <label>Toe-Off Gyro (dps)         <input type="number" step="10"   id="toe_off_gyro_threshold_dps"></label>
      <label>Toe-Off Accel (g)          <input type="number" step="0.1"  id="toe_off_accel_threshold_g"></label>
      <label>Min Stance (ms)            <input type="number" step="10"   id="min_stance_duration_ms"></label>
      <label>Cadence Low (SPM)          <input type="number" step="5"    id="cadence_low_spm"></label>
      <label>Cadence High (SPM)         <input type="number" step="5"    id="cadence_high_spm"></label>
      <label>Heel Strike (&deg;)        <input type="number" step="0.5"  id="heel_strike_deg"></label>
      <label>Forefoot Strike (&deg;)    <input type="number" step="0.5"  id="forefoot_strike_deg"></label>
    </div>
    <button onclick="pushConfig()">Update Config</button>
    <button onclick="loadConfig()">Reload Config</button>
  </div>
</details>

<div id="log">Connecting&hellip;</div>

<script>
const log = document.getElementById("log");
const ws = new WebSocket("ws://" + location.host + "/ws");

ws.onopen  = () => { log.textContent = "Connected. Waiting for events...\\n"; };
ws.onclose = () => { log.textContent += "\\nDisconnected."; };
ws.onmessage = (e) => {
  const line = document.createElement("div");
  line.textContent = e.data;
  log.appendChild(line);
  if (log.children.length > 500) log.removeChild(log.firstChild);
  log.scrollTop = log.scrollHeight;
};

function post(path) {
  fetch(path, { method: "POST" }).then(r => r.json()).then(d => console.log(d)).catch(console.error);
}

const CFG_KEYS = [
  "impact_threshold_g", "impact_debounce_ms", "impact_shock_window_ms",
  "toe_off_gyro_threshold_dps", "toe_off_accel_threshold_g", "min_stance_duration_ms",
  "cadence_low_spm", "cadence_high_spm", "heel_strike_deg", "forefoot_strike_deg"
];

function loadConfig() {
  fetch("/config").then(r => r.json()).then(c => {
    for (const k of CFG_KEYS) {
      const el = document.getElementById(k);
      if (el) el.value = c[k];
    }
    document.getElementById("tuning_mode").checked = !!c.tuning_mode;
  });
}

function pushConfig() {
  const body = { tuning_mode: document.getElementById("tuning_mode").checked };
  for (const k of CFG_KEYS) {
    const el = document.getElementById(k);
    if (el) body[k] = parseFloat(el.value);
  }
  fetch("/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(r => r.json()).then(d => console.log("config updated", d)).catch(console.error);
}

loadConfig();
</script>
</body>
</html>
"""

# ---------------------------------------------------------------------------
# Bootstrap: start FastAPI in a daemon thread, then hand control to App.run
# ---------------------------------------------------------------------------
def _start_server():
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

threading.Thread(target=_start_server, daemon=True).start()

App.run(user_loop=loop)
