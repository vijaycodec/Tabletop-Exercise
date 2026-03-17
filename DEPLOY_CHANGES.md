# How to Deploy Changes to Production VPS

This guide covers how to push your local code changes (Redis adapter, PM2 config, socket fix, MongoDB pool) to the live server.

**You are on Windows.** Use **Git Bash** or **Windows Terminal** for all commands on your PC. All server-side commands run on Linux (your VPS) via SSH.

---

## Before You Start — Info You Need

Ask whoever deployed the server for:

| Info | Example |
|---|---|
| VPS IP address | `123.456.78.90` |
| SSH username | `root` or `ttxadmin` |
| Project folder path on server | `/var/www/ttx-platform` |
| How backend is running | `pm2`, `node`, or `systemd service` |

---

## Step 1 — Push Your Changes to GitHub (from your Windows PC)

Open **Git Bash** or **Windows Terminal** in your project folder and run:

```bash
cd /d/codec/MERN/ttx-platform

git add backend/server.js backend/config/db.js backend/ecosystem.config.js frontend/src/services/socket.js

git commit -m "add redis adapter, pm2 config, socket production fix, mongodb pool increase"

git push origin main
```

> You can also do this directly from **VS Code** → Source Control panel (the branch icon on the left sidebar) — stage the files, write the commit message, and click Commit then Sync.

---

## Step 2 — SSH Into the VPS from Windows

Windows 10/11 has SSH built in. Open **Windows Terminal** or **Git Bash** and run:

```bash
ssh root@YOUR_VPS_IP
```

Or if using a non-root user:

```bash
ssh ttxadmin@YOUR_VPS_IP
```

Enter the password when prompted.

> **First time connecting?** Windows will ask:
> `Are you sure you want to continue connecting (yes/no)?`
> Type `yes` and press Enter.

> **Using PuTTY instead?** Enter the IP in the Host Name field, port 22, and click Open.

---

## Step 3 — Install Redis on the Server (one time only)

```bash
sudo apt install -y redis-server
sudo systemctl enable redis
sudo systemctl start redis
redis-cli ping
```

Expected output: `PONG`

---

## Step 4 — Go to the Project Folder on Server

```bash
cd /var/www/ttx-platform
# Replace with your actual project path if different
```

---

## Step 5 — Pull the Latest Code from GitHub

```bash
git pull origin main
```

You should see the changed files listed in the output.

---

## Step 6 — Install New Backend Packages

```bash
cd /var/www/ttx-platform/backend
npm install @socket.io/redis-adapter redis
```

---

## Step 7 — Add REDIS_URL to the Server's .env File

```bash
nano /var/www/ttx-platform/backend/.env
```

Add this line at the bottom:

```
REDIS_URL=redis://localhost:6379
```

Save the file:
- Press `Ctrl + O` then `Enter` to save
- Press `Ctrl + X` to exit

---

## Step 8 — Restart the Backend

First check how the backend is running:

```bash
pm2 list
```

**If PM2 is managing it:**
```bash
pm2 restart all
```

**If not using PM2 yet, start it now:**
```bash
cd /var/www/ttx-platform/backend
pm2 start ecosystem.config.js --env production
pm2 save
```

**If it's a systemd service:**
```bash
sudo systemctl restart ttx-backend
```

---

## Step 9 — Rebuild and Deploy Frontend

```bash
cd /var/www/ttx-platform/frontend
npm install
npm run build
```

Nginx automatically picks up the new `build/` folder — no Nginx restart needed.

---

## Step 10 — Verify Everything is Working

```bash
# Check Redis is running
redis-cli ping

# Check backend logs — look for "Socket.io Redis adapter connected"
pm2 logs ttx-backend --lines 30

# Check all services
pm2 list
```

Then open `https://ttx.cyberpull.space` in two browser tabs — one as facilitator, one as participant — and confirm real-time updates work without page refresh.

---

## Future Updates (Ongoing)

Every time you make changes locally, repeat only these steps:

**On your Windows PC (Git Bash or VS Code):**
```bash
git add .
git commit -m "your message"
git push origin main
```

**On the server (SSH in via Windows Terminal):**
```bash
cd /var/www/ttx-platform
git pull origin main

# If backend files changed
cd backend && npm install && pm2 restart all

# If frontend files changed
cd ../frontend && npm install && npm run build
```

---

## Quick Reference — Useful Server Commands

| Task | Command |
|---|---|
| View backend logs | `pm2 logs ttx-backend` |
| Restart backend | `pm2 restart ttx-backend` |
| Check all running processes | `pm2 list` |
| Check Redis | `redis-cli ping` |
| Check Nginx config | `sudo nginx -t` |
| Reload Nginx | `sudo systemctl reload nginx` |
| Check MongoDB | `sudo systemctl status mongod` |
