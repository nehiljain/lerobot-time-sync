import { GotchaWall } from '../components/GotchaWall';
import { PageFooter, SeriesEyebrow, Topbar, type SourceItem } from '../components/SiteChrome';
import { Anatomy } from '../sections/Anatomy';
import { CheatSheet } from '../sections/CheatSheet';
import { DeltaWindow } from '../sections/DeltaWindow';
import { HeroScope } from '../sections/HeroScope';
import { HowToSync, SyncCode } from '../sections/HowToSync';
import { PipelineMap } from '../sections/PipelineMap';
import { RawStreams } from '../sections/RawStreams';
import { RecorderLoop } from '../sections/RecorderLoop';
import { ShortAnswer } from '../sections/ShortAnswer';
import { WhyItMatters } from '../sections/WhyItMatters';
import { LEROBOT_GOTCHAS } from '../sections/lerobotGotchas';
import { LEROBOT_SHA, lerobotSrc } from '../site';

const NAV = [
  { id: 'format', label: 'Format' },
  { id: 'raw', label: 'Raw logs' },
  { id: 'stakes', label: 'Stakes' },
  { id: 'sync', label: 'Sync' },
  { id: 'recorder', label: 'Recorder' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'gotchas', label: 'What still bites' },
  { id: 'cheatsheet', label: 'Cheat sheet' },
];

const SOURCES: SourceItem[] = [
  { href: lerobotSrc('src/lerobot/datasets/dataset_writer.py', 'L202-L227'), label: 'dataset_writer.py · add_frame', note: 'timestamp = frame_index / fps' },
  { href: lerobotSrc('src/lerobot/datasets/feature_utils.py', 'L235-L257'), label: 'feature_utils.py · validate_frame', note: 'a passed-in timestamp is rejected' },
  { href: lerobotSrc('src/lerobot/datasets/feature_utils.py', 'L174-L232'), label: 'feature_utils.py · get_delta_indices', note: 'round(dt × fps), multiples of 1/fps' },
  { href: lerobotSrc('src/lerobot/datasets/dataset_reader.py', 'L305-L324'), label: 'dataset_reader.py · _get_query_indices', note: 'clamp to the episode, *_is_pad masks' },
  { href: lerobotSrc('src/lerobot/datasets/video_utils.py', 'L190-L206'), label: 'video_utils.py · decode tolerance', note: 'frame must sit within tolerance_s' },
  { href: lerobotSrc('src/lerobot/datasets/lerobot_dataset.py', 'L180-L184'), label: 'lerobot_dataset.py · tolerance_s', note: 'default 1e-4 s' },
  { href: lerobotSrc('src/lerobot/cameras/opencv/camera_opencv.py', 'L585-L615'), label: 'camera_opencv.py · read_latest', note: 'newest buffered frame, raises past 500 ms' },
  { href: lerobotSrc('src/lerobot/scripts/lerobot_record.py', 'L228-L330'), label: 'lerobot_record.py · record_loop', note: 'one tick: observe, act, add_frame' },
  { href: lerobotSrc('src/lerobot/utils/cycle_timer.py', 'L104-L110'), label: 'cycle_timer.py · CycleTimer', note: 'sleeps to 1/fps, warns on slow ticks' },
  { href: lerobotSrc('src/lerobot/datasets/utils.py', 'L89-L149'), label: 'datasets/utils.py · v3 layout', note: 'paths, 100 MB data and 200 MB video files' },
  { href: lerobotSrc('src/lerobot/configs/video.py', 'L89-L92'), label: 'configs/video.py · encoder defaults', note: 'libsvtav1 (AV1), yuv420p, crf 30' },
  { href: lerobotSrc('src/lerobot/policies/pi0/configuration_pi0.py', 'L37-L39'), label: 'configuration_pi0.py · chunk_size', note: '50 actions per prediction' },
];

export default function LeRobotPage() {
  return (
    <>
      <Topbar page="lerobot" sections={NAV} />
      <main id="top">
        <section className="hero">
          <div className="wrap-wide">
            <SeriesEyebrow page="lerobot" extra="Ray Summit 2026, VLA fine-tuning workflow" />
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
            <figure className="pullquote">
              <blockquote>
                "Training VLAs require synchronous 'snapshots' of the robotic system at each 1/fps... we preferred to store these synchronous
                snapshots (i.e. the state of all the system at a moment t), rather than all events happening in the system."
              </blockquote>
              <figcaption>
                Caroline Pascal, LeRobot maintainer, on why real hardware timestamps aren't stored ·{' '}
                <a href="https://github.com/huggingface/lerobot/issues/3513">issue #3513, June 2026</a>
              </figcaption>
            </figure>
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

        <section className="section" id="gotchas">
          <div className="wrap prose">
            <div className="eyebrow">From the community</div>
            <h2>What still bites</h2>
            <p className="gap-md">
              Open problems and gotchas from the LeRobot issue tracker and the Hugging Face forum, as of October 2026. Each card links to the thread.
              The pattern: decode speed, silent misalignment, and tools that assume one fps and identical features.
            </p>
          </div>
          <div className="wrap-wide gap-lg">
            <GotchaWall items={LEROBOT_GOTCHAS} label="Filter LeRobot gotchas" />
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

      <PageFooter
        page="lerobot"
        intro={
          <>
            LeRobot facts come from its main-branch source (version 0.6.2, dataset codebase v3.0), commit {LEROBOT_SHA.slice(0, 7)} of
            Oct 3, 2026. Latencies, offsets and joint values in the figures are illustrative.
          </>
        }
        sources={SOURCES}
      />
    </>
  );
}
