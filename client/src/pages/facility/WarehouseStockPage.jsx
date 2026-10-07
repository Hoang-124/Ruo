import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { masterDataApi, equipmentApi, sparePartApi } from '../../lib/api';

export const WarehouseStockPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('warehouse'); // 'warehouse' | 'shortages' | 'parts'

  const [warehouseEquipments, setWarehouseEquipments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [shortages, setShortages] = useState([]);
  const [spareParts, setSpareParts] = useState([]);

  // Stock update modal
  const [selectedPart, setSelectedPart] = useState(null);
  const [newStockVal, setNewStockVal] = useState(0);
  const [submittingStock, setSubmittingStock] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eqRes, roomRes, partsRes] = await Promise.all([
        equipmentApi.list({ status: 'in_stock', limit: 100 }),
        masterDataApi.getRooms({ limit: 100 }),
        sparePartApi.list()
      ]);

      if (eqRes && eqRes.success) {
        setWarehouseEquipments(eqRes.equipments || []);
      }
      if (roomRes && roomRes.success) {
        const allRooms = roomRes.rooms || [];
        setRooms(allRooms);

        // Calculate shortages across lecture/lab rooms
        const roomShortageList = [];
        for (const rm of allRooms.filter(r => r.type !== 'warehouse')) {
          if (rm.required_equipment && rm.required_equipment.length > 0) {
            try {
              const shortRes = await masterDataApi.getRoomShortage(rm._id);
              if (shortRes && shortRes.success && shortRes.shortages && shortRes.shortages.length > 0) {
                roomShortageList.push({
                  room: rm,
                  shortages: shortRes.shortages
                });
              }
            } catch (e) {
              // Soft fail individual shortage calculation
            }
          }
        }
        setShortages(roomShortageList);
      }
      if (partsRes && partsRes.success) {
        setSpareParts(partsRes.parts || []);
      }
    } catch (err) {
      toast.error('Lỗi khi tải dữ liệu kho dự phòng: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>FACILITY MANAGER</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>MODULE 03 • KHO DỰ PHÒNG & ĐỊNH MỨC THIẾT BỊ PHÒNG HỌC</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Kho Dự Phòng & Đối Soát Định Mức Phòng
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Giám sát tài sản lưu kho KHO-01 sẵn sàng thay thế, phát hiện phòng thiếu hụt thiết bị so với định mức và quản lý linh kiện phụ tùng.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="laser-btn laser-btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}
        >
          <Icons.RefreshCw size={16} />
          <span>Làm Mới</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Thiết bị dự phòng sẵn sàng (KHO-01)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--laser-cyan)', marginTop: '4px' }}>{warehouseEquipments.length}</div>
        </div>

        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>Phòng học thiếu thiết bị</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#EF4444', marginTop: '4px' }}>{shortages.length}</div>
        </div>

        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>Chủng loại linh kiện dự trữ</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>{spareParts.length}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--hairline-medium)', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('warehouse')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: activeTab === 'warehouse' ? 700 : 500,
            color: activeTab === 'warehouse' ? 'var(--laser-cyan)' : 'var(--ink-muted)',
            borderBottom: activeTab === 'warehouse' ? '2px solid var(--laser-cyan)' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer'
          }}
        >
          Thiết Bị Lưu Kho KHO-01 ({warehouseEquipments.length})
        </button>

        <button
          onClick={() => setActiveTab('shortages')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: activeTab === 'shortages' ? 700 : 500,
            color: activeTab === 'shortages' ? 'var(--laser-cyan)' : 'var(--ink-muted)',
            borderBottom: activeTab === 'shortages' ? '2px solid var(--laser-cyan)' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer'
          }}
        >
          Phòng Thiếu Hụt Định Mức ({shortages.length})
        </button>

        <button
          onClick={() => setActiveTab('parts')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: activeTab === 'parts' ? 700 : 500,
            color: activeTab === 'parts' ? 'var(--laser-cyan)' : 'var(--ink-muted)',
            borderBottom: activeTab === 'parts' ? '2px solid var(--laser-cyan)' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer'
          }}
        >
          Linh Kiện & Cập Nhật Tồn Kho ({spareParts.length})
        </button>
      </div>

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
                {warehouseEquipments.map(eq => (
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
                      {eq.brand || 'N/A'}
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
                {shortages.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
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
                          • Thiếu <strong>{s.missing_qty || s.diff}</strong> món {s.category_name} (Hiện có {s.actual_qty}/{s.required_qty})
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
              {spareParts.map(part => {
                const isLow = part.stock <= (part.min_stock || 5);
                return (
                  <tr key={part._id} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                    <td style={{ padding: '12px 18px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--laser-cyan)' }}>
                      {part.part_code || part.code || 'PRT'}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--ink-pure)' }}>{part.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>{part.description || 'Linh kiện thay thế chuẩn'}</div>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: isLow ? '#EF4444' : '#10B981' }}>
                        {part.stock}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', color: 'var(--ink-muted)', fontSize: '12px' }}>
                      {part.min_stock || 5} đơn vị
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
