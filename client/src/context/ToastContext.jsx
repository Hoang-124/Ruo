import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Icons } from '../components/common/SvgIcons';

const ToastContext = createContext(null);

/**
 * ToastItem Component
 * Renders an individual toast notification with native SVG icon,
 * smooth slide-in animation, progress indicator bar, and pause-on-hover.
 */
const ToastItem = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const remainingTimeRef = useRef(toast.duration || 3500);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      handleClose();
    }, remainingTimeRef.current);
  }, [remainingTimeRef.current]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    }
  }, []);

  useEffect(() => {
    if (!isPaused) {
      startTimer();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPaused, startTimer]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 280);
  };

  // Color & Icon Configuration based on Type
  const getConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: <Icons.CheckCircle size={18} />,
          defaultTitle: 'Thành Công'
        };
      case 'error':
        return {
          icon: <Icons.AlertTriangle size={18} />,
          defaultTitle: 'Thông Báo Lỗi'
        };
      case 'warning':
        return {
          icon: <Icons.AlertCircle size={18} />,
          defaultTitle: 'Cảnh Báo'
        };
      default:
        return {
          icon: <Icons.Info size={18} />,
          defaultTitle: 'Thông Báo Hệ Thống'
        };
    }
  };

  const config = getConfig();

  return (
    <div
      className={`ruo-toast-item ruo-toast-${toast.type || 'info'} ${isExiting ? 'ruo-toast-exit' : 'ruo-toast-enter'}`}
      onMouseEnter={() => {
        setIsPaused(true);
        pauseTimer();
      }}
      onMouseLeave={() => {
        setIsPaused(false);
      }}
      role="alert"
    >
      {/* Icon Badge */}
      <div className="ruo-toast-icon-wrap">
        {config.icon}
      </div>

      {/* Message Content */}
      <div className="ruo-toast-content">
        <div className="ruo-toast-header">
          <span className="ruo-toast-title">
            {toast.title || config.defaultTitle}
          </span>
          <span className="ruo-toast-time">
            {toast.time || new Date().toLocaleTimeString('vi-VN', { hour12: false })}
          </span>
        </div>
        <p className="ruo-toast-message">{toast.message}</p>
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={handleClose}
        className="ruo-toast-close-btn"
        title="Đóng thông báo"
        aria-label="Đóng"
      >
        <Icons.X size={14} />
      </button>

      {/* Animated countdown progress bar */}
      <div
        className="ruo-toast-progress-bar"
        style={{
          animationDuration: `${toast.duration || 3500}ms`,
          animationPlayState: isPaused ? 'paused' : 'running'
        }}
      />
    </div>
  );
};

/**
 * ToastContainer Component
 * Fixed at top-right corner with ultra-smooth stacking and native layout.
 */
const ToastContainer = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;

  return (
    <div className="ruo-toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

/**
 * ToastProvider
 * Top-level provider exposing seamless programmatic toast dispatch.
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', title = '', message = '', duration = 3500 }) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newToast = {
      id,
      type,
      title,
      message,
      duration,
      time: new Date().toLocaleTimeString('vi-VN', { hour12: false })
    };

    setToasts((prev) => [newToast, ...prev].slice(0, 5)); // Keep maximum 5 simultaneous toasts
    return id;
  }, []);

  const toast = {
    success: (message, title = 'Đăng Xuất Thành Công', duration = 3500) =>
      addToast({ type: 'success', title, message, duration }),
    error: (message, title = 'Có Lỗi Xảy Ra', duration = 4000) =>
      addToast({ type: 'error', title, message, duration }),
    warning: (message, title = 'Lưu Ý', duration = 4000) =>
      addToast({ type: 'warning', title, message, duration }),
    info: (message, title = 'Thông Báo', duration = 3500) =>
      addToast({ type: 'info', title, message, duration }),
    dismiss: dismissToast
  };

  return (
    <ToastContext.Provider value={{ toast, addToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
