import { afterEach, beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => { vi.resetModules(); localStorage.clear(); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const response = (body) => ({ ok: true, status: 200, json: async () => body });

it('uses same-origin API by default so remote devices do not call their own localhost', async () => {
  vi.stubEnv('VITE_API_BASE_URL', '');
  const fetchMock = vi.fn().mockResolvedValue(response({ success: true }));
  vi.stubGlobal('fetch', fetchMock);
  const { api } = await import('./api');
  await api.get('/equipments');
  expect(fetchMock.mock.calls[0][0]).toBe('/api/equipments');
});

it('uses configured API for both requests and token refresh', async () => {
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.edu/api/');
  localStorage.setItem('ruo_refresh_token', 'refresh');
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ status: 401 })
    .mockResolvedValueOnce(response({ success: true, token: 'renewed' }))
    .mockResolvedValueOnce(response({ success: true }));
  vi.stubGlobal('fetch', fetchMock);
  const { api } = await import('./api');
  await api.get('/equipments');
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    'https://api.example.edu/api/equipments', 'https://api.example.edu/api/auth/refresh',
    'https://api.example.edu/api/equipments'
  ]);
});

it('loads every equipment page with the server-reported page count', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(response({ success: true, totalPages: 3, equipments: [{ _id: 'first' }] }))
    .mockResolvedValueOnce(response({ equipments: [{ _id: 'second' }] }))
    .mockResolvedValueOnce(response({ equipments: [{ _id: 'last' }] }));
  vi.stubGlobal('fetch', fetchMock);
  const { equipmentApi } = await import('./api');
  expect((await equipmentApi.listAll()).equipments.map(item => item._id)).toEqual(['first', 'second', 'last']);
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    '/api/equipments?page=1&limit=100', '/api/equipments?page=2&limit=100', '/api/equipments?page=3&limit=100'
  ]);
});

it('fails visibly if a later page fails instead of silently showing incomplete choices', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(response({ totalPages: 2, equipments: [{ _id: 'first' }] }))
    .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ message: 'Page failed' }) }));
  const { equipmentApi } = await import('./api');
  await expect(equipmentApi.listAll()).rejects.toThrow('Page failed');
});
