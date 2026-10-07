import React, { useState, useMemo } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ForgotPasswordModal } from '../../components/ui/ForgotPasswordModal';
import { Building2DIso } from '../../components/common/Building2DIso';
import { RuoLogo } from '../../components/common/RuoLogo';

/**
 * LoginPage - Operational Ledger Design
 * 
 * Clean, agency-grade authentication screen tailored for the University Equipment Management System (UEMS 3.0).
 * Features:
 * - Segmented Tab Switcher: Đăng Nhập (Login) & Đăng Ký Tài Khoản (Register)
 * - 3 Canonical Actor Quick-Fill buttons (Admin, Manager, Staff)
 * - Calibrated for both Dark Mode and Light Mode (zero color inversion or broken contrast)
 * - UC-1.1 Brute-Force lockout detection (15-min lockout on 5 consecutive failures)
 * - Real-time Password Policy Checklist for self-registration
 * - Pure Native Inline SVG icons only (Strict compliance with AGENTS.md / GEMINI.md)
 * - 2D Isometric architectural elevation of Tòa A1 on blueprint grid
 */
export const LoginPage = ({ onLoginSuccess }) => {
  const { login, register, checkDuplicate, theme, toggleTheme } = useAuth();
  const { toast } = useToast();

  const isLight = theme === 'light';
  const [selectedFloor, setSelectedFloor] = useState(null);

  // Active Tab: 'login' | 'register'
  const [activeTab, setActiveTab] = useState('login');

  // Live Login credentials state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Registration Form State
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regEmployeeCode, setRegEmployeeCode] = useState('');
  const [regRole, setRegRole] = useState('lecturer');
  const [regDepartment, setRegDepartment] = useState('Khoa Công nghệ Thông tin');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regShowConfirmPassword, setRegShowConfirmPassword] = useState(false);
  const [regAgreed, setRegAgreed] = useState(false);

  // Asynchronous duplicate availability check states
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);

  // Validation & Touched Tracking for Register
  const [regErrors, setRegErrors] = useState({});
  const [regTouched, setRegTouched] = useState({});

  // Security & Lockout State (UC-1.1: 15-minute temporary lockout on 5 failed attempts)
  const [lockoutData, setLockoutData] = useState(null);
  const [attemptsLeft, setAttemptsLeft] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Canonical demo accounts calibrated for both light and dark modes (4 Canonical Roles)
  const DEMO_ACCOUNTS = [
    {
      role: 'admin',
      roleLabel: 'Admin BGH',
      email: 'admin@ruo.edu.vn',
      code: 'AD001',
      desc: 'Toàn quyền cấu hình, duyệt thanh lý BGH & kiểm toán SHA-256',
      badgeColor: isLight ? '#DC2626' : '#EF4444',
      badgeBg: isLight ? '#FEF2F2' : 'rgba(239, 68, 68, 0.12)',
      badgeBorder: isLight ? '#FECACA' : 'rgba(239, 68, 68, 0.3)'
    },
    {
      role: 'facility_manager',
      roleLabel: 'Quản Lý CSVC',
      email: 'manager@ruo.edu.vn',
      code: 'QL001',
      desc: 'Điều phối Kanban SLA, xuất kho KHO-01, đề xuất thanh lý R>=60%',
      badgeColor: isLight ? '#D97706' : '#F59E0B',
      badgeBg: isLight ? '#FFFBEB' : 'rgba(245, 158, 11, 0.12)',
      badgeBorder: isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.3)'
    },
    {
      role: 'technician',
      roleLabel: 'Kỹ Thuật Viên',
      email: 'technician@ruo.edu.vn',
      code: 'KT001',
      desc: 'Tiếp nhận ca sửa, xin linh kiện, xác nhận di chuyển & quét QR',
      badgeColor: isLight ? '#0284C7' : '#0EA5E9',
      badgeBg: isLight ? '#F0F9FF' : 'rgba(14, 165, 233, 0.12)',
      badgeBorder: isLight ? '#BAE6FD' : 'rgba(14, 165, 233, 0.3)'
    },
    {
      role: 'lecturer',
      roleLabel: 'Giảng Viên',
      email: 'lecturer@ruo.edu.vn',
      code: 'GV001',
      desc: 'Tra cứu thiết bị phòng, báo hỏng sự cố & đánh giá nghiệm thu 1-5 sao',
      badgeColor: isLight ? '#059669' : '#10B981',
      badgeBg: isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.12)',
      badgeBorder: isLight ? '#A7F3D0' : 'rgba(16, 185, 129, 0.3)'
    }
  ];

  const handleQuickFill = (email) => {
    setIdentifier(email);
    setPassword('Ruo@2026');
    setErrorMsg(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg('Vui lòng nhập email công vụ hoặc mã cán bộ cùng mật khẩu.');
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
        setSuccessMsg('Đăng nhập thành công! Đang đồng bộ sổ cái vận hành...');
        toast.success(`Chào mừng ${res.user?.full_name || res.user?.fullName || 'Cán bộ'} đã đăng nhập hệ thống!`, 'Xác Thực Thành Công');
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        setErrorMsg(res.message || 'Thông tin tài khoản hoặc mật khẩu không chính xác.');
        if (res.isPending) {
          toast.warning(res.message, 'Tài Khoản Đang Chờ Phê Duyệt');
        } else if (res.isLocked) {
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
      toast.error('Không thể kết nối đến máy chủ Backend (Port 5000).', 'Lỗi Kết Nối');
    } finally {
      setLoading(false);
    }
  };

  // Registration password policy checklist
  const regPasswordCriteria = useMemo(() => ({
    minLength: regPassword.length >= 8,
    hasUpper: /[A-Z]/.test(regPassword),
    hasLower: /[a-z]/.test(regPassword),
    hasNumber: /\d/.test(regPassword),
    hasSpecial: /[^a-zA-Z\d\s]/.test(regPassword),
    isMatching: regPassword.length > 0 && regPassword === regConfirmPassword
  }), [regPassword, regConfirmPassword]);

  const validateRegField = (name, value, allValues = {}) => {
    switch (name) {
      case 'fullName': {
        const val = String(value || '').trim();
        if (!val) return 'Họ và tên là bắt buộc.';
        if (val.length < 2) return 'Họ và tên phải có tối thiểu 2 ký tự.';
        return '';
      }
      case 'email': {
        const val = String(value || '').trim();
        if (!val) return 'Email trường/công vụ là bắt buộc.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Email không đúng định dạng.';
        return '';
      }
      case 'employeeCode': {
        const val = String(value || '').trim();
        if (!val) return 'Mã cán bộ / MSSV là bắt buộc.';
        if (val.length < 3) return 'Mã số tối thiểu 3 ký tự (e.g. GV001, KT001, QL001).';
        return '';
      }
      case 'password': {
        const val = String(value || '');
        if (!val) return 'Mật khẩu là bắt buộc.';
        if (val.length < 8) return 'Mật khẩu phải có tối thiểu 8 ký tự.';
        return '';
      }
      case 'confirmPassword': {
        const val = String(value || '');
        const target = allValues.password !== undefined ? allValues.password : regPassword;
        if (!val) return 'Vui lòng xác nhận lại mật khẩu.';
        if (val !== target) return 'Mật khẩu xác nhận không khớp.';
        return '';
      }
      case 'agreed': {
        if (!value) return 'Vui lòng xác nhận đồng ý với Quy chế sử dụng CSVC.';
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

  const handleFieldBlur = async (field, value) => {
    setRegTouched(prev => ({ ...prev, [field]: true }));
    const err = validateRegField(field, value, {
      password: field === 'password' ? value : regPassword,
      confirmPassword: field === 'confirmPassword' ? value : regConfirmPassword
    });
    setRegErrors(prev => ({ ...prev, [field]: err }));

    // Asynchronously check duplicates if basic format is valid
    if (!err && field === 'email' && value.trim()) {
      try {
        setCheckingEmail(true);
        const dupRes = await checkDuplicate({ email: value.trim() });
        if (dupRes && dupRes.emailExists) {
          setRegErrors(prev => ({
            ...prev,
            email: 'Email này đã tồn tại trong hệ thống. Vui lòng đăng nhập hoặc sử dụng email khác.'
          }));
        }
      } catch (e) {
        console.warn('Check duplicate email error:', e);
      } finally {
        setCheckingEmail(false);
      }
    }

    if (!err && field === 'employeeCode' && value.trim()) {
      try {
        setCheckingCode(true);
        const dupRes = await checkDuplicate({ code: value.trim() });
        if (dupRes && dupRes.codeExists) {
          setRegErrors(prev => ({
            ...prev,
            employeeCode: 'Mã cán bộ / MSSV này đã tồn tại trong hệ thống.'
          }));
        }
      } catch (e) {
        console.warn('Check duplicate code error:', e);
      } finally {
        setCheckingCode(false);
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const touchedAll = {
      fullName: true,
      email: true,
      employeeCode: true,
      password: true,
      confirmPassword: true,
      agreed: true
    };
    setRegTouched(touchedAll);

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
      toast.error(firstError, 'Thông Tin Chưa Hợp Lệ');
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
        department: regDepartment
      });

      if (res && res.success) {
        if (res.isPending) {
          const pendingNotice = res.message || 'Đăng ký thành công! Hồ sơ của bạn đã được chuyển tới Ban Quản Trị (Admin) để phê duyệt bổ nhiệm chức vụ.';
          setSuccessMsg(pendingNotice);
          toast.info(pendingNotice, 'Hồ Sơ Đang Chờ Duyệt');
          setTimeout(() => {
            setIdentifier(regEmail.trim());
            setActiveTab('login');
            setErrorMsg(null);
            setSuccessMsg('Hồ sơ đăng ký đã gửi thành công! Vui lòng đợi Ban Quản Trị (Admin) phê duyệt chức vụ trước khi đăng nhập.');
          }, 2000);
        } else {
          setSuccessMsg(res.message || 'Đăng ký tài khoản thành công! Đang chuyển hướng...');
          toast.success(res.message || `Đăng ký thành công! Chào mừng ${regFullName.trim()}`, 'Đăng Ký Thành Công');
          setTimeout(() => {
            if (onLoginSuccess) {
              onLoginSuccess();
            }
          }, 600);
        }
      } else {
        const msg = res?.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.';
        setErrorMsg(msg);

        // Highlight duplicate fields specifically on the inputs with red outline
        const isEmailDup = res?.duplicateField === 'email' || res?.errorType === 'DUPLICATE_EMAIL' || msg.toLowerCase().includes('email');
        const isCodeDup = res?.duplicateField === 'employeeCode' || res?.duplicateField === 'both' || res?.errorType === 'DUPLICATE_CODE' || msg.toLowerCase().includes('mã');

        if (isEmailDup) {
          setRegTouched(prev => ({ ...prev, email: true }));
          setRegErrors(prev => ({ ...prev, email: msg }));
        }
        if (isCodeDup) {
          setRegTouched(prev => ({ ...prev, employeeCode: true }));
          setRegErrors(prev => ({ ...prev, employeeCode: msg }));
        }

        toast.error(msg, 'Đăng Ký Thất Bại');
      }
    } catch (err) {
      const msg = err.message || 'Lỗi hệ thống khi đăng ký.';
      setErrorMsg(msg);
      toast.error(msg, 'Lỗi Kết Nối');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="ruo-split-auth-viewport ruo-view-enter"
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'var(--bg-app)'
      }}
    >
      {/* ====================================================================
          BÊN TRÁI (LEFT): 2D ISOMETRIC BUILDING ELEVATION & CAMPUS TWIN
          ==================================================================== */}
      <div
        className="ruo-split-auth-left"
        style={{
          flex: '1.15',
          background: isLight ? '#F4F4F0' : 'var(--surface-1)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '28px 36px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Header Left: Official Bespoke Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', zIndex: 2 }}>
          <RuoLogo size={42} subtitle="HỆ THỐNG QUẢN LÝ THIẾT BỊ ĐẠI HỌC" />
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '16px',
              background: isLight ? '#EFF6FF' : 'rgba(62,123,250,0.12)',
              border: `1px solid ${isLight ? '#BFDBFE' : 'rgba(62,123,250,0.25)'}`,
              color: isLight ? '#2563EB' : '#3E7BFA',
              fontSize: '11px',
              fontWeight: 700
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isLight ? '#2563EB' : '#3E7BFA', display: 'inline-block' }} />
            UEMS 3.0 OPERATIONAL
          </div>
        </div>

        {/* Center Architectural Elevation */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', minHeight: 0, padding: '20px 0', zIndex: 1 }}>
          <Building2DIso
            activeFloor={selectedFloor}
            onSelectFloor={(floor) => setSelectedFloor(floor === selectedFloor ? null : floor)}
          />
        </div>

        {/* Bottom Left Note */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--ink-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icons.Shield size={14} color="var(--blueprint-500)" />
            <span>Mặt bằng số hóa Tòa A1 • 5 tầng vận hành</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-muted)' }}>
            SHA-256 LEDGER GUARDED
          </span>
        </div>
      </div>

      {/* ====================================================================
          BÊN PHẢI (RIGHT): KHUNG ĐĂNG NHẬP CHUYÊN NGHIỆP (OPERATIONAL FORM)
          ==================================================================== */}
      <div
        className="ruo-split-auth-right"
        style={{
          flex: '0.95',
          background: 'var(--bg-app)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '28px 40px',
          overflowY: 'auto',
          position: 'relative'
        }}
      >
        {/* Top Header: Hotline & Theme Switch */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginRight: '6px' }}>Hotline CSVC:</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>1900 6868</span>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              color: 'var(--ink-secondary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              boxShadow: 'var(--shadow-card)',
              transition: 'all 0.15s ease'
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
        <div
          className="ruo-auth-card-centered"
          style={{
            width: '100%',
            maxWidth: '480px',
            margin: 'auto',
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '16px',
            padding: '30px 28px',
            boxShadow: isLight ? '0 10px 30px rgba(0, 0, 0, 0.08)' : '0 12px 32px rgba(0, 0, 0, 0.45)'
          }}
        >
          {/* Segmented Tab Switcher */}
          <div
            style={{
              display: 'flex',
              padding: '4px',
              background: isLight ? '#F0EFEA' : 'var(--surface-2)',
              borderRadius: '10px',
              marginBottom: '20px',
              border: `1px solid ${isLight ? '#E2E0D8' : 'var(--border-default)'}`
            }}
          >
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setErrorMsg(null); setSuccessMsg(null); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '7px',
                border: 'none',
                background: activeTab === 'login' ? 'var(--blueprint-500)' : 'transparent',
                color: activeTab === 'login' ? '#FFFFFF' : 'var(--ink-secondary)',
                fontSize: '12.5px',
                fontWeight: activeTab === 'login' ? 700 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Icons.Key size={14} />
              <span>Đăng Nhập</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('register'); setErrorMsg(null); setSuccessMsg(null); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '7px',
                border: 'none',
                background: activeTab === 'register' ? 'var(--blueprint-500)' : 'transparent',
                color: activeTab === 'register' ? '#FFFFFF' : 'var(--ink-secondary)',
                fontSize: '12.5px',
                fontWeight: activeTab === 'register' ? 700 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Icons.User size={14} />
              <span>Đăng Ký Tài Khoản</span>
            </button>
          </div>

          {/* Feedback Messages */}
          {successMsg && (
            <div
              style={{
                marginBottom: '18px',
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
                marginBottom: '18px',
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

          {/* ================================================================
              TAB 1: ĐĂNG NHẬP HỆ THỐNG
              ================================================================ */}
          {activeTab === 'login' && (
            <div>
              {/* Header Title */}
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '21px', fontWeight: 800, color: 'var(--ink-primary)', margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>
                  Đăng Nhập Vận Hành
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Cổng quản lý tài sản, trang thiết bị & chuỗi cung ứng cơ sở vật chất
                </p>
              </div>

              {/* UC-1.1 Brute-Force Lockout Banner (15-Minute Temporary Lock) */}
              {lockoutData?.isLocked && (
                <div
                  style={{
                    marginBottom: '18px',
                    padding: '12px 14px',
                    borderRadius: '8px',
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
                      Hệ thống phát hiện 5 lần nhập sai mật khẩu liên tiếp. Vui lòng chờ <strong>{lockoutData.remainingMinutes} phút</strong> để thử lại, hoặc liên hệ Ban Quản Trị Hệ Thống.
                    </div>
                  </div>
                </div>
              )}

              {/* Warning: Attempts remaining before lockout */}
              {!lockoutData?.isLocked && attemptsLeft !== null && attemptsLeft > 0 && attemptsLeft < 5 && (
                <div
                  style={{
                    marginBottom: '18px',
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

              {/* Quick Fill Demo Accounts Matrix (Phase 1.1 Canonical Roles) */}
              <div
                style={{
                  marginBottom: '20px',
                  padding: '12px 14px',
                  background: isLight ? '#F0EFEA' : 'var(--surface-2)',
                  borderRadius: '10px',
                  border: `1px solid ${isLight ? '#E2E0D8' : 'var(--border-default)'}`
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--ink-muted)',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>Tài khoản mẫu thử nghiệm (1-Click):</span>
                  <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--blueprint-500)', fontWeight: 700 }}>
                    MK: Ruo@2026
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.role}
                      type="button"
                      onClick={() => handleQuickFill(acc.email)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '8px',
                        background: acc.badgeBg,
                        border: `1px solid ${acc.badgeBorder}`,
                        color: acc.badgeColor,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      title={acc.desc}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{acc.roleLabel}</div>
                      <div style={{ fontSize: '10px', opacity: 0.9, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {acc.code}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleLogin}>
                {/* Field 1: Email or Employee Code */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-primary)', marginBottom: '6px' }}>
                    Email công vụ hoặc Mã cán bộ
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center' }}>
                      <Icons.Mail size={16} />
                    </span>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. admin@ruo.edu.vn hoặc AD001"
                      disabled={loading || lockoutData?.isLocked}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 38px',
                        borderRadius: '8px',
                        background: isLight ? '#FFFFFF' : 'var(--surface-2)',
                        border: `1px solid ${isLight ? '#D4D4D8' : 'var(--border-default)'}`,
                        color: 'var(--ink-primary)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--blueprint-500)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(62, 123, 250, 0.15)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = isLight ? '#D4D4D8' : 'var(--border-default)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                {/* Field 2: Password */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-primary)', marginBottom: '6px' }}>
                    Mật khẩu hệ thống
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center' }}>
                      <Icons.Lock size={16} />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 38px 10px 38px',
                        borderRadius: '8px',
                        background: isLight ? '#FFFFFF' : 'var(--surface-2)',
                        border: `1px solid ${isLight ? '#D4D4D8' : 'var(--border-default)'}`,
                        color: 'var(--ink-primary)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--blueprint-500)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(62, 123, 250, 0.15)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = isLight ? '#D4D4D8' : 'var(--border-default)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '11px',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', fontSize: '12.5px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--ink-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ width: '15px', height: '15px', accentColor: 'var(--blueprint-500)', cursor: 'pointer' }}
                    />
                    <span>Ghi nhớ phiên 7 ngày</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--blueprint-500)', fontWeight: 600, cursor: 'pointer', fontSize: '12.5px' }}
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || lockoutData?.isLocked}
                  style={{
                    width: '100%',
                    padding: '11px 18px',
                    borderRadius: '8px',
                    background: 'var(--blueprint-500)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    cursor: loading || lockoutData?.isLocked ? 'not-allowed' : 'pointer',
                    opacity: loading || lockoutData?.isLocked ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 4px 14px rgba(62, 123, 250, 0.28)'
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

              {/* Bottom Switch to Register */}
              <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12.5px', color: 'var(--ink-secondary)' }}>
                Chưa có tài khoản cán bộ?{' '}
                <button
                  type="button"
                  onClick={() => { setActiveTab('register'); setErrorMsg(null); setSuccessMsg(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--blueprint-500)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Đăng ký tài khoản mới
                </button>
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 2: ĐĂNG KÝ TÀI KHOẢN MỚI
              ================================================================ */}
          {activeTab === 'register' && (
            <div>
              {/* Header Title */}
              <div style={{ marginBottom: '18px' }}>
                <h2 style={{ fontSize: '21px', fontWeight: 800, color: 'var(--ink-primary)', margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>
                  Đăng Ký Tài Khoản Cán Bộ
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Khởi tạo tài khoản định danh để tham gia quản lý, đề xuất & báo hỏng CSVC
                </p>
              </div>

              <form onSubmit={handleRegister} noValidate>
                {/* Field 1: Họ và tên đầy đủ */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-primary)', marginBottom: '5px' }}>
                    Họ và tên đầy đủ *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center' }}>
                      <Icons.User size={16} />
                    </span>
                    <input
                      type="text"
                      value={regFullName}
                      onChange={(e) => {
                        setRegFullName(e.target.value);
                        handleFieldChange('fullName', e.target.value);
                      }}
                      onBlur={(e) => handleFieldBlur('fullName', e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn An"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 38px',
                        borderRadius: '8px',
                        background: isLight ? '#FFFFFF' : 'var(--surface-2)',
                        border: `1px solid ${regTouched.fullName && regErrors.fullName ? '#EF4444' : isLight ? '#D4D4D8' : 'var(--border-default)'}`,
                        color: 'var(--ink-primary)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  {regTouched.fullName && regErrors.fullName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', fontSize: '11px', color: '#EF4444' }}>
                      <Icons.Shield size={12} color="#EF4444" />
                      <span>{regErrors.fullName}</span>
                    </div>
                  )}
                </div>

                {/* Field 2 & 3: Email trường & Mã cán bộ / MSSV */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '10px', marginBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                        Email công vụ *
                      </label>
                      {checkingEmail && (
                        <span style={{ fontSize: '10.5px', color: 'var(--blueprint-500)', fontWeight: 600 }}>
                          Đang kiểm tra...
                        </span>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center' }}>
                        <Icons.Mail size={15} />
                      </span>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => {
                          setRegEmail(e.target.value);
                          handleFieldChange('email', e.target.value);
                        }}
                        onBlur={(e) => handleFieldBlur('email', e.target.value)}
                        placeholder="an.nv@ruo.edu.vn"
                        required
                        style={{
                          width: '100%',
                          padding: '10px 10px 10px 32px',
                          borderRadius: '8px',
                          background: isLight ? '#FFFFFF' : 'var(--surface-2)',
                          border: `1px solid ${regTouched.email && regErrors.email ? '#EF4444' : isLight ? '#D4D4D8' : 'var(--border-default)'}`,
                          color: 'var(--ink-primary)',
                          fontSize: '12.5px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    {regTouched.email && regErrors.email && (
                      <div
                        style={{
                          marginTop: '5px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: isLight ? '#FEF2F2' : 'rgba(239, 68, 68, 0.12)',
                          border: `1px solid ${isLight ? '#FECACA' : 'rgba(239, 68, 68, 0.3)'}`,
                          fontSize: '11px',
                          lineHeight: 1.4,
                          color: isLight ? '#DC2626' : '#F87171'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                          <span style={{ display: 'inline-flex', marginTop: '1px', flexShrink: 0 }}>
                            <Icons.Shield size={12} color={isLight ? '#DC2626' : '#F87171'} />
                          </span>
                          <span style={{ fontWeight: 600 }}>{regErrors.email}</span>
                        </div>
                        {regErrors.email.toLowerCase().includes('tồn tại') && (
                          <div style={{ marginTop: '5px', paddingTop: '4px', borderTop: `1px dashed ${isLight ? '#FCA5A5' : 'rgba(239, 68, 68, 0.25)'}` }}>
                            <button
                              type="button"
                              onClick={() => {
                                setIdentifier(regEmail);
                                setActiveTab('login');
                                setErrorMsg(null);
                                setSuccessMsg('Đã điền email tài khoản của bạn. Vui lòng nhập mật khẩu để đăng nhập.');
                              }}
                              style={{
                                background: isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.2)',
                                border: `1px solid ${isLight ? '#BFDBFE' : 'rgba(59, 130, 246, 0.4)'}`,
                                borderRadius: '4px',
                                color: isLight ? '#1D4ED8' : '#93C5FD',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: '3px 8px',
                                fontSize: '11px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span>Chuyển sang Đăng nhập với email này →</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                        Mã cán bộ / MSSV *
                      </label>
                      {checkingCode && (
                        <span style={{ fontSize: '10.5px', color: 'var(--blueprint-500)', fontWeight: 600 }}>
                          Đang kiểm tra...
                        </span>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center' }}>
                        <Icons.Key size={15} />
                      </span>
                      <input
                        type="text"
                        value={regEmployeeCode}
                        onChange={(e) => {
                          setRegEmployeeCode(e.target.value);
                          handleFieldChange('employeeCode', e.target.value);
                        }}
                        onBlur={(e) => handleFieldBlur('employeeCode', e.target.value)}
                        placeholder="CB198402"
                        required
                        style={{
                          width: '100%',
                          padding: '10px 10px 10px 32px',
                          borderRadius: '8px',
                          background: isLight ? '#FFFFFF' : 'var(--surface-2)',
                          border: `1px solid ${regTouched.employeeCode && regErrors.employeeCode ? '#EF4444' : isLight ? '#D4D4D8' : 'var(--border-default)'}`,
                          color: 'var(--ink-primary)',
                          fontSize: '12.5px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    {regTouched.employeeCode && regErrors.employeeCode && (
                      <div
                        style={{
                          marginTop: '5px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: isLight ? '#FEF2F2' : 'rgba(239, 68, 68, 0.12)',
                          border: `1px solid ${isLight ? '#FECACA' : 'rgba(239, 68, 68, 0.3)'}`,
                          fontSize: '11px',
                          lineHeight: 1.4,
                          color: isLight ? '#DC2626' : '#F87171'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                          <span style={{ display: 'inline-flex', marginTop: '1px', flexShrink: 0 }}>
                            <Icons.Shield size={12} color={isLight ? '#DC2626' : '#F87171'} />
                          </span>
                          <span style={{ fontWeight: 600 }}>{regErrors.employeeCode}</span>
                        </div>
                        {regErrors.employeeCode.toLowerCase().includes('tồn tại') && (
                          <div style={{ marginTop: '5px', paddingTop: '4px', borderTop: `1px dashed ${isLight ? '#FCA5A5' : 'rgba(239, 68, 68, 0.25)'}` }}>
                            <button
                              type="button"
                              onClick={() => {
                                setIdentifier(regEmployeeCode);
                                setActiveTab('login');
                                setErrorMsg(null);
                                setSuccessMsg('Đã điền mã cán bộ của bạn. Vui lòng nhập mật khẩu để đăng nhập.');
                              }}
                              style={{
                                background: isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.2)',
                                border: `1px solid ${isLight ? '#BFDBFE' : 'rgba(59, 130, 246, 0.4)'}`,
                                borderRadius: '4px',
                                color: isLight ? '#1D4ED8' : '#93C5FD',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: '3px 8px',
                                fontSize: '11px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span>Chuyển sang Đăng nhập với mã này →</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Field 4 & 5: Vai trò & Khoa / Phòng ban */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-primary)', marginBottom: '5px' }}>
                      Vai trò hệ thống *
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setRegRole('lecturer')}
                        style={{
                          flex: 1,
                          padding: '9px 4px',
                          borderRadius: '8px',
                          border: `1px solid ${regRole === 'lecturer' ? 'var(--blueprint-500)' : isLight ? '#D4D4D8' : 'var(--border-default)'}`,
                          background: regRole === 'lecturer' ? (isLight ? '#EFF6FF' : 'rgba(62,123,250,0.15)') : (isLight ? '#FFFFFF' : 'var(--surface-2)'),
                          color: regRole === 'lecturer' ? 'var(--blueprint-500)' : 'var(--ink-secondary)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        Giảng Viên
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegRole('technician')}
                        style={{
                          flex: 1,
                          padding: '9px 4px',
                          borderRadius: '8px',
                          border: `1px solid ${regRole === 'technician' ? 'var(--blueprint-500)' : isLight ? '#D4D4D8' : 'var(--border-default)'}`,
                          background: regRole === 'technician' ? (isLight ? '#EFF6FF' : 'rgba(62,123,250,0.15)') : (isLight ? '#FFFFFF' : 'var(--surface-2)'),
                          color: regRole === 'technician' ? 'var(--blueprint-500)' : 'var(--ink-secondary)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        Kỹ Thuật Viên
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegRole('facility_manager')}
                        style={{
                          flex: 1,
                          padding: '9px 4px',
                          borderRadius: '8px',
                          border: `1px solid ${regRole === 'facility_manager' ? 'var(--blueprint-500)' : isLight ? '#D4D4D8' : 'var(--border-default)'}`,
                          background: regRole === 'facility_manager' ? (isLight ? '#EFF6FF' : 'rgba(62,123,250,0.15)') : (isLight ? '#FFFFFF' : 'var(--surface-2)'),
                          color: regRole === 'facility_manager' ? 'var(--blueprint-500)' : 'var(--ink-secondary)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        Quản Lý CSVC
                      </button>
                    </div>
                    {(regRole === 'technician' || regRole === 'facility_manager') && (
                      <div
                        style={{
                          marginTop: '6px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: isLight ? '#FFFBEB' : 'rgba(245, 158, 11, 0.12)',
                          border: `1px solid ${isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.3)'}`,
                          color: isLight ? '#B45309' : '#FBBF24',
                          fontSize: '11px',
                          lineHeight: 1.35,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Icons.Shield size={13} color={isLight ? '#B45309' : '#FBBF24'} style={{ flexShrink: 0 }} />
                        <span>Chức vụ này cần <strong>Admin phê duyệt</strong> trước khi kích hoạt.</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-primary)', marginBottom: '5px' }}>
                      Đơn vị / Khoa / Viện
                    </label>
                    <select
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: '8px',
                        background: isLight ? '#FFFFFF' : 'var(--surface-2)',
                        border: `1px solid ${isLight ? '#D4D4D8' : 'var(--border-default)'}`,
                        color: 'var(--ink-primary)',
                        fontSize: '12px',
                        outline: 'none',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="Khoa Công nghệ Thông tin">Khoa CNTT</option>
                      <option value="Khoa Điện tử - Viễn thông">Khoa Điện tử</option>
                      <option value="Viện Kinh tế & Quản lý">Viện Kinh tế & QL</option>
                      <option value="Khoa Cơ khí & Kỹ thuật">Khoa Cơ khí</option>
                      <option value="Khoa Ngoại ngữ & Sư phạm">Khoa Ngoại ngữ</option>
                      <option value="Phòng Hành Chính Quản Trị">Phòng HC-QT</option>
                      <option value="Phòng Quản Trị Thiết Bị">Phòng Quản Trị TB</option>
                    </select>
                  </div>
                </div>

                {/* Field 6 & 7: Mật khẩu & Nhập lại mật khẩu */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-primary)', marginBottom: '5px' }}>
                      Mật khẩu mới *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={regShowPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          handleFieldChange('password', e.target.value);
                        }}
                        onBlur={(e) => handleFieldBlur('password', e.target.value)}
                        placeholder="••••••••"
                        required
                        style={{
                          width: '100%',
                          padding: '10px 32px 10px 10px',
                          borderRadius: '8px',
                          background: isLight ? '#FFFFFF' : 'var(--surface-2)',
                          border: `1px solid ${regTouched.password && regErrors.password ? '#EF4444' : isLight ? '#D4D4D8' : 'var(--border-default)'}`,
                          color: 'var(--ink-primary)',
                          fontSize: '12.5px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
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
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-primary)', marginBottom: '5px' }}>
                      Xác nhận lại *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={regShowConfirmPassword ? 'text' : 'password'}
                        value={regConfirmPassword}
                        onChange={(e) => {
                          setRegConfirmPassword(e.target.value);
                          handleFieldChange('confirmPassword', e.target.value);
                        }}
                        onBlur={(e) => handleFieldBlur('confirmPassword', e.target.value)}
                        placeholder="••••••••"
                        required
                        style={{
                          width: '100%',
                          padding: '10px 32px 10px 10px',
                          borderRadius: '8px',
                          background: isLight ? '#FFFFFF' : 'var(--surface-2)',
                          border: `1px solid ${regTouched.confirmPassword && regErrors.confirmPassword ? '#EF4444' : isLight ? '#D4D4D8' : 'var(--border-default)'}`,
                          color: 'var(--ink-primary)',
                          fontSize: '12.5px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
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

                {/* Password Policy Real-Time Checklist */}
                {(regPassword.length > 0 || regTouched.password) && (
                  <div
                    style={{
                      marginBottom: '14px',
                      padding: '10px 12px',
                      background: isLight ? '#F0EFEA' : 'var(--surface-2)',
                      borderRadius: '8px',
                      border: `1px solid ${isLight ? '#E2E0D8' : 'var(--border-default)'}`,
                      fontSize: '11px'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--ink-secondary)', marginBottom: '6px' }}>
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
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--ink-secondary)', lineHeight: 1.4 }}>
                    <input
                      type="checkbox"
                      checked={regAgreed}
                      onChange={(e) => {
                        setRegAgreed(e.target.checked);
                        handleFieldChange('agreed', e.target.checked);
                      }}
                      style={{ width: '15px', height: '15px', accentColor: 'var(--blueprint-500)', marginTop: '2px', cursor: 'pointer' }}
                    />
                    <span>Tôi cam kết tuân thủ Quy chế quản lý & sử dụng cơ sở vật chất của Nhà trường.</span>
                  </label>
                  {regTouched.agreed && regErrors.agreed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', fontSize: '11px', color: '#EF4444' }}>
                      <span>{regErrors.agreed}</span>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '11px 18px',
                    borderRadius: '8px',
                    background: 'var(--blueprint-500)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 4px 14px rgba(62, 123, 250, 0.28)'
                  }}
                >
                  <span>{loading ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản & Gia Nhập Hệ Thống'}</span>
                  <Icons.ArrowRight size={16} />
                </button>

                {/* Switch back to login link */}
                <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12.5px', color: 'var(--ink-secondary)' }}>
                  Đã có tài khoản cán bộ?{' '}
                  <button
                    type="button"
                    onClick={() => { setActiveTab('login'); setErrorMsg(null); }}
                    style={{ background: 'none', border: 'none', color: 'var(--blueprint-500)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    Đăng nhập ngay
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Micro Footer Notice */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center', fontSize: '11.5px', color: 'var(--ink-muted)', lineHeight: 1.6 }}>
            Bảo mật phiên đăng nhập bằng mã hóa JWT & chuỗi kiểm toán bất biến SHA-256. Mọi quyền truy cập được phân định theo ma trận RBAC.
          </div>
        </div>

        {/* Bottom Right: Version mark */}
        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--ink-muted)', paddingBottom: '8px' }}>
          RUO UEMS v3.0 • Phòng Hành Chính - Quản Trị • Bản quyền 2026
        </div>
      </div>

      {/* Forgot Password Modal Component */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </div>
  );
};
