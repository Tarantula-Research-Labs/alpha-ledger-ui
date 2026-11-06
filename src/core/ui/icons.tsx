// Small line icons used in the navigation. 16px, drawn with currentColor.
const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

export const DashboardIcon = () => (
  <svg {...base}>
    <rect x="3" y="4" width="18" height="13" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

export const ExperimentsIcon = () => (
  <svg {...base}>
    <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" />
    <path d="M7.5 14h9" />
  </svg>
);

export const StatusIcon = () => (
  <svg {...base}>
    <path d="M3 12h4l3-7 4 14 3-7h4" />
  </svg>
);

export const SignOutIcon = () => (
  <svg {...base}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />
  </svg>
);
