import { useState } from 'react';
import { Seg } from '../components/controls';

/*
  The same three numbers, x=1.0 y=2.0 z=3.0, in four encodings MCAP can carry.
  Bytes are exact: float64 little-endian 1.0 = 00 00 00 00 00 00 F0 3F, 2.0 = ... 00 40, 3.0 = ... 08 40.
*/

type Enc = 'ros2' | 'ros1' | 'protobuf' | 'json';
type Part = { label: string; bytes: number[]; tone: 'meta' | 'x' | 'y' | 'z' };

const F = {
  x: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0, 0x3f],
  y: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40],
  z: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x40],
};
const ascii = (s: string) => Array.from(new TextEncoder().encode(s));

const ENCODINGS: Record<
  Enc,
  { label: string; schemaName: string; schemaEncoding: string; schemaData: string; messageEncoding: string; parts: Part[]; note: string }
> = {
  ros2: {
    label: 'ROS 2',
    schemaName: 'geometry_msgs/msg/Vector3',
    schemaEncoding: 'ros2msg',
    schemaData: 'float64 x\nfloat64 y\nfloat64 z',
    messageEncoding: 'cdr',
    parts: [
      { label: 'CDR header: little-endian', bytes: [0x00, 0x01, 0x00, 0x00], tone: 'meta' },
      { label: 'x = 1.0', bytes: F.x, tone: 'x' },
      { label: 'y = 2.0', bytes: F.y, tone: 'y' },
      { label: 'z = 3.0', bytes: F.z, tone: 'z' },
    ],
    note: 'ROS 2 serializes with CDR: a 4-byte encapsulation header, then fields with alignment. Decoding needs the schema text.',
  },
  ros1: {
    label: 'ROS 1',
    schemaName: 'geometry_msgs/Vector3',
    schemaEncoding: 'ros1msg',
    schemaData: 'float64 x\nfloat64 y\nfloat64 z',
    messageEncoding: 'ros1',
    parts: [
      { label: 'x = 1.0', bytes: F.x, tone: 'x' },
      { label: 'y = 2.0', bytes: F.y, tone: 'y' },
      { label: 'z = 3.0', bytes: F.z, tone: 'z' },
    ],
    note: 'ROS 1 serialization is packed little-endian fields with no header. This is what mcap convert carries over from a .bag.',
  },
  protobuf: {
    label: 'Protobuf',
    schemaName: 'demo.Vector3',
    schemaEncoding: 'protobuf',
    schemaData: '<binary FileDescriptorSet>\nmessage Vector3 { double x = 1; double y = 2; double z = 3; }',
    messageEncoding: 'protobuf',
    parts: [
      { label: 'tag: field 1, 64-bit', bytes: [0x09], tone: 'meta' },
      { label: 'x = 1.0', bytes: F.x, tone: 'x' },
      { label: 'tag: field 2, 64-bit', bytes: [0x11], tone: 'meta' },
      { label: 'y = 2.0', bytes: F.y, tone: 'y' },
      { label: 'tag: field 3, 64-bit', bytes: [0x19], tone: 'meta' },
      { label: 'z = 3.0', bytes: F.z, tone: 'z' },
    ],
    note: 'Protobuf tags every field with its number and wire type. The schema record holds a binary FileDescriptorSet.',
  },
  json: {
    label: 'JSON',
    schemaName: 'Vector3',
    schemaEncoding: 'jsonschema',
    schemaData: '{"type": "object", "properties": {"x": {"type": "number"}, ...}}',
    messageEncoding: 'json',
    parts: [
      { label: '{"x":', bytes: ascii('{"x":'), tone: 'meta' },
      { label: '1.0', bytes: ascii('1.0'), tone: 'x' },
      { label: ',"y":', bytes: ascii(',"y":'), tone: 'meta' },
      { label: '2.0', bytes: ascii('2.0'), tone: 'y' },
      { label: ',"z":', bytes: ascii(',"z":'), tone: 'meta' },
      { label: '3.0', bytes: ascii('3.0'), tone: 'z' },
      { label: '}', bytes: ascii('}'), tone: 'meta' },
    ],
    note: 'JSON is text. Easy to read, no schema needed to decode, bigger and slower for images or point clouds.',
  },
};

const TONE: Record<Part['tone'], string> = {
  meta: 'var(--screen-ink-3)',
  x: 'var(--ch-cam)',
  y: 'var(--ch-joint)',
  z: 'var(--ch-action)',
};

export function EncodingPicker() {
  const [enc, setEnc] = useState<Enc>('ros2');
  const [hover, setHover] = useState<number | null>(null);
  const e = ENCODINGS[enc];
  const total = e.parts.reduce((a, p) => a + p.bytes.length, 0);
  let idx = 0;

  return (
    <figure className="fig fig--screen" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 5</b> &nbsp;Same message, four encodings
        </div>
        <div className="fig__controls">
          <Seg label="Encoding" value={enc} onChange={setEnc} options={(Object.keys(ENCODINGS) as Enc[]).map((k) => ({ value: k, label: ENCODINGS[k].label }))} />
        </div>
      </div>
      <div className="fig__body enc">
        <div className="enc__records">
          <div className="enc__rec">
            <div className="enc__rec-name mono">Schema · 0x03</div>
            <dl>
              <dt>name</dt>
              <dd>{e.schemaName}</dd>
              <dt>encoding</dt>
              <dd className="enc__hl">{e.schemaEncoding}</dd>
              <dt>data</dt>
              <dd className="enc__pre">{e.schemaData}</dd>
            </dl>
          </div>
          <div className="enc__rec">
            <div className="enc__rec-name mono">Channel · 0x04</div>
            <dl>
              <dt>topic</dt>
              <dd>/ee/velocity</dd>
              <dt>schema_id</dt>
              <dd>1</dd>
              <dt>message_encoding</dt>
              <dd className="enc__hl">{e.messageEncoding}</dd>
            </dl>
          </div>
          <div className="enc__rec">
            <div className="enc__rec-name mono">Message · 0x05</div>
            <dl>
              <dt>channel_id</dt>
              <dd>1</dd>
              <dt>log_time</dt>
              <dd>1759701234.512 s</dd>
              <dt>publish_time</dt>
              <dd>1759701234.509 s</dd>
              <dt>data</dt>
              <dd>{total} bytes, below</dd>
            </dl>
          </div>
        </div>

        <div className="hex" role="img" aria-label={`${total} bytes of ${e.label} encoded data`}>
          {e.parts.map((p, pi) => (
            <span key={pi} className="hex__part" onMouseEnter={() => setHover(pi)} onMouseLeave={() => setHover(null)} data-dim={hover !== null && hover !== pi}>
              {p.bytes.map((b) => {
                const k = idx++;
                return (
                  <span key={k} className="hex__byte mono" style={{ color: TONE[p.tone], borderColor: TONE[p.tone] }}>
                    {b.toString(16).toUpperCase().padStart(2, '0')}
                  </span>
                );
              })}
            </span>
          ))}
        </div>
        <div className="hex__legend">
          {e.parts.map((p, pi) => (
            <span key={pi} data-dim={hover !== null && hover !== pi} onMouseEnter={() => setHover(pi)} onMouseLeave={() => setHover(null)}>
              <span className="swatch" style={{ background: TONE[p.tone] }} />
              {p.label} · {p.bytes.length} B
            </span>
          ))}
        </div>
        <p className="step-fig__readout">
          <b>{total} bytes.</b> {e.note}
        </p>
      </div>
    </figure>
  );
}
