# Render Deployment Guide (Backend - Free Plan)

This app is a monorepo:
- Frontend at repo root (`Vite + React`)
- Backend in `backend/` (`Express + MongoDB + Socket.IO`)

Use Render to deploy only the backend service.

## Option A: Fastest (Using `render.yaml` in this repo)

1. Push this repository to GitHub.
2. In Render, click `New +` -> `Blueprint`.
3. Select this repo.
4. Render will detect `render.yaml` and create service `quizz-chat-backend` on the `free` plan.
5. Open service -> `Environment` and fill all `sync: false` variables.
6. Deploy.

## Option B: Manual Web Service Setup

If you do not want Blueprint:
1. `New +` -> `Web Service`
2. Connect this repo.
3. Configure:
   - Runtime: `Node`
   - Root Directory: `backend`
   - Build Command: `npm ci --include=dev && npm run build`
   - Start Command: `npm run start`
   - Plan: `Free`
   - Health Check Path: `/api/v1/health`

## Required Environment Variables

Set these in Render service settings:

```env
NODE_ENV=production
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_32_plus_character_secret
JWT_EXPIRES_IN=28d
CLIENT_URL=https://your-frontend-domain.netlify.app
AUTH_PAYLOAD_SECRET=your_shared_secret
```

Optional email vars (only for forgot-password emails):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM_EMAIL=no-reply@yourdomain.com
```

## Connect Frontend to Render Backend

After first deploy, Render gives URL like:
- `https://quizz-chat-backend.onrender.com`

Set Netlify frontend env:

```env
VITE_API_BASE_URL=https://quizz-chat-backend.onrender.com/api/v1
VITE_AUTH_PAYLOAD_SECRET=your_shared_secret
```

Important:
- `CLIENT_URL` must exactly match your frontend URL (`https`, domain, no typo).
- `AUTH_PAYLOAD_SECRET` must match frontend `VITE_AUTH_PAYLOAD_SECRET`.
- Do not set `PORT` manually on Render unless needed. Render injects it automatically.

## Free Plan Notes

- Free instance spins down after inactivity and first request may be slow (cold start).
- WebSockets (Socket.IO) are supported, but reconnection delay after spin-down is normal.

## Verify Deployment

1. Check health endpoint:
   - `GET https://your-render-service.onrender.com/api/v1/health`
2. Open frontend and test:
   - signup/signin
   - join room
   - live chat updates in two browser sessions

## Troubleshooting

### CORS errors
- Ensure backend `CLIENT_URL` equals your exact frontend URL.

### Socket not connecting
- Ensure frontend uses correct `VITE_API_BASE_URL`.
- Ensure backend service is running (cold starts can take time on free plan).

### Startup failed on Render
- Usually a missing required env var (`MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `AUTH_PAYLOAD_SECRET`).

## Where To See Logs In Render

If deploy fails but main logs look empty:
1. Open the service.
2. Go to `Events` and open the failed deploy item.
3. Check `Build Logs` for install/build failures.
4. Check `Runtime Logs` for startup env/config crashes.
