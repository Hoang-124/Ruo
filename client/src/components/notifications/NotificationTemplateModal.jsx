import React, { useState, useEffect } from 'react';
import { adminConfigApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

/**
 * Strict Native Inline SVGs (No external icon libraries - AGENTS.md rule)
 */
const ModalSvg = {
  Template: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Save: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  Reset: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),
  Eye: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Edit: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  X: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Sparkles: ({ size = 13, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  ),
  User: ({ size = 13, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Box: ({ size = 13, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  ShieldCheck: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  CheckCircle: ({ size = 13, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  AlertTriangle: ({ size = 13, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
};

export const NotificationTemplateModal = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [activeKey, setActiveKey] = useState('repair_assigned');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [targetField, setTargetField] = useState('body');

  // SHA-256 Audit Chain Verification State (GET /api/audit/verify-chain - UC-9.4)
  const [chainStatus, setChainStatus] = useState({
    checked: false,
    isValid: null,
    totalLogs: 0,
    message: '',
    loading: false
  });

  // Form edit state for currently active template
  const [formData, setFormData] = useState({
    subject: '',
    title: '',
    body: '',
    badge_text: '',
    badge_color: '#0369A1',
    badge_bg: '#E0F2FE'
  });

  // Fetch templates from backend API
  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await adminConfigApi.getTemplates();
      if (res && res.success && Array.isArray(res.templates)) {
        setTemplates(res.templates);
        const current = res.templates.find((t) => t.key === activeKey) || res.templates[0];
        if (current) {
          setActiveKey(current.key);
          setFormData({
            subject: current.subject || '',
            title: current.title || '',
            body: current.body || '',
            badge_text: current.badge_text || '',
            badge_color: current.badge_color || '#0369A1',
            badge_bg: current.badge_bg || '#E0F2FE'
          });
        }
      }
    } catch (err) {
      toast.error('Lỗi tải danh sách mẫu thông báo: ' + (err.message || 'Lỗi mạng'));
    } finally {
      setIsLoading(false);
    }
  };

  // Cryptographic audit chain verification handler (GET /api/audit/verify-chain)
  const handleVerifyChain = async ({ silent = false } = {}) => {
    setChainStatus((prev) => ({ ...prev, loading: true }));
    try {
      const res = await adminConfigApi.verifyChain();
      if (res && res.success && res.verification) {
        const v = res.verification;
        setChainStatus({
          checked: true,
          isValid: v.isValid !== false,
          totalLogs: v.totalLogs || v.total_checked || 0,
          message: v.message || 'Chuỗi kiểm toán SHA-256 nguyên vẹn.',
          loading: false
        });
        if (!silent) {
          toast.success(`Xác minh thành công: ${v.totalLogs || 0} khối kiểm toán SHA-256 nguyên vẹn!`);
        }
      } else {
        setChainStatus({
          checked: true,
          isValid: false,
          totalLogs: 0,
          message: 'Không thể xác thực tính toàn vẹn của chuỗi.',
          loading: false
        });
      }
    } catch (err) {
      setChainStatus({
        checked: true,
        isValid: false,
        totalLogs: 0,
        message: err.message || 'Lỗi khi gọi API kiểm tra chuỗi băm.',
        loading: false
      });
      if (!silent) {
        toast.error('Lỗi kiểm tra chuỗi SHA-256: ' + (err.message || 'Lỗi mạng'));
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      handleVerifyChain({ silent: true });
    }
  }, [isOpen]);

  // Switch template handler
  const handleSelectTemplate = (key) => {
    setActiveKey(key);
    const found = templates.find((t) => t.key === key);
    if (found) {
      setFormData({
        subject: found.subject || '',
        title: found.title || '',
        body: found.body || '',
        badge_text: found.badge_text || '',
        badge_color: found.badge_color || '#0369A1',
        badge_bg: found.badge_bg || '#E0F2FE'
      });
    }
  };

  const activeTemplateMeta = templates.find((t) => t.key === activeKey) || {
    name: 'Mẫu thông báo',
    availableVariables: []
  };

  // Insert variable tag into active focused field or body
  const handleInsertTag = (tag) => {
    setFormData((prev) => {
      const currentVal = prev[targetField] || '';
      return {
        ...prev,
        [targetField]: currentVal ? `${currentVal} ${tag}` : tag
      };
    });
    const fieldName = targetField === 'subject' ? 'tiêu đề email' : targetField === 'title' ? 'tiêu đề' : 'nội dung';
    toast.success(`Đã chèn biến ${tag} vào ${fieldName}!`);
  };

  // Save template with cryptographic audit trail
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!formData.subject || !formData.title || !formData.body) {
      toast.error('Vui lòng điền đầy đủ tiêu đề email, tiêu đề thông báo và nội dung!');
      return;
    }

    setIsSaving(true);
    try {
      const res = await adminConfigApi.updateTemplate({
        key: activeKey,
        ...formData
      });

      if (res && res.success) {
        toast.success(res.message || 'Đã lưu mẫu thông báo thành công và ghi nhận vào sổ cái kiểm toán!');
        // Update local state
        setTemplates((prev) =>
          prev.map((t) => (t.key === activeKey ? { ...t, ...res.template, is_customized: true } : t))
        );
        // Refresh chain status
        handleVerifyChain();
      } else {
        toast.error(res.message || 'Không thể lưu mẫu thông báo.');
      }
    } catch (err) {
      toast.error('Lỗi lưu mẫu thông báo: ' + (err.message || 'Lỗi hệ thống'));
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to university defaults
  const handleReset = async () => {
    if (!window.confirm('Bạn có chắc muốn khôi phục mẫu này về thiết lập mặc định của viện không?')) return;
    try {
      const res = await adminConfigApi.resetTemplate(activeKey);
      if (res && res.success) {
        toast.success(res.message || 'Đã khôi phục mặc định thành công.');
        await fetchTemplates();
        handleVerifyChain();
      }
    } catch (err) {
      toast.error('Lỗi khôi phục: ' + (err.message || 'Lỗi mạng'));
    }
  };

  // Sample data for realistic preview rendering (supports both camelCase & snake_case)
  const sampleValues = {
    userName: 'Lê Thị Uyên (Admin CSVC)',
    user_name: 'Lê Thị Uyên (Admin CSVC)',
    equipmentName: 'Máy Chiếu Sony Laser 4K VPL-PHZ50',
    equipment_name: 'Máy Chiếu Sony Laser 4K VPL-PHZ50',
    equipmentCode: 'EQ-PRJ-302',
    equipment_code: 'EQ-PRJ-302',
    ticketCode: 'RP-2026-888',
    ticket_code: 'RP-2026-888',
    roomCode: 'P302',
    room_code: 'P302',
    deadline: '17:00 ngày 26/10/2026',
    priority: 'Khẩn Cấp',
    requestType: 'Đề xuất thanh lý',
    request_type: 'Đề xuất thanh lý',
    requestCode: 'TL-2026-009',
    request_code: 'TL-2026-009',
    requesterName: 'Nguyễn Văn Minh (KTV)',
    requester_name: 'Nguyễn Văn Minh (KTV)',
    reason: 'Hỏng bo mạch quang học và nguồn điện không thể khắc phục',
    recoveryValue: '1.800.000',
    recovery_value: '1.800.000',
    summary: 'Thanh lý máy chiếu hết khấu hao phòng học',
    hoursOverdue: '3',
    hours_overdue: '3',
    email: 'canbo@ruo.edu.vn',
    otp: '749102',
    expiryMinutes: '15',
    expiry_minutes: '15'
  };

  const renderPreviewText = (text) => {
    if (!text) return '';
    return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      if (sampleValues[key]) return sampleValues[key];
      const snake = key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`).replace(/^_/, '');
      if (sampleValues[snake]) return sampleValues[snake];
      const camel = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
      if (sampleValues[camel]) return sampleValues[camel];
      return `[${key}]`;
    });
  };

  // Detect placeholders used in the current template inputs
  const detectedTags = [
    ...new Set(
      `${formData.subject} ${formData.title} ${formData.body}`.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) || []
    )
  ].map((t) => t.replace(/[\{\}\s]/g, ''));

  if (!isOpen) return null;

  return (
    <div className="ruo-modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="ruo-modal-card"
        style={{
          width: '95%',
          maxWidth: '920px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--hairline-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-secondary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(234, 88, 12, 0.15) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB'
              }}
            >
              <ModalSvg.Template size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--ink-pure)' }}>
                  Quản Lý Mẫu Thông Báo & Email (Template Config)
                </h3>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: '#EFF6FF',
                    color: '#1E40AF',
                    border: '1px solid #BFDBFE'
                  }}
                >
                  UC-9.4 Standardized
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                Chuẩn hóa Placeholders: <code style={{ color: '#2563EB' }}>&#123;&#123;userName&#125;&#125;</code>, <code style={{ color: '#2563EB' }}>&#123;&#123;equipmentName&#125;&#125;</code> và chuỗi băm SHA-256
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* SHA-256 Audit Chain Integrity Badge & Button */}
            <button
              type="button"
              onClick={handleVerifyChain}
              disabled={chainStatus.loading}
              className="ruo-btn ruo-btn-secondary ruo-btn-compact"
              style={{
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                background: chainStatus.isValid ? '#F0FDF4' : '#F8FAFC',
                borderColor: chainStatus.isValid ? '#86EFAC' : 'var(--hairline-soft)',
                color: chainStatus.isValid ? '#166534' : 'var(--ink-secondary)'
              }}
              title="Xác thực toàn vẹn chuỗi băm SHA-256 qua GET /api/audit/verify-chain"
            >
              <ModalSvg.ShieldCheck size={14} color={chainStatus.isValid ? '#16A34A' : '#64748B'} />
              <span>
                {chainStatus.loading
                  ? 'Đang xác minh...'
                  : chainStatus.checked && chainStatus.isValid
                  ? `SHA-256 Toàn Vẹn (${chainStatus.totalLogs} khối)`
                  : 'Xác Minh Chuỗi Băm'}
              </span>
            </button>

            <button
              onClick={onClose}
              className="ruo-icon-button"
              style={{ width: '32px', height: '32px', borderRadius: '8px' }}
              title="Đóng cửa sổ"
            >
              <ModalSvg.X size={15} />
            </button>
          </div>
        </div>

        {/* Template Selector Navigation Bar */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '10px 24px',
            background: 'var(--surface-primary)',
            borderBottom: '1px solid var(--hairline-soft)',
            overflowX: 'auto'
          }}
        >
          {templates.map((tpl) => {
            const isSelected = tpl.key === activeKey;
            return (
              <button
                key={tpl.key}
                type="button"
                onClick={() => handleSelectTemplate(tpl.key)}
                className={`ruo-tab-pill ${isSelected ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px'
                }}
              >
                <span>{tpl.name}</span>
                {tpl.is_customized && (
                  <span
                    style={{
                      fontSize: '9.5px',
                      padding: '1px 5px',
                      borderRadius: '9999px',
                      background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(37, 99, 235, 0.15)',
                      color: isSelected ? '#FFFFFF' : '#2563EB',
                      fontWeight: 700
                    }}
                  >
                    Tùy biến
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Editor & Preview Grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 1fr)',
            gap: '20px'
          }}
        >
          {/* Left Column: Form Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-pure)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ModalSvg.Edit size={14} color="#2563EB" />
                Cấu hình nội dung mẫu
              </span>

              {activeTemplateMeta.is_customized && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="ruo-btn ruo-btn-secondary ruo-btn-compact"
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                  title="Xóa tùy biến, trở về nội dung chuẩn của viện"
                >
                  <ModalSvg.Reset size={11} />
                  <span>Về mặc định</span>
                </button>
              )}
            </div>

            {/* Email Subject Field */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                  Tiêu đề Email (Subject)
                </label>
                <span style={{ fontSize: '10.5px', color: targetField === 'subject' ? '#2563EB' : 'var(--ink-muted)' }}>
                  {targetField === 'subject' ? '● Đang chọn chèn biến' : ''}
                </span>
              </div>
              <input
                type="text"
                className="ruo-input"
                style={{ width: '100%', fontSize: '13px', padding: '8px 12px' }}
                value={formData.subject}
                onFocus={() => setTargetField('subject')}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="VD: [RUO UFMS] Phân công ca sửa chữa mới — Phiếu #{{ticketCode}}..."
              />
            </div>

            {/* In-app Notification Title & Badge */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '5px', color: 'var(--ink-secondary)' }}>
                  Tiêu đề thông báo Drawer
                </label>
                <input
                  type="text"
                  className="ruo-input"
                  style={{ width: '100%', fontSize: '13px', padding: '8px 12px' }}
                  value={formData.title}
                  onFocus={() => setTargetField('title')}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Tiêu đề thông báo ngắn gọn"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '5px', color: 'var(--ink-secondary)' }}>
                  Nhãn Badge
                </label>
                <input
                  type="text"
                  className="ruo-input"
                  style={{ width: '100%', fontSize: '13px', padding: '8px 12px' }}
                  value={formData.badge_text}
                  onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                  placeholder="VD: KHẨN CẤP"
                />
              </div>
            </div>

            {/* Message Body Field */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                  Nội dung chi tiết thông điệp (Body)
                </label>
                <span style={{ fontSize: '10.5px', color: targetField === 'body' ? '#2563EB' : 'var(--ink-muted)' }}>
                  {targetField === 'body' ? '● Đang chọn chèn biến' : ''}
                </span>
              </div>
              <textarea
                className="ruo-input"
                rows={5}
                style={{ width: '100%', fontSize: '13px', padding: '10px 12px', lineHeight: 1.5, fontFamily: 'inherit' }}
                value={formData.body}
                onFocus={() => setTargetField('body')}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Nhập nội dung mẫu với các thẻ biến chuẩn hóa..."
              />
            </div>

            {/* Standardized Placeholders Quick Insertion Toolbar (UC-9.4) */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(249, 115, 22, 0.05) 100%)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                borderRadius: '8px',
                padding: '10px 12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <ModalSvg.Sparkles size={12} color="#2563EB" />
                  Biến Chuẩn Hóa Cấp Viện (UC-9.4 Standardized):
                </span>
                <span style={{ fontSize: '10px', color: '#64748B' }}>
                  Đang chèn vào: <strong>{targetField}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {/* Standardized {{userName}} chip */}
                <button
                  type="button"
                  onClick={() => handleInsertTag('{{userName}}')}
                  style={{
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    color: '#1E40AF',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Họ tên người nhận / người dùng liên quan"
                >
                  <ModalSvg.User size={12} color="#2563EB" />
                  <span>&#123;&#123;userName&#125;&#125;</span>
                </button>

                {/* Standardized {{equipmentName}} chip */}
                <button
                  type="button"
                  onClick={() => handleInsertTag('{{equipmentName}}')}
                  style={{
                    background: '#FFF7ED',
                    border: '1px solid #FED7AA',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    color: '#C2410C',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Tên thiết bị cơ sở vật chất (VD: Máy chiếu Sony Laser 4K)"
                >
                  <ModalSvg.Box size={12} color="#EA580C" />
                  <span>&#123;&#123;equipmentName&#125;&#125;</span>
                </button>

                {/* Additional context variables */}
                {activeTemplateMeta.availableVariables
                  ?.filter((v) => !['{{userName}}', '{{equipmentName}}'].includes(v.tag))
                  .map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => handleInsertTag(v.tag)}
                      style={{
                        background: 'var(--surface-secondary)',
                        border: '1px solid var(--hairline-soft)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        color: 'var(--ink-primary)',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title={v.desc}
                    >
                      {v.tag}
                    </button>
                  ))}
              </div>
            </div>

            {/* Currently Detected Placeholders */}
            {detectedTags.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--ink-muted)', fontWeight: 600 }}>
                  Thẻ biến đang dùng:
                </span>
                {detectedTags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: ['userName', 'equipmentName'].includes(tag) ? '#DBEAFE' : '#F1F5F9',
                      color: ['userName', 'equipmentName'].includes(tag) ? '#1E40AF' : '#475569',
                      fontWeight: 600,
                      fontFamily: 'monospace'
                    }}
                  >
                    &#123;&#123;{tag}&#125;&#125;
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Live Institutional Preview */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--surface-secondary)',
              border: '1px solid var(--hairline-soft)',
              borderRadius: '12px',
              padding: '16px',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--ink-pure)' }}>
                <ModalSvg.Eye size={14} color="#0EA5E9" />
                <span>Mô phỏng dữ liệu thực tế (Live Preview)</span>
              </div>
              <span style={{ fontSize: '10px', color: '#64748B' }}>
                Đã thay thế biến demo
              </span>
            </div>

            {/* Email Box Mockup */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                overflow: 'hidden',
                fontSize: '12.5px',
                color: '#1E293B'
              }}
            >
              {/* Header gradient banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 60%, #2563EB 100%)',
                  padding: '14px 16px',
                  color: '#FFFFFF'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.8px', color: '#93C5FD' }}>
                    RUO UFMS • ĐẠI HỌC RUO
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      background: formData.badge_bg || '#E0F2FE',
                      color: formData.badge_color || '#0369A1',
                      padding: '2px 8px',
                      borderRadius: '9999px'
                    }}
                  >
                    {formData.badge_text || 'THÔNG BÁO'}
                  </span>
                </div>
                <div style={{ marginTop: '4px', fontSize: '14px', fontWeight: 800 }}>
                  {renderPreviewText(formData.title) || 'Tiêu đề thông báo mẫu'}
                </div>
              </div>

              {/* Email Content Preview */}
              <div style={{ padding: '16px' }}>
                <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>
                  <strong>Subject:</strong> {renderPreviewText(formData.subject) || 'Tiêu đề email...'}
                </div>
                <div style={{ fontSize: '12.5px', lineHeight: 1.55, color: '#334155' }}>
                  {renderPreviewText(formData.body) || 'Nội dung thông báo sẽ hiển thị ở đây sau khi thay thế các biến.'}
                </div>
                <div
                  style={{
                    marginTop: '16px',
                    padding: '8px 12px',
                    background: '#F8FAFC',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    fontSize: '11px',
                    color: '#64748B'
                  }}
                >
                  ⏱ <em>Email tự động từ hệ thống Ruo CSVC — Vui lòng không phản hồi.</em>
                </div>
              </div>
            </div>

            {/* Notification Drawer Card Mockup */}
            <div style={{ marginTop: '14px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-muted)', display: 'block', marginBottom: '6px' }}>
                Hiển thị trong Drawer thông báo:
              </span>
              <div
                style={{
                  background: 'var(--surface-primary)',
                  border: '1px solid var(--hairline-soft)',
                  borderLeft: '3.5px solid #0284C7',
                  borderRadius: '8px',
                  padding: '10px 12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '12px', color: 'var(--ink-pure)' }}>
                    {renderPreviewText(formData.title)}
                  </strong>
                  <span style={{ fontSize: '10.5px', color: 'var(--ink-muted)' }}>Vừa xong</span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '11.5px', color: 'var(--ink-secondary)', lineHeight: 1.4 }}>
                  {renderPreviewText(formData.body)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '14px 24px',
            background: 'var(--surface-secondary)',
            borderTop: '1px solid var(--hairline-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {chainStatus.checked && (
              <span
                style={{
                  fontSize: '11.5px',
                  color: chainStatus.isValid ? '#15803D' : '#B91C1C',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 600
                }}
              >
                {chainStatus.isValid ? (
                  <ModalSvg.CheckCircle size={13} color="#16A34A" />
                ) : (
                  <ModalSvg.AlertTriangle size={13} color="#DC2626" />
                )}
                {chainStatus.isValid
                  ? `Mã băm SHA-256 xác thực toàn vẹn (${chainStatus.totalLogs} blocks)`
                  : 'Phát hiện sai lệch chuỗi băm!'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="ruo-btn ruo-btn-secondary"
              onClick={onClose}
              style={{ fontSize: '12px' }}
            >
              Đóng
            </button>
            <button
              type="button"
              className="ruo-btn ruo-btn-primary"
              onClick={handleSave}
              disabled={isSaving}
              style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ModalSvg.Save size={13} />
              <span>{isSaving ? 'Đang lưu & băm SHA-256...' : 'Lưu Mẫu Thông Báo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationTemplateModal;
