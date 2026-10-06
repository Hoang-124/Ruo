import React, { useState } from 'react';
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
 * - 3 Canonical Actor Quick-Fill buttons (Admin, Manager, Staff)
 * - Calibrated for both Dark Mode and Light Mode (zero color inversion or broken contrast)
 * - UC-1.1 Brute-Force lockout detection (15-min lockout on 5 consecutive failures)
 * - Pure Native Inline SVG icons only (Strict compliance with AGENTS.md / GEMINI.md)
 * - 2D Isometric architectural elevation of Tòa A1 on blueprint grid
 */
export const LoginPage = ({ onLoginSuccess }) => {
  const { login, theme, toggleTheme } = useAuth();
  const { toast } = useToast();

  const isLight = theme === 'light';
  const [selectedFloor, setSelectedFloor] = useState(null);

  // Live credentials state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Security & Lockout State (UC-1.1: 15-minute temporary lockout on 5 failed attempts)
  const [lockoutData, setLockoutData] = useState(null);
  const [attemptsLeft, setAttemptsLeft] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Canonical demo accounts calibrated for both light and dark modes
  const DEMO_ACCOUNTS = [
    {
      role: 'admin',
      roleLabel: 'Admin BGH',
      email: 'admin@ruo.edu.vn',
      code: 'AD000001',
      desc: 'Toàn quyền cấu hình & duyệt thanh lý BGH',
      badgeColor: isLight ? '#DC2626' : '#EF4444',
      badgeBg: isLight ? '#FEF2F2' : 'rgba(239, 68, 68, 0.12)',
      badgeBorder: isLight ? '#FECACA' : 'rgba(239, 68, 68, 0.3)'
    },
    {
      role: 'manager',
      roleLabel: 'Quản Lý HC',
      email: 'manager@ruo.edu.vn',
      code: 'QL000001',
      desc: 'Duyệt điều chuyển, phân công kỹ thuật',
      badgeColor: isLight ? '#059669' : '#10B981',
      badgeBg: isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.12)',
      badgeBorder: isLight ? '#A7F3D0' : 'rgba(16, 185, 129, 0.3)'
    },
    {
      role: 'staff',
      roleLabel: 'Chuyên Viên',
      email: 'staff@ruo.edu.vn',
      code: 'NV000001',
      desc: 'Báo hỏng, bảo trì & kiểm kê thực địa QR',
      badgeColor: isLight ? '#2563EB' : '#3E7BFA',
      badgeBg: isLight ? '#EFF6FF' : 'rgba(62, 123, 250, 0.12)',
      badgeBorder: isLight ? '#BFDBFE' : 'rgba(62, 123, 250, 0.3)'
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
      toast.error('Không thể kết nối đến máy chủ Backend (Port 5000).', 'Lỗi Kết Nối');
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
            maxWidth: '460px',
            margin: 'auto',
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: '16px',
            padding: '32px 30px',
            boxShadow: isLight ? '0 10px 30px rgba(0, 0, 0, 0.08)' : '0 12px 32px rgba(0, 0, 0, 0.45)'
          }}
        >
          {/* Header Title */}
          <div style={{ marginBottom: '22px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink-primary)', margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>
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

          {/* Quick Fill Demo Accounts Matrix (Phase 1.1 Canonical Roles) */}
          <div
            style={{
              marginBottom: '20px',
              padding: '12px 14px',
              background: isLight ? '#F0EFEA' : 'var(--surface-2)',
              borderRadius: '10px',
              border: '1px solid var(--border-default)'
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickFill(acc.email)}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    background: acc.badgeBg,
                    border: `1px solid ${acc.badgeBorder}`,
                    color: acc.badgeColor,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                  title={acc.desc}
                >
                  <div style={{ fontSize: '11.5px', fontWeight: 800 }}>{acc.roleLabel}</div>
                  <div style={{ fontSize: '10.5px', opacity: 0.9, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                  placeholder="e.g. admin@ruo.edu.vn hoặc AD000001"
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
                cursor: (loading || lockoutData?.isLocked) ? 'not-allowed' : 'pointer',
                opacity: (loading || lockoutData?.isLocked) ? 0.6 : 1,
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
