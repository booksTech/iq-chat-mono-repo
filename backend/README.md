# Backend Auth Service

Production-ready Express + MongoDB authentication API for:
- Sign up
- Sign in
- Forgot password
- Reset password
- Sign out

## Run

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Production build:

```bash
npm run build
npm start
```

## Required `.env`

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<at-least-32-char-random-secret>
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# Shared secret used for simple AES payload encryption (must match frontend)
AUTH_PAYLOAD_SECRET=replace_with_shared_secret
```

## Optional SMTP `.env` (for forgot-password email)

If SMTP is not provided, reset links are printed to server logs in development.

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-password>
SMTP_FROM_EMAIL=no-reply@yourdomain.com
```

## API Endpoints

Base URL: `/api/v1/auth`

- `POST /signup`
- `POST /signin`
- `POST /forgot-password`
- `POST /reset-password`
- `GET /me`
- `POST /signout`

Health check:
- `GET /api/v1/health`

Test sets:
- `GET /api/v1/test-sets`
- `POST /api/v1/test-sets`

## Request Bodies

### `POST /signup`

```json
{
  "email": "user@example.com",
  "password": "strongpassword",
  "confirmPassword": "strongpassword"
}
```

### `POST /signin`

```json
{
  "email": "user@example.com",
  "password": "strongpassword"
}
```

### `POST /forgot-password`

```json
{
  "email": "user@example.com"
}
```

### `POST /reset-password`

```json
{
  "token": "token-from-email",
  "password": "newstrongpassword",
  "confirmPassword": "newstrongpassword"
}
```

## Error Handling & Status Codes

- `201` Created: signup success
- `200` OK: signin/forgot/reset/signout success
- `400` Bad Request: validation or invalid reset token
- `401` Unauthorized: invalid credentials
- `404` Not Found: route not found
- `409` Conflict: email already registered
- `429` Too Many Requests: auth rate limit triggered
- `500` Internal Server Error: unexpected server error
