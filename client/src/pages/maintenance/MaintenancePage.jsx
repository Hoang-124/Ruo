import React, { useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';

export const MaintenancePage = () => {
  const { toast } = useToast();

  const [plans, setPlans] = useState([
    {
      _id: 'MP001',
      name: 'Bảo Dưỡng Định Kỳ Máy Chiếu Laser Toàn Trường Quý 4/2026',
      target_type: 'Máy chiếu Laser',
      frequency: 'Hàng Quý (Quarterly)',
      next_due: '2026-10-15',
      status: 'active',
      checklist: [
        { item: 'Kiểm tra độ sáng ANSI Lumens và thời gian chạy bóng', required: true },
        { item: 'Vệ sinh lưới lọc bụi và hệ thống quạt tản nhiệt', required: true },
        { item: 'Đo độ suy hao của cáp truyền dẫn HDMI/VGA âm tường', required: true }
      ]
    },
    {
      _id: 'MP002',
      name: 'Kiểm Tra Vệ Sinh Hệ Thống Điều Hòa Inverter Khu Giảng Đường',
      target_type: 'Điều hòa không khí',
      frequency: 'Hàng Tháng (Monthly)',
      next_due: '2026-10-05',
      status: 'active',
      checklist: [
        { item: 'Vệ sinh lưới lọc bụi dàn lạnh', required: true },
        { item: 'Kiểm tra áp suất gas R32 và đường ống thoát nước', required: true },
        { item: 'Đo dòng điện tiêu thụ và độ ồn quạt gió', required: false }
      ]
    }
  ]);

  const [logs, setLogs] = useState([
    {
      _id: 'MLOG001',
      plan_name: 'Bảo Dưỡng Định Kỳ Máy Chiếu Laser Toàn Trường',
      equipment_code: 'EQ-PRJ-101 (Phòng A1-101)',
      checked_by: 'Trần Minh Tuấn',
      check_date: '2026-09-25',
      status: 'passed',
      notes: 'Hệ thống quang học hoạt động ổn định, độ sáng đạt 5000 ANSI Lumens'
    }
  ]);

  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(plans[0]);
  const [checkResults, setCheckResults] = useState({});
  const [executionRoom, setExecutionRoom] = useState('A1-101');
  const [executionNote, setExecutionNote] = useState('');
  const [executionStatus, setExecutionStatus] = useState('passed');

  const handleOpenExecution = (plan) => {
    setSelectedPlan(plan);
    const initial = {};
    plan.checklist.forEach((item, idx) => {
      initial[idx] = true;
    });
    setCheckResults(initial);
    setIsChecklistModalOpen(true);
  };

  const handleSubmitChecklist = (e) => {
    e.preventDefault();
    const newLog = {
      _id: 'MLOG' + Date.now().toString().slice(-4),
      plan_name: selectedPlan.name,
      equipment_code: `Thiết bị tại phòng ${executionRoom}`,
      checked_by: 'Trần Minh Tuấn',
      check_date: new Date().toISOString().split('T')[0],
      status: executionStatus,
      notes: executionNote || 'Kiểm tra hoàn tất đúng quy chuẩn'
    };

    setLogs([newLog, ...logs]);
    setIsChecklistModalOpen(false);

    if (executionStatus === 'needs_repair') {
      toast.warning('Đã lưu kết quả bảo trì và TỰ ĐỘNG TẠO PHIẾU SỬA CHỮA do phát hiện hư hỏng!');
    } else {
      toast.success('Ghi nhận nhật ký bảo trì định kỳ thành công!');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--laser-cyan)', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>MODULE 05</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>BẢO TRÌ PHÒNG NGỪA • THEO DÕI ĐỊNH KỲ</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-pure)', letterSpacing: '-0.02em', margin: 0 }}>
            Kế Hoạch & Nhật Ký Bảo Trì Định Kỳ
          </h1>
        </div>
      </div>

      {/* Plans Section */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink-pure)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icons.Calendar size={18} color="var(--laser-cyan)" />
          <span>Kế Hoạch Bảo Trì Hiện Hành</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '16px' }}>
          {plans.map(p => (
            <div key={p._id} style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(37,99,235,0.12)', color: '#3B82F6', fontWeight: 700 }}>{p.frequency}</span>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink-pure)', marginTop: '8px', marginBottom: '4px' }}>{p.name}</h4>
                  <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Đối tượng: <strong style={{ color: 'var(--ink-secondary)' }}>{p.target_type}</strong></div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.12)', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
                  Hạn: {p.next_due}
                </span>
              </div>

              <div style={{ background: 'var(--surface-panel)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Danh mục kiểm tra (Checklist):</div>
                {p.checklist.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--ink-secondary)', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--laser-cyan)' }}>•</span>
                    <span>{c.item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleOpenExecution(p)}
                className="laser-btn laser-btn-primary"
                style={{ width: '100%', padding: '9px 16px', borderRadius: 'var(--radius-sm)', fontSize: '12.5px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Icons.CheckCircle size={15} />
                <span>Thực Hiện Kiểm Tra Bảo Trì</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Execution Logs Table */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink-pure)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icons.Audit size={18} color="var(--laser-cyan)" />
          <span>Lịch Sử Kiểm Tra Bảo Trì Gần Nhất</span>
        </h3>

        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--hairline-medium)', color: 'var(--ink-secondary)' }}>
                <th style={{ padding: '12px 16px' }}>Mã Log</th>
                <th style={{ padding: '12px 16px' }}>Kế Hoạch</th>
                <th style={{ padding: '12px 16px' }}>Thiết Bị / Vị Trí</th>
                <th style={{ padding: '12px 16px' }}>Kỹ Thuật Viên</th>
                <th style={{ padding: '12px 16px' }}>Ngày Kiểm Tra</th>
                <th style={{ padding: '12px 16px' }}>Kết Quả</th>
                <th style={{ padding: '12px 16px' }}>Ghi Chú</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log._id} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--laser-cyan)' }}>{log._id}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--ink-pure)' }}>{log.plan_name}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--ink-secondary)' }}>{log.equipment_code}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--ink-secondary)' }}>{log.checked_by}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--ink-muted)' }}>{log.check_date}</td>
                  <td style={{ padding: '14px 16px' }}>
                    {log.status === 'passed' ? (
                      <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.12)', color: '#10B981', fontWeight: 700, fontSize: '11.5px' }}>ĐẠT TIÊU CHUẨN</span>
                    ) : (
                      <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.12)', color: '#EF4444', fontWeight: 700, fontSize: '11.5px' }}>CẦN SỬA CHỮA</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--ink-secondary)', maxWidth: '280px' }}>{log.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Checklist Execution */}
      {isChecklistModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--surface-panel)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-xl)', maxWidth: '560px', width: '100%', padding: '28px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink-pure)', margin: 0 }}>Thực Hiện Checklist Bảo Dưỡng</h3>
              <button onClick={() => setIsChecklistModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer' }}>
                <Icons.X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--laser-cyan)', marginBottom: '16px', fontWeight: 600 }}>{selectedPlan.name}</div>

            <form onSubmit={handleSubmitChecklist} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '6px' }}>Phòng Kiểm Tra Thực Tế</label>
                <select
                  value={executionRoom}
                  onChange={e => setExecutionRoom(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', color: 'var(--ink-pure)', fontSize: '13px' }}
                >
                  <option value="A1-101">A1-101 (Giảng Đường Tầng 1)</option>
                  <option value="A1-201">A1-201 (Phòng Hội Thảo Tầng 2)</option>
                  <option value="A1-301">A1-301 (Phòng Lab Mạng Tầng 3)</option>
                  <option value="A1-401">A1-401 (Phòng Lý Thuyết Tầng 4)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '8px' }}>Các Hạng Mục Kiểm Tra:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--surface-card)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline-medium)' }}>
                  {selectedPlan.checklist.map((item, idx) => (
                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--ink-pure)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(checkResults[idx])}
                        onChange={e => setCheckResults({ ...checkResults, [idx]: e.target.checked })}
                      />
                      <span>{item.item}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '6px' }}>Đánh Giá Tổng Thể</label>
                <select
                  value={executionStatus}
                  onChange={e => setExecutionStatus(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', color: 'var(--ink-pure)', fontSize: '13px' }}
                >
                  <option value="passed">Đạt Tiêu Chuẩn Vận Hành (Passed)</option>
                  <option value="needs_repair">Phát Hiện Hư Hỏng ➔ Tự Động Tạo Phiếu Sửa Chữa (Needs Repair)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '6px' }}>Ghi Chú Kỹ Thuật</label>
                <textarea
                  rows="2"
                  placeholder="Ghi nhận hiện trạng, thông số đo đạc..."
                  value={executionNote}
                  onChange={e => setExecutionNote(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', border: '1px solid var(--hairline-medium)', color: 'var(--ink-pure)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsChecklistModalOpen(false)}
                  className="laser-btn laser-btn-ghost"
                  style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)' }}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="laser-btn laser-btn-primary"
                  style={{ padding: '8px 20px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}
                >
                  Lưu & Ghi Nhật Ký
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default MaintenancePage;
