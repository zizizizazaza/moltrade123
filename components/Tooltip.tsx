import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

type TooltipProps = {
  text: string;
  children: React.ReactNode;
  maxWidth?: number;
};

const Tooltip: React.FC<TooltipProps> = ({ text, children, maxWidth = 240 }) => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipHeight = tooltipRef.current?.offsetHeight || 32;
    const tooltipWidth = tooltipRef.current?.offsetWidth || maxWidth;

    let top = rect.top - tooltipHeight - 8;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    // Keep within viewport
    if (top < 4) top = rect.bottom + 8;
    if (left < 4) left = 4;
    if (left + tooltipWidth > window.innerWidth - 4) left = window.innerWidth - tooltipWidth - 4;

    setPos({ top, left });
  }, [visible, maxWidth]);

  const tip = visible
    ? createPortal(
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 99999,
            maxWidth,
            padding: '8px 12px',
            background: '#1a1a1a',
            color: '#eee',
            fontSize: '11px',
            lineHeight: 1.5,
            fontWeight: 500,
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
            animation: 'ttFadeIn 150ms ease-out',
          }}
        >
          {text}
          <style>{`@keyframes ttFadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }`}</style>
        </div>,
        document.body
      )
    : null;

  return (
    <span
      ref={triggerRef}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'help' }}
    >
      {children}
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        style={{ flexShrink: 0 }}
      >
        <circle cx="12" cy="12" r="12" fill="#111" />
        <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white">?</text>
      </svg>
      {tip}
    </span>
  );
};

export default Tooltip;
