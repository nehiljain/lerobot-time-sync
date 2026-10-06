const CARDS: { term: string; text: string }[] = [
  { term: 'LeRobot dataset', text: 'Aligned rows at one fps, plus video and metadata. A contract between collection and training.' },
  { term: 'Time sync', text: 'Turns multi-rate, multi-clock logs into those rows. It happens before anything is written.' },
  { term: 'What LeRobot checks', text: 'Video frame against row timestamp, within 0.1 ms. Not whether either matches the world.' },
  { term: 'lerobot-record', text: 'Syncs by sampling the newest value each tick. Fine for one arm on one PC.' },
  { term: 'Resample by type', text: 'Interpolate continuous. Hold discrete. Nearest frame for images. Low-pass high-rate signals first.' },
  { term: 'Split by episode', text: 'Never by frame. Neighboring frames are near-copies and leak into eval.' },
];

export function CheatSheet() {
  return (
    <dl className="cheats">
      {CARDS.map((c) => (
        <div key={c.term} className="cheats__card">
          <dt>{c.term}</dt>
          <dd>{c.text}</dd>
        </div>
      ))}
    </dl>
  );
}
