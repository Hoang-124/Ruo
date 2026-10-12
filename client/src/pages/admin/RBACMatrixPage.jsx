import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useToast } from '../../context/ToastContext';
import { roleApi } from '../../lib/api';
import { USER_ROLES } from '../../config/navigation';

/**
 * RBACMatrixPage - UC-12.1: Roles Matrix & Dynamic RBAC Engine
 * 
 * Production-grade Role-Based Access Control matrix for the 4 Canonical Roles:
 * - Admin (BGH / Quản trị viên hệ thống)
 * - Facility Manager (Quản lý Cơ sở vật chất)
 * - Technician (Kỹ thuật viên vận hành & sửa chữa)
 * - Lecturer (Giảng viên & Cán bộ sử dụng)
 * 
 * Features:
 * - Real-time MongoDB persistence via /api/roles and /api/admin/roles
 * - Strict Separation of Duties (SoD) conflict detection & one-click resolution
 * - Granular permission toggles across all 6 core domains & 38 atomic operations
 * - Live search, category filtering & single-role focus mode
 * - One-click SoD default preset restoration
 * - Exportable compliance ledger (CSV / JSON)
 * - Pure Native Inline SVG icons only (Strict compliance with AGENTS.md / GEMINI.md)
 */

export const RBACMatrixPage = () => {
  const { toast } = useToast();

  const canonicalRoles = [
    {
      id: USER_ROLES.LECTURER,
      name: 'Giảng Viên',
      sub: 'Lecturer',
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.3)',
      desc: 'Báo hỏng phòng học, theo dõi tiến độ ca sửa và đánh giá nghiệm thu.'
    },
    {
      id: USER_ROLES.TECHNICIAN,
      name: 'Kỹ Thuật Viên',
      sub: 'Technician',
      color: '#0EA5E9',
      bg: 'rgba(14, 165, 233, 0.12)',
      border: 'rgba(14, 165, 233, 0.3)',
      desc: 'Tiếp nhận ca sửa, xin linh kiện kho, xác nhận di dời và quét QR thực địa.'
    },
    {
      id: USER_ROLES.FACILITY_MANAGER,
      name: 'Quản Lý CSVC',
      sub: 'Facility Manager',
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.3)',
      desc: 'Điều phối Kanban SLA, xuất kho linh kiện, ra lệnh chuyển phòng và lập đề xuất thanh lý R>=60%.'
    },
    {
      id: USER_ROLES.ADMIN,
      name: 'Quản Trị BGH',
      sub: 'System Admin',
      color: '#EF4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.3)',
      desc: 'Quản trị tài khoản, duyệt bổ nhiệm chức vụ, ma trận RBAC, duyệt thanh lý cuối và kiểm toán SHA-256.'
    }
  ];

  const permissionModules = [
    {
      id: 'mod_auth',
      name: 'Module 01: Tài Khoản, Xác Thực & Phê Duyệt Chức Vụ',
      shortName: 'Tài Khoản & Phân Quyền',
      permissions: [
        { code: 'user:profile:read', label: 'Xem & cập nhật hồ sơ cá nhân', defaultRoles: ['lecturer', 'technician', 'facility_manager', 'admin'] },
        { code: 'user:create', label: 'Khởi tạo tài khoản cán bộ mới', defaultRoles: ['admin'] },
        { code: 'user:update', label: 'Gán vai trò & phòng ban người dùng', defaultRoles: ['admin'] },
        { code: 'user:lock', label: 'Khóa / Mở khóa tài khoản cán bộ', defaultRoles: ['admin'] },
        { code: 'user:reset_password', label: 'Cấp lại mật khẩu tài khoản người dùng', defaultRoles: ['admin'] },
        { code: 'user:approve', label: 'Phê duyệt bổ nhiệm chức vụ KTV / Quản lý CSVC', defaultRoles: ['admin'] },
        { code: 'role:update', label: 'Cấu hình ma trận phân quyền hệ thống (RBAC)', defaultRoles: ['admin'] }
      ]
    },
    {
      id: 'mod_master',
      name: 'Module 02: Cơ Sở Vật Chất & Sơ Đồ Mặt Bằng CAD',
      shortName: 'Cơ Sở Vật Chất & CAD',
      permissions: [
        { code: 'room:read', label: 'Tra cứu phòng học & xem mặt bằng CAD 2D tương tác', defaultRoles: ['lecturer', 'technician', 'facility_manager', 'admin'] },
        { code: 'room:*', label: 'Thêm mới, sửa đổi không gian & sức chứa phòng học', defaultRoles: ['admin'] },
        { code: 'category:*', label: 'Quản lý danh mục chủng loại thiết bị & định mức', defaultRoles: ['admin'] },
        { code: 'supplier:*', label: 'Quản lý danh bạ nhà cung cấp thiết bị trường', defaultRoles: ['admin'] },
        { code: 'repair_unit:*', label: 'Quản lý danh bạ đơn vị sửa chữa đối tác ngoài', defaultRoles: ['admin'] }
      ]
    },
    {
      id: 'mod_assets',
      name: 'Module 03: Vòng Đời Thiết Bị, Dán Nhãn QR & Điều Chuyển',
      shortName: 'Thiết Bị & Điều Chuyển',
      permissions: [
        { code: 'equipment:read', label: 'Tra cứu kho thiết bị trường & lịch sử phòng', defaultRoles: ['lecturer', 'technician', 'facility_manager', 'admin'] },
        { code: 'equipment:create', label: 'Đăng ký tài sản mới vào hệ thống', defaultRoles: ['facility_manager'] },
        { code: 'equipment:update', label: 'Cập nhật thông số kỹ thuật & phòng phân bổ', defaultRoles: ['facility_manager'] },
        { code: 'equipment:import', label: 'Nhập hàng loạt danh sách thiết bị từ Excel/CSV', defaultRoles: ['facility_manager'] },
        { code: 'equipment:qr:generate', label: 'Tạo & in nhãn mã QR chuẩn hóa cho thiết bị', defaultRoles: ['facility_manager'] },
        { code: 'equipment:qr:scan', label: 'Quét mã QR camera tra cứu hồ sơ tài sản thực địa', defaultRoles: ['lecturer', 'technician', 'facility_manager', 'admin'] },
        { code: 'warranty:read', label: 'Tra cứu tình trạng & thời hạn bảo hành thiết bị', defaultRoles: ['technician', 'facility_manager'] },
        { code: 'warranty:update', label: 'Gia hạn bảo hành & cập nhật thông tin nhà cung cấp', defaultRoles: ['facility_manager'] },
        { code: 'movement:order', label: 'Ra quyết định điều chuyển thiết bị giữa các phòng', defaultRoles: ['facility_manager'] },
        { code: 'movement:confirm', label: 'Xác nhận hoàn thành di chuyển thiết bị thực địa', defaultRoles: ['technician'] },
        { code: 'placement:decide', label: 'Quyết định vị trí thiết bị sau khi sửa chữa xong', defaultRoles: ['facility_manager'] }
      ]
    },
    {
      id: 'mod_repairs',
      name: 'Module 04: Báo Hỏng, Điều Phối Kanban & Linh Kiện Kho',
      shortName: 'Báo Hỏng, Sửa Chữa & Linh Kiện',
      permissions: [
        { code: 'incident:create', label: 'Báo sự cố hỏng hóc tại phòng học kèm hình ảnh', defaultRoles: ['lecturer'] },
        { code: 'incident:read_own', label: 'Theo dõi tiến độ xử lý phiếu báo của bản thân', defaultRoles: ['lecturer'] },
        { code: 'repair:rate', label: 'Đánh giá nghiệm thu chất lượng sửa chữa (1-5 sao)', defaultRoles: ['lecturer'] },
        { code: 'repair:read', label: 'Xem bảng Kanban SLA điều phối toàn bộ ca sửa', defaultRoles: ['facility_manager'] },
        { code: 'repair:assign', label: 'Phân công Kỹ thuật viên & gán thời hạn SLA', defaultRoles: ['facility_manager'] },
        { code: 'repair:read_assigned', label: 'Xem danh sách nhiệm vụ sửa chữa được giao', defaultRoles: ['technician'] },
        { code: 'repair:accept', label: 'Tiếp nhận ca sửa chữa và bắt đầu bấm giờ SLA', defaultRoles: ['technician'] },
        { code: 'repair:log', label: 'Ghi nhật ký tiến độ, linh kiện & chi phí phát sinh', defaultRoles: ['technician'] },
        { code: 'repair:report_outcome', label: 'Báo cáo kết quả xử lý (Đã sửa / Không thể sửa)', defaultRoles: ['technician'] },
        { code: 'repair:close', label: 'Nghiệm thu kỹ thuật và đóng phiếu ca sửa', defaultRoles: ['facility_manager'] },
        { code: 'parts:request', label: 'Lập phiếu xin cấp phát linh kiện thay thế từ kho', defaultRoles: ['technician'] },
        { code: 'parts:approve', label: 'Thẩm định & phê duyệt xuất kho linh kiện', defaultRoles: ['facility_manager'] },
        { code: 'spare_part:update', label: 'Quản lý định mức tồn kho & cảnh báo tối thiểu', defaultRoles: ['facility_manager'] }
      ]
    },
    {
      id: 'mod_audit_disposal',
      name: 'Module 05: Kiểm Kê Tài Sản Thực Địa & Thẩm Định Thanh Lý',
      shortName: 'Kiểm Kê & Thanh Lý (RACI)',
      permissions: [
        { code: 'inventory:create', label: 'Khởi tạo phiên kiểm kê định kỳ theo phòng/tầng', defaultRoles: ['facility_manager'] },
        { code: 'inventory:scan', label: 'Quét mã QR kiểm kê & đối soát thực địa', defaultRoles: ['technician'] },
        { code: 'inventory:reconcile', label: 'Chốt số liệu kiểm kê & đối soát chênh lệch tài sản', defaultRoles: ['facility_manager'] },
        { code: 'disposal:propose', label: 'Lập hồ sơ đề xuất thanh lý khi chỉ số R >= 60%', defaultRoles: ['facility_manager'] },
        { code: 'disposal:approve', label: 'Phê duyệt quyết định thanh lý tài sản cuối cùng (BGH)', defaultRoles: ['admin'] }
      ]
    },
    {
      id: 'mod_analytics_audit',
      name: 'Module 06: Báo Cáo Thống Kê, Giám Sát & Kiểm Toán SHA-256',
      shortName: 'Báo Cáo & Kiểm Toán Bất Biến',
      permissions: [
        { code: 'dashboard:read', label: 'Xem Dashboard chỉ số vận hành tổng thể & KPI', defaultRoles: ['facility_manager', 'admin'] },
        { code: 'report:export', label: 'Xuất báo cáo tài sản, kiểm kê & chi phí (CSV/PDF)', defaultRoles: ['facility_manager', 'admin'] },
        { code: 'audit:read', label: 'Tra cứu sổ cái kiểm toán bất biến chuỗi băm', defaultRoles: ['admin'] },
        { code: 'audit:verify', label: 'Kích hoạt thuật toán xác thực chuỗi băm SHA-256', defaultRoles: ['admin'] },
        { code: 'audit:export', label: 'Xuất nhật ký kiểm toán phục vụ thanh tra', defaultRoles: ['admin'] },
        { code: 'system:health', label: 'Giám sát sức khỏe máy chủ & kết nối CSDL', defaultRoles: ['admin'] }
      ]
    }
  ];

  // Separation of Duties (SoD) Conflict Rules
  const SOD_RULES = [
    {
      id: 'SOD_DISPOSAL_DUAL',
      title: 'Xung đột Đề xuất & Phê duyệt Thanh lý',
      desc: 'Quản lý CSVC không được vừa lập hồ sơ đề xuất thanh lý (disposal:propose) vừa tự phê duyệt thanh lý (disposal:approve).',
      check: (state) => Boolean(state['facility_manager:disposal:propose'] && state['facility_manager:disposal:approve']),
      fix: (setState) => {
        setState(prev => ({ ...prev, 'facility_manager:disposal:approve': false }));
      }
    },
    {
      id: 'SOD_PARTS_DUAL',
      title: 'Xung đột Yêu cầu & Phê duyệt Linh kiện',
      desc: 'Kỹ thuật viên không được tự quyền duyệt xuất kho linh kiện cho chính phiếu xin của mình.',
      check: (state) => Boolean(state['technician:parts:request'] && state['technician:parts:approve']),
      fix: (setState) => {
        setState(prev => ({ ...prev, 'technician:parts:approve': false }));
      }
    },
    {
      id: 'SOD_TRANSFER_DUAL',
      title: 'Xung đột Ra lệnh & Xác nhận Điều chuyển',
      desc: 'Cán bộ ra quyết định điều chuyển thiết bị không được tự kiêm nhiệm xác nhận di chuyển thực địa.',
      check: (state) => Boolean(state['facility_manager:movement:order'] && state['facility_manager:movement:confirm']),
      fix: (setState) => {
        setState(prev => ({ ...prev, 'facility_manager:movement:confirm': false }));
      }
    },
    {
      id: 'SOD_LECTURER_PRIVILEGE',
      title: 'Vi phạm Đặc quyền Tối thiểu Giảng viên',
      desc: 'Giảng viên không được có thẩm quyền can thiệp vào kho linh kiện, cấu hình hệ thống hoặc duyệt thanh lý.',
      check: (state) => {
        const forbidden = ['role:update', 'user:create', 'user:lock', 'disposal:approve', 'parts:approve', 'movement:order'];
        return forbidden.some(code => state[`lecturer:${code}`]);
      },
      fix: (setState) => {
        setState(prev => {
          const next = { ...prev };
          const forbidden = ['role:update', 'user:create', 'user:lock', 'disposal:approve', 'parts:approve', 'movement:order'];
          forbidden.forEach(code => { next[`lecturer:${code}`] = false; });
          return next;
        });
      }
    }
  ];

  const [dbRoles, setDbRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matrixState, setMatrixState] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [focusedRole, setFocusedRole] = useState('ALL'); // 'ALL' or specific roleId

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const res = await roleApi.list();
      const rolesList = res?.roles || [];
      setDbRoles(rolesList);

      const state = {};
      canonicalRoles.forEach(r => {
        const found = rolesList.find(dbR => dbR.name === r.id);
        const perms = found ? (found.permissions || []) : [];

        permissionModules.forEach(mod => {
          mod.permissions.forEach(p => {
            const key = `${r.id}:${p.code}`;
            if (found && perms.length > 0) {
              state[key] = perms.includes(p.code) || perms.includes('*');
            } else {
              state[key] = p.defaultRoles.includes(r.id);
            }
          });
        });
      });

      setMatrixState(state);
    } catch (err) {
      toast.error('Không thể nạp ma trận phân quyền từ máy chủ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (roleId, code) => {
    const key = `${roleId}:${code}`;
    setMatrixState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setModulePermissionsForRole = (modPermissions, roleId, enable = true) => {
    setMatrixState(prev => {
      const next = { ...prev };
      modPermissions.forEach(p => {
        next[`${roleId}:${p.code}`] = enable;
      });
      return next;
    });
    toast.info(`Đã ${enable ? 'bật' : 'tắt'} toàn bộ quyền của nhóm cho vai trò này.`);
  };

  const activeSodViolations = useMemo(() => {
    return SOD_RULES.filter(rule => rule.check(matrixState));
  }, [matrixState]);

  const handleFixAllSod = () => {
    activeSodViolations.forEach(v => v.fix(setMatrixState));
    toast.success('Đã tự động loại bỏ các xung đột Separation of Duties!');
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Khôi phục toàn bộ ma trận phân quyền về chuẩn mực gốc SoD của hệ thống Ruo?')) return;
    try {
      setSaving(true);
      const res = await roleApi.resetDefaults();
      if (res && res.success) {
        toast.success(res.message || 'Đã khôi phục ma trận phân quyền chuẩn thành công!');
        await loadRoles();
      }
    } catch (err) {
      toast.error('Lỗi khi khôi phục chuẩn mặc định: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (activeSodViolations.length > 0) {
      const proceed = window.confirm(
        `CẢNH BÁO AN NINH: Hệ thống đang phát hiện ${activeSodViolations.length} xung đột Phân tách trách nhiệm (SoD).\nBạn có chắc chắn muốn lưu cấu hình này vào CSDL?`
      );
      if (!proceed) return;
    }

    try {
      setSaving(true);

      // Assemble payload for all 4 roles
      const payload = canonicalRoles.map(r => {
        const activePerms = [];
        permissionModules.forEach(mod => {
          mod.permissions.forEach(p => {
            if (matrixState[`${r.id}:${p.code}`]) {
              activePerms.push(p.code);
            }
          });
        });
        return {
          name: r.id,
          permissions: activePerms
        };
      });

      const res = await roleApi.batchUpdate(payload);
      if (res && res.success) {
        toast.success('Đã lưu cấu hình ma trận phân quyền RBAC thành công vào cơ sở dữ liệu MongoDB!');
        await loadRoles();
      }
    } catch (err) {
      toast.error('Lỗi khi lưu ma trận phân quyền: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = (format = 'json') => {
    const exportData = {
      system: 'Ruo University Equipment Management System (UEMS)',
      useCase: 'UC-12.1: Dynamic RBAC Matrix',
      exportedAt: new Date().toISOString(),
      roles: canonicalRoles.map(r => {
        const perms = [];
        permissionModules.forEach(mod => {
          mod.permissions.forEach(p => {
            if (matrixState[`${r.id}:${p.code}`]) {
              perms.push({ code: p.code, label: p.label, module: mod.name });
            }
          });
        });
        return {
          role: r.id,
          title: r.name,
          activeCount: perms.length,
          permissions: perms
        };
      })
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ruo_rbac_matrix_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Đã xuất ma trận phân quyền dạng JSON.');
    } else {
      let csv = 'Module,Mã Quyền,Nội Dung Nghiệp Vụ,Giảng Viên,Kỹ Thuật Viên,Quản Lý CSVC,Quản Trị BGH\n';
      permissionModules.forEach(mod => {
        mod.permissions.forEach(p => {
          const l = matrixState[`lecturer:${p.code}`] ? 'CÓ' : 'KHÔNG';
          const t = matrixState[`technician:${p.code}`] ? 'CÓ' : 'KHÔNG';
          const m = matrixState[`facility_manager:${p.code}`] ? 'CÓ' : 'KHÔNG';
          const a = matrixState[`admin:${p.code}`] ? 'CÓ' : 'KHÔNG';
          csv += `"${mod.name}","${p.code}","${p.label}","${l}","${t}","${m}","${a}"\n`;
        });
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ruo_rbac_matrix_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Đã xuất ma trận phân quyền dạng CSV.');
    }
  };

  // Filtered permission modules based on search and selectedModule
  const filteredModules = useMemo(() => {
    return permissionModules
      .filter(mod => selectedModule === 'ALL' || mod.id === selectedModule)
      .map(mod => {
        const matchingPermissions = mod.permissions.filter(p => {
          if (!searchTerm.trim()) return true;
          const query = searchTerm.toLowerCase();
          return p.code.toLowerCase().includes(query) || p.label.toLowerCase().includes(query);
        });
        return {
          ...mod,
          permissions: matchingPermissions
        };
      })
      .filter(mod => mod.permissions.length > 0);
  }, [selectedModule, searchTerm]);

  // Visible roles based on focusedRole
  const visibleRoles = useMemo(() => {
    if (focusedRole === 'ALL') return canonicalRoles;
    return canonicalRoles.filter(r => r.id === focusedRole);
  }, [focusedRole]);

  const totalPermissionsCount = permissionModules.reduce((acc, m) => acc + m.permissions.length, 0);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '70px 0', color: 'var(--ink-muted)' }}>
        <Icons.RefreshCw size={32} className="spin" style={{ marginBottom: '14px', color: 'var(--blueprint-500)' }} />
        <div style={{ fontSize: '15px', fontWeight: 600 }}>Đang nạp ma trận phân quyền từ MongoDB...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--blueprint-400)', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
              UC-12.1 DYNAMIC RBAC
            </span>
            <span style={{ fontSize: '12px', color: 'var(--ink-secondary)', fontWeight: 600 }}>
              4 CANONICAL ACTORS • 6 PHÂN HỆ NGHIỆP VỤ • KIỂM SOÁT PHÂN TÁCH TRÁCH NHIỆM (SoD)
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icons.Shield size={26} color="var(--blueprint-400)" />
            Ma Trận Phân Quyền Vai Trò (Roles Matrix)
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ink-secondary)' }}>
            Nguyên tắc bảo mật cốt lõi: <em>Người làm không tự phê duyệt việc của mình</em>. Cấu hình được ghi log vào Sổ cái kiểm toán SHA-256.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleResetDefaults}
            disabled={saving}
            className="ruo-btn ruo-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Khôi phục ma trận về chuẩn mực ban đầu"
          >
            <Icons.RefreshCw size={14} />
            <span>Khôi Phục Chuẩn SoD</span>
          </button>

          <button
            onClick={() => handleExport('csv')}
            className="ruo-btn ruo-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Tải tệp CSV phân quyền"
          >
            <Icons.Download size={14} />
            <span>Xuất CSV</span>
          </button>

          <button
            onClick={() => handleExport('json')}
            className="ruo-btn ruo-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Tải tệp JSON phân quyền"
          >
            <Icons.Download size={14} />
            <span>Xuất JSON</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="ruo-btn ruo-btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 700,
              padding: '10px 20px',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? <Icons.RefreshCw size={16} className="spin" /> : <Icons.CheckCircle size={16} />}
            <span>{saving ? 'Đang Lưu...' : 'Lưu Cấu Hình Quyền'}</span>
          </button>
        </div>
      </div>

      {/* Role Summary & Stat Cards (4 Canonical Roles) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        {canonicalRoles.map(r => {
          const activeCount = Object.keys(matrixState).filter(k => k.startsWith(`${r.id}:`) && matrixState[k]).length;
          const percentage = Math.round((activeCount / totalPermissionsCount) * 100);
          const isSelected = focusedRole === r.id;

          return (
            <div
              key={r.id}
              onClick={() => setFocusedRole(prev => prev === r.id ? 'ALL' : r.id)}
              style={{
                background: isSelected ? r.bg : 'var(--surface-card)',
                border: `1.5px solid ${isSelected ? r.color : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? `0 4px 20px ${r.color}25` : 'none'
              }}
              title={`Nhấn để ${isSelected ? 'xem toàn bộ ma trận' : `tập trung cấu hình cho [${r.name}]`}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: r.color }} />
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink-primary)' }}>{r.name}</span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: r.color,
                    background: r.bg,
                    border: `1px solid ${r.border}`,
                    padding: '2px 7px',
                    borderRadius: '6px'
                  }}
                >
                  {r.sub}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginBottom: '10px', lineHeight: 1.4, minHeight: '34px' }}>
                {r.desc}
              </div>

              {/* Progress bar of granted permissions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Quyền kích hoạt:</span>
                <span style={{ fontWeight: 800, color: r.color }}>
                  {activeCount} / {totalPermissionsCount} ({percentage}%)
                </span>
              </div>
              <div style={{ width: '100%', height: '5px', background: 'var(--surface-3)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${percentage}%`, height: '100%', background: r.color, borderRadius: '3px', transition: 'width 0.3s ease' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Separation of Duties (SoD) Active Violations Alert */}
      {activeSodViolations.length > 0 ? (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ marginTop: '2px', color: '#EF4444' }}>
              <Icons.AlertTriangle size={20} />
            </span>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#EF4444', marginBottom: '3px' }}>
                Phát hiện {activeSodViolations.length} Xung Đột Nguyên Tắc Phân Tách Trách Nhiệm (SoD Conflict)
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--ink-secondary)' }}>
                {activeSodViolations.map(v => (
                  <li key={v.id} style={{ marginBottom: '2px' }}>
                    <strong>{v.title}:</strong> {v.desc}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={handleFixAllSod}
            style={{
              background: '#EF4444',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Icons.Check size={14} />
            <span>Tự Động Khắc Phục SoD</span>
          </button>
        </div>
      ) : (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12.5px',
            color: '#10B981'
          }}
        >
          <Icons.CheckCircle size={16} />
          <span>
            <strong>Tuân thủ SoD hoàn hảo:</strong> Toàn bộ cấu hình quyền hiện tại đều thỏa mãn nguyên tắc phân tách trách nhiệm và đặc quyền tối thiểu.
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap',
          background: 'var(--surface-card)',
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)'
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)' }}>
            <Icons.Search size={15} />
          </span>
          <input
            type="text"
            placeholder="Tìm theo mã quyền (e.g. equipment:create) hoặc tên nghiệp vụ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ruo-input"
            style={{ paddingLeft: '36px', width: '100%' }}
          />
        </div>

        {/* Module Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--ink-secondary)', fontWeight: 600 }}>Phân hệ:</span>
          <select
            className="ruo-select"
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            style={{ width: '220px' }}
          >
            <option value="ALL">Tất cả 6 Phân Hệ</option>
            {permissionModules.map(m => (
              <option key={m.id} value={m.id}>{m.shortName}</option>
            ))}
          </select>
        </div>

        {/* Role Focus Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--ink-secondary)', fontWeight: 600 }}>Chế độ xem:</span>
          <select
            className="ruo-select"
            value={focusedRole}
            onChange={(e) => setFocusedRole(e.target.value)}
            style={{ width: '190px' }}
          >
            <option value="ALL">Toàn Bộ 4 Vai Trò</option>
            {canonicalRoles.map(r => (
              <option key={r.id} value={r.id}>{r.name} ({r.sub})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className="ruo-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ruo-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-header)', borderBottom: '1px solid var(--border-default)' }}>
                <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 800, color: 'var(--ink-muted)', width: '42%' }}>
                  NGHIỆP VỤ & MÃ QUYỀN HẠN (PERMISSION SCOPE)
                </th>
                {visibleRoles.map(r => (
                  <th
                    key={r.id}
                    style={{
                      padding: '14px 14px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      color: r.color,
                      textAlign: 'center',
                      width: `${58 / visibleRoles.length}%`
                    }}
                  >
                    <div>{r.name}</div>
                    <div style={{ fontSize: '10.5px', fontWeight: 600, opacity: 0.8 }}>({r.sub})</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredModules.length === 0 ? (
                <tr>
                  <td colSpan={visibleRoles.length + 1} style={{ padding: '48px', textAlign: 'center', color: 'var(--ink-muted)' }}>
                    <Icons.Shield size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <div>Không tìm thấy quyền hạn nào khớp với từ khóa tìm kiếm.</div>
                  </td>
                </tr>
              ) : (
                filteredModules.map(mod => (
                  <React.Fragment key={mod.id}>
                    {/* Module Header Bar */}
                    <tr style={{ background: 'var(--surface-header)', borderTop: '2px solid var(--border-default)', borderBottom: '1px solid var(--border-default)' }}>
                      <td colSpan={visibleRoles.length + 1} style={{ padding: '10px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontWeight: 800, color: 'var(--blueprint-400)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            {mod.name} ({mod.permissions.length} nghiệp vụ)
                          </span>

                          {/* Quick Module Controls if single role is focused */}
                          {focusedRole !== 'ALL' && (
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setModulePermissionsForRole(mod.permissions, focusedRole, true)}
                                style={{
                                  fontSize: '11px',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-default)',
                                  background: 'var(--surface-card)',
                                  color: 'var(--ink-primary)',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                Bật tất cả
                              </button>
                              <button
                                type="button"
                                onClick={() => setModulePermissionsForRole(mod.permissions, focusedRole, false)}
                                style={{
                                  fontSize: '11px',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-default)',
                                  background: 'var(--surface-card)',
                                  color: '#EF4444',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                Thu hồi tất cả
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Permissions Rows in Module */}
                    {mod.permissions.map(p => (
                      <tr
                        key={p.code}
                        style={{ borderBottom: '1px solid var(--border-default)', transition: 'background 0.15s ease' }}
                        className="ruo-table-row"
                      >
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--ink-primary)', fontSize: '13px' }}>
                            {p.label}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                            <code>{p.code}</code>
                          </div>
                        </td>

                        {visibleRoles.map(r => {
                          const isAllowed = Boolean(matrixState[`${r.id}:${p.code}`]);
                          return (
                            <td key={r.id} style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => togglePermission(r.id, p.code)}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  border: isAllowed ? `1.5px solid ${r.color}` : '1px solid var(--border-default)',
                                  background: isAllowed ? r.bg : 'transparent',
                                  color: isAllowed ? r.color : 'var(--ink-muted)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                                  boxShadow: isAllowed ? `0 2px 8px ${r.color}30` : 'none'
                                }}
                                title={`Nhấn để ${isAllowed ? 'thu hồi' : 'cấp'} quyền [${p.code}] cho vai trò [${r.name}]`}
                              >
                                {isAllowed ? (
                                  <Icons.Check size={16} strokeWidth={3} />
                                ) : (
                                  <Icons.X size={14} style={{ opacity: 0.35 }} />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance Note */}
      <div
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '12px',
          color: 'var(--ink-secondary)'
        }}
      >
        <Icons.Info size={16} color="var(--blueprint-400)" style={{ flexShrink: 0 }} />
        <div>
          <strong>Lưu ý nghiệp vụ kiểm toán:</strong> Mọi thao tác thay đổi phân quyền sau khi bấm <strong>"Lưu Cấu Hình Quyền"</strong> đều được hệ thống ghi nhận thành một bản ghi kiểm toán SHA-256 bất biến trong bảng <code>audit_logs</code> với hành động <code>BATCH_UPDATE_ROLE_PERMISSIONS</code>.
        </div>
      </div>
    </div>
  );
};

export default RBACMatrixPage;
