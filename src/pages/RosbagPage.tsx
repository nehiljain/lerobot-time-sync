import { Code } from '../components/Code';
import { GotchaWall } from '../components/GotchaWall';
import { PageFooter, SeriesEyebrow, Topbar } from '../components/SiteChrome';
import { BagAnatomy } from '../rosbag/BagAnatomy';
import { BagSize } from '../rosbag/BagSize';
import { BagToRows } from '../rosbag/BagToRows';
import { BusRecorder } from '../rosbag/BusRecorder';
import { ROSBAG_GOTCHAS, ROSBAG_SOURCES, ROSBAG_SNIPPET } from '../rosbag/content';
import { QosLatched } from '../rosbag/QosLatched';
import { StampJourney } from '../rosbag/StampJourney';
import { pageHref } from '../site';

const NAV = [
  { id: 'inside', label: 'What lands on disk' },
  { id: 'time', label: 'Three timestamps' },
  { id: 'qos', label: 'Latched topics' },
  { id: 'size', label: 'How fast it grows' },
  { id: 'train', label: 'Bag to rows' },
  { id: 'compare', label: 'ROS 1 vs ROS 2' },
  { id: 'gotchas', label: 'What still bites' },
];

export default function RosbagPage() {
  return (
    <>
      <Topbar page="rosbag" sections={NAV} />
      <main id="top">
        <section className="hero">
          <div className="wrap-wide">
            <SeriesEyebrow page="rosbag" extra="rosbag and rosbag2" />
            <h1 className="hero__title" style={{ maxWidth: '17ch' }}>
              A ROS bag records what the robot heard, <em>in the order it heard it.</em>
            </h1>
            <p className="lede hero__dek">
              The recorder is a subscriber that writes every message to disk with the time it arrived. That is the whole promise. Here is what it
              means when a bag becomes training data.
            </p>
          </div>
          <div className="wrap-wide hero__scope">
            <BusRecorder />
          </div>
          <div className="wrap-wide gap-lg">
            <div className="answer" role="region" aria-label="Short answer">
              <div className="answer__col">
                <h3>A bag gives you</h3>
                <ul className="list">
                  <li>Every message on the topics you chose, byte for byte.</li>
                  <li>The time the recorder received each one.</li>
                  <li>The message definitions needed to decode it later.</li>
                  <li>Replay: messages published again with their original spacing.</li>
                </ul>
              </div>
              <div className="answer__col answer__col--assumes">
                <h3>A bag doesn't give you</h3>
                <ul className="list">
                  <li>The time the sensor fired, or one clock across machines.</li>
                  <li>Messages the recorder never got: dropped under load, or sent before it subscribed.</li>
                  <li>Fixed-rate rows where image, state and action line up.</li>
                </ul>
              </div>
              <p className="answer__foot">
                <strong>Treat a bag as evidence, not a dataset.</strong> It tells you what arrived and when. Turning it into training rows is the
                alignment step from <a href={pageHref('lerobot')}>Part 1</a>.
              </p>
            </div>
          </div>
        </section>

        <section className="section" id="inside">
          <div className="wrap prose">
            <div className="eyebrow">On disk</div>
            <h2>What lands on disk</h2>
            <p className="gap-md">
              ROS 1 writes one <code>.bag</code> file: a stream of records, messages grouped into compressed chunks, and an index written at the end.
              ROS 2 writes a folder: a <code>metadata.yaml</code> plus one or more storage files. MCAP is the default from Iron on; Humble still
              defaults to sqlite3 <code>.db3</code> files.
            </p>
          </div>
          <div className="wrap-wide gap-lg">
            <BagAnatomy />
          </div>
        </section>

        <section className="section" id="time">
          <div className="wrap prose">
            <div className="eyebrow">Time</div>
            <h2>Three timestamps per message</h2>
            <p className="gap-md">
              A recorded message carries the time the recorder received it (and, from Jazzy, the time it was sent). Inside the message there is
              usually another time, <code>header.stamp</code>, set by whoever published it. The bag never looks at it, and none of these is
              guaranteed to be the moment the sensor captured the data.
            </p>
          </div>
          <div className="wrap-wide gap-lg">
            <StampJourney />
          </div>
        </section>

        <section className="section" id="qos">
          <div className="wrap prose">
            <div className="eyebrow">QoS</div>
            <h2>Latched topics and QoS</h2>
            <p className="gap-md">
              Some topics publish once and expect late subscribers to still get the message: <code>/tf_static</code>, robot descriptions, maps. In
              ROS 2 that is the transient_local durability setting, and whether you get the message depends on every publisher, the recorder and
              the player agreeing on it.
            </p>
          </div>
          <div className="wrap-wide gap-lg">
            <QosLatched />
          </div>
        </section>

        <section className="section" id="size">
          <div className="wrap prose">
            <div className="eyebrow">Disk</div>
            <h2>How fast a bag grows</h2>
            <p className="gap-md">
              Cameras dominate. A single raw 640×480 stream at 30 Hz is 27.6 MB/s, about 100 GB an hour. Recording on the robot means the disk has
              to keep up, or the recorder starts dropping messages.
            </p>
          </div>
          <div className="wrap-wide gap-lg">
            <BagSize />
          </div>
        </section>

        <section className="section" id="train">
          <div className="wrap prose">
            <div className="eyebrow">Training</div>
            <h2>From bag to training rows</h2>
            <p className="gap-md">
              You don't need a ROS install to read a bag. The pure-Python <code>rosbags</code> library reads ROS 1 and ROS 2 bags and deserializes
              messages, including MCAP-backed ones.
            </p>
          </div>
          <div className="wrap-wide gap-lg">
            <BagToRows />
          </div>
          <div className="wrap gap-lg">
            <Code title="Read a ROS 2 bag in plain Python" note="pip install rosbags">
              {ROSBAG_SNIPPET}
            </Code>
          </div>
          <div className="wrap gap-lg">
            <ul className="list">
              <li>
                <strong>Keep both times.</strong> Store the receive time and <code>header.stamp</code> per message. You will want both when you check
                alignment.
              </li>
              <li>
                <strong>Group by topic, then align.</strong> A bag interleaves topics by arrival. Training wants one table per topic, then one row per
                tick.
              </li>
              <li>
                <strong>Decode images last.</strong> Index everything first, choose the episode windows, then decode only the frames you keep.
              </li>
            </ul>
          </div>
        </section>

        <section className="section" id="compare">
          <div className="wrap prose">
            <div className="eyebrow">At a glance</div>
            <h2>ROS 1 vs ROS 2 bags</h2>
          </div>
          <div className="wrap gap-md">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th></th>
                    <th>ROS 1 rosbag</th>
                    <th>ROS 2 rosbag2</th>
                  </tr>
                </thead>
                <tbody id="compare-rows">
                  <CompareRows />
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section" id="gotchas">
          <div className="wrap prose">
            <div className="eyebrow">From the community</div>
            <h2>What still bites</h2>
            <p className="gap-md">
              Collected from the rosbag2 issue tracker, ROS Discourse and Robotics Stack Exchange. Each card links to the thread.
            </p>
          </div>
          <div className="wrap-wide gap-lg">
            <GotchaWall items={ROSBAG_GOTCHAS} label="Filter ROS bag gotchas" />
          </div>
        </section>
      </main>
      <PageFooter
        page="rosbag"
        intro={<>Format details come from the ROS wiki, the rosbag2 repository and REP 2000. Community items link to their threads. Rates, sizes and delays in the figures are illustrative unless a source is given.</>}
        sources={ROSBAG_SOURCES}
      />
    </>
  );
}

function CompareRows() {
  const rows: [string, string, string][] = [
    ['On disk', 'one .bag file (format 2.0)', 'a folder: metadata.yaml + storage files'],
    ['Storage', 'built in', 'plugins: MCAP (default from Iron), sqlite3 (default through Humble)'],
    ['Compression', 'per chunk: bz2 or lz4', 'MCAP chunk compression (zstd, lz4), or rosbag2 zstd per file or message'],
    ['Message definitions', 'full text in every connection record', 'MCAP: always; sqlite3: from Iron (Humble .db3 has none)'],
    ['Time per message', 'receive time at the recorder', 'recv_timestamp, plus send_timestamp from Jazzy'],
    ['Write buffer', '-b 256 MB by default', '--max-cache-size 100 MiB by default'],
    ['While recording', 'file named .bag.active', 'no marker'],
    ['After a crash', 'rosbag reindex', 'ros2 bag reindex, mcap recover'],
    ['Read without ROS', 'rosbags, mcap + mcap-ros1-support', 'rosbags, mcap + mcap-ros2-support'],
    ['Status', 'Noetic reached end of life in May 2025', 'Humble, Jazzy, Kilted, Lyrical supported'],
  ];
  return (
    <>
      {rows.map(([k, a, b]) => (
        <tr key={k}>
          <td>
            <strong>{k}</strong>
          </td>
          <td>{a}</td>
          <td>{b}</td>
        </tr>
      ))}
    </>
  );
}
