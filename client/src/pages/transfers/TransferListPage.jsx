import React, { useState, useEffect } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { transferApi, equipmentApi, facilityApi } from '../../lib/api';
import { Button, Card, DataTable, StatusBadge, Drawer, EmptyState } from '../../components/ui/Primitives';

export const TransferListPage = () => {
  const { currentUser, currentRoleKey } = useAuth();
  const { toast } = useToast();

  const isManagerOrAdmin = ['manager', 'admin'].includes(currentRoleKey);
  const isStaffOrAdmin = ['staff', 'admin'].includes(currentRoleKey);

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  // Rejection modal
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Propose form state
  const [newTransfer, setNewTransfer] = useState({
    equipment_code: '',
    to_room: 'A1-201',
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await transferApi.list();
      if (res.success) {
        setTransfers(res.transfers || []);
      }
    } catch (err) {
      toast.error('Lỗi tải danh sách điều chuyển: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const handleApprove = async (id) => {
    try {
      const res = await transferApi.approve(id);
      if (res.success) {
        toast.success('Đã phê duyệt lệnh điều chuyển thiết bị!');
        fetchTransfers();
      }
    } catch (err) {
      toast.error('Lỗi khi phê duyệt điều chuyển: ' + err.message);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectId || !rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối.');
      return;
    }
    try {
      const res = await transferApi.reject(rejectId, rejectReason.trim());
      if (res.success) {
        toast.warning('Đã từ chối lệnh điều chuyển.');
        setRejectId(null);
        setRejectReason('');
        fetchTransfers();
      }
    } catch (err) {
      toast.error('Lỗi khi từ chối điều chuyển: ' + err.message);
    }
  };

  const handleComplete = async (id) => {
    try {
      const res = await transferApi.complete(id);
      if (res.success) {
        toast.success('Đã hoàn tất bàn giao thiết bị vào phòng đích!');
        fetchTransfers();
      }
    } catch (err) {
      toast.error('Lỗi khi hoàn tất bàn giao: ' + err.message);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTransfer.equipment_code || !newTransfer.reason) {
      toast.error('Vui lòng nhập mã thiết bị và lý do điều chuyển.');
      return;
    }

    setSubmitting(true);
    try {
      // Find equipment by code first
      const eqRes = await equipmentApi.getByCode(newTransfer.equipment_code.trim().toUpperCase());
      if (!eqRes.success || !eqRes.equipment) {
        toast.error('Không tìm thấy thiết bị với mã: ' + newTransfer.equipment_code);
        setSubmitting(false);
        return;
      }

      // Propose transfer
      const res = await transferApi.propose({
        equipment_id: eqRes.equipment._id,
        to_room_code: newTransfer.to_room,
        reason: newTransfer.reason.trim()
      });

      if (res.success) {
        toast.success('Đã lập đề xuất điều chuyển thành công. Chờ Quản lý phòng duyệt.');
        setIsModalOpen(false);
        setNewTransfer({ equipment_code: '', to_room: 'A1-201', reason: '' });
        fetchTransfers();
      }
    } catch (err) {
      toast.error('Lỗi tạo đề xuất điều chuyển: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTransfers = transfers.filter(t => {
    if (filterStatus === 'all') return true;
    return t.status === filterStatus;
  });

  const columns = [
    {
      title: 'Mã Thiết Bị',
      key: 'equipment',
      width: '180px',
      render: (_, row) => {
        const eq = row.equipment_id;
        return (
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blueprint-400)' }}>
              {eq?.code || 'EQ-UNKNOWN'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{eq?.name || 'Tài sản'}</div>
          </div>
        );
      }
    },
    {
      title: 'Tuyến Điều Chuyển',
      key: 'route',
      render: (_, row) => {
        const from = row.from_room_id?.code || 'Kho CSVC';
        const to = row.to_room_id?.code || 'Chưa rõ';
        return (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span className="ruo-badge ruo-badge-neutral">{from}</span>
            <span style={{ color: 'var(--blueprint-400)', fontWeight: 800 }}>→</span>
            <span className="ruo-badge ruo-badge-neutral" style={{ borderColor: 'var(--blueprint-500)', color: 'var(--blueprint-400)' }}>
              {to}
            </span>
          </div>
        );
      }
    },
    {
      title: 'Lý Do Điều Chuyển',
      key: 'reason',
      render: (val) => (
        <span style={{ fontSize: '12.5px', color: 'var(--ink-secondary)' }}>{val}</span>
      )
    },
    {
      title: 'Người Đề Xuất',
      key: 'requested_by',
      render: (val) => (
        <span style={{ fontSize: '12px' }}>{val?.full_name || val?.code || 'Kỹ thuật viên'}</span>
      )
    },
    {
      title: 'Trạng Thái',
      key: 'status',
      render: (val) => <StatusBadge status={val} />
    },
    {
      title: 'Thao Tác Nghiệp Vụ',
      key: 'actions',
      align: 'right',
      render: (_, row) => {
        return (
          <div style={{ display: 'inline-flex', gap: '6px' }}>
            {row.status === 'pending' && isManagerOrAdmin && (
              <>
                <Button size="sm" variant="primary" onClick={() => handleApprove(row._id)}>
                  Duyệt
                </Button>
                <Button size="sm" variant="danger" onClick={() => setRejectId(row._id)}>
                  Từ Chối
                </Button>
              </>
            )}

            {row.status === 'approved' && isStaffOrAdmin && (
              <Button size="sm" variant="primary" onClick={() => handleComplete(row._id)}>
                Hoàn Tất Bàn Giao
              </Button>
            )}

            {row.status === 'completed' && (
              <span style={{ fontSize: '11px', color: '#2FB37A', fontWeight: 600 }}>
                Đã tiếp nhận
              </span>
            )}

            {row.status === 'rejected' && (
              <span style={{ fontSize: '11px', color: '#E5484D', fontWeight: 600 }}>
                Không phê duyệt
              </span>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--ink-primary)' }}>
            Điều Chuyển Trang Thiết Bị Giữa Các Phòng
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--ink-muted)' }}>
            Quy trình điều phối tài sản: Kỹ thuật viên đề xuất → Quản lý phòng duyệt → Kỹ thuật viên bàn giao thực tế
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isStaffOrAdmin && (
            <Button variant="primary" icon={Icons.Plus} onClick={() => setIsModalOpen(true)}>
              Lập Phiếu Điều Chuyển
            </Button>
          )}
          <Button variant="secondary" onClick={fetchTransfers}>
            Làm Mới
          </Button>
        </div>
      </div>

      {/* Tabs Filter */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-default)', paddingBottom: '8px' }}>
        {[
          { id: 'all', label: 'Tất cả phiếu' },
          { id: 'pending', label: 'Chờ Quản lý duyệt' },
          { id: 'approved', label: 'Đã duyệt (Chờ bàn giao)' },
          { id: 'completed', label: 'Đã hoàn tất' },
          { id: 'rejected', label: 'Bị từ chối' }
        ].map(tab => (
          <Button
            key={tab.id}
            size="sm"
            variant={filterStatus === tab.id ? 'primary' : 'ghost'}
            onClick={() => setFilterStatus(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filteredTransfers}
        loading={loading}
        emptyMessage="Không có phiếu điều chuyển nào trong mục này."
      />

      {/* Create Proposal Modal */}
      {isModalOpen && (
        <div className="ruo-drawer-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="ruo-drawer-panel" style={{ width: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <h2 className="ruo-drawer-title">Đề Xuất Điều Chuyển Thiết Bị</h2>
              <button onClick={() => setIsModalOpen(false)} className="ruo-drawer-close-btn">
                <Icons.X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Mã thiết bị điều chuyển *
                </label>
                <input
                  type="text"
                  className="ruo-portal-input"
                  placeholder="Ví dụ: EQ-PRJ-101 hoặc EQ-TV-201"
                  value={newTransfer.equipment_code}
                  onChange={e => setNewTransfer({ ...newTransfer, equipment_code: e.target.value })}
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '4px', display: 'block' }}>
                  Hệ thống sẽ tự động đối soát vị trí phòng hiện tại của thiết bị từ cơ sở dữ liệu.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Chuyển đến phòng đích *
                </label>
                <select
                  className="ruo-portal-input"
                  value={newTransfer.to_room}
                  onChange={e => setNewTransfer({ ...newTransfer, to_room: e.target.value })}
                >
                  <option value="A1-101">A1-101 (Giảng Đường Thông Minh 1)</option>
                  <option value="A1-201">A1-201 (Phòng Hội Thảo Khoa Học)</option>
                  <option value="A1-301">A1-301 (Phòng Thực Hành Mạng & An Ninh)</option>
                  <option value="A1-401">A1-401 (Phòng Học Lý Thuyết Đa Phương Tiện)</option>
                  <option value="A1-501">A1-501 (Kho Lưu Trữ CSVC)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Lý do điều chuyển *
                </label>
                <textarea
                  className="ruo-portal-input"
                  style={{ minHeight: '80px', padding: '10px' }}
                  placeholder="Mô tả mục đích sử dụng, phục vụ kỳ học hoặc sự kiện khoa học..."
                  value={newTransfer.reason}
                  onChange={e => setNewTransfer({ ...newTransfer, reason: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy</Button>
                <Button type="submit" variant="primary" loading={submitting}>Gửi Đề Xuất</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div className="ruo-drawer-backdrop" onClick={() => setRejectId(null)}>
          <div className="ruo-drawer-panel" style={{ width: '420px', height: 'auto', margin: 'auto', borderRadius: 'var(--radius-md)' }} onClick={e => e.stopPropagation()}>
            <div className="ruo-drawer-header">
              <h2 className="ruo-drawer-title">Từ Chối Lệnh Điều Chuyển</h2>
              <button onClick={() => setRejectId(null)} className="ruo-drawer-close-btn">
                <Icons.X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Lý do từ chối *</label>
              <textarea
                className="ruo-portal-input"
                style={{ minHeight: '80px', padding: '10px' }}
                placeholder="Nhập lý do không phê duyệt để phản hồi cho nhân viên kỹ thuật..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Button variant="ghost" onClick={() => setRejectId(null)}>Hủy</Button>
                <Button variant="danger" onClick={handleRejectSubmit}>Xác Nhận Từ Chối</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferListPage;
