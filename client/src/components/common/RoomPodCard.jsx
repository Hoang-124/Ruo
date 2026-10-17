import React from 'react';
import { POD_BROKEN_COLOR, POD_HEIGHT, getPodLayout, getPodStatus, getPodTooltip } from './roomPod';

const Chip = ({ x, y, width, text, stroke, fill, textColor }) => (
  <g>
    <rect x={x} y={y} width={width} height={POD_HEIGHT} rx="7.5" fill={fill} stroke={stroke} strokeWidth="1.2" />
    <text
      x={x + width / 2}
      y={y + POD_HEIGHT / 2 + 3.6}
      textAnchor="middle"
      fontFamily="var(--font-sans)"
      fontSize="10"
      fontWeight="800"
      fill={textColor}
    >
      {text}
    </text>
  </g>
);

/**
 * UC-2.7 Interactive CAD Card — inline SVG "pod" drawn on top of a room of the floor plan.
 * Shows the room code and equipment count (outlined in the room's status colour) and, when any
 * equipment is broken or under repair, a red "n hỏng" chip. Pointer events pass through so the
 * whole room stays clickable.
 *
 * Must be rendered inside an <svg>; (x, y, w, h) is the room rectangle in SVG user units.
 */
export const RoomPodCard = ({ room, pod, x, y, w, h }) => {
  if (!room || !pod) return null;

  const status = getPodStatus(pod.effectiveStatus);
  const layout = getPodLayout({ w, h, code: room.code, equipmentCount: pod.equipmentCount, brokenCount: pod.brokenCount });
  const tooltip = getPodTooltip(room.code, pod);

  return (
    <g
      data-testid={`room-pod-${room.code}`}
      data-status={pod.effectiveStatus}
      transform={`translate(${x}, ${y})`}
      style={{ pointerEvents: 'none' }}
      role="img"
      aria-label={tooltip}
    >
      <title>{tooltip}</title>
      {layout.broken && (
        <Chip
          x={layout.broken.x}
          y={layout.y}
          width={layout.broken.width}
          text={layout.broken.text}
          fill={POD_BROKEN_COLOR}
          stroke={POD_BROKEN_COLOR}
          textColor="#FFFFFF"
        />
      )}
      <Chip
        x={layout.main.x}
        y={layout.y}
        width={layout.main.width}
        text={layout.main.text}
        fill="var(--surface-panel)"
        stroke={status.color}
        textColor="var(--ink-pure)"
      />
    </g>
  );
};

export default RoomPodCard;
