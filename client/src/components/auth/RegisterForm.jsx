import React, { useState, useMemo } from 'react';
import { Icons } from '../common/SvgIcons';

const ROLE_OPTIONS = [
  { id: 'lecturer', label: 'Giảng Viên', requiresApproval: false },
  { id: 'technician', label: 'Kỹ Thuật Viên', requiresApproval: true },
  { id: 'facility_manager', label: 'Quản Lý CSVC', requiresApproval: true }
];

const DEPARTMENTS = [
  { value: 'Khoa Công nghệ Thông tin', label: 'Khoa CNTT' },
  { value: 'Khoa Điện tử - Viễn thông', label: 'Khoa Điện tử - VT' },
  { value: 'Viện Kinh tế & Quản lý', label: 'Viện Kinh tế & QL' },
  { value: 'Khoa Cơ khí & Kỹ thuật', label: 'Khoa Cơ khí' },
  { value: 'Khoa Ngoại ngữ & Sư phạm', label: 'Khoa Ngoại ngữ' },
  { value: 'Phòng Hành Chính Quản Trị', label: 'Phòng HC-QT' },
  { value: 'Phòng Quản Trị Thiết Bị', label: 'Phòng Quản Trị TB' }
];

export const RegisterForm = ({
  loading,
  setLoading,
  register,
  checkDuplicate,
  toast,
  onSuccessSwitchToLogin,
  onLoginSuccess,
  onSwitchToLogin,
  setErrorMsg,
  setSuccessMsg
}) => {
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

  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);
  const [regErrors, setRegErrors] = useState({});
  const [regTouched, setRegTouched] = useState({});

  const regPasswordCriteria = useMemo(
    () => ({
      minLength: regPassword.length >= 8,
      hasUpper: /[A-Z]/.test(regPassword),
      hasLower: /[a-z]/.test(regPassword),
      hasNumber: /\d/.test(regPassword),
      hasSpecial: /[^a-zA-Z\d\s]/.test(regPassword),
      isMatching: regPassword.length > 0 && regPassword === regConfirmPassword
    }),
    [regPassword, regConfirmPassword]
  );

  const strengthCount = useMemo(() => {
    return Object.values(regPasswordCriteria).filter(Boolean).length;
  }, [regPasswordCriteria]);

  const validateRegField = (name, value, allValues = {}) => {
    switch (name) {
      case 'fullName': {
        const val = String(value || '').trim();
        if (!val) return 'Họ và tên là bắt buộc.';
        if (val.length < 2) return 'Tối thiểu 2 ký tự.';
        return '';
      }
      case 'email': {
        const val = String(value || '').trim();
        if (!val) return 'Email là bắt buộc.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Email không đúng định dạng.';
        return '';
      }
      case 'employeeCode': {
        const val = String(value || '').trim();
        if (!val) return 'Mã cán bộ là bắt buộc.';
        if (val.length < 3) return 'Tối thiểu 3 ký tự.';
        return '';
      }
      case 'password': {
        const val = String(value || '');
        if (!val) return 'Mật khẩu là bắt buộc.';
        if (val.length < 8) return 'Tối thiểu 8 ký tự.';
        return '';
      }
      case 'confirmPassword': {
        const val = String(value || '');
        const target = allValues.password !== undefined ? allValues.password : regPassword;
        if (!val) return 'Vui lòng xác nhận mật khẩu.';
        if (val !== target) return 'Mật khẩu không khớp.';
        return '';
      }
      case 'agreed': {
        if (!value) return 'Vui lòng đồng ý với Quy chế sử dụng CSVC.';
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
      setRegErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleFieldBlur = async (field, value) => {
    setRegTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateRegField(field, value, {
      password: field === 'password' ? value : regPassword,
      confirmPassword: field === 'confirmPassword' ? value : regConfirmPassword
    });
    setRegErrors((prev) => ({ ...prev, [field]: err }));

    if (!err && field === 'email' && value.trim()) {
      try {
        setCheckingEmail(true);
        const dupRes = await checkDuplicate({ email: value.trim() });
        if (dupRes && dupRes.emailExists) {
          setRegErrors((prev) => ({
            ...prev,
            email: 'Email này đã tồn tại trong hệ thống.'
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
          setRegErrors((prev) => ({
            ...prev,
            employeeCode: 'Mã cán bộ này đã tồn tại.'
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
      confirmPassword: validateRegField('confirmPassword', regConfirmPassword, {
        password: regPassword
      }),
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
          const pendingNotice =
            res.message ||
            'Đăng ký thành công! Hồ sơ của bạn đã được chuyển tới Ban Quản Trị (Admin) để phê duyệt bổ nhiệm chức vụ.';
          setSuccessMsg(pendingNotice);
          toast.info(pendingNotice, 'Hồ Sơ Đang Chờ Duyệt');
          setTimeout(() => {
            onSuccessSwitchToLogin(
              regEmail.trim(),
              'Hồ sơ đăng ký đã gửi thành công! Vui lòng đợi Ban Quản Trị (Admin) phê duyệt chức vụ trước khi đăng nhập.'
            );
          }, 1800);
        } else {
          setSuccessMsg(res.message || 'Đăng ký tài khoản thành công! Đang chuyển hướng...');
          toast.success(
            res.message || `Đăng ký thành công! Chào mừng ${regFullName.trim()}`,
            'Đăng Ký Thành Công'
          );
          setTimeout(() => {
            if (onLoginSuccess) {
              onLoginSuccess();
            }
          }, 600);
        }
      } else {
        const msg = res?.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.';
        setErrorMsg(msg);

        const isEmailDup =
          res?.duplicateField === 'email' ||
          res?.errorType === 'DUPLICATE_EMAIL' ||
          msg.toLowerCase().includes('email');
        const isCodeDup =
          res?.duplicateField === 'employeeCode' ||
          res?.duplicateField === 'both' ||
          res?.errorType === 'DUPLICATE_CODE' ||
          msg.toLowerCase().includes('mã');

        if (isEmailDup) {
          setRegTouched((prev) => ({ ...prev, email: true }));
          setRegErrors((prev) => ({ ...prev, email: msg }));
        }
        if (isCodeDup) {
          setRegTouched((prev) => ({ ...prev, employeeCode: true }));
          setRegErrors((prev) => ({ ...prev, employeeCode: msg }));
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
    <div className="ruo-view-enter">
      {/* Header Title */}
      <div style={{ marginBottom: '10px' }}>
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
            Đăng Ký Tài Khoản Cán Bộ
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
            UC-1.0 • UC-10.7
          </span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--ink-secondary)', margin: 0, lineHeight: 1.4 }}>
          Khởi tạo định danh cán bộ để tham gia quản lý, đề xuất & báo hỏng CSVC
        </p>
      </div>

      <form onSubmit={handleRegister} noValidate>
        {/* Row 1: Họ và tên + Đơn vị / Khoa */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.15fr 0.85fr',
            gap: '8px',
            marginBottom: '9px'
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--ink-primary)',
                marginBottom: '3px'
              }}
            >
              Họ và tên đầy đủ *
            </label>
            <div className="ruo-auth-input-wrap">
              <span className="ruo-auth-input-icon">
                <Icons.User size={14} />
              </span>
              <input
                type="text"
                className={`ruo-auth-input ${
                  regTouched.fullName && regErrors.fullName ? 'has-error' : ''
                }`}
                value={regFullName}
                onChange={(e) => {
                  setRegFullName(e.target.value);
                  handleFieldChange('fullName', e.target.value);
                }}
                onBlur={(e) => handleFieldBlur('fullName', e.target.value)}
                placeholder="Nguyễn Văn An"
                required
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--ink-primary)',
                marginBottom: '3px'
              }}
            >
              Đơn vị / Khoa / Viện
            </label>
            <select
              value={regDepartment}
              onChange={(e) => setRegDepartment(e.target.value)}
              className="ruo-auth-input"
              style={{ paddingLeft: '10px', cursor: 'pointer' }}
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept.value} value={dept.value}>
                  {dept.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Email công vụ & Mã cán bộ / MSSV */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.15fr 0.85fr',
            gap: '8px',
            marginBottom: '9px'
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '3px'
              }}
            >
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                Email công vụ *
              </label>
              {checkingEmail && (
                <span style={{ fontSize: '10px', color: 'var(--blueprint-500)', fontWeight: 700 }}>
                  Kiểm tra...
                </span>
              )}
            </div>
            <div className="ruo-auth-input-wrap">
              <span className="ruo-auth-input-icon">
                <Icons.Mail size={14} />
              </span>
              <input
                type="email"
                className={`ruo-auth-input ${
                  regTouched.email && regErrors.email ? 'has-error' : ''
                }`}
                value={regEmail}
                onChange={(e) => {
                  setRegEmail(e.target.value);
                  handleFieldChange('email', e.target.value);
                }}
                onBlur={(e) => handleFieldBlur('email', e.target.value)}
                placeholder="an.nv@ruo.edu.vn"
                required
              />
            </div>
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '3px'
              }}
            >
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-primary)' }}>
                Mã cán bộ / MSSV *
              </label>
              {checkingCode && (
                <span style={{ fontSize: '10px', color: 'var(--blueprint-500)', fontWeight: 700 }}>
                  Kiểm tra...
                </span>
              )}
            </div>
            <div className="ruo-auth-input-wrap">
              <span className="ruo-auth-input-icon">
                <Icons.Key size={14} />
              </span>
              <input
                type="text"
                className={`ruo-auth-input ${
                  regTouched.employeeCode && regErrors.employeeCode ? 'has-error' : ''
                }`}
                value={regEmployeeCode}
                onChange={(e) => {
                  setRegEmployeeCode(e.target.value);
                  handleFieldChange('employeeCode', e.target.value);
                }}
                onBlur={(e) => handleFieldBlur('employeeCode', e.target.value)}
                placeholder="GV202601"
                required
              />
            </div>
          </div>
        </div>

        {/* Row 3: Vai trò hệ thống (UC-10.7 Role Request) */}
        <div style={{ marginBottom: '9px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px'
            }}
          >
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-primary)' }}>
              Vai trò đăng ký bổ nhiệm *
            </label>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color:
                  regRole === 'lecturer'
                    ? '#10B981'
                    : 'var(--status-repairing-color)'
              }}
            >
              {regRole === 'lecturer'
                ? '✓ Kích hoạt tự động'
                : '⏳ Cần BGH (Admin) duyệt bổ nhiệm'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {ROLE_OPTIONS.map((opt) => {
              const active = regRole === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRegRole(opt.id)}
                  style={{
                    padding: '6.5px 6px',
                    borderRadius: '7px',
                    border: `${active ? '2px' : '1.5px'} solid ${
                      active ? 'var(--blueprint-500)' : 'var(--border-default)'
                    }`,
                    background: active ? 'rgba(62, 123, 250, 0.12)' : 'var(--surface-2)',
                    color: active ? 'var(--blueprint-500)' : 'var(--ink-secondary)',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 4: Mật khẩu & Xác nhận lại */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '8px'
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--ink-primary)',
                marginBottom: '3px'
              }}
            >
              Mật khẩu mới *
            </label>
            <div className="ruo-auth-input-wrap">
              <span className="ruo-auth-input-icon">
                <Icons.Lock size={14} />
              </span>
              <input
                type={regShowPassword ? 'text' : 'password'}
                className={`ruo-auth-input ${
                  regTouched.password && regErrors.password ? 'has-error' : ''
                }`}
                style={{ paddingRight: '32px' }}
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
                  right: '9px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--ink-muted)',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {regShowPassword ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--ink-primary)',
                marginBottom: '3px'
              }}
            >
              Xác nhận lại *
            </label>
            <div className="ruo-auth-input-wrap">
              <span className="ruo-auth-input-icon">
                <Icons.Lock size={14} />
              </span>
              <input
                type={regShowConfirmPassword ? 'text' : 'password'}
                className={`ruo-auth-input ${
                  regTouched.confirmPassword && regErrors.confirmPassword ? 'has-error' : ''
                }`}
                style={{ paddingRight: '32px' }}
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
                  right: '9px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--ink-muted)',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {regShowConfirmPassword ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Fixed-Height Compact Password Criteria Bar (Zero Layout Shift) */}
        <div
          style={{
            marginBottom: '10px',
            padding: '6px 10px',
            background: 'var(--surface-2)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
            flexWrap: 'wrap'
          }}
        >
          {[
            { ok: regPasswordCriteria.minLength, label: '≥8 ký tự' },
            { ok: regPasswordCriteria.hasUpper, label: 'A-Z' },
            { ok: regPasswordCriteria.hasLower, label: 'a-z' },
            { ok: regPasswordCriteria.hasNumber, label: '0-9' },
            { ok: regPasswordCriteria.hasSpecial, label: '@#$' },
            { ok: regPasswordCriteria.isMatching, label: 'Khớp MK' }
          ].map((item) => (
            <span
              key={item.label}
              style={{
                color: item.ok ? '#10B981' : 'var(--ink-muted)',
                fontWeight: item.ok ? 800 : 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <span>{item.ok ? '✓' : '•'}</span>
              <span>{item.label}</span>
            </span>
          ))}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              color: strengthCount === 6 ? '#10B981' : 'var(--blueprint-500)'
            }}
          >
            {strengthCount}/6
          </span>
        </div>

        {/* Row 5: Cam kết quy chế */}
        <div style={{ marginBottom: '12px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              cursor: 'pointer',
              fontSize: '11.5px',
              color: 'var(--ink-secondary)',
              lineHeight: 1.35,
              fontWeight: 500
            }}
          >
            <input
              type="checkbox"
              checked={regAgreed}
              onChange={(e) => {
                setRegAgreed(e.target.checked);
                handleFieldChange('agreed', e.target.checked);
              }}
              style={{
                width: '14px',
                height: '14px',
                accentColor: 'var(--blueprint-600)',
                cursor: 'pointer',
                flexShrink: 0
              }}
            />
            <span>Tôi cam kết tuân thủ Quy chế quản lý & sử dụng cơ sở vật chất của Nhà trường.</span>
          </label>
        </div>

        {/* Submit Button */}
        <button type="submit" className="ruo-auth-submit-btn" disabled={loading}>
          <span>{loading ? 'Đang khởi tạo hồ sơ...' : 'Tạo Tài Khoản & Gia Nhập Hệ Thống'}</span>
          <Icons.ArrowRight size={15} />
        </button>

        {/* Switch back to login link */}
        <div
          style={{
            marginTop: '10px',
            textAlign: 'center',
            fontSize: '12px',
            color: 'var(--ink-secondary)'
          }}
        >
          Đã có tài khoản cán bộ?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--blueprint-500)',
              fontWeight: 800,
              cursor: 'pointer',
              padding: 0
            }}
          >
            ← Đăng nhập ngay
          </button>
        </div>
      </form>
    </div>
  );
};
