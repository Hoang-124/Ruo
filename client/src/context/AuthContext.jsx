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

  // Dark/Light Theme (Default: High-Contrast Academic Daylight 'light')
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ruo_theme_v2') || 'light';
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

  // Periodic notification polling (every 25s for real-time badge)
  useEffect(() => {
    if (isLoggedIn) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 25000);
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
        message: error.data?.message || error.message || 'Không thể kết nối đến máy chủ Backend (Port 5000).',
        isPending: Boolean(error.data?.isPending),
        isLocked: Boolean(error.data?.isLocked),
        remainingMinutes: error.data?.remainingMinutes,
        attemptsLeft: error.data?.attemptsLeft,
        failedAttempts: error.data?.failedAttempts
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

  // Update Profile (UC-1.6)
  const updateProfile = useCallback(async (dataOrPhone, maybeAvatar) => {
    try {
      const payload = (typeof dataOrPhone === 'object' && dataOrPhone !== null)
        ? dataOrPhone
        : { phone: dataOrPhone, avatar: maybeAvatar };
      const res = await authApi.updateProfile(payload);
      if (res.success && res.user) {
        setApiUser(prev => ({ ...prev, ...res.user }));
      }
      return res;
    } catch (err) {
      return { success: false, message: err.message || 'Cập nhật hồ sơ thất bại.' };
    }
  }, []);

  // Change Password (UC-10.6: Resolves mandatory password change flag)
  const changePassword = useCallback(async (passData) => {
    try {
      const res = await authApi.changePassword(passData);
      if (res && res.success) {
        setApiUser(prev => prev ? { ...prev, force_change_pw: false } : prev);
      }
      return res;
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
      localStorage.setItem('ruo_theme_v2', next);
      localStorage.setItem('ruo_theme', next);
      unlock();
      return next;
    });
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read: true, isRead: true })));
    } catch (err) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read: true, isRead: true })));
    }
  }, []);

  const markNotificationRead = useCallback(async (id) => {
    try {
      await notificationApi.markReadState({ id });
      setNotifications(prev => prev.map(n => (n._id === id || n.id === id ? { ...n, is_read: true, read: true, isRead: true } : n)));
    } catch (err) {
      setNotifications(prev => prev.map(n => (n._id === id || n.id === id ? { ...n, is_read: true, read: true, isRead: true } : n)));
    }
  }, []);

  const deleteNotification = useCallback(async (id) => {
    try {
      await notificationApi.delete(id);
      setNotifications(prev => prev.filter(n => n._id !== id && n.id !== id));
    } catch (err) {
      setNotifications(prev => prev.filter(n => n._id !== id && n.id !== id));
    }
  }, []);

  const seedDemoNotifications = useCallback(async () => {
    try {
      const res = await notificationApi.seedDemo();
      if (res.success && Array.isArray(res.notifications)) {
        await fetchNotifications();
      }
      return res;
    } catch (err) {
      console.warn('Seed demo error:', err.message);
      return { success: false, message: err.message };
    }
  }, [fetchNotifications]);

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

  // Canonical fallback permissions per role (synchronized with backend DEFAULT_CANONICAL_ROLES)
  const userPermissions = useMemo(() => {
    if (Array.isArray(apiUser?.permissions)) {
      return apiUser.permissions;
    }
    const defaults = {
      [USER_ROLES.LECTURER]: [
        'user:profile:read', 'room:read', 'equipment:read', 'equipment:qr:scan',
        'incident:create', 'incident:read_own', 'repair:rate'
      ],
      [USER_ROLES.TECHNICIAN]: [
        'user:profile:read', 'room:read', 'equipment:read', 'equipment:create',
        'equipment:update', 'equipment:qr:scan', 'warranty:read', 'warranty:update',
        'movement:confirm', 'incident:create', 'repair:read_assigned', 'repair:accept',
        'repair:log', 'repair:report_outcome', 'parts:request', 'inventory:scan', 'inventory:export',
        'disposal:propose'
      ],
      [USER_ROLES.FACILITY_MANAGER]: [
        'user:profile:read', 'room:read', 'equipment:read', 'equipment:create',
        'equipment:update', 'equipment:import', 'equipment:dispose', 'equipment:qr:generate',
        'equipment:qr:scan', 'warranty:read', 'warranty:update', 'movement:order',
        'placement:decide', 'incident:create', 'repair:read', 'repair:assign',
        'repair:close', 'parts:approve', 'spare_part:update', 'inventory:create',
        'inventory:scan', 'inventory:reconcile', 'inventory:export', 'disposal:propose',
        'dashboard:read', 'report:export'
      ],
      [USER_ROLES.ADMIN]: [
        'user:profile:read', 'user:create', 'user:update', 'user:lock',
        'user:reset_password', 'user:approve', 'role:update', 'room:read', 'room:*',
        'category:*', 'supplier:*', 'repair_unit:*', 'equipment:read', 'equipment:create',
        'equipment:update', 'equipment:import', 'equipment:dispose', 'equipment:qr:generate',
        'equipment:qr:scan', 'warranty:read', 'warranty:update', 'movement:order',
        'incident:create', 'inventory:create', 'inventory:reconcile', 'inventory:export',
        'disposal:approve', 'dashboard:read', 'report:export', 'audit:read',
        'audit:verify', 'audit:export', 'system:health'
      ]
    };
    return defaults[activeRole] || defaults[USER_ROLES.LECTURER];
  }, [apiUser, activeRole]);

  const hasPermission = useCallback((permissionCode) => {
    if (!permissionCode) return false;
    if (userPermissions.includes('*') || userPermissions.includes(permissionCode)) return true;
    const prefix = String(permissionCode).split(':')[0];
    return Boolean(prefix && userPermissions.includes(`${prefix}:*`));
  }, [userPermissions]);

  // Live-sync userPermissions when Admin updates RBAC Matrix in UC-12.2
  useEffect(() => {
    const handleRbacUpdated = () => {
      fetchProfile();
    };
    window.addEventListener('ruo:rbac-updated', handleRbacUpdated);
    return () => window.removeEventListener('ruo:rbac-updated', handleRbacUpdated);
  }, [fetchProfile]);

  const currentRoleMeta = useMemo(() => {
    return ROLE_METADATA[activeRole] || ROLE_METADATA[USER_ROLES.LECTURER];
  }, [activeRole]);

  const currentUser = useMemo(() => {
    if (!apiUser) {
      return {
        _id: 'guest',
        id: 'guest',
        name: 'Khách',
        fullName: 'Khách',
        code: 'GUEST',
        email: '',
        role: USER_ROLES.LECTURER,
        roleTitle: currentRoleMeta.label,
        department: '',
        phone: '',
        avatar: 'RU',
        reputeScore: 100,
        reputeTier: 'Tiêu Chuẩn',
        bookingPrivilege: 'Tiêu Chuẩn'
      };
    }

    const repute = apiUser.reputeScore ?? apiUser.repute_score ?? 100;
    const tier = apiUser.reputeTier || (repute >= 90 ? 'Xuất Sắc' : (repute >= 70 ? 'Tiêu Chuẩn' : 'Cần Lưu Ý'));

    return {
      _id: apiUser._id || apiUser.id,
      id: apiUser._id || apiUser.id,
      name: apiUser.full_name || apiUser.fullName || 'Người Dùng',
      fullName: apiUser.full_name || apiUser.fullName || 'Người Dùng',
      code: apiUser.code || apiUser.employeeCode || '',
      email: apiUser.email || '',
      role: activeRole,
      permissions: userPermissions,
      roleTitle: currentRoleMeta.label,
      department: typeof apiUser.department === 'string' ? apiUser.department : (apiUser.department?.name || 'Đại Học Ruo'),
      phone: apiUser.phone || '',
      avatar: apiUser.avatar || (apiUser.full_name ? apiUser.full_name.slice(0, 2).toUpperCase() : 'RU'),
      status: apiUser.status || 'active',
      force_change_pw: Boolean(apiUser.force_change_pw),
      forceChangePw: Boolean(apiUser.force_change_pw),
      reputeScore: repute,
      reputeTier: tier,
      bookingPrivilege: apiUser.bookingPrivilege || (repute >= 70 ? 'Toàn Quyền Tiêu Chuẩn' : 'Hạn Chế Đặt Trước')
    };
  }, [apiUser, activeRole, currentRoleMeta, userPermissions]);

  const navItems = useMemo(() => {
    return getNavItemsForRole(activeRole, hasPermission);
  }, [activeRole, hasPermission]);

  const allowedTabs = useMemo(() => {
    return navItems.map(item => item.id);
  }, [navItems]);

  const isTabAllowed = useCallback((tabId) => {
    return isTabAllowedForRole(activeRole, tabId, hasPermission);
  }, [activeRole, hasPermission]);

  const defaultTab = useMemo(() => {
    return getDefaultTabForRole(activeRole);
  }, [activeRole]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.is_read && !n.read && !n.isRead).length;
  }, [notifications]);

  const contextValue = useMemo(() => ({
    currentUser,
    currentRoleKey: activeRole,
    currentRoleMeta,
    userPermissions,
    hasPermission,
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
    deleteNotification,
    seedDemoNotifications,
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
    userPermissions,
    hasPermission,
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
    deleteNotification,
    seedDemoNotifications,
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