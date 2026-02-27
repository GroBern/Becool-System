# 🏄 Be Cool Surf School — Management System

A complete management system for **Be Cool Surf School** in Weligama, Sri Lanka.

## Features

- **Dashboard** — Today's snapshot with revenue chart, active lessons, rental status, lesson queue
- **Single Lessons** — One-on-one surf lessons with live timers and inline payments
- **Group Lessons** — Multi-student sessions with per-student payment tracking
- **Package Lessons** — Multi-lesson packages with progress bars and auto-completion
- **Students** — Customer database
- **Instructors** — Profiles, availability, commission tracking
- **Instructor Finances** — Advances and expenses with balance calculation
- **Agents / Referrers** — Commission tracking for referrals
- **Sunbeds** — Inventory + rental management with countdown timers
- **Equipment** — Surfboard/gear inventory + rentals with timers
- **Payments** — Full payment ledger with method/status filtering
- **Reports** — Daily financial reports with payment breakdown
- **Settings** — Configurable pricing, data export/import, system reset

## Payment Integration

Every operation has built-in payment collection:
- **Create/Edit modals** include a Payment Section (status, method, amount)
- **Quick Pay buttons** on unpaid items for fast collection
- **Complete Rental** modals collect payment on completion
- **Auto-recording** — all payments sync to the Payments ledger automatically

## Tech Stack

- **React 18** with hooks
- **Vite** for fast dev/build
- **localStorage** for data persistence (no backend needed)
- **DM Sans** typography

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Data Management

- **Export**: Settings → Export Data (downloads JSON backup)
- **Import**: Settings → Import Data (restores from JSON)
- **Reset**: Settings → Reset All (clears everything)

## Default Pricing

| Item | Price |
|------|-------|
| Single Beginner | $25 |
| Single Intermediate | $30 |
| Single Advanced | $40 |
| Group Beginner | $20/student |
| Group Intermediate | $25/student |
| Group Advanced | $35/student |
| Surfboard Hourly | $5 |
| Surfboard Daily | $15 |
| Sunbed Hourly | $3 |
| Sunbed Daily | $10 |

---

Built for Be Cool Surf School, Weligama, Sri Lanka 🇱🇰
