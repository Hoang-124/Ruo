import React, { useState, useMemo } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ForgotPasswordModal } from '../../components/ui/ForgotPasswordModal';
import { Building2DIso } from '../../components/common/Building2DIso';
import { RuoLogo } from '../../components/common/RuoLogo';

export const LoginPage = ({ onLoginSuccess }) => {
  const { login, register, theme, toggleTheme } = useAuth();
  const { toast } = useToast();

  // Mode: 'login' | 'register'
  const [activeTab, setActiveTab] = useState('login');
  const [selectedFloor, setSelectedFloor] = useState(null);

  // Standard Login form state - Strictly live credentials
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Security & Lockout State (UC-1.1 DoD: 15-minute temporary lockout on 5 failed attempts)
  const [lockoutData, setLockoutData] = useState(null);
  const [attemptsLeft, setAttemptsLeft] = useState(null);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regEmployeeCode, setRegEmployeeCode] = useState('');
  const [regRole, setRegRole] = useState('student');
  const [regDepartment, setRegDepartment] = useState('Khoa Công nghệ Thông tin');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regShowConfirmPassword, setRegShowConfirmPassword] = useState(false);
  const [regAgreed, setRegAgreed] = useState(false);

  // Validation & Touched Tracking
  const [regErrors, setRegErrors] = useState({});
  const [regTouched, setRegTouched] = useState({});

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Registration password policy checklist
  const regPasswordCriteria = useMemo(() => {
    return {
      minLength: regPassword.length >= 8,
      hasUpper: /[A-Z]/.test(regPassword),
      hasLower: /[a-z]/.test(regPassword),
      hasNumber: /\d/.test(regPassword),
      hasSpecial: /[^a-zA-Z\d\s]/.test(regPassword),
      isMatching: regPassword.length > 0 && regPassword === regConfirmPassword
    };
  }, [regPassword, regConfirmPassword]);

  const isRegPasswordValid = Object.values(regPasswordCriteria).every(Boolean);

  // Individual field validator
  const validateRegField = (name, value, allValues = {}) => {
    switch (name) {
      case 'fullName': {
        const val = String(value || '').trim();
        if (!val) return 'Họ và tên là bắt buộc.';
        if (val.length < 2) return 'Họ và tên phải có tối thiểu 2 ký tự.';
        if (!/[a-zA-ZÀ-ỹ]/.test(val)) return 'Họ và tên phải chứa các chữ cái hợp lệ (không chỉ là số).';
        return '';
      }
      case 'email': {
        const val = String(value || '').trim();
        if (!val) return 'Email trường là bắt buộc.';
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(val)) return 'Email không đúng định dạng (ví dụ: hoang.tb@university.edu.vn).';
        return '';
      }
      case 'employeeCode': {
        const val = String(value || '').trim();
        if (!val) return 'Mã số sinh viên/cán bộ là bắt buộc.';
        if (val.length < 3) return 'Mã số phải có từ 3 đến 15 ký tự (ví dụ: SV20240123 hoặc CB198402).';
        if (!/^[a-zA-Z0-9]+$/.test(val)) return 'Mã số chỉ gồm chữ cái và số, không chứa dấu cách.';
        return '';
      }
      case 'password': {
        const val = String(value || '');
        if (!val) return 'Mật khẩu là bắt buộc.';
        if (val.length < 8) return 'Mật khẩu phải có tối thiểu 8 ký tự.';
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s])/.test(val)) {
          return 'Mật khẩu cần gồm chữ hoa, chữ thường, số và ký tự đặc biệt.';
        }
        return '';
      }
      case 'confirmPassword': {
        const val = String(value || '');
        const targetPass = allValues.password !== undefined ? allValues.password : regPassword;
        if (!val) return 'Vui lòng nhập lại mật khẩu xác nhận.';
        if (val !== targetPass) return 'Mật khẩu xác nhận không trùng khớp.';
        return '';
      }
      case 'agreed': {
        if (!value) return 'Vui lòng đồng ý với Quy chế sử dụng CSVC của Nhà trường.';
        return '';
      }
      default:
        return '';
    }
  };

  const handleFieldChange = (field, value) => {
    if (regTouched[field]) {
      const err = validateRegField(field, value, {
        password: field === 'password' ? value : regPassword,
        confirmPassword: field === 'confirmPassword' ? value : regConfirmPassword
      });
      setRegErrors(prev => ({ ...prev, [field]: err }));
    }
  };

  const handleFieldBlur = (field, value) => {
    setRegTouched(prev => ({ ...prev, [field]: true }));
    const err = validateRegField(field, value, {
      password: field === 'password' ? value : regPassword,
      confirmPassword: field === 'confirmPassword' ? value : regConfirmPassword
    });
    setRegErrors(prev => ({ ...prev, [field]: err }));
  };

  // Standard login submit against real backend API
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ mã sinh viên/cán bộ hoặc email cùng mật khẩu.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      setLoading(true);
      const res = await login(identifier.trim(), password);

      if (res.success) {
        setLockoutData(null);
        setAttemptsLeft(null);
        setSuccessMsg('Đăng nhập thành công! Đang chuyển hướng vào hệ thống...');
        toast.success(`Chào mừng ${res.user.fullName || 'bạn'} trở lại hệ thống Ruo CSVC!`, 'Đăng Nhập Thành Công');
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        setErrorMsg(res.message || 'Thông tin tài khoản hoặc mật khẩu không chính xác.');
        if (res.isLocked) {
          setLockoutData({
            isLocked: true,
            remainingMinutes: res.remainingMinutes || 15
          });
          setAttemptsLeft(0);
          toast.error(res.message, 'Tài Khoản Tạm Khóa');
        } else {
          setLockoutData(null);
          if (res.attemptsLeft !== undefined) {
            setAttemptsLeft(res.attemptsLeft);
          }
          toast.error(res.message || 'Đăng nhập không thành công.', 'Đăng Nhập Thất Bại');
        }
      }
    } catch (err) {
      setErrorMsg('Lỗi kết nối máy chủ: ' + err.message);
      toast.error('Không thể kết nối đến máy chủ Backend.', 'Lỗi Kết Nối');
    } finally {
      setLoading(false);
    }
  };

  // New account registration submit
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Touch all fields to show any missing requirements
    const touchedAll = {
      fullName: true,
      email: true,
      employeeCode: true,
      password: true,
      confirmPassword: true,
      agreed: true
    };
    setRegTouched(touchedAll);

    // Validate all fields
    const errors = {
      fullName: validateRegField('fullName', regFullName),
      email: validateRegField('email', regEmail),
      employeeCode: validateRegField('employeeCode', regEmployeeCode),
      password: validateRegField('password', regPassword),
      confirmPassword: validateRegField('confirmPassword', regConfirmPassword, { password: regPassword }),
      agreed: validateRegField('agreed', regAgreed)
    };
    setRegErrors(errors);

    const firstError = Object.values(errors).find(Boolean);
    if (firstError) {
      setErrorMsg(firstError);
      toast.error(firstError, 'Dữ Liệu Chưa Hợp Lệ');
      return;
    }

    try {
      setLoading(true);

      const res = await register({
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        employeeCode: regEmployeeCode.trim().toUpperCase(),
        password: regPassword,
        role: regRole,
        departmentName: regDepartment
      });

      if (res && res.success) {
        setSuccessMsg(res.message || 'Đăng ký tài khoản thành công! Đang chuyển hướng...');
        toast.success(res.message || `Đăng ký thành công! Chào mừng ${regFullName.trim()}`, 'Đăng Ký Thành Công');
        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess();
          }
        }, 600);
      } else {
        const msg = res?.message || 'Đăng ký tài khoản không thành công. Vui lòng thử lại.';
        setErrorMsg(msg);
        toast.error(msg, 'Đăng Ký Thất Bại');
      }
    } catch (err) {
      const msg = 'Lỗi kết nối máy chủ: ' + err.message;
      setErrorMsg(msg);
      toast.error(msg, 'Lỗi Hệ Thống');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ruo-split-auth-viewport ruo-view-enter">
      {/* ====================================================================
          BÊN TRÁI (LEFT): TÒA NHÀ KIẾN TRÚC 2D & LOGO RUO
          ==================================================================== */}
      <div className="ruo-split-auth-left">
        {/* Top Header of Left Column: Bespoke Logo */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <RuoLogo size={44} subtitle="HỆ THỐNG QUẢN LÝ CSVC" />
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
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--ink-pure)', fontFamily: 'var(--font-sans)' }}>1900 6868</span>
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

              {/* UC-1.1 Brute-Force Lockout Banner (15-Minute Temporary Lock) */}
              {lockoutData?.isLocked && (
                <div
                  style={{
                    marginBottom: '16px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#EF4444', marginBottom: '3px' }}>
                      Tài Khoản Đang Bị Khóa Tạm Thời (15 Phút)
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
                      Hệ thống phát hiện 5 lần nhập sai mật khẩu liên tiếp. Vui lòng chờ <strong>{lockoutData.remainingMinutes} phút</strong> để thử lại, hoặc liên hệ Bộ phận Kỹ thuật CSVC.
                    </div>
                  </div>
                </div>
              )}

              {/* Warning: Attempts remaining before lockout */}
              {!lockoutData?.isLocked && attemptsLeft !== null && attemptsLeft > 0 && attemptsLeft < 5 && (
                <div
                  style={{
                    marginBottom: '16px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#F59E0B'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div style={{ fontSize: '12.5px', fontWeight: 600 }}>
                    Cảnh báo: Bạn còn <strong>{attemptsLeft}</strong> lần thử trước khi tài khoản bị khóa tạm 15 phút.
                  </div>
                </div>
              )}

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
                      placeholder="e.g. hoang.tb220412@university.edu.vn hoặc SV20220412"
                      disabled={loading || lockoutData?.isLocked}
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
                <button
                  type="submit"
                  disabled={loading || lockoutData?.isLocked}
                  className="ruo-portal-btn-primary"
                  style={{
                    opacity: lockoutData?.isLocked ? 0.5 : 1,
                    cursor: lockoutData?.isLocked ? 'not-allowed' : 'pointer'
                  }}
                >
                  <span>
                    {lockoutData?.isLocked
                      ? `Tài khoản tạm khóa (${lockoutData.remainingMinutes}m)`
                      : loading
                        ? 'Đang xác thực bảo mật...'
                        : 'Đăng Nhập Vào Hệ Thống'}
                  </span>
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

              <form onSubmit={handleRegister} noValidate>
                {/* Field 1: Họ và tên */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '5px' }}>
                    Họ và tên đầy đủ *
                  </label>
                  <input
                    type="text"
                    className="ruo-portal-input"
                    style={{
                      paddingLeft: '12px',
                      borderColor: regTouched.fullName && regErrors.fullName ? '#EF4444' : undefined
                    }}
                    value={regFullName}
                    onChange={(e) => {
                      setRegFullName(e.target.value);
                      handleFieldChange('fullName', e.target.value);
                    }}
                    onBlur={(e) => handleFieldBlur('fullName', e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    required
                  />
                  {regTouched.fullName && regErrors.fullName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', fontSize: '11px', color: '#EF4444' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{regErrors.fullName}</span>
                    </div>
                  )}
                </div>

                {/* Field 2 & 3: Email trường & MSSV/Mã cán bộ */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '5px' }}>
                      Email trường *
                    </label>
                    <input
                      type="email"
                      className="ruo-portal-input"
                      style={{
                        paddingLeft: '10px',
                        borderColor: regTouched.email && regErrors.email ? '#EF4444' : undefined
                      }}
                      value={regEmail}
                      onChange={(e) => {
                        setRegEmail(e.target.value);
                        handleFieldChange('email', e.target.value);
                      }}
                      onBlur={(e) => handleFieldBlur('email', e.target.value)}
                      placeholder="an.nv@university.edu.vn"
                      required
                    />
                    {regTouched.email && regErrors.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', fontSize: '11px', color: '#EF4444' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{regErrors.email}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '5px' }}>
                      MSSV / Mã Cán Bộ *
                    </label>
                    <input
                      type="text"
                      className="ruo-portal-input"
                      style={{
                        paddingLeft: '10px',
                        borderColor: regTouched.employeeCode && regErrors.employeeCode ? '#EF4444' : undefined
                      }}
                      value={regEmployeeCode}
                      onChange={(e) => {
                        setRegEmployeeCode(e.target.value);
                        handleFieldChange('employeeCode', e.target.value);
                      }}
                      onBlur={(e) => handleFieldBlur('employeeCode', e.target.value)}
                      placeholder="SV20240123 / CB198402"
                      required
                    />
                    {regTouched.employeeCode && regErrors.employeeCode && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', fontSize: '11px', color: '#EF4444' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{regErrors.employeeCode}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Field 4 & 5: Vai trò & Khoa/Viện */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
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
                          padding: '8px 4px',
                          borderRadius: '6px',
                          border: 'none',
                          background: regRole === 'student' ? '#2563EB' : 'var(--canvas-subtle)',
                          color: regRole === 'student' ? '#FFFFFF' : 'var(--ink-muted)',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        Sinh Viên
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegRole('lecturer')}
                        style={{
                          flex: 1,
                          padding: '8px 4px',
                          borderRadius: '6px',
                          border: 'none',
                          background: regRole === 'lecturer' ? '#2563EB' : 'var(--canvas-subtle)',
                          color: regRole === 'lecturer' ? '#FFFFFF' : 'var(--ink-muted)',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
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
                        padding: '8px',
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

                {/* Field 6 & 7: Mật khẩu & Xác nhận mật khẩu with eye toggles */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '5px' }}>
                      Mật khẩu *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={regShowPassword ? 'text' : 'password'}
                        className="ruo-portal-input"
                        style={{
                          paddingLeft: '10px',
                          paddingRight: '32px',
                          borderColor: regTouched.password && regErrors.password ? '#EF4444' : undefined
                        }}
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          handleFieldChange('password', e.target.value);
                        }}
                        onBlur={(e) => handleFieldBlur('password', e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setRegShowPassword(!regShowPassword)}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '11px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--ink-muted)',
                          cursor: 'pointer',
                          padding: 0
                        }}
                        title={regShowPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {regShowPassword ? <Icons.EyeOff size={15} /> : <Icons.Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink-primary)', marginBottom: '5px' }}>
                      Xác nhận lại *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={regShowConfirmPassword ? 'text' : 'password'}
                        className="ruo-portal-input"
                        style={{
                          paddingLeft: '10px',
                          paddingRight: '32px',
                          borderColor: regTouched.confirmPassword && regErrors.confirmPassword ? '#EF4444' : undefined
                        }}
                        value={regConfirmPassword}
                        onChange={(e) => {
                          setRegConfirmPassword(e.target.value);
                          handleFieldChange('confirmPassword', e.target.value);
                        }}
                        onBlur={(e) => handleFieldBlur('confirmPassword', e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setRegShowConfirmPassword(!regShowConfirmPassword)}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '11px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--ink-muted)',
                          cursor: 'pointer',
                          padding: 0
                        }}
                        title={regShowConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {regShowConfirmPassword ? <Icons.EyeOff size={15} /> : <Icons.Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Criteria Live Checklist */}
                {(regPassword.length > 0 || regTouched.password) && (
                  <div
                    style={{
                      marginBottom: '12px',
                      padding: '8px 10px',
                      background: 'var(--canvas-subtle)',
                      borderRadius: '8px',
                      border: '1px solid var(--hairline-medium)',
                      fontSize: '11px'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: '5px' }}>
                      Tiêu chuẩn an toàn mật khẩu:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                      <div style={{ color: regPasswordCriteria.minLength ? '#10B981' : 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{regPasswordCriteria.minLength ? '✓' : '•'}</span>
                        <span>Tối thiểu 8 ký tự</span>
                      </div>
                      <div style={{ color: regPasswordCriteria.hasUpper ? '#10B981' : 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{regPasswordCriteria.hasUpper ? '✓' : '•'}</span>
                        <span>Chữ in hoa (A-Z)</span>
                      </div>
                      <div style={{ color: regPasswordCriteria.hasLower ? '#10B981' : 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{regPasswordCriteria.hasLower ? '✓' : '•'}</span>
                        <span>Chữ thường (a-z)</span>
                      </div>
                      <div style={{ color: regPasswordCriteria.hasNumber ? '#10B981' : 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{regPasswordCriteria.hasNumber ? '✓' : '•'}</span>
                        <span>Chữ số (0-9)</span>
                      </div>
                      <div style={{ color: regPasswordCriteria.hasSpecial ? '#10B981' : 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{regPasswordCriteria.hasSpecial ? '✓' : '•'}</span>
                        <span>Ký tự đặc biệt (@$!%*?&)</span>
                      </div>
                      <div style={{ color: regPasswordCriteria.isMatching ? '#10B981' : 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{regPasswordCriteria.isMatching ? '✓' : '•'}</span>
                        <span>Khớp xác nhận</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Field 8: Cam kết quy chế */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '11.5px', color: 'var(--ink-muted)', lineHeight: 1.4 }}>
                    <input
                      type="checkbox"
                      checked={regAgreed}
                      onChange={(e) => {
                        setRegAgreed(e.target.checked);
                        handleFieldChange('agreed', e.target.checked);
                      }}
                      style={{ width: '14px', height: '14px', accentColor: '#2563EB', marginTop: '2px', cursor: 'pointer' }}
                    />
                    <span>Tôi cam kết tuân thủ Quy chế sử dụng cơ sở vật chất của Nhà trường.</span>
                  </label>
                  {regTouched.agreed && regErrors.agreed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', fontSize: '11px', color: '#EF4444' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{regErrors.agreed}</span>
                    </div>
                  )}
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={loading}
                  className="ruo-portal-btn-primary"
                  style={{
                    opacity: loading ? 0.75 : 1,
                    cursor: loading ? 'wait' : 'pointer'
                  }}
                >
                  {loading ? (
                    <>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ animation: 'spin 1s linear infinite' }}
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      <span>Đang tạo tài khoản...</span>
                    </>
                  ) : (
                    <>
                      <span>Hoàn Tất Đăng Ký</span>
                      <Icons.ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
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
