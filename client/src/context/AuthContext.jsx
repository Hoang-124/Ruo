import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { USERS, NOTIFICATIONS as initialNotifs } from '../mock/mockData';
import { authApi, getStoredToken, getStoredRefreshToken, setStoredTokens, clearStoredTokens } from '../lib/api';

const AuthContext = createContext();

// Helper utility: freeze transitions during theme switch
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
  admin: {
    title: 'Ban Giám Hiệu / Quản Trị Viên (Admin)',
    desc: 'Toàn quyền cấu hình, phê duyệt quyết định thanh lý BGH, giám sát chuỗi kiểm toán SHA-256',
    allowedTabs: ['dashboard', 'equipments', 'transfers', 'tickets_kanban', 'maintenance', 'inventory', 'disposal_calc', 'cad_canvas', 'rbac', 'audit_log']
  },
  manager: {
    title: 'Quản Lý Phòng / Trưởng Phòng HC-QT',
    desc: 'Phê duyệt điều chuyển, xét duyệt thanh lý cấp phòng HC, lập dự trù mua sắm, kiểm soát tài sản',
    allowedTabs: ['dashboard', 'equipments', 'transfers', 'tickets_kanban', 'maintenance', 'inventory', 'disposal_calc', 'cad_canvas']
  },
  staff: {
    title: 'Kỹ Thuật Viên / Chuyên Viên CSVC',
    desc: 'Quản lý tài sản, kiểm kê mã QR, đề xuất điều chuyển, sửa chữa sự cố, đề xuất thanh lý khi R>=60%',
    allowedTabs: ['dashboard', 'equipments', 'transfers', 'tickets_kanban', 'maintenance', 'inventory', 'disposal_calc', 'cad_canvas']
  },
  // Backward compatibility aliases
  maintenance_staff: {
    title: 'Kỹ Thuật Viên CSVC',
    desc: 'Quản lý tài sản, kiểm kê mã QR, đề xuất điều chuyển, sửa chữa sự cố',
    allowedTabs: ['dashboard', 'equipments', 'transfers', 'tickets_kanban', 'maintenance', 'inventory', 'disposal_calc', 'cad_canvas']
  },
  facility_staff: {
    title: 'Quản Lý Phòng / Trưởng Phòng HC-QT',
    desc: 'Phê duyệt điều chuyển, xét duyệt thanh lý cấp phòng HC',
    allowedTabs: ['dashboard', 'equipments', 'transfers', 'tickets_kanban', 'maintenance', 'inventory', 'disposal_calc', 'cad_canvas']
  },
  maintenance: {
    title: 'Kỹ Thuật Viên CSVC',
    desc: 'Tiếp nhận ticket sự cố, đếm ngược SLA sửa chữa',
    allowedTabs: ['dashboard', 'equipments', 'transfers', 'tickets_kanban', 'maintenance', 'inventory', 'disposal_calc', 'cad_canvas']
  },
  lecturer: {
    title: 'Kỹ Thuật Viên CSVC',
    desc: 'Báo cáo sự cố thiết bị phòng học',
    allowedTabs: ['dashboard', 'equipments', 'tickets_kanban']
  }
};

export const AuthProvider = ({ children }) => {
  // Authentication Token State
  const [token, setToken] = useState(() => getStoredToken());
  const [refreshToken, setRefreshToken] = useState(() => getStoredRefreshToken());
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getStoredToken()));

  // Current active role key: admin, manager, staff
  const [currentRoleKey, setCurrentRoleKey] = useState(() => {
    return localStorage.getItem('ruo_role') || 'staff';
  });

  // Live profile details from Backend
  const [apiUser, setApiUser] = useState(null);

  // Dark/Light Theme (Default to Warm Graphite Dark Command Center)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ruo_theme') || 'dark';
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

  // Handle session expiration broadcast from API client
  useEffect(() => {
    const handleExpired = () => {
      setToken(null);
      setRefreshToken(null);
      setApiUser(null);
      setIsLoggedIn(false);
    };
    window.addEventListener('ruo:session-expired', handleExpired);
    return () => window.removeEventListener('ruo:session-expired', handleExpired);
  }, []);

  // Fetch real profile from backend when token changes
  const fetchProfile = useCallback(async () => {
    const activeToken = getStoredToken();
    if (!activeToken) return null;
    try {
      const data = await authApi.profile();
      if (data.success && data.user) {
        setApiUser(data.user);
        if (data.user.role) {
          setCurrentRoleKey(data.user.role);
        }
        setIsLoggedIn(true);
        return data.user;
      }
    } catch (err) {
      console.warn('[AuthContext] Backend offline or profile error:', err.message);
    }
    return null;
  }, []);

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token, fetchProfile]);

  // UC-1.1: Login (Authenticates strictly against real Backend API & MongoDB)
  const login = useCallback(async (identifier, password) => {
    try {
      const data = await authApi.login(identifier, password);
      if (data.success && data.token) {
        setToken(data.token);
        setRefreshToken(data.refreshToken);
        setApiUser(data.user);
        setIsLoggedIn(true);
        if (data.user.role) {
          setCurrentRoleKey(data.user.role);
        }

        setStoredTokens(data.token, data.refreshToken);
        return { success: true, user: data.user };
      } else {
        return {
          success: false,
          message: data.message || 'Thông tin tài khoản hoặc mật khẩu không chính xác.',
          isLocked: Boolean(data.isLocked),
          remainingMinutes: data.remainingMinutes,
          attemptsLeft: data.attemptsLeft,
          failedAttempts: data.failedAttempts
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Không thể kết nối đến máy chủ Backend (Port 5000).'
      };
    }
  }, []);

  // UC-1.0: Register
  const register = useCallback(async (userData) => {
    try {
      const data = await authApi.register(userData);
      if (data.success && data.token) {
        setToken(data.token);
        setRefreshToken(data.refreshToken);
        setApiUser(data.user);
        setIsLoggedIn(true);
        if (data.user.role) {
          setCurrentRoleKey(data.user.role);
        }
        setStoredTokens(data.token, data.refreshToken);
        return { success: true, user: data.user, message: data.message };
      } else {
        return {
          success: false,
          message: data.message || 'Đăng ký tài khoản không thành công.'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Không thể kết nối đến máy chủ Backend (Port 5000).'
      };
    }
  }, []);

  // UC-1.2: Logout
  const logout = useCallback(async () => {
    try {
      const refToken = getStoredRefreshToken();
      if (refToken) {
        await authApi.logout(refToken);
      }
    } catch (err) {
      console.warn('[AuthContext] Remote logout error:', err.message);
    } finally {
      clearStoredTokens();
      setToken(null);
      setRefreshToken(null);
      setApiUser(null);
      setIsLoggedIn(false);
      setCurrentRoleKey('staff');
    }
  }, []);

  // UC-1.3: Forgot Password APIs
  const forgotPassword = useCallback(async (email) => {
    try {
      return await authApi.forgotPassword(email);
    } catch (err) {
      return { success: false, message: err.message || 'Lỗi gửi yêu cầu khôi phục mật khẩu.' };
    }
  }, []);

  const resetPassword = useCallback(async (email, otp, newPassword) => {
    try {
      return await authApi.resetPassword(email, otp, newPassword);
    } catch (err) {
      return { success: false, message: err.message || 'Lỗi đặt lại mật khẩu.' };
    }
  }, []);

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

  // Merge backend user profile with mock data defaults
  const defaultMock = USERS[currentRoleKey] || USERS.staff || USERS.admin;
  const currentUser = useMemo(() => {
    if (!apiUser) return defaultMock;
    return {
      id: apiUser._id || apiUser.id || defaultMock.id,
      name: apiUser.full_name || apiUser.fullName || defaultMock.name,
      code: apiUser.code || apiUser.employeeCode || defaultMock.code,
      email: apiUser.email || defaultMock.email,
      role: apiUser.role || defaultMock.role,
      roleTitle: ROLE_PERMISSIONS[apiUser.role]?.title || defaultMock.roleTitle,
      department: typeof apiUser.department === 'string' ? apiUser.department : (apiUser.department?.name || defaultMock.department),
      phone: apiUser.phone || defaultMock.phone || '',
      avatar: apiUser.avatar || defaultMock.avatar || 'TT'
    };
  }, [apiUser, defaultMock]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const currentRoleMeta = ROLE_PERMISSIONS[currentRoleKey] || ROLE_PERMISSIONS.staff;
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
    isLoggedIn,
    token,
    login,
    register,
    logout,
    fetchProfile,
    forgotPassword,
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
    forgotPassword,
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

export default AuthContext;
