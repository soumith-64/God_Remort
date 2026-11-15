# Contributing to OMNICONTROL

Thank you for your interest in contributing to **OMNICONTROL**. 

Before proceeding, please review our [LICENSE](LICENSE) and collaboration standards. OMNICONTROL is a proprietary, source-available platform with strict copyright and duplication controls.

---

## 1. Separate Environment Mandate

To protect user workstations, prevent state collisions, and maintain system security, **all collaboration must occur in completely separated, isolated environments**:

```
+-------------------------------------------------------------------------+
|                              GITHUB REPO                                |
|                        (Protected 'main' Branch)                        |
+--------------------+-------------------------------+--------------------+
                     |                               |
                     ▼                               ▼
       +----------------------------+  +----------------------------+
       |   CONTRIBUTOR A SANDBOX    |  |   CONTRIBUTOR B SANDBOX    |
       |                            |  |                            |
       | • Branch: feature/mouse    |  | • Branch: fix/telemetry    |
       | • Vercel: Preview Deploy A |  | • Vercel: Preview Deploy B |
       | • Local Agent: Port 8000   |  | • Local Agent: Port 8000   |
       | • DB: Local gitignored     |  | • DB: Local gitignored     |
       +----------------------------+  +----------------------------+
```

### Key Isolation Principles:
1. **Isolated Local Hardware**: Never connect your development client to another developer's laptop or workstation agent. All local testing must be performed against your own agent on `http://127.0.0.1:8000` or a dedicated test VM.
2. **Local Database Isolation**: The SQLite database (`data/omnicontrol.db`) is strictly `.gitignored`. Your pairing PINs, device tokens, and session history remain local to your machine and will never be committed or shared.
3. **Vercel Preview Deployments**: When you push your feature branch and open a Pull Request, Vercel automatically deploys an ephemeral, isolated Preview Environment (`https://omnicontrol-git-<branch>-<username>.vercel.app`). Reviewers can test your frontend UI independently without touching the production deployment.

---

## 2. Development Setup

### Prerequisites
* Windows 11 (64-bit) for the laptop agent.
* Python 3.12+ (in `agent/.venv`).
* Node.js v20+ and npm.

### Quick Setup Steps
1. Clone your fork or branch:
   ```bash
   git clone https://github.com/YOUR_USERNAME/omnicontrol.git
   cd omnicontrol
   ```
2. Set up the Python Agent virtual environment:
   ```powershell
   cd agent
   python -m venv .venv
   .\.venv\Scripts\pip install -r requirements.txt
   cd ..
   ```
3. Install frontend dependencies:
   ```bash
   npm --prefix apps/web install
   ```
4. Copy the environment configuration:
   ```powershell
   Copy-Item .env.example .env.local
   ```

---

## 3. Branching & PR Guidelines

* **Main Branch is Protected**: Direct commits to `main` are restricted.
* **Naming Conventions**:
  * Features: `feature/<feature-name>` (e.g., `feature/custom-dpad`)
  * Bug Fixes: `fix/<issue-name>` (e.g., `fix/touchpad-inertia`)
  * Documentation: `docs/<topic>` (e.g., `docs/wol-setup`)
* **Verification Checklist Before Submitting a PR**:
  1. Automated Agent Tests:
     ```powershell
     .\agent\.venv\Scripts\pytest agent\tests
     ```
  2. Acceptance Verification (20/20 must pass):
     ```powershell
     .\agent\.venv\Scripts\python.exe scripts\verify-acceptance.py
     ```
  3. Clean Next.js Build:
     ```powershell
     npm --prefix apps/web run build
     ```

---

## 4. Proprietary Terms & Anti-Duplication

* All code submitted via Pull Requests becomes part of the OMNICONTROL codebase under the terms of the [OMNICONTROL Proprietary License](LICENSE).
* Unauthorized copying, mirroring, distribution, or commercial exploitation of any part of this repository is strictly prohibited.
