import type { SpecialThemeDefinition } from '../registry';

type StarProps = {
  x: number;
  y: number;
  size?: number;
  opacity?: number;
};

function SoftStar({ x, y, size = 1, opacity = 1 }: StarProps) {
  const scale = size;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <path
        d="M0,-18 C2.4,-8.2 8.2,-2.4 18,0 C8.2,2.4 2.4,8.2 0,18 C-2.4,8.2 -8.2,2.4 -18,0 C-8.2,-2.4 -2.4,-8.2 0,-18 Z"
        fill="url(#laylaStarFill)"
        stroke="rgba(248, 251, 255, 0.9)"
        strokeWidth="2"
      />
      <circle cx="-4.5" cy="-4" r="1.2" fill="white" opacity="0.75" />
      <circle cx="4.2" cy="-5.5" r="0.9" fill="white" opacity="0.62" />
      <circle cx="5.8" cy="4.4" r="0.85" fill="white" opacity="0.58" />
    </g>
  );
}

type StringProps = {
  x: number;
  y1: number;
  y2: number;
  starY: number;
  starSize?: number;
  opacity?: number;
};

function HangingStar({ x, y1, y2, starY, starSize = 0.72, opacity = 1 }: StringProps) {
  return (
    <g className="layla-hanging-star" opacity={opacity} style={{ transformOrigin: `${x}px ${y1}px` }}>
      <path d={`M${x} ${y1} C${x - 2} ${y1 + 36}, ${x + 2} ${y2 - 28}, ${x} ${y2}`} stroke="url(#laylaThread)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx={x} cy={y2 + 4} r="2.8" fill="#dbeafe" opacity="0.78" />
      <SoftStar x={x} y={starY} size={starSize} opacity={0.92} />
    </g>
  );
}

export function SidebarAstrolabeOrnament({ definition }: { definition?: SpecialThemeDefinition }) {
  return (
    <>
      <div className="layla-sidebar-ornament" aria-hidden="true">
        <svg viewBox="0 0 180 560" preserveAspectRatio="xMidYMin meet" focusable="false">
          <defs>
            <linearGradient id="laylaThread" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.75" />
              <stop offset="68%" stopColor="#93c5fd" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0.86" />
            </linearGradient>
            <linearGradient id="laylaRing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#d8b889" />
              <stop offset="48%" stopColor="#6f4b38" />
              <stop offset="100%" stopColor="#d7b072" />
            </linearGradient>
            <radialGradient id="laylaOrb" cx="38%" cy="26%" r="72%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.82" />
              <stop offset="35%" stopColor="#60a5fa" stopOpacity="0.7" />
              <stop offset="78%" stopColor="#1d4ed8" stopOpacity="0.48" />
              <stop offset="100%" stopColor="#0b1e52" stopOpacity="0.34" />
            </radialGradient>
            <radialGradient id="laylaStarFill" cx="45%" cy="32%" r="74%">
              <stop offset="0%" stopColor="#f8fbff" />
              <stop offset="34%" stopColor="#9ccaff" />
              <stop offset="72%" stopColor="#315eac" />
              <stop offset="100%" stopColor="#0d2a66" />
            </radialGradient>
            <filter id="laylaSoftGlow" x="-40%" y="-25%" width="180%" height="160%">
              <feGaussianBlur stdDeviation="3.2" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="0 0 0 0 0.28  0 0 0 0 0.55  0 0 0 0 1  0 0 0 0.55 0"
                result="glow"
              />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g filter="url(#laylaSoftGlow)">
            <ellipse cx="92" cy="54" rx="78" ry="18" fill="none" stroke="#1b1220" strokeWidth="13" opacity="0.42" />
            <ellipse cx="92" cy="50" rx="78" ry="18" fill="none" stroke="url(#laylaRing)" strokeWidth="10" strokeDasharray="62 10" strokeLinecap="round" />
            <path d="M79 18 L94 0 L109 18 L100 45 L88 45 Z" fill="url(#laylaRing)" opacity="0.82" />
            <path d="M90 15 L99 15 L96 27 L87 27 Z" fill="#244c89" opacity="0.78" />

            <circle cx="86" cy="118" r="45" fill="url(#laylaOrb)" opacity="0.82" />
            <path d="M54 97 C78 74 111 88 122 110" stroke="#dbeafe" strokeWidth="4" strokeLinecap="round" opacity="0.2" fill="none" />
            <path d="M58 133 C82 154 109 144 124 120" stroke="#0f2e68" strokeWidth="5" strokeLinecap="round" opacity="0.24" fill="none" />

            <HangingStar x={34} y1={66} y2={160} starY={190} starSize={0.62} opacity={0.88} />
            <HangingStar x={72} y1={62} y2={200} starY={230} starSize={0.62} opacity={0.95} />
            <HangingStar x={105} y1={64} y2={184} starY={214} starSize={0.7} opacity={0.96} />
            <HangingStar x={142} y1={66} y2={148} starY={178} starSize={0.64} opacity={0.9} />
            <HangingStar x={87} y1={62} y2={432} starY={466} starSize={0.58} opacity={0.76} />
            <HangingStar x={136} y1={58} y2={318} starY={354} starSize={0.7} opacity={0.74} />
            <HangingStar x={51} y1={68} y2={265} starY={292} starSize={0.48} opacity={0.72} />
          </g>
        </svg>
      </div>
      {definition?.assets?.sidebarChibiUrl && <img className="layla-sidebar-chibi" src={definition.assets.sidebarChibiUrl} alt="" aria-hidden="true" />}
    </>
  );
}
