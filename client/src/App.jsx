import React, { useState, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppHeader } from './components/layout/AppHeader';
import { Dashboard } from './pages/dashboard/Dashboard';
import { Icons } from './components/common/SvgIcons';
import { useRouter } from './lib/router';

// Code-Splitting: Lazy load UEMS core module pages

// Room & Facility Module Pages (all roles)
const RoomListPage = lazy(() => import('./pages/rooms/RoomListPage').then(m => ({ default: m.RoomListPage })));

// Lecturer Module Pages
const ReportIssuePage = lazy(() => import('./pages/lecturer/ReportIssuePage').then(m => ({ default: m.ReportIssuePage })));
const LecturerTicketsPage = lazy(() => import('./pages/lecturer/LecturerTicketsPage').then(m => ({ default: m.LecturerTicketsPage })));

// Technician Module Pages
const TechnicianTasksPage = lazy(() => import('./pages/technician/TechnicianTasksPage').then(m => ({ default: m.TechnicianTasksPage })));
const SparePartsPage = lazy(() => import('./pages/technician/SparePartsPage').then(m => ({ default: m.SparePartsPage })));
const MovementTasksPage = lazy(() => import('./pages/technician/MovementTasksPage').then(m => ({ default: m.MovementTasksPage })));
const QRScannerPage = lazy(() => import('./pages/technician/QRScannerPage').then(m => ({ default: m.QRScannerPage })));

// Facility Manager Module Pages
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const TicketKanbanPage = lazy(() => import('./pages/incidents/TicketKanbanPage').then(m => ({ default: m.TicketKanbanPage })));
const WarehouseStockPage = lazy(() => import('./pages/facility/WarehouseStockPage').then(m => ({ default: m.WarehouseStockPage })));
const MovementsPage = lazy(() => import('./pages/facility/MovementsPage').then(m => ({ default: m.MovementsPage })));
const MaintenancePage = lazy(() => import('./pages/facility/MaintenancePage').then(m => ({ default: m.MaintenancePage })));
const TransferHistoryPage = lazy(() => import('./pages/transfers/TransferHistoryPage').then(m => ({ default: m.TransferHistoryPage })));
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
const MandatoryPasswordChangeModal = lazy(() => import('./components/auth/MandatoryPasswordChangeModal').then(m => ({ default: m.MandatoryPasswordChangeModal })));

// Sleek native SVG loading spinner
const LazyFallback = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '380px', gap: '14px', color: 'var(--ink-muted)' }}>
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--blueprint-500)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
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
          className="ruo-btn ruo-btn-ghost ruo-btn-sm ruo-back-nav-btn"
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
      // Room & Facility Directory
      case 'rooms':
        return renderSubPageWrapper(
          'Danh Mục Phòng Học Tòa A1',
          'HỆ THỐNG PHÒNG HỌC & CƠ SỞ VẬT CHẤT',
          <RoomListPage />
        );

      // 2. Lecturer Views
      case 'report_issue':
        return renderSubPageWrapper(
          'Báo Hỏng Thiết Bị Thực Địa',
          'BÁO HỎNG & TIẾP NHẬN SỰ CỐ',
          <ReportIssuePage
            onNavigateTab={(tab) => setActiveTab(tab)}
            preselectedEquipment={reportPrefill.equipment}
            preselectedRoom={reportPrefill.room}
          />
        );

      case 'my_tickets':
        return renderSubPageWrapper(
          'Phiếu Sửa Chữa Của Tôi & Đánh Giá Dịch Vụ',
          'TIẾN ĐỘ SỬA CHỮA & ĐÁNH GIÁ DỊCH VỤ',
          <LecturerTicketsPage onNavigateTab={(tab) => setActiveTab(tab)} />
        );

      // 3. Technician Views
      case 'assigned_tasks':
        return renderSubPageWrapper(
          'Nhiệm Vụ Sửa Chữa & Nhật Ký Khắc Phục',
          'NHIỆM VỤ SỬA CHỮA & TIẾP NHẬN SLA',
          <TechnicianTasksPage />
        );

      case 'spare_parts':
        return renderSubPageWrapper(
          'Kho Linh Kiện & Phiếu Yêu Cầu Thay Thế',
          'KHO LINH KIỆN & PHIẾU YÊU CẦU THAY THẾ',
          <SparePartsPage />
        );

      case 'movement_tasks':
        return renderSubPageWrapper(
          'Lệnh Di Chuyển & Thay Thế Thiết Bị Dự Phòng',
          'LỆNH DI CHUYỂN & THAY THẾ THỰC ĐỊA',
          <MovementTasksPage />
        );

      case 'transfer_history':
        return renderSubPageWrapper(
          'Lịch Sử Điều Chuyển Thiết Bị',
          'LỊCH SỬ ĐIỀU CHUYỂN THIẾT BỊ',
          <TransferHistoryPage />
        );

      case 'qr_scanner':
        return renderSubPageWrapper(
          'Quét Mã QR & Tra Cứu Thông Số Kỹ Thuật',
          'QUÉT MÃ QR & TRA CỨU TẠI CHỖ',
          <QRScannerPage />
        );

      // 4. Facility Manager Views
      case 'reports':
        return renderSubPageWrapper('Báo Cáo Tài Sản & Vận Hành', 'BÁO CÁO QUẢN TRỊ', <ReportsPage />);

      case 'tickets_kanban':
      case 'tickets':
      case 'repairs':
        return renderSubPageWrapper(
          'Phiếu Sửa Chữa & Điều Phối Kỹ Thuật (Kanban SLA)',
          'ĐIỀU PHỐI SỰ CỐ & SỬA CHỮA (KANBAN SLA)',
          <TicketKanbanPage />
        );

      case 'maintenance':
        return renderSubPageWrapper(
          'Lịch Bảo Dưỡng Định Kỳ',
          'BẢO DƯỠNG ĐỊNH KỲ & PHÒNG NGỪA',
          <MaintenancePage />
        );

      case 'warehouse':
        return renderSubPageWrapper(
          'Kho Dự Phòng KHO-01 & Định Mức Phòng Học',
          'KHO DỰ PHÒNG & ĐỊNH MỨC PHÒNG HỌC',
          <WarehouseStockPage />
        );

      case 'movements':
        return renderSubPageWrapper(
          'Điều Chuyển Trang Thiết Bị Giữa Các Phòng',
          'ĐIỀU CHUYỂN TRANG THIẾT BỊ GIỮA CÁC PHÒNG',
          <MovementsPage />
        );

      case 'equipments':
        return renderSubPageWrapper(
          'Kho Quản Lý Thiết Bị Trường & Tem Nhãn QR',
          'DANH MỤC THIẾT BỊ & HỒ SƠ TÀI SẢN',
          <EquipmentsPage />
        );

      case 'inventory':
        return renderSubPageWrapper(
          'Kiểm Kê CSVC & Đối Soát Mã QR Thực Địa',
          'KIỂM KÊ TÀI SẢN & ĐỐI SOÁT THỰC ĐỊA',
          <InventoryPage />
        );

      case 'disposal_propose':
      case 'disposal_calc': // Legacy alias
        return renderSubPageWrapper(
          'Đề Xuất Thanh Lý Thiết Bị (Hao Mòn R ≥ 60%)',
          'ĐỀ XUẤT & THẨM ĐỊNH THANH LÝ TÀI SẢN',
          <DisposalProposePage />
        );

      // 5. Admin Views
      case 'users':
        return renderSubPageWrapper(
          'Quản Lý Người Dùng & Phân Bổ Vai Trò',
          'QUẢN TRỊ TÀI KHOẢN & NGƯỜI DÙNG',
          <UserManagementPage />
        );

      case 'rbac':
        return renderSubPageWrapper(
          'Ma Trận Phân Quyền 4 Vai Trò (RBAC Dynamic)',
          'MA TRẬN PHÂN QUYỀN TRUY CẬP (RBAC)',
          <RBACMatrixPage />
        );

      case 'master_data':
        return renderSubPageWrapper(
          'Danh Mục Dữ Liệu Nền (Loại TB, NCC, Đơn Vị SC, Phòng)',
          'DANH MỤC DỮ LIỆU NỀN TẢNG',
          <MasterDataPage />
        );

      case 'disposal_approval':
      case 'disposals': // Legacy alias for admin
        return renderSubPageWrapper(
          'Phê Duyệt Hồ Sơ Thanh Lý (Ban Giám Hiệu QĐ-TL)',
          'HỒ SƠ THANH LÝ TÀI SẢN',
          <DisposalApprovalPage />
        );

      case 'audit_log':
        return renderSubPageWrapper(
          'Sổ Cái Nhật Ký Kiểm Toán SHA-256 Bất Biến',
          'BẢO MẬT & KIỂM TOÁN SHA-256',
          <AuditLogPage />
        );

      // 6. Unified Dashboard & Spatial CAD Digital Twin (All Actors)
      case 'dashboard':
      case 'my_rooms':
      case 'map':
      default:
        return (
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '12px 24px 60px' }}>
            <Dashboard
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenQRModal={() => setActiveTab('qr_scanner')}
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
        onOpenQRDemo={() => setActiveTab('qr_scanner')}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* Main Subsystem Viewport */}
      <main className="ruo-main-viewport">
        <Suspense fallback={<LazyFallback />}>
          <div key={activeTab} className="ruo-view-enter">
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

      {/* UC-10.6: Enforce Mandatory Password Change on First Login */}
      <Suspense fallback={null}>
        {currentUser?.force_change_pw && (
          <MandatoryPasswordChangeModal />
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
