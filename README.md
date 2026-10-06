# A LeRobot dataset stores synced data. It doesn't sync it.

An interactive explainer: what the LeRobot dataset format promises, why VLA data pipelines still need a
time-sync step, and how to read the "VLAs - fine-tuning workflow" slide from Ray Summit 2026.

Live: https://nehiljain.github.io/lerobot-time-sync/

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build      # type-checks, then builds to dist/
```

Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`.

## Stack

React 19, TypeScript, Vite. Figures are hand-built SVG driven by React state and requestAnimationFrame,
no chart library. Fonts are self-hosted through Fontsource: Archivo (display), Host Grotesk (body),
Martian Mono (data).

LeRobot details are checked against the LeRobot source at commit 8c920c4 (version 0.6.2, dataset
codebase v3.0). Latencies and offsets in the figures are illustrative.
