# WhatsApp Cloud API Adapter Setup Guide

This guide details how to connect the **Munim** assistant to the official **Meta WhatsApp Cloud API** using zero-cost developer tools.

---

## 1. Architectural Overview

```
 [Shopkeeper WhatsApp]
         │ (Voice Note .ogg / Text / Quick Buttons)
         ▼
 [Meta WhatsApp Cloud API]
         │ HTTPS Webhook POST with X-Hub-Signature-256
         ▼
 [Cloudflare Tunnel / HTTPS Domain]
         ▼
 [FastAPI: app/adapters/whatsapp.py]
         │
         ├── 1. Signature Verify (HMAC-SHA256 with WHATSAPP_APP_SECRET)
         ├── 2. Two-Step Media Download (Graph API -> Binary OGG Stream)
         ├── 3. InboundMessage(channel="whatsapp") -> app/core/agent.py
         │
         ▼
 [Outbound Response Dispatch]
         │ POST https://graph.facebook.com/v20.0/{PHONE_ID}/messages
         ▼
 [Interactive Button Message with Pillow Bill Image Header + Confirm/Edit Buttons]
```

---

## 2. Prerequisites
1. A **Meta for Developers** account ([developers.facebook.com](https://developers.facebook.com/)).
2. A Meta Business App with the **WhatsApp** product added.
3. [Cloudflare Tunnel (`cloudflared`)](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/) for zero-cost secure HTTPS webhook forwarding without port forwarding or static IPs.

---

## 3. Step-by-Step Meta Developer Setup

### Step 1: Create a Meta App
1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) and click **Create App**.
2. Select **Other** $\to$ **Business** as the app type.
3. Enter an app name (e.g. `Paytm Vriddhi Munim`) and link your Business Account.

### Step 2: Configure WhatsApp Product
1. On the app dashboard, find **WhatsApp** and click **Set up**.
2. Under **API Setup**:
   - Note your **Phone number ID**.
   - Note your **WhatsApp Business Account ID**.
   - Copy the **Temporary Access Token** (or create a permanent System User Token in Meta Business Settings).

### Step 3: Get App Secret
1. In the left sidebar, navigate to **App settings** $\to$ **Basic**.
2. Click **Show** next to **App secret** and copy the value.

---

## 4. Exposing Local Webhook via Cloudflare Tunnel

To receive real-time webhooks from Meta on your local development machine for free:

```bash
# 1. Download and run Cloudflare Tunnel pointing to your FastAPI port (8000)
cloudflared tunnel --url http://localhost:8000
```

Cloudflare will output a public HTTPS URL like:
```
https://rapid-kirana-demo.trycloudflare.com
```

Your webhook endpoints will be live at:
- **Webhook Callback URL:** `https://rapid-kirana-demo.trycloudflare.com/webhook/whatsapp`
- **Health Check:** `https://rapid-kirana-demo.trycloudflare.com/health`

---

## 5. Configure Webhooks in Meta Portal

1. On the Meta Developer Portal, go to **WhatsApp** $\to$ **Configuration**.
2. Click **Edit** next to **Webhook**:
   - **Callback URL:** `https://your-cloudflare-subdomain.trycloudflare.com/webhook/whatsapp`
   - **Verify Token:** `paytm_vriddhi_webhook_secret` (or matching `WHATSAPP_VERIFY_TOKEN` in `.env`)
3. Click **Verify and Save**. Meta will send a `GET` request with `hub.challenge`. The adapter responds with status 200 and the challenge string.
4. Under **Webhook fields**, click **Manage** and subscribe to:
   - `messages` (required for inbound texts, voice notes, and button clicks)

---

## 6. Environment Variables (`backend/.env`)

Add the following credentials to `backend/.env`:

```env
# Meta WhatsApp Cloud API Credentials
WHATSAPP_PHONE_NUMBER_ID=100654321987654
WHATSAPP_ACCESS_TOKEN=EAAB...your_system_user_token...
WHATSAPP_VERIFY_TOKEN=paytm_vriddhi_webhook_secret
WHATSAPP_APP_SECRET=a1b2c3d4e5f6...your_app_secret...

# Core & Gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
PORT=8000
HOST=0.0.0.0
```

---

## 7. Interactive Message Format & 24-Hour Window

### Two-Step Media Download
When a shopkeeper sends a WhatsApp voice note, Meta delivers a webhook with `type: "audio"` containing a `media_id`. The adapter executes:
1. `GET https://graph.facebook.com/v20.0/{media_id}` with `Authorization: Bearer <TOKEN>` $\to$ returns download URL.
2. `GET <media_url>` with `Authorization: Bearer <TOKEN>` $\to$ streams binary OGG/Opus audio.
3. Audio is transcribed, processed, and **immediately purged** from memory.

### Interactive Button Reply
Munim responds with an interactive message containing:
- **Header:** Image header containing the rendered certified bill PNG.
- **Body:** Roman Hinglish quote description and total.
- **Action Buttons:**
  - `[✓ Confirm Order]` (callback payload: `confirm:<draft_id>:<version>`)
  - `[+ Add Item]` (prompts shopkeeper for additions)
  - `[✗ Cancel]` (cancels draft)

### 24-Hour Customer Care Window
Meta enforces a 24-hour service window from the user's last inbound message. All interactive Munim replies occur within seconds of inbound voice notes or messages, remaining 100% compliant with WhatsApp Cloud API zero-cost service conversation rules.

