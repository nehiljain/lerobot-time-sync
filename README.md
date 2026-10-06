# Robot data, explained

Four interactive explainers for ML engineers who turn robot logs into training data.

| Part | Page | Live |
| --- | --- | --- |
| 1 | A LeRobot dataset stores synced data. It doesn't sync it. | https://nehiljain.github.io/lerobot-time-sync/ |
| 2 | A ROS bag records what the robot heard, in the order it heard it. | https://nehiljain.github.io/lerobot-time-sync/rosbag/ |
| 3 | MCAP is a log file that knows where everything is. | https://nehiljain.github.io/lerobot-time-sync/mcap/ |
| 4 | Which robot data format, when. | https://nehiljain.github.io/lerobot-time-sync/formats/ |

Each page ends with a "What still bites" wall of open problems, workarounds and fixed-but-still-biting issues
collected from the projects' issue trackers and forums on 2026-10-06. Every card links to its thread; every
page lists its sources.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build      # type-checks, then builds all four pages to dist/
```

Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`.

## Stack

React 19, TypeScript, Vite (multi-page). Figures are hand-built SVG driven by React state and
requestAnimationFrame, no chart library. Fonts are self-hosted through Fontsource: Archivo (display),
Host Grotesk (body), Martian Mono (data).

Facts are checked against primary sources: LeRobot at commit 8c920c4 (version 0.6.2, dataset codebase v3.0),
rosbag2 and ros_comm at pinned commits, the MCAP specification and CLI at foxglove/mcap f123d25, and each
trainer's repository. Latencies, offsets and sizes in the figures are illustrative unless a source is given.
