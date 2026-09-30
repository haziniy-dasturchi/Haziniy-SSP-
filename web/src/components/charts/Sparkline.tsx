import React from 'react';

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 64,
  height = 20,
  color = '#0A5D3A',
  strokeWidth = 1.5,
}) => {
  if (!data || data.length === 0) {
    return <div style={{ width, height }} className="bg-surface-muted rounded" />;
  }

  if (data.length === 1) {
    return (
      <svg width={width} height={height} className="overflow-visible">
        <circle cx={width / 2} cy={height / 2} r={2} fill={color} />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - 4) + 2;
      const y = height - 2 - ((val - min) / range) * (height - 4);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};
