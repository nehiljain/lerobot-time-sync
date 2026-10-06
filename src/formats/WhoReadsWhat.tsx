import { useState } from 'react';
import { POLICIES, type FormatId } from './data';

/* Which trainer reads which format natively. The raw-log column is empty on purpose: nobody trains on bags. */

const COLS: { id: FormatId | 'logs'; label: string }[] = [
  { id: 'lerobot3', label: 'LeRobot v3.0' },
  { id: 'lerobot2', label: 'LeRobot v2.x' },
  { id: 'rlds', label: 'RLDS' },
  { id: 'hdf5', label: 'HDF5' },
  { id: 'zarr', label: 'Zarr' },
  { id: 'wds', label: 'WebDataset' },
  { id: 'logs', label: 'bags / MCAP' },
];

export function WhoReadsWhat() {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <figure className="fig" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 5</b> &nbsp;Who reads what, natively
        </div>
        <div className="wrw-legend" aria-hidden="true">
          <span>
            <span className="wrw-dot wrw-dot--main" /> main input
          </span>
          <span>
            <span className="wrw-dot wrw-dot--also" /> also, for one case
          </span>
        </div>
      </div>
      <div className="fig__body">
        <div className="table-wrap">
          <table className="table wrw">
            <thead>
              <tr>
                <th>Trainer</th>
                {COLS.map((c) => (
                  <th key={c.id} className={c.id === 'logs' ? 'wrw__logs' : undefined}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {POLICIES.map((p) => (
                <tr key={p.id} onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)} className={hover === p.id ? 'is-hover' : undefined}>
                  <td>
                    <a href={p.link}>
                      <strong>{p.name}</strong>
                    </a>
                    <span className="wrw__models">{p.models}</span>
                  </td>
                  {COLS.map((c) => {
                    const main = p.reads === c.id;
                    const also = p.also === c.id;
                    return (
                      <td key={c.id} className={`wrw__cell${c.id === 'logs' ? ' wrw__logs' : ''}`} title={main || also ? p.note : undefined}>
                        {main ? <span className="wrw-dot wrw-dot--main" aria-label="main input" /> : also ? <span className="wrw-dot wrw-dot--also" aria-label="also reads" /> : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="caption">
          The last column is empty: no trainer reads raw logs. Every bag and MCAP file goes through alignment and conversion first. Point at a row
          for the trainer's note; the name links to its data docs.
        </p>
      </div>
    </figure>
  );
}
