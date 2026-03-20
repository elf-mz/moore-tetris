# Deploying `moore-tetris` to a Hostinger VPS

## 1. Copy project to the server

Recommended target:

```bash
/srv/apps/moore-tetris
```

## 2. Start the container

```bash
cd /srv/apps/moore-tetris
docker compose up -d --build
```

That will publish the app on:

```text
http://SERVER_IP:8088
```

## 3. Optional reverse proxy

If you want a clean subdomain like `tetris.yourdomain.com`, point your proxy to:

```text
127.0.0.1:8088
```

## 4. Updating the app later

```bash
cd /srv/apps/moore-tetris
git pull
docker compose up -d --build
```

## 5. Notes

- This app is static, so it is very lightweight.
- You can later switch to Caddy or Nginx for HTTPS and domain routing.
- If you want exact Moore branding, replace placeholder visual elements with official assets.
