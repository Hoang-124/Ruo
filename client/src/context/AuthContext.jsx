import React, { createContext, useContext, useState, useEffect } from 'react';
import { USERS, NOTIFICATIONS as initialNotifs } from '../mock/mockData';

const AuthContext = createContext();

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
    // Force a synchronous reflow so new styles take effect immediately
    (() => window.getComputedStyle(document.body).opacity)();

    // Release transition lock on subsequent animation frame
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
  // Current active role key: student, lecturer, facility_staff, maintenance, academic_affairs, admin
  const [currentRoleKey, setCurrentRoleKey] = useState(() => {
    return localStorage.getItem('ruo_role') || localStorage.getItem('ufms_role') || 'student';
  });

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

  const toggleTheme = React.useCallback(() => {
    const unlock = freezeTransitionsTemporarily();
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('ruo_theme', next);
      unlock();
      return next;
    });
  }, []);

  const switchRole = React.useCallback((roleKey) => {
    if (USERS[roleKey]) {
      setCurrentRoleKey(roleKey);
    }
  }, []);

  const markAllNotificationsRead = React.useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const currentUser = USERS[currentRoleKey] || USERS.student;
  const unreadCount = notifications.filter(n => !n.read).length;

  const currentRoleMeta = ROLE_PERMISSIONS[currentRoleKey] || ROLE_PERMISSIONS.student;
  const allowedTabs = currentRoleMeta.allowedTabs;

  const isTabAllowed = React.useCallback((tabId) => {
    return allowedTabs.includes(tabId);
  }, [allowedTabs]);

  const contextValue = React.useMemo(() => ({
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
    allRolePermissions: ROLE_PERMISSIONS
  }), [currentUser, currentRoleKey, currentRoleMeta, allowedTabs, isTabAllowed, switchRole, theme, toggleTheme, notifications, unreadCount, markAllNotificationsRead]);

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
