# AutoHire KE frontend

React, TypeScript, and Vite frontend for the AutoHire KE vehicle-rental pilot.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

From this directory:

```powershell
npm ci
npm run dev
```

Set `VITE_USE_MOCKS=false` and `VITE_API_BASE_URL=http://localhost:4000/api/v1` in `.env.local` to use the real backend. When the API cannot be reached, the app displays a backend-unavailable notification. Set `VITE_USE_MOCKS=true` to use the MSW mock API instead. The mock login accounts are listed in `src/mocks/fixtures.ts`; their shared demo password is `DEMO_PASSWORD` in that file and is for local development only.

## Validation

```powershell
npm run type-check
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

## Pilot release checklist

Review [API_GAPS.md](./docs/API_GAPS.md), provide the remaining assets and business details listed in [PLACEHOLDERS.md](./docs/PLACEHOLDERS.md), and complete/sign off the [real-phone checklist](./docs/MANUAL_PHONE_TEST.md). Do not tag a pilot release until the release owner has verified the checklist on a physical phone.
