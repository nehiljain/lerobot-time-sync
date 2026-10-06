import { useState } from 'react';
import { Range, Seg } from '../components/controls';

const RES = {
  vga: { label: '640×480', w: 640, h: 480 },
  hd: { label: '1280×720', w: 1280, h: 720 },
  fhd: { label: '1920×1080', w: 1920, h: 1080 },
} as const;
type ResId = keyof typeof RES;

const DISKS = [
  { label: 'SD card', mbps: 40 },
  { label: 'USB 3 flash', mbps: 120 },
  { label: 'SATA SSD', mbps: 450 },
  { label: 'NVMe SSD', mbps: 1500 },
];

// JPEG at typical quality lands around a tenth of raw RGB for robot scenes; it varies with content.
const JPEG_RATIO = 0.1;
const OTHER_MBPS = 0.35; // joint states at 500 Hz, tf, teleop, gripper, diagnostics

export function BagSize() {
  const [cams, setCams] = useState(2);
  const [res, setRes] = useState<ResId>('vga');
  const [fps, setFps] = useState<'15' | '30' | '60'>('30');
  const [enc, setEnc] = useState<'raw' | 'jpeg'>('raw');
  const [depth, setDepth] = useState<'off' | 'on'>('off');

  const r = RES[res];
  const perCam = (r.w * r.h * 3 * Number(fps)) / 1e6;
  const camMB = cams * perCam * (enc === 'jpeg' ? JPEG_RATIO : 1);
  const depthMB = depth === 'on' ? (r.w * r.h * 2 * Number(fps)) / 1e6 : 0; // 16-bit depth, uncompressed
  const total = camMB + depthMB + OTHER_MBPS;
  const gbHour = (total * 3600) / 1000;
  const hoursPerTB = 1000 / gbHour;

  const parts = [
    { label: `${cams} camera${cams > 1 ? 's' : ''}`, mb: camMB, color: 'var(--ch-cam)' },
    { label: 'depth', mb: depthMB, color: '#8a7cd1' },
    { label: 'everything else', mb: OTHER_MBPS, color: 'var(--ch-joint)' },
  ].filter((p) => p.mb > 0);
  const maxScale = Math.max(total, 50) * 1.1;

  return (
    <figure className="fig" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 5</b> &nbsp;How fast a bag grows
        </div>
      </div>
      <div className="fig__body">
        <div className="size-controls">
          <Range label="Cameras" value={cams} min={1} max={6} display={`${cams}`} onChange={setCams} />
          <div className="size-control">
            <span className="range__top">Resolution</span>
            <Seg label="Resolution" value={res} onChange={setRes} options={(Object.keys(RES) as ResId[]).map((k) => ({ value: k, label: RES[k].label }))} />
          </div>
          <div className="size-control">
            <span className="range__top">Frame rate</span>
            <Seg label="Frame rate" value={fps} onChange={setFps} options={[{ value: '15', label: '15 Hz' }, { value: '30', label: '30 Hz' }, { value: '60', label: '60 Hz' }]} />
          </div>
          <div className="size-control">
            <span className="range__top">Images as</span>
            <Seg label="Image encoding" value={enc} onChange={setEnc} options={[{ value: 'raw', label: 'raw (Image)' }, { value: 'jpeg', label: 'JPEG (CompressedImage)' }]} />
          </div>
          <div className="size-control">
            <span className="range__top">Depth stream</span>
            <Seg label="Depth" value={depth} onChange={setDepth} options={[{ value: 'off', label: 'off' }, { value: 'on', label: '16-bit depth' }]} />
          </div>
        </div>

        <div className="size-out">
          <div className="size-big">
            <div>
              <span className="size-big__n">{total < 10 ? total.toFixed(1) : Math.round(total)}</span>
              <span className="size-big__u">MB/s</span>
            </div>
            <div>
              <span className="size-big__n">{gbHour < 10 ? gbHour.toFixed(1) : Math.round(gbHour)}</span>
              <span className="size-big__u">GB per hour</span>
            </div>
            <div>
              <span className="size-big__n">{hoursPerTB < 10 ? hoursPerTB.toFixed(1) : Math.round(hoursPerTB)}</span>
              <span className="size-big__u">hours per TB</span>
            </div>
          </div>

          <div className="size-bars" role="img" aria-label={`Write rate ${total.toFixed(1)} MB/s compared with typical disks.`}>
            <div className="size-bar">
              <span className="size-bar__label">this bag</span>
              <span className="size-bar__track">
                {parts.map((p) => (
                  <span key={p.label} className="size-bar__seg" style={{ width: `${(p.mb / maxScale) * 100}%`, background: p.color }} title={`${p.label}: ${p.mb.toFixed(1)} MB/s`} />
                ))}
              </span>
              <span className="size-bar__val">{total.toFixed(1)}</span>
            </div>
            {DISKS.map((d) => {
              const ok = d.mbps >= total * 1.3;
              const tight = !ok && d.mbps >= total;
              return (
                <div key={d.label} className="size-bar">
                  <span className="size-bar__label">{d.label}</span>
                  <span className="size-bar__track">
                    <span className="size-bar__disk" style={{ width: `${Math.min(100, (d.mbps / maxScale) * 100)}%` }} />
                  </span>
                  <span className={`size-bar__val ${ok ? 'is-ok' : tight ? 'is-mid' : 'is-bad'}`}>
                    {d.mbps >= maxScale ? `${d.mbps}+` : d.mbps} {ok ? '✓' : tight ? '~' : '✕'}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="size-legend">
            {parts.map((p) => (
              <span key={p.label}>
                <span className="swatch" style={{ background: p.color }} />
                {p.label} {p.mb.toFixed(1)} MB/s
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="fig__note">
        Raw RGB is width × height × 3 bytes per frame. JPEG assumed at about a tenth of raw; real ratios depend on the scene and quality.
        Disk numbers are typical sustained writes. ✓ means 30% headroom, ~ means barely.
      </p>
    </figure>
  );
}
