import React, { useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { equipmentApi } from '../../lib/api';

export const QRScannerPage = ({ onNavigateTab }) => {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [equipment, setEquipment] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoading(true);
      const res = await equipmentApi.getByQr(query.trim());
      if (res && res.success && res.equipment) {
        setEquipment(res.equipment);
        toast.success(`Đã tìm thấy thiết bị: [${res.equipment.code}] ${res.equipment.name}`);
      }
    } catch (err) {
      toast.error('Không tìm thấy thiết bị với mã QR / Mã tài sản: ' + query);
      setEquipment(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', color: '#0EA5E9', background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>KỸ THUẬT VIÊN</span>
          <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>MODULE 05 • UC: SCAN EQUIPMENT QR & VIEW DETAILS</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
          Quét Mã QR & Tra Cứu Thông Số Thực Địa
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
          Quét camera hoặc dán mã QR / Mã tài sản in trên thiết bị để đối soát thông số kỹ thuật và tình trạng bảo hành.
        </p>
      </div>

      {/* Scanner Input Card */}
      <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: '24px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ textAlign: 'center', padding: '24px', background: 'var(--surface-panel)', borderRadius: 'var(--radius-md)', border: '2px dashed var(--hairline-medium)' }}>
            <Icons.QrCode size={64} style={{ color: 'var(--laser-cyan)', margin: '0 auto 12px' }} />
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink-pure)', marginBottom: '4px' }}>
              Nhập Hoặc Quét Mã Tem Tài Sản
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--ink-muted)', maxWidth: '400px', margin: '0 auto 16px' }}>
              Sử dụng đầu đọc mã vạch / camera máy tính bảng hoặc nhập trực tiếp mã tài sản (VD: EQ-2026-001)
            </div>

            <div style={{ display: 'flex', gap: '10px', maxWidth: '480px', margin: '0 auto' }}>
              <input
                type="text"
                required
                autoFocus
                placeholder="Nhập mã QR hoặc Mã tài sản..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="ruo-portal-input"
                style={{ flex: 1, height: '42px', fontSize: '14px', fontFamily: 'var(--font-mono)' }}
              />
              <button
                type="submit"
                disabled={loading}
                className="laser-btn laser-btn-primary"
                style={{ padding: '0 20px', height: '42px', fontWeight: 700 }}
              >
                {loading ? 'Đang Tra...' : 'Tra Cứu'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Equipment Result Card */}
      {equipment && (
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--laser-cyan)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '15px', color: 'var(--laser-cyan)', background: 'rgba(6,182,212,0.1)', padding: '3px 10px', borderRadius: '4px' }}>
                  {equipment.code}
                </span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink-pure)' }}>
                  {equipment.name}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>
                Hãng: <strong>{equipment.brand || 'N/A'}</strong> • Model: <strong>{equipment.model || 'N/A'}</strong> • Serial: <strong>{equipment.serial_number || 'N/A'}</strong>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, background: equipment.status === 'in_use' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: equipment.status === 'in_use' ? '#10B981' : '#EF4444' }}>
                Trạng thái: {equipment.status}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: 'var(--surface-panel)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '12.5px' }}>
              <div style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>Vị Trí Hiện Tại:</div>
              <strong style={{ color: 'var(--ink-pure)', fontSize: '13px' }}>
                {equipment.room_id ? `${equipment.room_id.code} - ${equipment.room_id.name}` : 'Kho dự phòng'}
              </strong>
            </div>

            <div style={{ background: 'var(--surface-panel)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '12.5px' }}>
              <div style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>Chủng Loại:</div>
              <strong style={{ color: 'var(--ink-pure)', fontSize: '13px' }}>
                {equipment.category_id?.name || 'Chung'}
              </strong>
            </div>

            <div style={{ background: 'var(--surface-panel)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '12.5px' }}>
              <div style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>Hạn Bảo Hành:</div>
              <strong style={{ color: equipment.warranty_expiry && new Date(equipment.warranty_expiry) > new Date() ? '#10B981' : '#EF4444', fontSize: '13px' }}>
                {equipment.warranty_expiry ? new Date(equipment.warranty_expiry).toLocaleDateString('vi-VN') : 'Không có'}
              </strong>
            </div>

            <div style={{ background: 'var(--surface-panel)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '12.5px' }}>
              <div style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>Nhà Cung Cấp:</div>
              <strong style={{ color: 'var(--ink-pure)', fontSize: '13px' }}>
                {equipment.supplier_id?.name || 'Không rõ'}
              </strong>
            </div>
          </div>

          {equipment.specs && Object.keys(equipment.specs).length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-muted)', fontWeight: 700, marginBottom: '6px' }}>
                Thông Số Kỹ Thuật (Specs)
              </div>
              <pre style={{ background: 'var(--surface-panel)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                {JSON.stringify(equipment.specs, null, 2)}
              </pre>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--hairline-medium)' }}>
            <button
              onClick={() => onNavigateTab && onNavigateTab('assigned_tasks')}
              className="laser-btn laser-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '12.5px' }}
            >
              Về Danh Sách Nhiệm Vụ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScannerPage;
