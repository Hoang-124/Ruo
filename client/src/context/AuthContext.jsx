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

// Domain Actors & Role-Based Access Control (RBAC) Mapping (3 Canonical Actors)
export const ROLE_PERMISSIONS = {
  lecturer: {
    title: 'Giảng viên',
    desc: 'Báo cáo sự cố thiết bị phòng học, theo dõi tiến độ sửa chữa, đánh giá chất lượng sửa chữa, tra cứu thiết bị phòng học',
    allowedTabs: ['dashboard', 'equipments', 'tickets_kanban']
  },
  maintenance_staff: {
    title: 'Quản lý CSVC & Kỹ thuật',
    desc: 'Quản lý kho thiết bị & QR, điều chuyển phòng, sửa chữa SLA, bảo trì định kỳ, kiểm kê kho thực tế, đề xuất thanh lý R ≥ 60%',
    allowedTabs: ['dashboard', 'equipments', 'transfers', 'tickets_kanban', 'maintenance', 'inventory', 'disposal_calc']
  },
  admin: {
    title: 'Quản trị viên (Admin)',
    desc: 'Toàn quyền điều hành CSVC, phân quyền vai trò qua ma trận RBAC, giám sát chuỗi kiểm toán SHA-256, phê duyệt thanh lý cuối cùng',
    allowedTabs: ['dashboard', 'equipments', 'transfers', 'tickets_kanban', 'maintenance', 'inventory', 'disposal_calc', 'rbac', 'audit_log']
  },
  // Backward compatibility aliases
  facility_staff: {
    title: 'Quản lý CSVC & Kỹ thuật',
    desc: 'Quản lý kho thiết bị & QR, điều chuyển phòng, sửa chữa SLA, bảo trì định kỳ, kiểm kê kho thực tế, đề xuất thanh lý',
    allowedTabs: ['dashboard', 'equipments', 'transfers', 'tickets_kanban', 'maintenance', 'inventory', 'disposal_calc']
  },
  maintenance: {
    title: 'Kỹ thuật viên',
    desc: 'Tiếp nhận ticket sự cố, đếm ngược SLA sửa chữa, đánh giá kỹ thuật và đề xuất thanh lý máy hỏng',
    allowedTabs: ['dashboard', 'equipments', 'transfers', 'tickets_kanban', 'maintenance', 'inventory', 'disposal_calc']
  }
};

export const AuthProvider = ({ children }) => {
  // Authentication Token State
  const [token, setToken] = useState(() => localStorage.getItem('ruo_token') || null);
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('ruo_refresh_token') || null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return Boolean(localStorage.getItem('ruo_token') || localStorage.getItem('ruo_is_logged_in') === 'true');
  });

  // Current active role key: lecturer, maintenance_staff, admin
  const [currentRoleKey, setCurrentRoleKey] = useState(() => {
    return localStorage.getItem('ruo_role') || 'maintenance_staff';
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

  // UC-1.1: Login (Authenticates strictly against real Backend API & MongoDB)
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
        return {
          success: false,
          status: res.status,
          message: data.message || 'Thông tin tài khoản hoặc mật khẩu không chính xác.',
          isLocked: Boolean(data.isLocked),
          remainingMinutes: data.remainingMinutes,
          attemptsLeft: data.attemptsLeft,
          failedAttempts: data.failedAttempts
        };
      }
    } catch (error) {
      console.error('[AuthContext] Backend connection error:', error.message);
      return {
        success: false,
        message: 'Không thể kết nối đến máy chủ Backend (Port 5000). Vui lòng đảm bảo dịch vụ máy chủ đang chạy.'
      };
    }
  }, []);

  // Register: New institutional account registration
  const register = useCallback(async (registrationData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
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

        return { success: true, message: data.message, user: data.user };
      } else {
        return { success: false, message: data.message || 'Đăng ký không thành công.' };
      }
    } catch (error) {
      console.warn('[AuthContext] Real backend register error, fallback offline mode:', error.message);
      const mockUser = {
        id: 'usr_' + Date.now(),
        fullName: registrationData.fullName,
        email: registrationData.email,
        employeeCode: registrationData.employeeCode,
        role: registrationData.role || 'lecturer',
        department: registrationData.departmentName || 'Khoa Công nghệ Thông tin',
        className: registrationData.className || 'K68-CNTT',
        phone: registrationData.phone || ''
      };
      setApiUser(mockUser);
      setCurrentRoleKey(mockUser.role);
      setIsLoggedIn(true);
      localStorage.setItem('ruo_is_logged_in', 'true');
      return { success: true, message: 'Đăng ký tài khoản thành công (Offline Mode).', user: mockUser };
    }
  }, []);

  // UC-1.2: Logout (Hủy token trên server & dọn dẹp triệt để client)
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
      localStorage.removeItem('ruo_role');
      localStorage.removeItem('ufms_role');
      setCurrentRoleKey('lecturer');
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
  const defaultMock = USERS[currentRoleKey] || USERS.maintenance_staff || USERS.lecturer;
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
      avatar: apiUser.avatar || defaultMock.avatar || 'QL'
    };
  }, [apiUser, defaultMock]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const currentRoleMeta = ROLE_PERMISSIONS[currentRoleKey] || ROLE_PERMISSIONS.maintenance_staff;
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
    register,
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
    register,
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
