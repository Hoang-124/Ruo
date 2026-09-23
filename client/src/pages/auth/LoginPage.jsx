import React, { useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useAuth } from '../../context/AuthContext';
import { ForgotPasswordModal } from '../../components/ui/ForgotPasswordModal';
import { Building3DCanvas } from '../../components/common/Building3DCanvas';

export const LoginPage = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('hoang.tb220412@university.edu.vn');
  const [password, setPassword] = useState('Ruo@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Handle standard login form submit (UC-1.1)
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
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

  return (
    <div className="ruo-login-container">
      {/* ====================================================================
          LEFT 58%: INTERACTIVE 3D ARCHITECTURAL DIGITAL TWIN (TÒA NHÀ A1)
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
          RIGHT 42%: CLEAN INSTITUTIONAL AUTHENTICATION TERMINAL
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
            maxWidth: '460px',
            padding: '42px 40px',
            borderRadius: '20px',
            background: 'rgba(11, 15, 25, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            position: 'relative',
            zIndex: 2
          }}
        >
          {/* Card Header */}
          <div style={{ marginBottom: '28px' }}>
            <h2
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                margin: 0
              }}
            >
              Đăng nhập tài khoản
            </h2>
            <p
              style={{
                fontSize: '13.5px',
                color: '#94A3B8',
                marginTop: '6px',
                lineHeight: 1.5
              }}
            >
              Cổng dịch vụ quản trị cơ sở vật chất dành cho Cán bộ & Sinh viên
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div
              style={{
                marginBottom: '20px',
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

          {/* Login Form (UC-1.1) */}
          <form onSubmit={handleLogin}>
            {/* Input 1: Identifier */}
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
            <div style={{ marginBottom: '20px' }}>
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
                marginBottom: '26px',
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
          </form>

          {/* Institutional Trust Stamp */}
          <div
            style={{
              marginTop: '28px',
              paddingTop: '20px',
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
        }}
      />
    </div>
  );
};
