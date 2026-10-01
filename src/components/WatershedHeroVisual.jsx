import React, { useEffect, useState } from 'react';

export default function WatershedHeroVisual() {
  const [motion, setMotion] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setMotion(!mq.matches);
    const listener = (e) => setMotion(!e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  return (
    <div className="hero-visual-container" style={{
      position: 'relative', width: '100%', height: '320px', backgroundColor: '#09151a', 
      borderRadius: '12px', overflow: 'hidden', margin: '24px 0 24px', 
      boxShadow: '0 12px 30px rgba(10,26,31,0.12)', border: '1px solid #142e26'
    }}>
      <style>{`
        /* Master 15-second Timeline */
        .w-story-photo { animation: stPhoto 15s infinite; }
        .w-story-pin { animation: stPin 15s infinite; }
        .w-story-map { animation: stMap 15s infinite; }
        .w-story-boundary { animation: stBoundary 15s infinite; stroke-dasharray: 1500; }
        .w-story-topo { animation: stTopo 15s infinite; }
        .w-story-sat { animation: stSat 15s infinite linear; }
        .w-story-veg { animation: stVeg 15s infinite; }
        .w-story-water { animation: stWater 15s infinite; }
        .w-story-change { animation: stChange 15s infinite; }
        .w-story-interv { animation: stInterv 15s infinite cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .w-story-text-1 { animation: stT1 15s infinite; }
        .w-story-text-2 { animation: stT2 15s infinite; }
        .w-story-text-3 { animation: stT3 15s infinite; }
        .w-story-text-4 { animation: stT4 15s infinite; }
        .w-story-text-5 { animation: stT5 15s infinite; }
        .w-story-text-6 { animation: stT6 15s infinite; }
        
        /* 0-2s: Photo */
        @keyframes stPhoto {
          0% { opacity: 0; transform: translateY(30px) scale(0.9); }
          3% { opacity: 1; transform: translateY(0) scale(1); }
          12% { opacity: 1; transform: translateY(0) scale(1); }
          15%, 100% { opacity: 0; transform: translateY(-30px) scale(0.5); }
        }
        /* 2-4s: Pin */
        @keyframes stPin {
          0%, 13% { opacity: 0; transform: scale(0); }
          15% { opacity: 1; transform: scale(1.2); }
          17%, 95% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0); }
        }
        /* 2-4s: Map fade in */
        @keyframes stMap {
          0%, 15% { opacity: 0; }
          22%, 95% { opacity: 1; }
          100% { opacity: 0; }
        }
        /* 4-6s: Topo & Boundary */
        @keyframes stBoundary {
          0%, 26% { opacity: 0; stroke-dashoffset: 1500; }
          33%, 95% { opacity: 1; stroke-dashoffset: 0; }
          100% { opacity: 0; stroke-dashoffset: 0; }
        }
        @keyframes stTopo {
          0%, 28% { opacity: 0; }
          35%, 95% { opacity: 0.7; }
          100% { opacity: 0; }
        }
        /* 6-8s: Satellite */
        @keyframes stSat {
          0%, 38% { transform: translate(-200px, -200px); opacity: 0; }
          39% { opacity: 1; }
          53% { transform: translate(1100px, 400px); opacity: 1; }
          54%, 100% { opacity: 0; }
        }
        /* 8-10s: Veg & Water Analysis */
        @keyframes stVeg {
          0%, 50% { opacity: 0; }
          55%, 95% { opacity: 0.85; }
          100% { opacity: 0; }
        }
        @keyframes stWater {
          0%, 55% { opacity: 0; }
          60%, 95% { opacity: 0.95; }
          100% { opacity: 0; }
        }
        /* 10-12s: Change */
        @keyframes stChange {
          0%, 65% { opacity: 0; clip-path: inset(0 100% 0 0); }
          72%, 95% { opacity: 1; clip-path: inset(0 0 0 0); }
          100% { opacity: 0; }
        }
        /* 12-14s: Interventions */
        @keyframes stInterv {
          0%, 80% { opacity: 0; transform: scale(0); }
          84%, 95% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; }
        }
        
        /* Text phases */
        @keyframes stT1 { 0%, 14% {opacity: 1;} 15%, 100% {opacity: 0;} }
        @keyframes stT2 { 0%, 14% {opacity: 0;} 15%, 26% {opacity: 1;} 27%, 100% {opacity: 0;} }
        @keyframes stT3 { 0%, 26% {opacity: 0;} 27%, 39% {opacity: 1;} 40%, 100% {opacity: 0;} }
        @keyframes stT4 { 0%, 39% {opacity: 0;} 40%, 52% {opacity: 1;} 53%, 100% {opacity: 0;} }
        @keyframes stT5 { 0%, 52% {opacity: 0;} 53%, 79% {opacity: 1;} 80%, 100% {opacity: 0;} }
        @keyframes stT6 { 0%, 79% {opacity: 0;} 80%, 96% {opacity: 1;} 97%, 100% {opacity: 0;} }
        
        .w-label { font-size: 11px; font-weight: 700; fill: #47cf83; letter-spacing: 1px; text-transform: uppercase; }
        .w-text-bg { fill: rgba(10, 26, 31, 0.8); rx: 4px; }
      `}</style>

      <svg viewBox="0 0 1000 320" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="scanGrad" cx="50%" cy="0%" r="100%">
            <stop offset="0%" stopColor="#47cf83" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#47cf83" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="vegGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e5436" stopOpacity="0.6"/>
            <stop offset="50%" stopColor="#2c7847" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#163823" stopOpacity="0.6"/>
          </linearGradient>
          <linearGradient id="changeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#168a4c" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#319dbf" stopOpacity="0.8"/>
          </linearGradient>
        </defs>

        {/* --- MAP BASE (Phases 2-8) --- */}
        <g className={motion ? "w-story-map" : ""} style={{ transformOrigin: '500px 160px' }}>
          <rect width="100%" height="100%" fill="#0a1a1f" />
          
          {/* Topo Lines */}
          <g stroke="#133328" strokeWidth="1.5" fill="none" className={motion ? "w-story-topo" : ""}>
            <path d="M -100,50 Q 200,80 300,10 T 700,-20 T 1100,80" />
            <path d="M -100,100 Q 200,140 300,60 T 700,20 T 1100,140" />
            <path d="M -100,150 Q 200,200 300,110 T 700,70 T 1100,200" />
            <path d="M -100,200 Q 200,260 300,160 T 700,120 T 1100,260" />
            <path d="M -100,250 Q 200,320 300,210 T 700,170 T 1100,320" />
            <path d="M -100,300 Q 200,380 300,260 T 700,220 T 1100,380" />
          </g>

          {/* Watershed Boundary */}
          <path d="M 250,160 C 350,20 650,20 750,160 C 850,300 650,300 500,280 C 350,300 150,300 250,160 Z" 
                fill="#16382f" fillOpacity="0.3" stroke="#27ad70" strokeWidth="2" strokeDasharray="6 8" 
                className={motion ? "w-story-boundary" : ""} />
        </g>

        {/* --- VEGETATION & WATER (Phase 5-8) --- */}
        <g>
          {/* Vegetation Overlay */}
          <path d="M 300,120 Q 400,60 500,100 T 700,140 Q 650,250 500,220 T 300,120 Z" 
                fill="url(#vegGrad)" className={motion ? "w-story-veg" : ""} />
          
          {/* Water Overlay */}
          <g className={motion ? "w-story-water" : ""}>
            {/* Main River */}
            <path d="M 350,80 Q 450,150 550,200 T 700,260" fill="none" stroke="#319dbf" strokeWidth="8" opacity="0.8" strokeLinecap="round" />
            <path d="M 350,80 Q 450,150 550,200 T 700,260" fill="none" stroke="#7ce4f5" strokeWidth="3" opacity="0.9" strokeLinecap="round" />
            {/* Storage / Lake */}
            <ellipse cx="600" cy="225" rx="30" ry="14" fill="#319dbf" opacity="0.9" />
          </g>
        </g>

        {/* --- CHANGE DETECTION (Phase 6-8) --- */}
        <g className={motion ? "w-story-change" : ""}>
          <rect x="580" y="80" width="120" height="60" fill="url(#changeGrad)" rx="8" opacity="0.5" />
          <rect x="578" y="78" width="124" height="64" fill="none" stroke="#47cf83" strokeWidth="1" strokeDasharray="4 4" rx="10" />
          <text x="590" y="115" fill="#fff" fontSize="14" fontWeight="bold">CHANGE DETECTED</text>
          <text x="590" y="130" fill="#47cf83" fontSize="10" fontWeight="bold">+12% VEGETATION</text>
        </g>

        {/* --- INTERVENTIONS (Phase 7-8) --- */}
        <g className={motion ? "w-story-interv" : ""} style={{ transformOrigin: '550px 200px' }}>
          {/* Check Dam Icon on river */}
          <rect x="585" y="215" width="30" height="6" fill="#facc15" transform="rotate(-20 600 218)" rx="2" />
          {/* Contour Trenches */}
          <path d="M 380,180 Q 420,200 460,190 M 400,210 Q 440,230 480,220" fill="none" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
          <rect x="375" y="160" width="105" height="20" className="w-text-bg" />
          <text x="380" y="174" className="w-label" fill="#facc15">TRENCHES PLANNED</text>
        </g>

        {/* --- SATELLITE SCAN (Phase 4) --- */}
        <g className={motion ? "w-story-sat" : ""}>
          {/* Satellite Body */}
          <rect x="-10" y="-10" width="20" height="20" fill="#ffffff" rx="4" />
          <rect x="-30" y="-5" width="20" height="10" fill="#319dbf" rx="1" />
          <rect x="10" y="-5" width="20" height="10" fill="#319dbf" rx="1" />
          {/* Sweep Cone */}
          <polygon points="0,10 -300,500 300,500" fill="url(#scanGrad)" />
        </g>

        {/* --- GPS PIN (Phase 2-8) --- */}
        <g className={motion ? "w-story-pin" : ""} style={{ transformOrigin: '500px 160px' }}>
          <path d="M 500,130 C 490,130 480,140 480,150 C 480,165 500,180 500,180 C 500,180 520,165 520,150 C 520,140 510,130 500,130 Z" fill="#47cf83" />
          <circle cx="500" cy="150" r="5" fill="#0a1a1f" />
        </g>

        {/* --- FIELD PHOTO (Phase 1) --- */}
        <g className={motion ? "w-story-photo" : ""} style={{ transformOrigin: '500px 160px' }}>
          <rect x="420" y="90" width="160" height="120" fill="#ffffff" rx="8" />
          <rect x="430" y="100" width="140" height="80" fill="#2c5c52" rx="4" />
          <circle cx="500" cy="140" r="15" fill="#47cf83" opacity="0.6" />
          <circle cx="500" cy="140" r="5" fill="#fff" />
          <text x="440" y="195" fontSize="10" fontWeight="bold" fill="#0a1a1f">GEO-CODED FIELD EVIDENCE</text>
        </g>

        {/* --- DYNAMIC TEXT OVERLAYS --- */}
        <g transform="translate(40, 260)">
          <g className={motion ? "w-story-text-1" : ""}><text fill="#fff" fontSize="28" fontWeight="800">1. GEO-CODED EVIDENCE</text><text y="20" fill="#8da6a1" fontSize="14">A field photo enters the system with embedded GPS coordinates.</text></g>
          <g className={motion ? "w-story-text-2" : ""}><text fill="#fff" fontSize="28" fontWeight="800">2. MAP LOCATION</text><text y="20" fill="#8da6a1" fontSize="14">The image is precisely placed on the geospatial grid.</text></g>
          <g className={motion ? "w-story-text-3" : ""}><text fill="#fff" fontSize="28" fontWeight="800">3. WATERSHED CONTEXT</text><text y="20" fill="#8da6a1" fontSize="14">Topography and drainage boundaries are automatically resolved.</text></g>
          <g className={motion ? "w-story-text-4" : ""}><text fill="#fff" fontSize="28" fontWeight="800">4. SATELLITE OBSERVATION</text><text y="20" fill="#8da6a1" fontSize="14">Earth observation data is retrieved for the watershed polygon.</text></g>
          <g className={motion ? "w-story-text-5" : ""}><text fill="#fff" fontSize="28" fontWeight="800">5. SPECTRAL ANALYSIS</text><text y="20" fill="#8da6a1" fontSize="14">Water and vegetation conditions are analyzed for change.</text></g>
          <g className={motion ? "w-story-text-6" : ""}><text fill="#47cf83" fontSize="28" fontWeight="800">6. WATERSHED INSIGHT</text><text y="20" fill="#8da6a1" fontSize="14">Physical interventions are planned based on holistic intelligence.</text></g>
        </g>
        
        {/* Static Title */}
        <text x="40" y="40" fill="#168a4c" fontSize="12" fontWeight="800" letterSpacing="1.5">WATERSIGHT INTELLIGENCE WORKFLOW</text>
      </svg>
    </div>
  );
}
