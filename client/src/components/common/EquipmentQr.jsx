import React, { useMemo } from 'react';
import QRCode from 'qrcode';

// Encoding is delegated to the QR codec; rendering remains native inline SVG.
export function EquipmentQr({ value, size = 148 }) {
  const symbol = useMemo(() => {
    try {
      return QRCode.create(String(value || ''), { errorCorrectionLevel: 'M' });
    } catch {
      return null;
    }
  }, [value]);
  if (!symbol) return <span role="status">Không thể tạo QR: mã trống hoặc quá dài.</span>;

  const { modules } = symbol;
  const margin = 4;
  const extent = modules.size + margin * 2;
  const cells = [];
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size; col++) {
      if (modules.get(row, col)) cells.push(
        <rect key={`${row}-${col}`} x={col + margin} y={row + margin} width="1" height="1" fill="#000" />
      );
    }
  }
  return (
    <svg role="img" aria-label={`Mã QR ${value}`} width={size} height={size}
      viewBox={`0 0 ${extent} ${extent}`} shapeRendering="crispEdges" style={{ display: 'block' }}>
      <rect width={extent} height={extent} fill="#fff" />
      {cells}
    </svg>
  );
}
