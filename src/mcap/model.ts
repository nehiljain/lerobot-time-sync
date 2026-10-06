/*
  A small, faithful-in-shape MCAP file: 6 chunks of 2 s each, two channels, summary at the end.
  Record names, opcodes and fields follow the MCAP spec; byte sizes are illustrative.
*/

export type Group = 'framing' | 'definition' | 'data' | 'index' | 'extra';

export type Rec = {
  key: string;
  op: number | null; // null for the magic bytes, which are not a record
  name: string;
  group: Group;
  section: 'data' | 'summary' | 'end';
  bytes: number;
  units: number; // drawing width in units
  fields: [string, string][];
  purpose: string;
  chunk?: number; // for chunks and their message indexes
  t0?: number;
  t1?: number;
};

export const GROUP_COLOR: Record<Group, string> = {
  framing: '#7a8c9b',
  definition: 'var(--ch-action)',
  data: 'var(--ch-cam)',
  index: 'var(--ch-joint)',
  extra: 'var(--ch-grip)',
};

export const GROUP_LABEL: Record<Group, string> = {
  framing: 'framing',
  definition: 'schemas and channels',
  data: 'chunks of messages',
  index: 'indexes and stats',
  extra: 'attachments and metadata',
};

export const CHUNKS = 6;
export const CHUNK_SECONDS = 2;
export const CHUNK_BYTES = 8_000_000;

const hex = (n: number) => '0x' + n.toString(16).toUpperCase().padStart(2, '0');
export const opHex = (op: number | null) => (op === null ? 'none' : hex(op));

const chunkRecs: Rec[] = [];
for (let c = 0; c < CHUNKS; c++) {
  const t0 = c * CHUNK_SECONDS;
  const t1 = t0 + CHUNK_SECONDS;
  chunkRecs.push({
    key: `chunk${c}`,
    op: 0x06,
    name: 'Chunk',
    group: 'data',
    section: 'data',
    bytes: CHUNK_BYTES,
    units: 9,
    chunk: c,
    t0,
    t1,
    fields: [
      ['message_start_time', `${t0.toFixed(3)} s`],
      ['message_end_time', `${(t1 - 0.001).toFixed(3)} s`],
      ['uncompressed_size', '18.4 MB'],
      ['uncompressed_crc', '0x9F3A11C2'],
      ['compression', 'zstd'],
      ['records', 'Message records for both channels, compressed together'],
    ],
    purpose: 'A compressed batch of Message records. Readers decompress a whole chunk at a time.',
  });
  for (const ch of [1, 2]) {
    chunkRecs.push({
      key: `mi${c}-${ch}`,
      op: 0x07,
      name: 'Message Index',
      group: 'index',
      section: 'data',
      bytes: ch === 1 ? 960 : 16_000,
      units: 1.1,
      chunk: c,
      t0,
      t1,
      fields: [
        ['channel_id', `${ch}`],
        ['records', `[(log_time, offset), ...] for every channel ${ch} message in chunk ${c + 1}`],
      ],
      purpose: 'Where each message of one channel sits inside the uncompressed chunk, by log time.',
    });
  }
}

export const RECORDS: Rec[] = [
  { key: 'magic0', op: null, name: 'Magic', group: 'framing', section: 'data', bytes: 8, units: 1, fields: [['bytes', '0x89 M C A P 0 \\r \\n']], purpose: 'Eight bytes that say "this is MCAP, version 0".' },
  { key: 'header', op: 0x01, name: 'Header', group: 'framing', section: 'data', bytes: 40, units: 1.4, fields: [['profile', 'ros2'], ['library', 'libmcap 1.3.1 (rosbag2 on Jazzy)']], purpose: 'Which profile (conventions) the file follows and which library wrote it.' },
  { key: 'schema1', op: 0x03, name: 'Schema', group: 'definition', section: 'data', bytes: 1200, units: 1.4, fields: [['id', '1'], ['name', 'sensor_msgs/msg/CompressedImage'], ['encoding', 'ros2msg'], ['data', 'std_msgs/Header header\\nstring format\\nuint8[] data ...']], purpose: 'The message definition. Written once, before the first message that uses it.' },
  { key: 'channel1', op: 0x04, name: 'Channel', group: 'definition', section: 'data', bytes: 120, units: 1.4, fields: [['id', '1'], ['schema_id', '1'], ['topic', '/cam_front/image_raw/compressed'], ['message_encoding', 'cdr'], ['metadata', '{offered_qos_profiles: ...}']], purpose: 'A stream of messages: a topic plus how its bytes are encoded.' },
  { key: 'schema2', op: 0x03, name: 'Schema', group: 'definition', section: 'data', bytes: 900, units: 1.4, fields: [['id', '2'], ['name', 'sensor_msgs/msg/JointState'], ['encoding', 'ros2msg'], ['data', 'std_msgs/Header header\\nstring[] name\\nfloat64[] position ...']], purpose: 'The message definition for the second topic.' },
  { key: 'channel2', op: 0x04, name: 'Channel', group: 'definition', section: 'data', bytes: 110, units: 1.4, fields: [['id', '2'], ['schema_id', '2'], ['topic', '/joint_states'], ['message_encoding', 'cdr'], ['metadata', '{offered_qos_profiles: ...}']], purpose: 'A stream of messages: a topic plus how its bytes are encoded.' },
  ...chunkRecs,
  { key: 'dataend', op: 0x0f, name: 'Data End', group: 'framing', section: 'data', bytes: 13, units: 1.1, fields: [['data_section_crc', '0x00000000 (optional)']], purpose: 'Marks the end of the data section. Everything after it is summary.' },
  { key: 's-schema1', op: 0x03, name: 'Schema', group: 'definition', section: 'summary', bytes: 1200, units: 1, fields: [['id', '1'], ['name', 'sensor_msgs/msg/CompressedImage']], purpose: 'Repeated in the summary so a reader can decode without scanning the data section.' },
  { key: 's-schema2', op: 0x03, name: 'Schema', group: 'definition', section: 'summary', bytes: 900, units: 1, fields: [['id', '2'], ['name', 'sensor_msgs/msg/JointState']], purpose: 'Repeated in the summary so a reader can decode without scanning the data section.' },
  { key: 's-channel1', op: 0x04, name: 'Channel', group: 'definition', section: 'summary', bytes: 120, units: 1, fields: [['id', '1'], ['topic', '/cam_front/image_raw/compressed']], purpose: 'Repeated in the summary.' },
  { key: 's-channel2', op: 0x04, name: 'Channel', group: 'definition', section: 'summary', bytes: 110, units: 1, fields: [['id', '2'], ['topic', '/joint_states']], purpose: 'Repeated in the summary.' },
  { key: 'stats', op: 0x0b, name: 'Statistics', group: 'index', section: 'summary', bytes: 90, units: 1.4, fields: [['message_count', '6,360'], ['schema_count', '2'], ['channel_count', '2'], ['chunk_count', '6'], ['message_start_time', '0.000 s'], ['message_end_time', '11.999 s'], ['channel_message_counts', '{1: 360, 2: 6000}']], purpose: 'Counts and the time range, so "mcap info" is instant.' },
  ...Array.from({ length: CHUNKS }, (_, c): Rec => ({
    key: `ci${c}`,
    op: 0x08,
    name: 'Chunk Index',
    group: 'index',
    section: 'summary',
    bytes: 90,
    units: 1.1,
    chunk: c,
    t0: c * CHUNK_SECONDS,
    t1: (c + 1) * CHUNK_SECONDS,
    fields: [
      ['message_start_time', `${(c * CHUNK_SECONDS).toFixed(3)} s`],
      ['message_end_time', `${((c + 1) * CHUNK_SECONDS - 0.001).toFixed(3)} s`],
      ['chunk_start_offset', `byte ${(2_400 + c * (CHUNK_BYTES + 17_000)).toLocaleString()}`],
      ['chunk_length', `${CHUNK_BYTES.toLocaleString()} bytes`],
      ['message_index_offsets', '{1: ..., 2: ...}'],
      ['compression', 'zstd'],
    ],
    purpose: 'One per chunk: its time range and byte offset. This is what makes seeking cheap.',
  })),
  { key: 'attidx', op: 0x0a, name: 'Attachment Index', group: 'extra', section: 'summary', bytes: 60, units: 1, fields: [['name', 'calibration.yaml'], ['offset', '...'], ['media_type', 'application/yaml']], purpose: 'Where attachments (any file you want to ship along) live.' },
  { key: 'metaidx', op: 0x0d, name: 'Metadata Index', group: 'extra', section: 'summary', bytes: 50, units: 1, fields: [['name', 'rosbag2'], ['offset', '...']], purpose: 'Where Metadata records (string key-value maps) live.' },
  { key: 'sumoff', op: 0x0e, name: 'Summary Offset', group: 'index', section: 'summary', bytes: 30 * 6, units: 1.6, fields: [['group_opcode', '0x08 (Chunk Index), 0x03, 0x04, 0x0B, ...'], ['group_start', '...'], ['group_length', '...']], purpose: 'A table of contents for the summary: where each group of record types starts.' },
  { key: 'footer', op: 0x02, name: 'Footer', group: 'framing', section: 'end', bytes: 29, units: 1.6, fields: [['summary_start', 'byte offset of the summary section'], ['summary_offset_start', 'byte offset of the Summary Offset records'], ['summary_crc', 'CRC of the summary']], purpose: 'Fixed size, at a known distance from the end. Readers start here.' },
  { key: 'magic1', op: null, name: 'Magic', group: 'framing', section: 'end', bytes: 8, units: 1, fields: [['bytes', '0x89 M C A P 0 \\r \\n']], purpose: 'The same eight bytes again, so a reader can confirm the file is complete.' },
];

export const TOTAL_BYTES = RECORDS.reduce((a, r) => a + r.bytes, 0);

export function fmtBytes(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`;
  return `${n} B`;
}
