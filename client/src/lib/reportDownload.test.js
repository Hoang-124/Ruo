import { afterEach, expect, it, vi } from 'vitest';
import { reportApi } from './api';
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
it('UC-8.9 downloads CSV with bearer authorization instead of parsing it as JSON', async () => {
  localStorage.setItem('ruo_token', 'access-test');
  const blob = new Blob(['csv']);
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => blob });
  vi.stubGlobal('fetch', fetchMock);
  expect(await reportApi.exportFile({ type: 'equipment' })).toBe(blob);
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer access-test');
  expect(fetchMock.mock.calls[0][0]).toContain('format=csv');
});
it('UC-8.9 refreshes expired access tokens before loading printable HTML', async () => {
  localStorage.setItem('ruo_token', 'expired');
  localStorage.setItem('ruo_refresh_token', 'refresh-test');
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 401 })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true, token: 'renewed' }) })
    .mockResolvedValueOnce({ ok: true, status: 200, text: async () => '<html>Report</html>' });
  vi.stubGlobal('fetch', fetchMock);
  expect(await reportApi.getPrintReport({ type: 'equipment' })).toBe('<html>Report</html>');
  expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer renewed');
});
it('UC-8.9 surfaces export permission errors', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ message: 'Không có quyền' }) }));
  await expect(reportApi.exportFile({ type: 'equipment' })).rejects.toThrow('Không có quyền');
});
