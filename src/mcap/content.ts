import type { Gotcha } from '../components/GotchaWall';
import type { SourceItem } from '../components/SiteChrome';

const M = 'https://github.com/foxglove/mcap/blob/f123d254977ae09bcf924186e7d205954853acf2/';
const mi = (n: number) => ({ href: `https://github.com/foxglove/mcap/issues/${n}`, label: `mcap #${n}` });
const md = (n: number) => ({ href: `https://github.com/foxglove/mcap/discussions/${n}`, label: `mcap discussion #${n}` });
const r2 = (n: number) => ({ href: `https://github.com/ros2/rosbag2/issues/${n}`, label: `rosbag2 #${n}` });

// From the community research of 2026-10-06 (foxglove/mcap, ros2/rosbag2, spec, CLI source).
export const MCAP_GOTCHAS: Gotcha[] = [
  {
    status: 'workaround',
    area: 'crash',
    title: 'A killed recorder leaves no summary, and reindex won\'t fix it',
    body: 'The summary and footer are written on close, and messages in the open chunk die with the process. After `kill -9`, `ros2 bag reindex` leaves the bag unusable.',
    fix: '`mcap recover bad.mcap -o fixed.mcap`, then `mcap doctor`. Write the result to a new file.',
    links: [r2(2003), r2(1953), md(1833)],
  },
  {
    status: 'open',
    area: 'reading',
    title: 'Out-of-order writes blow up reader memory',
    body: 'A 24 GB file written out of log-time order by many threads drove one reader to about 30 GB. Readers keep chunks decompressed while their time ranges overlap.',
    fix: 'Read in file order (`log_time_order=False` in Python), or rewrite once with `mcap sort`. Check "overlaps" in `mcap info`.',
    links: [mi(1499)],
  },
  {
    status: 'open',
    area: 'time',
    title: 'Only log_time is indexed',
    body: 'Chunk ranges and message indexes use `log_time`. There is no `publish_time` index, so seeking by "measurement time" means scanning.',
    fix: 'Scan with `log_time_order=False` and sort by `publish_time` in memory, or keep your own index.',
    links: [md(1542), md(1595)],
  },
  {
    status: 'workaround',
    area: 'rosbag2',
    title: 'rosbag2 compression modes break indexing',
    body: 'Recording with `--compression-mode file` gives `.mcap.zstd` files that tools can\'t seek into, and message mode gives files Foxglove couldn\'t open. MCAP chunk compression keeps files indexable.',
    fix: '`ros2 bag record -s mcap --storage-preset-profile zstd_fast` (or `zstd_small`) instead of rosbag2 compression.',
    links: [r2(1533), r2(2445)],
  },
  {
    status: 'workaround',
    area: 'CLI',
    title: 'mcap cat can\'t decode ROS 2 messages',
    body: 'Decoded output (ndjson, csv) supports only the ros1, protobuf and json encodings. ROS 2 CDR fails with an error.',
    fix: 'Decode in Python with `mcap-ros2-support`, or view in Foxglove or Rerun.',
    links: [{ href: `${M}rust/cli/src/commands/cat.rs#L1111-L1113`, label: 'cat.rs' }],
  },
  {
    status: 'workaround',
    area: 'Python',
    title: 'Files without a summary are read linearly',
    body: 'If a file has no summary or chunk indexes, the Python reader falls back to reading the whole stream: no time seek, no topic skipping.',
    fix: 'Run mcap recover first, or write with chunking and a summary (the Python defaults do).',
    links: [{ href: `${M}python/mcap/mcap/reader.py#L296-L304`, label: 'reader.py' }],
  },
  {
    status: 'workaround',
    area: 'integrity',
    title: 'CRC checks are off in common paths',
    body: 'Python\'s `make_reader` does not validate CRCs by default, official writers write 0 for the data-section CRC, and rosbag2\'s `fastwrite` and `zstd_fast` presets skip CRCs.',
    fix: 'Pass `validate_crcs=True`, run `mcap doctor` on ingest, or record with the default or `zstd_small` preset.',
    links: [{ href: `${M}website/docs/reference/index.md`, label: 'support matrix' }],
  },
  {
    status: 'workaround',
    area: 'time',
    title: 'Time filters are half-open, in integer nanoseconds',
    body: '`start_time` is inclusive and `end_time` exclusive, so a message exactly at the end is dropped.',
    fix: 'Pass `end_time = last_ns + 1`.',
    links: [mi(1276)],
  },
  {
    status: 'workaround',
    area: 'time',
    title: 'The epoch is not fixed',
    body: 'Timestamps are nanoseconds since a "user-understood epoch": Unix time or robot boot time. Zero also means "no messages" in chunk ranges.',
    fix: 'Check the epoch of every file before aligning across machines, and never use 0 as a real time.',
    links: [{ href: `${M}website/docs/spec/index.md#L396-L398`, label: 'spec: Timestamp' }, mi(1458)],
  },
  {
    status: 'open',
    area: 'reading',
    title: 'Small topics share chunks with cameras',
    body: 'Messages from every channel go into the same chunks, so reading joint states also decompresses camera data. Independent channel groups are only a proposal.',
    fix: 'mcap filter -y \'<topic regex>\' -o slim.mcap once, then train from the slim file.',
    links: [md(1822)],
  },
  {
    status: 'workaround',
    area: 'Python',
    title: 'The Python library can\'t append',
    body: 'A maintainer: "Append functionality is not provided in the python library currently."',
    fix: 'Write new data to a separate file and `mcap merge` them.',
    links: [md(1154)],
  },
  {
    status: 'fixed',
    area: 'compatibility',
    title: 'Older vendored readers refuse some newer files',
    body: 'A first message larger than the chunk size produced an empty first chunk. The file is valid, but the C++ 1.3.0 reader assumed no message indexes anywhere and refused to read in time order.',
    fix: 'Raise `chunkSize` above your largest message, or read in file order on older distros.',
    links: [mi(1400)],
  },
  {
    status: 'fixed',
    area: 'CLI',
    title: 'Old mcap recover could fail or write unreadable files',
    body: 'Older Go CLI builds hard-stopped on a bad chunk or exited 0 with an unreadable result. Fixed in later builds and the Rust CLI.',
    fix: 'Check `mcap --version`; use the Rust CLI (v0.1.0 or later).',
    links: [mi(1390), mi(1474)],
  },
  {
    status: 'fixed',
    area: 'rosbag2',
    title: 'Some Jazzy bags have out-of-order log_time',
    body: 'After rosbag2 started storing middleware receive times, Fast DDS could deliver non-monotonic receive timestamps under reliable QoS with loss. Fixed upstream and in a Jazzy sync.',
    fix: 'Update Jazzy; check message order with `mcap doctor` on older bags.',
    links: [r2(2058)],
  },
];

export const MCAP_SOURCES: SourceItem[] = [
  { href: `${M}website/docs/spec/index.md`, label: 'MCAP specification', note: 'records, opcodes, time fields' },
  { href: `${M}website/docs/spec/registry.md`, label: 'MCAP well-known encodings', note: 'schema and message encodings, profiles' },
  { href: `${M}website/docs/spec/notes.md#L11-L31`, label: 'MCAP spec notes', note: 'how a reader seeks' },
  { href: `${M}website/docs/guides/cli.md`, label: 'mcap CLI guide', note: 'subcommands, recover, convert' },
  { href: `${M}rust/cli/src/cli.rs`, label: 'mcap CLI · cli.rs', note: 'filter, merge, sort flags' },
  { href: `${M}python/examples/ros2-noenv/reader.py#L1-L16`, label: 'mcap · ros2-noenv reader', note: 'the Python snippet' },
  { href: `${M}python/mcap/mcap/reader.py#L136-L180`, label: 'mcap Python · reader.py', note: 'log_time_order, half-open filters' },
  { href: 'https://github.com/foxglove/mcap/pull/1658', label: 'mcap PR #1658', note: 'chunk-size study: 1 MiB default' },
  { href: 'https://foxglove.dev/blog/understanding-mcap-chunk-size-and-compression', label: 'Foxglove · chunk size and compression', note: 'what dies with the open chunk' },
  { href: 'https://github.com/ros2/rosbag2/blob/ca049f3827f0e4f5cf9657ac8df8efe0ebf81855/rosbag2_storage_mcap/src/mcap_storage.cpp#L913-L914', label: 'rosbag2 · mcap_storage.cpp', note: 'log_time = receive, publish_time = send' },
  { href: 'https://github.com/ros2/rosbag2/blob/rolling/rosbag2_storage_mcap/README.md', label: 'rosbag2 · MCAP plugin README', note: 'presets: fastwrite, zstd_fast, zstd_small' },
  { href: 'https://rerun.io/docs/howto/logging-and-ingestion/mcap', label: 'Rerun · MCAP import', note: 'log and publish time as two timelines' },
];

export const MCAP_SNIPPET = `from mcap.reader import make_reader
from mcap_ros2.decoder import DecoderFactory

with open("pick_cube_0.mcap", "rb") as f:
    reader = make_reader(f, decoder_factories=[DecoderFactory()])
    for schema, channel, message, ros_msg in reader.iter_decoded_messages(topics=["/joint_states"]):
        # message.log_time: when it was recorded (ns). ros_msg.header.stamp: what the driver wrote.
        print(channel.topic, message.log_time, ros_msg.position)`;
