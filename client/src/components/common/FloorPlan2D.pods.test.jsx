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
      expect(container.querySelectorAll('[data-testid^="room-alert-dot-"]')).toHaveLength(0);
      expect(container.querySelectorAll('[data-testid^="floor-alert-dot-"]')).toHaveLength(0);
      expect(container.querySelectorAll('[data-testid^="cad-room-"]').length).toBe(expectedRooms.length);

      for (const room of expectedRooms) {
        const roomEl = getByTestId(`cad-room-${room.code}`);
        expect(roomEl).toBeTruthy();
        expect(roomEl.querySelectorAll('text[fill="var(--ink-muted)"]')).toHaveLength(0);
        expect(roomEl.querySelectorAll('text').length).toBeGreaterThanOrEqual(1);
        expect(roomEl.querySelectorAll('text').length).toBeLessThanOrEqual(2);
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

  it('shows alert dots ONLY on rooms and floors with active incident reports or broken equipment', () => {
    const [reportedRoom, healthyRoom] = roomsOfFloor(2);
    const roomPods = buildRoomPodIndex([
      { code: reportedRoom.code, floor: 2, status: 'available', effectiveStatus: 'maintenance', equipmentCount: 4, brokenCount: 1, openReportCount: 2 },
      { code: healthyRoom.code, floor: 2, status: 'available', effectiveStatus: 'available', equipmentCount: 5, brokenCount: 0, openReportCount: 0 }
    ]);
    const floorAlerts = {
      1: { hasAlert: false, alertRoomCount: 0, severity: null },
      2: { hasAlert: true, alertRoomCount: 1, openReportCount: 2, brokenCount: 1, severity: 'report' },
      3: { hasAlert: true, alertRoomCount: 2, openReportCount: 1, brokenCount: 1, severity: 'report' },
      4: { hasAlert: false, alertRoomCount: 0, severity: null },
      5: { hasAlert: false, alertRoomCount: 0, severity: null }
    };

    const { queryByTestId } = render(
      <FloorPlan2D selectedFloor={2} roomPods={roomPods} floorAlerts={floorAlerts} />
    );

    expect(queryByTestId(`room-alert-dot-${reportedRoom.code}`)).toBeTruthy();
    expect(queryByTestId(`room-alert-dot-${healthyRoom.code}`)).toBeNull();
    expect(queryByTestId('floor-alert-dot-2')).toBeTruthy();
    expect(queryByTestId('floor-alert-dot-3')).toBeTruthy();
    expect(queryByTestId('floor-alert-dot-1')).toBeNull();
    expect(queryByTestId('floor-alert-dot-4')).toBeNull();
  });

  it('keeps room codes unique across architectural floors', () => {
    const codes = [1, 2, 3, 4, 5].flatMap(floor => roomsOfFloor(floor).map(room => room.code));
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('synchronizes Central Atrium Void, WC shafts, and Stairwells to identical coordinates across all 5 floors', () => {
    const wcCodesByFloor = {
      1: { nu: 'A1-WC-NU', nam: 'A1-WC-NAM' },
      2: { nu: 'A1-WC-NU-T2', nam: 'A1-WC-NAM-T2' },
      3: { nu: 'A1-WC-NU-T3', nam: 'A1-WC-NAM-T3' },
      4: { nu: 'A1-WC-NU-T4', nam: 'A1-WC-NAM-T4' },
      5: { nu: 'A1-WC-NU-T5', nam: 'A1-WC-NAM-T5' }
    };

    const readBox = (rectEl) => ({
      x: rectEl?.getAttribute('x'),
      y: rectEl?.getAttribute('y'),
      width: rectEl?.getAttribute('width'),
      height: rectEl?.getAttribute('height')
    });

    for (const floor of [1, 2, 3, 4, 5]) {
      const { container, getByTestId } = render(<FloorPlan2D selectedFloor={floor} roomPods={podsFor(floor)} />);

      const atriumRect = getByTestId('central-atrium-outer-rect');
      expect(readBox(atriumRect)).toEqual({ x: '236', y: '162', width: '488', height: '228' });

      const wcNuRect = getByTestId(`cad-room-${wcCodesByFloor[floor].nu}`).querySelector('rect');
      expect(readBox(wcNuRect)).toEqual({ x: '796', y: '162', width: '140', height: '66' });

      const wcNamRect = getByTestId(`cad-room-${wcCodesByFloor[floor].nam}`).querySelector('rect');
      expect(readBox(wcNamRect)).toEqual({ x: '796', y: '324', width: '140', height: '66' });

      const westStairRect = container.querySelector(`#f${floor}-west-stairwell > rect`);
      const eastStairRect = container.querySelector(`#f${floor}-east-stairwell > rect`);
      expect(readBox(westStairRect)).toEqual({ x: '24', y: '232', width: '140', height: '88' });
      expect(readBox(eastStairRect)).toEqual({ x: '796', y: '232', width: '140', height: '88' });

      cleanup();
    }
  });
});
