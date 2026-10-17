import React, { useState, useMemo } from 'react';
import { Icons } from '../common/SvgIcons';

export const DEMO_ACCOUNTS = [
  {
    role: 'admin',
    roleLabel: 'Admin BGH',
    email: 'admin@ruo.edu.vn',
    code: 'AD001',
    desc: 'Toàn quyền cấu hình Ma trận RBAC, duyệt thanh lý BGH & sổ cái SHA-256',
    color: '#EF4444',
    lightColor: '#B91C1C',
    lightBg: '#FEF2F2',
    lightBorder: '#FCA5A5',
    darkBg: 'rgba(239, 68, 68, 0.14)',
    darkBorder: 'rgba(239, 68, 68, 0.45)'
  },
  {
    role: 'facility_manager',
    roleLabel: 'Quản Lý CSVC',
    email: 'manager@ruo.edu.vn',
    code: 'QL001',
    desc: 'Điều phối Kanban SLA, duyệt điều chuyển, kiểm kê & đề xuất thanh lý R ≥ 60%',
    color: '#F59E0B',
    lightColor: '#B45309',
    lightBg: '#FFFBEB',
    lightBorder: '#FCD34D',
    darkBg: 'rgba(245, 158, 11, 0.14)',
    darkBorder: 'rgba(245, 158, 11, 0.45)'
  },
  {
    role: 'technician',
    roleLabel: 'Kỹ Thuật Viên',
    email: 'technician@ruo.edu.vn',
    code: 'KT001',
    desc: 'Tiếp nhận ca sửa chữa, ghi linh kiện, thực thi điều chuyển & quét QR thực địa',
    color: '#0EA5E9',
    lightColor: '#0369A1',
    lightBg: '#F0F9FF',
    lightBorder: '#7DD3FC',
    darkBg: 'rgba(14, 165, 233, 0.14)',
    darkBorder: 'rgba(14, 165, 233, 0.45)'
  },
  {
    role: 'lecturer',
    roleLabel: 'Giảng Viên',
    email: 'lecturer@ruo.edu.vn',
    code: 'GV001',
    desc: 'Tra cứu sơ đồ thiết bị phòng học, gửi báo hỏng tại chỗ & đánh giá 1–5 sao',
    color: '#10B981',
    lightColor: '#047857',
    lightBg: '#ECFDF5',
    lightBorder: '#6EE7B7',
    darkBg: 'rgba(16, 185, 129, 0.14)',
    darkBorder: 'rgba(16, 185, 129, 0.45)'
  }
];

export const LoginForm = ({
  identifier,
  setIdentifier,
  password,
  setPassword,
  loading,
  lockoutData,
  attemptsLeft,
  isLight,
  onSubmit,
  onOpenForgotPassword,
  onSwitchToRegister
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const selectedDemoAccount = useMemo(() => {
    const clean = String(identifier || '').trim().toLowerCase();
    return (
      DEMO_ACCOUNTS.find(
        (acc) => acc.email.toLowerCase() === clean || acc.code.toLowerCase() === clean
      ) || null
    );
  }, [identifier]);

  const handleQuickFill = (acc) => {
    setIdentifier(acc.email);
    setPassword('Ruo@2026');
  };

  return (
    <div className="ruo-view-enter">
      {/* Header Title */}
      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '2px'
          }}
        >
          <h2
            style={{
              fontSize: '18.5px',
              fontWeight: 800,
              color: 'var(--ink-primary)',
              margin: 0,
              letterSpacing: '-0.015em'
            }}
          >
            Đăng Nhập Vận Hành
          </h2>
          <span
            style={{
              padding: '2.5px 8px',
              borderRadius: '6px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--blueprint-500)'
            }}
          >
            RBAC 4 VAI TRÒ
          </span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--ink-secondary)', margin: 0, lineHeight: 1.4 }}>
          Cổng quản lý tài sản, trang thiết bị & chuỗi cung ứng cơ sở vật chất Tòa A1
        </p>
      </div>

      {/* UC-1.1 Brute-Force Lockout Banner (15-Minute Temporary Lock) */}
      {lockoutData?.isLocked && (
        <div
          className="ruo-shake"
          style={{
            marginBottom: '10px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'var(--status-overdue-bg)',
            border: '1.5px solid var(--status-overdue-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Icons.Lock size={16} color="var(--status-overdue-color)" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '11.5px', color: 'var(--ink-secondary)', lineHeight: 1.35 }}>
            <strong style={{ color: 'var(--status-overdue-color)' }}>
              Tạm khóa ({lockoutData.remainingMinutes} phút):
            </strong>{' '}
            Nhập sai mật khẩu 5 lần liên tiếp.
          </div>
        </div>
      )}

      {/* Warning: Attempts remaining before lockout */}
      {!lockoutData?.isLocked && attemptsLeft !== null && attemptsLeft > 0 && attemptsLeft < 5 && (
        <div
          style={{
            marginBottom: '10px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'var(--status-repairing-bg)',
            border: '1.5px solid var(--status-repairing-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--status-repairing-color)'
          }}
        >
          <Icons.AlertTriangle
            size={15}
            color="var(--status-repairing-color)"
            style={{ flexShrink: 0 }}
          />
          <div style={{ fontSize: '11.5px', fontWeight: 700 }}>
            Cảnh báo: Còn <strong>{attemptsLeft}</strong> lần thử trước khi khóa tạm 15 phút.
          </div>
        </div>
      )}

      {/* Quick Fill Demo Accounts Matrix (4 Canonical Roles - Zero Layout Shift) */}
      <div
        style={{
          marginBottom: '12px',
          padding: '10px 12px',
          background: 'var(--surface-2)',
          borderRadius: '10px',
          border: '1.5px solid var(--border-subtle)'
        }}
      >
        <div
          style={{
            fontSize: '10px',
            fontWeight: 800,
            color: 'var(--ink-muted)',
            marginBottom: '7px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>Chọn Nhanh Vai Trò Mẫu (1-Click):</span>
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--blueprint-500)',
              fontWeight: 800
            }}
          >
            MK: Ruo@2026
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          {DEMO_ACCOUNTS.map((acc) => {
            const isSelected = selectedDemoAccount?.role === acc.role;
            const textColor = isLight ? acc.lightColor : acc.color;
            const cardBg = isLight ? acc.lightBg : acc.darkBg;
            const borderColor = isSelected
              ? acc.color
              : isLight
                ? acc.lightBorder
                : acc.darkBorder;

            return (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleQuickFill(acc)}
                className={`ruo-role-quick-card ${isSelected ? 'selected' : ''}`}
                style={{
                  background: cardBg,
                  border: `${isSelected ? '2px' : '1.5px'} solid ${borderColor}`,
                  color: textColor,
                  boxShadow: isSelected ? `0 3px 10px ${acc.color}33` : 'none'
                }}
                title={acc.desc}
              >
                {isSelected && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: acc.color,
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '8.5px',
                      fontWeight: 900,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.25)'
                    }}
                  >
                    ✓
                  </span>
                )}
                <div
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {acc.roleLabel}
                </div>
                <div
                  style={{
                    fontSize: '9.5px',
                    opacity: 0.92,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    marginTop: '1px'
                  }}
                >
                  {acc.code}
                </div>
              </button>
            );
          })}
        </div>

        {/* Fixed-Height 1-Line Role Capability Strip (Never shifts page height) */}
        <div
          style={{
            marginTop: '7px',
            paddingTop: '6px',
            borderTop: '1px dashed var(--border-subtle)',
            fontSize: '10.5px',
            color: 'var(--ink-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            height: '16px',
            overflow: 'hidden'
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: selectedDemoAccount ? selectedDemoAccount.color : 'var(--blueprint-500)',
              flexShrink: 0
            }}
          />
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {selectedDemoAccount ? (
              <>
                <strong style={{ color: 'var(--ink-primary)' }}>
                  {selectedDemoAccount.roleLabel}:
                </strong>{' '}
                {selectedDemoAccount.desc}
              </>
            ) : (
              'Nhấn vào một vai trò ở trên để tự động điền tài khoản và mật khẩu mẫu.'
            )}
          </span>
        </div>
      </div>

      {/* Main Login Form */}
      <form onSubmit={onSubmit}>
        {/* Field 1: Email or Employee Code */}
        <div style={{ marginBottom: '11px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--ink-primary)',
              marginBottom: '4px'
            }}
          >
            Email công vụ hoặc Mã cán bộ
          </label>
          <div className="ruo-auth-input-wrap">
            <span className="ruo-auth-input-icon">
              <Icons.Mail size={15} />
            </span>
            <input
              type="text"
              className="ruo-auth-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. admin@ruo.edu.vn hoặc AD001"
              disabled={loading || lockoutData?.isLocked}
              required
            />
          </div>
        </div>

        {/* Field 2: Password */}
        <div style={{ marginBottom: '11px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--ink-primary)',
              marginBottom: '4px'
            }}
          >
            Mật khẩu hệ thống
          </label>
          <div className="ruo-auth-input-wrap">
            <span className="ruo-auth-input-icon">
              <Icons.Lock size={15} />
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              className="ruo-auth-input"
              style={{ paddingRight: '36px' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading || lockoutData?.isLocked}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '11px',
                color: 'var(--ink-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center'
              }}
              title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <Icons.EyeOff size={15} /> : <Icons.Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Remember & Forgot Password */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            fontSize: '12px'
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              cursor: 'pointer',
              color: 'var(--ink-secondary)',
              fontWeight: 600
            }}
          >
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                width: '14px',
                height: '14px',
                accentColor: 'var(--blueprint-600)',
                cursor: 'pointer'
              }}
            />
            <span>Ghi nhớ phiên 7 ngày</span>
          </label>
          <button
            type="button"
            onClick={onOpenForgotPassword}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'var(--blueprint-500)',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Quên mật khẩu?
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="ruo-auth-submit-btn"
          disabled={loading || lockoutData?.isLocked}
        >
          <span>
            {lockoutData?.isLocked
              ? `Tài khoản tạm khóa (${lockoutData.remainingMinutes}m)`
              : loading
                ? 'Đang xác thực bảo mật...'
                : 'Đăng Nhập Vào Hệ Thống'}
          </span>
          <Icons.ArrowRight size={15} />
        </button>

        {/* Compact 1-Line Temporary Password Notice */}
        <div
          style={{
            marginTop: '10px',
            padding: '7px 10px',
            borderRadius: '8px',
            background: 'var(--surface-2)',
            border: '1px dashed var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            fontSize: '11px',
            color: 'var(--ink-secondary)',
            lineHeight: 1.35
          }}
        >
          <Icons.Key size={13} color="var(--blueprint-500)" style={{ flexShrink: 0 }} />
          <span>
            <strong>Chính sách bảo mật:</strong> Tài khoản dùng mật khẩu tạm sẽ tự động mở hộp thoại đổi mật khẩu lần đầu.
          </span>
        </div>
      </form>

      {/* Switch to Register */}
      <div
        style={{
          marginTop: '12px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--ink-secondary)'
        }}
      >
        Chưa có tài khoản cán bộ?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--blueprint-500)',
            fontWeight: 800,
            cursor: 'pointer',
            padding: 0
          }}
        >
          Đăng ký tài khoản mới →
        </button>
      </div>
    </div>
  );
};
