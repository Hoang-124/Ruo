import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FloorPlan2D } from './FloorPlan2D';
import { buildRoomPodIndex } from './roomPod';
import { CAMPUS_FLOORS } from '../../mock/campusBuildingData';

const roomsOfFloor = (floor) => [...(CAMPUS_FLOORS[floor].topRooms || []), ...(CAMPUS_FLOORS[floor].bottomRooms || [])];

const podsFor = (floor, overrides = {}) =>
  buildRoomPodIndex(
    roomsOfFloor(floor).map((room) => ({
      code: room.code,
      status: 'available',
      effectiveStatus: 'available',
      equipmentCount: 6,
      brokenCount: 0,
      ...overrides
    }))
  );

describe('<FloorPlan2D /> room pods (UC-2.7)', () => {
  for (const floor of [1, 2, 3, 4, 5]) {
    it(`draws a pod on the rooms of floor ${floor}`, () => {
      const { container } = render(<FloorPlan2D selectedFloor={floor} roomPods={podsFor(floor)} />);
      const pods = container.querySelectorAll('[data-testid^="room-pod-"]');
      expect(pods.length).toBeGreaterThan(0);
      expect(pods.length).toBeLessThanOrEqual(roomsOfFloor(floor).length);
    });
  }

  it('shows broken counts and the status colour for a room', () => {
    const [room] = roomsOfFloor(1);
    const roomPods = buildRoomPodIndex([
      { code: room.code, status: 'available', effectiveStatus: 'maintenance', equipmentCount: 9, brokenCount: 3 }
    ]);
    const { getByTestId } = render(<FloorPlan2D selectedFloor={1} roomPods={roomPods} />);
    const pod = getByTestId(`room-pod-${room.code}`);
    expect(pod.getAttribute('data-status')).toBe('maintenance');
    expect(pod.textContent).toMatch(/9/);
    expect(pod.textContent).toMatch(/3/);
  });

  it('draws no pods when no live data is supplied', () => {
    const { container } = render(<FloorPlan2D selectedFloor={2} />);
    expect(container.querySelectorAll('[data-testid^="room-pod-"]')).toHaveLength(0);
  });
});
