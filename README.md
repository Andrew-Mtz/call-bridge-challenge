# Calling System — Challenge

A small demo app integrating:

- **PSTN ↔ PSTN** (Telnyx)
- **WebRTC ↔ PSTN** (Telnyx)
- **WebRTC ↔ WebRTC** (Infobip)

UI is built with Vite + React. There are **two internal packages** (one for Telnyx, one for Infobip) and an API that receives webhooks to keep call state in sync.

---

## Requirements

- Node 18+
- pnpm (or npm/yarn — examples use `pnpm`)
- **Telnyx** account with Voice API
- **Infobip** account with WebRTC enabled
- **ngrok** (to expose webhooks from your local API)
- Browser with microphone permission (and camera if testing video)

---

## Install & Run

### 1. Clone

```bash
git clone https://github.com/Andrew-Mtz/call-bridge-challenge.git
cd call-bridge-challenge
```

### 2. Environment variables

#### Copy the examples and fill with your credentials

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

#### On Windows (PowerShell):

```powershell
Copy-Item apps/server/.env.example apps/server/.env
Copy-Item apps/web/.env.example apps/web/.env
```

### 3. Install deps (root + workspaces)

pnpm install

### 4. Build internal packages (produces dist/)

pnpm run build:pkg

### 5. Start dev (packages in watch + apps)

pnpm run dev

---

## Project Structure (high-level)

```
/
├── packages/
│   ├── telnyx/
│   └── infobip/
├── apps/
│   ├── Server/ # Node server (webhooks, tokens, state)
│   └── Web/    # Vite + React UI
├── tsconfig.base.json
├── package.json
├──.eslintrc.json
└── README.md
```

---

## What’s Implemented ✅

Telnyx

- PSTN → PSTN calls
- WebRTC → PSTN calls
- Token issuance for WebRTC clients
- Dial and bridge flows
- Webhook signature verification (Telnyx-Signature) and real-time call state updates
- UI: connect/disconnect, PhonePad, Call, Mute/Unmute, Hang up
- Correct state transitions (Idle → Calling → In call → Ended) and timer that starts only after call is established

Infobip

- WebRTC ↔ WebRTC calls
- Token issuance for WebRTC
- Provider-specific UI separated from Telnyx (no shared grid layout)
- Incoming call modal with camera preview for video calls
- Circular icon buttons for mute, camera, hang up (consistent theming)
- Display name configurable by user (ID auto-generated UUID if empty)
- Camera permission handling:
  - If camera not granted → Video Call hidden + placeholder card with “Grant camera” button
  - Audio-only calls still allowed

## What’s Not Implemented / Known Gaps ❌

- Infobip remote video rendering: remote stream is not displayed in remoteVideo (audio works; local preview works). “View” button is disabled due to this.
- Sinch integration: not implemented (account unavailable in author’s region).
- Some UI polish items blocked by missing remote video (layout refinements, view toggle behavior).# Calling System — Challenge
