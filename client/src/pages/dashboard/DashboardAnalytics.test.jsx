import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { reportApi } from '../../lib/api';

vi.mock('../../lib/api', () => ({ reportApi: { getDashboard: vi.fn(), getRepairCosts: vi.fn(), getEquipmentHealth: vi.fn() } }));
import * as module from './DashboardAnalytics';

beforeEach(() => {
  reportApi.getDashboard.mockResolvedValue({ metrics: { totalEquipment: 260, operatingRate: 75, brokenEquipment: 20, overdueRepairs: 3, warehouseValue: 620, equipmentStockValue: 500, sparePartsValue: 120 } });
  reportApi.getRepairCosts.mockResolvedValue({ series: [{ key: '2026-01', label: 'Tháng 1', repairCost: 100, partsCost: 30, totalCost: 130 }], totals: { totalCost: 130 }, unpricedItems: 0 });
  reportApi.getEquipmentHealth.mockResolvedValue({ equipment: [{ _id: 'e1', code: 'E1', name: 'Máy chiếu', failureCount: 0, ageDays: 90, mtbfDays: null, healthScore: 100 }], summary: { averageHealthScore: 100 }, page: 1, totalPages: 1 });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Dashboard analytics', () => {
  it('renders aggregate KPI data', async () => {
    expect(typeof module.DashboardAnalytics).toBe('function');
    render(<module.DashboardAnalytics refreshKey={0} />);
    expect(await screen.findByText('260')).toBeTruthy();
    expect(await screen.findByText('75%')).toBeTruthy();
  });
  it('retries a failed KPI request', async () => {
    expect(typeof module.DashboardAnalytics).toBe('function');
    reportApi.getDashboard.mockRejectedValueOnce(new Error('Mất kết nối KPI'));
    render(<module.DashboardAnalytics refreshKey={0} />);
    expect(await screen.findByText('Mất kết nối KPI')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại chỉ số tổng quan' }));
    expect(await screen.findByText('260')).toBeTruthy();
  });
});
