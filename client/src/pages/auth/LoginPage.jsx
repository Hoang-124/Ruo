import React, { useState } from 'react';
import { Icons } from '../../components/common/SvgIcons';
import { useAuth } from '../../context/AuthContext';

export const LoginPage = ({ onLoginSuccess }) => {
  const { switchRole } = useAuth();
  const [email, setEmail] = useState('hoang.tb220412@university.edu.vn');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleLogin = (e) => {
    e.preventDefault();
    if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  const handleQuickLogin = (roleKey, roleEmail) => {
    switchRole(roleKey);
    setEmail(roleEmail);
    if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--bg-page)'
      }}
    >
      {/* Left 50%: Hero Campus Graphic */}
      <div
        style={{
          flex: 1,
          background: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 50%, #047857 100%)',
          color: 'white',
          padding: '60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle Background Glow */}
        <div
          style={{
            position: 'absolute',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(0,0,0,0) 70%)',
            top: '-50px',
            left: '-50px'
          }}
        />

        {/* Top Logo & Title */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-lg)',
                background: '#FFFFFF',
                color: '#1E3A8A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              <Icons.Building size={26} color="#1E3A8A" />
            </div>
            <div>
              <span style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px' }}>RUO</span>
              <span style={{ display: 'block', fontSize: '11px', opacity: 0.8, letterSpacing: '0.8px', fontWeight: 600 }}>
                HỆ THỐNG QUẢN LÝ CƠ SỞ VẬT CHẤT ĐẠI HỌC
              </span>
            </div>
          </div>
          <div style={{ fontSize: '15px', opacity: 0.9, fontWeight: 500 }}>
            Quản lý thông minh — Khuôn viên hiện đại
          </div>
        </div>

        {/* Center Vector Graphics (Pure SVG Campus Art) */}
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', margin: '40px 0' }}>
          <svg viewBox="0 0 500 300" style={{ width: '100%', maxWidth: '420px', margin: '0 auto', display: 'block' }}>
            {/* Campus ground */}
            <path d="M20 250 Q250 220 480 250 L480 300 L20 300 Z" fill="rgba(255,255,255,0.08)" />
            {/* Academic Hall Silhouette */}
            <rect x="160" y="90" width="180" height="150" rx="6" fill="rgba(255,255,255,0.2)" />
            {/* Roof pediment */}
            <polygon points="150,90 250,30 350,90" fill="rgba(255,255,255,0.3)" />
            {/* Columns */}
            <rect x="180" y="110" width="16" height="130" fill="rgba(255,255,255,0.4)" rx="2" />
            <rect x="215" y="110" width="16" height="130" fill="rgba(255,255,255,0.4)" rx="2" />
            <rect x="265" y="110" width="16" height="130" fill="rgba(255,255,255,0.4)" rx="2" />
            <rect x="300" y="110" width="16" height="130" fill="rgba(255,255,255,0.4)" rx="2" />
            {/* Clock tower / dome */}
            <circle cx="250" cy="70" r="14" fill="#FFFFFF" />
            <circle cx="250" cy="70" r="10" fill="none" stroke="#1E3A8A" strokeWidth="2" />
            {/* Trees */}
            <circle cx="100" cy="210" r="35" fill="#10B981" opacity="0.85" />
            <rect x="95" y="225" width="10" height="40" fill="#064E3B" rx="2" />
            <circle cx="400" cy="210" r="35" fill="#10B981" opacity="0.85" />
            <rect x="395" y="225" width="10" height="40" fill="#064E3B" rx="2" />
          </svg>

          <h2 style={{ fontSize: '22px', fontWeight: 800, marginTop: '20px' }}>
            Hệ Thống Quản Trị Cơ Sở Vật Chất Đại Học
          </h2>
          <p style={{ fontSize: '13px', opacity: 0.85, maxWidth: '440px', margin: '8px auto 0', lineHeight: 1.5 }}>
            Tích hợp thuật toán CSP xếp phòng học kỳ, quản lý vòng đời thiết bị, theo dõi cam kết SLA sửa chữa và phân quyền đa cấp minh bạch.
          </p>
        </div>

        {/* Footer info */}
        <div style={{ position: 'relative', zIndex: 2, fontSize: '12px', opacity: 0.75 }}>
          © 2026 Đồ Án Tốt Nghiệp Đại Học • Nhóm 5 Thành Viên • 95 Use Cases
        </div>
      </div>

      {/* Right 50%: Login Form & Quick Persona Chooser */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
          background: 'var(--bg-page)'
        }}
      >
        <div
          className="card"
          style={{
            width: '100%',
            maxWidth: '480px',
            padding: '40px',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-xl)'
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Đăng nhập tài khoản
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Sử dụng email định danh nhà trường (@university.edu.vn)
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email trường</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }}>
                  <Icons.Mail size={18} />
                </span>
                <input
                  type="email"
                  className="form-control"
                  style={{ paddingLeft: '40px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hoang.tb220412@university.edu.vn"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }}>
                  <Icons.Lock size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  style={{ paddingLeft: '40px', paddingRight: '40px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-muted)' }}
                >
                  <Icons.Eye size={18} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', fontSize: '13px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary-600)' }}
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>

              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Vui lòng kiểm tra email trường để nhận mã OTP khôi phục mật khẩu!'); }} style={{ color: 'var(--color-primary-600)', fontWeight: 600 }}>
                Quên mật khẩu?
              </a>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginBottom: '16px' }}>
              <span>Đăng Nhập Vào Hệ Thống</span>
              <Icons.ArrowRight size={18} />
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '10px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>HOẶC ĐĂNG NHẬP NHANH BẰNG VAI TRÒ DEMO</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          </div>

          {/* Quick Persona Demo Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleQuickLogin('student', 'hoang.tb220412@university.edu.vn')}
              title="Vào vai Sinh viên"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Icons.AcademicCap size={14} />
              <span>Sinh Viên</span>
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleQuickLogin('lecturer', 'nam.nv@university.edu.vn')}
              title="Vào vai Giảng viên"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Icons.User size={14} />
              <span>Giảng Viên</span>
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleQuickLogin('facility_staff', 'mai.lt@university.edu.vn')}
              title="Vào vai QL CSVC"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Icons.Building size={14} />
              <span>QL CSVC</span>
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleQuickLogin('maintenance', 'hung.pv@university.edu.vn')}
              title="Vào vai Kỹ thuật viên"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Icons.Wrench size={14} />
              <span>Kỹ Thuật</span>
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleQuickLogin('academic_affairs', 'dung.hq@university.edu.vn')}
              title="Vào vai Phòng Đào tạo"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Icons.Calendar size={14} />
              <span>P. Đào Tạo</span>
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleQuickLogin('admin', 'admin@university.edu.vn')}
              title="Vào vai System Admin"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Icons.Shield size={14} />
              <span>Admin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
