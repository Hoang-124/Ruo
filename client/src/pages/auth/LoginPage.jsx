import React, { useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useAuth } from '../../context/AuthContext';
import { ForgotPasswordModal } from '../../components/ui/ForgotPasswordModal';
import { Building3DCanvas } from '../../components/common/Building3DCanvas';

export const LoginPage = ({ onLoginSuccess }) => {
  const { login, register } = useAuth();

  // Mode: 'login' or 'register'
  const [authMode, setAuthMode] = useState('login');

  // Login form state
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

  // Handle standard login submit (UC-1.1)
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
      setErrorMsg(res.message || 'Thông tin đăng nhập hoặc mật khẩu không chính xác.');
    }
  };

  // Handle new account registration submit
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation
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
      setErrorMsg('Vui lòng đồng ý với Quy chế sử dụng cơ sở vật chất của Nhà trường để tiếp tục.');
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
      }, 1200);
    } else {
      setErrorMsg(res.message || 'Đăng ký tài khoản không thành công. Vui lòng thử lại.');
    }
  };

  return (
    <div className="ruo-login-container">
      {/* ====================================================================
          LEFT 58%: INTERACTIVE 3D ARCHITECTURAL MODEL (TÒA NHÀ A1)
          ==================================================================== */}
      <div className="ruo-login-hero">
        {/* Brand Header Bar over 3D Canvas */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '24px 36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
            background: 'linear-gradient(180deg, rgba(4, 7, 17, 0.9) 0%, rgba(4, 7, 17, 0) 100%)',
            pointerEvents: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', pointerEvents: 'auto' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)',
                color: '#FFFFFF'
              }}
            >
              <Icons.Building size={22} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '22px',
                    fontWeight: 900,
                    letterSpacing: '-0.03em',
                    color: '#FFFFFF'
                  }}
                >
                  RUO
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'JetBrains Mono, monospace',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#60A5FA',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    fontWeight: 700
                  }}
                >
                  UFMS V2.6
                </span>
              </div>
              <span
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: '#94A3B8',
                  letterSpacing: '0.06em',
                  fontWeight: 600
                }}
              >
                HỆ THỐNG QUẢN LÝ CƠ SỞ VẬT CHẤT ĐẠI HỌC
              </span>
            </div>
          </div>
        </div>

        {/* 3D Architectural Canvas Viewport */}
        <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
          <Building3DCanvas />
        </div>
      </div>

      {/* ====================================================================
          RIGHT 42%: AUTHENTICATION TERMINAL (LOGIN / REGISTER)
          ==================================================================== */}
      <div className="ruo-login-terminal">
        {/* Subtle Ambient Glow Behind Card */}
        <div
          style={{
            position: 'absolute',
            width: '380px',
            height: '380px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, rgba(0,0,0,0) 70%)',
            top: '20%',
            right: '15%',
            pointerEvents: 'none'
          }}
        />

        {/* Auth Command Card */}
        <div
          style={{
            width: '100%',
            maxWidth: '480px',
            padding: '36px 36px',
            borderRadius: '20px',
            background: 'rgba(11, 15, 25, 0.88)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            position: 'relative',
            zIndex: 2,
            maxHeight: '92vh',
            overflowY: 'auto'
          }}
        >
          {/* Segmented Mode Switcher: Đăng Nhập / Đăng Ký */}
          <div
            style={{
              display: 'flex',
              background: '#070A12',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '24px'
            }}
          >
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              style={{
                flex: 1,
                padding: '9px 16px',
                borderRadius: '8px',
                border: 'none',
                background: authMode === 'login' ? '#2563EB' : 'transparent',
                color: authMode === 'login' ? '#FFFFFF' : '#94A3B8',
                fontWeight: authMode === 'login' ? 700 : 500,
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Icons.Lock size={15} color={authMode === 'login' ? '#FFFFFF' : '#94A3B8'} />
              <span>Đăng Nhập</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              style={{
                flex: 1,
                padding: '9px 16px',
                borderRadius: '8px',
                border: 'none',
                background: authMode === 'register' ? '#2563EB' : 'transparent',
                color: authMode === 'register' ? '#FFFFFF' : '#94A3B8',
                fontWeight: authMode === 'register' ? 700 : 500,
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Icons.User size={15} color={authMode === 'register' ? '#FFFFFF' : '#94A3B8'} />
              <span>Đăng Ký Tài Khoản</span>
            </button>
          </div>

          {/* Card Header */}
          <div style={{ marginBottom: '22px' }}>
            <h2
              style={{
                fontSize: '23px',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                margin: 0
              }}
            >
              {authMode === 'login' ? 'Đăng nhập tài khoản' : 'Đăng ký tài khoản mới'}
            </h2>
            <p
              style={{
                fontSize: '13px',
                color: '#94A3B8',
                marginTop: '6px',
                lineHeight: 1.5
              }}
            >
              {authMode === 'login'
                ? 'Cổng dịch vụ quản trị cơ sở vật chất dành cho Cán bộ & Sinh viên'
                : 'Đăng ký định danh học vụ để tra cứu, sử dụng và đặt phòng cơ sở vật chất'}
            </p>
          </div>

          {/* Success Banner */}
          {successMsg && (
            <div
              style={{
                marginBottom: '18px',
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34D399',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <Icons.CheckCircle size={18} color="#10B981" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div
              style={{
                marginBottom: '18px',
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#F87171',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <Icons.Shield size={18} color="#EF4444" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ================================================================
              TAB 1: LOGIN FORM
              ================================================================ */}
          {authMode === 'login' ? (
            <form onSubmit={handleLogin}>
              {/* Input 1: Identifier */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#CBD5E1',
                    marginBottom: '8px'
                  }}
                >
                  Email trường hoặc MSSV / Mã cán bộ
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '12px',
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Icons.Mail size={18} />
                  </span>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="hoang.tb220412@university.edu.vn hoặc SV20220412"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      background: '#070A12',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      fontSize: '13.5px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3B82F6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Input 2: Password */}
              <div style={{ marginBottom: '18px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#CBD5E1',
                    marginBottom: '8px'
                  }}
                >
                  Mật khẩu
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '12px',
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Icons.Lock size={18} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 42px 12px 42px',
                      background: '#070A12',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      fontSize: '13.5px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3B82F6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '12px',
                      color: '#64748B',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '22px',
                  fontSize: '13px'
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    color: '#94A3B8'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: '#2563EB',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  />
                  <span>Ghi nhớ phiên làm việc</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#60A5FA',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Quên mật khẩu?
                </button>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(96, 165, 250, 0.35)',
                  boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  opacity: loading ? 0.75 : 1
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.55)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(37, 99, 235, 0.4)';
                }}
              >
                <span>{loading ? 'Đang xác thực bảo mật...' : 'Đăng Nhập Vào Hệ Thống'}</span>
                <Icons.ArrowRight size={18} />
              </button>

              {/* Switch to Register link */}
              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#94A3B8' }}>
                <span>Chưa có tài khoản định danh? </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#60A5FA',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Đăng ký ngay
                </button>
              </div>
            </form>
          ) : (
            /* ================================================================
               TAB 2: REGISTRATION FORM
               ================================================================ */
            <form onSubmit={handleRegister}>
              {/* Row 1: Full Name */}
              <div style={{ marginBottom: '14px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#CBD5E1',
                    marginBottom: '6px'
                  }}
                >
                  Họ và tên đầy đủ *
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '11px',
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Icons.User size={16} />
                  </span>
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      background: '#070A12',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Grid of Email & MSSV/Mã CB */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#CBD5E1',
                      marginBottom: '6px'
                    }}
                  >
                    Email trường *
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="an.nv@university.edu.vn"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#070A12',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#CBD5E1',
                      marginBottom: '6px'
                    }}
                  >
                    MSSV / Mã Cán Bộ *
                  </label>
                  <input
                    type="text"
                    value={regEmployeeCode}
                    onChange={(e) => setRegEmployeeCode(e.target.value)}
                    placeholder="SV20240123"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#070A12',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Row 3: Role Selector & Department */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#CBD5E1',
                      marginBottom: '6px'
                    }}
                  >
                    Vai trò định danh
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      background: '#070A12',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '3px'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setRegRole('student')}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: regRole === 'student' ? '#2563EB' : 'transparent',
                        color: regRole === 'student' ? '#FFFFFF' : '#94A3B8',
                        fontSize: '12px',
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
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: regRole === 'lecturer' ? '#2563EB' : 'transparent',
                        color: regRole === 'lecturer' ? '#FFFFFF' : '#94A3B8',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Giảng Viên
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#CBD5E1',
                      marginBottom: '6px'
                    }}
                  >
                    Khoa / Viện đào tạo
                  </label>
                  <select
                    value={regDepartment}
                    onChange={(e) => setRegDepartment(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 10px',
                      background: '#070A12',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '12.5px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box',
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

              {/* Row 4: Password & Confirm Password */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#CBD5E1',
                      marginBottom: '6px'
                    }}
                  >
                    Mật khẩu *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={regShowPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Ít nhất 8 ký tự"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 34px 10px 12px',
                        background: '#070A12',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setRegShowPassword(!regShowPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '10px',
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {regShowPassword ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#CBD5E1',
                      marginBottom: '6px'
                    }}
                  >
                    Xác nhận mật khẩu *
                  </label>
                  <input
                    type={regShowPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#070A12',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Agreement Checkbox */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    color: '#94A3B8',
                    lineHeight: 1.45
                  }}
                >
                  <input
                    type="checkbox"
                    checked={regAgreed}
                    onChange={(e) => setRegAgreed(e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: '#2563EB',
                      borderRadius: '4px',
                      marginTop: '2px',
                      cursor: 'pointer'
                    }}
                  />
                  <span>
                    Tôi cam kết tuân thủ đúng <strong style={{ color: '#E2E8F0' }}>Quy chế sử dụng cơ sở vật chất</strong> và bảo toàn thiết bị phòng học của Nhà trường.
                  </span>
                </label>
              </div>

              {/* Submit Register Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(96, 165, 250, 0.35)',
                  boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: loading ? 0.75 : 1
                }}
              >
                <span>{loading ? 'Đang tạo tài khoản...' : 'Hoàn Tất Đăng Ký Tài Khoản'}</span>
                <Icons.ArrowRight size={18} />
              </button>

              {/* Switch to Login link */}
              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#94A3B8' }}>
                <span>Đã có tài khoản? </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#60A5FA',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Đăng nhập ngay
                </button>
              </div>
            </form>
          )}

          {/* Institutional Trust Stamp */}
          <div
            style={{
              marginTop: '24px',
              paddingTop: '18px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: '#64748B',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace'
            }}
          >
            <Icons.Lock size={12} color="#64748B" />
            <span>Hệ thống xác thực tập trung & bảo mật phiên làm việc</span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal (UC-1.3) */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        defaultEmail={identifier.includes('@') ? identifier : 'hoang.tb220412@university.edu.vn'}
        onSuccessLogin={(resetEmail) => {
          setIdentifier(resetEmail);
          setIsForgotPasswordOpen(false);
          setAuthMode('login');
        }}
      />
    </div>
  );
};
