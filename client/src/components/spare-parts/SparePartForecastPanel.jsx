import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icons } from '../common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { sparePartApi } from '../../lib/api';

const STATUS_META = {
  out_of_stock: { label: 'Hết hàng', color: '#EF4444', bg: 'rgba(239,68,68,0.14)' },
  critical: { label: 'Hết trước khi hàng về', color: '#EF4444', bg: 'rgba(239,68,68,0.14)' },
  reorder: { label: 'Cần đặt hàng', color: '#F59E0B', bg: 'rgba(245,158,11,0.14)' },
  ok: { label: 'Đủ dùng', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  no_demand: { label: 'Chưa phát sinh', color: 'var(--ink-muted)', bg: 'var(--surface-panel)' }
};

const CONFIDENCE_LABEL = { high: 'Tin cậy cao', medium: 'Tin cậy TB', low: 'Ít dữ liệu' };
const HISTORY_OPTIONS = [90, 180, 365];

const cell = { padding: '11px 14px', verticalAlign: 'top' };
const head = { ...cell, color: 'var(--ink-pure)', fontWeight: 700, whiteSpace: 'nowrap' };

const csvEscape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

/** Advisory demand forecast tab: Facility Managers decide; nothing is applied automatically. */
export const SparePartForecastPanel = ({ onApplied }) => {
  const { toast } = useToast();
  const [historyDays, setHistoryDays] = useState(180);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyingId, setApplyingId] = useState('');
  const request = useRef(0);

  const load = useCallback(async () => {
    const current = ++request.current;
    setLoading(true);
    setError('');
    try {
      const res = await sparePartApi.forecast({ history_days: historyDays });
      if (current !== request.current) return;
      if (!res?.success) throw new Error(res?.message || 'Máy chủ không trả về dự báo.');
      setData(res);
    } catch (err) {
      if (current === request.current) {
        setData(null);
        setError(err.message || 'Không tải được dự báo.');
      }
    } finally {
      if (current === request.current) setLoading(false);
    }
  }, [historyDays]);

  useEffect(() => {
    // Remote synchronisation; the loader flips its own pending state before awaiting.
    // eslint-disable-next-line react/set-state-in-effect
    load();
  }, [load]);

  const applyMinStock = async (forecast) => {
    const ok = window.confirm(
      `Cập nhật định mức tối thiểu của ${forecast.code} từ ${forecast.current_min_stock} thành ${forecast.suggested_min_stock}?\nThay đổi sẽ được ghi vào nhật ký kiểm toán.`
    );
    if (!ok) return;
    setApplyingId(forecast._id);
    try {
      const res = await sparePartApi.update(forecast._id, { min_stock: forecast.suggested_min_stock });
      if (!res?.success) throw new Error(res?.message || 'Cập nhật thất bại.');
      toast.success(`Đã áp dụng định mức ${forecast.suggested_min_stock} cho ${forecast.code}.`);
      await load();
      onApplied?.();
    } catch (err) {
      toast.error(`Không thể cập nhật định mức: ${err.message}`);
    } finally {
      setApplyingId('');
    }
  };

  const exportOrderList = () => {
    const rows = (data?.forecasts || []).filter((f) => f.suggested_order_qty > 0);
    if (rows.length === 0) {
      toast.success('Hiện không có linh kiện nào cần đặt hàng.', 'Kho đủ dùng');
      return;
    }
    const header = ['Mã', 'Tên linh kiện', 'Đơn vị', 'Tồn kho', 'Đang chờ cấp', 'Nhu cầu/tháng', 'Hết sau (ngày)', 'Số lượng nên đặt', 'Trạng thái'];
    const lines = rows.map((f) => [f.code, f.name, f.unit, f.stock, f.pending_qty, f.monthly_demand, f.days_until_stockout ?? '', f.suggested_order_qty, STATUS_META[f.status]?.label]);
    const csv = `\uFEFF${[header, ...lines].map((line) => line.map(csvEscape).join(',')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `ruo-de-xuat-dat-hang-${new Date().toISOString().slice(0, 10)}.csv` });
    link.click();
    URL.revokeObjectURL(url);
  };

  const summary = data?.summary || {};
  const forecasts = data?.forecasts || [];
  const needsAction = (summary.out_of_stock || 0) + (summary.critical || 0) + (summary.reorder || 0);

  return (
    <div style={{ display: 'grid', gap: '14px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '12.5px', color: 'var(--ink-muted)', maxWidth: '640px', lineHeight: 1.5 }}>
          Dự báo từ lịch sử phiếu cấp linh kiện đã duyệt (Croston-SBA, mức phục vụ 95%, thời gian giao hàng mặc định {data?.parameters?.default_lead_time_days ?? 7} ngày).
          Đây là <strong>đề xuất</strong>; Quản lý CSVC quyết định áp dụng.
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label htmlFor="forecast-history" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Lịch sử</label>
          <select
            id="forecast-history"
            value={historyDays}
            onChange={(e) => setHistoryDays(Number(e.target.value))}
            className="ruo-portal-input"
            style={{ height: '32px', padding: '0 10px', fontSize: '12.5px' }}
          >
            {HISTORY_OPTIONS.map((days) => <option key={days} value={days}>{days} ngày</option>)}
          </select>
          <button type="button" onClick={load} disabled={loading} className="laser-btn laser-btn-secondary" style={{ padding: '6px 10px', fontSize: '12px', display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
            <Icons.RefreshCw size={13} className={loading ? 'spin' : ''} /> Làm mới
          </button>
          <button type="button" onClick={exportOrderList} disabled={loading || needsAction === 0} className="laser-btn laser-btn-primary" style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
            <Icons.Download size={13} /> Xuất danh sách đặt hàng
          </button>
        </div>
      </div>

      {data && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }} aria-label="Tóm tắt dự báo">
          {Object.entries(STATUS_META).map(([status, meta]) => (
            <span key={status} style={{ fontSize: '12px', fontWeight: 700, color: meta.color, background: meta.bg, padding: '5px 10px', borderRadius: '999px', border: '1px solid var(--hairline-soft)' }}>
              {meta.label}: {summary[status] || 0}
            </span>
          ))}
        </div>
      )}

      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'auto' }}>
        {loading && !data ? (
          <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--ink-muted)' }}>
            <Icons.RefreshCw size={26} className="spin" style={{ marginBottom: '10px' }} />
            <div>Đang tính dự báo nhu cầu...</div>
          </div>
        ) : error ? (
          <div role="alert" style={{ padding: '28px 20px', textAlign: 'center', color: '#EF4444' }}>
            <Icons.AlertTriangle size={26} style={{ marginBottom: '8px' }} />
            <div style={{ fontWeight: 700 }}>Không tải được dự báo</div>
            <div style={{ fontSize: '12.5px', marginTop: '4px' }}>{error}</div>
            <button type="button" onClick={load} className="laser-btn laser-btn-secondary" style={{ marginTop: '12px', padding: '6px 12px', fontSize: '12px' }}>Thử lại</button>
          </div>
        ) : forecasts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--ink-muted)' }}>
            <Icons.Package size={32} style={{ opacity: 0.5, marginBottom: '10px' }} />
            <div style={{ fontWeight: 600 }}>Chưa có linh kiện để dự báo.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--hairline-medium)' }}>
                <th style={head}>Linh kiện</th>
                <th style={head}>Tồn / chờ cấp</th>
                <th style={head}>Nhu cầu/tháng</th>
                <th style={head}>Hết sau</th>
                <th style={head}>Định mức đề xuất</th>
                <th style={head}>Nên đặt</th>
                <th style={head}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {forecasts.map((f) => {
                const meta = STATUS_META[f.status] || STATUS_META.ok;
                const canApply = f.suggested_min_stock !== null && f.suggested_min_stock !== f.current_min_stock;
                return (
                  <tr key={f._id} data-testid={`forecast-row-${f.code}`} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                    <td style={cell}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--laser-cyan)' }}>{f.code}</div>
                      <div style={{ color: 'var(--ink-pure)', fontWeight: 600 }}>{f.name}</div>
                    </td>
                    <td style={cell}>
                      <span style={{ fontWeight: 800, color: 'var(--ink-pure)' }}>{f.stock}</span>
                      {f.pending_qty > 0 && <span style={{ color: 'var(--ink-muted)' }}> / −{f.pending_qty}</span>}
                      <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{f.unit}</div>
                    </td>
                    <td style={cell}>
                      {f.basis.policy === 'min_stock_fallback' ? <span style={{ color: 'var(--ink-muted)' }}>—</span> : f.monthly_demand}
                      <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{f.basis.demand_events} lần / {f.basis.history_days} ngày</div>
                    </td>
                    <td style={{ ...cell, fontWeight: 700, color: f.days_until_stockout !== null && f.days_until_stockout <= f.basis.lead_time_days ? '#EF4444' : 'var(--ink-pure)' }}>
                      {f.days_until_stockout === null ? '—' : `~${f.days_until_stockout} ngày`}
                      <div style={{ fontSize: '11px', fontWeight: 400, color: 'var(--ink-muted)' }}>giao hàng {f.basis.lead_time_days} ngày</div>
                    </td>
                    <td style={cell}>
                      {f.suggested_min_stock === null ? (
                        <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }} title="Cần ít nhất 3 lần cấp phát để đề xuất">{CONFIDENCE_LABEL.low}</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span>{f.current_min_stock} → <strong>{f.suggested_min_stock}</strong></span>
                          {canApply && (
                            <button
                              type="button"
                              onClick={() => applyMinStock(f)}
                              disabled={applyingId === f._id}
                              className="laser-btn laser-btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                              aria-label={`Áp dụng định mức ${f.suggested_min_stock} cho ${f.code}`}
                            >
                              {applyingId === f._id ? 'Đang lưu…' : 'Áp dụng'}
                            </button>
                          )}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{CONFIDENCE_LABEL[f.confidence]}</div>
                    </td>
                    <td style={{ ...cell, fontWeight: 800, color: f.suggested_order_qty > 0 ? 'var(--ink-pure)' : 'var(--ink-muted)' }}>
                      {f.suggested_order_qty > 0 ? `${f.suggested_order_qty} ${f.unit}` : '—'}
                    </td>
                    <td style={cell}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: meta.color, background: meta.bg, padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>{meta.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SparePartForecastPanel;
