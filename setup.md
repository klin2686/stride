# Stride – Development Setup

## Prerequisites

- **Node.js** (v18+) and **pnpm** (or npm)
- **Python 3.11+** and **uv** (Python package manager)
- Two devices on the **same network** (e.g. phone hotspot)

---

## 1. Backend Setup

```bash
cd Backend
uv sync
uv run uvicorn main:app --reload
```

The backend runs at `http://localhost:8000`.

---

## 2. Frontend Setup

```bash
cd client
pnpm install
```

### Local development (computer only)

```bash
pnpm run dev
```

Opens at `http://localhost:3000`.

### Mobile testing (phone + computer)

GPS/geolocation requires HTTPS and a direct network connection (not through ngrok).

**Step 1:** Connect both your phone and computer to the **same network**.  
> **Tip:** University/campus Wi-Fi often blocks device-to-device traffic. Use your **phone's mobile hotspot** instead — connect your laptop to it.

**Step 2:** Start the HTTPS dev server:

```bash
pnpm run dev:https
```

The first time, it will generate a self-signed certificate and may ask for your sudo password.

**Step 3:** Find your computer's local IP:

```bash
# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# Example output: inet 172.20.10.5 ...
```

**Step 4:** On your phone's browser, open:

```
https://<your-computer-ip>:3000
```

Example: `https://172.20.10.5:3000`

**Step 5:** Accept the certificate warning:
- **Safari:** Show Details → visit this website → Visit Website
- **Chrome:** Advanced → Proceed to site (unsafe)

---

## 3. Backend on a Separate Device (via ngrok)

If the backend runs on a different machine, use ngrok to expose it:

```bash
# On the machine running the backend
ngrok http 8000
```

Copy the ngrok URL (e.g. `https://abc123.ngrok-free.app`) and add it to `client/.env`:

```env
NEXT_PUBLIC_API_URL=https://abc123.ngrok-free.app
```

Then restart the frontend dev server.

> **Note:** When testing locally on your computer (backend on same machine), remove or comment out `NEXT_PUBLIC_API_URL` so it defaults to `http://localhost:8000`.

---

## Environment Variables

| File | Variable | Description |
|------|----------|-------------|
| `client/.env` | `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox access token for maps |
| `client/.env` | `NEXT_PUBLIC_API_URL` | Backend URL (only needed if backend is remote) |
