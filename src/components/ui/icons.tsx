import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const IconBed = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 18v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5" />
    <path d="M3 18v-9M21 18v-2M3 14h18" />
    <path d="M7 11V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </svg>
);

export const IconSpring = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3c1.6 1.6 1.6 3.2 0 4.8-1.6 1.6-1.6 3.2 0 4.8" />
    <path d="M8 5c1.2 1.2 1.2 2.4 0 3.6M16 5c1.2 1.2 1.2 2.4 0 3.6" />
    <path d="M4 16c1.8 0 1.8 1.5 3.6 1.5S9.4 16 11.2 16s1.8 1.5 3.6 1.5S16.6 16 18.4 16 20 17.5 21.8 17.5" />
    <path d="M4 20c1.8 0 1.8 1.5 3.6 1.5S9.4 20 11.2 20s1.8 1.5 3.6 1.5S16.6 20 18.4 20s1.8 1.5 3.4 1.5" />
  </svg>
);

export const IconLotus = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 4c1.6 2 2.4 4 2.4 6.5 0 1.2-.4 2.3-1 3.2M12 4c-1.6 2-2.4 4-2.4 6.5 0 1.2.4 2.3 1 3.2" />
    <path d="M5 9c1.6.4 3 1.6 3.8 3.2.5 1 .7 2.1.6 3.2M19 9c-1.6.4-3 1.6-3.8 3.2-.5 1-.7 2.1-.6 3.2" />
    <path d="M4 16c2.4 2.4 5.2 3.6 8 3.6s5.6-1.2 8-3.6c-2.4-1-5-1-8-1s-5.6 0-8 1Z" />
  </svg>
);

export const IconFamily = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="8" cy="6" r="2.2" />
    <circle cx="16" cy="6" r="2.2" />
    <path d="M5 20v-4a3 3 0 0 1 3-3 3 3 0 0 1 3 3v4M13 20v-4a3 3 0 0 1 3-3 3 3 0 0 1 3 3v4" />
  </svg>
);

export const IconDish = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 16h16M5 16a7 7 0 0 1 14 0M12 6V4" />
    <circle cx="12" cy="4" r="0.6" fill="currentColor" stroke="none" />
    <path d="M3 19h18" />
  </svg>
);

export const IconCamera = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
);

export const IconShield = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l7 3v5c0 4.4-3 8-7 10-4-2-7-5.6-7-10V6l7-3Z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const IconDrop = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3c3 4 5 6.6 5 9.5A5 5 0 0 1 7 12.5C7 9.6 9 7 12 3Z" />
  </svg>
);

export const IconHandHeart = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M11.5 7.5c-1-1.2-2.8-1-3.6.2-.7 1-.5 2.3.4 3.1l3.2 3 3.2-3c.9-.8 1.1-2.1.4-3.1-.8-1.2-2.6-1.4-3.6-.2Z" />
    <path d="M3 14l3.5 3.4a4 4 0 0 0 2.8 1.1H15a3 3 0 0 0 2.7-1.7L21 10" />
  </svg>
);

export const IconLeaf = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 19c0-7 5-12 14-13 .3 6-3 13-10 13a4 4 0 0 1-4-4Z" />
    <path d="M9 15c2.5-2.5 5-4 8-4.5" />
  </svg>
);

export const IconGift = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 11h16v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8ZM3 8h18v3H3zM12 8v12" />
    <path d="M12 8C10 8 8 7 8 5.5S9.5 3 12 5c2.5-2 4-1 4 .5S14 8 12 8Z" />
  </svg>
);

export const IconHeart = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 20s-7-4.4-7-9.5A4 4 0 0 1 12 7a4 4 0 0 1 7 3.5C19 15.6 12 20 12 20Z" />
  </svg>
);

export const IconStar = (p: IconProps) => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.9 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9 2.9-6Z" />
  </svg>
);

export const IconChevronDown = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const IconArrowRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const IconCheck = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12l4 4L19 6" />
  </svg>
);

export const IconCalendar = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="16" rx="2" />
    <path d="M3.5 9h17M8 3v4M16 3v4" />
  </svg>
);

export const IconEye = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
);

export const IconPhone = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5V20a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z" />
  </svg>
);

export const IconMail = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M4 7l8 6 8-6" />
  </svg>
);

export const IconPin = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

export const IconWhatsApp = (p: IconProps) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.8a8.07 8.07 0 0 1 5.74 2.38 8.06 8.06 0 0 1 2.37 5.73c0 4.48-3.65 8.12-8.12 8.12a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.07.81.82-3-.19-.31a8.08 8.08 0 0 1-1.24-4.31c0-4.48 3.64-8.12 8.12-8.12Zm-2.4 4.13c-.18 0-.46.07-.7.33-.24.26-.92.9-.92 2.2s.94 2.55 1.07 2.73c.13.18 1.85 2.83 4.49 3.96.63.27 1.11.43 1.49.55.63.2 1.2.17 1.65.1.5-.07 1.55-.63 1.77-1.25.22-.61.22-1.14.16-1.25-.07-.11-.24-.18-.51-.31-.26-.13-1.55-.77-1.79-.85-.24-.09-.42-.13-.59.13-.18.26-.68.85-.83 1.03-.15.18-.31.2-.57.07-.27-.13-1.12-.41-2.14-1.32-.79-.7-1.32-1.57-1.48-1.83-.15-.26-.02-.4.11-.53.12-.12.26-.31.4-.46.13-.16.17-.27.26-.45.09-.18.04-.33-.02-.46-.07-.13-.59-1.43-.81-1.96-.21-.51-.43-.44-.59-.45h-.5Z" />
  </svg>
);

export const IconMenu = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IconClose = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconChat = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    <path d="M8 9h8M8 12h5" />
  </svg>
);

export const IconSend = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12 20 5l-4 15-4-6-7-2Z" />
  </svg>
);

export const IconGlobe = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
  </svg>
);

export const IconSun = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const IconWaves = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 8c1.5-1.5 3-1.5 4.5 0S10.5 9.5 12 8s3-1.5 4.5 0S19.5 9.5 21 8" />
    <path d="M3 13c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
    <path d="M3 18c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
  </svg>
);

export const IconUsers = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20v-1.5a4.5 4.5 0 0 1 4.5-4.5h3A4.5 4.5 0 0 1 15 18.5V20" />
    <path d="M16 5.2a3 3 0 0 1 0 5.6M18 20v-1.5a4.5 4.5 0 0 0-3-4.2" />
  </svg>
);

export const IconWifi = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 9.5a11 11 0 0 1 15 0M7.5 13a7 7 0 0 1 9 0M10.5 16.3a3 3 0 0 1 3 0" />
    <circle cx="12" cy="19.5" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

export const IconClock = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const IconCoffee = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 9h13v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9Z" />
    <path d="M17 10h2a2 2 0 0 1 0 4h-2M7 6c0-1 1-1 1-2M11 6c0-1 1-1 1-2M5 21h14" />
  </svg>
);

export const IconDesk = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="6" width="16" height="9" rx="1" />
    <path d="M9 15v3M15 15v3M7 18h10M8 9h8M8 12h5" />
  </svg>
);

export const IconProjector = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="9" width="18" height="8" rx="2" />
    <circle cx="9" cy="13" r="2.2" />
    <path d="M15 11h3M15 14h2M6 17v2M18 17v2" />
  </svg>
);

export const IconPool = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 20V6a2 2 0 0 1 4 0v14M13 20V6a2 2 0 0 1 4 0v14M7 10h4M13 10h4" />
    <path d="M3 18c1.5-1.2 2.5-1.2 4 0s2.5 1.2 4 0 2.5-1.2 4 0 2.5 1.2 4 0" />
  </svg>
);

export const IconDumbbell = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6.5 8v8M9.5 6.5v11M14.5 6.5v11M17.5 8v8M3.5 10.5v3M20.5 10.5v3M9.5 12h5" />
  </svg>
);

export const IconBed2 = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 18v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5M3 18v-9M21 18v-2M3 14h18M7 11V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </svg>
);
