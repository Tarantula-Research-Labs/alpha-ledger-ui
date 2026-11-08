import s from "./gear.module.css";

// One gear: a ring with teeth around it, drawn around (0, 0).
function Gear({ teeth, radius, tooth }: { teeth: number; radius: number; tooth: number }) {
  return (
    <>
      {Array.from({ length: teeth }, (_, i) => (
        <rect
          key={i}
          x={-tooth * 0.45}
          y={-(radius + tooth)}
          width={tooth * 0.9}
          height={tooth + 4}
          rx={2}
          fill="currentColor"
          transform={`rotate(${(360 / teeth) * i})`}
        />
      ))}
      <circle r={radius - tooth * 0.6} fill="none" stroke="currentColor" strokeWidth={tooth * 1.2} />
      <circle r={3} fill="currentColor" />
    </>
  );
}

// Two interlocking gears turning in opposite directions, with a caption underneath.
export function GearSpinner({ label }: { label: string }) {
  return (
    <div className={s.wrap} role="status" aria-live="polite">
      <svg className={s.svg} viewBox="0 0 96 88" aria-hidden="true">
        <g transform="translate(40 52)">
          <g className={s.big}>
            <Gear teeth={10} radius={20} tooth={8} />
          </g>
        </g>
        <g transform="translate(68 24)">
          <g className={s.small}>
            <Gear teeth={7} radius={13} tooth={7} />
          </g>
        </g>
      </svg>
      <span className={s.label}>{label}</span>
    </div>
  );
}
