import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import EquipmentForm from '../EquipmentForm';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ token: 'mock-token-123' })
}));

describe('EquipmentForm', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('submits form and calls onCreate & onClose on success', async () => {
    const fakeResp = { id: 'EQ_TEST', assetCode: 'TS-999', name: 'Test Device' };
    global.fetch.mockResolvedValue({ ok: true, json: async () => fakeResp });

    const handleCreate = vi.fn();
    const handleClose = vi.fn();

    render(<EquipmentForm onCreate={handleCreate} onClose={handleClose} />);

    fireEvent.change(screen.getByLabelText(/Mã Tài Sản/i), { target: { value: 'TS-999' } });
    fireEvent.change(screen.getByLabelText(/Tên Thiết Bị/i), { target: { value: 'Test Device' } });

    fireEvent.click(screen.getByText(/Tạo thiết bị/i));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/equipments',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token-123'
          })
        })
      );
      expect(handleCreate).toHaveBeenCalledWith(expect.objectContaining({ id: 'EQ_TEST' }));
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
