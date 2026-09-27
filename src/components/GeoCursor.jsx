import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function GeoCursor() {
  const innerRef = useRef(null);
  const outerRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const inner = innerRef.current;
    const outer = outerRef.current;
    if (!inner || !outer) return;

    let frameId = 0;
    let targetX = -100;
    let targetY = -100;
    let outerX = -100;
    let outerY = -100;
    let isInitialized = false;
    let isHoveringInput = false;
    let isTouch = false;

    const draw = () => {
      if (isInitialized && !isTouch) {
        outerX += (targetX - outerX) * 0.2;
        outerY += (targetY - outerY) * 0.2;
        
        if (Math.abs(targetX - outerX) > 0.1 || Math.abs(targetY - outerY) > 0.1) {
          outer.style.transform = `translate3d(${outerX}px, ${outerY}px, 0) translate(-50%, -50%)`;
        }
      }
      frameId = window.requestAnimationFrame(draw);
    };

    const onMove = (event) => {
      if (event.pointerType === 'touch') {
        isTouch = true;
        inner.style.opacity = '0';
        outer.style.opacity = '0';
        return;
      }
      isTouch = false;
      
      targetX = event.clientX;
      targetY = event.clientY;
      
      if (!isInitialized) {
        outerX = targetX;
        outerY = targetY;
        isInitialized = true;
        outer.style.transform = `translate3d(${outerX}px, ${outerY}px, 0) translate(-50%, -50%)`;
      }
      
      if (!isHoveringInput) {
        inner.style.opacity = '1';
        outer.style.opacity = '1';
      }
      
      inner.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`;
    };

    const onOver = (event) => {
      if (isTouch) return;
      const isMapOrInput = event.target.closest('input, textarea, select');
      if (isMapOrInput) {
        isHoveringInput = true;
        inner.style.opacity = '0';
        outer.style.opacity = '0';
      } else {
        isHoveringInput = false;
        if (isInitialized) {
          inner.style.opacity = '1';
          outer.style.opacity = '1';
        }
      }

      const isInteractive = event.target.closest('button, a, [role="switch"]');
      if (isInteractive) {
        outer.style.width = '44px';
        outer.style.height = '44px';
        outer.style.backgroundColor = 'rgba(22, 138, 76, 0.1)';
        outer.style.borderColor = 'rgba(22, 138, 76, 0.4)';
      } else {
        outer.style.width = '32px';
        outer.style.height = '32px';
        outer.style.backgroundColor = 'transparent';
        outer.style.borderColor = '#168a4c';
      }
    };

    const onLeave = () => {
      inner.style.opacity = '0';
      outer.style.opacity = '0';
      isInitialized = false;
    };

    frameId = window.requestAnimationFrame(draw);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      window.cancelAnimationFrame(frameId);
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 2147483647 }} aria-hidden="true">
      <span ref={outerRef} style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '32px',
        height: '32px',
        border: '2px solid #168a4c',
        borderRadius: '50%',
        opacity: 0,
        transition: 'opacity 0.15s, width 0.15s, height 0.15s, background-color 0.15s, border-color 0.15s',
        pointerEvents: 'none',
        display: 'block',
        visibility: 'visible',
        boxSizing: 'border-box'
      }} />
      <span ref={innerRef} style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '8px',
        height: '8px',
        background: '#168a4c',
        borderRadius: '50%',
        opacity: 0,
        transition: 'opacity 0.15s',
        pointerEvents: 'none',
        display: 'block',
        visibility: 'visible',
        boxSizing: 'border-box'
      }} />
    </div>,
    document.body
  );
}
