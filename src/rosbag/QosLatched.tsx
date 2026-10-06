import { useState } from 'react';
import { Seg } from '../components/controls';
import { useElementWidth } from '../lib/hooks';
import { linear } from '../lib/math';

/*
  /tf_static is published once at t=0. The recorder starts at t=5 s and splits every 60 s.
  Rules (rosbag2 qos.cpp and README):
  - the recorder subscribes transient_local only if every publisher offers it; otherwise volatile
  - before Lyrical, the latched message lands only in the first split; Lyrical can repeat it
*/

export function QosLatched() {
  const [pubs, setPubs] = useState<'all' | 'mixed'>('all');
  const [distro, setDistro] = useState<'jazzy' | 'lyrical'>('jazzy');
  const [ref, W] = useElementWidth<HTMLDivElement>(980);

  const gotIt = pubs === 'all';
  const repeat = distro === 'lyrical';
  const files = [
    { i: 0, t0: 5, t1: 60 },
    { i: 1, t0: 60, t1: 120 },
    { i: 2, t0: 120, t1: 150 },
  ];
  const hasStatic = (i: number) => gotIt && (i === 0 || repeat);

  const x0 = 10;
  const x1 = W - 10;
  const x = linear(-4, 152, x0, x1);
  const yPub = 40;
  const yFiles = 104;
  const fileH = 50;

  return (
    <figure className="fig fig--screen" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 4</b> &nbsp;Where /tf_static ends up
        </div>
        <div className="fig__controls">
          <Seg
            label="Publishers of /tf_static"
            value={pubs}
            onChange={setPubs}
            options={[
              { value: 'all', label: 'all publishers transient_local' },
              { value: 'mixed', label: 'one publisher volatile' },
            ]}
          />
          <Seg
            label="Distro"
            value={distro}
            onChange={setDistro}
            options={[
              { value: 'jazzy', label: 'Jazzy or Kilted' },
              { value: 'lyrical', label: 'Lyrical + --repeat-transient-local' },
            ]}
          />
        </div>
      </div>
      <div className="fig__body" ref={ref}>
        <svg className="fig__svg" width={W} height={210} viewBox={`0 0 ${W} 210`} role="img" aria-label={`Static transform published at t=0; recorder starts at 5 s; files split every 60 s. ${gotIt ? 'The recorder receives the latched message.' : 'The recorder never receives it.'}`}>
          <line x1={x0} x2={x1} y1={yPub} y2={yPub} stroke="var(--screen-grid)" strokeWidth={2} />
          <circle cx={x(0)} cy={yPub} r={7} fill="var(--ch-grip)" />
          <text x={x(0) + 12} y={yPub - 12} fontSize={11.5} fill="var(--screen-ink)">
            /tf_static published once, t = 0
          </text>
          <line x1={x(5)} x2={x(5)} y1={yPub + 2} y2={yFiles - 6} stroke="var(--screen-ink)" strokeWidth={1.5} />
          <text x={x(5) + 6} y={yPub + 22} fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink-2)">
            recorder starts, t = 5 s
          </text>
          {gotIt ? (
            <path d={`M${x(0)},${yPub + 8} C${x(1)},${yPub + 46} ${x(4)},${yPub + 46} ${x(5) + 10},${yFiles + 12}`} fill="none" stroke="var(--ch-grip)" strokeWidth={1.8} strokeDasharray="4 3" />
          ) : (
            <g>
              <path d={`M${x(0)},${yPub + 8} C${x(1)},${yPub + 30} ${x(3)},${yPub + 30} ${x(3.6)},${yPub + 34}`} fill="none" stroke="var(--bad)" strokeWidth={1.8} strokeDasharray="4 3" />
              <text x={x(3.6) + 8} y={yPub + 40} fontSize={10} fontFamily="var(--font-mono)" fill="#f08a8a">
                volatile subscription: never delivered
              </text>
            </g>
          )}

          {files.map((f) => {
            const ok = hasStatic(f.i);
            return (
              <g key={f.i}>
                <rect x={x(f.t0) + 2} y={yFiles} width={x(f.t1) - x(f.t0) - 4} height={fileH} rx={8} fill="var(--screen-2)" stroke="var(--screen-rule)" />
                <text x={x(f.t0) + 12} y={yFiles + 19} fontSize={11} fontFamily="var(--font-mono)" fill="var(--screen-ink)">
                  file {f.i} · {f.t0}–{f.t1} s
                </text>
                <text x={x(f.t0) + 12} y={yFiles + 38} fontSize={10.5} fill={ok ? '#7fd391' : '#f08a8a'}>
                  {ok ? '✓ has /tf_static' : '✕ no /tf_static'}
                </text>
              </g>
            );
          })}
          <text x={x0} y={yFiles + fileH + 30} fontSize={12} fill="var(--screen-ink)">
            {!gotIt
              ? 'Nothing was recorded. Every split, and every training job, is missing the static transforms.'
              : repeat
                ? 'Every split carries the static transforms, so each file can be processed alone.'
                : 'Only file 0 has the static transforms. A job that reads file 1 or 2 on its own has to borrow them from file 0.'}
          </text>
          <text x={x0} y={yFiles + fileH + 50} fontSize={10} fontFamily="var(--font-mono)" fill="var(--screen-ink-3)">
            on play: the player reuses the recorded QoS only if all recorded offers were the same
          </text>
        </svg>
      </div>
      <p className="fig__note">
        Check <code>offered_qos_profiles</code> in <code>metadata.yaml</code> after recording. <code>--qos-profile-overrides-path</code> forces a
        profile on record and on play.
      </p>
    </figure>
  );
}
