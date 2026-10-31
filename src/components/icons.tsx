// Line icons, 24x24 grid, stroke 2 — drawn to match each other.

type IconProps = { size?: number; className?: string };

function Svg({ size = 22, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const LeafIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 14c0-6.5 5-11 15-11 0 10-4.5 15-11 15-2.2 0-4-1.8-4-4z" />
    <path d="M4 20c3-3 6-6 15-15" />
  </Svg>
);

export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Svg>
);

export const ChatIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z" />
  </Svg>
);

export const BookIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
  </Svg>
);

export const FarmIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21v-7" />
    <path d="M12 14c-4 0-7-2.5-7-6 3.5 0 7 2 7 6zM12 12c0-3.5 3-6 7-6 0 3.5-3 6-7 6z" />
    <path d="M4 21h16" />
  </Svg>
);

export const CameraIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="6" width="18" height="14" rx="2.5" />
    <circle cx="12" cy="13" r="3.4" />
    <path d="M8.5 6l1.2-2h4.6l1.2 2" />
  </Svg>
);

export const SendIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7z" />
  </Svg>
);

export const AlertIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </Svg>
);

export const InfoIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </Svg>
);

export const PinIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" />
    <circle cx="12" cy="10" r="2.5" />
  </Svg>
);

export const RefreshIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
    <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
    <path d="M21 3v5h-5M3 21v-5h5" />
  </Svg>
);

export const SunIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
);

export const CloudIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 9 4.5 4.5 0 0 0 7 18z" />
  </Svg>
);

export const FogIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 13A4.5 4.5 0 0 1 6.2 4 6 6 0 0 1 17.6 5a4 4 0 0 1 2.3 7" />
    <path d="M3 16h18M5 20h14" />
  </Svg>
);

export const RainIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 14h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 5 4.5 4.5 0 0 0 7 14z" />
    <path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3" />
  </Svg>
);

export const StormIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 14h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 5 4.5 4.5 0 0 0 7 14z" />
    <path d="M13 14l-3 4h4l-3 4" />
  </Svg>
);

export const ThumbUpIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" />
    <path d="M7 10l4-8a2.5 2.5 0 0 1 2.5 2.5V8h5.3a2 2 0 0 1 2 2.3l-1.3 8.5a2 2 0 0 1-2 1.7H7" />
  </Svg>
);

export const ThumbDownIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M17 14V3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1z" />
    <path d="M17 14l-4 8a2.5 2.5 0 0 1-2.5-2.5V16H5.2a2 2 0 0 1-2-2.3l1.3-8.5a2 2 0 0 1 2-1.7H17" />
  </Svg>
);

export const SprayIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 8h6v13a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z" />
    <path d="M10 8V5h4v3M14 5h3l2-2" />
    <path d="M19 7h.01M21 9h.01M19 11h.01" />
  </Svg>
);

export const SpeakerIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9h4l5-4v14l-5-4H4z" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
  </Svg>
);

export const MicIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </Svg>
);

export const StopIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </Svg>
);
