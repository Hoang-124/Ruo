import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { FloorPlan2D } from './FloorPlan2D';
import { buildRoomPodIndex } from './roomPod';
import { CAMPUS_FLOORS } from '../../mock/campusBuildingData';

const roomsOfFloor = (floor) => [...(CAMPUS_FLOORS[floor].topRooms || []), ...(CAMPUS_FLOORS[floor].bottomRooms || [])];
afterEach(cleanup);

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

describe('<FloorPlan2D /> interactive CAD rooms & live data binding', () => {
  for (const floor of [1, 2, 3, 4, 5]) {
    it(`renders every architectural room cleanly without bottom-right pod clutter on floor ${floor}`, () => {
      const select = vi.fn();
      const { container, getByTestId } = render(
        <FloorPlan2D selectedFloor={floor} roomPods={podsFor(floor)} onSelectRoom={select} />
      );
      const expectedRooms = roomsOfFloor(floor);
      expect(container.querySelectorAll('[data-testid^="room-pod-"]')).toHaveLength(0);
      expect(container.querySelectorAll('[data-testid^="cad-room-"]').length).toBe(expectedRooms.length);

      for (const room of expectedRooms) {
        const roomEl = getByTestId(`cad-room-${room.code}`);
        expect(roomEl).toBeTruthy();
        fireEvent.click(roomEl);
        expect(select).toHaveBeenLastCalledWith(
          expect.objectContaining({ code: room.code, equipmentCount: 6, brokenCount: 0 })
        );
      }
    });
  }

  it('merges live maintenance and broken equipment counts into selected room payload without drawing pod badges', () => {
    const select = vi.fn();
    const [room] = roomsOfFloor(1);
    const roomPods = buildRoomPodIndex([
      { code: room.code, status: 'available', effectiveStatus: 'maintenance', equipmentCount: 9, brokenCount: 3 }
    ]);
    const { container, getByTestId } = render(
      <FloorPlan2D selectedFloor={1} roomPods={roomPods} onSelectRoom={select} />
    );
    expect(container.querySelectorAll('[data-testid^="room-pod-"]')).toHaveLength(0);
    fireEvent.click(getByTestId(`cad-room-${room.code}`));
    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({ code: room.code, effectiveStatus: 'maintenance', equipmentCount: 9, brokenCount: 3 })
    );
  });

  it('renders cleanly when no live data is supplied', () => {
    const { container } = render(<FloorPlan2D selectedFloor={2} />);
    expect(container.querySelectorAll('[data-testid^="room-pod-"]')).toHaveLength(0);
  });

  it('makes a newly created room selectable even when its geometry is not in the blueprint', () => {
    const select = vi.fn();
    const pods = buildRoomPodIndex([{ code: 'P101', name: 'Phòng mới', floor: 1, equipmentCount: 3, brokenCount: 1, status: 'available' }]);
    const { getByRole } = render(<FloorPlan2D selectedFloor={1} roomPods={pods} onSelectRoom={select} />);
    fireEvent.click(getByRole('button', { name: /P101.*3 thiết bị/ }));
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ code: 'P101', name: 'Phòng mới' }));
  });

  it('keeps room codes unique across architectural floors', () => {
    const codes = [1, 2, 3, 4, 5].flatMap(floor => roomsOfFloor(floor).map(room => room.code));
    expect(new Set(codes).size).toBe(codes.length);
  });
});
