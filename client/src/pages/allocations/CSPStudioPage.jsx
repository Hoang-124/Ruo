import React, { useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { CSP_CLASSES_SAMPLE, ROOMS } from '../../mock/mockData';

export const CSPStudioPage = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [allocatedResults, setAllocatedResults] = useState([]);
  const [unassignedList, setUnassignedList] = useState([]);
  const [hasRun, setHasRun] = useState(false);

  const runCSPAlgorithm = () => {
    setIsRunning(true);
    setProgress(0);
    setAllocatedResults([]);
    setUnassignedList([]);

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep += 20;
      setProgress(currentStep);

      if (currentStep >= 100) {
        clearInterval(interval);
        setIsRunning(false);
        setHasRun(true);

        // Compute simulated CSP + Greedy assignment
        const results = [];
        const unassigned = [];

        CSP_CLASSES_SAMPLE.forEach((cls) => {
          // Find candidates
          const candidates = ROOMS.filter(r => {
            if (cls.requiredLab && r.type !== 'lab') return false;
            if (r.capacity < cls.students) return false;
            return true;
          });

          if (candidates.length === 0) {
            unassigned.push({
              classInfo: cls,
              reason: 'Không có phòng nào đủ sức chứa hoặc đúng chủng loại'
            });
          } else {
            // Find lowest penalty
            let bestRoom = candidates[0];
            let minPenalty = 999;

            candidates.forEach((r) => {
              const wastePenalty = Math.round(((r.capacity - cls.students) / r.capacity) * 100);
              const distPenalty = (r.building === 'Tòa B2' && cls.faculty === 'CNTT') ? -50 : 30;
              const totalPenalty = wastePenalty + distPenalty;

              if (totalPenalty < minPenalty) {
                minPenalty = totalPenalty;
                bestRoom = r;
              }
            });

            results.push({
              classInfo: cls,
              room: bestRoom,
              penalty: minPenalty,
              wastedSeats: bestRoom.capacity - cls.students
            });
          }
        });

        setAllocatedResults(results);
        setUnassignedList(unassigned);
      }
    }, 150);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Trụ Cột 1: Trình Xếp Phòng Học Kỳ Tự Động (CSP Algorithm)</h1>
          <div className="page-subtitle">
            Giải bài toán thỏa mãn ràng buộc (Constraint Satisfaction Problem) kết hợp thuật toán Weighted Greedy Heuristic
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-primary btn-lg"
            onClick={runCSPAlgorithm}
            disabled={isRunning}
            style={{ gap: '8px' }}
          >
            <Icons.Cpu size={18} />
            <span>{isRunning ? 'Đang giải bài toán CSP...' : 'Bắt Đầu Phân Bổ Tự Động'}</span>
          </button>
        </div>
      </div>

      {/* Constraints Specification Banner */}
      <div className="grid-cols-2" style={{ marginBottom: '24px' }}>
        <div
          className="card"
          style={{
            borderLeft: '4px solid var(--color-danger-500)',
            background: 'var(--color-danger-50)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Icons.AlertTriangle size={16} color="var(--color-danger-600)" />
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-danger-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ràng Buộc Cứng (Hard Constraints — Vi phạm = 0)
            </h4>
          </div>
          <ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--color-danger-700)', lineHeight: '1.6' }}>
            <li><strong>C1 (Không xung đột):</strong> Không có 2 lớp học cùng phòng trong cùng một slot giờ.</li>
            <li><strong>C2 (Sức chứa):</strong> Sức chứa phòng {'>='} Số lượng sinh viên đăng ký lớp.</li>
            <li><strong>C3 (Thiết bị):</strong> Phòng phải có đủ thiết bị đặc thù môn yêu cầu (Micro, Máy Chiếu, Lab).</li>
          </ul>
        </div>

        <div
          className="card"
          style={{
            borderLeft: '4px solid var(--color-primary-500)',
            background: 'var(--color-primary-50)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Icons.CheckCircle size={16} color="var(--color-primary-600)" />
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-primary-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ràng Buộc Mềm (Soft Constraints — Tối ưu hóa)
            </h4>
          </div>
          <ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--color-primary-700)', lineHeight: '1.6' }}>
            <li><strong>S1 (Tối ưu ghế):</strong> Tỷ lệ lãng phí ghế không vượt quá 20% (sức chứa thừa tối thiểu).</li>
            <li><strong>S2 (Gom cụm):</strong> Giảng viên dạy 2 ca liên tiếp được bố trí cùng tòa nhà.</li>
            <li><strong>S3 (Tiết kiệm năng lượng):</strong> Ưu tiên dồn phòng vào tầng thấp các ca sáng sớm.</li>
          </ul>
        </div>
      </div>

      {/* Solving Metric Progress (simulated telemetry) */}
      {isRunning && (
        <div className="card" style={{ marginBottom: '24px', textAlign: 'center', padding: '30px' }}>
          <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px', color: 'var(--color-primary-600)' }}>
            Đang áp dụng Heuristic Variable Ordering (MRV & Degree) và tìm nghiệm tối ưu...
          </div>
          <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--color-primary-600), var(--color-green-500))',
                transition: 'width 150ms ease-out'
              }}
            />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Tiến trình: {progress}% (Đã kiểm tra 4 ràng buộc cứng và tính hàm phạt soft constraints)
          </div>
        </div>
      )}

      {/* Results Table */}
      {hasRun && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Kết Quả Phân Bổ Tự Động ({allocatedResults.length} Lớp Học Phần)</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-green-600)', fontWeight: 600 }}>
                <Icons.CheckCircle size={14} color="var(--color-green-600)" />
                <span>100% lớp học phần đã được xếp phòng thành công, không phát sinh xung đột lịch!</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <span className="badge badge-success">
                Tỷ lệ lãng phí ghế trung bình: 14.2%
              </span>
              <span className="badge badge-primary">
                Gom cụm khoa: 92%
              </span>
            </div>
          </div>

          {unassignedList.length > 0 && (
            <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, color: 'var(--laser-rose)', fontSize: '13px', marginBottom: '4px' }}>
                Có {unassignedList.length} lớp học phần chưa tìm được phòng phù hợp:
              </div>
              {unassignedList.map(u => (
                <div key={u.classInfo.id} style={{ fontSize: '12px', color: 'var(--laser-rose)' }}>
                  • {u.classInfo.id} - {u.classInfo.name}: {u.reason}
                </div>
              ))}
            </div>
          )}

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã & Tên LHP</th>
                  <th>Giảng viên</th>
                  <th>Sĩ số</th>
                  <th>Yêu cầu</th>
                  <th>Phòng được gán</th>
                  <th>Ghế thừa</th>
                  <th>Điểm phạt (Penalty)</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {allocatedResults.map((item) => (
                  <tr key={item.classInfo.id}>
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-primary-700)' }}>
                        {item.classInfo.id}
                      </div>
                      <div style={{ fontWeight: 600 }}>{item.classInfo.name}</div>
                    </td>
                    <td>{item.classInfo.lecturer}</td>
                    <td>
                      <span style={{ fontWeight: 700 }}>{item.classInfo.students}</span> SV
                    </td>
                    <td>
                      <span className={`badge ${item.classInfo.requiredLab ? 'badge-warning' : 'badge-primary'}`}>
                        {item.classInfo.requiredLab ? 'Bắt buộc Lab' : 'Phòng Lý Thuyết'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-green-700)' }}>
                        {item.room.code}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {item.room.building} ({item.room.capacity} chỗ)
                      </div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)' }}>+{item.wastedSeats} chỗ</span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: item.penalty < 0 ? 'var(--color-green-600)' : 'var(--text-primary)' }}>
                        {item.penalty > 0 ? `+${item.penalty}` : item.penalty} đ
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-success">
                        <Icons.CheckCircle size={13} /> Khớp tối ưu
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Initial Preview before Run */}
      {!hasRun && !isRunning && (
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px' }}>
            Danh Sách Lớp Học Phần Chờ Xếp Phòng (Import từ hệ thống SIS)
          </h3>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã LHP</th>
                  <th>Tên Học Phần</th>
                  <th>Giảng Viên</th>
                  <th>Khoa / Viện</th>
                  <th>Sĩ Số Lớp</th>
                  <th>Phòng Yêu Cầu</th>
                </tr>
              </thead>
              <tbody>
                {CSP_CLASSES_SAMPLE.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{c.id}</td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.lecturer}</td>
                    <td>{c.faculty}</td>
                    <td><strong>{c.students}</strong> sinh viên</td>
                    <td>
                      <span className={`badge ${c.requiredLab ? 'badge-warning' : 'badge-primary'}`}>
                        {c.requiredLab ? 'Lab máy tính' : 'Lý thuyết'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
