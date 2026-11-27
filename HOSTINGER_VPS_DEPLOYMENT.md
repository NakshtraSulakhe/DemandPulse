# Hostinger VPS Deployment Guide: live.tarajglobal.com

This guide explains how to deploy the DemandPulse application to your Hostinger VPS using Docker and your existing shared Nginx and MySQL containers.

---

## 1. Port & Architecture Overview

| Component | Port | Visibility | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | `3002` | **Internal Docker** | Next.js frontend UI pages & static assets |
| **Backend** | `5002` | **Internal Docker** | Next.js / API route handlers (`/api/*`) |
| **MySQL** | `3306` | **Internal Docker** | Existing shared MySQL container |
| **Nginx** | `80`, `443` | **Public Host** | Existing shared reverse proxy with SSL termination |

> **Security Note:** Ports `3002` and `5002` are **not published to the VPS host**. Traffic is routed exclusively through the internal Docker bridge network (`shared-network`) by the shared Nginx reverse proxy.

---

## 2. Docker Network Setup (VPS)

Ensure the shared Docker network exists on your VPS so Nginx, MySQL, Frontend, and Backend can communicate:

```bash
# Check existing networks
docker network ls

# If your shared network does not exist yet (e.g. named 'shared-network'):
docker network create shared-network

# Ensure your existing shared Nginx and MySQL containers are attached:
docker network connect shared-network <your-existing-nginx-container-name>
docker network connect shared-network <your-existing-mysql-container-name>
```

---

## 3. Project Deployment (Frontend & Backend)

### Step A: Clone / Copy Project to VPS
```bash
cd /var/www/live.tarajglobal.com # or your desired deployment directory
git pull origin main
```

### Step B: Create Production `.env`
Ensure your `.env` contains the required environment variables:
```bash
# Database connection to existing shared MySQL container
DB_HOST=mysql # Or the container name of your shared MySQL container
DB_PORT=3306
DB_USER=u449458970_demandpulse
DB_PASSWORD=your_actual_db_password
DB_NAME=u449458970_demandpulse

# Shared Docker Network Name
SHARED_NETWORK_NAME=shared-network

# App Secrets
SESSION_SECRET=a_very_long_random_secure_secret_string_for_sessions
ADMIN_AUTH_TOKEN=df_admin_secret_token_2026
CRM_API_BASE_URL=https://app.tarajglobal.com/demandflowbridge/api/v1
CRM_API_TOKEN=df_admin_secret_token_2026
CRM_INCENTIVES_API_URL=https://app.tarajglobal.com/demandflowbridge/api/v1/incentives
```

### Step C: Build and Start Containers
```bash
docker compose up -d --build
```

Verify containers are running:
```bash
docker ps --filter "name=live-taraj"
```
You should see:
- `live-taraj-frontend` listening internally on `3002/tcp`
- `live-taraj-backend` listening internally on `5002/tcp`

---

## 4. Nginx Reverse Proxy Configuration

Copy the provided Nginx configuration to your existing shared Nginx container / host directory:

### Step A: Copy Virtual Host Configuration
Copy `nginx/live.tarajglobal.com.conf` into your shared Nginx directory:
```bash
# Example path if using Nginx on host or mounted volume:
sudo cp nginx/live.tarajglobal.com.conf /etc/nginx/conf.d/live.tarajglobal.com.conf
```

### Step B: Obtain SSL Certificate (Let's Encrypt / Certbot)
If you do not yet have an SSL certificate for `live.tarajglobal.com`:
```bash
sudo certbot certonly --webroot -w /var/www/certbot -d live.tarajglobal.com
# OR using standalone / nginx plugin:
# sudo certbot --nginx -d live.tarajglobal.com
```

### Step C: Test & Reload Nginx
```bash
# Test configuration syntax
sudo nginx -t

# Reload Nginx without downtime
sudo nginx -s reload
# (Or if running inside a container):
# docker exec <nginx-container-name> nginx -s reload
```

---

## 5. Traffic Routing Verification

1. **Frontend UI:** Open `https://live.tarajglobal.com` in your browser. Nginx forwards requests to `live-taraj-frontend:3002`.
2. **Backend API:** Test `https://live.tarajglobal.com/api/health`. Nginx forwards requests matching `/api/*` to `live-taraj-backend:5002`.
3. **SSL & Security:** All HTTP traffic on port 80 automatically redirects with `301 Moved Permanently` to `https://live.tarajglobal.com`.
