import { useRef, useState } from 'react';

const THRESHOLD_PX = 120;

export function useDragToClose(onClose: () => void) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    setDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dy = Math.max(0, e.touches[0].clientY - startYRef.current);
    setDragY(dy);
  };

  const handleTouchEnd = () => {
    setDragging(false);
    setDragY(0);
    if (dragY > THRESHOLD_PX) {
      onClose();
    }
  };

  const dragStyle: React.CSSProperties = {
    transform: `translateY(${dragY}px)`,
    transition: dragging ? 'none' : 'transform 0.25s ease',
  };

  return { containerRef, dragStyle, handleTouchStart, handleTouchMove, handleTouchEnd };
}
