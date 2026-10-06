import { useState } from 'react';

/* The mcap CLI (Rust, v0.1+), commands and flags as documented. Output is trimmed and illustrative. */

type Cmd = { id: string; cmd: string; title: string; out: string[]; note: string; err?: boolean };

const CMDS: Cmd[] = [
  {
    id: 'info',
    title: 'What is in this file?',
    cmd: 'mcap info pick_cube_0.mcap',
    out: [
      'library:   libmcap 1.3.1',
      'profile:   ros2',
      'messages:  41870',
      'duration:  1m2.103s',
      'compression:',
      '        zstd: [62/62 chunks]',
      'chunks:',
      '        overlaps: no',
      'channels:',
      '        (1) /cam_front/image_raw/compressed   1863 msgs (30.00 Hz)',
      '        (2) /joint_states                    31050 msgs (500.00 Hz)',
    ],
    note: 'Reads the footer and the summary only, so it is instant even on large or remote files.',
  },
  {
    id: 'filter',
    title: 'Keep two topics and 30 seconds',
    cmd: "mcap filter pick_cube_0.mcap -o slim.mcap -y '/joint_states|/cam_front/.*' -S 2026-10-05T17:20:10Z -E 2026-10-05T17:20:40Z",
    out: ['wrote slim.mcap'],
    note: 'Start is inclusive, end exclusive. -l also keeps the last message before the start for matching topics, which is how you keep latched state.',
  },
  {
    id: 'cat',
    title: 'Dump ROS 2 messages as JSON',
    cmd: 'mcap cat pick_cube_0.mcap --topics /joint_states --format ndjson',
    out: ['error: decoded output only supported for ros1, protobuf, and json message encodings'],
    note: 'The CLI cannot decode ROS 2 CDR. Decode in Python with mcap-ros2-support, or open the file in Foxglove or Rerun.',
    err: true,
  },
  {
    id: 'convert',
    title: 'Turn a ROS 1 bag into MCAP',
    cmd: 'mcap convert pick_cube.bag pick_cube.mcap',
    out: ['wrote pick_cube.mcap'],
    note: 'Also converts ROS 2 .db3 from Iron on. Older .db3 files have no message definitions: use ros2 bag convert with the workspace sourced.',
  },
  {
    id: 'recover',
    title: 'Rescue a file from a crashed recorder',
    cmd: 'mcap recover crashed.mcap -o fixed.mcap; echo $?',
    out: ['3'],
    note: 'Rebuilds chunk indexes and the summary from what is on disk. Exit code 0: everything recovered, 3: some data lost, 1: nothing recovered.',
  },
  {
    id: 'doctor',
    title: 'Check that a file is well formed',
    cmd: 'mcap doctor fixed.mcap',
    out: ['(no output: no problems found)'],
    note: 'Validates CRCs, the footer, schema and channel consistency, chunk indexes against chunks, and message order.',
  },
  {
    id: 'sort',
    title: 'Fix out-of-order writes',
    cmd: 'mcap sort unordered.mcap -o sorted.mcap',
    out: ['wrote sorted.mcap'],
    note: 'Rewrites messages in log-time order. Unsorted files can make log-time-order readers hold many chunks in memory.',
  },
  {
    id: 'merge',
    title: 'Combine recordings',
    cmd: 'mcap merge arm.mcap cameras.mcap -o both.mcap',
    out: ['wrote both.mcap'],
    note: 'Identical channels are coalesced by default (--coalesce-channels auto). The help warns sequence values can collide after coalescing.',
  },
];

export function Terminal() {
  const [sel, setSel] = useState('info');
  const c = CMDS.find((x) => x.id === sel)!;
  return (
    <figure className="fig fig--screen" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 6</b> &nbsp;The mcap CLI in eight commands
        </div>
      </div>
      <div className="fig__body term">
        <div className="term__list" role="tablist" aria-label="mcap commands">
          {CMDS.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={sel === x.id} className="term__item" onClick={() => setSel(x.id)}>
              <span className="term__item-cmd mono">mcap {x.id}</span>
              <span className="term__item-title">{x.title}</span>
            </button>
          ))}
        </div>
        <div className="term__win" role="tabpanel" aria-live="polite">
          <div className="term__bar" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <pre className="term__screen mono">
            <span className="term__prompt">$ </span>
            {c.cmd}
            {'\n'}
            {c.out.map((l, i) => (
              <span key={i} className={c.err ? 'term__err' : 'term__out'}>
                {l}
                {'\n'}
              </span>
            ))}
          </pre>
          <p className="term__note">{c.note}</p>
        </div>
      </div>
      <p className="fig__note">
        The CLI was rewritten in Rust in June 2026; install with brew install mcap or a release binary. Output is trimmed; numbers are examples.
      </p>
    </figure>
  );
}
