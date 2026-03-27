'use client';

import { ReactNode, useState, useRef } from 'react';

interface Props {
  text: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'right';
  className?: string;
}

export default function Tooltip({ text, children, position = 'top', className = '' }: Props) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const justTouched = useRef(false);

  const handleMouseEnter = () => {
    if (!ref.current) return;
    if (window.matchMedia('(hover: none)').matches) return;
    if (justTouched.current) { justTouched.current = false; return; }
    const rect = ref.current.getBoundingClientRect();
    if (position === 'right') {
      setCoords({ x: rect.right + 8, y: rect.top + rect.height / 2 });
    } else if (position === 'bottom') {
      setCoords({ x: rect.left + rect.width / 2, y: rect.bottom + 6 });
    } else {
      setCoords({ x: rect.left + rect.width / 2, y: rect.top - 6 });
    }
    setVisible(true);
  };

  const tooltipStyle: React.CSSProperties =
    position === 'right'
      ? { left: coords.x, top: coords.y, transform: 'translateY(-50%)' }
      : position === 'bottom'
        ? { left: coords.x, top: coords.y, transform: 'translateX(-50%)' }
        : { left: coords.x, top: coords.y, transform: 'translate(-50%, -100%)' };

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      onTouchStart={() => { justTouched.current = true; }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          className="fixed z-[9999] pointer-events-none whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg"
          style={tooltipStyle}
        >
          {text}
        </span>
      )}
    </div>
  );
}
