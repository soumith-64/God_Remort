# Deploying OMNICONTROL to Vercel

This guide explains how to deploy the **OMNICONTROL** web control centre to [Vercel](https://vercel.com) for fast, global edge access and isolated collaborator preview environments.

---

## 1. Prerequisites
* A [Vercel](https://vercel.com) account.
* A GitHub repository containing the OMNICONTROL project.
* A running OMNICONTROL Agent on your Windows workstation.

---

## 2. One-Click / Dashboard Deployment Steps

1. Log into your [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..." > "Project"**.
2. Select your imported GitHub repository (`omnicontrol`).
3. Configure Project Settings:
   * **Framework Preset**: `Next.js`
   * **Root Directory**: `apps/web` (or leave as `./` since root `vercel.json` is configured).
   * **Build Command**: `npm run build` (or `npm run web:build` if root).
   * **Output Directory**: `.next` (or `apps/web/out`).
4. (Optional) Configure Environment Variables:
   * `NEXT_PUBLIC_DEFAULT_AGENT_URL`: Your default agent endpoint (e.g. `https://my-laptop.trycloudflare.com` or leave empty so users can configure it dynamically in the app).
5. Click **"Deploy"**.

---

## 3. Connecting the Vercel App to Your Laptop

Since Vercel serves the web application over HTTPS (`https://omnicontrol.vercel.app`), your browser will require an HTTPS/WSS tunnel to connect securely from outside your home network without mixed-content restrictions.

### Option A: Cloudflare Tunnel (Recommended & Free)
1. On your Windows laptop, download the Cloudflare Tunnel CLI (`cloudflared`):
   ```powershell
   winget install Cloudflare.cloudflared
   ```
2. Start an instant secure HTTPS tunnel to your OMNICONTROL Agent:
   ```powershell
   cloudflared tunnel --url http://127.0.0.1:8000
   ```
3. Copy the generated `https://...trycloudflare.com` address.
4. On your mobile phone, open your Vercel deployment URL, tap the **Server / Workstation** dropdown at the top, select **"Add System Profile"**, and paste your tunnel URL.
5. Enter your 6-digit PIN to pair instantly!

### Option B: Local Network (Same Wi-Fi)
If connecting on the same local Wi-Fi:
* Access the local agent directly via your laptop's local IP (e.g., `http://192.168.0.109:8000`).
* Or add your local IP in the OMNICONTROL system profile switcher.

---

## 4. Collaborator Preview Environments

With Vercel integration:
1. Every Pull Request submitted by a collaborator automatically generates a dedicated **Preview Deployment** (e.g. `https://omnicontrol-git-feature-new-trackpad.vercel.app`).
2. Collaborators and reviewers can interact with the new UI features independently in their own browser without touching production.
3. Each collaborator connects their preview deployment to their *own* isolated local agent or staging instance.
