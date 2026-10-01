import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

// Procedural Audio Engine
function useWatershedAudio(isPlaying) {
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  
  useEffect(() => {
    if (!isPlaying) {
      if (gainNodeRef.current && audioCtxRef.current) {
        gainNodeRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.5);
      }
      return;
    }

    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(ctx.destination);
      gainNodeRef.current = masterGain;

      // 1. Rain / Stream (Brown Noise)
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        let white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // Compensate gain
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;
      
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 800; // soft water sound
      
      noiseSource.connect(lowpass);
      lowpass.connect(masterGain);
      noiseSource.start();

      // 2. Wind (Bandpass sweeping)
      const windSource = ctx.createBufferSource();
      windSource.buffer = buffer;
      windSource.loop = true;
      
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 300;
      bandpass.Q.value = 0.5;
      
      // Animate wind frequency
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.1; // 10 second sweep
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 200;
      lfo.connect(lfoGain);
      lfoGain.connect(bandpass.frequency);
      lfo.start();

      const windGain = ctx.createGain();
      windGain.gain.value = 0.4;
      windSource.connect(bandpass);
      bandpass.connect(windGain);
      windGain.connect(masterGain);
      windSource.start();
    }

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    gainNodeRef.current.gain.setTargetAtTime(0.15, audioCtxRef.current.currentTime, 1.0);

  }, [isPlaying]);
}

export default function WatershedAnimation() {
  const [soundEnabled, setSoundEnabled] = useState(false);
  useWatershedAudio(soundEnabled);

  return (
    <div className="watershed-premium-container" style={{
      position: 'relative', width: '100%', height: '500px', backgroundColor: '#eef6f6',
      borderRadius: '16px', overflow: 'hidden', border: '1px solid #d8e8df', boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
      marginBottom: '40px'
    }}>
      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes cloudDrift {
          0% { transform: translateX(-5%); }
          50% { transform: translateX(5%); }
          100% { transform: translateX(-5%); }
        }
        @keyframes rainFall {
          0% { stroke-dashoffset: 20; opacity: 0; }
          20% { opacity: 0.6; }
          80% { opacity: 0.6; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes waterFlow {
          0% { stroke-dashoffset: 40; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes ripple {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.02); opacity: 0.8; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        @keyframes vegSway {
          0% { transform: rotate(0deg); }
          50% { transform: rotate(1.5deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes satelliteSweep {
          0% { transform: translateX(-100%) skewX(-30deg); opacity: 0; }
          10% { opacity: 0.15; }
          40% { opacity: 0.15; }
          50% { transform: translateX(200%) skewX(-30deg); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes pulsePoint {
          0%, 100% { r: 3; opacity: 0.4; }
          50% { r: 6; opacity: 1; }
        }
        @keyframes contourPulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.6; }
        }
        
        .wa-cloud { animation: cloudDrift 40s ease-in-out infinite; }
        .wa-rain { stroke-dasharray: 4 16; animation: rainFall 1.5s linear infinite; }
        .wa-flow { stroke-dasharray: 10 10; animation: waterFlow 2s linear infinite; }
        .wa-ripple { animation: ripple 4s ease-in-out infinite; transform-origin: center; }
        .wa-veg { animation: vegSway 5s ease-in-out infinite; transform-origin: bottom center; }
        .wa-sweep { animation: satelliteSweep 12s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .wa-point { animation: pulsePoint 3s infinite; }
        .wa-contour { animation: contourPulse 8s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .wa-cloud, .wa-rain, .wa-flow, .wa-ripple, .wa-veg, .wa-sweep, .wa-point, .wa-contour {
            animation: none !important;
          }
        }
      `}} />

      {/* Overlay Header */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '25px', zIndex: 10, background: 'linear-gradient(to bottom, rgba(238,246,246,1) 0%, rgba(238,246,246,0.8) 50%, rgba(238,246,246,0) 100%)', pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#168a4c', display: 'inline-block' }}></span>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#102c3b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Watershed in Action</h2>
        </div>
        <p style={{ margin: 0, color: '#354a40', fontSize: '15px', lineHeight: '1.6', maxWidth: '850px', fontWeight: '500' }}>
          Rainfall becomes runoff. Smart watershed interventions slow, store and conserve water while protecting soil and supporting vegetation.
        </p>
      </div>

      {/* Audio Control */}
      <button 
        onClick={() => setSoundEnabled(!soundEnabled)}
        style={{
          position: 'absolute', top: '25px', right: '25px', zIndex: 20,
          background: 'rgba(255,255,255,0.9)', border: '1px solid #cce3de',
          borderRadius: '20px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px',
          color: '#168a4c', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer',
          boxShadow: '0 2px 5px rgba(0,0,0,0.05)', transition: 'all 0.2s'
        }}
        aria-label={soundEnabled ? "Mute ambient sound" : "Play ambient sound"}
      >
        {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        {soundEnabled ? 'Sound On' : 'Sound Off'}
      </button>

      {/* SVG Canvas */}
      <svg viewBox="0 0 1200 600" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dbecec" />
            <stop offset="100%" stopColor="#eef6f6" />
          </linearGradient>
          <linearGradient id="bgMountain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a3b8b0" />
            <stop offset="100%" stopColor="#c5d6d0" />
          </linearGradient>
          <linearGradient id="midMountain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7a9e7a" />
            <stop offset="100%" stopColor="#9cb89c" />
          </linearGradient>
          <linearGradient id="valley" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#638c5b" />
            <stop offset="100%" stopColor="#4a6e43" />
          </linearGradient>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5bc6d6" />
            <stop offset="100%" stopColor="#3190a6" />
          </linearGradient>
          <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Sky Background */}
        <rect width="1200" height="600" fill="url(#sky)" />

        {/* Clouds */}
        <g className="wa-cloud">
          <path d="M 200,120 Q 230,90 280,100 Q 320,70 370,110 Q 420,100 440,140 L 180,140 Z" fill="#ffffff" opacity="0.8" />
          <path d="M 700,150 Q 720,120 760,130 Q 800,100 850,130 Q 890,120 900,160 L 680,160 Z" fill="#ffffff" opacity="0.7" />
          <path d="M 450,180 Q 480,160 520,170 Q 560,140 600,180 L 430,180 Z" fill="#ffffff" opacity="0.5" />
        </g>

        {/* Rain (falling onto mid-mountains) */}
        <g stroke="#9cc3d1" strokeWidth="2" strokeLinecap="round" className="wa-rain">
          <line x1="280" y1="140" x2="260" y2="280" />
          <line x1="320" y1="140" x2="300" y2="300" style={{ animationDelay: '0.2s' }} />
          <line x1="360" y1="140" x2="340" y2="270" style={{ animationDelay: '0.5s' }} />
          <line x1="400" y1="140" x2="380" y2="290" style={{ animationDelay: '0.1s' }} />
          
          <line x1="740" y1="160" x2="720" y2="320" style={{ animationDelay: '0.4s' }} />
          <line x1="780" y1="160" x2="760" y2="300" style={{ animationDelay: '0.7s' }} />
          <line x1="820" y1="160" x2="800" y2="340" style={{ animationDelay: '0.3s' }} />
          <line x1="860" y1="160" x2="840" y2="310" style={{ animationDelay: '0.6s' }} />
        </g>

        {/* Distant Background Mountains */}
        <path d="M -100,350 Q 150,200 350,280 T 800,240 T 1300,350 L 1300,600 L -100,600 Z" fill="url(#bgMountain)" opacity="0.6" />

        {/* Midground Catchment Mountains */}
        <path d="M -50,450 Q 150,250 300,350 T 600,280 T 950,380 T 1250,300 L 1250,600 L -50,600 Z" fill="url(#midMountain)" />

        {/* Valley & Main Terrain */}
        <path d="M 0,600 L 0,480 Q 250,350 450,440 Q 600,480 750,450 Q 1000,380 1200,480 L 1200,600 Z" fill="url(#valley)" />

        {/* Topographic Contour Lines */}
        <g fill="none" stroke="#ffffff" strokeWidth="1" className="wa-contour">
          <path d="M 100,430 Q 250,320 400,400" />
          <path d="M 150,460 Q 280,360 420,430" />
          <path d="M 700,400 Q 850,330 1000,420" />
          <path d="M 750,430 Q 880,370 1050,450" />
          <path d="M 800,460 Q 920,410 1100,480" />
        </g>

        {/* Watershed Boundary (Subtle glowing dash line) */}
        <path d="M -50,450 Q 150,250 300,350 T 600,280 T 950,380 T 1250,300" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="10 10" opacity="0.4" />

        {/* Runoff Streams */}
        <g fill="none" stroke="#87d7e8" strokeWidth="2.5" strokeLinecap="round" className="wa-flow">
          {/* Left slope runoff */}
          <path d="M 280,360 Q 350,390 420,440" />
          <path d="M 330,350 Q 380,380 430,440" style={{ animationDelay: '0.4s' }} />
          {/* Right slope runoff */}
          <path d="M 880,400 Q 750,420 620,465" />
          <path d="M 830,380 Q 720,400 630,465" style={{ animationDelay: '0.6s' }} />
        </g>

        {/* Main Central Stream */}
        <path d="M 420,440 Q 500,470 580,470" fill="none" stroke="url(#water)" strokeWidth="12" strokeLinecap="round" />
        <path d="M 630,465 Q 600,470 580,470" fill="none" stroke="url(#water)" strokeWidth="10" strokeLinecap="round" />
        
        {/* Stream internal animated flow lines */}
        <g fill="none" stroke="#aeeaf5" strokeWidth="2" className="wa-flow">
          <path d="M 430,443 Q 500,470 570,470" />
          <path d="M 440,437 Q 500,465 575,465" style={{ animationDelay: '0.5s' }} />
        </g>

        {/* Check Dam */}
        <g>
          {/* Main wall */}
          <path d="M 575,455 L 595,455 L 595,485 L 575,485 Z" fill="#a4afac" />
          {/* Top surface */}
          <path d="M 575,455 L 585,450 L 605,450 L 595,455 Z" fill="#c3ccc9" />
          {/* Side wall */}
          <path d="M 595,455 L 605,450 L 605,480 L 595,485 Z" fill="#848f8c" />
          {/* Spillway notch */}
          <rect x="582" y="455" width="6" height="5" fill="#717a78" />
        </g>

        {/* Reservoir (Stored water behind dam) */}
        <path d="M 530,460 Q 550,455 575,460 L 575,475 Q 550,475 530,468 Z" fill="url(#water)" opacity="0.9" className="wa-ripple" />

        {/* Downstream Flow */}
        <path d="M 585,460 Q 650,490 750,520 T 1100,580" fill="none" stroke="url(#water)" strokeWidth="14" strokeLinecap="round" />
        <path d="M 585,465 Q 650,495 750,525 T 1080,580" fill="none" stroke="#aeeaf5" strokeWidth="2.5" className="wa-flow" />

        {/* Soil Infiltration (Subtle downward gradients) */}
        <path d="M 540,475 Q 560,500 580,520 L 530,510 Z" fill="#4a7364" opacity="0.4" />
        <path d="M 550,470 L 550,510" stroke="#87d7e8" strokeWidth="1.5" strokeDasharray="2 4" opacity="0.5" className="wa-rain" />
        <path d="M 565,470 L 565,515" stroke="#87d7e8" strokeWidth="1.5" strokeDasharray="2 4" opacity="0.5" className="wa-rain" style={{ animationDelay: '0.3s' }} />

        {/* Soil Conservation: Contour Bunds & Terraces */}
        <g fill="none" stroke="#527d43" strokeWidth="3" strokeLinecap="round">
          {/* Left slope terraces */}
          <path d="M 150,490 Q 250,420 350,480" />
          <path d="M 120,510 Q 250,450 380,510" />
          <path d="M 80,540 Q 250,480 410,540" />
          {/* Right slope terraces */}
          <path d="M 850,460 Q 950,420 1050,470" />
          <path d="M 820,490 Q 950,450 1100,510" />
        </g>

        {/* Agriculture (Crop Rows) */}
        <g fill="none" stroke="#8cb85c" strokeWidth="2" opacity="0.7">
          <path d="M 200,500 L 230,520" />
          <path d="M 215,495 L 245,515" />
          <path d="M 230,490 L 260,510" />
          
          <path d="M 900,470 L 880,500" />
          <path d="M 920,475 L 900,505" />
          <path d="M 940,480 L 920,510" />
        </g>

        {/* Vegetation: Trees */}
        <g className="wa-veg">
          <circle cx="350" cy="460" r="15" fill="#294d1b" />
          <circle cx="335" cy="470" r="12" fill="#3a6628" />
          <circle cx="365" cy="470" r="10" fill="#1b3611" />
          <path d="M 350,460 L 350,485" stroke="#473222" strokeWidth="3" />
        </g>
        <g className="wa-veg" style={{ animationDelay: '0.8s' }}>
          <circle cx="450" cy="520" r="20" fill="#294d1b" />
          <circle cx="430" cy="535" r="15" fill="#3a6628" />
          <circle cx="470" cy="535" r="14" fill="#1b3611" />
          <path d="M 450,520 L 450,555" stroke="#473222" strokeWidth="4" />
        </g>
        <g className="wa-veg" style={{ animationDelay: '0.4s' }}>
          <circle cx="750" cy="470" r="14" fill="#294d1b" />
          <circle cx="735" cy="480" r="10" fill="#3a6628" />
          <circle cx="765" cy="480" r="9" fill="#1b3611" />
          <path d="M 750,470 L 750,495" stroke="#473222" strokeWidth="3" />
        </g>
        <g className="wa-veg" style={{ animationDelay: '1.2s' }}>
          <circle cx="850" cy="540" r="22" fill="#294d1b" />
          <circle cx="820" cy="555" r="16" fill="#3a6628" />
          <circle cx="880" cy="555" r="15" fill="#1b3611" />
          <path d="M 850,540 L 850,580" stroke="#473222" strokeWidth="4" />
        </g>

        {/* Geospatial Monitoring Element (Subtle Scan Sweep) */}
        <rect x="0" y="0" width="1200" height="600" fill="url(#sweep)" className="wa-sweep" style={{ mixBlendMode: 'overlay' }} />

        {/* Geospatial Monitoring Nodes (Subtle blinking data points) */}
        <g fill="#1ef09c" filter="url(#softGlow)">
          <circle cx="420" cy="440" r="3" className="wa-point" />
          <circle cx="585" cy="470" r="3" className="wa-point" style={{ animationDelay: '1s' }} />
          <circle cx="530" cy="460" r="3" className="wa-point" style={{ animationDelay: '2s' }} />
          <circle cx="750" cy="520" r="3" className="wa-point" style={{ animationDelay: '0.5s' }} />
        </g>
        <g fill="none" stroke="#1ef09c" strokeWidth="1" strokeDasharray="2 4" opacity="0.4">
          <path d="M 420,440 L 585,470 L 750,520" />
          <path d="M 530,460 L 585,470" />
        </g>

      </svg>
    </div>
  );
}
