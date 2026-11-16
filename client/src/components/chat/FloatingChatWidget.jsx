import React, { useState, useEffect, useRef } from 'react';
import { chatApi, sparePartApi, repairApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../common/SvgIcons';
import { navigate } from '../../lib/router';

// Rich Formatter: strips raw asterisks, eliminates emoji pseudo-icons, creates clean SVG/color hierarchy
const EMOJI_REGEX = /[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u26FF\u2700-\u27BF]/g;

const renderInlineText = (text) => {
  if (!text) return null;
  const sanitized = String(text).replace(EMOJI_REGEX, '').trim();
  const parts = [];
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(sanitized)) !== null) {
    if (match.index > lastIndex) {
      parts.push(sanitized.substring(lastIndex, match.index));
    }

    if (match[2]) {
      const boldText = match[2].trim();
      const isTag = boldText.endsWith(':');
      parts.push(
        <strong
          key={`b-${lastIndex}`}
          style={{
            fontWeight: 700,
            color: isTag ? 'var(--blueprint-600, #2563eb)' : 'var(--ink-pure)',
            background: isTag ? 'rgba(37, 99, 235, 0.10)' : 'rgba(37, 99, 235, 0.06)',
            padding: isTag ? '1px 6px' : '1px 5px',
            borderRadius: '4px',
            margin: '0 2px',
            display: 'inline-block',
            border: isTag ? '1px solid rgba(37, 99, 235, 0.2)' : 'none'
          }}
        >
          {boldText}
        </strong>
      );
    } else if (match[3]) {
      parts.push(
        <code
          key={`c-${lastIndex}`}
          style={{
            fontFamily: 'monospace',
            fontSize: '11.5px',
            background: 'rgba(0,0,0,0.06)',
            padding: '1px 5px',
            borderRadius: '4px',
            color: 'var(--blueprint-600, #2563eb)'
          }}
        >
          {match[3]}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < sanitized.length) {
    parts.push(sanitized.substring(lastIndex));
  }

  return parts;
};

const FormattedAiMessage = ({ content, isUser }) => {
  if (!content) return null;
  if (isUser) {
    return <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.45' }}>{content}</div>;
  }

  const lines = String(content).split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();

        // 1. Empty lines
        if (!line) {
          return <div key={idx} style={{ height: '4px' }} />;
        }

        // 2. Horizontal divider
        if (line === '---' || line === '***') {
          return (
            <hr
              key={idx}
              style={{
                border: 'none',
                borderTop: '1px dashed var(--border-subtle, rgba(0,0,0,0.12))',
                margin: '8px 0'
              }}
            />
          );
        }

        // 3. Section Headers (###, ##, ####)
        const headerMatch = line.match(/^#{2,4}\s*(.*)/);
        if (headerMatch) {
          const headerText = headerMatch[1].replace(EMOJI_REGEX, '').replace(/\*\*/g, '').trim();
          return (
            <div
              key={idx}
              style={{
                fontWeight: 700,
                fontSize: '12.5px',
                color: 'var(--blueprint-600, #2563eb)',
                background: 'rgba(37, 99, 235, 0.08)',
                padding: '4px 10px',
                borderRadius: '6px',
                borderLeft: '3px solid #2563eb',
                marginTop: '8px',
                marginBottom: '4px'
              }}
            >
              {headerText}
            </div>
          );
        }

        // 4. Standalone Bold Section Titles (e.g. **Hướng xử lý nhanh:** or **Lưu ý an toàn:**)
        const subheaderMatch = line.match(/^\*\*([^*]+)\*\*:?$/);
        if (subheaderMatch) {
          const subTitle = subheaderMatch[1];
          const isWarning = /cảnh báo|lưu ý|nguy hiểm|an toàn/i.test(subTitle);
          return (
            <div
              key={idx}
              style={{
                fontWeight: 700,
                fontSize: '12.5px',
                color: isWarning ? '#dc2626' : '#ea580c',
                marginTop: '8px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span
                style={{
                  width: '4px',
                  height: '13px',
                  borderRadius: '2px',
                  background: isWarning ? '#dc2626' : '#ea580c',
                  display: 'inline-block'
                }}
              />
              <span>{subTitle}:</span>
            </div>
          );
        }

        // 5. Numbered Steps (e.g. "1. **Số phòng cụ thể** tại tòa A1?")
        const numMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          const num = numMatch[1];
          const body = numMatch[2];
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                margin: '3px 0',
                lineHeight: '1.5'
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'rgba(37, 99, 235, 0.12)',
                  color: 'var(--blueprint-600, #2563eb)',
                  fontSize: '11px',
                  fontWeight: 800,
                  flexShrink: 0,
                  marginTop: '1px'
                }}
              >
                {num}
              </span>
              <div style={{ flex: 1, color: 'var(--ink-pure)' }}>
                {renderInlineText(body)}
              </div>
            </div>
          );
        }

        // 6. Bullet Items (e.g. "* **Kiểm tra CB:** Bạn hãy kiểm tra...")
        const bulletMatch = line.match(/^[*•-]\s+(.*)/);
        if (bulletMatch) {
          const body = bulletMatch[1];
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                margin: '2px 0 2px 4px',
                lineHeight: '1.5'
              }}
            >
              <span
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: 'var(--blueprint-500, #3b82f6)',
                  display: 'inline-block',
                  flexShrink: 0,
                  marginTop: '7px'
                }}
              />
              <div style={{ flex: 1, color: 'var(--ink-pure)' }}>
                {renderInlineText(body)}
              </div>
            </div>
          );
        }

        // 7. Standard Paragraph
        return (
          <div key={idx} style={{ margin: '2px 0', lineHeight: '1.5', color: 'var(--ink-pure)' }}>
            {renderInlineText(line)}
          </div>
        );
      })}
    </div>
  );
};

export const FloatingChatWidget = () => {
  const { currentUser, isLoggedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'operations'
  const [unreadCount, setUnreadCount] = useState(0);

  // AI Chat state
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSending, setAiSending] = useState(false);

  // Operations Chat state
  const [opsMessages, setOpsMessages] = useState([]);
  const [opsInput, setOpsInput] = useState('');
  const [opsLoading, setOpsLoading] = useState(false);
  const [opsSending, setOpsSending] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [availableParts, setAvailableParts] = useState([]);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [activeRepairs, setActiveRepairs] = useState([]);
  const [selectedRepairId, setSelectedRepairId] = useState('');
  const [requestQty, setRequestQty] = useState(1);
  const [requestReason, setRequestReason] = useState('');
  const [loadingParts, setLoadingParts] = useState(false);

  const messagesEndRef = useRef(null);
  const opsTimerRef = useRef(null);

  const isTechnicianOrManager = ['technician', 'facility_manager', 'admin'].includes(currentUser?.role);

  // Fetch unread count periodically
  const fetchUnread = async () => {
    try {
      const res = await chatApi.getUnreadSummary();
      if (res?.success) {
        setUnreadCount(res.total_unread || 0);
      }
    } catch {
      // Ignore background badge error
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchUnread();
      const interval = setInterval(fetchUnread, 15000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  // Listen to global open chat trigger from header or buttons
  useEffect(() => {
    const handleOpenChat = (e) => {
      setIsOpen(true);
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
      }
    };
    const handleChatRefresh = () => {
      fetchOpsMessages(false);
    };
    window.addEventListener('open-ruo-chat', handleOpenChat);
    window.addEventListener('ruo-chat-refresh', handleChatRefresh);
    return () => {
      window.removeEventListener('open-ruo-chat', handleOpenChat);
      window.removeEventListener('ruo-chat-refresh', handleChatRefresh);
    };
  }, [isTechnicianOrManager]);

  // Load AI history
  const fetchAiHistory = async () => {
    setAiLoading(true);
    try {
      const res = await chatApi.getAiMessages();
      if (res?.success) {
        setAiMessages(res.messages || []);
      }
    } catch {
      // Ignore
    } finally {
      setAiLoading(false);
    }
  };

  // Load Operations messages
  const fetchOpsMessages = async (showLoading = false) => {
    if (!isTechnicianOrManager) return;
    if (showLoading) setOpsLoading(true);
    try {
      const res = await chatApi.getOperationsMessages();
      if (res?.success) {
        setOpsMessages(res.messages || []);
      }
    } catch {
      // Ignore
    } finally {
      if (showLoading) setOpsLoading(false);
    }
  };

  // Switch tabs & trigger load
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'ai') {
        fetchAiHistory();
      } else if (activeTab === 'operations' && isTechnicianOrManager) {
        fetchOpsMessages(true);
        opsTimerRef.current = setInterval(() => fetchOpsMessages(false), 5000);
      }
    } else {
      if (opsTimerRef.current) clearInterval(opsTimerRef.current);
    }

    return () => {
      if (opsTimerRef.current) clearInterval(opsTimerRef.current);
    };
  }, [isOpen, activeTab, isTechnicianOrManager]);

  // Auto-scroll messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, opsMessages, isOpen, activeTab]);

  // Load spare parts list & active repairs when technician wants to create Action Card
  const openRequestPartModal = async () => {
    setShowPartModal(true);
    setLoadingParts(true);
    try {
      const [partsRes, repRes] = await Promise.all([
        sparePartApi.list(),
        repairApi.list()
      ]);
      const list = partsRes?.parts || partsRes?.data || [];
      setAvailableParts(list);
      if (list.length > 0) {
        setSelectedPartId(list[0]._id);
      }
      if (repRes?.success) {
        const inProg = (repRes.repairs || []).filter(r => ['assigned', 'in_progress'].includes(r.status));
        setActiveRepairs(inProg);
        if (inProg.length > 0) {
          setSelectedRepairId(inProg[0]._id);
        }
      }
    } catch (err) {
      console.error('Lỗi tải linh kiện kho & ca sửa:', err);
    } finally {
      setLoadingParts(false);
    }
  };

  // Handle AI question submit
  const handleSendAi = async (customPrompt) => {
    const text = (customPrompt || aiInput).trim();
    if (!text || aiSending) return;

    setAiSending(true);
    // Optimistic user message
    const tempUserMsg = {
      _id: 'temp-' + Date.now(),
      sender_name: currentUser?.full_name || 'Tôi',
      sender_role: currentUser?.role,
      message_type: 'text',
      content: text,
      created_at: new Date().toISOString()
    };
    setAiMessages((prev) => [...prev, tempUserMsg]);
    setAiInput('');

    try {
      const res = await chatApi.sendAiMessage({ content: text });
      if (res?.success && res.ai_message) {
        setAiMessages((prev) => [...prev.filter((m) => m._id !== tempUserMsg._id), res.user_message, res.ai_message]);
      }
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        {
          _id: 'err-' + Date.now(),
          sender_name: 'Ruo Cortex AI',
          sender_role: 'ai',
          message_type: 'text',
          content: 'Không thể kết nối với Ruo AI Engine: ' + (err.message || 'Lỗi mạng'),
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setAiSending(false);
    }
  };

  // Handle Ops message submit
  const handleSendOps = async () => {
    const text = opsInput.trim();
    if (!text || opsSending) return;

    setOpsSending(true);
    try {
      const res = await chatApi.sendOperationsMessage({ content: text, message_type: 'text' });
      if (res?.success && res.message) {
        setOpsMessages((prev) => [...prev, res.message]);
        setOpsInput('');
      }
    } catch (err) {
      alert('Không thể gửi tin nhắn tác nghiệp: ' + err.message);
    } finally {
      setOpsSending(false);
    }
  };

  // Submit Spare Part Action Card
  const handleSubmitPartRequest = async (e) => {
    e.preventDefault();
    if (!selectedPartId) return;

    setOpsSending(true);
    try {
      const res = await chatApi.sendOperationsMessage({
        message_type: 'action_card',
        action_data: {
          part_id: selectedPartId,
          repair_id: selectedRepairId || null,
          quantity: Number(requestQty) || 1,
          reason: requestReason || 'Khắc phục sự cố khẩn tại hiện trường'
        }
      });
      if (res?.success && res.message) {
        setOpsMessages((prev) => [...prev, res.message]);
        setShowPartModal(false);
        setRequestReason('');
        window.dispatchEvent(new CustomEvent('ruo-parts-refresh'));
      }
    } catch (err) {
      alert('Lỗi tạo phiếu xin linh kiện: ' + err.message);
    } finally {
      setOpsSending(false);
    }
  };

  // Decide Action Card (Approve / Reject) by Manager/Admin
  const handleDecideCard = async (messageId, decision) => {
    try {
      const res = await chatApi.decideActionCard(messageId, { decision });
      if (res?.success) {
        // Update local card state and append system bot message
        setOpsMessages((prev) =>
          prev.map((m) => (m._id === messageId ? res.updated_card : m)).concat(res.system_message ? [res.system_message] : [])
        );
        window.dispatchEvent(new CustomEvent('ruo-parts-refresh'));
        window.dispatchEvent(new CustomEvent('ruo-chat-refresh'));
      }
    } catch (err) {
      alert('Lỗi xử lý duyệt thẻ: ' + (err.message || 'Lỗi hệ thống'));
    }
  };

  if (!isLoggedIn) return null;

  return (
    <>
      {/* 1. Docked Floating Button */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: isOpen ? 1250 : 950,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px'
        }}
      >
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="laser-btn laser-btn-primary"
            style={{
              padding: '12px 20px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
              fontWeight: 700,
              fontSize: '13.5px',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              border: '2px solid rgba(255,255,255,0.3)',
              cursor: 'pointer'
            }}
            title="Mở Ruo Chat: AI Trợ Lý & Kênh 2 Tác Nghiệp Kho"
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Icons.MessageSquare size={18} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    border: '2px solid #ffffff'
                  }}
                />
              )}
            </div>
            <span>Ruo Chat (AI & Kênh 2)</span>
          </button>
        )}

        {/* 2. Floating Chat Window */}
        {isOpen && (
          <div
            style={{
              width: '460px',
              maxWidth: 'calc(100vw - 32px)',
              height: '620px',
              maxHeight: 'calc(100vh - 100px)',
              background: 'var(--surface-primary)',
              borderRadius: '16px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.22)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'slideUpFade 0.2s ease-out'
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--surface-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: activeTab === 'ai' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'linear-gradient(135deg, #f97316, #c2410c)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}
                >
                  {activeTab === 'ai' ? <Icons.Sparkles size={18} /> : <Icons.Wrench size={18} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--ink-pure)' }}>
                    {activeTab === 'ai' ? 'Ruo Cortex AI Copilot' : 'Tác Nghiệp Kỹ Thuật & Kho'}
                  </h3>
                  <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                    {activeTab === 'ai' ? 'Trợ lý tri thức CSVC đại học' : 'Kênh phối hợp KTV ↔ Quản lý KHO-01'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="ruo-btn ruo-btn-ghost ruo-btn-sm"
                style={{ padding: '6px', borderRadius: '50%', color: 'var(--ink-muted)' }}
              >
                <Icons.X size={16} />
              </button>
            </div>

            {/* Channels Segmented Tabs */}
            <div
              style={{
                display: 'flex',
                padding: '6px 12px',
                background: 'var(--bg-app)',
                borderBottom: '1px solid var(--border-subtle)',
                gap: '8px'
              }}
            >
              <button
                onClick={() => setActiveTab('ai')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  border: activeTab === 'ai' ? '1px solid rgba(37,99,235,0.3)' : '1px solid transparent',
                  background: activeTab === 'ai' ? 'var(--surface-primary)' : 'transparent',
                  color: activeTab === 'ai' ? 'var(--blueprint-500)' : 'var(--ink-muted)',
                  boxShadow: activeTab === 'ai' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                <Icons.Bot size={15} />
                <span>AI Trợ Lý (Kênh 3)</span>
              </button>

              {isTechnicianOrManager && (
                <button
                  onClick={() => setActiveTab('operations')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    border: activeTab === 'operations' ? '1px solid rgba(234,88,12,0.3)' : '1px solid transparent',
                    background: activeTab === 'operations' ? 'rgba(234,88,12,0.08)' : 'transparent',
                    color: activeTab === 'operations' ? '#ea580c' : 'var(--ink-muted)',
                    boxShadow: activeTab === 'operations' ? '0 1px 4px rgba(234,88,12,0.1)' : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  <Icons.Package size={15} />
                  <span>Kỹ Thuật & Kho (Kênh 2)</span>
                </button>
              )}
            </div>

            {/* Content Area */}
            {activeTab === 'ai' ? (
              // TAB 1: AI COPILOT
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {/* Messages List */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                    background: 'var(--bg-app)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {aiLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-muted)' }}>
                      <span style={{ fontSize: '13px' }}>Đang nạp dữ liệu AI...</span>
                    </div>
                  ) : aiMessages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--ink-muted)' }}>
                      <div style={{ width: '44px', height: '44px', margin: '0 auto 10px', borderRadius: '50%', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blueprint-500)' }}>
                        <Icons.Sparkles size={22} />
                      </div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: 'var(--ink-pure)', fontWeight: 700 }}>Hỏi Đáp Dữ Liệu CSVC Cùng Ruo AI</h4>
                      <p style={{ margin: 0, fontSize: '12.5px', lineHeight: '1.4' }}>Tra cứu thiết bị phòng học, định mức tồn kho linh kiện, theo dõi SLA và chẩn đoán sự cố nhanh chóng.</p>
                    </div>
                  ) : (
                    aiMessages.map((msg, i) => {
                      const isUser = msg.sender_role !== 'ai';
                      return (
                        <div
                          key={msg._id || i}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isUser ? 'flex-end' : 'flex-start',
                            maxWidth: '90%',
                            alignSelf: isUser ? 'flex-end' : 'flex-start'
                          }}
                        >
                          <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isUser ? (
                              <span>Bạn</span>
                            ) : (
                              <>
                                <Icons.Sparkles size={11} color="var(--blueprint-500)" />
                                <span>Ruo Cortex AI</span>
                              </>
                            )}
                          </div>
                          <div
                            style={{
                              padding: '12px 15px',
                              borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                              background: isUser ? 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)' : 'var(--surface-primary)',
                              color: isUser ? '#ffffff' : 'var(--ink-pure)',
                              boxShadow: isUser ? '0 2px 8px rgba(234,88,12,0.25)' : '0 2px 8px rgba(0,0,0,0.05)',
                              border: isUser ? 'none' : '1px solid var(--border-subtle)',
                              fontSize: '13px',
                              lineHeight: '1.55'
                            }}
                          >
                            <FormattedAiMessage content={msg.content} isUser={isUser} />

                            {/* Rich AI Card */}
                            {msg.action_data?.quick_action && (
                              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: isUser ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border-subtle)' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetTab = msg.action_data?.quick_action?.tab;
                                    if (targetTab === 'report_issue') {
                                      const roomId = msg.action_data?.quick_action?.room_id || msg.action_data?.room_id;
                                      const eqId = msg.action_data?.quick_action?.equipment_id || msg.action_data?.equipment_id;
                                      if (roomId || eqId) {
                                        try {
                                          sessionStorage.setItem('ruo_prefill_report', JSON.stringify({
                                            room_id: String(roomId || ''),
                                            equipment_id: String(eqId || '')
                                          }));
                                        } catch {}
                                      }
                                      navigate('#/report-issue');
                                    }
                                    else if (targetTab === 'spare_parts') navigate('#/spare_parts');
                                    else if (targetTab === 'tickets_kanban') navigate('#/tickets');
                                    else if (targetTab === 'disposal_propose') navigate('#/disposals');
                                    else if (targetTab === 'dashboard') navigate('#/dashboard');
                                    else if (targetTab === 'equipments') navigate('#/equipments');
                                    else if (targetTab) navigate(`#/${targetTab}`);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    color: isUser ? '#ffffff' : 'var(--blueprint-500)',
                                    background: isUser ? 'rgba(255,255,255,0.15)' : 'rgba(37,99,235,0.08)',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}
                                  title={`Chuyển nhanh đến ${msg.action_data.quick_action.label}`}
                                >
                                  <Icons.ArrowRight size={12} />
                                  <span>Gợi ý: {msg.action_data.quick_action.label}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {aiSending && (
                    <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '12px', background: 'var(--surface-primary)', border: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--ink-muted)' }}>
                      <Icons.Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Ruo Cortex đang tra cứu dữ liệu...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Question Suggestion Chips */}
                <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-secondary)', display: 'flex', gap: '6px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                  {[
                    'Tivi không lên nguồn?',
                    'Phòng A1-101 có thiết bị gì?',
                    'Tồn kho bóng đèn máy chiếu?',
                    'Điều hòa không mát / chảy nước?',
                    'Micro bị hú rít xử lý sao?',
                    'Quy tắc thanh lý 60% là gì?',
                    'Có bao nhiêu phiếu sửa quá hạn?'
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendAi(q)}
                      disabled={aiSending}
                      style={{
                        fontSize: '11px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        background: 'var(--surface-primary)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--ink-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {/* AI Input */}
                <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-primary)', display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendAi()}
                    disabled={aiSending}
                    placeholder="Hỏi Ruo Cortex về CSVC, linh kiện, SLA..."
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-default)',
                      background: 'var(--surface-primary)',
                      color: 'var(--ink-pure)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => handleSendAi()}
                    disabled={aiSending || !aiInput.trim()}
                    className="laser-btn laser-btn-primary"
                    style={{ padding: '8px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icons.Send size={15} />
                  </button>
                </div>
              </div>
            ) : (
              // TAB 2: OPERATIONS & KHO DESK
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {/* Action Bar for Technician: Request Spare Part */}
                {currentUser?.role === 'technician' && (
                  <div style={{ padding: '8px 14px', background: 'rgba(234,88,12,0.06)', borderBottom: '1px solid rgba(234,88,12,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '12px', color: '#ea580c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icons.Wrench size={14} />
                      <span>Đang tại hiện trường sửa chữa?</span>
                    </div>
                    <button
                      onClick={openRequestPartModal}
                      className="laser-btn"
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        background: '#ea580c',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Icons.Plus size={13} />
                      <span>Xin Linh Kiện Kho</span>
                    </button>
                  </div>
                )}

                {/* Operations Messages List */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                    background: 'var(--bg-app)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {opsLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-muted)' }}>
                      <span style={{ fontSize: '13px' }}>Đang nạp tin nhắn tác nghiệp...</span>
                    </div>
                  ) : opsMessages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--ink-muted)' }}>
                      <div style={{ width: '44px', height: '44px', margin: '0 auto 10px', borderRadius: '50%', background: 'rgba(234,88,12,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}>
                        <Icons.Package size={22} />
                      </div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: 'var(--ink-pure)', fontWeight: 700 }}>Kênh Tác Nghiệp Kỹ Thuật & Kho KHO-01</h4>
                      <p style={{ margin: 0, fontSize: '12.5px' }}>Nơi Kỹ thuật viên gửi yêu cầu xuất kho và Quản lý CSVC duyệt trực tiếp 1-click qua Thẻ Hành Động.</p>
                    </div>
                  ) : (
                    opsMessages.map((msg, i) => {
                      const isMine = msg.sender_id?.toString() === currentUser?._id?.toString() || msg.sender_name === currentUser?.full_name;
                      const isActionCard = msg.message_type === 'action_card' && msg.action_data;
                      const isSystem = msg.message_type === 'system_event' || msg.sender_role === 'system';

                      if (isSystem) {
                        return (
                          <div key={msg._id || i} style={{ textAlign: 'center', margin: '4px 0' }}>
                            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '999px', background: 'rgba(22,163,74,0.1)', color: '#16a34a', fontSize: '11.5px', fontWeight: 600 }}>
                              {msg.content}
                            </span>
                          </div>
                        );
                      }

                      if (isActionCard) {
                        const card = msg.action_data;
                        const isPending = card.status === 'pending';
                        const isManager = ['facility_manager', 'admin'].includes(currentUser?.role);
                        const isReassignCard = card.card_type === 'reassign_request';

                        if (isReassignCard) {
                          return (
                            <div
                              key={msg._id || i}
                              style={{
                                width: '100%',
                                background: 'var(--surface-primary)',
                                borderRadius: '12px',
                                border: '1px solid rgba(6,182,212,0.4)',
                                padding: '14px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
                                <div>
                                  <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(6,182,212,0.14)', color: 'var(--blueprint-500)' }}>
                                    ĐỀ NGHỊ ĐỔI KTV ĐÚNG CHUYÊN MÔN
                                  </span>
                                  <h4 style={{ margin: '4px 0 0', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-pure)' }}>
                                    [{card.ticket_code}] {card.equipment_name} ({card.room_code || 'Phòng học'})
                                  </h4>
                                </div>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    fontWeight: 700,
                                    background: card.status === 'approved' ? 'rgba(22,163,74,0.1)' : card.status === 'rejected' ? 'rgba(220,38,38,0.1)' : 'rgba(234,88,12,0.1)',
                                    color: card.status === 'approved' ? '#16a34a' : card.status === 'rejected' ? '#dc2626' : '#ea580c'
                                  }}
                                >
                                  {card.status === 'approved' ? 'Đã Đổi KTV' : card.status === 'rejected' ? 'Giữ Phân Công' : 'Chờ Quản Lý Duyệt'}
                                </span>
                              </div>

                              <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', margin: '8px 0', padding: '8px 10px', background: 'var(--bg-app)', borderRadius: '6px' }}>
                                <div>KTV báo trái chuyên môn: <strong>{card.requested_by_name}</strong> ({card.requested_by_specialty || 'KTV'})</div>
                                {card.reason && <div>Lý do thực tế: <em>"{card.reason}"</em></div>}
                                {card.recommended_tech_name && (
                                  <div style={{ color: 'var(--blueprint-500)', fontWeight: 700, marginTop: '2px' }}>
                                    AI đề xuất chuyển giao: {card.recommended_tech_name} ({card.recommended_tech_code} • {card.recommended_tech_specialty})
                                  </div>
                                )}
                              </div>

                              {isPending && isManager && (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                  <button
                                    onClick={() => handleDecideCard(msg._id, 'approve')}
                                    className="laser-btn"
                                    style={{
                                      flex: 1,
                                      padding: '7px 12px',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      background: '#16a34a',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px'
                                    }}
                                  >
                                    <Icons.Check size={14} />
                                    <span>Duyệt Đổi Sang {card.recommended_tech_name || 'KTV AI Gợi Ý'}</span>
                                  </button>
                                  <button
                                    onClick={() => handleDecideCard(msg._id, 'reject')}
                                    className="laser-btn"
                                    style={{
                                      padding: '7px 12px',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      background: 'transparent',
                                      color: '#dc2626',
                                      border: '1px solid #dc2626',
                                      borderRadius: '6px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Giữ Nguyên
                                  </button>
                                </div>
                              )}

                              {!isPending && card.decided_by && (
                                <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '6px', textAlign: 'right' }}>
                                  Xử lý bởi: <strong>{card.decided_by}</strong>
                                </div>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={msg._id || i}
                            style={{
                              width: '100%',
                              background: 'var(--surface-primary)',
                              borderRadius: '12px',
                              border: '1px solid var(--border-default)',
                              padding: '14px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div>
                                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(234,88,12,0.1)', color: '#ea580c' }}>
                                  YÊU CẦU XUẤT KHO VẬT TƯ
                                </span>
                                <h4 style={{ margin: '4px 0 0', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-pure)' }}>
                                  {card.part_name} ({card.part_code})
                                </h4>
                              </div>
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  fontWeight: 700,
                                  background: card.status === 'approved' ? 'rgba(22,163,74,0.1)' : card.status === 'rejected' ? 'rgba(220,38,38,0.1)' : 'rgba(234,88,12,0.1)',
                                  color: card.status === 'approved' ? '#16a34a' : card.status === 'rejected' ? '#dc2626' : '#ea580c'
                                }}
                              >
                                {card.status === 'approved' ? 'Đã Duyệt' : card.status === 'rejected' ? 'Từ Chối' : 'Chờ Quản Lý Duyệt'}
                              </span>
                            </div>

                            <div style={{ fontSize: '12px', color: 'var(--ink-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', margin: '8px 0', padding: '8px 10px', background: 'var(--bg-app)', borderRadius: '6px' }}>
                              <div>Số lượng xin: <strong>{card.quantity} {card.unit || 'Cái'}</strong></div>
                              <div>Tồn kho hiện tại: <strong>{card.current_stock}</strong></div>
                              <div style={{ gridColumn: 'span 2' }}>Người yêu cầu: <strong>{card.requested_by_name}</strong></div>
                              {card.reason && <div style={{ gridColumn: 'span 2' }}>Lý do: <em>{card.reason}</em></div>}
                            </div>

                            {/* Manager Action Buttons */}
                            {isPending && isManager && (
                              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                <button
                                  onClick={() => handleDecideCard(msg._id, 'approve')}
                                  className="laser-btn"
                                  style={{
                                    flex: 1,
                                    padding: '7px 12px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    background: '#16a34a',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  <Icons.Check size={14} />
                                  <span>Duyệt Xuất Kho</span>
                                </button>
                                <button
                                  onClick={() => handleDecideCard(msg._id, 'reject')}
                                  className="laser-btn"
                                  style={{
                                    padding: '7px 12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    background: 'transparent',
                                    color: '#dc2626',
                                    border: '1px solid #dc2626',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Từ Chối
                                </button>
                              </div>
                            )}

                            {!isPending && card.decided_by && (
                              <div style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '6px', textAlign: 'right' }}>
                                Xử lý bởi: <strong>{card.decided_by}</strong>
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg._id || i}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMine ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            alignSelf: isMine ? 'flex-end' : 'flex-start'
                          }}
                        >
                          <div style={{ fontSize: '10.5px', color: 'var(--ink-muted)', marginBottom: '2px' }}>
                            {isMine ? 'Bạn' : `${msg.sender_name} (${msg.sender_role === 'technician' ? 'KTV' : 'Quản lý'})`}
                          </div>
                          <div
                            style={{
                              padding: '9px 13px',
                              borderRadius: isMine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                              background: isMine ? '#ea580c' : 'var(--surface-primary)',
                              color: isMine ? '#ffffff' : 'var(--ink-pure)',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                              border: isMine ? 'none' : '1px solid var(--border-subtle)',
                              fontSize: '13px',
                              lineHeight: '1.45'
                            }}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Operations Input Bar */}
                <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-primary)', display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={opsInput}
                    onChange={(e) => setOpsInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOps()}
                    disabled={opsSending}
                    placeholder="Nhắn tin trao đổi nội bộ Kỹ thuật & Kho..."
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-default)',
                      background: 'var(--surface-primary)',
                      color: 'var(--ink-pure)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={handleSendOps}
                    disabled={opsSending || !opsInput.trim()}
                    className="laser-btn"
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: '#ea580c',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Icons.Send size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal KTV Xin Linh Kiện Kho */}
      {showPartModal && (
        <div className="ruo-drawer-backdrop" onClick={() => setShowPartModal(false)} style={{ zIndex: 1300 }}>
          <div
            className="ruo-drawer-panel"
            style={{ width: '420px', maxWidth: '95vw', padding: '20px', borderRadius: '14px', background: 'var(--surface-primary)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--ink-pure)' }}>
                Tạo Thẻ Yêu Cầu Linh Kiện Kho KHO-01
              </h3>
              <button onClick={() => setShowPartModal(false)} className="ruo-btn ruo-btn-ghost ruo-btn-sm" style={{ padding: '4px' }}>
                <Icons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitPartRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--ink-secondary)' }}>
                  Phiếu Sửa Chữa (Gắn ca kỹ thuật):
                </label>
                <select
                  value={selectedRepairId}
                  onChange={(e) => setSelectedRepairId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--surface-primary)', color: 'var(--ink-pure)', fontSize: '13px' }}
                >
                  <option value="">-- Cấp khẩn cấp tại chỗ (Không gắn phiếu) --</option>
                  {activeRepairs.map((r) => (
                    <option key={r._id} value={r._id}>
                      [{r.ticket_code}] {r.equipment_id?.name || 'Thiết bị'} ({r.room_id?.code || 'Phòng học'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--ink-secondary)' }}>
                  Chọn Linh Kiện Cần Xuất:
                </label>
                {loadingParts ? (
                  <div style={{ padding: '8px 12px', fontSize: '12.5px', color: 'var(--ink-muted)', background: 'var(--bg-app)', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                    Đang nạp danh mục linh kiện kho KHO-01...
                  </div>
                ) : (
                  <select
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--surface-primary)', color: 'var(--ink-pure)', fontSize: '13px' }}
                  >
                    {availableParts.length === 0 ? (
                      <option value="">-- Không có linh kiện nào trong kho --</option>
                    ) : (
                      availableParts.map((p) => (
                        <option key={p._id} value={p._id}>
                          [{p.code}] {p.name} (Tồn kho: {p.stock} {p.unit || 'Cái'})
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--ink-secondary)' }}>
                  Số Lượng Cần:
                </label>
                <input
                  type="number"
                  min={1}
                  value={requestQty}
                  onChange={(e) => setRequestQty(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--surface-primary)', color: 'var(--ink-pure)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--ink-secondary)' }}>
                  Lý Do Xuất / Ghi Chú:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Thay bóng máy chiếu phòng A1-201"
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--surface-primary)', color: 'var(--ink-pure)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowPartModal(false)}
                  style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'transparent', cursor: 'pointer', fontSize: '13px' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={opsSending || loadingParts || !selectedPartId}
                  className="laser-btn laser-btn-primary"
                  style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: 700 }}
                >
                  {opsSending ? 'Đang gửi...' : 'Gửi Thẻ Lên Chat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingChatWidget;
