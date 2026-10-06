/**
 * A camera frame drawn as a tiny picture of what it saw: a two-link arm whose reach follows
 * the arm position, with fingers open or closed.
 */
export function FrameGlyph({
  x,
  y,
  w,
  h,
  pose,
  grip,
  opacity = 1,
  stroke = 'var(--ch-cam)',
  highlight = false,
}: {
  x: number; // center
  y: number; // center
  w: number;
  h: number;
  pose: number; // -1..1
  grip: number; // 0 open .. 1 closed
  opacity?: number;
  stroke?: string;
  highlight?: boolean;
}) {
  const bx = x - w * 0.34;
  const by = y + h * 0.36;
  const s = Math.min(w, h * 1.3);
  const a1 = ((-80 + 55 * ((pose + 1) / 2)) * Math.PI) / 180;
  const a2 = a1 + (80 * Math.PI) / 180;
  const ex = bx + Math.cos(a1) * s * 0.42;
  const ey = by + Math.sin(a1) * s * 0.42;
  const tx = ex + Math.cos(a2) * s * 0.4;
  const ty = ey + Math.sin(a2) * s * 0.4;
  const f = Math.max(1.6, h * 0.16);
  const spread = (1 - grip) * f * 0.75 + 0.5;
  const ink = 'var(--screen-ink)';
  const lw = Math.max(1, Math.min(1.5, h / 14));
  return (
    <g opacity={opacity}>
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={2.5}
        fill={highlight ? 'rgba(196,135,15,0.32)' : 'rgba(196,135,15,0.13)'}
        stroke={stroke}
        strokeWidth={highlight ? 1.6 : 1}
      />
      <polyline points={`${bx},${by} ${ex},${ey} ${tx},${ty}`} fill="none" stroke={ink} strokeWidth={lw} strokeLinecap="round" strokeLinejoin="round" />
      <line x1={tx} y1={ty} x2={tx - spread} y2={ty + f} stroke={ink} strokeWidth={lw * 0.85} strokeLinecap="round" />
      <line x1={tx} y1={ty} x2={tx + spread} y2={ty + f} stroke={ink} strokeWidth={lw * 0.85} strokeLinecap="round" />
    </g>
  );
}

/** Hatched placeholder for a tick with no usable frame. */
export function MissingFrame({ x, y, w, h, id }: { x: number; y: number; w: number; h: number; id: string }) {
  return (
    <g>
      <defs>
        <pattern id={id} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="var(--bad)" strokeWidth="1.4" />
        </pattern>
      </defs>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={2.5} fill={`url(#${id})`} stroke="var(--bad)" strokeWidth={1} />
    </g>
  );
}
