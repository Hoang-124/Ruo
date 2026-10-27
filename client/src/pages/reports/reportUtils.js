import { useEffect, useState } from 'react';

export const money = value => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
export const reportDate = value => value ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';

export function useReport(load, refreshKey) {
  const [state, setState] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  useEffect(() => {
    let active = true;
    load().then(data => {
      if (active) setState({ load, refreshKey, retryKey, error: '', data });
    }).catch(error => {
      if (active) setState({ load, refreshKey, retryKey, error: error.message || 'Không tải được báo cáo.', data: null });
    });
    return () => { active = false; };
  }, [load, refreshKey, retryKey]);
  const current = state?.load === load && state.refreshKey === refreshKey && state.retryKey === retryKey;
  return { loading: !current, data: current ? state.data : null, error: current ? state.error : '', retry: () => setRetryKey(key => key + 1) };
}
