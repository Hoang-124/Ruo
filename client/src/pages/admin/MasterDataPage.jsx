import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { masterDataApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

export const MasterDataPage = () => {
  const { toast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState('categories'); // 'categories' | 'suppliers' | 'repair_units' | 'rooms'

  // Data states
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [repairUnits, setRepairUnits] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('category'); // 'category' | 'supplier' | 'repair_unit' | 'room'

  // Forms
  const [catForm, setCatForm] = useState({ code: '', name: '', depreciation_rate: 20, description: '' });
  const [supForm, setSupForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '' });
  const [unitForm, setUnitForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '', specializations: '' });
  const [roomForm, setRoomForm] = useState({ code: '', name: '', building_code: 'A1', floor_number: 1, type: 'lecture', capacity: 60, area: 85 });
  const [submitting, setSubmitting] = useState(false);

  const fetchMasterData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'categories') {
        const res = await masterDataApi.getCategories();
        if (res.success) setCategories(res.categories || []);
      } else if (activeSubTab === 'suppliers') {
        const res = await masterDataApi.getSuppliers();
        if (res.success) setSuppliers(res.suppliers || []);
      } else if (activeSubTab === 'repair_units') {
        const res = await masterDataApi.getRepairUnits();
        if (res.success) setRepairUnits(res.repairUnits || []);
      } else if (activeSubTab === 'rooms') {
        const res = await masterDataApi.getRooms();
        if (res.success) setRooms(res.rooms || []);
      }
    } catch (err) {
      toast.error('Lỗi khi tải danh mục: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [activeSubTab, toast]);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (modalType === 'category') {
        const res = await masterDataApi.createCategory(catForm);
        if (res.success) {
          toast.success('Đã thêm chủng loại thiết bị mới thành công.');
          setCatForm({ code: '', name: '', depreciation_rate: 20, description: '' });
          setIsModalOpen(false);
          fetchMasterData();
        }
      } else if (modalType === 'supplier') {
        const res = await masterDataApi.createSupplier(supForm);
        if (res.success) {
          toast.success('Đã đăng ký nhà cung cấp mới thành công.');
          setSupForm({ name: '', contact_person: '', phone: '', email: '', address: '' });
          setIsModalOpen(false);
          fetchMasterData();
        }
      } else if (modalType === 'repair_unit') {
        const payload = {
          ...unitForm,
          specializations: unitForm.specializations ? unitForm.specializations.split(',').map(s => s.trim()) : []
        };
        const res = await masterDataApi.createRepairUnit(payload);
        if (res.success) {
          toast.success('Đã đăng ký đơn vị sửa chữa ngoài thành công.');
          setUnitForm({ name: '', contact_person: '', phone: '', email: '', address: '', specializations: '' });
          setIsModalOpen(false);
          fetchMasterData();
        }
      } else if (modalType === 'room') {
        const res = await masterDataApi.createRoom(roomForm);
        if (res.success) {
          toast.success('Đã thêm phòng / kho cơ sở mới thành công.');
          setRoomForm({ code: '', name: '', building_code: 'A1', floor_number: 1, type: 'lecture', capacity: 60, area: 85 });
          setIsModalOpen(false);
          fetchMasterData();
        }
      }
    } catch (err) {
      toast.error('Lỗi khi lưu danh mục: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = (type) => {
    setModalType(type);
    setIsModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icons.Settings size={26} color="var(--blueprint-400)" />
            Quản Lý Danh Mục Hệ Thống (Master Data)
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-secondary)' }}>
            Quản lý chủng loại tài sản, danh sách nhà cung cấp, đơn vị sửa chữa đối tác và phòng học / kho
          </p>
        </div>

        <button
          className="ruo-btn ruo-btn-primary"
          onClick={() => {
            const map = { categories: 'category', suppliers: 'supplier', repair_units: 'repair_unit', rooms: 'room' };
            openCreateModal(map[activeSubTab]);
          }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Icons.Plus size={16} />
          <span>
            {activeSubTab === 'categories' && 'Thêm Loại Thiết Bị'}
            {activeSubTab === 'suppliers' && 'Thêm Nhà Cung Cấp'}
            {activeSubTab === 'repair_units' && 'Thêm Đơn Vị Sửa Chữa'}
            {activeSubTab === 'rooms' && 'Thêm Phòng / Kho Mới'}
          </span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', gap: '8px' }}>
        <button
          className={`ruo-tab-btn ${activeSubTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('categories')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '13.5px',
            fontWeight: 700,
            color: activeSubTab === 'categories' ? 'var(--blueprint-400)' : 'var(--ink-secondary)',
            borderBottom: activeSubTab === 'categories' ? '2px solid var(--blueprint-400)' : '2px solid transparent'
          }}
        >
          Loại Thiết Bị (Categories)
        </button>
        <button
          className={`ruo-tab-btn ${activeSubTab === 'suppliers' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('suppliers')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '13.5px',
            fontWeight: 700,
            color: activeSubTab === 'suppliers' ? 'var(--blueprint-400)' : 'var(--ink-secondary)',
            borderBottom: activeSubTab === 'suppliers' ? '2px solid var(--blueprint-400)' : '2px solid transparent'
          }}
        >
          Nhà Cung Cấp (Suppliers)
        </button>
        <button
          className={`ruo-tab-btn ${activeSubTab === 'repair_units' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('repair_units')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '13.5px',
            fontWeight: 700,
            color: activeSubTab === 'repair_units' ? 'var(--blueprint-400)' : 'var(--ink-secondary)',
            borderBottom: activeSubTab === 'repair_units' ? '2px solid var(--blueprint-400)' : '2px solid transparent'
          }}
        >
          Đơn Vị Sửa Chữa (Repair Units)
        </button>
        <button
          className={`ruo-tab-btn ${activeSubTab === 'rooms' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('rooms')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '13.5px',
            fontWeight: 700,
            color: activeSubTab === 'rooms' ? 'var(--blueprint-400)' : 'var(--ink-secondary)',
            borderBottom: activeSubTab === 'rooms' ? '2px solid var(--blueprint-400)' : '2px solid transparent'
          }}
        >
          Phòng Học & Kho Dự Phòng (Rooms)
        </button>
      </div>

      {/* Content Table */}
      <div className="ruo-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--ink-muted)' }}>
            <Icons.Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ marginTop: '8px', fontSize: '13px' }}>Đang nạp dữ liệu danh mục...</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {activeSubTab === 'categories' && (
              <table className="ruo-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-header)', borderBottom: '1px solid var(--border-default)' }}>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>MÃ LOẠI</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>TÊN CHỦNG LOẠI</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>TỶ LỆ KHẤU HAO/NĂM</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>MÔ TẢ</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(c => (
                    <tr key={c._id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blueprint-400)' }}>
                        {c.code}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ink-primary)' }}>{c.name}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{c.depreciation_rate || 20}% / năm</td>
                      <td style={{ padding: '12px 16px', color: 'var(--ink-secondary)', fontSize: '12.5px' }}>{c.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSubTab === 'suppliers' && (
              <table className="ruo-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-header)', borderBottom: '1px solid var(--border-default)' }}>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>TÊN NHÀ CUNG CẤP</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>NGƯỜI LIÊN HỆ</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>SỐ ĐIỆN THOẠI & EMAIL</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>ĐỊA CHỈ</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map(s => (
                    <tr key={s._id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ink-primary)' }}>{s.name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--ink-secondary)' }}>{s.contact_person || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ color: 'var(--ink-primary)' }}>{s.phone || '—'}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>{s.email}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--ink-secondary)', fontSize: '12.5px' }}>{s.address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSubTab === 'repair_units' && (
              <table className="ruo-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-header)', borderBottom: '1px solid var(--border-default)' }}>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>TÊN ĐƠN VỊ SỬA CHỮA</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>CHUYÊN MÔN KỸ THUẬT</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>LIÊN HỆ</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>ĐỊA CHỈ</th>
                  </tr>
                </thead>
                <tbody>
                  {repairUnits.map(r => (
                    <tr key={r._id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ink-primary)' }}>{r.name}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {r.specializations && r.specializations.length > 0 ? (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {r.specializations.map((spec, i) => (
                              <span key={i} className="ruo-badge ruo-badge-neutral" style={{ fontSize: '11px' }}>
                                {spec}
                              </span>
                            ))}
                          </div>
                        ) : 'Chung'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div>{r.contact_person} ({r.phone})</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>{r.email}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--ink-secondary)', fontSize: '12.5px' }}>{r.address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeSubTab === 'rooms' && (
              <table className="ruo-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-header)', borderBottom: '1px solid var(--border-default)' }}>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>MÃ PHÒNG</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>TÊN PHÒNG / KHO</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>LOẠI PHÒNG</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>TÒA & TẦNG</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>SỨC CHỨA / DIỆN TÍCH</th>
                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map(rm => (
                    <tr key={rm._id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blueprint-400)' }}>
                        {rm.code}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ink-primary)' }}>{rm.name}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`ruo-badge ${rm.type === 'warehouse' ? 'ruo-badge-warning' : 'ruo-badge-neutral'}`}>
                          {rm.type === 'warehouse' ? 'Kho Dự Phòng' : (rm.type === 'lab' ? 'Phòng Thực Hành' : 'Giảng Đường')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>Tòa {rm.building_id?.code || 'A1'} • Tầng {rm.floor_number || 1}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{rm.capacity || 0} chỗ • {rm.area || 0} m²</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="ruo-badge ruo-badge-success">{rm.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="ruo-modal-overlay">
          <div className="ruo-modal-content" style={{ maxWidth: '520px' }}>
            <div className="ruo-modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                {modalType === 'category' && 'Định Nghĩa Chủng Loại Thiết Bị'}
                {modalType === 'supplier' && 'Đăng Ký Nhà Cung Cấp Mới'}
                {modalType === 'repair_unit' && 'Đăng Ký Đơn Vị Sửa Chữa Đối Tác'}
                {modalType === 'room' && 'Thêm Phòng Học / Kho Cơ Sở Mới'}
              </h2>
              <button className="ruo-btn-close" onClick={() => setIsModalOpen(false)}>
                <Icons.X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="ruo-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {modalType === 'category' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="ruo-label">Mã chủng loại *</label>
                        <input
                          type="text"
                          required
                          className="ruo-input"
                          placeholder="VD: MAYCHIEU, DIEUHOA"
                          value={catForm.code}
                          onChange={(e) => setCatForm({ ...catForm, code: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div>
                        <label className="ruo-label">Tỷ lệ khấu hao (%/năm) *</label>
                        <input
                          type="number"
                          required
                          className="ruo-input"
                          value={catForm.depreciation_rate}
                          onChange={(e) => setCatForm({ ...catForm, depreciation_rate: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="ruo-label">Tên chủng loại *</label>
                      <input
                        type="text"
                        required
                        className="ruo-input"
                        placeholder="VD: Máy chiếu Laser & Màn hình"
                        value={catForm.name}
                        onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="ruo-label">Mô tả quy cách</label>
                      <textarea
                        className="ruo-textarea"
                        rows={2}
                        placeholder="Mô tả danh mục thiết bị..."
                        value={catForm.description}
                        onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {modalType === 'supplier' && (
                  <>
                    <div>
                      <label className="ruo-label">Tên nhà cung cấp *</label>
                      <input
                        type="text"
                        required
                        className="ruo-input"
                        placeholder="VD: Công ty TNHH Thiết Bị Giáo Dục Việt Nam"
                        value={supForm.name}
                        onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="ruo-label">Người liên hệ</label>
                        <input
                          type="text"
                          className="ruo-input"
                          placeholder="VD: Trần Văn Quý"
                          value={supForm.contact_person}
                          onChange={(e) => setSupForm({ ...supForm, contact_person: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="ruo-label">Số điện thoại *</label>
                        <input
                          type="text"
                          required
                          className="ruo-input"
                          placeholder="0912345678"
                          value={supForm.phone}
                          onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="ruo-label">Email liên hệ</label>
                      <input
                        type="email"
                        className="ruo-input"
                        placeholder="contact@supplier.vn"
                        value={supForm.email}
                        onChange={(e) => setSupForm({ ...supForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="ruo-label">Địa chỉ trụ sở</label>
                      <input
                        type="text"
                        className="ruo-input"
                        placeholder="Hà Nội, Việt Nam"
                        value={supForm.address}
                        onChange={(e) => setSupForm({ ...supForm, address: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {modalType === 'repair_unit' && (
                  <>
                    <div>
                      <label className="ruo-label">Tên đơn vị sửa chữa đối tác *</label>
                      <input
                        type="text"
                        required
                        className="ruo-input"
                        placeholder="VD: Trung Tâm Bảo Hành & Điện Máy Chuyên Nghiệp"
                        value={unitForm.name}
                        onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="ruo-label">Người phụ trách</label>
                        <input
                          type="text"
                          className="ruo-input"
                          placeholder="VD: Kỹ sư Lê Tuấn"
                          value={unitForm.contact_person}
                          onChange={(e) => setUnitForm({ ...unitForm, contact_person: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="ruo-label">Số điện thoại *</label>
                        <input
                          type="text"
                          required
                          className="ruo-input"
                          placeholder="0988776655"
                          value={unitForm.phone}
                          onChange={(e) => setUnitForm({ ...unitForm, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="ruo-label">Chuyên môn kỹ thuật (phân cách bằng dấu phẩy)</label>
                      <input
                        type="text"
                        className="ruo-input"
                        placeholder="Máy chiếu, Điều hòa, Hệ thống âm thanh"
                        value={unitForm.specializations}
                        onChange={(e) => setUnitForm({ ...unitForm, specializations: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {modalType === 'room' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="ruo-label">Mã phòng / kho *</label>
                        <input
                          type="text"
                          required
                          className="ruo-input"
                          placeholder="VD: A1-305, KHO-02"
                          value={roomForm.code}
                          onChange={(e) => setRoomForm({ ...roomForm, code: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div>
                        <label className="ruo-label">Phân loại phòng *</label>
                        <select
                          className="ruo-select"
                          value={roomForm.type}
                          onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value })}
                        >
                          <option value="lecture">Giảng Đường Lý Thuyết</option>
                          <option value="lab">Phòng Máy Tính / Lab</option>
                          <option value="office">Văn Phòng Khoa</option>
                          <option value="warehouse">Kho Dự Phòng CSVC</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="ruo-label">Tên không gian *</label>
                      <input
                        type="text"
                        required
                        className="ruo-input"
                        placeholder="VD: Phòng Học Đa Phương Tiện A1-305"
                        value={roomForm.name}
                        onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="ruo-label">Sức chứa (người)</label>
                        <input
                          type="number"
                          className="ruo-input"
                          value={roomForm.capacity}
                          onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="ruo-label">Diện tích (m²)</label>
                        <input
                          type="number"
                          className="ruo-input"
                          value={roomForm.area}
                          onChange={(e) => setRoomForm({ ...roomForm, area: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="ruo-modal-footer">
                <button type="button" className="ruo-btn ruo-btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="ruo-btn ruo-btn-primary" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : 'Xác Nhận Lưu Danh Mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterDataPage;
