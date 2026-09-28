import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_CATEGORIES = [
  { _id: 'CAT_PC', code: 'CAT_PC', name: 'Máy tính để bàn đồ họa & Server' },
  { _id: 'CAT_PROJ', code: 'CAT_PROJ', name: 'Máy chiếu laser & Màn hình LED' },
  { _id: 'CAT_METER', code: 'CAT_METER', name: 'Thiết bị đo kiểm & Vi mạch' },
  { _id: 'CAT_AC', code: 'CAT_AC', name: 'Điều hòa & Điện lạnh trung tâm' }
];

export function EquipmentForm({ onClose, onCreate }) {
  const { token } = useAuth();
  const [assetCode, setAssetCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]._id);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [originalPrice, setOriginalPrice] = useState('');
  const [locationRoom, setLocationRoom] = useState('A1-405');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch real categories from database
  useEffect(() => {
    let isMounted = true;
    fetch('/api/equipments/categories')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
          setCategory(data.categories[0]._id);
        }
      })
      .catch(() => {
        // Fallback to default categories if API not available
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!assetCode.trim() || !name.trim()) {
      setError('Mã tài sản và tên thiết bị là bắt buộc.');
      return;
    }
    if (!token) {
      setError('Bạn cần đăng nhập với tài khoản quản lý CSVC để tạo thiết bị.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        assetCode: assetCode.trim().toUpperCase(),
        name: name.trim(),
        category,
        purchaseDate,
        originalPrice: Number(originalPrice) || 0,
        locationRoom: locationRoom.trim()
      };

      const res = await fetch('/api/equipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const serverMessage = await res.json().catch(() => ({}));
        throw new Error(serverMessage.message || 'Bạn không có quyền tạo thiết bị hoặc phiên đăng nhập đã hết hạn.');
      }
      const data = await res.json();
      setAssetCode('');
      setName('');
      setOriginalPrice('');
      if (onCreate) onCreate(data.equipment || data);
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Không thể tạo thiết bị');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ minWidth: '320px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {error && (
          <div
            style={{
              color: 'var(--laser-rose)',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              fontSize: '12.5px',
              fontWeight: 600
            }}
          >
            {error}
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-secondary)', marginBottom: '4px' }}>
            Mã Tài Sản <span style={{ color: 'var(--laser-rose)' }}>*</span>
          </label>
          <input
            aria-label="Mã Tài Sản"
            value={assetCode}
            placeholder="Ví dụ: TS-2026-PC12"
            onChange={(e) => setAssetCode(e.target.value)}
            className="form-control"
            style={{ fontFamily: 'var(--font-sans)' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-secondary)', marginBottom: '4px' }}>
            Tên Thiết Bị <span style={{ color: 'var(--laser-rose)' }}>*</span>
          </label>
          <input
            aria-label="Tên Thiết Bị"
            value={name}
            placeholder="Ví dụ: Máy chiếu Laser Panasonic PT-MZ880"
            onChange={(e) => setName(e.target.value)}
            className="form-control"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-secondary)', marginBottom: '4px' }}>
            Nhóm / Phân loại <span style={{ color: 'var(--laser-rose)' }}>*</span>
          </label>
          <select
            aria-label="Nhóm / Phân loại"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="form-control"
            style={{ background: 'var(--surface-input)', color: 'var(--ink-pure)' }}
          >
            {categories.map((c) => (
              <option key={c._id || c.code} value={c._id || c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-secondary)', marginBottom: '4px' }}>
              Ngày Mua
            </label>
            <input
              aria-label="Ngày Mua"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="form-control"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-secondary)', marginBottom: '4px' }}>
              Nguyên Giá (VNĐ)
            </label>
            <input
              aria-label="Nguyên Giá (VNĐ)"
              type="number"
              min="0"
              placeholder="0"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              className="form-control"
              style={{ fontFamily: 'var(--font-sans)' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-secondary)', marginBottom: '4px' }}>
            Vị Trí / Phòng Học
          </label>
          <input
            aria-label="Vị Trí / Phòng"
            value={locationRoom}
            placeholder="Ví dụ: A1-405 hoặc Kho thiết bị"
            onChange={(e) => setLocationRoom(e.target.value)}
            className="form-control"
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button type="button" onClick={onClose} className="laser-btn laser-btn-ghost" disabled={loading}>
            Hủy
          </button>
          <button type="submit" className="laser-btn laser-btn-primary" disabled={loading}>
            {loading ? 'Đang lưu...' : 'Tạo thiết bị'}
          </button>
        </div>
      </div>
    </form>
  );
}

export default EquipmentForm;
