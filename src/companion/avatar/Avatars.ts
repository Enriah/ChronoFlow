export type BuiltInCompanionAvatar = {
  id: string;
  label: string;
  value: string;
};

function svgAvatar(seed: string, background: string, foreground: string, accent: string) {
  const initial = seed.charAt(0).toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="24" fill="${background}"/>
      <circle cx="48" cy="40" r="24" fill="${foreground}" opacity="0.95"/>
      <circle cx="38" cy="38" r="4" fill="${background}"/>
      <circle cx="58" cy="38" r="4" fill="${background}"/>
      <path d="M37 51c6 6 16 6 22 0" fill="none" stroke="${background}" stroke-width="5" stroke-linecap="round"/>
      <circle cx="72" cy="24" r="9" fill="${accent}"/>
      <text x="48" y="82" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="${foreground}">${initial}</text>
    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
}

export const BUILT_IN_COMPANION_AVATARS: BuiltInCompanionAvatar[] = [
  { id: 'luna', label: 'Luna', value: svgAvatar('Luna', '#151827', '#a7f3d0', '#38bdf8') },
  { id: 'nova', label: 'Nova', value: svgAvatar('Nova', '#171320', '#f0abfc', '#facc15') },
  { id: 'mira', label: 'Mira', value: svgAvatar('Mira', '#101820', '#93c5fd', '#fb7185') },
];

export const DEFAULT_COMPANION_AVATAR = BUILT_IN_COMPANION_AVATARS[0].value;
