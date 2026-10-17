import React, { useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ForgotPasswordModal } from '../../components/ui/ForgotPasswordModal';
import { Building2DIso } from '../../components/common/Building2DIso';
import { RuoLogo } from '../../components/common/RuoLogo';
import { LoginForm } from '../../components/auth/LoginForm';
import { RegisterForm } from '../../components/auth/RegisterForm';

/**
 * LoginPage - Zero-Scroll Balanced 100vh Authentication Shell
 *
 * Refactored Deep-Module Architecture:
 * - Strictly locked 100vh viewport (zero vertical scrollbar, zero layout jump)
 * - Left Showcase: 2D Isometric Digital Twin of Tòa A1
 * - Right Command Card: Segmented Tab Switcher orchestrating LoginForm (UC-1.1) & RegisterForm (UC-1.0 / UC-10.7)
 * - Calibrated for High-Contrast Academic Oxford Daylight & Night Blueprint Studio
 * - Strict Native SVG Only (Zero external icon libraries)
 */
export const LoginPage = ({ onLoginSuccess }) => {
  const { login, register, checkDuplicate, theme, toggleTheme } = useAuth();
  const { toast } = useToast();

  const isLight = theme === 'light';
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [activeTab, setActiveTab] = useState('login');

  // Login Credentials & Brute-Force Protection State (UC-1.1)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [lockoutData, setLockoutData] = useState(null);
  const [attemptsLeft, setAttemptsLeft] = useState(null);

  // Shared Feedback & Modal State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const handleLoginSubmit = async (e) => {
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
        toast.success(
          `Chào mừng ${res.user?.full_name || res.user?.fullName || 'Cán bộ'} đã đăng nhập hệ thống!`,
          'Xác Thực Thành Công'
        );
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

  return (
    <div className="ruo-auth-shell ruo-view-enter">
      {/* ====================================================================
          LEFT PANEL: 2D ISOMETRIC DIGITAL TWIN & TELEMETRY SHOWCASE
          ==================================================================== */}
      <aside className="ruo-auth-showcase-panel">
        {/* Top Brand Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            flexShrink: 0,
            zIndex: 2
          }}
        >
          <RuoLogo size={38} subtitle="HỆ THỐNG QUẢN LÝ THIẾT BỊ ĐẠI HỌC" />
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '4px 11px',
              borderRadius: '999px',
              background: isLight ? '#EFF6FF' : 'rgba(62, 123, 250, 0.14)',
              border: `1.5px solid ${isLight ? '#93C5FD' : 'rgba(62, 123, 250, 0.35)'}`,
              color: isLight ? '#1D4ED8' : '#60A5FA',
              fontSize: '10.5px',
              fontWeight: 800,
              letterSpacing: '0.02em'
            }}
          >
            <span className="ruo-live-dot" />
            <span>UEMS 3.0 OPERATIONAL</span>
          </div>
        </div>

        {/* Center Isometric Building (Fluidly constrained inside 100vh) */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            padding: '4px 0',
            zIndex: 1
          }}
        >
          <Building2DIso
            activeFloor={selectedFloor}
            onSelectFloor={(floor) => setSelectedFloor(floor)}
          />
        </div>

        {/* Bottom Architectural Ledger Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            fontSize: '11px',
            color: 'var(--ink-secondary)',
            borderTop: '1.5px solid var(--border-subtle)',
            paddingTop: '10px',
            flexShrink: 0,
            zIndex: 2
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 700 }}>
            <Icons.Shield size={14} color="var(--blueprint-500)" />
            <span>Mặt bằng số hóa Tòa A1 • 5 tầng vận hành trực tuyến</span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10.5px',
              fontWeight: 800,
              color: 'var(--blueprint-500)',
              padding: '2px 7px',
              borderRadius: '5px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            SHA-256 LEDGER GUARDED
          </span>
        </div>
      </aside>

      {/* ====================================================================
          RIGHT PANEL: MODULAR AUTHENTICATION COMMAND CARD (ZERO SCROLL)
          ==================================================================== */}
      <section className="ruo-auth-form-panel">
        {/* Top Utility Bar: Hotline & High-Contrast Theme Switch */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '14px',
            flexShrink: 0
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--ink-muted)',
                marginRight: '5px',
                fontWeight: 600
              }}
            >
              Hotline CSVC:
            </span>
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 800,
                color: 'var(--ink-primary)',
                fontFamily: 'var(--font-mono)'
              }}
            >
              1900 6868
            </span>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            style={{
              padding: '5px 11px',
              borderRadius: '8px',
              background: 'var(--surface-card)',
              border: '1.5px solid var(--border-default)',
              color: 'var(--ink-primary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              fontWeight: 700,
              boxShadow: 'var(--shadow-xs)',
              transition: 'all 0.15s ease'
            }}
            title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          >
            {theme === 'dark' ? (
              <>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                </svg>
                <span>Sáng</span>
              </>
            ) : (
              <>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                <span>Tối</span>
              </>
            )}
          </button>
        </div>

        {/* Center Command Card */}
        <div className="ruo-auth-command-card">
          {/* Segmented Tab Switcher */}
          <div className="ruo-auth-segmented-tabs">
            <button
              type="button"
              className={`ruo-auth-seg-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
            >
              <Icons.Key size={13} />
              <span>Đăng Nhập</span>
            </button>
            <button
              type="button"
              className={`ruo-auth-seg-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
            >
              <Icons.User size={13} />
              <span>Đăng Ký Tài Khoản</span>
            </button>
          </div>

          {/* Global Status Banner */}
          {successMsg && (
            <div
              style={{
                marginBottom: '10px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'var(--status-active-bg)',
                border: '1.5px solid var(--status-active-border)',
                color: 'var(--status-active-color)',
                fontSize: '11.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '7px'
              }}
            >
              <Icons.CheckCircle
                size={15}
                color="var(--status-active-color)"
                style={{ flexShrink: 0 }}
              />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div
              className="ruo-shake"
              style={{
                marginBottom: '10px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'var(--status-overdue-bg)',
                border: '1.5px solid var(--status-overdue-border)',
                color: 'var(--status-overdue-color)',
                fontSize: '11.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '7px'
              }}
            >
              <Icons.Shield
                size={15}
                color="var(--status-overdue-color)"
                style={{ flexShrink: 0 }}
              />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Active Form View */}
          {activeTab === 'login' ? (
            <LoginForm
              identifier={identifier}
              setIdentifier={(val) => {
                setIdentifier(val);
                if (errorMsg) setErrorMsg(null);
              }}
              password={password}
              setPassword={(val) => {
                setPassword(val);
                if (errorMsg) setErrorMsg(null);
              }}
              loading={loading}
              lockoutData={lockoutData}
              attemptsLeft={attemptsLeft}
              isLight={isLight}
              onSubmit={handleLoginSubmit}
              onOpenForgotPassword={() => setIsForgotPasswordOpen(true)}
              onSwitchToRegister={() => {
                setActiveTab('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
            />
          ) : (
            <RegisterForm
              loading={loading}
              setLoading={setLoading}
              register={register}
              checkDuplicate={checkDuplicate}
              toast={toast}
              onLoginSuccess={onLoginSuccess}
              onSuccessSwitchToLogin={(prefillIdentifier, msg) => {
                setIdentifier(prefillIdentifier);
                setActiveTab('login');
                setErrorMsg(null);
                setSuccessMsg(msg);
              }}
              onSwitchToLogin={() => {
                setActiveTab('login');
                setErrorMsg(null);
              }}
              setErrorMsg={setErrorMsg}
              setSuccessMsg={setSuccessMsg}
            />
          )}

          {/* Compact 1-Line Security Footer */}
          <div
            style={{
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px solid var(--border-subtle)',
              textAlign: 'center',
              fontSize: '10.5px',
              color: 'var(--ink-muted)',
              lineHeight: 1.35
            }}
          >
            Bảo mật phiên bằng JWT & chuỗi kiểm toán bất biến SHA-256 theo ma trận RBAC.
          </div>
        </div>

        {/* Bottom Copyright */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '10.5px',
            color: 'var(--ink-muted)',
            flexShrink: 0,
            fontWeight: 600
          }}
        >
          RUO UEMS v3.0 • Phòng Hành Chính - Quản Trị • Bản quyền 2026
        </div>
      </section>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </div>
  );
};
