import { Code } from '../components/Code';
import { GotchaWall } from '../components/GotchaWall';
import { PageFooter, SeriesEyebrow, Topbar } from '../components/SiteChrome';
import { CrashLab } from '../mcap/CrashLab';
import { EncodingPicker } from '../mcap/EncodingPicker';
import { McapHero } from '../mcap/McapHero';
import { MCAP_GOTCHAS, MCAP_SNIPPET, MCAP_SOURCES } from '../mcap/content';
import { RecordExplorer } from '../mcap/RecordExplorer';
import { Terminal } from '../mcap/Terminal';
import { TimeFields } from '../mcap/TimeFields';
import { pageHref } from '../site';

const NAV = [
  { id: 'layout', label: 'Front to back' },
  { id: 'time', label: 'Two timestamps' },
  { id: 'crash', label: 'When the writer dies' },
  { id: 'encodings', label: 'Any message type' },
  { id: 'tools', label: 'Tools' },
  { id: 'gotchas', label: 'What still bites' },
];

export default function McapPage() {
  return (
    <>
      <Topbar page="mcap" sections={NAV} />
      <main id="top">
        <section className="hero">
          <div className="wrap-wide">
            <SeriesEyebrow page="mcap" extra="the container under ROS 2 bags" />
            <h1 className="hero__title" style={{ maxWidth: '16ch' }}>
              MCAP is a log file that <em>knows where everything is.</em>
            </h1>
            <p className="lede hero__dek">
              One file, any message type, written front to back and indexed at the end. ROS 2 bags use it by default. Here is how it is laid out,
              how a reader finds one message without reading the rest, and what breaks.
            </p>
          </div>
          <div className="wrap-wide hero__scope">
            <McapHero />
          </div>
          <div className="wrap-wide gap-lg">
            <div className="answer" role="region" aria-label="Short answer">
              <div className="answer__col">
                <h3>MCAP gives you</h3>
                <ul className="list">
                  <li>Self-describing files: every schema is inside.</li>
                  <li>Any serialization: ROS 1, ROS 2 CDR, Protobuf, FlatBuffers, JSON.</li>
                  <li>Seek by time and topic through the summary at the end.</li>
                  <li>Append-only writes, and recovery of every finished chunk after a crash.</li>
                </ul>
              </div>
              <div className="answer__col answer__col--assumes">
                <h3>MCAP leaves to you</h3>
                <ul className="list">
                  <li>What the timestamps mean for your sensors.</li>
                  <li>Decoding the bytes: you need a decoder for each encoding.</li>
                  <li>Lining topics up into rows for training.</li>
                </ul>
              </div>
              <p className="answer__foot">
                <strong>MCAP is a container, like MP4 is for video.</strong> It stores and indexes messages; it doesn't interpret them. Alignment is
                still <a href={pageHref('lerobot')}>Part 1</a>.
              </p>
            </div>
          </div>
        </section>

        <section className="section" id="layout">
          <div className="wrap prose">
            <div className="eyebrow">Layout</div>
            <h2>The file, front to back</h2>
            <p className="gap-md">
              An MCAP file is a sequence of records between two copies of an 8-byte magic. The data section holds schemas, channels and chunks of
              messages. The summary section repeats the definitions and lists every chunk with its time range. The footer points at the summary.
            </p>
          </div>
          <div className="wrap-wide gap-lg">
            <RecordExplorer />
          </div>
        </section>

        <section className="section" id="time">
          <div className="wrap prose">
            <div className="eyebrow">Time</div>
            <h2>Two timestamps per message</h2>
            <p className="gap-md">
              Every Message record has a <code>log_time</code> and a <code>publish_time</code>. In a rosbag2 file they are the recorder's receive
              time and the publisher's send time. The payload usually has a third, the ROS <code>header.stamp</code>. They answer different
              questions.
            </p>
          </div>
          <div className="wrap-wide gap-lg">
            <TimeFields />
          </div>
        </section>

        <section className="section" id="crash">
          <div className="wrap prose">
            <div className="eyebrow">Failure</div>
            <h2>When the writer dies</h2>
            <p className="gap-md">
              The summary and footer are written last. If the robot loses power, the file has finished chunks and nothing that indexes them. Tools can
              rebuild the index from what's there.
            </p>
          </div>
          <div className="wrap-wide gap-lg">
            <CrashLab />
          </div>
        </section>

        <section className="section" id="encodings">
          <div className="wrap prose">
            <div className="eyebrow">Encodings</div>
            <h2>Any message type</h2>
            <p className="gap-md">
              A Schema record says how to read the bytes; a Channel record says which encoding its messages use. The same file can mix ROS 2
              topics, Protobuf and JSON.
            </p>
          </div>
          <div className="wrap-wide gap-lg">
            <EncodingPicker />
          </div>
        </section>

        <section className="section" id="tools">
          <div className="wrap prose">
            <div className="eyebrow">Tools</div>
            <h2>Tools you'll actually use</h2>
            <p className="gap-md">
              The <code>mcap</code> CLI, rewritten in Rust this year, covers inspection, filtering, merging, sorting, converting ROS 1 bags and
              recovery. In Python, the <code>mcap</code> package reads files and <code>mcap-ros2-support</code> decodes CDR without a ROS install.
            </p>
          </div>
          <div className="wrap-wide gap-lg">
            <Terminal />
          </div>
          <div className="wrap gap-lg">
            <Code title="Read and decode ROS 2 messages in Python" note="pip install mcap mcap-ros2-support">
              {MCAP_SNIPPET}
            </Code>
          </div>
        </section>

        <section className="section" id="gotchas">
          <div className="wrap prose">
            <div className="eyebrow">From the community</div>
            <h2>What still bites</h2>
            <p className="gap-md">Collected from the foxglove/mcap and rosbag2 issue trackers and ROS Discourse. Each card links to the thread.</p>
          </div>
          <div className="wrap-wide gap-lg">
            <GotchaWall items={MCAP_GOTCHAS} label="Filter MCAP gotchas" />
          </div>
        </section>
      </main>
      <PageFooter
        page="mcap"
        intro={<>Format facts come from the MCAP specification and the foxglove/mcap repository. Byte sizes and times in the figures are illustrative; record names, opcodes and fields follow the spec.</>}
        sources={MCAP_SOURCES}
      />
    </>
  );
}
