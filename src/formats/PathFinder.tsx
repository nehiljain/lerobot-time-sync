import { Fragment, useMemo, useState } from 'react';
import { pageHref } from '../site';
import { EDGES, FORMATS, POLICIES, STATUS_LABEL, type Edge, type FormatId, type PolicyId } from './data';

/* Pick what you have and what you train; the route is a shortest path over real conversion tools. */

const HAVE: FormatId[] = ['custom', 'rosbag1', 'rosbag2', 'mcap', 'hdf5', 'rlds', 'zarr', 'lerobot2', 'lerobot3'];
const LOGS: FormatId[] = ['custom', 'rosbag1', 'rosbag2', 'mcap'];

const TIPS: Partial<Record<PolicyId, string>> = {
  openpi: 'If your data is already LeRobot v3.0, you can also train pi0 or pi0.5 with LeRobot itself, which reads v3.0 directly. Run `compute_norm_stats.py` before openpi training.',
  gr00t: 'Add `meta/modality.json`: its ranges must match the order in which state and action are concatenated. Convert AV1 video to H.264 for GR00T.',
  openvla: 'Register the new dataset in the OXE configs, transforms and mixtures. Use `bridge_orig` rather than the OXE Bridge copy.',
  lerobotp: 'Camera keys must match the pretrained policy; use `--rename_map`. pi0.5 needs q01/q99 stats: `recompute_stats` if they are missing.',
  robomimic: 'Normalize actions to [-1, 1]. `get_dataset_info.py` flags violations.',
  act: 'Original ACT shifts real-robot actions by one step in its loader ("hack, to make timesteps more aligned").',
  dp: 'The ReplayBuffer has no task text; one dataset per task.',
  rdt2: 'Shards hold model-specific samples (action chunks and tokens), so convert per model.',
};

function shortestPath(from: FormatId, to: FormatId): Edge[] | null {
  if (from === to) return [];
  const prev = new Map<FormatId, Edge>();
  const seen = new Set<FormatId>([from]);
  const queue: FormatId[] = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const e of EDGES) {
      if (e.from !== cur || seen.has(e.to) || e.to === 'viz') continue;
      seen.add(e.to);
      prev.set(e.to, e);
      if (e.to === to) {
        const path: Edge[] = [];
        let n: FormatId = to;
        while (n !== from) {
          const pe: Edge = prev.get(n)!;
          path.unshift(pe);
          n = pe.from;
        }
        return path;
      }
      queue.push(e.to);
    }
  }
  return null;
}

export function PathFinder() {
  const [have, setHave] = useState<FormatId>('mcap');
  const [train, setTrain] = useState<PolicyId>('openpi');
  const policy = POLICIES.find((p) => p.id === train)!;
  const path = useMemo(() => shortestPath(have, policy.reads), [have, policy.reads]);
  const name = (id: FormatId) => FORMATS.find((f) => f.id === id)!.name;

  // where the align step goes: before the first hop that leaves the logs
  const alignAt = path ? path.findIndex((e) => LOGS.includes(e.from) && !LOGS.includes(e.to)) : -1;

  return (
    <figure className="fig pf" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 3</b> &nbsp;Find your path
        </div>
      </div>
      <div className="fig__body">
        <div className="pf__q">
          <span className="pf__qn mono">1</span>
          <span className="pf__qt">What do you have?</span>
        </div>
        <div className="pf__opts" role="radiogroup" aria-label="What you have">
          {HAVE.map((id) => {
            const f = FORMATS.find((x) => x.id === id)!;
            return (
              <button key={id} type="button" role="radio" aria-checked={have === id} className={`pf__opt pf__opt--${f.kind}`} onClick={() => setHave(id)}>
                <span className="pf__opt-name">{f.name}</span>
                <span className="pf__opt-sub mono">{f.short}</span>
              </button>
            );
          })}
        </div>
        <div className="pf__q">
          <span className="pf__qn mono">2</span>
          <span className="pf__qt">What will you train?</span>
        </div>
        <div className="pf__opts" role="radiogroup" aria-label="What you will train">
          {POLICIES.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={train === p.id} className="pf__opt pf__opt--policy" onClick={() => setTrain(p.id)}>
              <span className="pf__opt-name">{p.name}</span>
              <span className="pf__opt-sub mono">{p.models}</span>
            </button>
          ))}
        </div>

        <div className="pf__result" aria-live="polite">
          <div className="pf__q">
            <span className="pf__qn mono">→</span>
            <span className="pf__qt">Your route</span>
          </div>
          {path === null ? (
            <div className="pf__none">
              <strong>No converter found from {name(have)} to {name(policy.reads)}.</strong> Write one: read with the tools for {name(have)}, align
              if it is a log, and write {name(policy.reads)} directly. Or go through LeRobot v3.0 if a trainer that reads it works for you.
            </div>
          ) : (
            <div className="pf__route">
              <div className="pf__node">
                <span className="pf__node-k mono">start</span>
                <span className="pf__node-name">{name(have)}</span>
              </div>
              {path.length === 0 && (
                <>
                  <span className="pf__arrow" aria-hidden="true">
                    →
                  </span>
                  <div className="pf__hop pf__hop--none">
                    <span className="pf__hop-tool">already the right format</span>
                  </div>
                </>
              )}
              {path.map((e, i) => (
                <Fragment key={i}>
                  {i === alignAt && (
                    <>
                      <span className="pf__arrow" aria-hidden="true">
                        →
                      </span>
                      <a className="pf__hop pf__hop--align" href={pageHref('lerobot') + '#sync'}>
                        <span className="pf__hop-k mono">required</span>
                        <span className="pf__hop-tool">Align: one clock, one fps</span>
                        <span className="pf__hop-note">resample every stream onto one grid (Part 1)</span>
                      </a>
                    </>
                  )}
                  <span className="pf__arrow" aria-hidden="true">
                    →
                  </span>
                  <a className={`pf__hop pf__hop--${e.status}`} href={e.link}>
                    <span className="pf__hop-k mono">{STATUS_LABEL[e.status]}</span>
                    <span className="pf__hop-tool">{e.tool}</span>
                    <span className="pf__hop-note">{e.note}</span>
                  </a>
                  <span className="pf__arrow" aria-hidden="true">
                    →
                  </span>
                  <div className="pf__node">
                    <span className="pf__node-k mono">{i === path.length - 1 ? 'what it reads' : 'then'}</span>
                    <span className="pf__node-name">{name(e.to)}</span>
                  </div>
                </Fragment>
              ))}
              <span className="pf__arrow" aria-hidden="true">
                →
              </span>
              <a className="pf__node pf__node--policy" href={policy.link}>
                <span className="pf__node-k mono">train</span>
                <span className="pf__node-name">{policy.name}</span>
              </a>
            </div>
          )}
          {TIPS[train] && (
            <p className="pf__tip">
              <strong>Before you train:</strong> {TIPS[train]!.split('`').map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part))}
            </p>
          )}
        </div>
      </div>
    </figure>
  );
}
