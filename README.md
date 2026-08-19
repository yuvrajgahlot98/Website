# Skillpath Courses — local preview

Runs `SkillpathCourses.tsx` (a Framer code component) in a plain browser, so you
can review it without a Framer account.

## Requirements

Node.js 18 or newer. Check with `node -v`; install the LTS build from
https://nodejs.org if it is missing, then open a **new** terminal.

## Run it

Open a terminal **in this folder**, then:

```bash
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser (it may open by itself).
Stop the server with `Ctrl+C`.

> **Windows PowerShell:** if `npm install` fails with *"running scripts is
> disabled on this system"*, use **Command Prompt** (Start → type `cmd`) instead
> — the same commands work there. Or allow scripts once with:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

## What you should see

A light, editorial layout: a large heading, and a grid of course cards showing
category, title, description, course type, and price. Try:

- **Search** — filters on course name and category.
- **Sort** — Featured / Price low→high / Price high→low.
- **Resize the window** — the grid reflows from three columns to two to one.
- **Tab through it** — every control shows a visible focus ring, and the result
  count is announced to screen readers as you filter.

Prices follow the API's country response: `IN` renders rupees (`pricePaise / 100`),
`US` renders dollars (`priceUsdCents / 100`). If the country call fails but courses
load, cards render with "Price unavailable" rather than guessing a currency.

## The API fails on purpose

`syncsphere-hiv6.onrender.com` returns intermittent errors by design — roughly
1 in 6 requests for country, 1 in 12 for courses (real error bodies observed:
`"maybe turn it on and off?"` and `"FAAAAAAAAAAA"`). Handling that is the point of
the assignment, so an error state on first load is the app working, not a broken
setup. Two behaviours to look for:

- **Courses fail** → full error panel with a "Retry courses" button.
- **Country fails, courses load** → cards still render, with a notice at the top
  and "Price unavailable" instead of a guessed currency.

Reload a few times, or click Retry, to see both paths and the healthy one.

## How this differs from Framer

`src/SkillpathCourses.tsx` is byte-identical to the file used in Framer. Two
dev-only shims in `vite.config.ts` let it run outside Framer:

1. **`framer` alias → `src/framer.ts`** — stubs `addPropertyControls` and
   `ControlType`, which only exist inside Framer.
2. **API proxy** — the component calls the Render API directly, and that origin
   sends no CORS headers, so a browser blocks it on localhost. A dev-only
   transform rewrites the base URL to same-origin and Vite proxies
   `/assignment/*` to the real API. Published Framer pages don't need this.

Neither shim ships in a production build, and neither changes component logic.

## Troubleshooting

- **`npm: command not found`** — Node isn't installed, or the terminal needs
  reopening after installing it.
- **Port 5173 in use** — `npm run dev -- --port 5174`, then open that port.
- **Blank page** — make sure `npm install` finished and the terminal shows
  `VITE ... ready`.
- **Error panel on load** — usually the intentional API flakiness above; click
  Retry. The API is also on a free tier, so after a long idle the very first
  request can take 30–60s to wake up.
