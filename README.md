# Alpha Ledger: UI

The web app for the Research Application. Next.js + TypeScript, dark theme.
It shows every experiment, every saved version and what each was built from, and hands out the code snippets your notebooks use.

## First time (in this folder)

```
npm install
```

Login uses Clerk. Put your keys in `.env.local` (never committed):

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

Experiments, the workspace and Server status need a signed-in user; the landing page doesn't.

## Run

```
npm run dev
```

Open http://localhost:3000. For the **Server status** page, start the FastAPI server too (see `../server/README.md`).
The UI reaches it through `/api`, so no extra setup is needed. To change addresses, copy `.env.example` to `.env.local`.

## Checks

```
npm run typecheck         # TypeScript
npm run check:structure   # folder rules below
npm run build             # production build
```

## Not saved yet

Until the UI is connected to the FastAPI server, experiments you create live only in the browser tab and disappear
on reload; the top bar and sidebar say so. Server status is always live.
When the endpoints are connected, only `src/data/LedgerProvider.tsx` changes; no screen does.

## Folder map

```
src/
  app/          pages; each one only puts features and sections together
  core/         shared plumbing: types, formatting, server calls, UI kit; knows no section
  data/         where screens get experiments and versions (in-memory now, FastAPI next)
  features/     app-wide features
    shell/        top navigation bar and page frame
    dashboard/    home page (blank until the first baseline is stored)
    auth/         Log in / Sign up through Clerk (popup, redirects, account menu)
    experiments/  experiment list, new experiment, the overview, section headers
    versions/     dataset and version tables, version details, save snippets
    lineage/      built from / used by
    mlflow/       MLflow pushes and runs (used by sections 05 and 06)
    snippets/     the Python snippets and the endpoints they call
    health/       server status (live)
  sections/
    registry.ts   the list of sections, in pipeline order (the only place that names them)
    s01_data_pipeline/ ... s06_model_development/
                  one folder per section: index.ts (name, number, blurb) and its Panel
scripts/
  check-structure.mjs
```

## Rules that keep features independent

1. A section never imports another section.
2. `core/` imports nothing from `data/`, `features/` or `sections/`.
3. `data/` imports nothing from `features/` or `sections/`.
4. `features/` import nothing from `sections/`.
5. A new section = copy a section folder, change its `index.ts`, add one line to `sections/registry.ts`.

`npm run check:structure` fails if rules 1 to 4 are broken.

## Theme

All colours, type sizes and radii are variables at the top of `src/app/globals.css`.
Near-black navy background, electric-blue accents, glowing panels, blue field labels; green for complete or positive, red for failed or negative.
Fonts: Poppins and IBM Plex Mono, bundled (no internet needed).

## Charts and reports

Research charts will support both Plotly (saved as JSON, shown interactive) and matplotlib (saved as PNG/SVG, shown as images).
Where they appear is still to be decided. MLflow pushes already show a Performance bar chart per run.
