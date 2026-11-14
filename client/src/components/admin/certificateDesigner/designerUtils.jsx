import React from 'react';
import { SAMPLE_DATA } from './designerConstants';

/**
 * Replace dynamic tokens {{learnerName}}, {{courseName}}, etc. in string
 */
export const replaceTokens = (text, data = {}) => {
  if (!text || typeof text !== 'string') return text || '';
  const context = { ...SAMPLE_DATA, ...data };

  const resolvedAdmin = context.adminName || context.instructorName || 'Administrator';

  return text
    .replace(/\{\{learnerName\}\}/gi, context.learnerName || 'Learner Name')
    .replace(/\{\{courseName\}\}/gi, context.courseName || 'Course Title')
    .replace(/\{\{completionDate\}\}/gi, context.completionDate || 'Completion Date')
    .replace(/\{\{certificateId\}\}/gi, context.certificateId || 'CERT-ID-XXXX')
    .replace(/\{\{organizationName\}\}/gi, context.organizationName || 'Organization Name')
    .replace(/\{\{adminName\}\}/gi, resolvedAdmin)
    .replace(/\{\{instructorName\}\}/gi, resolvedAdmin);
};

export const generateElementId = (type = 'el') => {
  return `${type}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
};

export const cloneDeep = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

export const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

/**
 * Render Shape Element into SVG elements
 */
export const renderSvgShape = (element) => {
  const { shapeType, width, height, fill = '#000000', stroke = 'none', strokeWidth = 0, strokeDasharray = 'none', rx = 0, strokeSecondary = '#d97706', sealText = 'OFFICIAL' } = element;

  switch (shapeType) {
    case 'rect':
    case 'rounded-rect':
      return (
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={rx || 0}
          ry={rx || 0}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray === 'none' ? undefined : strokeDasharray}
        />
      );

    case 'circle':
      return (
        <circle
          cx={width / 2}
          cy={height / 2}
          r={Math.min(width, height) / 2 - strokeWidth / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );

    case 'line':
      return (
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={stroke || fill}
          strokeWidth={strokeWidth || Math.max(1, height)}
          strokeDasharray={strokeDasharray === 'none' ? undefined : strokeDasharray}
        />
      );

    case 'accent-divider':
      return (
        <g>
          <line
            x1={0}
            y1={height / 2}
            x2={width / 2 - 20}
            y2={height / 2}
            stroke={stroke || fill}
            strokeWidth={strokeWidth || 2}
          />
          {/* Center Diamond */}
          <polygon
            points={`${width / 2},${height / 2 - 7} ${width / 2 + 7},${height / 2} ${width / 2},${height / 2 + 7} ${width / 2 - 7},${height / 2}`}
            fill={fill}
          />
          <line
            x1={width / 2 + 20}
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke={stroke || fill}
            strokeWidth={strokeWidth || 2}
          />
        </g>
      );

    case 'double-frame':
      return (
        <g>
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth || 3}
          />
          <rect
            x={10}
            y={10}
            width={Math.max(0, width - 20)}
            height={Math.max(0, height - 20)}
            fill="none"
            stroke={strokeSecondary || stroke}
            strokeWidth={Math.max(1, (strokeWidth || 2) - 1)}
          />
        </g>
      );

    case 'corner-ornament':
      return (
        <g stroke={stroke} strokeWidth={strokeWidth || 2} fill="none">
          <path d={`M 0,${height} L 0,0 L ${width},0`} />
          <path d={`M 8,${height} L 8,8 L ${width},8`} strokeWidth={1} />
          <circle cx={14} cy={14} r={3} fill={stroke} />
        </g>
      );

    case 'gold-seal': {
      const size = Math.min(width, height);
      const r = size / 2;
      return (
        <g transform={`translate(${width / 2}, ${height / 2})`}>
          {/* Starburst teeth */}
          <circle cx={0} cy={0} r={r - 4} fill={fill || '#d97706'} stroke={stroke || '#b45309'} strokeWidth={strokeWidth || 2} />
          <circle cx={0} cy={0} r={r - 12} fill="none" stroke="#fef3c7" strokeWidth={1.5} strokeDasharray="3 3" />
          <circle cx={0} cy={0} r={r - 20} fill="none" stroke="#fef3c7" strokeWidth={1} />
          {/* Center 5-point star */}
          <polygon
            points="0,-14 4,-4 14,-4 6,3 9,13 0,7 -9,13 -6,3 -14,-4 -4,-4"
            fill="#ffffff"
          />
          {/* Seal text arc */}
          <text
            y={r - 26}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={9}
            fontWeight="bold"
            fontFamily="Inter, sans-serif"
            letterSpacing={1.5}
          >
            {sealText}
          </text>
        </g>
      );
    }

    case 'award-ribbon': {
      const w = width;
      const h = height;
      return (
        <g>
          {/* Ribbon tails */}
          <polygon
            points={`${w * 0.25},${h * 0.5} ${w * 0.15},${h} ${w * 0.35},${h * 0.85} ${w * 0.45},${h} ${w * 0.4},${h * 0.5}`}
            fill={stroke || '#047857'}
          />
          <polygon
            points={`${w * 0.6},${h * 0.5} ${w * 0.55},${h} ${w * 0.65},${h * 0.85} ${w * 0.85},${h} ${w * 0.75},${h * 0.5}`}
            fill={stroke || '#047857'}
          />
          {/* Rosette medallion */}
          <circle
            cx={w / 2}
            cy={w / 2}
            r={w / 2 - 4}
            fill={fill || '#059669'}
            stroke={stroke || '#047857'}
            strokeWidth={strokeWidth || 3}
          />
          <circle
            cx={w / 2}
            cy={w / 2}
            r={w / 2 - 12}
            fill="none"
            stroke="#ffffff"
            strokeWidth={1.5}
          />
          <polygon
            transform={`translate(${w / 2}, ${w / 2}) scale(${w / 70})`}
            points="0,-12 3.5,-3.5 12,-3.5 5,2 7.5,10.5 0,5.5 -7.5,10.5 -5,2 -12,-3.5 -3.5,-3.5"
            fill="#ffffff"
          />
        </g>
      );
    }

    default:
      return (
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
  }
};
