import { useEffect, useState } from 'react';
import { Anatomy } from './sections/Anatomy';
import { CheatSheet } from './sections/CheatSheet';
import { DeltaWindow } from './sections/DeltaWindow';
import { HeroScope } from './sections/HeroScope';
import { HowToSync, SyncCode } from './sections/HowToSync';
import { PipelineMap } from './sections/PipelineMap';
import { RawStreams } from './sections/RawStreams';
import { RecorderLoop } from './sections/RecorderLoop';
import { ShortAnswer } from './sections/ShortAnswer';
import { WhyItMatters } from './sections/WhyItMatters';

const NAV = [
  { id: 'format', label: 'Format' },
  { id: 'raw', label: 'Raw logs' },
  { id: 'stakes', label: 'Stakes' },
  { id: 'sync', label: 'Sync' },
  { id: 'recorder', label: 'Recorder' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'cheatsheet', label: 'Cheat sheet' },
];

const SHA = '8c920c4270460851cedd2737657584586d3dc66f';
const gh = (path: string, lines: string) => `https://github.com/huggingface/lerobot/blob/${SHA}/${path}#${lines}`;

function Topbar() {
  const [active, setActive] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? h.scrollTop / max : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    NAV.forEach((n) => {
      const el = document.getElementById(n.id);
      if (el) io.observe(el);
    });
    return () => {
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
    };
  }, []);

  return (
    <header className="topbar">
      <div className="wrap-wide topbar__inner">
        <a className="topbar__mark" href="#top">
          <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#111a22" />
            <path d="M9 7v18M16 7v18M23 7v18" stroke="#2b3a49" strokeWidth="1.5" />
            <circle cx="9" cy="11" r="2.6" fill="#c4870f" />
            <circle cx="16" cy="16" r="2.6" fill="#3c9ad1" />
            <circle cx="23" cy="21" r="2.6" fill="#d45a9e" />
          </svg>
          LeRobot and time sync
        </a>
        <nav className="topbar__nav" aria-label="Sections">
          {NAV.map((n) => (
            <a key={n.id} className="topbar__link" href={`#${n.id}`} aria-current={active === n.id ? 'true' : undefined}>
              {n.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="topbar__progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
    </header>
  );
}

export default function App() {
  return (
    <>
      <Topbar />
      <main id="top">
        <section className="hero">
          <div className="wrap-wide">
            <div className="eyebrow">Explainer · Ray Summit 2026, VLA fine-tuning workflow</div>
            <h1 className="hero__title">
              A LeRobot dataset stores synced data. <em>It doesn't sync it.</em>
            </h1>
            <p className="lede hero__dek">
              Why the VLA fine-tuning pipeline has its own time-sync step, what the LeRobot format actually promises, and how
              to read the slide end to end.
            </p>
          </div>
          <div className="wrap-wide hero__scope">
            <HeroScope />
          </div>
          <div className="wrap-wide gap-lg">
            <ShortAnswer />
          </div>
        </section>

        <section className="section" id="format">
          <div className="wrap prose">
            <div className="eyebrow">The destination</div>
            <h2>What a LeRobot dataset is</h2>
            <p className="gap-md">
              LeRobotDataset is a file layout plus a PyTorch loader. Collection writes it once. Every policy in LeRobot
              reads it the same way: ACT, Diffusion Policy, pi0, pi0.5, SmolVLA, GR00T.
            </p>
            <p>
              Version 3.0 (LeRobot 0.6) has three kinds of files: parquet tables for everything numeric, one MP4 stream per
              camera, and metadata that ties them together.
            </p>
          </div>
          <div className="wrap-wide gap-lg">
            <Anatomy />
          </div>
          <div className="wrap prose gap-lg">
            <h3>Ask in seconds, get rows</h3>
            <p style={{ marginTop: 10 }}>
              The loader's main trick is time windows. pi0, pi0.5 and SmolVLA predict 50 actions at once, ACT predicts 100.
              You ask in seconds; LeRobot turns each offset into a row offset with <code>round(dt × fps)</code>.
            </p>
          </div>
          <div className="wrap-wide gap-md">
            <DeltaWindow />
          </div>
          <div className="wrap gap-lg">
            <div className="callout callout--hazard">
              <div className="callout__title">The catch</div>
              <p>
                Row math only works if rows are exactly 1/fps apart and everything in a row happened at the same moment.
                The writer guarantees the first. Nothing in the format can check the second. Misaligned rows load, train and
                converge. They just teach the wrong timing.
              </p>
            </div>
          </div>
        </section>

        <section className="section" id="raw">
          <div className="wrap prose">
            <div className="eyebrow">The source</div>
            <h2>What a robot actually records</h2>
            <p className="gap-md">A teleop session on a real robot is several devices writing several logs, each on its own schedule.</p>
          </div>
          <div className="wrap gap-md">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Stream</th>
                    <th>Typical rate</th>
                    <th>Stamped by</th>
                    <th>Usual problem</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <span className="swatch" style={{ background: 'var(--ch-cam)' }} />
                      Cameras
                    </td>
                    <td className="num">30 Hz</td>
                    <td>camera PC</td>
                    <td>Stamped on arrival, tens of ms after exposure. Drops frames.</td>
                  </tr>
                  <tr>
                    <td>
                      <span className="swatch" style={{ background: 'var(--ch-joint)' }} />
                      Joint encoders
                    </td>
                    <td className="num">100-1000 Hz</td>
                    <td>robot controller</td>
                    <td>A different PC with a different clock.</td>
                  </tr>
                  <tr>
                    <td>
                      <span className="swatch" style={{ background: 'var(--ch-action)' }} />
                      Teleop commands
                    </td>
                    <td className="num">50-200 Hz</td>
                    <td>teleop PC</td>
                    <td>Runs ahead of the arm, by design.</td>
                  </tr>
                  <tr>
                    <td>
                      <span className="swatch" style={{ background: 'var(--ch-grip)' }} />
                      Gripper, buttons
                    </td>
                    <td className="num">on change</td>
                    <td>robot controller</td>
                    <td>Only logged when the value changes.</td>
                  </tr>
                  <tr>
                    <td>
                      <span className="swatch" style={{ background: 'var(--ink-3)' }} />
                      IMU, force-torque
                    </td>
                    <td className="num">200-1000+ Hz</td>
                    <td>sensor board</td>
                    <td>Noisy. Must be filtered before downsampling.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="wrap prose gap-lg">
            <p>Here is one grasp as those logs record it. Each stream says the fingers closed at a different time.</p>
          </div>
          <div className="wrap-wide gap-md">
            <RawStreams />
          </div>
          <div className="wrap gap-lg">
            <ul className="list">
              <li>
                <strong>Rates differ.</strong> 30 Hz frames, 500 Hz encoders, events. There is no row-for-row match to join on.
              </li>
              <li>
                <strong>Clocks differ.</strong> Each PC keeps its own time, off by milliseconds to seconds, and drifting. A
                typical 50 ppm crystal drifts 180 ms per hour.
              </li>
              <li>
                <strong>Delays differ.</strong> Loggers often stamp arrival, not capture. A USB frame can land tens of
                milliseconds after exposure.
              </li>
              <li>
                <strong>Some gaps are real.</strong> The teleop trigger leads the gripper by 40 ms because the operator acts
                first. Alignment removes clock error and keeps that lead. It is exactly what the policy should learn.
              </li>
            </ul>
          </div>
        </section>

        <section className="section" id="stakes">
          <div className="wrap prose">
            <div className="eyebrow">The stakes</div>
            <h2>Why a few milliseconds matter</h2>
            <p className="gap-md">
              A VLA learns one mapping: this image, this state, this instruction, then these actions. Every row is one example
              of it. If the image in a row is late, the example is wrong.
            </p>
          </div>
          <div className="wrap-wide gap-lg">
            <WhyItMatters />
          </div>
          <div className="wrap gap-lg">
            <ul className="list">
              <li>
                <strong>Late images.</strong> The image shows the gripper where it was. The state says where it is. The model
                learns geometry that disagrees with itself, worst during fast motion.
              </li>
              <li>
                <strong>Shifted actions.</strong> If action labels trail the images, the model learns to react to motion it can
                already see. On the robot this tends to show up as lag, hesitation or overshoot.
              </li>
              <li>
                <strong>Silent.</strong> Loss goes down either way. You find out on the robot.
              </li>
            </ul>
          </div>
        </section>

        <section className="section" id="sync">
          <div className="wrap prose">
            <div className="eyebrow">The fix</div>
            <h2>How time sync works</h2>
            <p className="gap-md">Five steps, in order. The first two fix time. The last three fix rate and catch what's left.</p>
          </div>
          <div className="wrap-wide gap-lg">
            <HowToSync />
          </div>
          <div className="wrap prose gap-lg">
            <p>
              The code is small. The hard part is steps 1 and 2: timestamps you can trust. Everything after that is
              bookkeeping.
            </p>
          </div>
          <div className="wrap-wide gap-md">
            <SyncCode />
          </div>
        </section>

        <section className="section" id="recorder">
          <div className="wrap prose">
            <div className="eyebrow">The exception</div>
            <h2>Why lerobot-record never made you do this</h2>
            <p className="gap-md">
              If your data came from <code>lerobot-record</code> on one arm, you never saw an alignment step. The record loop
              does a rough version of it while it records.
            </p>
          </div>
          <div className="wrap-wide gap-lg">
            <RecorderLoop />
          </div>
          <div className="wrap gap-lg">
            <ul className="list">
              <li>
                <strong>One loop, one clock.</strong> Each tick: read the motors, peek the newest camera frame, read the teleop
                action, send it, write a row. Everything in the row is the latest value at that tick.
              </li>
              <li>
                <strong>The frame is stale.</strong> <code>read_latest()</code> returns whatever frame is buffered. Here that is
                44 to 62 ms after exposure, depending on phase. It only raises once the frame is over 500 ms old.
              </li>
              <li>
                <strong>The stamp is nominal.</strong> The row gets <code>frame_index / fps</code>. A slow tick logs a warning
                and pushes every later tick back, but the stamps don't move.
              </li>
              <li>
                <strong>Fine for one arm on one PC.</strong> Not for fleet logs, several PCs, or sensors you want at native
                rate. That's why the slide has an alignment box.
              </li>
            </ul>
          </div>
        </section>

        <section className="section" id="pipeline">
          <div className="wrap prose">
            <div className="eyebrow">The slide</div>
            <h2>Reading the pipeline</h2>
            <p className="gap-md">
              Back to the slide. Two inputs, CPU and GPU steps, four bottlenecks. Time sync sits on the logs branch, before
              anything is labeled or trained.
            </p>
          </div>
          <div className="wrap-wide gap-lg">
            <PipelineMap />
          </div>
          <div className="wrap prose gap-lg">
            <p>
              Read it left to right. The left two thirds turn raw fleet data into aligned, labeled, curated episodes. The split
              writes them as LeRobot datasets. FT reads them. The orange boxes are where it gets slow: CPU and GPU stages that
              have to be scheduled together, decode that can't keep GPUs fed, and models too big for one GPU.
            </p>
          </div>
        </section>

        <section className="section" id="cheatsheet">
          <div className="wrap-wide">
            <div className="eyebrow">Keep this</div>
            <h2>Cheat sheet</h2>
          </div>
          <div className="wrap-wide gap-md">
            <CheatSheet />
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap-wide">
          <h2>Sources</h2>
          <p style={{ marginTop: 10, maxWidth: '44rem' }}>
            LeRobot facts come from its main-branch source (version 0.6.2, dataset codebase v3.0), commit {SHA.slice(0, 7)}{' '}
            of Oct 3, 2026. Latencies, offsets and joint values in the figures are illustrative.
          </p>
          <ul className="sources">
            <li>
              <a href={gh('src/lerobot/datasets/dataset_writer.py', 'L202-L227')}>dataset_writer.py · add_frame</a>
              <span>timestamp = frame_index / fps</span>
            </li>
            <li>
              <a href={gh('src/lerobot/datasets/feature_utils.py', 'L235-L257')}>feature_utils.py · validate_frame</a>
              <span>a passed-in timestamp is rejected</span>
            </li>
            <li>
              <a href={gh('src/lerobot/datasets/feature_utils.py', 'L174-L232')}>feature_utils.py · get_delta_indices</a>
              <span>round(dt × fps), multiples of 1/fps</span>
            </li>
            <li>
              <a href={gh('src/lerobot/datasets/dataset_reader.py', 'L305-L324')}>dataset_reader.py · _get_query_indices</a>
              <span>clamp to the episode, *_is_pad masks</span>
            </li>
            <li>
              <a href={gh('src/lerobot/datasets/video_utils.py', 'L190-L206')}>video_utils.py · decode tolerance</a>
              <span>frame must sit within tolerance_s</span>
            </li>
            <li>
              <a href={gh('src/lerobot/datasets/lerobot_dataset.py', 'L180-L184')}>lerobot_dataset.py · tolerance_s</a>
              <span>default 1e-4 s</span>
            </li>
            <li>
              <a href={gh('src/lerobot/cameras/opencv/camera_opencv.py', 'L585-L615')}>camera_opencv.py · read_latest</a>
              <span>newest buffered frame, raises past 500 ms</span>
            </li>
            <li>
              <a href={gh('src/lerobot/scripts/lerobot_record.py', 'L228-L330')}>lerobot_record.py · record_loop</a>
              <span>one tick: observe, act, add_frame</span>
            </li>
            <li>
              <a href={gh('src/lerobot/utils/cycle_timer.py', 'L104-L110')}>cycle_timer.py · CycleTimer</a>
              <span>sleeps to 1/fps, warns on slow ticks</span>
            </li>
            <li>
              <a href={gh('src/lerobot/datasets/utils.py', 'L89-L149')}>datasets/utils.py · v3 layout</a>
              <span>paths, 100 MB data and 200 MB video files</span>
            </li>
            <li>
              <a href={gh('src/lerobot/configs/video.py', 'L89-L92')}>configs/video.py · encoder defaults</a>
              <span>libsvtav1 (AV1), yuv420p, crf 30</span>
            </li>
            <li>
              <a href={gh('src/lerobot/policies/pi0/configuration_pi0.py', 'L37-L39')}>configuration_pi0.py · chunk_size</a>
              <span>50 actions per prediction</span>
            </li>
          </ul>
        </div>
      </footer>
    </>
  );
}
