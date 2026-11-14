import React from 'react';

export const BORDER_DESIGNS = [
  { id: 'none', name: 'No Border (None)', category: 'Clean' },
  { id: 'classic_single', name: 'Classic Single Line', category: 'Classic' },
  { id: 'double_line', name: 'Double Line', category: 'Classic' },
  { id: 'thin_elegant', name: 'Thin Elegant Border', category: 'Minimalist' },
  { id: 'thick_formal', name: 'Thick Formal Border', category: 'Formal' },
  { id: 'rounded_corner', name: 'Rounded Corner Border', category: 'Modern' },
  { id: 'decorative_corner', name: 'Decorative Corner Border', category: 'Ornamental' },
  { id: 'double_decorative', name: 'Double Decorative Border', category: 'Ornamental' },
  { id: 'minimalist', name: 'Minimalist Border', category: 'Minimalist' },
  { id: 'gold_frame', name: 'Gold Frame Border', category: 'Prestige' },
  { id: 'silver_frame', name: 'Silver Frame Border', category: 'Prestige' },
  { id: 'royal_ornamental', name: 'Royal Ornamental Border', category: 'Regal' },
  { id: 'classic_vintage', name: 'Classic Vintage Border', category: 'Vintage' },
  { id: 'geometric', name: 'Geometric Border', category: 'Modern' },
  { id: 'floral_corner', name: 'Floral Corner Border', category: 'Ornamental' },
  { id: 'elegant_inner', name: 'Elegant Inner Frame', category: 'Classic' },
  { id: 'outer_inner_double', name: 'Outer and Inner Double Frame', category: 'Formal' },
  { id: 'dashed', name: 'Dashed Border', category: 'Modern' },
  { id: 'dotted', name: 'Dotted Border', category: 'Modern' },
  { id: 'art_deco', name: 'Art Deco Border', category: 'Prestige' },
  { id: 'premium_frame', name: 'Premium Certificate Frame', category: 'Prestige' }
];

/**
 * Render SVG borders for 1200x850 landscape certificates
 */
export const renderCertificateBorder = (
  borderStyle = 'classic_single',
  width = 1200,
  height = 850,
  borderColor = '#d97706',
  borderWidth = 3,
  prefix = 'border'
) => {
  if (!borderStyle || borderStyle === 'none') return null;

  const bw = Math.max(1, Number(borderWidth) || 3);
  const color = borderColor || '#d97706';

  switch (borderStyle) {
    case 'classic_single':
      return (
        <g id={`${prefix}-classic-single`} style={{ pointerEvents: 'none' }}>
          <rect
            x={24}
            y={24}
            width={width - 48}
            height={height - 48}
            fill="none"
            stroke={color}
            strokeWidth={bw}
          />
        </g>
      );

    case 'double_line':
      return (
        <g id={`${prefix}-double-line`} style={{ pointerEvents: 'none' }}>
          <rect
            x={20}
            y={20}
            width={width - 40}
            height={height - 40}
            fill="none"
            stroke={color}
            strokeWidth={bw + 1}
          />
          <rect
            x={28}
            y={28}
            width={width - 56}
            height={height - 56}
            fill="none"
            stroke={color}
            strokeWidth={Math.max(1, bw - 1)}
          />
        </g>
      );

    case 'thin_elegant':
      return (
        <g id={`${prefix}-thin-elegant`} style={{ pointerEvents: 'none' }}>
          <rect
            x={22}
            y={22}
            width={width - 44}
            height={height - 44}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
          />
          <rect
            x={28}
            y={28}
            width={width - 56}
            height={height - 56}
            fill="none"
            stroke={color}
            strokeWidth={0.8}
            strokeDasharray="4 2"
          />
          {/* Subtle corner notches */}
          <circle cx={22} cy={22} r={3} fill={color} />
          <circle cx={width - 22} cy={22} r={3} fill={color} />
          <circle cx={22} cy={height - 22} r={3} fill={color} />
          <circle cx={width - 22} cy={height - 22} r={3} fill={color} />
        </g>
      );

    case 'thick_formal':
      return (
        <g id={`${prefix}-thick-formal`} style={{ pointerEvents: 'none' }}>
          <rect
            x={18}
            y={18}
            width={width - 36}
            height={height - 36}
            fill="none"
            stroke={color}
            strokeWidth={bw + 4}
          />
          <rect
            x={28}
            y={28}
            width={width - 56}
            height={height - 56}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
          />
        </g>
      );

    case 'rounded_corner':
      return (
        <g id={`${prefix}-rounded-corner`} style={{ pointerEvents: 'none' }}>
          <rect
            x={22}
            y={22}
            width={width - 44}
            height={height - 44}
            rx={24}
            ry={24}
            fill="none"
            stroke={color}
            strokeWidth={bw}
          />
          <rect
            x={30}
            y={30}
            width={width - 60}
            height={height - 60}
            rx={18}
            ry={18}
            fill="none"
            stroke={color}
            strokeWidth={Math.max(1, bw - 1.5)}
          />
        </g>
      );

    case 'decorative_corner': {
      const arm = 45;
      return (
        <g id={`${prefix}-decorative-corner`} style={{ pointerEvents: 'none' }}>
          <rect
            x={25}
            y={25}
            width={width - 50}
            height={height - 50}
            fill="none"
            stroke={color}
            strokeWidth={bw}
          />
          {/* Top-Left */}
          <path d={`M 15,${25 + arm} L 15,15 L ${25 + arm},15`} fill="none" stroke={color} strokeWidth={bw} />
          <circle cx={15} cy={15} r={4} fill={color} />
          {/* Top-Right */}
          <path d={`M ${width - 25 - arm},15 L ${width - 15},15 L ${width - 15},${25 + arm}`} fill="none" stroke={color} strokeWidth={bw} />
          <circle cx={width - 15} cy={15} r={4} fill={color} />
          {/* Bottom-Left */}
          <path d={`M 15,${height - 25 - arm} L 15,${height - 15} L ${25 + arm},${height - 15}`} fill="none" stroke={color} strokeWidth={bw} />
          <circle cx={15} cy={height - 15} r={4} fill={color} />
          {/* Bottom-Right */}
          <path d={`M ${width - 25 - arm},${height - 15} L ${width - 15},${height - 15} L ${width - 15},${height - 25 - arm}`} fill="none" stroke={color} strokeWidth={bw} />
          <circle cx={width - 15} cy={height - 15} r={4} fill={color} />
        </g>
      );
    }

    case 'double_decorative': {
      return (
        <g id={`${prefix}-double-decorative`} style={{ pointerEvents: 'none' }}>
          <rect x={20} y={20} width={width - 40} height={height - 40} fill="none" stroke={color} strokeWidth={bw} />
          <rect x={28} y={28} width={width - 56} height={height - 56} fill="none" stroke={color} strokeWidth={1} />
          <rect x={34} y={34} width={width - 68} height={height - 68} fill="none" stroke={color} strokeWidth={bw} />
          {/* Corner Diamonds */}
          <polygon points="27,19 35,27 27,35 19,27" fill={color} />
          <polygon points={`${width - 27},19 ${width - 19},27 ${width - 27},35 ${width - 35},27`} fill={color} />
          <polygon points={`27,${height - 35} 35,${height - 27} 27,${height - 19} 19,${height - 27}`} fill={color} />
          <polygon points={`${width - 27},${height - 35} ${width - 19},${height - 27} ${width - 27},${height - 19} ${width - 35},${height - 27}`} fill={color} />
        </g>
      );
    }

    case 'minimalist':
      return (
        <g id={`${prefix}-minimalist`} style={{ pointerEvents: 'none' }}>
          {/* 4 floating corner L-brackets with gap in centers */}
          <path d={`M 60,30 L 30,30 L 30,120`} fill="none" stroke={color} strokeWidth={bw} />
          <path d={`M ${width - 60},30 L ${width - 30},30 L ${width - 30},120`} fill="none" stroke={color} strokeWidth={bw} />
          <path d={`M 60,${height - 30} L 30,${height - 30} L 30,${height - 120}`} fill="none" stroke={color} strokeWidth={bw} />
          <path d={`M ${width - 60},${height - 30} L ${width - 30},${height - 30} L ${width - 30},${height - 120}`} fill="none" stroke={color} strokeWidth={bw} />
          {/* Center edge ticks */}
          <line x1={width / 2 - 40} y1={30} x2={width / 2 + 40} y2={30} stroke={color} strokeWidth={bw} />
          <line x1={width / 2 - 40} y1={height - 30} x2={width / 2 + 40} y2={height - 30} stroke={color} strokeWidth={bw} />
        </g>
      );

    case 'gold_frame':
      return (
        <g id={`${prefix}-gold-frame`} style={{ pointerEvents: 'none' }}>
          <rect x={18} y={18} width={width - 36} height={height - 36} fill="none" stroke={color} strokeWidth={bw + 2} />
          <rect x={26} y={26} width={width - 52} height={height - 52} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
          <rect x={32} y={32} width={width - 64} height={height - 64} fill="none" stroke={color} strokeWidth={bw} />
          {/* 4 Corner rosette medallions */}
          {[[25, 25], [width - 25, 25], [25, height - 25], [width - 25, height - 25]].map(([cx, cy], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r={8} fill={color} />
              <circle cx={cx} cy={cy} r={5} fill="#fef3c7" />
              <circle cx={cx} cy={cy} r={2.5} fill={color} />
            </g>
          ))}
        </g>
      );

    case 'silver_frame':
      return (
        <g id={`${prefix}-silver-frame`} style={{ pointerEvents: 'none' }}>
          <rect x={20} y={20} width={width - 40} height={height - 40} fill="none" stroke="#64748b" strokeWidth={bw + 2} />
          <rect x={27} y={27} width={width - 54} height={height - 54} fill="none" stroke="#cbd5e1" strokeWidth={1} />
          <rect x={32} y={32} width={width - 64} height={height - 64} fill="none" stroke="#475569" strokeWidth={bw} />
          {/* Square Corner Studs */}
          {[[20, 20], [width - 34, 20], [20, height - 34], [width - 34, height - 34]].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width={14} height={14} fill="#64748b" stroke="#cbd5e1" strokeWidth={1.5} />
          ))}
        </g>
      );

    case 'royal_ornamental':
      return (
        <g id={`${prefix}-royal-ornamental`} style={{ pointerEvents: 'none' }}>
          <rect x={22} y={22} width={width - 44} height={height - 44} fill="none" stroke={color} strokeWidth={bw} />
          <rect x={30} y={30} width={width - 60} height={height - 60} fill="none" stroke={color} strokeWidth={1.5} />
          {/* Crown-like corner scallops */}
          <path d="M 22,50 Q 50,50 50,22" fill="none" stroke={color} strokeWidth={bw} />
          <path d={`M ${width - 22},50 Q ${width - 50},50 ${width - 50},22`} fill="none" stroke={color} strokeWidth={bw} />
          <path d={`M 22,${height - 50} Q 50,${height - 50} 50,${height - 22}`} fill="none" stroke={color} strokeWidth={bw} />
          <path d={`M ${width - 22},${height - 50} Q ${width - 50},${height - 50} ${width - 50},${height - 22}`} fill="none" stroke={color} strokeWidth={bw} />
          {/* Center edge crest tabs */}
          <polygon points={`${width / 2 - 25},22 ${width / 2},12 ${width / 2 + 25},22`} fill={color} />
          <polygon points={`${width / 2 - 25},${height - 22} ${width / 2},${height - 12} ${width / 2 + 25},${height - 22}`} fill={color} />
        </g>
      );

    case 'classic_vintage':
      return (
        <g id={`${prefix}-classic-vintage`} style={{ pointerEvents: 'none' }}>
          <rect x={18} y={18} width={width - 36} height={height - 36} fill="none" stroke={color} strokeWidth={bw + 1} />
          <rect x={24} y={24} width={width - 48} height={height - 48} fill="none" stroke={color} strokeWidth={1} strokeDasharray="3 3" />
          <rect x={32} y={32} width={width - 64} height={height - 64} fill="none" stroke={color} strokeWidth={Math.max(1, bw - 1)} />
          {/* Banknote corner circles */}
          <circle cx={25} cy={25} r={7} fill="none" stroke={color} strokeWidth={1.5} />
          <circle cx={width - 25} cy={25} r={7} fill="none" stroke={color} strokeWidth={1.5} />
          <circle cx={25} cy={height - 25} r={7} fill="none" stroke={color} strokeWidth={1.5} />
          <circle cx={width - 25} cy={height - 25} r={7} fill="none" stroke={color} strokeWidth={1.5} />
        </g>
      );

    case 'geometric': {
      const step = 20;
      return (
        <g id={`${prefix}-geometric`} style={{ pointerEvents: 'none' }}>
          <rect x={25} y={25} width={width - 50} height={height - 50} fill="none" stroke={color} strokeWidth={bw} />
          {/* Stepped corner insets */}
          <path d={`M 25,${25 + step} L ${25 + step},${25 + step} L ${25 + step},25`} fill="none" stroke={color} strokeWidth={bw} />
          <path d={`M ${width - 25},${25 + step} L ${width - 25 - step},${25 + step} L ${width - 25 - step},25`} fill="none" stroke={color} strokeWidth={bw} />
          <path d={`M 25,${height - 25 - step} L ${25 + step},${height - 25 - step} L ${25 + step},${height - 25}`} fill="none" stroke={color} strokeWidth={bw} />
          <path d={`M ${width - 25},${height - 25 - step} L ${width - 25 - step},${height - 25 - step} L ${width - 25 - step},${height - 25}`} fill="none" stroke={color} strokeWidth={bw} />
        </g>
      );
    }

    case 'floral_corner':
      return (
        <g id={`${prefix}-floral-corner`} style={{ pointerEvents: 'none' }}>
          <rect x={28} y={28} width={width - 56} height={height - 56} fill="none" stroke={color} strokeWidth={bw} />
          {/* Curving vine/scroll corner accents */}
          <path d="M 28,65 C 28,45 45,28 65,28 C 45,35 35,45 28,65 Z" fill={color} />
          <circle cx={42} cy={42} r={3} fill={color} />
          <path d={`M ${width - 28},65 C ${width - 28},45 ${width - 45},28 ${width - 65},28 C ${width - 45},35 ${width - 35},45 ${width - 28},65 Z`} fill={color} />
          <circle cx={width - 42} cy={42} r={3} fill={color} />
          <path d={`M 28,${height - 65} C 28,${height - 45} 45,${height - 28} 65,${height - 28} C 45,${height - 35} 35,${height - 45} 28,${height - 65} Z`} fill={color} />
          <circle cx={42} cy={height - 42} r={3} fill={color} />
          <path d={`M ${width - 28},${height - 65} C ${width - 28},${height - 45} ${width - 45},${height - 28} ${width - 65},${height - 28} C ${width - 45},${height - 35} ${width - 35},${height - 45} ${width - 28},${height - 65} Z`} fill={color} />
          <circle cx={width - 42} cy={height - 42} r={3} fill={color} />
        </g>
      );

    case 'elegant_inner':
      return (
        <g id={`${prefix}-elegant-inner`} style={{ pointerEvents: 'none' }}>
          <rect x={18} y={18} width={width - 36} height={height - 36} fill="none" stroke={color} strokeWidth={bw} />
          <rect x={36} y={36} width={width - 72} height={height - 72} fill="none" stroke={color} strokeWidth={1} />
          {/* Diagonal corner bridge ties */}
          <line x1={18} y1={18} x2={36} y2={36} stroke={color} strokeWidth={1.5} />
          <line x1={width - 18} y1={18} x2={width - 36} y2={36} stroke={color} strokeWidth={1.5} />
          <line x1={18} y1={height - 18} x2={36} y2={height - 36} stroke={color} strokeWidth={1.5} />
          <line x1={width - 18} y1={height - 18} x2={width - 36} y2={height - 36} stroke={color} strokeWidth={1.5} />
        </g>
      );

    case 'outer_inner_double':
      return (
        <g id={`${prefix}-outer-inner-double`} style={{ pointerEvents: 'none' }}>
          <rect x={16} y={16} width={width - 32} height={height - 32} fill="none" stroke={color} strokeWidth={bw + 2} />
          <rect x={36} y={36} width={width - 72} height={height - 72} fill="none" stroke={color} strokeWidth={bw} />
        </g>
      );

    case 'dashed':
      return (
        <g id={`${prefix}-dashed`} style={{ pointerEvents: 'none' }}>
          <rect
            x={24}
            y={24}
            width={width - 48}
            height={height - 48}
            fill="none"
            stroke={color}
            strokeWidth={bw}
            strokeDasharray="12 6"
          />
        </g>
      );

    case 'dotted':
      return (
        <g id={`${prefix}-dotted`} style={{ pointerEvents: 'none' }}>
          <rect
            x={24}
            y={24}
            width={width - 48}
            height={height - 48}
            fill="none"
            stroke={color}
            strokeWidth={bw + 1}
            strokeDasharray="2 8"
            strokeLinecap="round"
          />
        </g>
      );

    case 'art_deco': {
      const sz = 35;
      return (
        <g id={`${prefix}-art-deco`} style={{ pointerEvents: 'none' }}>
          <rect x={24} y={24} width={width - 48} height={height - 48} fill="none" stroke={color} strokeWidth={bw} />
          {/* Stepped chevron corners */}
          {/* Top-Left */}
          <polygon points={`24,${24 + sz} ${24 + sz},24 24,24`} fill={color} />
          <line x1={24 + sz + 8} y1={24} x2={24} y2={24 + sz + 8} stroke={color} strokeWidth={1.5} />
          {/* Top-Right */}
          <polygon points={`${width - 24 - sz},24 ${width - 24},${24 + sz} ${width - 24},24`} fill={color} />
          <line x1={width - 24 - sz - 8} y1={24} x2={width - 24} y2={24 + sz + 8} stroke={color} strokeWidth={1.5} />
          {/* Bottom-Left */}
          <polygon points={`24,${height - 24 - sz} 24,${height - 24} ${24 + sz},${height - 24}`} fill={color} />
          <line x1={24} y1={height - 24 - sz - 8} x2={24 + sz + 8} y2={height - 24} stroke={color} strokeWidth={1.5} />
          {/* Bottom-Right */}
          <polygon points={`${width - 24},${height - 24 - sz} ${width - 24},${height - 24} ${width - 24 - sz},${height - 24}`} fill={color} />
          <line x1={width - 24} y1={height - 24 - sz - 8} x2={width - 24 - sz - 8} y2={height - 24} stroke={color} strokeWidth={1.5} />
        </g>
      );
    }

    case 'premium_frame':
      return (
        <g id={`${prefix}-premium-frame`} style={{ pointerEvents: 'none' }}>
          {/* Triple-layer frame */}
          <rect x={16} y={16} width={width - 32} height={height - 32} fill="none" stroke={color} strokeWidth={bw + 3} />
          <rect x={26} y={26} width={width - 52} height={height - 52} fill="none" stroke={color} strokeWidth={1} />
          <rect x={32} y={32} width={width - 64} height={height - 64} fill="none" stroke={color} strokeWidth={Math.max(1, bw - 1)} />
          {/* Corner rosettes with nested cross */}
          {[[24, 24], [width - 24, 24], [24, height - 24], [width - 24, height - 24]].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={9} fill={color} />
              <polygon points={`${x},${y - 6} ${x + 6},${y} ${x},${y + 6} ${x - 6},${y}`} fill="#ffffff" />
            </g>
          ))}
          {/* Medallions at top and bottom center */}
          <polygon points={`${width / 2 - 20},16 ${width / 2},8 ${width / 2 + 20},16 ${width / 2},24`} fill={color} />
          <polygon points={`${width / 2 - 20},${height - 16} ${width / 2},${height - 8} ${width / 2 + 20},${height - 16} ${width / 2},${height - 24}`} fill={color} />
        </g>
      );

    // Backward compatibility for old border styles
    case 'classic_gold':
      return renderCertificateBorder('gold_frame', width, height, color, bw, prefix);
    case 'double_emerald':
      return renderCertificateBorder('rounded_corner', width, height, color, bw, prefix);
    case 'formal_academic':
      return renderCertificateBorder('outer_inner_double', width, height, color, bw, prefix);

    default:
      return renderCertificateBorder('classic_single', width, height, color, bw, prefix);
  }
};

