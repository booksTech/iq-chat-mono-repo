# Netlify Deployment Guide (Frontend) + Backend Checklist

This project has:
- Frontend: Vite + React (deploy on Netlify)
- Backend: Express + MongoDB + Socket.IO (deploy on a separate server like Render/Railway/Fly/EC2)

You **cannot** host this backend as-is directly inside Netlify static hosting.

## 1) Deploy Backend First

Deploy the `backend/` app to any Node host and get a public URL:
- Example: `https://api.yourdomain.com`

Backend required env vars:

```env
NODE_ENV=production
PORT=5001
MONGODB_URI=your_mongo_uri
JWT_SECRET=your_long_secret
JWT_EXPIRES_IN=28d
CLIENT_URL=https://your-netlify-site.netlify.app
AUTH_PAYLOAD_SECRET=your_shared_secret
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM_EMAIL=...
```

Important:
- `CLIENT_URL` must match your Netlify app URL (for CORS and reset links).
- `AUTH_PAYLOAD_SECRET` must match frontend `VITE_AUTH_PAYLOAD_SECRET`.

## 2) Netlify Frontend Build Settings

In Netlify project settings:
- Base directory: *(empty)* (repo root)
- Build command: `npm run build`
- Publish directory: `dist`

## 3) Netlify Frontend Environment Variables

Add these in Netlify UI (`Site settings -> Environment variables`):

```env
VITE_KEY=NOVA2026
VITE_ROOM_CREATOR_EMAIL=rockyfail5566@gmail.com
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
VITE_AUTH_PAYLOAD_SECRET=your_shared_secret
```

Important:
- `VITE_API_BASE_URL` must point to backend `/api/v1`.
- For sockets, frontend auto-derives socket URL from this value (removes `/api/v1`).

## 4) Optional SPA Redirect (Recommended)

Create file `public/_redirects`:

```txt
/* /index.html 200
```

This prevents 404 on direct URL refresh.

## 5) What To Change Before Production

1. Replace localhost values in:
   - Backend `CLIENT_URL`
   - Frontend `VITE_API_BASE_URL`
2. Use strong production secrets:
   - `JWT_SECRET`
   - `AUTH_PAYLOAD_SECRET`
3. Ensure backend host supports WebSockets (Socket.IO).
4. Restart backend after env updates.
5. Trigger Netlify redeploy after env updates.

## 6) Quick Verification

After deploy:
1. Open Netlify app and login.
2. Join room and send message.
3. Open same room from second user:
   - message should appear live
   - online/offline and typing should update live.

## 7) Common Issues

### CORS error
- Check backend `CLIENT_URL` exactly matches Netlify URL (including `https`).

### Socket not connecting
- Ensure backend URL is public and supports websocket upgrades.
- Ensure `VITE_API_BASE_URL` is correct and starts with `https://`.

### Auth payload errors
- `VITE_AUTH_PAYLOAD_SECRET` and backend `AUTH_PAYLOAD_SECRET` must be identical.

