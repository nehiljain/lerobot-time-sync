import { useState } from 'react';
import { Seg } from '../components/controls';
import { useElementWidth } from '../lib/hooks';
import { pageHref } from '../site';

/* ROS 1: one .bag file of records (format 2.0). ROS 2: a folder with metadata.yaml and storage files. */

type R1 = { key: string; name: string; op: string; units: number; color: string; fields: [string, string][]; purpose: string };

const C_FRAME = '#7a8c9b';
const C_DATA = 'var(--ch-cam)';
const C_CONN = 'var(--ch-action)';
const C_INDEX = 'var(--ch-joint)';

const ROS1: R1[] = [
  { key: 'magic', name: 'Version line', op: 'none', units: 1.2, color: C_FRAME, fields: [['text', '#ROSBAG V2.0\\n']], purpose: 'A text line that names the format version.' },
  {
    key: 'bagheader',
    name: 'Bag header',
    op: '0x03',
    units: 2,
    color: C_FRAME,
    fields: [
      ['index_pos', 'offset of the first record after the last chunk'],
      ['conn_count', 'number of unique connections (topics)'],
      ['chunk_count', 'number of chunks'],
      ['padding', 'record padded to 4096 bytes so it can be rewritten in place'],
    ],
    purpose: 'Written first with placeholders, then rewritten on close to point at the index.',
  },
  ...[0, 1, 2].flatMap((c): R1[] => [
    {
      key: `chunk${c}`,
      name: 'Chunk',
      op: '0x05',
      units: 9,
      color: C_DATA,
      fields: [
        ['compression', 'none, bz2 or lz4'],
        ['size', 'uncompressed size of the records inside'],
        ['data', c === 0 ? 'Connection records, then Message data records' : 'Message data records (and any new Connections)'],
      ],
      purpose: 'A compressed batch of records. Each Message data record holds conn id, receive time and the serialized message.',
    },
    {
      key: `index${c}`,
      name: 'Index data',
      op: '0x04',
      units: 1.6,
      color: C_INDEX,
      fields: [
        ['ver', '1'],
        ['conn', 'connection id'],
        ['count', 'messages of this connection in the chunk'],
        ['data', '(time, offset) per message, offset into the uncompressed chunk'],
      ],
      purpose: 'One per connection after each chunk: where every message of that topic sits, by time.',
    },
  ]),
  {
    key: 'conns',
    name: 'Connection',
    op: '0x07',
    units: 2.4,
    color: C_CONN,
    fields: [
      ['conn', 'connection id'],
      ['topic', '/joint_states'],
      ['data', 'topic, type, md5sum, message_definition (full text), callerid, latching'],
    ],
    purpose: 'Repeated at the end so readers can decode without scanning. Carries the full message definition text.',
  },
  {
    key: 'chunkinfo',
    name: 'Chunk info',
    op: '0x06',
    units: 2.4,
    color: C_INDEX,
    fields: [
      ['ver', '1'],
      ['chunk_pos', 'offset of the chunk'],
      ['start_time / end_time', 'time range of messages in the chunk'],
      ['count', 'connections in the chunk, then (conn, count) pairs'],
    ],
    purpose: 'One per chunk: its time range and position. Together with Index data this is what lets rosbag seek by time.',
  },
];

const META_YAML = `rosbag2_bagfile_information:
  version: 9
  storage_identifier: mcap
  duration:
    nanoseconds: 62103450000
  starting_time:
    nanoseconds_since_epoch: 1759701200000000000
  message_count: 41870
  topics_with_message_count:
    - topic_metadata:
        name: /joint_states
        type: sensor_msgs/msg/JointState
        serialization_format: cdr
        offered_qos_profiles: [...]
      message_count: 31050
    - topic_metadata:
        name: /cam_front/image_raw/compressed
        type: sensor_msgs/msg/CompressedImage
        serialization_format: cdr
      message_count: 1863
  compression_format: ""
  compression_mode: ""
  relative_file_paths:
    - pick_cube_0.mcap
    - pick_cube_1.mcap
  files:
    - path: pick_cube_0.mcap
      message_count: 30120
    - path: pick_cube_1.mcap
      message_count: 11750
  ros_distro: jazzy`;

export function BagAnatomy() {
  const [ver, setVer] = useState<'ros1' | 'ros2'>('ros1');
  const [sel, setSel] = useState('chunkinfo');
  const [ref, W0] = useElementWidth<HTMLDivElement>(1000);
  const W = Math.max(W0, 720);
  const units = ROS1.reduce((a, r) => a + r.units, 0);
  const gap = 3;
  const u = (W - gap * (ROS1.length - 1)) / units;
  const rec = ROS1.find((r) => r.key === sel)!;
  let x = 0;

  return (
    <figure className="fig fig--screen" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 2</b> &nbsp;{ver === 'ros1' ? 'Inside a ROS 1 .bag (format 2.0) · click a record' : 'A ROS 2 bag is a folder'}
        </div>
        <div className="fig__controls">
          <Seg
            label="ROS version"
            value={ver}
            onChange={setVer}
            options={[
              { value: 'ros1', label: 'ROS 1 · .bag' },
              { value: 'ros2', label: 'ROS 2 · folder' },
            ]}
          />
        </div>
      </div>
      <div className="fig__body">
        {ver === 'ros1' ? (
          <>
            <div className="hscroll" ref={ref}>
              <svg className="fig__svg" width={W} height={96} viewBox={`0 0 ${W} 96`} style={{ minWidth: 720 }} role="group" aria-label="ROS 1 bag records">
                <text x={0} y={12} fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
                  chunks and their indexes, written as the recording runs
                </text>
                <text x={W} y={12} textAnchor="end" fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
                  index section, written on close
                </text>
                {ROS1.map((r) => {
                  const w = r.units * u;
                  const xx = x;
                  x += w + gap;
                  const on = r.key === sel;
                  return (
                    <g
                      key={r.key}
                      className="strip-rec"
                      role="button"
                      tabIndex={0}
                      aria-label={`${r.name} record`}
                      onClick={() => setSel(r.key)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSel(r.key);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <rect x={xx} y={26} width={w} height={46} rx={4} fill={r.color} fillOpacity={on ? 1 : 0.55} />
                      {on && <rect x={xx - 1.5} y={24.5} width={w + 3} height={49} rx={5} fill="none" stroke="var(--screen-ink)" strokeWidth={2} />}
                      {r.name === 'Chunk' && (
                        <text x={xx + w / 2} y={53} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen)">
                          chunk · lz4
                        </text>
                      )}
                      <text x={xx + w / 2} y={88} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
                        {r.op === 'none' ? '' : r.op}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="rec-panel" aria-live="polite">
              <div className="rec-panel__head">
                <span className="rec-panel__op mono" style={{ borderColor: rec.color }}>
                  {rec.op === 'none' ? 'not a record' : `op ${rec.op}`}
                </span>
                <h3>{rec.name}</h3>
              </div>
              <p className="rec-panel__purpose">{rec.purpose}</p>
              <dl className="rec-panel__fields">
                {rec.fields.map(([k, v]) => (
                  <div key={k}>
                    <dt className="mono">{k}</dt>
                    <dd className="mono">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </>
        ) : (
          <div className="folder">
            <div className="folder__tree mono">
              <div className="folder__row folder__row--dir">pick_cube/</div>
              <div className="folder__row folder__row--hl">├── metadata.yaml</div>
              <a className="folder__row folder__row--link" href={pageHref('mcap')}>
                ├── pick_cube_0.mcap <span>→ Part 3</span>
              </a>
              <a className="folder__row folder__row--link" href={pageHref('mcap')}>
                └── pick_cube_1.mcap <span>→ Part 3</span>
              </a>
              <p className="folder__note">
                Split files appear when you record with a size or duration limit. Older bags, and bags recorded with the sqlite3 plugin, have
                .db3 files instead.
              </p>
            </div>
            <pre className="code folder__yaml">{META_YAML}</pre>
          </div>
        )}
      </div>
      <p className="fig__note">
        {ver === 'ros1'
          ? 'If recording dies before close, the index section and the bag header pointer are never written. rosbag reindex rebuilds them by scanning the chunks.'
          : 'metadata.yaml (excerpt) describes the whole bag: duration, message counts per topic, QoS, split files. The storage files hold the messages.'}
      </p>
    </figure>
  );
}
