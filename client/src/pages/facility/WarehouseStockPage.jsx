import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { masterDataApi, sparePartApi, equipmentApi } from '../../lib/api';

const CANONICAL_AI_ALERT_MATRIX = [
  {
    level: 'green',
    color_badge: '● Xanh',
    color_hex: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.35)',
    status_label: 'Ổn định',
    recommended_action: 'Duy trì bảo trì định kỳ',
    description: 'Tần suất hỏng 0 lần (90 ngày), tỷ lệ hao mòn R < 25%, thiết bị vận hành bình thường'
  },
  {
    level: 'yellow',
    color_badge: '● Vàng',
    color_hex: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.35)',
    status_label: 'Trung bình',
    recommended_action: 'Kiểm tra tần suất sử dụng',
    description: 'Hư hỏng 1–2 lần trong chu kỳ hoặc tỷ lệ chi phí sửa chữa 25% ≤ R < 50%'
  },
  {
    level: 'red',
    color_badge: '● Đỏ',
    color_hex: '#EF4444',
    bg: 'rgba(239,68,68,0.14)',
    border: 'rgba(239,68,68,0.4)',
    status_label: 'Cảnh báo cao',
    recommended_action: 'Thay thế/Dự phòng khẩn cấp',
    description: 'Tần suất hư hỏng quá cao (≥ 3 lần hoặc ≥ 2 lần/90 ngày, R ≥ 50%), nguy cơ hỏng đồng loạt gây gián đoạn dạy & học'
  }
];

export const WarehouseStockPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ai_schedule');

  const [warehouseEquipments, setWarehouseEquipments] = useState([]);
  const [shortages, setShortages] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [aiOptimization, setAiOptimization] = useState(null);
  const [aiLevelFilter, setAiLevelFilter] = useState('ALL');

  // Stock update modal
  const [selectedPart, setSelectedPart] = useState(null);
  const [newStockVal, setNewStockVal] = useState(0);
  const [submittingStock, setSubmittingStock] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [stockRes, partsRes, aiRes] = await Promise.all([
        masterDataApi.getWarehouseStock(),
        sparePartApi.list(),
        equipmentApi.aiHealthSchedule().catch(() => null)
      ]);

      if (stockRes?.success) {
        setWarehouseEquipments(stockRes.stockItems || []);
        setShortages(stockRes.roomShortages || []);
      }
      if (partsRes?.success) {
        setSpareParts(partsRes.parts || []);
      }
      if (aiRes?.success && aiRes.optimization) {
        setAiOptimization(aiRes.optimization);
      }
    } catch (err) {
      toast.error('Lỗi khi tải dữ liệu kho dự phòng: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // This effect synchronizes remote data; the loader also sets its pending state before awaiting the response.
    // eslint-disable-next-line react/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const openStockModal = (part) => {
    setSelectedPart(part);
    setNewStockVal(part.stock || 0);
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingStock(true);
      const res = await sparePartApi.updateStock(selectedPart._id, Number(newStockVal));
      if (res && res.success) {
        toast.success(`Đã cập nhật tồn kho linh kiện [${selectedPart.name}] thành ${newStockVal}!`);
        setSelectedPart(null);
        await fetchData();
      }
    } catch (err) {
      toast.error('Lỗi khi cập nhật tồn kho: ' + err.message);
    } finally {
      setSubmittingStock(false);
    }
  };

  const aiCounts = aiOptimization?.summary_counts || {
    green_count: 0,
    yellow_count: 0,
    red_count: 0,
    scheduled_actions_count: 0
  };
  const aiScheduleList = aiOptimization?.warehouse_schedule || [];
  const aiHealthList = (aiOptimization?.equipment_health_list || []).filter((item) =>
    aiLevelFilter === 'ALL' ? true : item.ai_alert?.level === aiLevelFilter
  );
  const concurrentClusters = (aiOptimization?.concurrent_failure_alerts || []).filter((c) => c.level !== 'green');

  const tabs = [
    { key: 'ai_schedule', label: `✨ AI Lịch Trình Kho & Cảnh Báo Hư Hỏng (${aiCounts.red_count} Đỏ / ${aiCounts.yellow_count} Vàng)` },
    { key: 'warehouse', label: `Thiết Bị Lưu Kho KHO-01 (${warehouseEquipments.length})` },
    { key: 'shortages', label: `Phòng Thiếu Hụt Định Mức (${shortages.length})` },
    { key: 'parts', label: `Linh Kiện & Cập Nhật Tồn Kho (${spareParts.length})` }
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>FACILITY MANAGER · AI PREDICTIVE</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Tối Ưu Lịch Sử Dụng Kho KHO-01 & Theo Dõi Tần Suất Hư Hỏng Thiết Bị</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Kho Dự Phòng KHO-01 & Hệ Thống Cảnh Báo Tình Trạng Thiết Bị (AI)
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Tối ưu hóa lịch trình sử dụng thiết bị trong kho dựa trên mức độ quan trọng và phân loại trạng thái hư hỏng theo 3 mức màu (● Xanh / ● Vàng / ● Đỏ) để chủ động dự phòng, tránh gián đoạn việc dạy và học khi nhiều thiết bị (như Tivi, Máy chiếu) cùng hỏng một lúc.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="laser-btn laser-btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}
        >
          <Icons.RefreshCw size={16} />
          <span>Phân Tích Lại AI</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Thiết bị dự phòng sẵn sàng (KHO-01)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--laser-cyan)', marginTop: '4px' }}>{warehouseEquipments.length}</div>
        </div>

        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 700 }}>● Xanh — Ổn định</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>{aiCounts.green_count}</div>
          <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>Duy trì bảo trì định kỳ</div>
        </div>

        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: '#F59E0B', fontWeight: 700 }}>● Vàng — Trung bình</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#F59E0B', marginTop: '4px' }}>{aiCounts.yellow_count}</div>
          <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>Kiểm tra tần suất sử dụng</div>
        </div>

        <div style={{ background: 'var(--surface-card)', border: '1.5px solid rgba(239,68,68,0.45)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: 700 }}>● Đỏ — Cảnh báo cao</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#EF4444', marginTop: '4px' }}>{aiCounts.red_count}</div>
          <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>Thay thế/Dự phòng khẩn cấp</div>
        </div>

        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>Phòng học thiếu định mức</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#EF4444', marginTop: '4px' }}>{shortages.length}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid var(--hairline-medium)', marginBottom: '20px' }}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: active ? 700 : 500,
                color: active ? 'var(--laser-cyan)' : 'var(--ink-muted)',
                borderBottom: active ? '2px solid var(--laser-cyan)' : '2px solid transparent',
                background: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 0: AI Warehouse Schedule & Equipment Failure Frequency Alert Matrix */}
      {activeTab === 'ai_schedule' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. Canonical Table: Hệ thống Cảnh báo Tình trạng Thiết bị (AI) */}
          <div style={{ background: 'var(--surface-card)', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline-medium)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--surface-panel)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icons.Sparkles size={16} style={{ color: 'var(--laser-cyan)' }} />
                  <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--ink-pure)' }}>
                    Hệ thống Cảnh báo Tình trạng Thiết bị (AI) — Phân Loại Theo Tần Suất Hư Hỏng
                  </h2>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--ink-muted)' }}>
                  {aiOptimization?.executive_summary || 'AI tự động theo dõi tần suất hư hỏng thiết bị và đề xuất phương án dự phòng hoặc thay thế kịp thời, tránh gián đoạn việc dạy và học.'}
                </p>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', background: 'rgba(6,182,212,0.14)', color: 'var(--laser-cyan)', border: '1px solid rgba(6,182,212,0.3)' }}>
                {aiOptimization?.engine_label || 'Ruo Cortex Local AI v2.5'}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-header)', borderBottom: '1px solid var(--hairline-medium)' }}>
                    <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 800, width: '160px' }}>Mức độ</th>
                    <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 800, width: '180px' }}>Trạng thái</th>
                    <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 800, width: '260px' }}>Hành động đề xuất</th>
                    <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 800 }}>Tiêu chí AI & Số lượng thiết bị hiện tại</th>
                  </tr>
                </thead>
                <tbody>
                  {CANONICAL_AI_ALERT_MATRIX.map((row) => {
                    const count =
                      row.level === 'green'
                        ? aiCounts.green_count
                        : row.level === 'yellow'
                          ? aiCounts.yellow_count
                          : aiCounts.red_count;
                    return (
                      <tr key={row.level} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                        <td style={{ padding: '13px 18px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 12px',
                            borderRadius: '999px',
                            fontWeight: 800,
                            fontSize: '12.5px',
                            color: row.color_hex,
                            background: row.bg,
                            border: `1px solid ${row.border}`
                          }}>
                            {row.color_badge}
                          </span>
                        </td>
                        <td style={{ padding: '13px 18px', fontWeight: 700, color: 'var(--ink-pure)' }}>
                          {row.status_label}
                        </td>
                        <td style={{ padding: '13px 18px', fontWeight: 700, color: row.color_hex }}>
                          {row.recommended_action}
                        </td>
                        <td style={{ padding: '13px 18px', color: 'var(--ink-secondary)', fontSize: '12.5px' }}>
                          <div>{row.description}</div>
                          <div style={{ marginTop: '4px', fontWeight: 700, color: 'var(--ink-pure)' }}>
                            Đang ghi nhận: <span style={{ color: row.color_hex }}>{count} thiết bị</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Concurrent / Cluster Failure Warnings (VD: Nhiều Tivi / Máy chiếu / Điều hòa cùng hỏng một lúc) */}
          {concurrentClusters.length > 0 && (
            <div style={{ background: 'var(--surface-card)', border: '1.5px solid rgba(239,68,68,0.4)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Icons.AlertTriangle size={17} style={{ color: '#EF4444' }} />
                <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: 'var(--ink-pure)' }}>
                  Cảnh Báo Nguy Cơ Hỏng Đồng Loạt Theo Chủng Loại Thiết Bị (Tránh Gián Đoạn Dạy & Học)
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '12px' }}>
                {concurrentClusters.map((cluster) => {
                  const isRed = cluster.level === 'red';
                  const color = isRed ? '#EF4444' : '#F59E0B';
                  return (
                    <div
                      key={cluster.category_code}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: isRed ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                        border: `1px solid ${isRed ? 'rgba(239,68,68,0.35)' : 'rgba(245,158,11,0.35)'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 800, color: 'var(--ink-pure)', fontSize: '13.5px' }}>
                          {cluster.category_name}
                        </span>
                        <span style={{ fontSize: '11.5px', fontWeight: 800, color, padding: '2px 8px', borderRadius: '999px', background: 'var(--surface-card)', border: `1px solid ${color}` }}>
                          {cluster.color_badge} · {cluster.status_label}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
                        {cluster.advisory}
                      </div>
                      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 700, color }}>
                        <span>Hành động: {cluster.recommended_action}</span>
                        <span>Dự phòng KHO-01: {cluster.available_in_warehouse} máy</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Criticality-Based Warehouse Equipment Usage & Dispatch Schedule */}
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline-medium)', background: 'var(--surface-panel)' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--ink-pure)' }}>
                1. Tối Ưu Hóa Lịch Trình Sử Dụng Thiết Bị Trong Kho (KHO-01) Dựa Trên Mức Độ Quan Trọng
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--ink-muted)' }}>
                Xếp hạng mức độ quan trọng của phòng học/giảng đường và tự động ghép cặp thiết bị dự phòng trong Kho KHO-01 theo khung giờ điều phối tối ưu.
              </p>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink-muted)' }}>
                <Icons.RefreshCw size={26} className="spin" style={{ marginBottom: '10px' }} />
                <div>AI đang tính toán lịch trình tối ưu hóa thiết bị kho KHO-01...</div>
              </div>
            ) : aiScheduleList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--ink-muted)' }}>
                Chưa có lịch trình điều phối kho dự phòng.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-header)', borderBottom: '1px solid var(--hairline-medium)' }}>
                      <th style={{ padding: '12px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Mức Quan Trọng</th>
                      <th style={{ padding: '12px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Khung Giờ Lịch Trình</th>
                      <th style={{ padding: '12px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Thiết Bị Kho KHO-01</th>
                      <th style={{ padding: '12px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Phòng / Thiết Bị Đích</th>
                      <th style={{ padding: '12px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Tần Suất Hỏng</th>
                      <th style={{ padding: '12px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Hành Động Đề Xuất & Phương Án AI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiScheduleList.map((item) => {
                      const color =
                        item.priority_level === 'red'
                          ? '#EF4444'
                          : item.priority_level === 'yellow'
                            ? '#F59E0B'
                            : '#10B981';
                      return (
                        <tr key={item.schedule_id} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 800, color }}>{item.color_badge} · Điểm {item.criticality_score}/100</div>
                            <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '2px' }}>{item.priority_tier}</div>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ink-pure)' }}>
                            {item.time_slot}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--laser-cyan)' }}>
                              {item.warehouse_equipment?.code}
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--ink-secondary)' }}>
                              {item.warehouse_equipment?.name}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--ink-pure)' }}>
                              {item.target_room_code} — {item.target_equipment_code}
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                              {item.target_equipment_name}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--ink-secondary)' }}>
                            {item.failure_frequency_summary}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 800, color }}>{item.recommended_action}</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--ink-secondary)', marginTop: '2px' }}>
                              {item.schedule_directive}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 4. Equipment Failure Frequency Watchlist (Filtered by Green / Yellow / Red) */}
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline-medium)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--surface-panel)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--ink-pure)' }}>
                  2. Bảng Theo Dõi Tần Suất Hư Hỏng Của Từng Thiết Bị (Phân Loại Màu Sắc AI)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--ink-muted)' }}>
                  Danh sách thiết bị được AI chấm điểm tần suất hư hỏng (số lần hỏng, chu kỳ 90 ngày, tỷ lệ R) và gán mức độ cảnh báo màu sắc.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { key: 'ALL', label: `Tất cả (${(aiOptimization?.equipment_health_list || []).length})` },
                  { key: 'red', label: `● Đỏ (${aiCounts.red_count})` },
                  { key: 'yellow', label: `● Vàng (${aiCounts.yellow_count})` },
                  { key: 'green', label: `● Xanh (${aiCounts.green_count})` }
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setAiLevelFilter(f.key)}
                    className="laser-btn laser-btn-secondary"
                    style={{
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      borderColor: aiLevelFilter === f.key ? 'var(--laser-cyan)' : undefined,
                      color: aiLevelFilter === f.key ? 'var(--laser-cyan)' : undefined
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-header)', borderBottom: '1px solid var(--hairline-medium)' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Mức độ (AI)</th>
                    <th style={{ padding: '12px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Trạng thái</th>
                    <th style={{ padding: '12px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Thiết Bị & Phòng</th>
                    <th style={{ padding: '12px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Tần Suất Hư Hỏng</th>
                    <th style={{ padding: '12px 16px', color: 'var(--ink-pure)', fontWeight: 800 }}>Hành động đề xuất</th>
                  </tr>
                </thead>
                <tbody>
                  {aiHealthList.slice(0, 30).map((eq) => {
                    const alert = eq.ai_alert || {};
                    return (
                      <tr key={eq._id} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                        <td style={{ padding: '11px 16px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontWeight: 800,
                            fontSize: '12px',
                            color: alert.color_hex || '#10B981',
                            background: alert.level === 'red' ? 'rgba(239,68,68,0.14)' : alert.level === 'yellow' ? 'rgba(245,158,11,0.14)' : 'rgba(16,185,129,0.14)',
                            border: `1px solid ${alert.color_hex || '#10B981'}`
                          }}>
                            {alert.color_badge}
                          </span>
                        </td>
                        <td style={{ padding: '11px 16px', fontWeight: 700, color: 'var(--ink-pure)' }}>
                          {alert.status_label}
                        </td>
                        <td style={{ padding: '11px 16px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--ink-pure)' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--laser-cyan)' }}>{eq.code}</span> · {eq.name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                            Phòng: {eq.room_code} ({eq.room_name}) · Chủng loại: {eq.category_name}
                          </div>
                        </td>
                        <td style={{ padding: '11px 16px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--ink-pure)' }}>
                            {eq.repair_count} lần hỏng ({eq.recent_90d_repairs} lần/90 ngày) · R={eq.r_ratio}%
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>{alert.reason}</div>
                        </td>
                        <td style={{ padding: '11px 16px', fontWeight: 800, color: alert.color_hex || '#10B981' }}>
                          {alert.recommended_action}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Warehouse Stock */}
      {activeTab === 'warehouse' && (
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-muted)' }}>
              <Icons.RefreshCw size={28} className="spin" style={{ marginBottom: '12px' }} />
              <div>Đang tải danh sách tồn kho thiết bị...</div>
            </div>
          ) : warehouseEquipments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-muted)' }}>
              <Icons.Package size={36} style={{ opacity: 0.5, marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', fontWeight: 600 }}>Kho dự phòng KHO-01 hiện đang trống.</div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>Mọi thiết bị đều đã được phân bổ vào các phòng học.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--hairline-medium)' }}>
                  <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Mã Thiết Bị</th>
                  <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Tên Thiết Bị & Model</th>
                  <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Chủng Loại</th>
                  <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Hãng Sản Xuất</th>
                  <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Nguyên Giá (VNĐ)</th>
                  <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {warehouseEquipments.map((eq) => (
                  <tr key={eq._id} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                    <td style={{ padding: '12px 18px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--laser-cyan)' }}>
                      {eq.code}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--ink-pure)' }}>{eq.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>Model: {eq.model || 'N/A'}</div>
                    </td>
                    <td style={{ padding: '12px 18px', color: 'var(--ink-secondary)' }}>
                      {eq.category_id?.name || 'Chung'}
                    </td>
                    <td style={{ padding: '12px 18px', color: 'var(--ink-pure)' }}>
                      {eq.brand || '—'}
                    </td>
                    <td style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--ink-pure)' }}>
                      {(eq.price || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(6,182,212,0.15)', color: 'var(--laser-cyan)' }}>
                        Kho Dự Phòng
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: Room Shortages */}
      {activeTab === 'shortages' && (
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {shortages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-muted)' }}>
              <Icons.CheckCircle size={36} style={{ color: '#10B981', marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink-pure)' }}>Tất cả phòng học đều đạt 100% định mức trang bị.</div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>Không có phòng học nào bị thiếu thiết bị cần thiết.</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--hairline-medium)' }}>
                  <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Phòng Học</th>
                  <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Vị Trí & Loại Phòng</th>
                  <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Chi Tiết Thiếu Hụt Thiết Bị</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right', color: 'var(--ink-pure)', fontWeight: 700 }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {shortages.map((item) => (
                  <tr key={item.room._id || item.room.code} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                    <td style={{ padding: '12px 18px', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '14px', color: 'var(--ink-pure)' }}>
                      {item.room.code}
                    </td>
                    <td style={{ padding: '12px 18px', color: 'var(--ink-secondary)' }}>
                      <div>{item.room.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Tòa {item.room.building} • Tầng {item.room.floor}</div>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      {item.shortages.map((s, sIdx) => (
                        <div key={sIdx} style={{ fontSize: '12.5px', color: '#EF4444', marginBottom: '2px' }}>
                          • Thiếu <strong>{s.missing_qty ?? s.missingCount ?? s.diff}</strong> món {s.category_name || s.category?.name || 'Thiết bị'} (Hiện có {s.actual_qty ?? s.actualCount ?? 0}/{s.required_qty ?? s.requiredCount ?? 1})
                        </div>
                      ))}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      <span style={{ fontSize: '12px', color: 'var(--laser-cyan)', fontWeight: 600 }}>
                        Cần điều chuyển bổ sung
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 3: Spare Parts Stock Update */}
      {activeTab === 'parts' && (
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--hairline-medium)' }}>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Mã Linh Kiện</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Tên Linh Kiện Phụ Tùng</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Tồn Kho Thực Tế</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Định Mức Min</th>
                <th style={{ padding: '12px 18px', textAlign: 'right', color: 'var(--ink-pure)', fontWeight: 700 }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {spareParts.map((part) => {
                const minStock = part.min_stock ?? 5;
                const isLow = part.stock <= minStock;
                return (
                  <tr key={part._id} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                    <td style={{ padding: '12px 18px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--laser-cyan)' }}>
                      {part.part_code || part.code || 'PRT'}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--ink-pure)' }}>{part.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>{part.description || `Đơn vị tính: ${part.unit || 'Đơn vị'}`}</div>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: isLow ? '#EF4444' : '#10B981' }}>
                        {part.stock}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', color: 'var(--ink-muted)', fontSize: '12px' }}>
                      {minStock} {part.unit || 'đơn vị'}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      <button
                        onClick={() => openStockModal(part)}
                        className="laser-btn laser-btn-secondary"
                        style={{ padding: '5px 12px', fontSize: '12px' }}
                      >
                        Cập Nhật Số Lượng
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Stock Update Modal */}
      {selectedPart && (
        <div className="ruo-drawer-backdrop" onClick={() => setSelectedPart(null)}>
          <div className="ruo-drawer-panel" style={{ width: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Cập Nhật Số Lượng Tồn Kho</h2>
                <p className="ruo-drawer-subtitle">{selectedPart.name} ({selectedPart.part_code || selectedPart.code})</p>
              </div>
              <button onClick={() => setSelectedPart(null)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleStockSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Số Lượng Tồn Kho Mới *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newStockVal}
                    onChange={(e) => setNewStockVal(e.target.value)}
                    className="ruo-portal-input"
                    style={{ width: '100%', height: '40px', fontSize: '16px', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setSelectedPart(null)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button type="submit" disabled={submittingStock} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  {submittingStock ? 'Đang Lưu...' : 'Xác Nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseStockPage;
