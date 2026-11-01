import React, { useCallback, useEffect, useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { masterDataApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import './MasterDataPage.css';

const EMPTY_FORMS = {
  categories: { code: '', name: '', depreciation_rate: 20, description: '' },
  buildings: { code: 'A1', name: '', campusZone: 'Khu A', totalFloors: 5, description: '', isActive: true },
  suppliers: { code: '', name: '', contact_person: '', phone: '', email: '', address: '' },
  repair_units: { code: '', name: '', contact_person: '', specialty: '', phone: '', email: '', address: '' }
};

const TABS = [
  { id: 'categories', label: 'Loại thiết bị' },
  { id: 'buildings', label: 'Cấu trúc Tòa nhà' },
  { id: 'suppliers', label: 'Nhà cung cấp' },
  { id: 'repair_units', label: 'Đơn vị sửa chữa' }
];

const FORM_FIELDS = {
  categories: [
    ['code', 'Mã loại thiết bị', 'text', true],
    ['name', 'Tên loại thiết bị', 'text', true],
    ['depreciation_rate', 'Khấu hao (%/năm)', 'number', true],
    ['description', 'Mô tả', 'textarea']
  ],
  buildings: [
    ['code', 'Mã tòa nhà', 'text', true],
    ['name', 'Tên tòa nhà', 'text', true],
    ['campusZone', 'Khuôn viên', 'text'],
    ['totalFloors', 'Số tầng (Tòa thí điểm: 5)', 'number', true],
    ['description', 'Mô tả phân bổ tầng chức năng', 'textarea']
  ],
  suppliers: [
    ['code', 'Mã nhà cung cấp', 'text', true],
    ['name', 'Tên nhà cung cấp', 'text', true],
    ['contact_person', 'Người liên hệ', 'text'],
    ['phone', 'Điện thoại', 'tel'],
    ['email', 'Email', 'email'],
    ['address', 'Địa chỉ', 'text']
  ],
  repair_units: [
    ['code', 'Mã đơn vị sửa chữa', 'text', true],
    ['name', 'Tên đơn vị', 'text', true],
    ['specialty', 'Chuyên môn', 'text'],
    ['contact_person', 'Người phụ trách', 'text'],
    ['phone', 'Điện thoại', 'tel'],
    ['email', 'Email', 'email'],
    ['address', 'Địa chỉ', 'text']
  ]
};

const TITLE = {
  categories: 'Loại thiết bị',
  buildings: 'Tòa nhà & cấu trúc tầng',
  suppliers: 'Nhà cung cấp',
  repair_units: 'Đơn vị sửa chữa'
};

export const MasterDataPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('categories');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadTab = useCallback(async (tab = activeTab, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const loaders = {
        categories: masterDataApi.getAdminCategories,
        buildings: masterDataApi.getBuildings,
        suppliers: masterDataApi.getAdminSuppliers,
        repair_units: masterDataApi.getAdminRepairUnits
      };
      const result = await loaders[tab]();
      const keys = {
        categories: 'categories',
        buildings: 'buildings',
        suppliers: 'suppliers',
        repair_units: 'repairUnits'
      };
      setData(current => ({ ...current, [tab]: result[keys[tab]] || [] }));
    } catch (error) {
      toast.error(`Không thể tải ${TITLE[tab].toLowerCase()}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [activeTab, toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadTab(activeTab, false), 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, loadTab]);

  useEffect(() => {
    if (!modalType && !pendingDelete) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !submitting && !deleting) {
        setModalType(null);
        setPendingDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalType, pendingDelete, submitting, deleting]);

  const selectTab = (tab) => {
    if (tab !== activeTab) setLoading(true);
    setActiveTab(tab);
  };

  const openCreate = () => {
    setModalType(activeTab);
    setEditingRecord(null);
    setForm({ ...EMPTY_FORMS[activeTab] });
  };

  const openEdit = (record) => {
    setModalType(activeTab);
    setEditingRecord(record);
    const normalized = { ...record };
    if (activeTab === 'suppliers') normalized.contact_person = record.contact || record.contact_person || '';
    setForm({ ...EMPTY_FORMS[activeTab], ...normalized });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const fields = FORM_FIELDS[modalType].map(([field]) => field);
      const payload = Object.fromEntries(
        fields
          .filter((field) => !editingRecord || field !== 'code')
          .map((field) => [field, form[field]])
      );
      if (modalType === 'buildings' && editingRecord && typeof form.isActive === 'boolean') {
        payload.isActive = form.isActive;
      }
      if (editingRecord) {
        await masterDataApi.update(modalType, editingRecord._id, payload);
      } else {
        await masterDataApi.create(modalType, payload);
      }
      toast.success(`${editingRecord ? 'Đã cập nhật' : 'Đã thêm'} ${TITLE[modalType].toLowerCase()} thành công.`);
      setModalType(null);
      await loadTab(modalType);
    } catch (error) {
      toast.error(`Không thể lưu ${TITLE[modalType].toLowerCase()}: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await masterDataApi.remove(activeTab, pendingDelete._id);
      toast.success(`Đã xóa ${TITLE[activeTab].toLowerCase()}.`);
      setPendingDelete(null);
      await loadTab(activeTab);
    } catch (error) {
      toast.error(`Không thể xóa: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const records = data[activeTab] || [];

  const renderCells = (record) => {
    if (activeTab === 'categories') return <>
      <td>{record.code}</td><td>{record.name}</td><td>{record.depreciation_rate ?? 20}%</td><td>{record.description || '—'}</td>
    </>;
    if (activeTab === 'buildings') return <>
      <td>{record.code}</td><td>{record.name}</td><td>{record.campusZone || 'Khu A'}</td><td>{record.totalFloors ?? 5} tầng (T1–T5)</td><td>{record.description || '—'}</td>
    </>;
    if (activeTab === 'suppliers') return <>
      <td>{record.code}</td><td>{record.name}</td><td>{record.contact || record.contact_person || '—'}</td><td>{record.phone || '—'}<br />{record.email || ''}</td><td>{record.address || '—'}</td>
    </>;
    return <>
      <td>{record.code}</td><td>{record.name}</td><td>{record.specialty || '—'}</td><td>{record.contact_person || '—'}<br />{record.phone || '—'}<br />{record.email || ''}</td><td>{record.address || '—'}</td>
    </>;
  };

  const headers = {
    categories: ['Mã', 'Tên loại', 'Khấu hao / năm', 'Mô tả'],
    buildings: ['Mã tòa', 'Tên tòa nhà', 'Khuôn viên', 'Quy mô tầng', 'Mô tả chức năng'],
    suppliers: ['Mã', 'Nhà cung cấp', 'Người liên hệ', 'Liên lạc', 'Địa chỉ'],
    repair_units: ['Mã', 'Đơn vị sửa chữa', 'Chuyên môn', 'Liên lạc', 'Địa chỉ']
  };

  return (
    <div className="mdp-page">
      <section className="mdp-hero">
        <div className="mdp-heading">
          <span className="mdp-eyebrow">QUẢN TRỊ HỆ THỐNG · MASTER DATA · TÒA NHÀ THÍ ĐIỂM A1</span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icons.Settings size={26} color="var(--blueprint-400)" /> Danh mục nền hệ thống
          </h1>
          <p className="mdp-subtitle">
            Quản lý loại thiết bị, nhà cung cấp và đơn vị sửa chữa phục vụ vận hành tại <strong>Tòa nhà Đa năng A1 (5 tầng)</strong>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="ruo-btn ruo-btn-secondary"
            onClick={() => { window.location.hash = '#/rooms'; }}
          >
            <Icons.Building size={16} /> Quản lý Phòng & Kho Tòa A1
          </button>
          <button className="ruo-btn ruo-btn-primary mdp-primary-action" onClick={openCreate}>
            <Icons.Plus size={16} /> Thêm {TITLE[activeTab]}
          </button>
        </div>
      </section>

      <div className="mdp-tabs" role="tablist" aria-label="Nhóm danh mục hệ thống">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => selectTab(tab.id)} className={`mdp-tab ${activeTab === tab.id ? 'active' : ''}`}
            role="tab" aria-selected={activeTab === tab.id}>
            {tab.label}
            <span className="mdp-tab-count">{(data[tab.id] || []).length}</span>
          </button>
        ))}
      </div>

      <section className="mdp-table-card" role="tabpanel" aria-label={TITLE[activeTab]}>
        <div className="mdp-table-toolbar">
          <div>
            <h2>{TITLE[activeTab]}</h2>
            <p>{records.length} mục trong danh mục</p>
          </div>
          <span className="mdp-live-badge"><span /> Đang đồng bộ</span>
        </div>
        {loading ? <div className="mdp-loading"><span className="mdp-spinner" />Đang tải dữ liệu danh mục...</div> : (
          <div className="mdp-table-scroll">
            <table className="mdp-table">
              <thead><tr>
                {headers[activeTab].map(header => <th key={header}>{header}</th>)}
                <th className="mdp-actions-heading">Thao tác</th>
              </tr></thead>
              <tbody>
                {records.map(record => <tr key={record._id}>
                  {renderCells(record)}
                  <td className="mdp-row-actions">
                    <button className="mdp-icon-action" onClick={() => openEdit(record)} title="Chỉnh sửa" aria-label={`Chỉnh sửa ${record.name}`}><Icons.Edit size={15} /></button>
                    <button className="mdp-icon-action danger" onClick={() => setPendingDelete(record)} title="Xóa" aria-label={`Xóa ${record.name}`}><Icons.XCircle size={15} /></button>
                  </td>
                </tr>)}
                {records.length === 0 && <tr><td colSpan={headers[activeTab].length + 1} className="mdp-empty">
                  <span className="mdp-empty-icon"><Icons.Layers size={22} /></span>
                  <strong>Chưa có {TITLE[activeTab].toLowerCase()}</strong>
                  <span>Thêm dữ liệu mới để kết nối với các phân hệ đang sử dụng.</span>
                </td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalType && (
        <div className="ruo-modal-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !submitting) setModalType(null); }}>
          <div className="ruo-modal-content mdp-form-modal" role="dialog" aria-modal="true" aria-labelledby="mdp-form-title">
            <div className="ruo-modal-header">
              <div className="mdp-modal-title">
                <span className="mdp-modal-icon"><Icons.Settings size={18} /></span>
                <div><span>{editingRecord ? 'CHỈNH SỬA DỮ LIỆU' : 'TẠO DỮ LIỆU MỚI'}</span><h2 id="mdp-form-title">{editingRecord ? 'Cập nhật' : 'Thêm'} {TITLE[modalType]}</h2></div>
              </div>
              <button className="ruo-btn-close" onClick={() => setModalType(null)}><Icons.X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="ruo-modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {FORM_FIELDS[modalType].map(([field, label, type, required]) => (
                  <label key={field} className="ruo-label mdp-field" style={{ gridColumn: type === 'textarea' ? '1 / -1' : undefined }}>
                    {label}{required ? <span className="mdp-required"> *</span> : ''}
                    {type === 'textarea' ? <textarea className="ruo-textarea" rows={3} required={required} value={form[field] ?? ''} onChange={e => setForm(current => ({ ...current, [field]: e.target.value }))} />
                      : type === 'select' ? <select className="ruo-input" required={required} value={form[field] ?? ''} onChange={e => setForm(current => ({ ...current, [field]: e.target.value }))}>
                        <option value="lecture">Giảng đường</option>
                        <option value="lab">Phòng thực hành</option>
                        <option value="office">Văn phòng</option>
                        <option value="warehouse">Kho dự phòng</option>
                      </select>
                      : <input className="ruo-input" type={type} required={required} min={type === 'number' ? (field === 'totalFloors' ? 1 : 0) : undefined} max={field === 'depreciation_rate' ? 100 : undefined} step={type === 'number' ? 'any' : undefined}
                        value={form[field] ?? ''} disabled={editingRecord && field === 'code'} onChange={e => setForm(current => ({ ...current, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))} />}
                  </label>
                ))}
                {modalType === 'buildings' && editingRecord && (
                  <label className="ruo-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={form.isActive !== false} onChange={e => setForm(current => ({ ...current, isActive: e.target.checked }))} /> Đang hoạt động
                  </label>
                )}
              </div>
              <div className="ruo-modal-footer">
                <button type="button" className="ruo-btn ruo-btn-secondary" onClick={() => setModalType(null)}>Hủy</button>
                <button type="submit" className="ruo-btn ruo-btn-primary" disabled={submitting}>{submitting ? 'Đang lưu...' : <><Icons.Check size={15} /> Lưu dữ liệu</>}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="ruo-modal-overlay mdp-confirm-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !deleting) setPendingDelete(null); }}>
          <section className="ruo-modal-content mdp-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="mdp-delete-title" aria-describedby="mdp-delete-description">
            <div className="mdp-confirm-symbol"><Icons.AlertTriangle size={23} /></div>
            <button className="ruo-btn-close mdp-confirm-close" onClick={() => setPendingDelete(null)} disabled={deleting} aria-label="Đóng"><Icons.X size={18} /></button>
            <span className="mdp-confirm-eyebrow">XÁC NHẬN THAO TÁC</span>
            <h2 id="mdp-delete-title">Xóa {TITLE[activeTab].toLowerCase()}?</h2>
            <p id="mdp-delete-description">
              Bạn sắp xóa <strong>{pendingDelete.name}</strong>
              {pendingDelete.code && <> (<code>{pendingDelete.code}</code>)</>}. Thao tác này không thể hoàn tác.
            </p>
            <div className="mdp-confirm-actions">
              <button type="button" className="ruo-btn ruo-btn-secondary" onClick={() => setPendingDelete(null)} disabled={deleting}>Giữ lại</button>
              <button type="button" className="ruo-btn mdp-delete-button" onClick={handleDelete} disabled={deleting}>
                {deleting ? <><span className="mdp-button-spinner" /> Đang xóa...</> : <><Icons.XCircle size={15} /> Xóa dữ liệu</>}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default MasterDataPage;
