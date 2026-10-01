import { useEffect, useRef } from 'react';

export function useScrollReveal(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    
    // Check if user prefers reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
       ref.current.classList.add('is-visible');
       return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        // Unobserve to animate only once
        observer.unobserve(entry.target);
      }
    }, {
      root: null,
      rootMargin: '0px 0px -50px 0px', // Trigger slightly before it comes fully into view
      threshold: 0.1,
      ...options
    });

    observer.observe(ref.current);

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return ref;
}

export function RevealWrapper({ children, className = '', style = {}, delay = 0, type = 'default' }) {
  const ref = useScrollReveal();
  
  let baseClass = 'reveal-on-scroll';
  if (type === 'heading') baseClass += ' reveal-heading';
  else if (type === 'map') baseClass += ' reveal-map';
  else if (type === 'footer') baseClass += ' reveal-footer';
  
  let delayClass = '';
  if (delay === 1) delayClass = ' reveal-delay-1';
  if (delay === 2) delayClass = ' reveal-delay-2';
  if (delay === 3) delayClass = ' reveal-delay-3';
  if (delay === 4) delayClass = ' reveal-delay-4';
  if (delay === 5) delayClass = ' reveal-delay-5';

  return (
    <div ref={ref} className={`${baseClass}${delayClass} ${className}`} style={style}>
      {children}
    </div>
  );
}
