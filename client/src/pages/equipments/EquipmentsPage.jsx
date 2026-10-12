import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { equipmentApi, masterDataApi } from '../../lib/api';

export const EquipmentsPage = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [equipments, setEquipments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  // Master options
  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modals & Drawers
  const [selectedEq, setSelectedEq] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category_id: '',
    room_id: '',
    supplier_id: '',
    brand: '',
    model: '',
    serial_number: '',
    price: 0,
    warranty_expiry: ''
  });

  const [warrantyData, setWarrantyData] = useState({
    warranty_expiry: '',
    warranty_status: 'active'
  });

  const [batchJson, setBatchJson] = useState('');

  const fetchMasterData = async () => {
    try {
      const [catRes, roomRes, supRes] = await Promise.all([
        masterDataApi.getCategories(),
        masterDataApi.getRooms({ limit: 100 }),
        masterDataApi.getSuppliers()
      ]);
      setCategories(catRes?.categories || []);
      setRooms(roomRes?.rooms || []);
      setSuppliers(supRes?.suppliers || []);
    } catch (err) {
      console.warn('Master data load warning:', err.message);
    }
  };

  const fetchEquipments = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 50 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (categoryFilter !== 'ALL') params.category = categoryFilter;

      const res = await equipmentApi.list(params);
      if (res && res.success) {
        setEquipments(res.equipments || []);
        setTotalCount(res.total || 0);
      }
    } catch (err) {
      toast.error('Lỗi khi tải danh sách thiết bị: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchEquipments();
  }, [page, statusFilter, categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchEquipments();
  };

  // Open Modals
  const openCreate = () => {
    setFormData({
      code: `EQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      category_id: categories[0]?._id || '',
      room_id: rooms[0]?._id || '',
      supplier_id: suppliers[0]?._id || '',
      brand: '',
      model: '',
      serial_number: '',
      price: 0,
      warranty_expiry: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    });
    setShowCreateModal(true);
  };

  const openEdit = (eq) => {
    setSelectedEq(eq);
    setFormData({
      code: eq.code,
      name: eq.name,
      category_id: eq.category_id?._id || eq.category_id || '',
      room_id: eq.room_id?._id || eq.room_id || '',
      supplier_id: eq.supplier_id?._id || eq.supplier_id || '',
      brand: eq.brand || '',
      model: eq.model || '',
      serial_number: eq.serial_number || '',
      price: eq.price || 0,
      warranty_expiry: eq.warranty_expiry ? new Date(eq.warranty_expiry).toISOString().slice(0, 10) : ''
    });
    setShowEditModal(true);
  };

  const openWarranty = (eq) => {
    setSelectedEq(eq);
    setWarrantyData({
      warranty_expiry: eq.warranty_expiry ? new Date(eq.warranty_expiry).toISOString().slice(0, 10) : '',
      warranty_status: eq.warranty_status || 'active'
    });
    setShowWarrantyModal(true);
  };

  const openQr = (eq) => {
    setSelectedEq(eq);
    setShowQrModal(true);
  };

  // Submissions
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Vui lòng điền đủ mã và tên thiết bị.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await equipmentApi.create(formData);
      if (res && res.success) {
        toast.success(`Đã đăng ký thiết bị mới: ${formData.code}!`);
        setShowCreateModal(false);
        await fetchEquipments();
      }
    } catch (err) {
      toast.error('Lỗi khi đăng ký thiết bị: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await equipmentApi.update(selectedEq._id, formData);
      if (res && res.success) {
        toast.success('Đã cập nhật thông tin thiết bị thành công!');
        setShowEditModal(false);
        await fetchEquipments();
      }
    } catch (err) {
      toast.error('Lỗi khi cập nhật thiết bị: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWarrantySubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await equipmentApi.updateWarranty(selectedEq._id, warrantyData);
      if (res && res.success) {
        toast.success('Đã cập nhật thông tin bảo hành thành công!');
        setShowWarrantyModal(false);
        await fetchEquipments();
      }
    } catch (err) {
      toast.error('Lỗi khi cập nhật bảo hành: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchImport = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const parsed = JSON.parse(batchJson);
      if (!Array.isArray(parsed)) {
        toast.error('Dữ liệu nhập hàng loạt phải là mảng JSON hợp lệ.');
        return;
      }

      let count = 0;
      for (const item of parsed) {
        try {
          await equipmentApi.create(item);
          count++;
        } catch (e) {
          console.warn('Item import failed:', item.code, e.message);
        }
      }

      toast.success(`Đã nhập thành công ${count}/${parsed.length} thiết bị vào hệ thống!`);
      setShowBatchModal(false);
      setBatchJson('');
      await fetchEquipments();
    } catch (err) {
      toast.error('Định dạng JSON không hợp lệ: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_use':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>Đang Sử Dụng</span>;
      case 'in_stock':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(6,182,212,0.15)', color: 'var(--laser-cyan)' }}>Kho Dự Phòng</span>;
      case 'broken':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>Bị Hỏng</span>;
      case 'repairing':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>Đang Sửa</span>;
      case 'pending_disposal':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(168,85,247,0.15)', color: '#A855F7' }}>Chờ Thanh Lý</span>;
      case 'disposed':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(100,116,139,0.2)', color: 'var(--ink-muted)' }}>Đã Thanh Lý</span>;
      default:
        return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: 'var(--ink-muted)' }}>{status}</span>;
    }
  };

  const inUseCount = equipments.filter(e => e.status === 'in_use').length;
  const inStockCount = equipments.filter(e => e.status === 'in_stock').length;
  const brokenCount = equipments.filter(e => e.status === 'broken' || e.status === 'repairing').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--laser-cyan)', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>MODULE 03</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>QUẢN LÝ TÀI SẢN & VÒNG ĐỜI THIẾT BỊ • TỔNG {totalCount} THIẾT BỊ</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Kho Thiết Bị & Danh Mục Tài Sản CSVC
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Theo dõi phân bổ thiết bị tại các phòng, tồn kho dự phòng, trạng thái bảo hành và quản lý mã QR định danh.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowBatchModal(true)}
            className="laser-btn laser-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}
          >
            <Icons.Upload size={16} />
            <span>Nhập Hàng Loạt</span>
          </button>

          <button
            onClick={openCreate}
            className="laser-btn laser-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700 }}
          >
            <Icons.Plus size={16} />
            <span>Đăng Ký Thiết Bị Mới</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Tổng thiết bị quản lý</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink-pure)', marginTop: '4px' }}>{totalCount}</div>
        </div>
        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>Đang hoạt động (In Use)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>{inUseCount}</div>
        </div>
        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: 'var(--laser-cyan)', fontWeight: 600 }}>Kho dự phòng (In Stock)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--laser-cyan)', marginTop: '4px' }}>{inStockCount}</div>
        </div>
        <div style={{ background: 'var(--surface-card)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>Hỏng / Đang sửa</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#EF4444', marginTop: '4px' }}>{brokenCount}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Icons.Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--ink-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã tài sản, tên thiết bị, serial hoặc model..."
              className="ruo-portal-input"
              style={{ paddingLeft: '38px', width: '100%', height: '38px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="ruo-portal-input"
              style={{ height: '38px', fontSize: '12.5px', padding: '0 12px' }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="in_use">Đang sử dụng (in_use)</option>
              <option value="in_stock">Kho dự phòng (in_stock)</option>
              <option value="broken">Bị hỏng (broken)</option>
              <option value="repairing">Đang sửa (repairing)</option>
              <option value="pending_disposal">Chờ thanh lý</option>
              <option value="disposed">Đã thanh lý</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="ruo-portal-input"
              style={{ height: '38px', fontSize: '12.5px', padding: '0 12px' }}
            >
              <option value="ALL">Tất cả chủng loại</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
              ))}
            </select>

            <button
              type="submit"
              className="laser-btn laser-btn-secondary"
              style={{ height: '38px', padding: '0 18px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}
            >
              Tìm Kiếm
            </button>
          </div>
        </form>
      </div>

      {/* Equipment Table */}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-muted)' }}>
            <Icons.RefreshCw size={28} className="spin" style={{ marginBottom: '12px' }} />
            <div>Đang tải danh sách thiết bị...</div>
          </div>
        ) : equipments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-muted)' }}>
            <Icons.Equipment size={36} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600 }}>Không tìm thấy thiết bị nào phù hợp.</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Hãy thử điều chỉnh bộ lọc hoặc đăng ký tài sản mới.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--hairline-medium)' }}>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Mã Tài Sản</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Tên Thiết Bị / Model</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Chủng Loại</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Vị Trí (Phòng)</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Trạng Thái</th>
                <th style={{ padding: '12px 18px', color: 'var(--ink-pure)', fontWeight: 700 }}>Bảo Hành</th>
                <th style={{ padding: '12px 18px', textAlign: 'right', color: 'var(--ink-pure)', fontWeight: 700 }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {equipments.map((eq) => {
                const roomInfo = eq.room_id ? `${eq.room_id.code} (${eq.room_id.name})` : 'Kho dự phòng (null)';
                const catInfo = eq.category_id?.name || 'Chung';
                const isWarrantyActive = eq.warranty_expiry && new Date(eq.warranty_expiry) > new Date();

                return (
                  <tr
                    key={eq._id}
                    style={{ borderBottom: '1px solid var(--hairline-soft)', cursor: 'pointer' }}
                    onClick={() => setSelectedEq(eq)}
                  >
                    <td style={{ padding: '12px 18px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--laser-cyan)' }}>
                      {eq.code}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--ink-pure)' }}>{eq.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                        {eq.brand} {eq.model} {eq.serial_number && `• SN: ${eq.serial_number}`}
                      </div>
                    </td>
                    <td style={{ padding: '12px 18px', color: 'var(--ink-secondary)' }}>
                      {catInfo}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: eq.room_id ? 'var(--ink-pure)' : 'var(--laser-cyan)' }}>
                        {roomInfo}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      {getStatusBadge(eq.status)}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      {eq.warranty_expiry ? (
                        <div style={{ fontSize: '12px', color: isWarrantyActive ? '#10B981' : '#EF4444' }}>
                          ● {isWarrantyActive ? 'Còn hạn' : 'Hết hạn'} ({new Date(eq.warranty_expiry).toLocaleDateString('vi-VN')})
                        </div>
                      ) : (
                        <span style={{ color: 'var(--ink-muted)', fontSize: '12px' }}>Không có</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => openQr(eq)}
                          className="laser-btn laser-btn-secondary"
                          style={{ padding: '5px 8px', borderRadius: '4px' }}
                          title="In nhãn QR Code"
                        >
                          <Icons.QrCode size={14} />
                        </button>
                        <button
                          onClick={() => openWarranty(eq)}
                          className="laser-btn laser-btn-secondary"
                          style={{ padding: '5px 8px', borderRadius: '4px' }}
                          title="Cập nhật bảo hành"
                        >
                          <Icons.Shield size={14} />
                        </button>
                        <button
                          onClick={() => openEdit(eq)}
                          className="laser-btn laser-btn-secondary"
                          style={{ padding: '5px 8px', borderRadius: '4px' }}
                          title="Chỉnh sửa thông tin"
                        >
                          <Icons.Edit size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Drawer */}
      {selectedEq && (
        <div className="ruo-drawer-backdrop" onClick={() => setSelectedEq(null)}>
          <div className="ruo-drawer-panel" style={{ width: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">{selectedEq.name}</h2>
                <p className="ruo-drawer-subtitle">{selectedEq.code} • {selectedEq.brand} {selectedEq.model}</p>
              </div>
              <button onClick={() => setSelectedEq(null)} className="ruo-drawer-close-btn">
                <Icons.X size={18} />
              </button>
            </div>

            <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-panel)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>Trạng Thái Vận Hành</div>
                  <div style={{ marginTop: '4px' }}>{getStatusBadge(selectedEq.status)}</div>
                </div>
                <button
                  onClick={() => openQr(selectedEq)}
                  className="laser-btn laser-btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px' }}
                >
                  <Icons.QrCode size={14} />
                  <span>In Nhãn QR</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '12.5px' }}>
                <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>Vị Trí Hiện Tại:</div>
                  <div style={{ fontWeight: 700, color: 'var(--ink-pure)', marginTop: '2px' }}>
                    {selectedEq.room_id ? `${selectedEq.room_id.code} - ${selectedEq.room_id.name}` : 'Kho dự phòng (null)'}
                  </div>
                </div>

                <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>Chủng Loại:</div>
                  <div style={{ fontWeight: 700, color: 'var(--ink-pure)', marginTop: '2px' }}>
                    {selectedEq.category_id?.name || 'Chung'}
                  </div>
                </div>

                <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>Nguyên Giá Mua:</div>
                  <div style={{ fontWeight: 700, color: 'var(--ink-pure)', marginTop: '2px' }}>
                    {(selectedEq.price || 0).toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>Số Serial:</div>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink-pure)', marginTop: '2px' }}>
                    {selectedEq.serial_number || 'N/A'}
                  </div>
                </div>
              </div>

              {selectedEq.warranty_expiry && (
                <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', padding: '12px 14px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-pure)' }}>Thông Tin Bảo Hành</span>
                    <button onClick={() => openWarranty(selectedEq)} style={{ background: 'none', border: 'none', color: 'var(--laser-cyan)', fontSize: '11.5px', cursor: 'pointer' }}>
                      Cập nhật →
                    </button>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--ink-secondary)', marginTop: '4px' }}>
                    Hạn bảo hành đến ngày: <strong>{new Date(selectedEq.warranty_expiry).toLocaleDateString('vi-VN')}</strong> • Tình trạng: <strong>{selectedEq.warranty_status || 'active'}</strong>
                  </div>
                </div>
              )}

              {selectedEq.specs && Object.keys(selectedEq.specs).length > 0 && (
                <div>
                  <div style={{ fontSize: '11.5px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 700, marginBottom: '6px' }}>
                    Thông Số Kỹ Thuật (Specs)
                  </div>
                  <pre style={{ background: 'var(--surface-panel)', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '11.5px', fontFamily: 'var(--font-mono)' }}>
                    {JSON.stringify(selectedEq.specs, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="ruo-drawer-footer">
              <button onClick={() => openEdit(selectedEq)} className="laser-btn laser-btn-primary" style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)' }}>
                Chỉnh Sửa Thiết Bị
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Đăng Ký Tài Sản Thiết Bị Mới</h2>
                <p className="ruo-drawer-subtitle">Nhập thông tin cơ bản để đưa tài sản vào hệ thống quản lý CSVC</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Mã Tài Sản *</label>
                    <input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Chủng Loại *</label>
                    <select required value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }}>
                      {categories.map((c) => (<option key={c._id} value={c._id}>{c.name}</option>))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Tên Thiết Bị *</label>
                  <input type="text" required placeholder="VD: Máy Chiếu Laser Panasonic PT-MZ880" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Hãng (Brand)</label>
                    <input type="text" placeholder="Panasonic" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Model</label>
                    <input type="text" placeholder="PT-MZ880" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Số Serial</label>
                    <input type="text" placeholder="SN-..." value={formData.serial_number} onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Vị Trí Phân Bổ (Phòng)</label>
                    <select value={formData.room_id} onChange={(e) => setFormData({ ...formData, room_id: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }}>
                      <option value="">Lưu vào Kho dự phòng (Chưa phân phòng)</option>
                      {rooms.map((r) => (<option key={r._id} value={r._id}>{r.code} - {r.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Nguyên Giá Mua (VNĐ)</label>
                    <input type="number" min="0" step="50000" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Hạn Bảo Hành</label>
                  <input type="date" value={formData.warranty_expiry} onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                </div>
              </div>

              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button type="submit" disabled={submitting} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  {submitting ? 'Đang Đăng Ký...' : 'Lưu & Khởi Tạo QR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedEq && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Cập Nhật Thông Tin Thiết Bị</h2>
                <p className="ruo-drawer-subtitle">{selectedEq.code}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Tên Thiết Bị *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Hãng (Brand)</label>
                    <input type="text" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Model</label>
                    <input type="text" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Số Serial</label>
                    <input type="text" value={formData.serial_number} onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Nguyên Giá Mua (VNĐ)</label>
                  <input type="number" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                </div>
              </div>

              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setShowEditModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button type="submit" disabled={submitting} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  {submitting ? 'Đang Lưu...' : 'Cập Nhật Thiết Bị'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warranty Modal */}
      {showWarrantyModal && selectedEq && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowWarrantyModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Cập Nhật Thông Tin Bảo Hành</h2>
                <p className="ruo-drawer-subtitle">{selectedEq.name} ({selectedEq.code})</p>
              </div>
              <button onClick={() => setShowWarrantyModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleWarrantySubmit}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Hạn Bảo Hành Mới *</label>
                  <input type="date" required value={warrantyData.warranty_expiry} onChange={(e) => setWarrantyData({ ...warrantyData, warranty_expiry: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Trạng Thái Bảo Hành</label>
                  <select value={warrantyData.warranty_status} onChange={(e) => setWarrantyData({ ...warrantyData, warranty_status: e.target.value })} className="ruo-portal-input" style={{ width: '100%' }}>
                    <option value="active">Còn hiệu lực (Active)</option>
                    <option value="expired">Hết hạn (Expired)</option>
                    <option value="void">Từ chối bảo hành (Void)</option>
                  </select>
                </div>
              </div>

              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setShowWarrantyModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button type="submit" disabled={submitting} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  {submitting ? 'Đang Lưu...' : 'Lưu Bảo Hành'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Label Print Modal */}
      {showQrModal && selectedEq && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowQrModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '420px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Nhãn Mã QR Định Danh CSVC</h2>
                <p className="ruo-drawer-subtitle">{selectedEq.code}</p>
              </div>
              <button onClick={() => setShowQrModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <div className="ruo-drawer-body">
              <div id="printable-qr-label" style={{ background: '#fff', color: '#000', padding: '24px', borderRadius: '8px', border: '2px solid #000', margin: '0 auto', maxWidth: '320px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #000', paddingBottom: '6px', marginBottom: '12px' }}>
                  ĐẠI HỌC QUỐC GIA • HỆ THỐNG RUO UEMS
                </div>

                {/* Native SVG QR pattern */}
                <div style={{ width: '160px', height: '160px', margin: '0 auto 12px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                  <Icons.QrCode size={130} color="#000" />
                </div>

                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '16px', letterSpacing: '0.05em' }}>
                  {selectedEq.code}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '2px' }}>
                  {selectedEq.name}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Phòng: {selectedEq.room_id?.code || 'Kho dự phòng'}
                </div>
              </div>
            </div>

            <div className="ruo-drawer-footer" style={{ justifyContent: 'center' }}>
              <button onClick={() => window.print()} className="laser-btn laser-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 24px', fontWeight: 700 }}>
                <Icons.Check size={16} />
                <span>In Nhãn QR Này</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Import Modal */}
      {showBatchModal && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowBatchModal(false)}>
          <div className="ruo-drawer-panel" style={{ width: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <div>
                <h2 className="ruo-drawer-title">Nhập Hàng Loạt Thiết Bị (Batch Import)</h2>
                <p className="ruo-drawer-subtitle">Dán danh sách thiết bị dạng JSON để thêm đồng loạt</p>
              </div>
              <button onClick={() => setShowBatchModal(false)} className="ruo-drawer-close-btn"><Icons.X size={18} /></button>
            </div>

            <form onSubmit={handleBatchImport}>
              <div className="ruo-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '12.5px', color: 'var(--ink-muted)' }}>
                  Định dạng yêu cầu: Mảng các đối tượng chứa ít nhất <code>code</code>, <code>name</code>, <code>category_id</code>, <code>price</code>.
                </div>

                <textarea
                  required
                  rows={10}
                  value={batchJson}
                  onChange={(e) => setBatchJson(e.target.value)}
                  placeholder={`[\n  {\n    "code": "EQ-2026-9001",\n    "name": "Màn Hình Máy Tính Dell UltraSharp 27",\n    "category_id": "${categories[0]?._id || ''}",\n    "price": 8500000,\n    "brand": "Dell",\n    "model": "U2723QE"\n  }\n]`}
                  className="ruo-portal-input"
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
                />
              </div>

              <div className="ruo-drawer-footer">
                <button type="button" onClick={() => setShowBatchModal(false)} className="laser-btn laser-btn-secondary" style={{ padding: '8px 16px' }}>Hủy Bỏ</button>
                <button type="submit" disabled={submitting} className="laser-btn laser-btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                  {submitting ? 'Đang Nhập...' : 'Bắt Đầu Nhập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentsPage;
