# Velora Enterprise

Official e-commerce website for **Velora Enterprise** — premium home decor products.

## Prerequisites

- Node.js 20+
- Python 3.12+
- Docker Desktop (PostgreSQL)

## Local development

### 1. PostgreSQL (from repo root)

```powershell
docker compose up -d
docker compose ps
```

### 2. Backend (run from `backend/` directory)

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
python -m scripts.seed
python -m uvicorn app.main:app --reload --port 8000
```

**Important:** Run uvicorn from inside `backend/` so Python resolves the `app` package.

- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/api/v1/health

### 3. Frontend (new terminal)

```powershell
cd frontend
copy .env.local.example .env.local
npm install
npm run dev
```

- Storefront: http://localhost:3000
- Customer login: http://localhost:3000/login
- Admin login: http://localhost:3000/admin/login
- Admin dashboard: http://localhost:3000/admin

## Admin setup

Credentials are set in `backend/.env`:

```
ADMIN_EMAIL=admin@veloraenterprise.com
ADMIN_PASSWORD=ChangeMe@Admin123!
```

**First time:**

```powershell
cd backend
python -m scripts.seed
```

**If admin login fails** (password out of sync):

```powershell
cd backend
python -m scripts.reset_admin
```

Requires `DEBUG=true` in `backend/.env`. Sign in at http://localhost:3000/admin/login

## Environment variables

### Backend (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection |
| `SECRET_KEY` | JWT signing — use a long random string in production |
| `CORS_ORIGINS` | Comma-separated frontend origins |
| `FRONTEND_URL` | Frontend base URL |
| `SUPPORT_EMAIL` | Support contact email |
| `DEBUG` | Set `false` in production |
| `SHIPPING_FLAT_RATE` | Flat shipping fee (₹) |
| `FREE_SHIPPING_MIN_ORDER` | Free shipping threshold (₹) |
| `LOW_STOCK_THRESHOLD` | Low stock alert threshold |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Bootstrap admin (seed/reset) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Optional online payments |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook verification |

### Frontend (`frontend/.env.local`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base |
| `NEXT_PUBLIC_SITE_URL` | Frontend URL (SEO, sitemap) |
| `NEXT_PUBLIC_BUSINESS_NAME` | Business display name |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Support email shown on site |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | WhatsApp number (no + prefix), empty hides button |
| `NEXT_PUBLIC_SHIPPING_FLAT_RATE` | Display shipping fee |
| `NEXT_PUBLIC_FREE_SHIPPING_MIN_ORDER` | Display free shipping threshold |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay public key (optional) |

## Testing

```powershell
# Backend unit tests
cd backend
pytest

# API integration smoke test (backend must be running)
python -m scripts.smoke_test

# Frontend production build
cd frontend
npm run build
```

## Production checklist

- Set `DEBUG=false` in backend `.env`
- Use a strong, unique `SECRET_KEY`
- Set `CORS_ORIGINS` to your production frontend URL only
- Use HTTPS — refresh cookies use `secure=true` when `DEBUG=false`
- Configure Razorpay keys and webhook URL if using online payments
- Run `alembic upgrade head` before starting the backend
- Never commit `.env` or `.env.local` files

## Deployment (generic)

1. Provision PostgreSQL and set `DATABASE_URL`
2. Deploy backend (FastAPI + uvicorn/gunicorn) with env vars
3. Run migrations: `alembic upgrade head`
4. Seed admin once: `python -m scripts.seed`
5. Build frontend: `npm run build` and deploy static/server output
6. Point `NEXT_PUBLIC_API_URL` to your production API

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ERR_CONNECTION_REFUSED` on API calls | Start backend from `backend/` on port 8000 |
| `ModuleNotFoundError: No module named 'app'` | `cd backend` before running uvicorn |
| Admin login 401 | Run `python -m scripts.reset_admin` |
| Refresh 401 noise in console | Normal when logged out (no refresh cookie) |
| Base UI `nativeButton` warning | Use `ButtonLink` or `nativeButton={false}` with `render` prop |
