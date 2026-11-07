import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import jsQR from 'jsqr';
import { EquipmentQr } from './EquipmentQr';

afterEach(cleanup);

it.each(['QR-EQ-2026-001', 'QR-MAY-CHIEU-1234567890', 'Thiết bị phòng A1-405'])('prints a decodable SVG for %s', (value) => {
  const { container } = render(<EquipmentQr value={value} />);
  const svg = container.querySelector('svg');
  const extent = Number(svg.getAttribute('viewBox').split(' ')[2]);
  const scale = 5;
  const size = extent * scale;
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
  // Rasterize the actual rendered SVG cells, not a separate encoder output.
  for (const cell of svg.querySelectorAll('rect[fill="#000"]')) {
    const x = Number(cell.getAttribute('x'));
    const y = Number(cell.getAttribute('y'));
    expect(x).toBeGreaterThanOrEqual(4);
    expect(y).toBeGreaterThanOrEqual(4);
    expect(x).toBeLessThan(extent - 4);
    expect(y).toBeLessThan(extent - 4);
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const offset = ((y * scale + dy) * size + x * scale + dx) * 4;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0;
    }
  }
  expect(jsQR(pixels, size, size)?.data).toBe(value);
});

it.each(['', 'x'.repeat(10000)])('reports invalid QR payload without crashing the asset page', (value) => {
  render(<EquipmentQr value={value} />);
  expect(screen.getByRole('status').textContent).toContain('Không thể tạo QR');
});
