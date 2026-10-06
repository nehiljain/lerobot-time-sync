import { FORMATS, type FormatId } from './data';

/* Small multiples: the same episode, located in each layout. */

const SHOWN: FormatId[] = ['lerobot3', 'lerobot2', 'rlds', 'hdf5', 'zarr', 'wds', 'mcap', 'lance'];

export function EpisodeLayouts() {
  return (
    <figure className="fig" style={{ margin: 0 }}>
      <div className="fig__head">
        <div className="fig__label">
          <b>Fig. 4</b> &nbsp;Where does episode 7 live?
        </div>
      </div>
      <div className="fig__body">
        <div className="ep7">
          {SHOWN.map((id) => {
            const f = FORMATS.find((x) => x.id === id)!;
            return (
              <div key={id} className={`ep7__card ep7__card--${f.kind}`}>
                <div className="ep7__head">
                  <span className="ep7__name">{f.name}</span>
                  <span className="ep7__short mono">{f.short}</span>
                </div>
                <pre className="ftree ftree--small mono">
                  {f.tree.map((t, k) => (
                    <span key={k} className={t.hl ? 'is-hl' : undefined}>
                      {t.line}
                      {'\n'}
                    </span>
                  ))}
                </pre>
                <p className="ep7__text">{f.episode7}</p>
                <p className="ep7__access mono">{f.access}</p>
              </div>
            );
          })}
        </div>
      </div>
      <p className="fig__note">Highlighted lines hold episode 7. Logs have no episodes at all; an episode is a time range you choose when you align.</p>
    </figure>
  );
}
