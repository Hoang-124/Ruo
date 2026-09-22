import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { USERS, NOTIFICATIONS as initialNotifs } from '../mock/mockData';

const AuthContext = createContext();

const API_BASE_URL = 'http://localhost:5000/api/auth';

// Helper utility: freeze transitions during theme switch to prevent GPU stutter / dropped frames
const freezeTransitionsTemporarily = () => {
  const css = document.createElement('style');
  css.setAttribute('id', 'ruo-theme-transition-lock');
  css.appendChild(
    document.createTextNode(
      `*, *::before, *::after {
        -webkit-transition: none !important;
        -moz-transition: none !important;
        -o-transition: none !important;
        -ms-transition: none !important;
        transition: none !important;
      }`
    )
  );
  document.head.appendChild(css);

  return () => {
    (() => window.getComputedStyle(document.body).opacity)();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById('ruo-theme-transition-lock');
        if (el) el.remove();
      });
    });
  };
};

// Domain Actors & Role-Based Access Control (RBAC) Mapping
export const ROLE_PERMISSIONS = {
  student: {
    title: 'Sinh viên',
    desc: 'Tra cứu phòng học, xem lịch biểu, đặt phòng tự học/học nhóm, báo cáo sự cố CSVC',
    allowedTabs: ['dashboard', 'rooms', 'calendar']
  },
  lecturer: {
    title: 'Giảng viên',
    desc: 'Đăng ký phòng giảng dạy định kỳ (RFC-5545), mượn thiết bị di động, báo sự cố phòng học',
    allowedTabs: ['dashboard', 'rooms', 'calendar', 'equipments']
  },
  facility_staff: {
    title: 'Quản lý CSVC',
    desc: 'Duyệt đơn đặt phòng, phân công SLA kỹ thuật, kiểm kê kho thiết bị QR, lập hội đồng thanh lý (R ≥ 60%)',
    allowedTabs: ['dashboard', 'rooms', 'calendar', 'approvals', 'tickets_kanban', 'equipments', 'disposal_calc']
  },
  maintenance: {
    title: 'Kỹ thuật viên',
    desc: 'Tiếp nhận ticket sự cố, đếm ngược SLA sửa chữa, đánh giá kỹ thuật và đề xuất thanh lý máy hỏng',
    allowedTabs: ['dashboard', 'tickets_kanban', 'equipments', 'disposal_calc']
  },
  academic_affairs: {
    title: 'Phòng Đào tạo',
    desc: 'Xếp TKB tự động bằng giải thuật CSP (Backtracking + MRV + LCV), khóa lịch học toàn trường, duyệt ngoại lệ',
    allowedTabs: ['dashboard', 'rooms', 'calendar', 'csp_studio', 'approvals']
  },
  admin: {
    title: 'Quản trị viên (Admin)',
    desc: 'Toàn quyền điều hành, phân quyền 6 vai trò qua ma trận RBAC, tra cứu nhật ký kiểm toán SHA-256',
    allowedTabs: ['dashboard', 'rooms', 'calendar', 'approvals', 'tickets_kanban', 'csp_studio', 'equipments', 'disposal_calc', 'rbac', 'audit_log']
  }
};

export const AuthProvider = ({ children }) => {
  // Authentication Token State
  const [token, setToken] = useState(() => localStorage.getItem('ruo_token') || null);
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('ruo_refresh_token') || null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return Boolean(localStorage.getItem('ruo_token') || localStorage.getItem('ruo_is_logged_in') === 'true');
  });

  // Current active role key: student, lecturer, facility_staff, maintenance, academic_affairs, admin
  const [currentRoleKey, setCurrentRoleKey] = useState(() => {
    return localStorage.getItem('ruo_role') || localStorage.getItem('ufms_role') || 'student';
  });

  // Live profile details from Backend
  const [apiUser, setApiUser] = useState(null);

  // Dark/Light Theme (Default to Obsidian Dark Command Center)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ruo_theme') || localStorage.getItem('ufms_theme') || 'dark';
  });

  // Notifications
  const [notifications, setNotifications] = useState(initialNotifs);

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Sync role to localStorage
  useEffect(() => {
    localStorage.setItem('ruo_role', currentRoleKey);
  }, [currentRoleKey]);

  // Fetch real profile from backend when token changes
  const fetchProfile = useCallback(async (activeToken = token) => {
    if (!activeToken) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/me`, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setApiUser(data.user);
          if (data.user.role) {
            setCurrentRoleKey(data.user.role);
          }
          return data.user;
        }
      } else if (res.status === 401) {
        // Token expired or revoked
        setToken(null);
        setIsLoggedIn(false);
        localStorage.removeItem('ruo_token');
        localStorage.removeItem('ruo_refresh_token');
        localStorage.removeItem('ruo_is_logged_in');
      }
    } catch (err) {
      console.warn('[AuthContext] Backend offline or fetch error, operating in resilient mode:', err.message);
    }
    return null;
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    }
  }, [token, fetchProfile]);

  // UC-1.1: Login (Backend with Mock Fallback)
  const login = useCallback(async (identifier, password) => {
    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToken(data.token);
        setRefreshToken(data.refreshToken);
        setApiUser(data.user);
        setIsLoggedIn(true);
        if (data.user.role) {
          setCurrentRoleKey(data.user.role);
        }

        localStorage.setItem('ruo_token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('ruo_refresh_token', data.refreshToken);
        }
        localStorage.setItem('ruo_is_logged_in', 'true');

        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message || 'Thông tin đăng nhập không chính xác.' };
      }
    } catch (error) {
      console.warn('[AuthContext] Real backend login unreachable, falling back to mock authentication:', error.message);
      // Resilient demo fallback
      const foundRole = Object.keys(USERS).find(
        (key) => USERS[key].email.toLowerCase() === String(identifier).toLowerCase() ||
                 USERS[key].code.toLowerCase() === String(identifier).toLowerCase()
      );
      if (foundRole) {
        setCurrentRoleKey(foundRole);
        setIsLoggedIn(true);
        localStorage.setItem('ruo_is_logged_in', 'true');
        return { success: true, user: USERS[foundRole] };
      }
      return { success: false, message: 'Không thể kết nối đến máy chủ xác thực. Vui lòng kiểm tra cổng 5000.' };
    }
  }, []);

  // UC-1.2: Logout (Hủy token trên server & xóa client)
  const logout = useCallback(async (allDevices = false) => {
    try {
      if (token) {
        await fetch(`${API_BASE_URL}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ allDevices })
        });
      }
    } catch (err) {
      console.warn('[AuthContext] Logout remote call failed:', err.message);
    } finally {
      setToken(null);
      setRefreshToken(null);
      setApiUser(null);
      setIsLoggedIn(false);
      localStorage.removeItem('ruo_token');
      localStorage.removeItem('ruo_refresh_token');
      localStorage.removeItem('ruo_is_logged_in');
    }
  }, [token]);

  // UC-1.3: Forgot Password APIs
  const forgotPassword = useCallback(async (email) => {
    try {
      const res = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Lỗi mạng khi yêu cầu mã OTP khôi phục mật khẩu.' };
    }
  }, []);

  const verifyResetOtp = useCallback(async (email, otp) => {
    try {
      const res = await fetch(`${API_BASE_URL}/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Lỗi mạng khi xác thực mã OTP.' };
    }
  }, []);

  const resetPassword = useCallback(async (email, otp, newPassword) => {
    try {
      const res = await fetch(`${API_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Lỗi mạng khi đặt lại mật khẩu.' };
    }
  }, []);

  // UC-1.4: Change Password API
  const changePassword = useCallback(async (oldPassword, newPassword, logoutOtherDevices = true) => {
    if (!token) {
      return { success: false, message: 'Bạn chưa đăng nhập vào hệ thống.' };
    }
    try {
      const res = await fetch(`${API_BASE_URL}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword, logoutOtherDevices })
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Lỗi mạng khi thay đổi mật khẩu.' };
    }
  }, [token]);

  // UC-1.6: Update Profile API (SĐT, Avatar)
  const updateProfile = useCallback(async (phone, avatar) => {
    if (!token) {
      // Local fallback
      setApiUser(prev => ({ ...(prev || USERS[currentRoleKey]), phone, avatar }));
      return { success: true, message: 'Đã cập nhật thông tin thành công (chế độ cục bộ)!' };
    }
    try {
      const res = await fetch(`${API_BASE_URL}/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phone, avatar })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setApiUser(data.user);
        return { success: true, message: data.message || 'Cập nhật thông tin thành công!', user: data.user };
      }
      return { success: false, message: data.message || 'Không thể cập nhật hồ sơ.' };
    } catch (err) {
      return { success: false, message: 'Lỗi mạng khi gửi thông tin cập nhật hồ sơ.' };
    }
  }, [token, currentRoleKey]);

  const toggleTheme = useCallback(() => {
    const unlock = freezeTransitionsTemporarily();
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('ruo_theme', next);
      unlock();
      return next;
    });
  }, []);

  const switchRole = useCallback((roleKey) => {
    if (USERS[roleKey]) {
      setCurrentRoleKey(roleKey);
    }
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Merge backend user profile with mock data defaults to prevent any UI break
  const defaultMock = USERS[currentRoleKey] || USERS.student;
  const currentUser = useMemo(() => {
    if (!apiUser) return defaultMock;
    return {
      id: apiUser.id || defaultMock.id,
      name: apiUser.fullName || defaultMock.name,
      code: apiUser.employeeCode || defaultMock.code,
      email: apiUser.email || defaultMock.email,
      role: apiUser.role || defaultMock.role,
      roleTitle: ROLE_PERMISSIONS[apiUser.role]?.title || defaultMock.roleTitle,
      department: typeof apiUser.department === 'string' ? apiUser.department : (apiUser.department?.name || defaultMock.department),
      className: apiUser.className || defaultMock.className || '',
      phone: apiUser.phone || defaultMock.phone || '',
      avatar: apiUser.avatar || defaultMock.avatar || 'TH',
      reputeScore: typeof apiUser.reputeScore === 'number' ? apiUser.reputeScore : (defaultMock.reputeScore || 100),
      reputeTier: apiUser.reputeTier || (apiUser.reputeScore >= 90 ? 'Kim Cương (Ưu Tiên Tối Đa)' : 'Chuẩn'),
      bookingPrivilege: apiUser.bookingPrivilege || 'Duyệt mượn phòng bình thường'
    };
  }, [apiUser, defaultMock]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const currentRoleMeta = ROLE_PERMISSIONS[currentRoleKey] || ROLE_PERMISSIONS.student;
  const allowedTabs = currentRoleMeta.allowedTabs;

  const isTabAllowed = useCallback((tabId) => {
    return allowedTabs.includes(tabId);
  }, [allowedTabs]);

  const contextValue = useMemo(() => ({
    currentUser,
    currentRoleKey,
    currentRoleMeta,
    allowedTabs,
    isTabAllowed,
    switchRole,
    theme,
    toggleTheme,
    notifications,
    unreadCount,
    markAllNotificationsRead,
    allRoles: USERS,
    allRolePermissions: ROLE_PERMISSIONS,
    // Auth & Profile operations (UC-1.1 -> UC-1.6)
    isLoggedIn,
    token,
    login,
    logout,
    fetchProfile,
    updateProfile,
    changePassword,
    forgotPassword,
    verifyResetOtp,
    resetPassword
  }), [
    currentUser,
    currentRoleKey,
    currentRoleMeta,
    allowedTabs,
    isTabAllowed,
    switchRole,
    theme,
    toggleTheme,
    notifications,
    unreadCount,
    markAllNotificationsRead,
    isLoggedIn,
    token,
    login,
    logout,
    fetchProfile,
    updateProfile,
    changePassword,
    forgotPassword,
    verifyResetOtp,
    resetPassword
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
