import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  POD_BROKEN_COLOR,
  POD_HEIGHT,
  POD_MARGIN,
  buildRoomPodIndex,
  getPodLayout,
  getPodStatus,
  getPodTooltip,
  getShortRoomCode
} from './roomPod';
import { RoomPodCard } from './RoomPodCard';

describe('room pod helpers (UC-2.7)', () => {
  it('maps effective status to a colour and label, defaulting to inactive', () => {
    expect(getPodStatus('available').color).toBe('#10B981');
    expect(getPodStatus('maintenance').label).toBe('Đang bảo trì');
    expect(getPodStatus('inactive').label).toBe('Ngừng sử dụng');
    expect(getPodStatus('???')).toEqual(getPodStatus('inactive'));
  });

  it('shortens building-prefixed room codes', () => {
    expect(getShortRoomCode('A1-202')).toBe('202');
    expect(getShortRoomCode('A1-WC-NAM')).toBe('WC-NAM');
    expect(getShortRoomCode(undefined)).toBe('');
  });

  it('indexes cad-canvas rooms by code with safe defaults', () => {
    const index = buildRoomPodIndex([
      { code: 'A1-202', status: 'available', effectiveStatus: 'maintenance', equipmentCount: 4, brokenCount: 1, equipments: [{ code: 'E1' }] },
      { code: 'A1-203', status: 'inactive' },
      { name: 'no code' }
    ]);
    expect(Object.keys(index)).toEqual(['A1-202', 'A1-203']);
    expect(index['A1-202']).toMatchObject({ effectiveStatus: 'maintenance', equipmentCount: 4, brokenCount: 1 });
    expect(index['A1-203']).toEqual({
      code: 'A1-203', status: 'inactive', effectiveStatus: 'inactive', equipmentCount: 0, brokenCount: 0, equipments: []
    });
    expect(buildRoomPodIndex()).toEqual({});
  });

  it('uses the full layout for large rooms and a compact one for small rooms', () => {
    const full = getPodLayout({ w: 468, h: 102, code: 'A1-PTV', equipmentCount: 12, brokenCount: 2 });
    expect(full.mode).toBe('full');
    expect(full.main.text).toBe('PTV · 12 TB');
    expect(full.broken.text).toBe('2 hỏng');

    const compact = getPodLayout({ w: 140, h: 68, code: 'A1-WC-NAM', equipmentCount: 3, brokenCount: 1 });
    expect(compact.mode).toBe('compact');
    expect(compact.main.text).toBe('3');
    expect(compact.broken.text).toBe('!1');
  });

  it('omits the broken chip when nothing is broken', () => {
    expect(getPodLayout({ w: 200, h: 100, code: 'A1-PH', equipmentCount: 5, brokenCount: 0 }).broken).toBeNull();
  });

  it('keeps the chips inside the room, right-aligned at the bottom without overlapping', () => {
    const w = 150;
    const h = 100;
    const layout = getPodLayout({ w, h, code: 'A1-202', equipmentCount: 8, brokenCount: 3 });
    expect(layout.y).toBe(h - POD_MARGIN - POD_HEIGHT);
    expect(layout.main.x + layout.main.width).toBe(w - POD_MARGIN);
    expect(layout.broken.x + layout.broken.width).toBeLessThan(layout.main.x);
    expect(layout.broken.x).toBeGreaterThanOrEqual(0);
  });

  it('describes a pod in a tooltip', () => {
    expect(getPodTooltip('A1-202', { equipmentCount: 12, brokenCount: 2, effectiveStatus: 'maintenance' }))
      .toBe('A1-202 • 12 thiết bị • 2 hỏng • Đang bảo trì');
    expect(getPodTooltip('A1-203', { equipmentCount: 0, brokenCount: 0, effectiveStatus: 'available' }))
      .toBe('A1-203 • 0 thiết bị • Sẵn sàng');
  });
});

describe('<RoomPodCard /> (UC-2.7)', () => {
  const renderPod = (props) =>
    render(
      <svg>
        <RoomPodCard {...props} />
      </svg>
    );

  it('renders the code, equipment count and broken chip with the status colour', () => {
    const { getByTestId, container } = renderPod({
      room: { code: 'A1-PTV' },
      pod: { equipmentCount: 12, brokenCount: 2, effectiveStatus: 'maintenance' },
      x: 248, y: 18, w: 468, h: 102
    });

    const pod = getByTestId('room-pod-A1-PTV');
    expect(pod.getAttribute('data-status')).toBe('maintenance');
    expect(pod.getAttribute('transform')).toBe('translate(248, 18)');
    expect(pod.textContent).toContain('PTV · 12 TB');
    expect(pod.textContent).toContain('2 hỏng');

    const rects = container.querySelectorAll('rect');
    expect(rects).toHaveLength(2);
    expect(rects[0].getAttribute('fill')).toBe(POD_BROKEN_COLOR);
    expect(rects[1].getAttribute('stroke')).toBe(getPodStatus('maintenance').color);
  });

  it('renders only the main chip for a healthy room', () => {
    const { container } = renderPod({
      room: { code: 'A1-202' },
      pod: { equipmentCount: 4, brokenCount: 0, effectiveStatus: 'available' },
      x: 0, y: 0, w: 90, h: 60
    });
    expect(container.querySelectorAll('rect')).toHaveLength(1);
    expect(container.textContent).toContain('4');
  });

  it('renders nothing without live pod data', () => {
    const { container } = renderPod({ room: { code: 'A1-202' }, pod: undefined, x: 0, y: 0, w: 90, h: 60 });
    expect(container.querySelector('g')).toBeNull();
  });
});
