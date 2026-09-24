import React, { useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useAuth } from '../../context/AuthContext';
import { ForgotPasswordModal } from '../../components/ui/ForgotPasswordModal';
import { Building2DIso } from '../../components/common/Building2DIso';
import { RuoLogo } from '../../components/common/RuoLogo';
import { USERS } from '../../mock/mockData';

export const LoginPage = ({ onLoginSuccess }) => {
  const { login, register, theme, toggleTheme } = useAuth();

  // Mode: 'login' | 'register' | 'demo'
  const [activeTab, setActiveTab] = useState('login');
  const [selectedFloor, setSelectedFloor] = useState(null);

  // Standard Login form state
  const [identifier, setIdentifier] = useState('hoang.tb220412@university.edu.vn');
  const [password, setPassword] = useState('Ruo@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regEmployeeCode, setRegEmployeeCode] = useState('');
  const [regRole, setRegRole] = useState('student');
  const [regDepartment, setRegDepartment] = useState('Khoa Công nghệ Thông tin');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regAgreed, setRegAgreed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // 6 Demo Roles metadata for 1-Click quick test login
  const DEMO_ROLES = [
    {
      key: 'lecturer',
      title: 'Giảng Viên',
      name: 'TS. Nguyễn Văn Nam',
      code: 'CB198402',
      email: USERS.lecturer?.email || 'nam.nv@university.edu.vn',
      dept: 'Khoa Kỹ Thuật Máy Tính',
      badgeColor: '#6366F1',
      desc: 'Đăng ký phòng giảng dạy, mượn thiết bị Lab, báo sự cố lớp học.'
    },
    {
      key: 'student',
      title: 'Sinh Viên',
      name: 'Trần Bảo Hoàng',
      code: 'SV20220412',
      email: USERS.student?.email || 'hoang.tb220412@university.edu.vn',
      dept: 'Viện CNTT & Truyền Thông',
      badgeColor: '#3B82F6',
      desc: 'Tra cứu 108 phòng học, xem lịch biểu, đặt phòng tự học/học nhóm.'
    },
    {
      key: 'facility_staff',
      title: 'Quản Lý CSVC',
      name: 'Lê Thị Mai',
      code: 'NV201901',
      email: USERS.facility_staff?.email || 'mai.lt@university.edu.vn',
      dept: 'Phòng Cơ Sở Vật Chất',
      badgeColor: '#0EA5E9',
      desc: 'Duyệt đơn mượn phòng, kiểm kê kho thiết bị QR, lập hội đồng thanh lý.'
    },
    {
      key: 'maintenance',
      title: 'Kỹ Thuật Viên',
      name: 'Phạm Văn Hùng',
      code: 'KT201805',
      email: USERS.maintenance?.email || 'hung.pv@university.edu.vn',
      dept: 'Tổ Kỹ Thuật & Sửa Chữa',
      badgeColor: '#F59E0B',
      desc: 'Tiếp nhận ticket sự cố, đồng hồ đếm ngược SLA, sửa chữa thiết bị.'
    },
    {
      key: 'academic_affairs',
      title: 'Phòng Đào Tạo',
      name: 'Hoàng Quốc Dũng',
      code: 'DT201509',
      email: USERS.academic_affairs?.email || 'dung.hq@university.edu.vn',
      dept: 'Phòng Quản Lý Đào Tạo',
      badgeColor: '#10B981',
      desc: 'Xếp thời khóa biểu tự động toàn trường bằng giải thuật CSP.'
    },
    {
      key: 'admin',
      title: 'Quản Trị Viên (Admin)',
      name: 'Ban Quản Trị Hệ Thống',
      code: 'AD000001',
      email: USERS.admin?.email || 'admin@university.edu.vn',
      dept: 'Trung Tâm CNTT & Viễn Thông',
      badgeColor: '#EF4444',
      desc: 'Toàn quyền điều hành, phân quyền 7 nhóm qua RBAC, Audit Log SHA-256.'
    }
  ];

  // Standard login submit
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const res = await login(identifier, password);
    setLoading(false);

    if (res.success) {
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } else {
      setErrorMsg(res.message || 'Thông tin tài khoản hoặc mật khẩu không chính xác.');
    }
  };

  // 1-Click quick login from demo role card
  const handleQuickLogin = async (roleKey) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const mockUser = USERS[roleKey];
    if (mockUser) {
      const res = await login(mockUser.email, 'Ruo@2026');
      setLoading(false);
      if (res.success) {
        setSuccessMsg(`Đăng nhập thành công với vai trò ${mockUser.roleTitle}!`);
        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess();
          }
        }, 400);
      } else {
        setErrorMsg(res.message || 'Không thể đăng nhập tài khoản mẫu.');
      }
    }
  };

  // New account registration submit
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!regFullName.trim() || !regEmail.trim() || !regEmployeeCode.trim() || !regPassword) {
      setErrorMsg('Vui lòng điền đầy đủ tất cả các trường thông tin bắt buộc.');
      return;
    }

    if (regPassword.length < 8) {
      setErrorMsg('Mật khẩu bảo mật phải có độ dài tối thiểu 8 ký tự.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp. Vui lòng kiểm tra lại.');
      return;
    }

    if (!regAgreed) {
      setErrorMsg('Vui lòng đồng ý với Quy chế sử dụng cơ sở vật chất của Nhà trường.');
      return;
    }

    setLoading(true);

    const res = await register({
      fullName: regFullName.trim(),
      email: regEmail.trim(),
      employeeCode: regEmployeeCode.trim().toUpperCase(),
      password: regPassword,
      role: regRole,
      departmentName: regDepartment
    });

    setLoading(false);

    if (res.success) {
      setSuccessMsg(res.message || 'Đăng ký tài khoản thành công! Đang chuyển hướng...');
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      }, 1000);
    } else {
      setErrorMsg(res.message || 'Đăng ký tài khoản không thành công. Vui lòng thử lại.');
    }
  };

  return (
    <div className="ruo-split-auth-viewport">
      {/* ====================================================================
          BÊN TRÁI (LEFT): TÒA NHÀ KIẾN TRÚC 2D & LOGO RUO
          ==================================================================== */}
      <div className="ruo-split-auth-left">
        {/* Top Header of Left Column: Bespoke Logo & Campus Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <RuoLogo size={44} subtitle="HỆ THỐNG QUẢN LÝ CSVC" />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: '#2563EB',
              background: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              padding: '4px 10px',
              borderRadius: '8px',
              letterSpacing: '0.04em'
            }}
          >
            TÒA NHÀ A1 • TRUNG TÂM
          </span>
        </div>

        {/* Center: 2D Isometric Building Model */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', minHeight: 0 }}>
          <Building2DIso
            activeFloor={selectedFloor}
            onSelectFloor={(floor) => setSelectedFloor(floor === selectedFloor ? null : floor)}
          />
        </div>
      </div>

      {/* ====================================================================
          BÊN PHẢI (RIGHT): KHUNG ĐĂNG NHẬP / ĐĂNG KÝ / TÀI KHOẢN MẪU
          ==================================================================== */}
      <div className="ruo-split-auth-right">
        {/* Top Header of Right Column: Hotline & Theme Switch */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--ink-muted)', marginRight: '6px' }}>Hotline kỹ thuật:</span>
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--ink-pure)', fontFamily: 'var(--font-mono)' }}>1900 6868</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              padding: '7px 11px',
              borderRadius: '8px',
              background: 'var(--surface-panel)',
              border: '1px solid var(--hairline-medium)',
              color: 'var(--ink-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
            title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          >
            {theme === 'dark' ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                </svg>
                <span>Sáng</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
                <span>Tối</span>
              </>
            )}
          </button>
        </div>

        {/* Center: The Auth Form Card */}
        <div className="ruo-auth-card-centered">
          {/* Segmented Mode Switcher */}
          <div
            style={{
              display: 'flex',
              background: 'var(--canvas-subtle)',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid var(--hairline-soft)',
              marginBottom: '20px'
            }}
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              style={{
                flex: 1,
                padding: '9px 8px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'login' ? '#2563EB' : 'transparent',
                color: activeTab === 'login' ? '#FFFFFF' : 'var(--ink-muted)',
                fontWeight: activeTab === 'login' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Icons.Lock size={14} />
              <span>Đăng Nhập</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              style={{
                flex: 1,
                padding: '9px 8px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'register' ? '#2563EB' : 'transparent',
                color: activeTab === 'register' ? '#FFFFFF' : 'var(--ink-muted)',
                fontWeight: activeTab === 'register' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Icons.User size={14} />
              <span>Đăng Ký</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('demo');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              style={{
                flex: 1.15,
                padding: '9px 8px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'demo' ? '#2563EB' : 'transparent',
                color: activeTab === 'demo' ? '#FFFFFF' : 'var(--ink-muted)',
                fontWeight: activeTab === 'demo' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Icons.Users size={14} />
              <span>Tài Khoản Mẫu</span>
            </button>
          </div>

          {/* Feedback Messages */}
          {successMsg && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10B981',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Icons.CheckCircle size={16} color="#10B981" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#EF4444',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Icons.Shield size={16} color="#EF4444" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ==============================================================
              TAB 1: ĐĂNG NHẬP
              ============================================================== */}
          {activeTab === 'login' && (
            <div>
              <div style={{ marginBottom: '18px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink-pure)', margin: '0 0 4px 0' }}>
                  Đăng Nhập Tài Khoản
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--ink-muted)', margin: 0 }}>
                  Cổng dịch vụ quản trị cơ sở vật chất dành cho Giảng viên & Sinh viên
                </p>
              </div>

              <form onSubmit={handleLogin}>
                {/* Field 1: Email or MSSV */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '6px' }}>
                    Email trường hoặc Mã số (MSSV / Mã Cán bộ)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center' }}>
                      <Icons.Mail size={16} />
                    </span>
                    <input
                      type="text"
                      className="ruo-portal-input"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="hoang.tb220412@university.edu.vn hoặc SV20220412"
                      required
                    />
                  </div>
                </div>

                {/* Field 2: Password */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '6px' }}>
                    Mật khẩu
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center' }}>
                      <Icons.Lock size={16} />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="ruo-portal-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '14px',
                        top: '12px',
                        color: 'var(--ink-muted)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember & Forgot Password */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', fontSize: '12.5px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--ink-muted)' }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ width: '15px', height: '15px', accentColor: '#2563EB', cursor: 'pointer' }}
                    />
                    <span>Ghi nhớ đăng nhập</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    style={{ background: 'none', border: 'none', padding: 0, color: '#2563EB', fontWeight: 600, cursor: 'pointer', fontSize: '12.5px' }}
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                {/* Submit Button */}
                <button type="submit" disabled={loading} className="ruo-portal-btn-primary">
                  <span>{loading ? 'Đang xác thực bảo mật...' : 'Đăng Nhập Vào Hệ Thống'}</span>
                  <Icons.ArrowRight size={16} />
                </button>
              </form>
            </div>
          )}

          {/* ==============================================================
              TAB 2: ĐĂNG KÝ TÀI KHOẢN MỚI
              ============================================================== */}
          {activeTab === 'register' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--ink-pure)', margin: '0 0 4px 0' }}>
                  Đăng Ký Tài Khoản Mới
                </h2>
                <p style={{ fontSize: '12.5px', color: 'var(--ink-muted)', margin: 0 }}>
                  Tạo tài khoản định danh để tra cứu và đặt phòng cơ sở vật chất
                </p>
              </div>

              <form onSubmit={handleRegister}>
                <div style={{ marginBottom: '11px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '5px' }}>
                    Họ và tên đầy đủ *
                  </label>
                  <input
                    type="text"
                    className="ruo-portal-input"
                    style={{ paddingLeft: '12px' }}
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '11px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '5px' }}>
                      Email trường *
                    </label>
                    <input
                      type="email"
                      className="ruo-portal-input"
                      style={{ paddingLeft: '10px' }}
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="an.nv@university.edu.vn"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '5px' }}>
                      MSSV / Mã Cán Bộ *
                    </label>
                    <input
                      type="text"
                      className="ruo-portal-input"
                      style={{ paddingLeft: '10px' }}
                      value={regEmployeeCode}
                      onChange={(e) => setRegEmployeeCode(e.target.value)}
                      placeholder="SV20240123"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '11px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '5px' }}>
                      Vai trò *
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setRegRole('student')}
                        style={{
                          flex: 1,
                          padding: '7px 4px',
                          borderRadius: '6px',
                          border: 'none',
                          background: regRole === 'student' ? '#2563EB' : 'var(--canvas-subtle)',
                          color: regRole === 'student' ? '#FFFFFF' : 'var(--ink-muted)',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Sinh Viên
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegRole('lecturer')}
                        style={{
                          flex: 1,
                          padding: '7px 4px',
                          borderRadius: '6px',
                          border: 'none',
                          background: regRole === 'lecturer' ? '#2563EB' : 'var(--canvas-subtle)',
                          color: regRole === 'lecturer' ? '#FFFFFF' : 'var(--ink-muted)',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Giảng Viên
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '5px' }}>
                      Khoa / Viện
                    </label>
                    <select
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px',
                        background: 'var(--canvas-subtle)',
                        border: '1px solid var(--hairline-medium)',
                        borderRadius: '6px',
                        color: 'var(--ink-pure)',
                        fontSize: '11.5px',
                        fontFamily: 'inherit',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Khoa Công nghệ Thông tin">Khoa CNTT</option>
                      <option value="Khoa Điện tử - Viễn thông">Khoa Điện tử</option>
                      <option value="Viện Kinh tế & Quản lý">Viện Kinh tế</option>
                      <option value="Khoa Cơ khí & Kỹ thuật">Khoa Cơ khí</option>
                      <option value="Khoa Ngoại ngữ & Sư phạm">Khoa Ngoại ngữ</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '5px' }}>
                      Mật khẩu *
                    </label>
                    <input
                      type={regShowPassword ? 'text' : 'password'}
                      className="ruo-portal-input"
                      style={{ paddingLeft: '10px' }}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Ít nhất 8 ký tự"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '5px' }}>
                      Xác nhận lại *
                    </label>
                    <input
                      type={regShowPassword ? 'text' : 'password'}
                      className="ruo-portal-input"
                      style={{ paddingLeft: '10px' }}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '11.5px', color: 'var(--ink-muted)', lineHeight: 1.4 }}>
                    <input
                      type="checkbox"
                      checked={regAgreed}
                      onChange={(e) => setRegAgreed(e.target.checked)}
                      style={{ width: '14px', height: '14px', accentColor: '#2563EB', marginTop: '2px', cursor: 'pointer' }}
                    />
                    <span>Tôi cam kết tuân thủ Quy chế sử dụng cơ sở vật chất của Nhà trường.</span>
                  </label>
                </div>

                <button type="submit" disabled={loading} className="ruo-portal-btn-primary">
                  <span>{loading ? 'Đang tạo tài khoản...' : 'Hoàn Tất Đăng Ký'}</span>
                  <Icons.ArrowRight size={16} />
                </button>
              </form>
            </div>
          )}

          {/* ==============================================================
              TAB 3: TÀI KHOẢN MẪU (1-CLICK TEST LOGIN)
              ============================================================== */}
          {activeTab === 'demo' && (
            <div>
              <div style={{ marginBottom: '14px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink-pure)', margin: '0 0 4px 0' }}>
                  Tài Khoản Mẫu Trải Nghiệm Nhanh
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--ink-muted)', margin: 0 }}>
                  Chọn 1 trong 6 vai trò bên dưới để vào hệ thống ngay mà không cần gõ mật khẩu:
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', maxHeight: '410px', overflowY: 'auto', paddingRight: '4px' }}>
                {DEMO_ROLES.map((role) => (
                  <div
                    key={role.key}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: 'var(--canvas-subtle)',
                      border: '1px solid var(--hairline-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: `${role.badgeColor}18`,
                            color: role.badgeColor,
                            border: `1px solid ${role.badgeColor}35`
                          }}
                        >
                          {role.title}
                        </span>
                        <strong style={{ fontSize: '13px', color: 'var(--ink-pure)' }}>{role.name}</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                        {role.dept} • {role.desc}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickLogin(role.key)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '7px',
                        background: role.badgeColor,
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        flexShrink: 0
                      }}
                    >
                      <span>Vào ngay</span>
                      <Icons.ArrowRight size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '14px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  ← Quay lại form đăng nhập thông thường
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        defaultEmail={identifier.includes('@') ? identifier : 'hoang.tb220412@university.edu.vn'}
        onSuccessLogin={(resetEmail) => {
          setIdentifier(resetEmail);
          setIsForgotPasswordOpen(false);
          setActiveTab('login');
        }}
      />
    </div>
  );
};
