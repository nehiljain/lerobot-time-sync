import { useState } from 'react';
import { Seg } from '../components/controls';
import { useElementWidth } from '../lib/hooks';
import { linear } from '../lib/math';

/*
  log_time: "Time at which the message was recorded."
  publish_time: "Time at which the message was published. If not available, must be set to the log time."
  (MCAP spec). rosbag2 writes log_time = recv_timestamp and publish_time = send_timestamp (Jazzy and later).
*/

type Field = 'log' | 'pub' | 'stamp';

const FIELDS: Record<Field, { name: string; where: string; spec: string; indexed: string; color: string }> = {
  stamp: {
    name: 'header.stamp',
    where: 'inside the payload',
    spec: 'Set by the driver or publisher. MCAP never reads it.',
    indexed: 'not indexed',
    color: 'var(--ch-cam)',
  },
  pub: {
    name: 'publish_time',
    where: 'Message record',
    spec: '"Time at which the message was published. If not available, must be set to the log time."',
    indexed: 'not indexed',
    color: 'var(--ch-action)',
  },
  log: {
    name: 'log_time',
    where: 'Message record',
    spec: '"Time at which the message was recorded."',
    indexed: 'indexed: chunks and message indexes use it',
    color: 'var(--ch-joint)',
  },
};

const QUESTIONS: { q: string; a: string; field: Field }[] = [
  { q: 'seek, filter or slice with MCAP tools?', a: 'log_time. It is the only time the indexes know.', field: 'log' },
  { q: 'line up sensors for training?', a: 'header.stamp, if the driver fills it from the sensor. Otherwise log_time minus known delays.', field: 'stamp' },
  { q: 'measure transport delay?', a: 'log_time minus publish_time, on bags recorded with Jazzy or later.', field: 'pub' },
  { q: 'put messages in order?', a: 'log_time, but MCAP does not require files to be sorted. Read in log-time order or run mcap sort.', field: 'log' },
];

export function TimeFields() {
  const [distro, setDistro] = useState<'jazzy' | 'humble'>('jazzy');
  const [focus, setFocus] = useState<Field | null>(null);
  const [ref, W] = useElementWidth<HTMLDivElement>(980);

  const t = { stamp: -34, pub: distro === 'jazzy' ? -2 : 0, log: 0 };
  const x0 = 20;
  const x1 = W - 20;
  const x = linear(-42, 8, x0, x1);
  const y = 58;

  return (
    <figure className="fig fig--screen" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 3</b> &nbsp;Which time answers which question
        </div>
        <div className="fig__controls">
          <Seg
            label="Recorded with"
            value={distro}
            onChange={setDistro}
            options={[
              { value: 'jazzy', label: 'rosbag2 on Jazzy or later' },
              { value: 'humble', label: 'Humble or Iron' },
            ]}
          />
        </div>
      </div>
      <div className="fig__body" ref={ref}>
        <div className="tf__fields">
          {(['stamp', 'pub', 'log'] as Field[]).map((k) => {
            const f = FIELDS[k];
            return (
              <div key={k} className="tf__field" data-on={focus === null || focus === k} onMouseEnter={() => setFocus(k)} onMouseLeave={() => setFocus(null)}>
                <span className="tf__key" style={{ background: f.color }} />
                <span className="tf__name mono">{f.name}</span>
                <span className="tf__where mono">{f.where}</span>
                <span className="tf__spec">{f.spec}</span>
                <span className="tf__idx mono">{f.indexed}</span>
              </div>
            );
          })}
        </div>

        <svg className="fig__svg" width={W} height={104} viewBox={`0 0 ${W} 104`} role="img" aria-label={`header.stamp 34 ms before log_time; publish_time ${distro === 'jazzy' ? '2 ms before log_time' : 'equal to log_time'}.`}>
          <line x1={x0} x2={x1} y1={y} y2={y} stroke="var(--screen-rule)" strokeWidth={2} />
          {(['stamp', 'pub', 'log'] as Field[]).map((k, i) => {
            const f = FIELDS[k];
            const on = focus === null || focus === k;
            const up = i !== 1;
            return (
              <g key={k} opacity={on ? 1 : 0.3}>
                <line x1={x(t[k])} x2={x(t[k])} y1={y} y2={up ? y - 28 : y + 28} stroke={f.color} strokeWidth={1.5} />
                <circle cx={x(t[k])} cy={y} r={6} fill={f.color} stroke="var(--screen)" strokeWidth={2} />
                <text x={x(t[k])} y={up ? y - 34 : y + 42} textAnchor={k === 'log' ? 'end' : 'middle'} fontSize={11} fontFamily="var(--font-mono)" fill="var(--screen-ink)">
                  {f.name} {t[k] === 0 ? '' : `${t[k]} ms`}
                </text>
              </g>
            );
          })}
          <text x={x0} y={98} fontSize={9.5} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
            one camera message, ms relative to log_time (example values)
          </text>
        </svg>

        <div className="tf__qs">
          <span className="tf__qs-k mono">which time do I use to…</span>
          {QUESTIONS.map((q) => (
            <button key={q.q} type="button" className="tf__q" onMouseEnter={() => setFocus(q.field)} onMouseLeave={() => setFocus(null)} onFocus={() => setFocus(q.field)} onBlur={() => setFocus(null)}>
              <span className="tf__q-q">{q.q}</span>
              <span className="tf__q-a">{q.a}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="fig__note">
        All MCAP times are nanoseconds since a "user-understood epoch": Unix time or robot boot time. Check before you mix files from different
        machines.
      </p>
    </figure>
  );
}
