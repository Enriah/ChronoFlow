type BlossomProps = {
  x: number;
  y: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
};

function Blossom({ x, y, scale = 1, rotate = 0, opacity = 1 }: BlossomProps) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`} opacity={opacity}>
      {Array.from({ length: 5 }).map((_, index) => (
        <path
          key={index}
          d="M0,-2.5 C-9,-10 -8,-22 0,-20 C8,-22 9,-10 0,-2.5 Z"
          transform={`rotate(${index * 72})`}
          fill="url(#hutaoPetalGradient)"
          stroke="rgba(255, 195, 166, 0.22)"
          strokeWidth="0.55"
        />
      ))}
      <circle cx="0" cy="0" r="2.4" fill="#ffd08a" opacity="0.92" />
      <circle cx="0" cy="0" r="6.5" fill="url(#hutaoFlowerGlow)" opacity="0.28" />
    </g>
  );
}

type BudProps = {
  x: number;
  y: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
};

function Bud({ x, y, scale = 1, rotate = 0, opacity = 1 }: BudProps) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`} opacity={opacity}>
      <path
        d="M0,0 C-4,-5 -3,-12 2,-14 C8,-10 7,-4 1,1 Z"
        fill="#d93645"
        stroke="#f2a06f"
        strokeWidth="0.55"
      />
      <path d="M-1,1 C-4,4 -7,5 -9,5" stroke="#6d2c1e" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </g>
  );
}

export function SidebarBranchOrnament() {
  return (
    <>
      <div className="sidebar-branch-ornament" aria-hidden="true">
        <svg
          className="h-full w-full"
          viewBox="610 20 240 970"
          preserveAspectRatio="none"
          focusable="false"
        >
          <defs>
            <linearGradient id="hutaoBranchGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4a1712" />
              <stop offset="46%" stopColor="#7a3022" />
              <stop offset="100%" stopColor="#2a0d0b" />
            </linearGradient>
            <linearGradient id="hutaoTwigGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8a3b27" />
              <stop offset="100%" stopColor="#35100d" />
            </linearGradient>
            <radialGradient id="hutaoPetalGradient" cx="50%" cy="20%" r="78%">
              <stop offset="0%" stopColor="#ffc2ab" />
              <stop offset="34%" stopColor="#ff5a66" />
              <stop offset="74%" stopColor="#b8182d" />
              <stop offset="100%" stopColor="#63101b" />
            </radialGradient>
            <radialGradient id="hutaoFlowerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff6f79" />
              <stop offset="100%" stopColor="#ff3f55" stopOpacity="0" />
            </radialGradient>
            <filter id="hutaoSoftGlow" x="-40%" y="-20%" width="180%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0.55  0 0.32 0 0 0.05  0 0 0.22 0 0.05  0 0 0 0.72 0"
                result="glow"
              />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g filter="url(#hutaoSoftGlow)" opacity="0.95">
            <path
              d="M676 1042C671 1008 674 968 683 939.5C683 939.5 716.658 877.278 723 817M748 441C731.42 507.145 696.957 533.253 683 600C666.504 678.889 731.434 736.847 723 817M723 817C683 768 683 708.5 723 674M683 600C690.333 554.833 695.6 459.8 658 441M748 441C771.916 345.587 688.578 317.485 705 220.5M748 441C743 422.167 725.5 384.9 695.5 386.5M705 220.5C716.114 154.861 798.528 135.884 786 70.5C782.873 54.1812 779.557 45.0317 771.5 30.5M705 220.5C720.167 187.333 745 119.2 723 112"
              fill="none"
              stroke="url(#hutaoBranchGradient)"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M676 1042C671 1008 674 968 683 939.5C683 939.5 716.658 877.278 723 817M748 441C731.42 507.145 696.957 533.253 683 600C666.504 678.889 731.434 736.847 723 817M723 817C683 768 683 708.5 723 674M683 600C690.333 554.833 695.6 459.8 658 441M748 441C771.916 345.587 688.578 317.485 705 220.5M748 441C743 422.167 725.5 384.9 695.5 386.5M705 220.5C716.114 154.861 798.528 135.884 786 70.5C782.873 54.1812 779.557 45.0317 771.5 30.5M705 220.5C720.167 187.333 745 119.2 723 112"
              fill="none"
              stroke="#170807"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.38"
            />
            <path d="M705 220.5 C685 200 666 190 646 190" stroke="url(#hutaoTwigGradient)" strokeWidth="3.4" strokeLinecap="round" fill="none" opacity="0.86" />
            <path d="M748 441 C779 425 802 396 811 360" stroke="url(#hutaoTwigGradient)" strokeWidth="3.6" strokeLinecap="round" fill="none" opacity="0.86" />
            <path d="M683 600 C662 588 643 591 624 613" stroke="url(#hutaoTwigGradient)" strokeWidth="3.3" strokeLinecap="round" fill="none" opacity="0.86" />
            <path d="M723 817 C754 790 781 774 810 780" stroke="url(#hutaoTwigGradient)" strokeWidth="3.4" strokeLinecap="round" fill="none" opacity="0.86" />
            <path d="M723 674 C697 654 672 650 646 664" stroke="url(#hutaoTwigGradient)" strokeWidth="3.2" strokeLinecap="round" fill="none" opacity="0.72" />

            <Blossom x={771} y={31} scale={0.58} rotate={18} opacity={0.78} />
            <Blossom x={786} y={71} scale={0.66} rotate={-12} opacity={0.84} />
            <Blossom x={723} y={112} scale={0.72} rotate={24} opacity={0.88} />
            <Blossom x={705} y={220} scale={0.82} rotate={-16} opacity={0.95} />
            <Blossom x={647} y={190} scale={0.62} rotate={18} opacity={0.76} />
            <Blossom x={695} y={386} scale={0.74} rotate={12} opacity={0.9} />
            <Blossom x={748} y={441} scale={0.92} rotate={-8} opacity={0.96} />
            <Blossom x={811} y={360} scale={0.64} rotate={28} opacity={0.78} />
            <Blossom x={683} y={600} scale={0.86} rotate={-22} opacity={0.95} />
            <Blossom x={625} y={613} scale={0.6} rotate={8} opacity={0.74} />
            <Blossom x={723} y={674} scale={0.74} rotate={20} opacity={0.88} />
            <Blossom x={646} y={664} scale={0.58} rotate={-18} opacity={0.72} />
            <Blossom x={723} y={817} scale={0.92} rotate={-10} opacity={0.96} />
            <Blossom x={810} y={780} scale={0.64} rotate={18} opacity={0.78} />
            <Blossom x={683} y={939} scale={0.74} rotate={26} opacity={0.86} />
            <Blossom x={711} y={402} scale={0.5} rotate={-14} opacity={0.66} />
            <Blossom x={732} y={424} scale={0.97} rotate={16} opacity={0.6} />
            <Blossom x={660} y={440} scale={0.9} rotate={16} opacity={0.6} />
            <Blossom x={664} y={453} scale={0.5} rotate={10} opacity={0.6} />
            <Blossom x={669} y={466} scale={0.42} rotate={10} opacity={0.6} />
            <Blossom x={677} y={475} scale={0.72} rotate={10} opacity={0.6} />
            <Blossom x={689} y={540} scale={0.92} rotate={10} opacity={0.6} />
            <Blossom x={764} y={418} scale={0.52} rotate={-20} opacity={0.68} />
            <Blossom x={792} y={381} scale={0.4} rotate={10} opacity={0.56} />
            <Blossom x={690} y={205} scale={0.5} rotate={12} opacity={0.66} />
            <Blossom x={719} y={204} scale={0.46} rotate={-24} opacity={0.58} />
            <Blossom x={663} y={205} scale={0.42} rotate={10} opacity={0.54} />
            <Blossom x={666} y={585} scale={0.48} rotate={14} opacity={0.62} />
            <Blossom x={700} y={619} scale={0.46} rotate={-12} opacity={0.58} />
            <Blossom x={641} y={596} scale={0.38} rotate={22} opacity={0.52} />
            <Blossom x={705} y={797} scale={0.46} rotate={8} opacity={0.62} />
            <Blossom x={742} y={836} scale={0.44} rotate={-16} opacity={0.58} />
            <Blossom x={792} y={796} scale={0.38} rotate={18} opacity={0.5} />
            <Blossom x={695} y={914} scale={0.4} rotate={12} opacity={0.52} />
            <Blossom x={720} y={520} scale={0.52} rotate={10} opacity={0.68} />
            <Blossom x={706} y={536} scale={0.42} rotate={-14} opacity={0.58} />
            <Blossom x={734} y={505} scale={0.36} rotate={18} opacity={0.52} />
            <Blossom x={694} y={558} scale={0.4} rotate={-8} opacity={0.56} />
            <Blossom x={736} y={486} scale={0.44} rotate={12} opacity={0.6} />
            <Blossom x={666} y={176} scale={0.38} rotate={16} opacity={0.56} />
            <Blossom x={682} y={188} scale={0.42} rotate={-12} opacity={0.6} />
            <Blossom x={694} y={206} scale={0.36} rotate={14} opacity={0.54} />
            <Blossom x={720} y={188} scale={0.34} rotate={-18} opacity={0.5} />
            <Blossom x={752} y={518} scale={0.4} rotate={-18} opacity={0.56} />
            <Blossom x={685} y={548} scale={0.42} rotate={20} opacity={0.58} />
            <Blossom x={668} y={570} scale={0.34} rotate={-10} opacity={0.5} />
            <Blossom x={709} y={704} scale={0.46} rotate={-8} opacity={0.62} />
            <Blossom x={694} y={722} scale={0.38} rotate={14} opacity={0.54} />
            <Blossom x={724} y={688} scale={0.34} rotate={-16} opacity={0.48} />
            <Blossom x={668} y={636} scale={0.42} rotate={16} opacity={0.56} />
            <Blossom x={694} y={650} scale={0.38} rotate={-12} opacity={0.5} />
            <Blossom x={709} y={662} scale={0.34} rotate={20} opacity={0.46} />
            <Blossom x={689} y={706} scale={0.42} rotate={-18} opacity={0.58} />
            <Blossom x={681} y={735} scale={0.48} rotate={14} opacity={0.66} />
            <Blossom x={687} y={766} scale={0.38} rotate={-10} opacity={0.54} />
            <Blossom x={702} y={790} scale={0.34} rotate={22} opacity={0.48} />
            <Blossom x={716} y={868} scale={0.42} rotate={16} opacity={0.52} />
            <Blossom x={701} y={886} scale={0.34} rotate={-12} opacity={0.46} />
            <Blossom x={720} y={384} scale={0.34} rotate={24} opacity={0.56} />
            <Blossom x={704} y={724} scale={0.32} rotate={-32} opacity={0.54} />
            <Blossom x={760} y={44} scale={0.42} rotate={-10} opacity={0.62} />
            <Blossom x={781} y={50} scale={0.36} rotate={18} opacity={0.56} />
            <Blossom x={792} y={87} scale={0.34} rotate={-20} opacity={0.52} />
            <Blossom x={747} y={92} scale={0.38} rotate={12} opacity={0.58} />
            <Blossom x={735} y={122} scale={0.4} rotate={-14} opacity={0.6} />
            <Blossom x={718} y={144} scale={0.36} rotate={22} opacity={0.54} />

            <Bud x={756} y={48} scale={0.48} rotate={-54} opacity={0.78} />
            <Bud x={740} y={123} scale={0.46} rotate={28} opacity={0.8} />
            <Bud x={685} y={198} scale={0.5} rotate={-42} opacity={0.82} />
            <Bud x={772} y={417} scale={0.5} rotate={48} opacity={0.84} />
            <Bud x={704} y={554} scale={0.5} rotate={-28} opacity={0.82} />
            <Bud x={666} y={604} scale={0.46} rotate={-68} opacity={0.78} />
            <Bud x={675} y={718} scale={0.36} rotate={-54} opacity={0.68} />
            <Bud x={694} y={754} scale={0.38} rotate={28} opacity={0.7} />
            <Bud x={691} y={782} scale={0.34} rotate={-24} opacity={0.62} />
            <Bud x={748} y={802} scale={0.5} rotate={42} opacity={0.82} />
            <Bud x={706} y={883} scale={0.46} rotate={-26} opacity={0.78} />
          </g>
        </svg>
      </div>
      <img className="hutao-sidebar-chibi" src="/themes/hutao_chibi.png" alt="" aria-hidden="true" />
    </>
  );
}
