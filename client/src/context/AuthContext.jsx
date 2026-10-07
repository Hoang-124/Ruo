import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  authApi, 
  notificationApi, 
  getStoredToken, 
  getStoredRefreshToken, 
  setStoredTokens, 
  clearStoredTokens 
} from '../lib/api';
import { 
  USER_ROLES, 
  ROLE_METADATA, 
  getNavItemsForRole, 
  getDefaultTabForRole, 
  isTabAllowedForRole 
} from '../config/navigation';

const AuthContext = createContext();

// Freeze transitions temporarily during theme switch
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

// Export canonical role permissions for any legacy components
export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: {
    title: ROLE_METADATA[USER_ROLES.ADMIN].label,
    desc: ROLE_METADATA[USER_ROLES.ADMIN].description,
    allowedTabs: getNavItemsForRole(USER_ROLES.ADMIN).map(i => i.id)
  },
  [USER_ROLES.FACILITY_MANAGER]: {
    title: ROLE_METADATA[USER_ROLES.FACILITY_MANAGER].label,
    desc: ROLE_METADATA[USER_ROLES.FACILITY_MANAGER].description,
    allowedTabs: getNavItemsForRole(USER_ROLES.FACILITY_MANAGER).map(i => i.id)
  },
  [USER_ROLES.TECHNICIAN]: {
    title: ROLE_METADATA[USER_ROLES.TECHNICIAN].label,
    desc: ROLE_METADATA[USER_ROLES.TECHNICIAN].description,
    allowedTabs: getNavItemsForRole(USER_ROLES.TECHNICIAN).map(i => i.id)
  },
  [USER_ROLES.LECTURER]: {
    title: ROLE_METADATA[USER_ROLES.LECTURER].label,
    desc: ROLE_METADATA[USER_ROLES.LECTURER].description,
    allowedTabs: getNavItemsForRole(USER_ROLES.LECTURER).map(i => i.id)
  },
  // Backward compatibility aliases
  manager: {
    title: ROLE_METADATA[USER_ROLES.FACILITY_MANAGER].label,
    desc: ROLE_METADATA[USER_ROLES.FACILITY_MANAGER].description,
    allowedTabs: getNavItemsForRole(USER_ROLES.FACILITY_MANAGER).map(i => i.id)
  },
  staff: {
    title: ROLE_METADATA[USER_ROLES.TECHNICIAN].label,
    desc: ROLE_METADATA[USER_ROLES.TECHNICIAN].description,
    allowedTabs: getNavItemsForRole(USER_ROLES.TECHNICIAN).map(i => i.id)
  }
};

export const AuthProvider = ({ children }) => {
  // Authentication Token State
  const [token, setToken] = useState(() => getStoredToken());
  const [refreshToken, setRefreshToken] = useState(() => getStoredRefreshToken());
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getStoredToken()));

  // Live profile details from Backend
  const [apiUser, setApiUser] = useState(null);

  // Dark/Light Theme (Default: dark command center)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ruo_theme') || 'dark';
  });

  // Real Notifications from Backend API
  const [notifications, setNotifications] = useState([]);

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Handle session expiration broadcast from API client
  useEffect(() => {
    const handleExpired = () => {
      setToken(null);
      setRefreshToken(null);
      setApiUser(null);
      setIsLoggedIn(false);
      setNotifications([]);
    };
    window.addEventListener('ruo:session-expired', handleExpired);
    return () => window.removeEventListener('ruo:session-expired', handleExpired);
  }, []);

  // Fetch real profile from backend when token exists
  const fetchProfile = useCallback(async () => {
    const activeToken = getStoredToken();
    if (!activeToken) return null;
    try {
      const data = await authApi.profile();
      if (data.success && data.user) {
        setApiUser(data.user);
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

  // Fetch live notifications
  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await notificationApi.list();
      if (res.success && Array.isArray(res.notifications)) {
        setNotifications(res.notifications);
      }
    } catch (err) {
      // Quietly ignore network polling errors
    }
  }, [isLoggedIn]);

  // Periodic notification polling (every 45s)
  useEffect(() => {
    if (isLoggedIn) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 45000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, fetchNotifications]);

  // UC-1.1: Login
  const login = useCallback(async (identifier, password) => {
    try {
      const data = await authApi.login(identifier, password);
      if (data.success && data.token) {
        setToken(data.token);
        setRefreshToken(data.refreshToken);
        setApiUser(data.user);
        setIsLoggedIn(true);
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

  // UC-1.0: Register (Enforces lecturer role, requires email OTP)
  const register = useCallback(async (userData) => {
    try {
      const data = await authApi.register(userData);
      return data;
    } catch (error) {
      return {
        success: false,
        duplicateField: error.data?.duplicateField,
        errorType: error.data?.errorType,
        message: error.data?.message || error.message || 'Không thể kết nối đến máy chủ Backend (Port 5000).'
      };
    }
  }, []);

  const verifyRegisterOtp = useCallback(async (email, otp) => {
    try {
      const data = await authApi.verifyRegisterOtp(email, otp);
      if (data.success && data.token) {
        setToken(data.token);
        setRefreshToken(data.refreshToken);
        setApiUser(data.user);
        setIsLoggedIn(true);
        setStoredTokens(data.token, data.refreshToken);
      }
      return data;
    } catch (error) {
      return {
        success: false,
        message: error.data?.message || error.message || 'Xác thực OTP thất bại.'
      };
    }
  }, []);

  const checkDuplicate = useCallback(async (params) => {
    try {
      return await authApi.checkDuplicate(params);
    } catch (err) {
      return { success: false, emailExists: false, codeExists: false };
    }
  }, []);

  // UC-1.2: Logout
  const logout = useCallback(async (allDevices = false) => {
    try {
      const refToken = getStoredRefreshToken();
      if (refToken) {
        await authApi.logout(refToken, allDevices);
      }
    } catch (err) {
      console.warn('[AuthContext] Remote logout error:', err.message);
    } finally {
      clearStoredTokens();
      setToken(null);
      setRefreshToken(null);
      setApiUser(null);
      setIsLoggedIn(false);
      setNotifications([]);
    }
  }, []);

  // Update Profile
  const updateProfile = useCallback(async (updateData) => {
    try {
      const res = await authApi.updateProfile(updateData);
      if (res.success && res.user) {
        setApiUser(prev => ({ ...prev, ...res.user }));
      }
      return res;
    } catch (err) {
      return { success: false, message: err.message || 'Cập nhật hồ sơ thất bại.' };
    }
  }, []);

  // Change Password
  const changePassword = useCallback(async (passData) => {
    try {
      return await authApi.changePassword(passData);
    } catch (err) {
      return { success: false, message: err.message || 'Đổi mật khẩu thất bại.' };
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

  const verifyResetOtp = useCallback(async (email, otp) => {
    try {
      return await authApi.verifyResetOtp(email, otp);
    } catch (err) {
      return { success: false, message: err.message || 'Lỗi xác thực mã OTP.' };
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

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read: true })));
    } catch (err) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read: true })));
    }
  }, []);

  const markNotificationRead = useCallback(async (id) => {
    try {
      await notificationApi.markRead(id);
      setNotifications(prev => prev.map(n => (n._id === id || n.id === id ? { ...n, is_read: true, read: true } : n)));
    } catch (err) {
      setNotifications(prev => prev.map(n => (n._id === id || n.id === id ? { ...n, is_read: true, read: true } : n)));
    }
  }, []);

  // Active canonical role derived strictly from backend user profile
  const activeRole = useMemo(() => {
    if (!apiUser?.role) return USER_ROLES.LECTURER;
    const r = String(apiUser.role).toLowerCase();
    if (Object.values(USER_ROLES).includes(r)) return r;
    // Map legacy role aliases if any
    if (r === 'manager') return USER_ROLES.FACILITY_MANAGER;
    if (r === 'staff' || r === 'maintenance') return USER_ROLES.TECHNICIAN;
    return USER_ROLES.LECTURER;
  }, [apiUser]);

  const currentRoleMeta = useMemo(() => {
    return ROLE_METADATA[activeRole] || ROLE_METADATA[USER_ROLES.LECTURER];
  }, [activeRole]);

  const currentUser = useMemo(() => {
    if (!apiUser) {
      return {
        id: 'guest',
        name: 'Khách',
        code: 'GUEST',
        email: '',
        role: USER_ROLES.LECTURER,
        roleTitle: currentRoleMeta.label,
        department: '',
        phone: '',
        avatar: 'RU'
      };
    }

    return {
      id: apiUser._id || apiUser.id,
      name: apiUser.full_name || apiUser.fullName || 'Người Dùng',
      code: apiUser.code || apiUser.employeeCode || '',
      email: apiUser.email || '',
      role: activeRole,
      roleTitle: currentRoleMeta.label,
      department: typeof apiUser.department === 'string' ? apiUser.department : (apiUser.department?.name || 'Đại Học Ruo'),
      phone: apiUser.phone || '',
      avatar: apiUser.avatar || (apiUser.full_name ? apiUser.full_name.slice(0, 2).toUpperCase() : 'RU'),
      status: apiUser.status || 'active'
    };
  }, [apiUser, activeRole, currentRoleMeta]);

  const navItems = useMemo(() => {
    return getNavItemsForRole(activeRole);
  }, [activeRole]);

  const allowedTabs = useMemo(() => {
    return navItems.map(item => item.id);
  }, [navItems]);

  const isTabAllowed = useCallback((tabId) => {
    return isTabAllowedForRole(activeRole, tabId);
  }, [activeRole]);

  const defaultTab = useMemo(() => {
    return getDefaultTabForRole(activeRole);
  }, [activeRole]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.is_read && !n.read).length;
  }, [notifications]);

  const contextValue = useMemo(() => ({
    currentUser,
    currentRoleKey: activeRole,
    currentRoleMeta,
    navItems,
    allowedTabs,
    defaultTab,
    isTabAllowed,
    theme,
    toggleTheme,
    notifications,
    unreadCount,
    markAllNotificationsRead,
    markNotificationRead,
    fetchNotifications,
    allRolePermissions: ROLE_PERMISSIONS,
    isLoggedIn,
    token,
    login,
    register,
    verifyRegisterOtp,
    checkDuplicate,
    logout,
    fetchProfile,
    updateProfile,
    changePassword,
    forgotPassword,
    verifyResetOtp,
    resetPassword
  }), [
    currentUser,
    activeRole,
    currentRoleMeta,
    navItems,
    allowedTabs,
    defaultTab,
    isTabAllowed,
    theme,
    toggleTheme,
    notifications,
    unreadCount,
    markAllNotificationsRead,
    markNotificationRead,
    fetchNotifications,
    isLoggedIn,
    token,
    login,
    register,
    verifyRegisterOtp,
    checkDuplicate,
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

export default AuthContext;
