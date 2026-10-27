import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AppHeader } from './AppHeader';
import { getNavItemsForRole, ROLE_METADATA, USER_ROLES } from '../../config/navigation';

const authState = vi.hoisted(() => ({
  role: 'lecturer',
  theme: 'light',
  unreadCount: 2,
  navItems: []
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentRoleKey: authState.role,
    currentRoleMeta: ROLE_METADATA[authState.role],
    currentUser: {
      _id: 'u1',
      name: 'Giảng Viên Nguyễn Văn An',
      code: 'GV001',
      email: 'lecturer@ruo.edu.vn',
      department: 'Khoa Công Nghệ Thông Tin',
      phone: '0971234567',
      avatar: 'NA',
      role: authState.role
    },
    theme: authState.theme,
    toggleTheme: vi.fn(),
    notifications: [],
    unreadCount: authState.unreadCount,
    markAllNotificationsRead: vi.fn(),
    markNotificationRead: vi.fn(),
    deleteNotification: vi.fn(),
    seedDemoNotifications: vi.fn(),
    fetchNotifications: vi.fn(),
    navItems: authState.navItems,
    isTabAllowed: () => true,
    logout: vi.fn()
  })
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }
  })
}));

afterEach(cleanup);

describe('AppHeader UX & Keyboard Interactions', () => {
  it('renders clean header without frozen clock or duplicate QR CTA, showing user role badge', () => {
    authState.role = USER_ROLES.LECTURER;
    authState.navItems = getNavItemsForRole(USER_ROLES.LECTURER);

    render(<AppHeader activeTab="dashboard" onSelectTab={() => {}} />);

    expect(screen.queryByText('17:00:00')).toBeNull();
    expect(screen.queryByText('QR Check-in')).toBeNull();
    expect(screen.queryByText('UEMS V3.0')).toBeNull();
    expect(screen.getByText('Giảng Viên')).toBeTruthy();
  });

  it('opens Command Palette with Ctrl+K and navigates on Enter', () => {
    authState.role = USER_ROLES.LECTURER;
    authState.navItems = getNavItemsForRole(USER_ROLES.LECTURER);
    const onSelectTab = vi.fn();

    render(<AppHeader activeTab="dashboard" onSelectTab={onSelectTab} />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog', { name: /Bảng điều hướng nhanh/i })).toBeTruthy();

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onSelectTab).toHaveBeenCalled();
  });

  it('closes profile popover when clicking outside or pressing Escape', () => {
    authState.role = USER_ROLES.LECTURER;
    authState.navItems = getNavItemsForRole(USER_ROLES.LECTURER);

    render(<AppHeader activeTab="dashboard" onSelectTab={() => {}} />);

    const profileBtn = screen.getByRole('button', { name: /Hồ sơ tài khoản/i });
    fireEvent.click(profileBtn);
    expect(screen.getByText('Hồ Sơ & Đổi Mật Khẩu')).toBeTruthy();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Hồ Sơ & Đổi Mật Khẩu')).toBeNull();
  });

  it('groups overflow tabs beyond primary slots into a clean Khác menu for 12-tab roles', () => {
    authState.role = USER_ROLES.ADMIN;
    authState.navItems = getNavItemsForRole(USER_ROLES.ADMIN);
    const onSelectTab = vi.fn();

    render(<AppHeader activeTab="dashboard" onSelectTab={onSelectTab} />);

    const moreBtn = screen.getByRole('button', { name: /Phân hệ khác/i });
    expect(moreBtn).toBeTruthy();

    fireEvent.click(moreBtn);
    const historyItem = screen.getByText('Lịch Sử Điều Chuyển');
    fireEvent.click(historyItem);
    expect(onSelectTab).toHaveBeenCalledWith('transfer_history');
  });
});
