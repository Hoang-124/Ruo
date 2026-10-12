import React, { useState, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppHeader } from './components/layout/AppHeader';
import { Dashboard } from './pages/dashboard/Dashboard';
import { Icons } from './components/common/SvgIcons';
import { useRouter } from './lib/router';

// Code-Splitting: Lazy load UEMS core module pages

// Lecturer Module Pages
const ReportIssuePage = lazy(() => import('./pages/lecturer/ReportIssuePage').then(m => ({ default: m.ReportIssuePage })));
const LecturerTicketsPage = lazy(() => import('./pages/lecturer/LecturerTicketsPage').then(m => ({ default: m.LecturerTicketsPage })));

// Technician Module Pages
const TechnicianTasksPage = lazy(() => import('./pages/technician/TechnicianTasksPage').then(m => ({ default: m.TechnicianTasksPage })));
const SparePartsPage = lazy(() => import('./pages/technician/SparePartsPage').then(m => ({ default: m.SparePartsPage })));
const MovementTasksPage = lazy(() => import('./pages/technician/MovementTasksPage').then(m => ({ default: m.MovementTasksPage })));
const QRScannerPage = lazy(() => import('./pages/technician/QRScannerPage').then(m => ({ default: m.QRScannerPage })));

// Facility Manager Module Pages
const TicketKanbanPage = lazy(() => import('./pages/incidents/TicketKanbanPage').then(m => ({ default: m.TicketKanbanPage })));
const WarehouseStockPage = lazy(() => import('./pages/facility/WarehouseStockPage').then(m => ({ default: m.WarehouseStockPage })));
const MovementsPage = lazy(() => import('./pages/facility/MovementsPage').then(m => ({ default: m.MovementsPage })));
const EquipmentsPage = lazy(() => import('./pages/equipments/EquipmentsPage').then(m => ({ default: m.EquipmentsPage })));
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage').then(m => ({ default: m.InventoryPage })));
const DisposalProposePage = lazy(() => import('./pages/equipments/DisposalProposePage').then(m => ({ default: m.DisposalProposePage })));

// Admin Module Pages
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage').then(m => ({ default: m.UserManagementPage })));
const RBACMatrixPage = lazy(() => import('./pages/admin/RBACMatrixPage').then(m => ({ default: m.RBACMatrixPage })));
const MasterDataPage = lazy(() => import('./pages/admin/MasterDataPage').then(m => ({ default: m.MasterDataPage })));
const DisposalApprovalPage = lazy(() => import('./pages/admin/DisposalApprovalPage').then(m => ({ default: m.DisposalApprovalPage })));
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage').then(m => ({ default: m.AuditLogPage })));

// Auth & Modals
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
  const { isTabAllowed, currentRoleMeta, currentUser, isLoggedIn } = useAuth();
  const { tab: activeTab, setTab: setActiveTab } = useRouter();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [reportPrefill, setReportPrefill] = useState({ equipment: null, room: null });

  if (!isLoggedIn) {
    return (
      <Suspense fallback={<LazyFallback />}>
        <LoginPage onLoginSuccess={() => setActiveTab(currentRoleMeta?.defaultTab || 'dashboard')} />
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
          onClick={() => setActiveTab(currentRoleMeta?.defaultTab || 'dashboard')}
          className="ruo-btn ruo-btn-ghost ruo-btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          title="Quay lại Trang Chủ Vận Hành"
        >
          <Icons.ChevronLeft size={14} />
          <span>Quay lại {currentRoleMeta?.shortLabel || 'Trang Chủ'}</span>
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
    // Check permission if not landing tab and not allowed
    const isLandingTab = activeTab === currentRoleMeta?.defaultTab || activeTab === 'dashboard';
    if (!isLandingTab && !isTabAllowed(activeTab)) {
      return (
        <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', padding: '48px 32px', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(229, 72, 77, 0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', border: '1px solid rgba(229,72,77,0.25)' }}>
            <Icons.Shield size={28} color="#E5484D" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink-primary)', marginBottom: '10px' }}>
            Truy Cập Bị Giới Hạn Theo Vai Trò (RBAC Guard)
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', maxWidth: '460px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Vai trò hiện tại của bạn là <strong style={{ color: 'var(--blueprint-400)' }}>{currentRoleMeta?.label || 'Người dùng'}</strong> không có thẩm quyền truy cập vào phân hệ này theo quy chuẩn phân quyền của Ruo UEMS.
          </p>
          <button
            onClick={() => setActiveTab(currentRoleMeta?.defaultTab || 'dashboard')}
            className="ruo-btn ruo-btn-primary ruo-btn-md"
          >
            Quay lại {currentRoleMeta?.shortLabel || 'Bảng Điều Khiển'}
          </button>
        </div>
      );
    }

    switch (activeTab) {
      // 1. Dashboard (All Actors: Admin, Quản Lý CSVC, Kỹ Thuật Viên, Giảng Viên)
      case 'dashboard':
        return (
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '12px 24px 60px' }}>
            <Dashboard
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenQRModal={() => setActiveTab(currentUser?.role === 'technician' ? 'qr_scanner' : 'inventory')}
              onSelectEquipmentForReport={(eq, room) => {
                setReportPrefill({ equipment: eq, room: room });
                setActiveTab('report_issue');
              }}
            />
          </div>
        );

      // 2. Lecturer Views
      case 'my_rooms':
        // Hợp nhất vào Sơ đồ phòng học & Bản đồ CAD Tòa A1 tại Dashboard
        return (
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '12px 24px 60px' }}>
            <Dashboard
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenQRModal={() => setActiveTab(currentUser?.role === 'technician' ? 'qr_scanner' : 'inventory')}
              onSelectEquipmentForReport={(eq, room) => {
                setReportPrefill({ equipment: eq, room: room });
                setActiveTab('report_issue');
              }}
            />
          </div>
        );

      case 'report_issue':
        return renderSubPageWrapper(
          'Báo Hỏng Thiết Bị Thực Địa',
          'MODULE 04 • BÁO HỎNG SỰ CỐ',
          <ReportIssuePage
            onNavigateTab={(tab) => setActiveTab(tab)}
            preselectedEquipment={reportPrefill.equipment}
            preselectedRoom={reportPrefill.room}
          />
        );

      case 'my_tickets':
        return renderSubPageWrapper(
          'Phiếu Sửa Chữa Của Tôi & Đánh Giá Dịch Vụ',
          'MODULE 04 • THEO DÕI & ĐÁNH GIÁ',
          <LecturerTicketsPage onNavigateTab={(tab) => setActiveTab(tab)} />
        );

      // 3. Technician Views
      case 'assigned_tasks':
        return renderSubPageWrapper(
          'Nhiệm Vụ Sửa Chữa & Nhật Ký Khắc Phục',
          'MODULE 04 • KỸ THUẬT VIÊN',
          <TechnicianTasksPage />
        );

      case 'spare_parts':
        return renderSubPageWrapper(
          'Kho Linh Kiện & Phiếu Yêu Cầu Thay Thế',
          'MODULE 04 • LINH KIỆN VẬT TƯ',
          <SparePartsPage />
        );

      case 'movement_tasks':
        return renderSubPageWrapper(
          'Lệnh Di Chuyển & Thay Thế Thiết Bị Dự Phòng',
          'MODULE 03 • ĐIỀU ĐỘNG THỰC ĐỊA',
          <MovementTasksPage />
        );

      case 'qr_scanner':
        return renderSubPageWrapper(
          'Quét Mã QR & Tra Cứu Thông Số Kỹ Thuật',
          'MODULE 03 • TRA CỨU TẠI CHỖ',
          <QRScannerPage />
        );

      // 4. Facility Manager Views
      case 'tickets_kanban':
      case 'tickets':
      case 'repairs':
      case 'maintenance': // Legacy alias routed to repairs/kanban
        return renderSubPageWrapper(
          'Phiếu Sửa Chữa & Điều Phối Kỹ Thuật (Kanban SLA)',
          'MODULE 04 • QUẢN LÝ SỰ CỐ',
          <TicketKanbanPage />
        );

      case 'warehouse':
        return renderSubPageWrapper(
          'Kho Dự Phòng KHO-01 & Định Mức Phòng Học',
          'MODULE 03 • KHO DỰ PHÒNG',
          <WarehouseStockPage />
        );

      case 'movements':
      case 'transfers': // Legacy alias routed to movements
        return renderSubPageWrapper(
          'Điều Chuyển Trang Thiết Bị Giữa Các Phòng',
          'MODULE 03 • ĐIỀU CHUYỂN TÀI SẢN',
          <MovementsPage />
        );

      case 'equipments':
        return renderSubPageWrapper(
          'Kho Quản Lý Thiết Bị Trường & Tem Nhãn QR',
          'MODULE 03 • DANH MỤC THIẾT BỊ',
          <EquipmentsPage />
        );

      case 'inventory':
        return renderSubPageWrapper(
          'Kiểm Kê CSVC & Đối Soát Mã QR Thực Địa',
          'MODULE 05 • KIỂM KÊ TÀI SẢN',
          <InventoryPage />
        );

      case 'disposal_propose':
      case 'disposal_calc': // Legacy alias
        return renderSubPageWrapper(
          'Đề Xuất Thanh Lý Thiết Bị (Hao Mòn R ≥ 60%)',
          'MODULE 03 • THANH LÝ TÀI SẢN',
          <DisposalProposePage />
        );

      // 5. Admin Views
      case 'users':
        return renderSubPageWrapper(
          'Quản Lý Người Dùng & Phân Bổ Vai Trò',
          'MODULE 01 • QUẢN TRỊ HỆ THỐNG',
          <UserManagementPage />
        );

      case 'rbac':
        return renderSubPageWrapper(
          'Ma Trận Phân Quyền 4 Vai Trò (RBAC Dynamic)',
          'MODULE 01 • PHÂN QUYỀN TRUY CẬP',
          <RBACMatrixPage />
        );

      case 'master_data':
        return renderSubPageWrapper(
          'Danh Mục Dữ Liệu Nền (Loại TB, NCC, Đơn Vị SC, Phòng)',
          'MODULE 02 • DỮ LIỆU DANH MỤC',
          <MasterDataPage />
        );

      case 'disposal_approval':
      case 'disposals': // Legacy alias for admin
        return renderSubPageWrapper(
          'Phê Duyệt Hồ Sơ Thanh Lý (Ban Giám Hiệu QĐ-TL)',
          'MODULE 03 • QUYẾT ĐỊNH THANH LÝ',
          <DisposalApprovalPage />
        );

      case 'audit_log':
        return renderSubPageWrapper(
          'Sổ Cái Nhật Ký Kiểm Toán SHA-256 Bất Biến',
          'MODULE 06 • BẢO MẬT & KIỂM TOÁN',
          <AuditLogPage />
        );

      // 6. Visual Space Twin (Merged into Dashboard)
      case 'map':
        return (
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '12px 24px 60px' }}>
            <Dashboard
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenQRModal={() => setActiveTab(currentUser?.role === 'technician' ? 'qr_scanner' : 'inventory')}
              onSelectEquipmentForReport={(eq, room) => {
                setReportPrefill({ equipment: eq, room: room });
                setActiveTab('report_issue');
              }}
            />
          </div>
        );

      default:
        // All canonical actors land on the Interactive Classroom Layout Floor Plan (Building A1 Digital Twin)
        return (
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '12px 24px 60px' }}>
            <Dashboard
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenQRModal={() => setActiveTab(currentUser?.role === 'technician' ? 'qr_scanner' : 'inventory')}
              onSelectEquipmentForReport={(eq, room) => {
                setReportPrefill({ equipment: eq, room: room });
                setActiveTab('report_issue');
              }}
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
        onOpenQRDemo={() => setActiveTab(currentUser?.role === 'technician' ? 'qr_scanner' : 'inventory')}
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
