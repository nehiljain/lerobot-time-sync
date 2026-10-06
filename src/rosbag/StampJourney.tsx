import { useState } from 'react';
import { Range, Seg, Switch } from '../components/controls';
import { useElementWidth } from '../lib/hooks';
import { fmtMs, linear } from '../lib/math';

/*
  One camera frame, three timestamps:
  header.stamp (inside the message, set by the driver), publish/send time, and the receive time the bag indexes by.
  Then playback: messages go out again with their recorded spacing, but header.stamp still holds the old time.
*/

export function StampJourney() {
  const [driver, setDriver] = useState<'sensor' | 'arrival'>('arrival');
  const [load, setLoad] = useState(20);
  const [sim, setSim] = useState(false);
  const [ref, W] = useElementWidth<HTMLDivElement>(980);

  // milliseconds after exposure, illustrative
  const exposure = 0;
  const atDriver = 34; // USB transfer + decode into the driver
  const stamp = driver === 'sensor' ? exposure : atDriver;
  const publish = atDriver + 3;
  const transport = 1.5 + load * 0.55; // middleware, queues, CPU contention
  const received = publish + transport;
  const written = received + 2;

  const x0 = 10;
  const x1 = W - 10;
  const x = linear(-6, 110, x0, x1);
  const y = 62;

  const marks = [
    { t: exposure, label: 'sensor exposure', sub: 'the moment you want', color: 'var(--screen-ink)', row: 0 },
    { t: stamp, label: 'header.stamp', sub: driver === 'sensor' ? 'driver copies the sensor time' : 'driver stamps now() on arrival', color: 'var(--ch-cam)', row: 1 },
    { t: publish, label: 'send time', sub: 'stored as send_timestamp from Jazzy on', color: 'var(--ch-action)', row: 2 },
    { t: received, label: 'receive time', sub: 'what the bag orders and indexes by', color: 'var(--ch-joint)', row: 3 },
  ];

  return (
    <figure className="fig fig--screen" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 3</b> &nbsp;One frame, three timestamps
        </div>
        <div className="fig__controls">
          <Seg
            label="How the driver stamps header.stamp"
            value={driver}
            onChange={setDriver}
            options={[
              { value: 'arrival', label: 'driver stamps arrival' },
              { value: 'sensor', label: 'driver uses sensor time' },
            ]}
          />
        </div>
      </div>
      <div className="fig__body" ref={ref}>
        <Range label="CPU and network load on the robot" value={load} min={0} max={100} display={`${load}%`} onChange={setLoad} style={{ maxWidth: 420 }} />
        <svg className="fig__svg" width={W} height={118} viewBox={`0 0 ${W} 118`} style={{ marginTop: 12 }} role="img" aria-label={`header.stamp is ${fmtMs(stamp / 1000)} after exposure, receive time is ${fmtMs(received / 1000)} after exposure.`}>
          <text x={x0} y={12} fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
            milliseconds after the sensor exposed the frame (example values)
          </text>
          <line x1={x0} x2={x1} y1={y} y2={y} stroke="var(--screen-rule)" strokeWidth={2} />
          <rect x={x(0)} y={y - 9} width={x(atDriver) - x(0)} height={18} rx={4} fill="var(--screen-3)" />
          <text x={(x(0) + x(atDriver)) / 2} y={y + 4} textAnchor="middle" fontSize={10} fill="var(--screen-ink-2)" fontFamily="var(--font-mono)">
            USB + decode
          </text>
          <rect x={x(publish)} y={y - 9} width={Math.max(2, x(received) - x(publish))} height={18} rx={4} fill={load > 60 ? 'rgba(208,59,59,0.35)' : 'var(--screen-3)'} />
          <rect x={x(received)} y={y - 9} width={x(written) - x(received)} height={18} rx={3} fill="var(--screen-3)" />
          {x(received) - x(publish) > 120 && (
            <text x={(x(publish) + x(received)) / 2} y={y + 4} textAnchor="middle" fontSize={10} fill="var(--screen-ink-2)" fontFamily="var(--font-mono)">
              middleware + queues
            </text>
          )}
          {marks.map((m, i) => {
            const up = i % 2 === 0;
            const ly = up ? y - 30 : y + 34;
            return (
              <g key={m.label}>
                <line x1={x(m.t)} x2={x(m.t)} y1={y} y2={up ? ly + 4 : ly - 12} stroke={m.color} strokeWidth={1.5} />
                <circle cx={x(m.t)} cy={y} r={5} fill={m.color} stroke="var(--screen)" strokeWidth={2} />
                <text x={x(m.t)} y={ly} textAnchor="middle" fontSize={10.5} fontWeight={600} fontFamily="var(--font-mono)" fill="var(--screen-ink)">
                  {m.t === 0 ? '0' : fmtMs(m.t / 1000, true)}
                </text>
              </g>
            );
          })}
        </svg>
        <ul className="stamp-list">
          {marks.map((m) => (
            <li key={m.label}>
              <span className="stamp-list__key" style={{ background: m.color }} />
              <span className="stamp-list__val mono">{m.t === 0 ? '0 ms' : fmtMs(m.t / 1000, true)}</span>
              <span className="stamp-list__name">{m.label}</span>
              <span className="stamp-list__sub">{m.sub}</span>
            </li>
          ))}
        </ul>

        <div className="playback">
          <div className="playback__head">
            <h3>During ros2 bag play</h3>
            <Switch checked={sim} onChange={setSim} hint={sim ? 'ros2 bag play --clock (40 Hz by default), nodes set use_sim_time:=true' : 'nodes use the wall clock'}>
              Use the bag's clock
            </Switch>
          </div>
          <div className="playback__grid">
            <div>
              <span className="playback__k">messages go out</span>
              <span>with their recorded receive-time spacing</span>
            </div>
            <div>
              <span className="playback__k">header.stamp</span>
              <span>unchanged: still the time it was recorded</span>
            </div>
            <div>
              <span className="playback__k">a node asks for now()</span>
              <span className={sim ? 'is-ok' : 'is-bad'}>{sim ? 'gets bag time from /clock: stamps line up' : 'gets today: every stamp looks months old'}</span>
            </div>
            <div>
              <span className="playback__k">TF lookups</span>
              <span className={sim ? 'is-ok' : 'is-bad'}>{sim ? 'work' : 'fail with extrapolation errors'}</span>
            </div>
          </div>
        </div>
      </div>
      <p className="fig__note">
        For training, use header.stamp when the driver fills it from the sensor; otherwise correct for the driver's delay. Receive time
        only says when the recorder got the message.
      </p>
    </figure>
  );
}
