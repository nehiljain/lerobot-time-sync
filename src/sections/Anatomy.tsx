import { useState, type ReactNode } from 'react';

type FileId = 'info' | 'stats' | 'tasks' | 'episodes' | 'data' | 'video';

type FileSpec = {
  id: FileId;
  name: string;
  path: string;
  depth: number;
  what: string;
};

const FILES: FileSpec[] = [
  { id: 'info', name: 'info.json', path: 'meta/info.json', depth: 1, what: 'The schema: fps, every feature and its shape, and path templates.' },
  { id: 'stats', name: 'stats.json', path: 'meta/stats.json', depth: 1, what: 'Mean, std, min and max per feature, used to normalize inputs.' },
  { id: 'tasks', name: 'tasks.parquet', path: 'meta/tasks.parquet', depth: 1, what: 'Task strings. The language half of a VLA input.' },
  {
    id: 'episodes',
    name: 'episodes/chunk-000/file-000.parquet',
    path: 'meta/episodes/chunk-000/file-000.parquet',
    depth: 1,
    what: 'Where each episode starts and ends inside the shared data and video files.',
  },
  {
    id: 'data',
    name: 'chunk-000/file-000.parquet',
    path: 'data/chunk-000/file-000.parquet',
    depth: 1,
    what: 'One row per tick, many episodes per file. State, action, timestamp, indices.',
  },
  {
    id: 'video',
    name: 'observation.images.front/chunk-000/file-000.mp4',
    path: 'videos/observation.images.front/chunk-000/file-000.mp4',
    depth: 1,
    what: "One camera's frames, AV1, many episodes back to back.",
  },
];

const GROUPS: { dir: string; ids: FileId[] }[] = [
  { dir: 'meta/', ids: ['info', 'stats', 'tasks', 'episodes'] },
  { dir: 'data/', ids: ['data'] },
  { dir: 'videos/', ids: ['video'] },
];

export function Anatomy() {
  const [sel, setSel] = useState<FileId>('data');
  const file = FILES.find((f) => f.id === sel)!;
  return (
    <figure className="fig anatomy" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 2</b> &nbsp;Inside a LeRobotDataset v3.0 · pick a file
        </div>
      </div>
      <div className="anatomy__grid">
        <nav className="tree" aria-label="Dataset files">
          <div className="tree__root mono">so101_pick_place/</div>
          {GROUPS.map((g) => (
            <div key={g.dir} className="tree__group">
              <div className="tree__dir mono">{g.dir}</div>
              {g.ids.map((id) => {
                const f = FILES.find((x) => x.id === id)!;
                return (
                  <button
                    key={id}
                    type="button"
                    className="tree__file mono"
                    aria-pressed={sel === id}
                    onClick={() => setSel(id)}
                  >
                    {f.name}
                  </button>
                );
              })}
            </div>
          ))}
          <p className="tree__note">
            v3.0 packs many episodes into each file (about 100 MB of parquet, 200 MB of video), so a million episodes
            don't mean a million files.
          </p>
        </nav>
        <div className="preview" aria-live="polite">
          <div className="preview__path mono">{file.path}</div>
          <p className="preview__what">{file.what}</p>
          <div className="preview__body">{PREVIEWS[sel]}</div>
        </div>
      </div>
    </figure>
  );
}

const Hl = ({ children }: { children: ReactNode }) => <mark className="hl">{children}</mark>;

const PREVIEWS: Record<FileId, ReactNode> = {
  info: (
    <>
      <pre className="code code--light">
        {`{
  "codebase_version": "v3.0",
  "robot_type": "so101_follower",
  `}
        <Hl>{`"fps": 30,`}</Hl>
        {`
  "total_episodes": 50,
  "total_frames": 22500,
  "features": {
    "observation.images.front": { "dtype": "video", "shape": [480, 640, 3] },
    "observation.state": { "dtype": "float32", "shape": [6],
      "names": ["shoulder_pan.pos", "shoulder_lift.pos", "elbow_flex.pos",
                "wrist_flex.pos", "wrist_roll.pos", "gripper.pos"] },
    "action":        { "dtype": "float32", "shape": [6] },
    "timestamp":     { "dtype": "float32", "shape": [1] },
    "frame_index":   { "dtype": "int64",   "shape": [1] },
    "episode_index": { "dtype": "int64",   "shape": [1] },
    "index":         { "dtype": "int64",   "shape": [1] },
    "task_index":    { "dtype": "int64",   "shape": [1] }
  },
  "data_path":  "data/chunk-{chunk_index:03d}/file-{file_index:03d}.parquet",
  "video_path": "videos/{video_key}/chunk-{chunk_index:03d}/file-{file_index:03d}.mp4"
}`}
      </pre>
      <p className="preview__callout">
        <strong>One fps for every feature.</strong> Image, state and action share a row, so they share a rate. A 500 Hz
        encoder can't live natively next to a 30 Hz camera.
      </p>
    </>
  ),
  stats: (
    <>
      <pre className="code code--light">
        {`{
  "observation.state": {
    "mean": [  1.8, -41.2,  37.5,  66.0, -3.1, 12.4],
    "std":  [ 18.9,  22.7,  24.1,  11.8, 20.5, 14.0],
    "min":  [-61.0, -99.1, -22.4,  27.9, -88.3,  0.0],
    "max":  [ 58.7,  12.6,  98.2,  99.0,  79.5, 46.1]
  },
  "action": { "mean": [...], "std": [...], ... },
  "observation.images.front": { "mean": [[[0.47]], [[0.44]], [[0.41]]], ... }
}`}
      </pre>
      <p className="preview__callout">Example values. Policies normalize inputs and outputs with these before training.</p>
    </>
  ),
  tasks: (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>task_index</th>
              <th>task</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="num">0</td>
              <td>Pick up the red cube and place it in the bin.</td>
            </tr>
            <tr>
              <td className="num">1</td>
              <td>Push the red cube to the left edge of the mat.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="preview__callout">
        Each row in <code>data/</code> carries a <code>task_index</code>. The loader hands the string to the policy as
        the instruction.
      </p>
    </>
  ),
  episodes: (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>episode_index</th>
              <th>length</th>
              <th>dataset_from_index</th>
              <th>dataset_to_index</th>
              <th>videos/…front/from_timestamp</th>
              <th>to_timestamp</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="num">0</td>
              <td className="num">450</td>
              <td className="num">0</td>
              <td className="num">450</td>
              <td className="num">0.000</td>
              <td className="num">15.000</td>
            </tr>
            <tr>
              <td className="num">1</td>
              <td className="num">512</td>
              <td className="num">450</td>
              <td className="num">962</td>
              <td className="num">15.000</td>
              <td className="num">32.067</td>
            </tr>
            <tr>
              <td className="num">2</td>
              <td className="num">431</td>
              <td className="num">962</td>
              <td className="num">1393</td>
              <td className="num">32.067</td>
              <td className="num">46.433</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="preview__callout">
        Episode 1 is rows 450 to 961 of the parquet file and 15.000 s to 32.067 s of the video. 512 frames at 30 fps is
        17.067 s.
      </p>
    </>
  ),
  data: (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>index</th>
              <th>episode_index</th>
              <th>frame_index</th>
              <th className="th-hl">timestamp</th>
              <th>observation.state</th>
              <th>action</th>
              <th>task_index</th>
            </tr>
          </thead>
          <tbody>
            {[
              [450, 0, '0.000', '[12.1, −40.3, …]', '[12.4, −39.8, …]'],
              [451, 1, '0.033', '[12.3, −40.0, …]', '[12.9, −39.1, …]'],
              [452, 2, '0.067', '[12.8, −39.5, …]', '[13.6, −38.2, …]'],
              [453, 3, '0.100', '[13.5, −38.8, …]', '[14.4, −37.0, …]'],
              [454, 4, '0.133', '[14.3, −37.9, …]', '[15.3, −35.9, …]'],
            ].map(([i, f, t, s, a]) => (
              <tr key={i}>
                <td className="num">{i}</td>
                <td className="num">1</td>
                <td className="num">{f}</td>
                <td className="num td-hl">{t}</td>
                <td className="num">{s}</td>
                <td className="num">{a}</td>
                <td className="num">0</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="preview__callout">
        <strong>
          <code>timestamp = frame_index / fps</code>.
        </strong>{' '}
        The writer computes it in <code>add_frame()</code> and rejects one passed in. A row records which tick it is, not
        when its sensors fired.
      </p>
    </>
  ),
  video: (
    <>
      <VideoStrip />
      <p className="preview__callout">
        A row's frame is fetched at <code>from_timestamp + timestamp</code>: row 3 of episode 1 reads video time 15.100 s.
        If the nearest decoded frame is more than <code>tolerance_s</code> (default 1e-4 s, 0.1 ms) away, loading fails
        with "This might be due to synchronization issues with timestamps during data collection."
      </p>
    </>
  ),
};

function VideoStrip() {
  const frames = Array.from({ length: 8 }, (_, i) => i);
  return (
    <div className="vstrip" role="img" aria-label="Eight consecutive video frames from episode 1, 33 ms apart, starting at 15.000 seconds">
      {frames.map((i) => {
        const pose = -0.6 + i * 0.14;
        const ang = (-62 + pose * 42) * (Math.PI / 180);
        return (
          <div key={i} className={`vstrip__frame${i === 3 ? ' is-hl' : ''}`}>
            <svg viewBox="0 0 48 34" aria-hidden="true">
              <rect width="48" height="34" rx="3" fill="#1e2b37" />
              <line x1="10" y1="27" x2={10 + Math.cos(ang) * 24} y2={27 + Math.sin(ang) * 24} stroke="#dbe3ea" strokeWidth="2" strokeLinecap="round" />
              <rect x="34" y="24" width="7" height="7" rx="1" fill="#d45a5a" />
            </svg>
            <span className="mono">{(15 + i / 30).toFixed(3)}</span>
          </div>
        );
      })}
    </div>
  );
}
