import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export type ConfirmModalVariant = 'danger' | 'warning' | 'info';

type ConfirmModalProps = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmModalVariant;
  loading?: boolean;
};

const variantConfig: Record<
  ConfirmModalVariant,
  { icon: React.ReactNode; iconBg: string; accentColor: string; confirmBtn: string }
> = {
  danger: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    iconBg: 'bg-red-500/10',
    accentColor: 'text-red-500',
    confirmBtn: 'bg-red-500 hover:bg-red-600 shadow-red-500/25',
  },
  warning: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    iconBg: 'bg-amber-500/10',
    accentColor: 'text-amber-500',
    confirmBtn: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25',
  },
  info: {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    iconBg: 'bg-blue-500/10',
    accentColor: 'text-blue-500',
    confirmBtn: 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/25',
  },
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onConfirm,
  onCancel,
  title = 'Are you sure?',
  description = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cfg = variantConfig[variant];

  // Focus cancel button when modal opens (safer default)
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => cancelRef.current?.focus());
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const modal = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'cmFadeIn 200ms ease-out',
        }}
      />

      {/* Card */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          background: '#fff',
          borderRadius: '20px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          animation: 'cmSlideUp 350ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Accent top bar */}
        <div
          style={{
            height: '3px',
            background: variant === 'danger' ? '#ef4444' : variant === 'warning' ? '#f59e0b' : '#3b82f6',
          }}
        />

        <div style={{ padding: '28px 32px 24px' }}>
          {/* Icon */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div
              className={cfg.iconBg}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className={cfg.accentColor}>{cfg.icon}</span>
            </div>
          </div>

          {/* Title */}
          <h3
            id="confirm-modal-title"
            style={{
              textAlign: 'center',
              fontSize: '17px',
              fontWeight: 800,
              color: '#111',
              margin: '0 0 8px',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h3>

          {/* Description */}
          {description && (
            <div
              style={{
                textAlign: 'center',
                fontSize: '13px',
                lineHeight: 1.6,
                color: '#888',
                margin: '0 0 28px',
                padding: '0 8px',
              }}
            >
              {description}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              ref={cancelRef}
              onClick={onCancel}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#555',
                background: '#f5f5f5',
                border: '1px solid #e5e5e5',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 150ms ease',
                opacity: loading ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#eee';
                  e.currentTarget.style.borderColor = '#ccc';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f5f5f5';
                e.currentTarget.style.borderColor = '#e5e5e5';
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={cfg.confirmBtn}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#fff',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 150ms ease',
                boxShadow: '0 4px 12px var(--tw-shadow-color, rgba(0,0,0,0.1))',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                <>
                  <svg
                    style={{ animation: 'spin 1s linear infinite', width: '16px', height: '16px' }}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes cmFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cmSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  // Use React Portal to render at document.body — truly global, escapes all parent containers
  return createPortal(modal, document.body);
};

export default ConfirmModal;
