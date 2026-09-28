import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export function EquipmentForm({ onClose, onCreate }) {
  const { token } = useAuth();
  const [assetCode, setAssetCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Thiết bị chung');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [locationRoom, setLocationRoom] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!assetCode || !name) {
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
        assetCode,
        name,
        category,
        purchaseDate,
        originalPrice: Number(originalPrice) || 0,
        locationRoom
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
      setCategory('Thiết bị chung');
      setPurchaseDate('');
      setOriginalPrice('');
      setLocationRoom('');
      if (onCreate) onCreate(data);
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Không thể tạo thiết bị');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ minWidth: '320px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {error && <div style={{ color: 'var(--laser-rose)', fontWeight: 700 }}>{error}</div>}
        <label style={{ fontSize: '12px', fontWeight: 700 }}>Mã Tài Sản</label>
        <input aria-label="Mã Tài Sản" value={assetCode} onChange={(e) => setAssetCode(e.target.value)} className="form-control" />

        <label style={{ fontSize: '12px', fontWeight: 700 }}>Tên Thiết Bị</label>
        <input aria-label="Tên Thiết Bị" value={name} onChange={(e) => setName(e.target.value)} className="form-control" />

        <label style={{ fontSize: '12px', fontWeight: 700 }}>Nhóm / Phân loại</label>
        <input aria-label="Nhóm / Phân loại" value={category} onChange={(e) => setCategory(e.target.value)} className="form-control" />

        <label style={{ fontSize: '12px', fontWeight: 700 }}>Ngày Mua</label>
        <input aria-label="Ngày Mua" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="form-control" />

        <label style={{ fontSize: '12px', fontWeight: 700 }}>Nguyên Giá (VNĐ)</label>
        <input aria-label="Nguyên Giá (VNĐ)" type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} className="form-control" />

        <label style={{ fontSize: '12px', fontWeight: 700 }}>Vị Trí / Phòng</label>
        <input aria-label="Vị Trí / Phòng" value={locationRoom} onChange={(e) => setLocationRoom(e.target.value)} className="form-control" />

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
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
