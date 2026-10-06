import React, { useState, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppHeader } from './components/layout/AppHeader';
import { Dashboard } from './pages/dashboard/Dashboard';
import { Icons } from './components/common/SvgIcons';
import { useRouter } from './lib/router';

// Code-Splitting: Lazy load UEMS core module pages
const EquipmentDisposalPage = lazy(() => import('./pages/equipments/EquipmentDisposalPage').then(m => ({ default: m.EquipmentDisposalPage })));
const TransferListPage = lazy(() => import('./pages/transfers/TransferListPage').then(m => ({ default: m.TransferListPage })));
const TicketKanbanPage = lazy(() => import('./pages/incidents/TicketKanbanPage').then(m => ({ default: m.TicketKanbanPage })));
const MaintenancePage = lazy(() => import('./pages/maintenance/MaintenancePage').then(m => ({ default: m.MaintenancePage })));
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage').then(m => ({ default: m.InventoryPage })));
const RBACMatrixPage = lazy(() => import('./pages/admin/RBACMatrixPage').then(m => ({ default: m.RBACMatrixPage })));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage').then(m => ({ default: m.AuditLogPage })));
const CampusCadMapPage = lazy(() => import('./pages/campus/CampusCadMapPage').then(m => ({ default: m.CampusCadMapPage })));

const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const UserProfileModal = lazy(() => import('./components/ui/UserProfileModal').then(m => ({ default: m.UserProfileModal })));

// Sleek native SVG loading spinner
const LazyFallback = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '380px', gap: '14px', color: 'var(--ink-muted)' }}>
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3E7BFA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
    <span style={{ fontSize: '13px', fontWeight: 600 }}>Đang nạp phân hệ vận hành...</span>
  </div>
);

const MainAppContent = () => {
  const { isTabAllowed, currentRoleMeta, isLoggedIn } = useAuth();
  const { tab: activeTab, setTab: setActiveTab } = useRouter();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  if (!isLoggedIn) {
    return (
      <Suspense fallback={<LazyFallback />}>
        <LoginPage onLoginSuccess={() => setActiveTab('dashboard')} />
      </Suspense>
    );
  }

  // Subpage wrapper with Return-to-Dashboard breadcrumb
  const renderSubPageWrapper = (title, category, component) => (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px 32px 80px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--border-default)'
        }}
      >
        <button
          onClick={() => setActiveTab('dashboard')}
          className="ruo-btn ruo-btn-ghost ruo-btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          title="Quay lại Trung Tâm Vận Hành"
        >
          <Icons.ChevronLeft size={14} />
          <span>Quay lại Bảng Điều Khiển</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
          <span style={{ color: 'var(--ink-muted)' }}>{category}</span>
          <span style={{ color: 'var(--border-default)' }}>/</span>
          <span style={{ color: 'var(--blueprint-400)', fontWeight: 700 }}>{title}</span>
        </div>
      </div>

      {component}
    </div>
  );

  const renderActiveView = () => {
    if (activeTab !== 'dashboard' && !isTabAllowed(activeTab)) {
      return (
        <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', padding: '48px 32px', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(229, 72, 77, 0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', border: '1px solid rgba(229,72,77,0.25)' }}>
            <Icons.Shield size={28} color="#E5484D" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink-primary)', marginBottom: '10px' }}>
            Truy Cập Bị Giới Hạn Theo Vai Trò (RBAC Guard)
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', maxWidth: '460px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Vai trò hiện tại của bạn là <strong style={{ color: 'var(--blueprint-400)' }}>{currentRoleMeta?.title || 'Người dùng'}</strong> không có thẩm quyền truy cập vào phân hệ này theo quy chế quản lý của Ruo.
          </p>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="ruo-btn ruo-btn-primary ruo-btn-md"
          >
            Quay lại Bảng Điều Khiển
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px 32px 80px' }}>
            <Dashboard
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenQRModal={() => setActiveTab('inventory')}
            />
          </div>
        );

      case 'map':
        return renderSubPageWrapper(
          'Bản Đồ Không Gian Tòa Nhà A1 (Digital Twin)',
          'MODULE 02 • MẶT BẰNG & PHÒNG',
          <CampusCadMapPage />
        );

      case 'equipments':
        return renderSubPageWrapper(
          'Kho Quản Lý Thiết Bị & Chu Trình Vòng Đời',
          'MODULE 03 • TÀI SẢN THIẾT BỊ',
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
      case 'repairs':
        return renderSubPageWrapper(
          'Sự Cố & Sửa Chữa Thiết Bị (Kanban SLA)',
          'MODULE 04 • BẢO HÀNH & SỬA CHỮA',
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
      case 'disposals':
        return renderSubPageWrapper(
          'Quy Trình Thanh Lý Tài Sản RACI 5 Bước (R ≥ 60%)',
          'MODULE 03 • THANH LÝ TÀI SẢN',
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
          'Nhật Ký Kiểm Toán Chuỗi Khối SHA-256 (Immutable Ledger)',
          'MODULE 06 • BẢO MẬT & KIỂM TOÁN',
          <AuditLogPage />
        );

      default:
        return (
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px 32px 80px' }}>
            <Dashboard
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenQRModal={() => setActiveTab('inventory')}
            />
          </div>
        );
    }
  };

  return (
    <div className="panoramic-shell" style={{ minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--ink-primary)' }}>
      {/* Grounded Navigation Header */}
      <AppHeader
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenQRDemo={() => setActiveTab('inventory')}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* Main Subsystem Viewport */}
      <main className="ruo-main-viewport">
        <Suspense fallback={<LazyFallback />}>
          <div key={activeTab}>
            {renderActiveView()}
          </div>
        </Suspense>
      </main>

      {/* User Profile Modal */}
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
