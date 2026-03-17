# TTX Platform — Hostinger VPS Deployment Guide

**Stack:** Node.js + Express + MongoDB + Redis + React + Nginx + PM2 + SSL
**Domain:** ttx.cyberpull.space
**Server:** Hostinger VPS (Ubuntu 22.04 LTS recommended)

---

## Prerequisites

- Hostinger VPS purchased and running (Ubuntu 22.04 LTS)
- Domain pointed to your VPS IP (A record set in DNS)
- SSH access to your server
- Your project code pushed to GitHub

---

## Phase 1 — Connect to Your VPS

```bash
ssh root@YOUR_VPS_IP
```

Set a strong root password if prompted. Then create a non-root user for security:

```bash
adduser ttxadmin
usermod -aG sudo ttxadmin
su - ttxadmin
```

---

## Phase 2 — Update Server & Install Core Dependencies

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential ufw
```

### Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
sudo ufw status
```

---

## Phase 3 — Install Node.js (v20 LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v    # should print v20.x.x
npm -v     # should print 10.x.x
```

---

## Phase 4 — Install MongoDB

```bash
# Import MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repo
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install
sudo apt update
sudo apt install -y mongodb-org

# Start and enable on boot
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod    # should show: active (running)
```

### Secure MongoDB (create admin user)

```bash
mongosh
```

Inside the mongo shell:

```js
use admin
db.createUser({
  user: "ttxadmin",
  pwd: "CHOOSE_A_STRONG_PASSWORD",
  roles: [{ role: "readWrite", db: "tabletop_exercise" }]
})
exit
```

Enable MongoDB auth:

```bash
sudo nano /etc/mongod.conf
```

Find the `security:` section and set:

```yaml
security:
  authorization: enabled
```

```bash
sudo systemctl restart mongod
```

Update your backend `.env` connection string (see Phase 6).

---

## Phase 5 — Install Redis

```bash
sudo apt install -y redis-server

# Enable supervised mode for systemd
sudo nano /etc/redis/redis.conf
```

Find the line `supervised no` and change it to:

```
supervised systemd
```

```bash
sudo systemctl restart redis
sudo systemctl enable redis
sudo systemctl status redis    # should show: active (running)

# Quick test
redis-cli ping    # should return: PONG
```

---

## Phase 6 — Deploy Backend

### Clone your repository

```bash
cd /var/www
sudo mkdir ttx-platform
sudo chown ttxadmin:ttxadmin ttx-platform
cd ttx-platform
git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git .
```

### Install backend dependencies

```bash
cd /var/www/ttx-platform/backend
npm install
```

### Create production .env

```bash
nano /var/www/ttx-platform/backend/.env
```

Paste and fill in your values:

```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://ttxadmin:CHOOSE_A_STRONG_PASSWORD@localhost:27017/tabletop_exercise
JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_STRING_MIN_32_CHARS
JWT_EXPIRE=7d
FRONTEND_URL=https://ttx.cyberpull.space
REDIS_URL=redis://localhost:6379
```

> Generate a strong JWT secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Run the database seed (first time only)

```bash
cd /var/www/ttx-platform/backend
node seed.js
```

---

## Phase 7 — Install PM2 and Start Backend

```bash
sudo npm install -g pm2

cd /var/www/ttx-platform/backend
pm2 start ecosystem.config.js --env production

# Verify it started
pm2 list
pm2 logs ttx-backend --lines 20
```

### Save PM2 process list and enable on server reboot

```bash
pm2 startup
# PM2 will print a command — copy and run it, e.g.:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ttxadmin --hp /home/ttxadmin

pm2 save
```

---

## Phase 8 — Build and Deploy Frontend

```bash
cd /var/www/ttx-platform/frontend
npm install
```

### Set production API URL

Create `/var/www/ttx-platform/frontend/.env.production`:

```bash
nano /var/www/ttx-platform/frontend/.env.production
```

```env
REACT_APP_API_URL=https://ttx.cyberpull.space/api
```

### Build the React app

```bash
npm run build
```

This creates `/var/www/ttx-platform/frontend/build/` — the static files Nginx will serve.

---

## Phase 9 — Install and Configure Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Create Nginx site config

```bash
sudo nano /etc/nginx/sites-available/ttx-platform
```

Paste the following (replace `ttx.cyberpull.space` with your domain):

```nginx
server {
    listen 80;
    server_name ttx.cyberpull.space;

    # Redirect all HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ttx.cyberpull.space;

    # SSL certificates (Certbot will fill these in — see Phase 10)
    ssl_certificate /etc/letsencrypt/live/ttx.cyberpull.space/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ttx.cyberpull.space/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Performance tuning
    worker_processes auto;
    keepalive_timeout 65;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # WebSocket / Socket.io proxy
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # API proxy to Node.js backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # React frontend — serve static build
    location / {
        root /var/www/ttx-platform/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

### Enable the site

```bash
sudo ln -s /etc/nginx/sites-available/ttx-platform /etc/nginx/sites-enabled/
sudo nginx -t    # should print: syntax is ok / test is successful
sudo systemctl reload nginx
```

---

## Phase 10 — SSL Certificate (Free via Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot --nginx -d ttx.cyberpull.space
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose option 2 (Redirect HTTP to HTTPS)

Certbot auto-renews — verify with:

```bash
sudo certbot renew --dry-run
```

After SSL is set up, reload Nginx:

```bash
sudo systemctl reload nginx
```

---

## Phase 11 — Verify Everything is Running

```bash
# Backend processes
pm2 list

# MongoDB
sudo systemctl status mongod

# Redis
sudo systemctl status redis
redis-cli ping

# Nginx
sudo systemctl status nginx
sudo nginx -t

# Test backend API directly
curl http://localhost:5000/api/auth/login

# Check backend logs
pm2 logs ttx-backend --lines 50
```

Open your browser and go to `https://ttx.cyberpull.space` — the platform should load.

---

## Phase 12 — Redeployment (Future Updates)

When you push new code to GitHub, SSH into the server and run:

```bash
cd /var/www/ttx-platform

# Pull latest code
git pull origin main

# Backend update
cd backend
npm install
pm2 restart ttx-backend

# Frontend update
cd ../frontend
npm install
npm run build

# Nginx doesn't need restart — it serves the new build/ files automatically
```

---

## Quick Reference — Service Commands

| Action | Command |
|---|---|
| View backend logs | `pm2 logs ttx-backend` |
| Restart backend | `pm2 restart ttx-backend` |
| Stop backend | `pm2 stop ttx-backend` |
| MongoDB shell | `mongosh -u ttxadmin -p --authenticationDatabase admin` |
| Restart Nginx | `sudo systemctl reload nginx` |
| Restart Redis | `sudo systemctl restart redis` |
| Check all services | `pm2 list && sudo systemctl status mongod redis nginx` |

---

## Architecture on the Server

```
Browser (HTTPS :443)
        |
      Nginx
     /     \
/socket.io/  /api/        /
     |          |           |
  Node.js    Node.js    React build
  (PM2)      (PM2)      (static files)
     \          /
    Express App (port 5000)
         |           \
      MongoDB       Redis
   (port 27017)  (port 6379)
```

---

## Hostinger VPS Recommended Plan

| Requirement | Minimum | Recommended |
|---|---|---|
| vCPU | 2 | 4 |
| RAM | 4 GB | 8 GB |
| Storage | 40 GB SSD | 80 GB SSD |
| Plan | KVM 2 | KVM 4 |

> KVM 2 (2 vCPU / 8GB RAM) on Hostinger comfortably handles 500 concurrent users with this setup.
