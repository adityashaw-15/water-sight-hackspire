import React, { useEffect, useRef } from 'react';

export default function AnimatedWatershedBackground({ variant = 'dashboard' }) {
  const backgroundRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext('2d');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const supportsPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const palette = ['19, 112, 62', '19, 136, 83', '12, 132, 100', '50, 137, 157', '50, 157, 98'];
    const branches = [
      [[.12, .18], [.25, .29], [.37, .25], [.47, .39], [[.31, .23], [.39, .16]], [[.38, .27], [.48, .19]]],
      [[.74, .75], [.67, .64], [.6, .57], [.55, .44], [[.62, .59], [.53, .58]], [[.66, .65], [.74, .59]]],
      [[.86, .32], [.76, .4], [.68, .47], [.62, .55], [[.72, .44], [.8, .47]], [[.67, .5], [.58, .48]]],
    ];
    let width = 0;
    let height = 0;
    let density = 1;
    let threads = [];
    let frameId = 0;
    let lastTime = 0;
    let scrollOffset = 0;
    const pointer = { x: .5, y: .5 };

    const seeded = (seed) => {
      let state = seed >>> 0;
      return () => {
        state += 0x6D2B79F5;
        let value = state;
        value = Math.imul(value ^ value >>> 15, value | 1);
        value ^= value + Math.imul(value ^ value >>> 7, value | 61);
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
      };
    };

    const createThreads = () => {
      const random = seeded(26015);
      const count = width < 740 ? 6 : width < 1100 ? 12 : 18;
      return Array.from({ length: count }, (_, index) => ({
        y: .03 + random() * .94,
        amplitude: 22 + random() * 64,
        frequency: .55 + random() * 1.45,
        phase: random() * Math.PI * 2,
        phaseB: random() * Math.PI * 2,
        speed: .12 + random() * .18,
        tilt: (random() - .5) * .26,
        width: index % 5 === 0 ? 2.1 : index % 3 === 0 ? 1.55 : 1,
        opacity: index % 5 === 0 ? .25 : .1 + random() * .1,
        color: palette[index % palette.length],
        particle: index % 3 === 0,
        particlePhase: random(),
        particleSpeed: .026 + random() * .045,
      }));
    };

    const pointOnThread = (thread, progress, time) => {
      const x = (-.08 + progress * 1.16) * width;
      const base = thread.y * height + (progress - .5) * thread.tilt * height;
      const oscillation = Math.sin(progress * thread.frequency * Math.PI * 2 + thread.phase + time * thread.speed) * thread.amplitude;
      const detail = Math.sin(progress * thread.frequency * Math.PI * 4 + thread.phaseB - time * thread.speed * .62) * thread.amplitude * .24;
      const pointerX = pointer.x * width;
      const pointerY = pointer.y * height;
      const distance = Math.hypot(x - pointerX, base + oscillation - pointerY);
      const pull = supportsPointer && !reducedMotion ? Math.max(0, 1 - distance / 250) ** 2 : 0;
      return { x, y: base + oscillation + detail + (pointerY - (base + oscillation)) * pull * .075 };
    };

    const resize = () => {
      density = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * density);
      canvas.height = Math.floor(height * density);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(density, 0, 0, density, 0, 0);
      threads = createThreads();
    };

    const drawBranch = (branch, time) => {
      const [start, controlOne, controlTwo, end, ...arms] = branch;
      const scalePoint = ([x, y]) => [x * width, y * height];
      const [sx, sy] = scalePoint(start);
      const [c1x, c1y] = scalePoint(controlOne);
      const [c2x, c2y] = scalePoint(controlTwo);
      const [ex, ey] = scalePoint(end);
      context.beginPath();
      context.moveTo(sx, sy);
      context.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
      context.stroke();
      arms.forEach(([armStart, armEnd]) => {
        const [ax, ay] = scalePoint(armStart);
        const [bx, by] = scalePoint(armEnd);
        context.beginPath();
        context.moveTo(ax, ay);
        context.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 - Math.sin(time * .14) * 9, bx, by);
        context.stroke();
      });
    };

    const draw = (timestamp = 0) => {
      const time = timestamp / 1000;
      lastTime = timestamp;
      context.clearRect(0, 0, width, height);
      context.save();
      context.translate(Math.sin(scrollOffset * .004) * 4, Math.cos(scrollOffset * .003) * 3);
      context.lineCap = 'round';
      context.lineJoin = 'round';

      threads.forEach((thread) => {
        context.beginPath();
        for (let step = 0; step <= 48; step += 1) {
          const point = pointOnThread(thread, step / 48, time);
          if (step === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        }
        context.strokeStyle = `rgba(${thread.color}, ${thread.opacity})`;
        context.lineWidth = thread.width;
        context.stroke();

        if (thread.particle && !reducedMotion) {
          const progress = (thread.particlePhase + time * thread.particleSpeed) % 1;
          const current = pointOnThread(thread, progress, time);
          const trail = pointOnThread(thread, Math.max(0, progress - .034), time);
          context.beginPath();
          context.moveTo(trail.x, trail.y);
          context.lineTo(current.x, current.y);
          context.strokeStyle = `rgba(${thread.color}, .43)`;
          context.lineWidth = 1.7;
          context.stroke();
          context.beginPath();
          context.arc(current.x, current.y, 1.8, 0, Math.PI * 2);
          context.fillStyle = `rgba(${thread.color}, .62)`;
          context.fill();
        }
      });

      context.setLineDash([3, 13]);
      context.lineDashOffset = -time * 8;
      context.strokeStyle = 'rgba(17, 116, 69, .16)';
      context.lineWidth = 1.25;
      branches.forEach((branch) => drawBranch(branch, time));
      context.setLineDash([]);
      context.restore();
    };

    const animate = (timestamp) => {
      draw(timestamp);
      if (!reducedMotion && !document.hidden) frameId = window.requestAnimationFrame(animate);
    };
    const onPointerMove = (event) => {
      pointer.x = event.clientX / window.innerWidth;
      pointer.y = event.clientY / window.innerHeight;
    };
    const onScroll = () => { scrollOffset = window.scrollY; };
    const onVisibilityChange = () => {
      if (document.hidden && frameId) window.cancelAnimationFrame(frameId);
      if (!document.hidden && !reducedMotion) frameId = window.requestAnimationFrame(animate);
    };

    resize();
    draw(0);
    if (!reducedMotion) frameId = window.requestAnimationFrame(animate);
    window.addEventListener('resize', resize, { passive: true });
    if (supportsPointer) window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    const background = backgroundRef.current;
    if (!background || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const supportsPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let frameId = 0;
    let pointerX = 0;
    let pointerY = 0;

    const render = () => {
      background.style.setProperty('--geo-x', `${pointerX}px`);
      background.style.setProperty('--geo-y', `${pointerY}px`);
      background.style.setProperty('--geo-scroll', `${Math.min(window.scrollY * 0.018, 26)}px`);
      frameId = 0;
    };

    const queueRender = () => {
      if (!frameId) frameId = window.requestAnimationFrame(render);
    };

    const onPointerMove = (event) => {
      if (!supportsPointer) return;
      pointerX = ((event.clientX / window.innerWidth) - 0.5) * 10;
      pointerY = ((event.clientY / window.innerHeight) - 0.5) * 8;
      queueRender();
    };

    const onVisibilityChange = () => background.classList.toggle('is-paused', document.hidden);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', queueRender, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    queueRender();

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', queueRender);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div ref={backgroundRef} className={`geo-background geo-background-${variant}`} aria-hidden="true">
      <canvas ref={canvasRef} className="geo-flow-canvas" />
      <svg className="geo-background-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="geo-grid" width="92" height="92" patternUnits="userSpaceOnUse"><path d="M92 0H0V92" fill="none" /></pattern>
        </defs>
        <rect className="geo-grid" width="1440" height="900" fill="url(#geo-grid)" />
        <g className="geo-contours">
          <path d="M-70 152 C80 54 219 93 297 177 S477 283 598 190 S840 72 1012 154 S1270 281 1515 146" />
          <path d="M-60 213 C77 114 221 147 291 221 S471 331 622 236 S859 134 1014 211 S1281 333 1490 203" />
          <path d="M-72 278 C87 182 204 201 308 274 S487 379 637 290 S844 190 1034 273 S1285 394 1516 264" />
          <path d="M-63 572 C106 469 255 510 340 588 S513 706 671 604 S877 482 1056 578 S1297 704 1510 571" />
          <path d="M-47 639 C129 534 253 573 362 648 S524 771 687 672 S874 550 1072 641 S1280 768 1516 642" />
          <path d="M-52 708 C109 610 276 639 380 719 S552 839 700 739 S909 615 1092 708 S1285 835 1508 708" />
        </g>
        <g className="geo-boundaries">
          <path d="M136 297 L221 227 L337 250 L401 348 L358 438 L244 463 L157 396 Z" />
          <path d="M1033 155 L1139 109 L1245 157 L1293 249 L1238 334 L1124 355 L1034 288 L990 222 Z" />
          <path d="M765 570 L879 512 L997 553 L1049 663 L985 748 L861 766 L749 681 Z" />
        </g>
        <g className="geo-flow-paths">
          <path d="M64 751 C205 637 300 659 390 712 C492 774 560 726 634 654 C720 570 786 581 873 642 C956 700 1056 694 1214 586" />
          <path d="M481 92 C526 181 594 204 664 248 C735 292 756 378 704 465 C666 527 674 590 723 634" />
          <path d="M1169 372 C1087 415 1036 452 988 524 C948 584 892 598 829 621" />
        </g>
        <g className="geo-orbit"><ellipse cx="1132" cy="194" rx="208" ry="80" /><ellipse cx="1132" cy="194" rx="145" ry="52" /></g>
        <g className="geo-nodes">
          <circle className="node node-a" cx="240" cy="459" r="3" /><circle className="node node-b" cx="404" cy="184" r="2.5" /><circle className="node node-c" cx="735" cy="337" r="3" /><circle className="node node-d" cx="1051" cy="414" r="2.5" /><circle className="node node-e" cx="1204" cy="690" r="3" /><circle className="node node-f" cx="924" cy="775" r="2" />
        </g>
        <g className="geo-ripples"><circle cx="240" cy="459" r="12" /><circle cx="1051" cy="414" r="11" /><circle cx="924" cy="775" r="9" /></g>
      </svg>
    </div>
  );
}
