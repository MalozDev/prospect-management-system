# Airtel Prospect Management System

A CRM for managing ODU sales prospects, follow-ups, and team performance tracking. Built with Next.js 16 and MongoDB.

## Features

- **DSE Dashboard** — View today's prospects, follow-ups, sales targets, and commission tracking
- **Prospect Management** — Create and track prospects through the sales pipeline
- **Follow-up Workflow** — Full lifecycle: contact → feedback → sold/lost/schedule visit/postpone
- **Visit Scheduling** — Schedule in-person visits with automatic reminders
- **Sales Tracking** — Log ODU sales, track monthly targets, calculate commissions
- **Notifications** — Automated notifications for due follow-ups, scheduled visits, and sales
- **Supervisor Console** — Team performance dashboard, DSE oversight, activity feed
- **Authentication** — JWT-based auth with registration and login via CUG number

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB (via Mongoose)
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: 20 LTS or 22 LTS)
- MongoDB instance (local or Atlas)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd prospect-management-system
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017/prospect-management
JWT_SECRET=your-random-secret-here-change-this
```

### 3. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Register

1. Go to `/register` and create an account
2. Choose your role (DSE or Supervisor)
3. DSEs must select a supervisor (must exist in the database first)
4. Login with your CUG suffix and password

## Production Deployment

### Deploy to Vercel (recommended)

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Add these environment variables in Vercel dashboard:
   - `MONGODB_URI` — Your MongoDB Atlas connection string
   - `JWT_SECRET` — A random secret string (use: `openssl rand -hex 32`)
4. Deploy
5. Register the first supervisor account via `/register`, then DSEs can register with that supervisor assigned

### Deploy to other platforms (Railway, Render, Fly.io)

Same process: Set `MONGODB_URI` and `JWT_SECRET` as environment variables, then run `npm run build && npm start`.

### MongoDB Atlas Setup

1. Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Under **Network Access**, add `0.0.0.0/0` (allow all) for production, or whitelist your server's IP
3. Under **Database Access**, create a database user with read/write permissions
4. Get your connection string and set it as `MONGODB_URI`

### Important: JWT Secret

Generate a strong secret:
```bash
openssl rand -hex 32
```

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with CUG + password |
| GET/PATCH | `/api/users/me` | Get/update current user |
| GET/POST | `/api/prospects` | List/create prospects |
| GET/PATCH/DELETE | `/api/prospects/[id]` | Single prospect CRUD |
| GET/POST | `/api/followups` | List/create follow-ups |
| PATCH | `/api/followups/[id]` | Update follow-up status/outcome |
| GET/POST | `/api/sales` | List/create sales |
| DELETE | `/api/sales/[id]` | Delete sale |
| GET/POST | `/api/notifications` | List/create notifications |
| PATCH/DELETE | `/api/notifications/[id]` | Update/delete notification |
| GET | `/api/activities` | List activity feed |
| GET | `/api/supervisors` | List supervisor users |

## Project Structure

```
├── app/
│   ├── (auth)/          # Login & register pages
│   ├── (dashboard_dse)/ # DSE dashboard pages
│   ├── (dashboard_supervisor)/ # Supervisor console
│   └── api/            # All API routes
├── components/
│   ├── forms/          # Form components
│   ├── layout/         # Layout components
│   ├── shared/         # Shared UI components
│   ├── supervisor/     # Supervisor-specific components
│   └── ui/            # Base UI components
├── lib/
│   ├── models/         # Mongoose models
│   ├── auth.ts         # JWT helpers
│   ├── mongodb.ts      # Database connection
│   ├── api-client.ts   # Client-side API helper
│   └── use-api-data.ts # Data fetching hook
```
