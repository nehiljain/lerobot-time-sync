import type { Gotcha } from '../components/GotchaWall';
import type { SourceItem } from '../components/SiteChrome';

const R2 = 'https://github.com/ros2/rosbag2/blob/e6803915796bae3a37cf836df1abb31440fb8cd3/';
const issue = (n: number) => ({ href: `https://github.com/ros2/rosbag2/issues/${n}`, label: `rosbag2 #${n}` });

// From the community research of 2026-10-06 (rosbag2 issues, ROS wiki, docs). Counts as read that day.
export const ROSBAG_GOTCHAS: Gotcha[] = [
  {
    status: 'workaround',
    area: 'recording',
    title: 'Messages drop silently when the write cache fills',
    body: 'rosbag2 buffers writes in a cache (CLI default 100 MiB, double-buffered). When the disk falls behind, new messages are dropped and counted. The total is printed once, as a WARN, when recording stops. One Humble report lost about 15k messages across 35 topics.',
    fix: 'Size `--max-cache-size` to about one second of data, record to a fast disk, prefer MCAP over sqlite3, and grep the shutdown log for "lost".',
    links: [issue(1579), { href: `${R2}rosbag2_cpp/src/rosbag2_cpp/cache/message_cache.cpp#L130-L160`, label: 'message_cache.cpp' }],
  },
  {
    status: 'open',
    area: 'recording',
    title: 'Recording can quietly stop',
    body: 'An open report: the bag file stops growing after 10 s to 20 min at about 10 MB/s, with "No error/warning prints in the logs". In that case the cause was in the middleware (rmw_zenoh) and a fix there made bags complete.',
    fix: 'Watch file growth during long recordings, not just the recorder process.',
    links: [issue(2463), { href: 'https://github.com/ros2/rmw_zenoh/pull/1036', label: 'rmw_zenoh #1036' }],
  },
  {
    status: 'open',
    area: 'splitting',
    title: 'Data can go missing at split boundaries',
    body: 'With 4 to 5 GB splits on an external drive, one user loses about a minute every ten. A maintainer: messages get lost "on the transport layer when we are doing a bag split". Splitting every second also raises CPU over time.',
    fix: 'Raise the subscription queue depth with a QoS override file, and keep splits modest in size.',
    links: [issue(2108), issue(2481)],
  },
  {
    status: 'workaround',
    area: 'QoS',
    title: '/tf_static is only latched if every publisher agrees',
    body: 'The recorder subscribes `transient_local` only when all publishers of a topic offer it. Otherwise it falls back to volatile and warns that previously published latched messages will not be retrieved. Playback reuses the recorded QoS only if the offers were uniform.',
    fix: 'Check `offered_qos_profiles` in `metadata.yaml`. Force the profile with `--qos-profile-overrides-path` on record and play.',
    links: [{ href: `${R2}rosbag2_storage/src/rosbag2_storage/qos.cpp#L332-L410`, label: 'qos.cpp' }],
  },
  {
    status: 'fixed',
    area: 'splitting',
    title: 'Split files before Lyrical lack /tf_static',
    body: 'A latched message is recorded once, into the first file. Later splits and snapshots don\'t repeat it, so a job that reads one split alone has no static transforms. Lyrical adds `--repeat-transient-local`.',
    fix: 'On older distros, read `tf_static` from the first split and carry it forward, or record it separately.',
    links: [issue(1159), issue(1886), { href: `${R2}README.md#L113-L160`, label: 'rosbag2 README' }],
  },
  {
    status: 'open',
    area: 'portability',
    title: 'Bags don\'t always replay on an older distro',
    body: '`metadata.yaml` version 9 writes QoS as strings instead of integers, so a bag recorded on Rolling fails on Humble. 17 comments, open since Jan 2025.',
    fix: 'A maintainer suggests clearing `offered_qos_profiles` in `metadata.yaml` by hand. Readers like rosbags don\'t care.',
    links: [issue(1895)],
  },
  {
    status: 'open',
    area: 'tooling',
    title: 'Nothing marks a bag that is still being recorded',
    body: 'ROS 1 named in-progress files `.bag.active`. ROS 2 has no marker, so an uploader can\'t tell a finished bag from a live one. 23 comments.',
    fix: 'Have your pipeline wait for `metadata.yaml` to be written, or for the recorder to exit, before uploading.',
    links: [issue(1597)],
  },
  {
    status: 'workaround',
    area: 'crash',
    title: 'A hard power-off can leave an empty MCAP and no metadata',
    body: 'The recorder writes `metadata.yaml` on close. Kill power and the folder can have an unindexed or empty MCAP. Closed as working as designed.',
    fix: 'Send `SIGINT` to the recorder itself on shutdown. To repair, run `mcap recover`; `ros2 bag reindex` alone does not rebuild MCAP indexes.',
    links: [issue(1953), issue(2003), { href: 'https://foxglove.dev/blog/understanding-mcap-chunk-size-and-compression', label: 'Foxglove: chunk size' }],
  },
  {
    status: 'fixed',
    area: 'definitions',
    title: 'Humble .db3 bags carry no message definitions',
    body: 'The sqlite3 plugin gained a `message_definitions` table in Iron. Humble .db3 bags can only be decoded if you have the exact message packages, which hurts for custom types.',
    fix: 'Record with `-s mcap` on Humble, or read with rosbags and pass a `default_typestore`.',
    links: [issue(782), { href: 'https://docs.foxglove.dev/docs/connecting-to-data/frameworks/ros2', label: 'Foxglove ROS 2 docs' }],
  },
  {
    status: 'fixed',
    area: 'timestamps',
    title: 'send_timestamp exists only from Jazzy',
    body: 'Jazzy bags store a receive and a send time per message. Humble and Iron store one time. Pipelines that compare the two need Jazzy or later.',
    fix: 'Use header.stamp for sensor time either way; check which distro recorded the bag (`ros_distro` in `metadata.yaml`).',
    links: [{ href: 'https://github.com/ros2/rosbag2/pull/1531', label: 'rosbag2 PR #1531' }],
  },
  {
    status: 'workaround',
    area: 'merging',
    title: 'Merging bags with ros2 bag convert can ignore time order',
    body: 'On older distros the merge was round-robin, not sorted by timestamp. `ros2 bag play -i a -i b` does interleave by reception time.',
    fix: 'Record related topics into one bag, or check message order after merging.',
    links: [issue(1845)],
  },
  {
    status: 'workaround',
    area: 'file names',
    title: 'Split file names changed in Lyrical',
    body: 'Humble to Kilted name splits `<folder>_<n>`. Lyrical uses `{n}_{prefix}_{date-time}`. Scripts that glob `*_0.mcap` break.',
    fix: 'Read the file list from `metadata.yaml` (`relative_file_paths`) instead of globbing.',
    links: [{ href: 'https://github.com/ros2/rosbag2/pull/2265', label: 'rosbag2 PR #2265' }],
  },
  {
    status: 'open',
    area: 'disk',
    title: 'The recorder writes until the disk is full',
    body: 'Size and file-count limits bound the bag, not the disk. An open feature request asks for a free-space stop.',
    fix: 'Put recordings on their own volume with a quota, or rotate with `--max-bag-files` (Lyrical).',
    links: [issue(2477)],
  },
];

export const ROSBAG_SOURCES: SourceItem[] = [
  { href: 'http://wiki.ros.org/Bags/Format/2.0', label: 'ROS wiki · Bags/Format/2.0', note: 'records, op codes, receive time' },
  { href: 'http://wiki.ros.org/rosbag/Commandline', label: 'ROS wiki · rosbag command line', note: 'record buffer 256 MB, chunks, reindex, --clock' },
  { href: 'https://github.com/ros/ros_comm/blob/30483a9f218f1545eec16d3934bf3cb042e2cb5b/tools/rosbag/src/recorder.cpp#L330-L335', label: 'ros_comm · recorder.cpp', note: 'Time::now() in the callback' },
  { href: `${R2}README.md`, label: 'rosbag2 · README', note: 'record and play options, splitting, compression, QoS' },
  { href: `${R2}rosbag2_storage/include/rosbag2_storage/serialized_bag_message.hpp#L33-L38`, label: 'rosbag2 · serialized_bag_message.hpp', note: 'recv_timestamp and send_timestamp' },
  { href: `${R2}rosbag2_storage/include/rosbag2_storage/yaml.hpp#L290-L306`, label: 'rosbag2 · yaml.hpp', note: 'metadata.yaml fields, version 9' },
  { href: `${R2}ros2bag/ros2bag/verb/record.py#L212`, label: 'rosbag2 · record.py', note: '--max-cache-size default 100 MiB' },
  { href: `${R2}rosbag2_storage/src/rosbag2_storage/qos.cpp#L332-L410`, label: 'rosbag2 · qos.cpp', note: 'QoS adaptation on record and play' },
  { href: 'https://github.com/ros2/rosbag2/pull/1160', label: 'rosbag2 PR #1160', note: 'MCAP becomes the default storage (Iron)' },
  { href: 'https://docs.ros.org/en/rolling/Releases.html', label: 'docs.ros.org · Releases', note: 'distros and end-of-life dates' },
  { href: 'https://gitlab.com/ternaris/rosbags/-/blob/47be3eed131d179e423559a517637db80ec6bb96/README.rst', label: 'rosbags · README', note: 'AnyReader snippet, rosbags-convert' },
  { href: 'https://docs.foxglove.dev/docs/connecting-to-data/frameworks/ros2', label: 'Foxglove · ROS 2 docs', note: '.db3 has no definitions before Iron' },
];

export const ROSBAG_SNIPPET = `from pathlib import Path
from rosbags.highlevel import AnyReader
from rosbags.typesys import Stores, get_typestore

# used only when the bag has no message definitions (Humble .db3)
typestore = get_typestore(Stores.ROS2_JAZZY)

with AnyReader([Path("pick_cube")], default_typestore=typestore) as reader:
    conns = [c for c in reader.connections if c.topic == "/joint_states"]
    for conn, t_recv, raw in reader.messages(connections=conns):
        msg = reader.deserialize(raw, conn.msgtype)
        # t_recv: when the recorder got it (ns). header.stamp: what the driver wrote.
        t_header = msg.header.stamp.sec + msg.header.stamp.nanosec * 1e-9`;
