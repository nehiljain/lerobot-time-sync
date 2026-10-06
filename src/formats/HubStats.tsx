/* Numbers from the Hugging Face API and dataset pages, 2026-10-06. */

const VERSIONS = [
  { label: 'v3.0', pct: 67, color: 'var(--ch-joint)' },
  { label: 'v2.1', pct: 29, color: 'var(--ch-cam)' },
  { label: 'v2.0', pct: 2, color: 'var(--ch-action)' },
  { label: 'other', pct: 2, color: '#9aa39c' },
];

function Bars({ rows, unit, max }: { rows: { label: string; value: number; note?: string }[]; unit: string; max: number }) {
  return (
    <div className="hbars">
      {rows.map((r) => (
        <div key={r.label} className="hbars__row">
          <span className="hbars__label">{r.label}</span>
          <span className="hbars__track">
            <span className="hbars__bar" style={{ width: `${Math.max(0.6, (r.value / max) * 100)}%` }} />
          </span>
          <span className="hbars__val">
            {r.value.toLocaleString()} {unit}
            {r.note ? <em> {r.note}</em> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

export function HubStats() {
  return (
    <figure className="fig" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 6</b> &nbsp;What's actually out there
        </div>
      </div>
      <div className="fig__body hub">
        <div className="hub__card">
          <div className="hub__big">79,268</div>
          <div className="hub__sub">public Hub datasets tagged LeRobot, from 7,952 owners</div>
          <div className="hub__stack" role="img" aria-label="Version mix in a random sample of 500: 67% v3.0, 29% v2.1, 2% v2.0, 2% other">
            {VERSIONS.map((v) => (
              <span key={v.label} style={{ width: `${v.pct}%`, background: v.color }} />
            ))}
          </div>
          <div className="hub__legend">
            {VERSIONS.map((v) => (
              <span key={v.label}>
                <span className="swatch" style={{ background: v.color }} />
                {v.label} {v.pct}%
              </span>
            ))}
          </div>
          <p className="hub__note">Version mix from a random sample of 500 tagged datasets. Current LeRobot refuses to load v2.x until it is converted, and v2.0 has no converter.</p>
        </div>
        <div className="hub__card">
          <h3>Same LIBERO data, two encodings</h3>
          <Bars
            unit="GB"
            max={70}
            rows={[
              { label: 'per-frame images', value: 69.9 },
              { label: 'MP4 video', value: 1.9 },
            ]}
          />
          <p className="hub__note">1,693 episodes, 273,465 frames. Hub storage across all revisions; resolution not compared.</p>
        </div>
        <div className="hub__card">
          <h3>DROID in three formats</h3>
          <Bars
            unit="TB"
            max={8.7}
            rows={[
              { label: 'raw release', value: 8.7 },
              { label: 'RLDS', value: 1.7 },
              { label: 'LeRobot v3.0', value: 0.81, note: 'Hub storage' },
            ]}
          />
          <p className="hub__note">76k demonstrations, 350 hours. The LeRobot port lists 95,658 episodes at 15 fps.</p>
        </div>
      </div>
      <p className="fig__note">
        Sources: Hugging Face API counts and a seeded random sample of meta/info.json files; dataset pages for lerobot/libero, HuggingFaceVLA/libero,
        lerobot/droid_1.0.1 and the DROID site.
      </p>
    </figure>
  );
}
