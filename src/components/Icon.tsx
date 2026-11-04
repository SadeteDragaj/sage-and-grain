// One line-icon set: 24px grid, 1.6px stroke, round caps.
const PATHS = {
  leaf: <><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" /><path d="M5 19l8-8" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  bookmark: <path d="M6 4h12v16l-6-4-6 4z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
  share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" /></>,
  print: <><path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2" /><path d="M7 14h10v6H7z" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  minus: <path d="M6 12h12" />,
  plus: <path d="M12 6v12M6 12h12" />,
  filter: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  reset: <><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v5h5" /></>,
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  timer: <><circle cx="12" cy="13" r="7.5" /><path d="M12 9.5V13l2.5 1.5M9.5 2.5h5" /></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></>,
  instagram: <><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" /><circle cx="16.8" cy="7.2" r="0.6" fill="currentColor" /></>,
  pin: <><path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z" /><circle cx="12" cy="10" r="2.2" /></>,
  video: <><rect x="3" y="6" width="18" height="12" rx="3.5" /><path d="m10.5 9.5 4 2.5-4 2.5z" /></>,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, filled = false, className }: { name: IconName; size?: number; filled?: boolean; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
