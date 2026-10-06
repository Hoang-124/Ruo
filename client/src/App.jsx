import React, { useState, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppHeader } from './components/layout/AppHeader';
import { Dashboard } from './pages/dashboard/Dashboard';
import { Icons } from './components/common/SvgIcons';

// Code-Splitting: Lazy load 6 core module pages
const EquipmentDisposalPage = lazy(() => import('./pages/equipments/EquipmentDisposalPage').then(m => ({ default: m.EquipmentDisposalPage })));
const TransferListPage = lazy(() => import('./pages/transfers/TransferListPage').then(m => ({ default: m.TransferListPage })));
const TicketKanbanPage = lazy(() => import('./pages/incidents/TicketKanbanPage').then(m => ({ default: m.TicketKanbanPage })));
const MaintenancePage = lazy(() => import('./pages/maintenance/MaintenancePage').then(m => ({ default: m.MaintenancePage })));
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage').then(m => ({ default: m.InventoryPage })));
const RBACMatrixPage = lazy(() => import('./pages/admin/RBACMatrixPage').then(m => ({ default: m.RBACMatrixPage })));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage').then(m => ({ default: m.AuditLogPage })));

const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const UserProfileModal = lazy(() => import('./components/ui/UserProfileModal').then(m => ({ default: m.UserProfileModal })));

// Sleek native SVG loading spinner
const LazyFallback = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '380px', gap: '14px', color: 'var(--ink-muted)' }}>
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
    <span style={{ fontSize: '13px', fontWeight: 600 }}>Đang tải phân hệ...</span>
  </div>
);

const MainAppContent = () => {
  const { isTabAllowed, currentRoleMeta, isLoggedIn } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  if (!isLoggedIn) {
    return (
      <Suspense fallback={<LazyFallback />}>
        <LoginPage onLoginSuccess={() => {}} />
      </Suspense>
    );
  }

  // Subpage wrapper with Return-to-CAD button
  const renderSubPageWrapper = (title, category, component) => (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px 32px 80px' }}>
      {/* Return to CAD Breadcrumb */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--hairline-soft)'
        }}
      >
        <button
          onClick={() => setActiveTab('dashboard')}
          className="laser-btn laser-btn-ghost"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12.5px'
          }}
          title="Quay lại Bản Đồ Mặt Bằng CAD"
        >
          <Icons.ChevronLeft size={14} />
          <span>Quay lại Bản Đồ CAD</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-sans)', fontSize: '11px' }}>
          <span style={{ color: 'var(--ink-muted)' }}>{category}</span>
          <span style={{ color: 'var(--hairline-medium)' }}>/</span>
          <span style={{ color: 'var(--laser-cyan)', fontWeight: 700 }}>{title}</span>
        </div>
      </div>

      {component}
    </div>
  );

  const renderActiveView = () => {
    // 403 Forbidden check if activeTab is not dashboard and unauthorized
    if (activeTab !== 'dashboard' && !isTabAllowed(activeTab)) {
      return (
        <div style={{ maxWidth: '640px', margin: '80px auto', textAlign: 'center', padding: '48px 32px', background: 'var(--surface-panel)', border: '1px solid var(--hairline-medium)', borderRadius: 'var(--radius-xl)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', border: '1px solid rgba(239,68,68,0.25)' }}>
            <Icons.Shield size={28} color="var(--laser-rose)" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink-pure)', marginBottom: '10px' }}>
            Truy Cập Bị Giới Hạn Theo Vai Trò (RBAC Guard)
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--ink-secondary)', maxWidth: '480px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Vai trò hiện tại của bạn là <strong style={{ color: 'var(--laser-cyan)' }}>{currentRoleMeta?.title || 'Người dùng'}</strong> không có thẩm quyền truy cập vào phân hệ này theo ma trận phân quyền đại học của Ruo.
          </p>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="laser-btn laser-btn-primary"
            style={{ padding: '8px 24px', borderRadius: 'var(--radius-full)', fontSize: '13px' }}
          >
            Quay lại Bản Đồ Không Gian
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenQRModal={() => setActiveTab('inventory')}
          />
        );

      case 'equipments':
        return renderSubPageWrapper(
          'Kho Quản Lý Thiết Bị & Nhãn Mã QR',
          'MODULE 03 • THIẾT BỊ',
          <EquipmentDisposalPage key="equipments" initialTab="inventory" />
        );

      case 'transfers':
        return renderSubPageWrapper(
          'Điều Chuyển Trang Thiết Bị Giữa Các Phòng',
          'MODULE 03 • ĐIỀU CHUYỂN',
          <TransferListPage />
        );

      case 'tickets_kanban':
      case 'tickets':
        return renderSubPageWrapper(
          'Sự Cố & Sửa Chữa Thiết Bị (Kanban SLA)',
          'MODULE 04 • SỬA CHỮA',
          <TicketKanbanPage />
        );

      case 'maintenance':
        return renderSubPageWrapper(
          'Kế Hoạch & Nhật Ký Bảo Trì Định Kỳ',
          'MODULE 05 • BẢO TRÌ',
          <MaintenancePage />
        );

      case 'inventory':
        return renderSubPageWrapper(
          'Kiểm Kê CSVC & Đối Soát Mã QR Thực Địa',
          'MODULE 05 • KIỂM KÊ',
          <InventoryPage />
        );

      case 'disposal_calc':
        return renderSubPageWrapper(
          'Quy Trình Thanh Lý Tài Sản & Máy Tính Chỉ Số R ≥ 60%',
          'MODULE 03 • THANH LÝ',
          <EquipmentDisposalPage key="disposal" initialTab="disposal" />
        );

      case 'rbac':
        return renderSubPageWrapper(
          'Ma Trận Phân Quyền 3 Vai Trò (RBAC Matrix)',
          'MODULE 01 • QUẢN TRỊ NGƯỜI DÙNG',
          <RBACMatrixPage />
        );

      case 'audit_log':
        return renderSubPageWrapper(
          'Nhật Ký Kiểm Toán Chuỗi Khối SHA-256',
          'MODULE 06 • BẢO MẬT & KIỂM TOÁN',
          <AuditLogPage />
        );

      default:
        return (
          <Dashboard
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenQRModal={() => setActiveTab('inventory')}
          />
        );
    }
  };

  return (
    <div className="panoramic-shell blueprint-canvas-bg">
      {/* 1. Grounded Two-Tier Enterprise Navigation Header */}
      <AppHeader
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenQRDemo={() => setActiveTab('inventory')}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* 2. Main Subsystem Viewport */}
      <main className="ruo-main-viewport">
        <Suspense fallback={<LazyFallback />}>
          <div key={activeTab} className="ruo-view-enter">
            {renderActiveView()}
          </div>
        </Suspense>
      </main>

      {/* Profile Modal */}
      <Suspense fallback={null}>
        {isProfileModalOpen && (
          <UserProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
          />
        )}
      </Suspense>
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
