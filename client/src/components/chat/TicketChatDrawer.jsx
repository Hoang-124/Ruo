import React, { useState, useEffect, useRef } from 'react';
import { chatApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../common/SvgIcons';

export const TicketChatDrawer = ({ isOpen, onClose, ticket, onTicketUpdated }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [ticketMeta, setTicketMeta] = useState(ticket || null);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const messagesEndRef = useRef(null);
  const pollTimerRef = useRef(null);

  const repairId = ticket?._id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async (showLoading = false) => {
    if (!repairId) return;
    if (showLoading) setLoading(true);
    try {
      const res = await chatApi.getTicketMessages(repairId);
      if (res?.success) {
        setMessages(res.messages || []);
        if (res.ticket) setTicketMeta(res.ticket);
      }
    } catch (err) {
      if (showLoading) {
        setErrorMsg('Không thể tải tin nhắn: ' + (err.message || 'Lỗi kết nối'));
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && repairId) {
      fetchMessages(true);
      // Polling updates every 4 seconds while drawer is active
      pollTimerRef.current = setInterval(() => {
        fetchMessages(false);
      }, 4000);
    } else {
      setMessages([]);
      setErrorMsg('');
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, repairId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || sending || !repairId) return;

    setSending(true);
    setErrorMsg('');
    try {
      const res = await chatApi.sendTicketMessage(repairId, { content: text });
      if (res?.success && res.message) {
        setMessages((prev) => [...prev, res.message]);
        setInputValue('');
        if (onTicketUpdated) onTicketUpdated();
      }
    } catch (err) {
      setErrorMsg('Gửi thất bại: ' + (err.message || 'Lỗi mạng'));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  const isClosed = ticketMeta?.is_closed || ['resolved', 'closed', 'repaired'].includes(ticketMeta?.status);
  const isTechnician = currentUser?.role === 'technician';

  // Quick reply options depending on user role
  const quickReplies = isTechnician
    ? [
        'KTV đã tiếp nhận và đang trên đường tới phòng.',
        'Đã kiểm tra, thiết bị hỏng linh kiện và KTV đã xin xuất kho.',
        'Đã khắc phục xong, kính mời Thầy/Cô kiểm tra lại.'
      ]
    : [
        'Thiết bị đột ngột mất nguồn khi đang giảng dạy.',
        'Nhờ KTV kiểm tra gấp trước ca học tiếp theo.',
        'Đã test thử, thiết bị hoạt động tốt. Cảm ơn KTV!'
      ];

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'lecturer':
        return <span style={{ fontSize: '10px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>Giảng Viên</span>;
      case 'technician':
        return <span style={{ fontSize: '10px', background: 'rgba(234,88,12,0.1)', color: '#ea580c', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>Kỹ Thuật Viên</span>;
      case 'facility_manager':
      case 'admin':
        return <span style={{ fontSize: '10px', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>Quản Lý CSVC</span>;
      default:
        return <span style={{ fontSize: '10px', background: 'rgba(100,116,139,0.1)', color: '#64748b', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>Hệ Thống</span>;
    }
  };

  return (
    <div className="ruo-drawer-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="ruo-drawer-panel"
        style={{
          width: '560px',
          maxWidth: '100vw',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.18)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          className="ruo-drawer-header"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--surface-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: 'var(--blueprint-500)',
                  background: 'rgba(37,99,235,0.08)',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}
              >
                {ticketMeta?.ticket_code || ticket?.ticket_code || 'TICKET'}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 7px',
                  borderRadius: '999px',
                  fontWeight: 700,
                  background: isClosed ? 'rgba(22,163,74,0.1)' : 'rgba(234,88,12,0.1)',
                  color: isClosed ? '#16a34a' : '#ea580c'
                }}
              >
                {isClosed ? 'Đã Nghiệm Thu' : 'Đang Xử Lý'}
              </span>
            </div>
            <h2
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--ink-pure)',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={ticketMeta?.equipment?.name || ticket?.equipment_id?.name || 'Trao đổi sự cố'}
            >
              {ticketMeta?.equipment?.name || ticket?.equipment_id?.name || 'Trao đổi sự cố kỹ thuật'}
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--ink-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Icons.MapPin size={12} color="var(--blueprint-500)" />
                {ticketMeta?.room?.code || ticket?.room_id?.code || 'Phòng học'}
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Icons.User size={12} color="var(--ink-secondary)" />
                Giảng viên: <strong>{ticketMeta?.reported_by?.full_name || 'Chưa rõ'}</strong>
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Icons.Wrench size={12} color="#ea580c" />
                KTV: <strong>{ticketMeta?.assigned_to?.full_name || currentUser?.name || 'Kỹ thuật viên'}</strong>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="ruo-btn ruo-btn-ghost ruo-btn-sm"
            style={{ padding: '6px', borderRadius: '50%', color: 'var(--ink-muted)' }}
            title="Đóng khung chat"
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Closed Banner Notification */}
        {isClosed && (
          <div
            style={{
              padding: '10px 16px',
              background: 'rgba(22,163,74,0.08)',
              borderBottom: '1px solid rgba(22,163,74,0.2)',
              color: '#15803d',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Icons.CheckCircle size={16} />
            <span>Phiếu sửa chữa đã hoàn thành. Kênh chat chuyển sang chế độ <strong>Lưu trữ (Chỉ xem)</strong>.</span>
          </div>
        )}

        {/* Message Thread Container */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            background: 'var(--bg-app)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', color: 'var(--ink-muted)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--blueprint-500)" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span style={{ fontSize: '13px' }}>Đang nạp lịch sử trao đổi...</span>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-muted)' }}>
              <div style={{ width: '48px', height: '48px', margin: '0 auto 12px', background: 'rgba(37,99,235,0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blueprint-500)' }}>
                <Icons.MessageSquare size={24} />
              </div>
              <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: 'var(--ink-pure)', fontWeight: 600 }}>Chưa có tin nhắn nào</h4>
              <p style={{ margin: 0, fontSize: '12.5px' }}>Bắt đầu trao đổi giữa Giảng viên và Kỹ thuật viên phụ trách để phối hợp xử lý sự cố nhanh nhất.</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMine = msg.sender_id?.toString() === currentUser?._id?.toString() || msg.sender_name === currentUser?.full_name;
              const isSystem = msg.message_type === 'system_event' || msg.sender_role === 'system';

              if (isSystem) {
                return (
                  <div key={msg._id || index} style={{ textAlign: 'center', margin: '8px 0' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '999px',
                        background: 'rgba(100,116,139,0.12)',
                        color: 'var(--ink-secondary)',
                        fontSize: '11.5px',
                        fontWeight: 500
                      }}
                    >
                      {msg.content}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg._id || index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMine ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    alignSelf: isMine ? 'flex-end' : 'flex-start'
                  }}
                >
                  {/* Sender Label & Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', fontSize: '11px', color: 'var(--ink-muted)' }}>
                    {!isMine && <span style={{ fontWeight: 600, color: 'var(--ink-secondary)' }}>{msg.sender_name}</span>}
                    {!isMine && getRoleBadge(msg.sender_role)}
                    <span>{formatTime(msg.created_at)}</span>
                  </div>

                  {/* Bubble */}
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: isMine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      background: isMine ? 'var(--blueprint-500)' : 'var(--surface-primary)',
                      color: isMine ? '#ffffff' : 'var(--ink-pure)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      border: isMine ? 'none' : '1px solid var(--border-subtle)',
                      fontSize: '13px',
                      lineHeight: '1.45',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {msg.content}

                    {msg.attachment_url && (
                      <div style={{ marginTop: '8px', borderRadius: '6px', overflow: 'hidden' }}>
                        <img src={msg.attachment_url} alt="Hiện trường" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover' }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        {!isClosed && (
          <div
            style={{
              padding: '8px 16px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--surface-secondary)',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap'
            }}
          >
            {quickReplies.map((reply, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(reply)}
                disabled={sending}
                style={{
                  fontSize: '11.5px',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: 'var(--surface-primary)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--ink-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'var(--blueprint-500)';
                  e.currentTarget.style.color = 'var(--blueprint-500)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                  e.currentTarget.style.color = 'var(--ink-secondary)';
                }}
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div
          style={{
            padding: '14px 16px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--surface-primary)'
          }}
        >
          {errorMsg && (
            <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Icons.AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <textarea
              rows={2}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isClosed || sending}
              placeholder={isClosed ? 'Phiếu đã đóng, không thể gửi tin nhắn mới.' : 'Nhập tin nhắn trao đổi (Nhấn Enter để gửi)...'}
              style={{
                flex: 1,
                resize: 'none',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                background: isClosed ? 'var(--bg-app)' : 'var(--surface-primary)',
                color: 'var(--ink-pure)',
                fontSize: '13px',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={isClosed || sending || !inputValue.trim()}
              className="laser-btn laser-btn-primary"
              style={{
                padding: '10px 16px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                opacity: (isClosed || sending || !inputValue.trim()) ? 0.5 : 1
              }}
            >
              <Icons.Send size={16} />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Gửi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketChatDrawer;
