// ============================================================
//  VideoIntro.jsx  —  Drop into /app/components/VideoIntro/
//  Next.js App Router · React · Three.js · GSAP
// ============================================================

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import styles from './VideoIntro.module.css';

// ─── Sub-component: Three.js Cinematic Particle Layer ─────────
function CinematicLayer() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 5;

    // Particle data
    const COUNT = 420;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    const offsets = new Float32Array(COUNT);
    const basePos = new Float32Array(COUNT * 3);

    const palettes = [
      [1.0, 0.55, 0.25],   // warm orange
      [1.0, 0.72, 0.45],   // soft amber
      [0.98, 0.95, 0.88],  // cream
      [0.75, 0.85, 1.0],   // monitor blue
      [1.0, 0.40, 0.15],   // deep orange
    ];

    for (let i = 0; i < COUNT; i++) {
      const spread = 9;
      const x = (Math.random() - 0.5) * spread;
      const y = (Math.random() - 0.5) * spread * 0.6;
      const z = (Math.random() - 0.5) * 4 - 1;
      pos[i*3] = basePos[i*3] = x;
      pos[i*3+1] = basePos[i*3+1] = y;
      pos[i*3+2] = basePos[i*3+2] = z;
      speeds[i] = Math.random() * 0.3 + 0.12;
      offsets[i] = Math.random() * Math.PI * 2;
      const col = palettes[Math.floor(Math.random() * palettes.length)];
      colors[i*3] = col[0]; colors[i*3+1] = col[1]; colors[i*3+2] = col[2];
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Bokeh texture
    const tc = document.createElement('canvas');
    tc.width = tc.height = 64;
    const ctx2d = tc.getContext('2d');
    const grd = ctx2d.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx2d.fillStyle = grd;
    ctx2d.beginPath(); ctx2d.arc(32, 32, 32, 0, Math.PI * 2); ctx2d.fill();
    const bokehTex = new THREE.CanvasTexture(tc);

    const mat = new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.15,
      sizeAttenuation: true,
      map: bokehTex,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // Resize
    let camTargetX = 0, camTargetY = 0;
    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    // Mouse
    const onMouse = (e) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth - 0.5),
        y: (e.clientY / window.innerHeight - 0.5),
      };
    };
    window.addEventListener('mousemove', onMouse);

    // Tick
    const tick = (t) => {
      rafRef.current = requestAnimationFrame(tick);
      const time = t * 0.001;
      const posArr = geo.attributes.position.array;

      for (let i = 0; i < COUNT; i++) {
        const spd = speeds[i];
        const off = offsets[i];
        posArr[i*3+1] = basePos[i*3+1] + Math.sin(time * spd + off) * 0.12;
        posArr[i*3]   = basePos[i*3]   + Math.cos(time * spd * 0.7 + off) * 0.06;
      }
      geo.attributes.position.needsUpdate = true;

      camTargetX += (mouseRef.current.x - camTargetX) * 0.035;
      camTargetY += (mouseRef.current.y - camTargetY) * 0.035;
      camera.position.x = camTargetX * 0.9;
      camera.position.y = -camTargetY * 0.6;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };
    requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
      geo.dispose(); mat.dispose(); bokehTex.dispose(); renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.threeCanvas} />;
}

// ─── Icons ────────────────────────────────────────────────────
const IconPause = () => (
  <svg viewBox="0 0 24 24" className={styles.icon}>
    <rect x="6" y="4" width="4" height="16" rx="1"/>
    <rect x="14" y="4" width="4" height="16" rx="1"/>
  </svg>
);
const IconPlay = () => (
  <svg viewBox="0 0 24 24" className={styles.icon}>
    <polygon points="5,3 19,12 5,21"/>
  </svg>
);
const IconMuted = () => (
  <svg viewBox="0 0 24 24" className={styles.icon}>
    <path d="M11 5L6 9H2v6h4l5 4V5z"/>
    <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2"/>
    <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2"/>
  </svg>
);
const IconSound = () => (
  <svg viewBox="0 0 24 24" className={styles.icon}>
    <path d="M11 5L6 9H2v6h4l5 4V5z"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// ─── Main VideoIntro Component ────────────────────────────────
export default function VideoIntro({ videoSrc = '/hero-video.mp4' }) {
  const heroRef = useRef(null);
  const videoMainRef = useRef(null);
  const videoBlurRef = useRef(null);
  const lbTopRef = useRef(null);
  const lbBotRef = useRef(null);
  const soundHintRef = useRef(null);
  const controlsRef = useRef(null);
  const scrollRef = useRef(null);
  const contentRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [hintVisible, setHintVisible] = useState(true);

  // Play/Pause toggle
  const togglePlay = useCallback(() => {
    const v = videoMainRef.current;
    const b = videoBlurRef.current;
    if (!v) return;
    if (isPlaying) { v.pause(); b?.pause(); }
    else { v.play(); b?.play(); }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Mute toggle
  const toggleMute = useCallback(() => {
    const v = videoMainRef.current;
    if (!v) return;
    const nextMuted = !v.muted;
    v.muted = nextMuted;
    v.defaultMuted = nextMuted;
    v.volume = nextMuted ? 0 : 1;
    if (!nextMuted) {
      v.play().catch(() => {});
      setHintVisible(false);
    }
    setIsMuted(nextMuted);
  }, [isMuted]);

  // Scroll to next section
  const scrollNext = () => {
    document.getElementById('next-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // GSAP entrance
  useEffect(() => {
    const videos = [videoMainRef.current, videoBlurRef.current].filter(Boolean);
    videos.forEach((video) => {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.load();
      video.play().catch(() => {
        video.setAttribute('data-video-error', 'true');
      });
    });

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl
      .set([lbTopRef.current, lbBotRef.current], { scaleY: 1 })
      .to([lbTopRef.current, lbBotRef.current], {
        scaleY: 0, duration: 1.4, ease: 'expo.inOut'
      }, 0.6)
      .to(videoMainRef.current, { opacity: 1, duration: 2.2, ease: 'power2.out' }, 0.4)
      .to('.js-bloom', { opacity: 1, duration: 3.5, ease: 'power1.out' }, 0.8)
      .to('.js-tagline', { opacity: 1, duration: 1.1 }, 1.3)
      .to('.js-name1', { opacity: 1, y: '0%', duration: 1.2 }, 1.5)
      .to('.js-name2', { opacity: 1, y: '0%', duration: 1.2 }, 1.72)
      .to('.js-role', { opacity: 1, duration: 1.1 }, 2.0)
      .to(controlsRef.current, { opacity: 1, duration: 0.9 }, 2.4)
      .to(scrollRef.current, { opacity: 1, duration: 0.9 }, 2.6)
      .to(soundHintRef.current, { opacity: 1, duration: 0.7 }, 2.8);

    // Auto-hide hint
    const hideTimer = setTimeout(() => {
      gsap.to(soundHintRef.current, { opacity: 0, duration: 1 });
    }, 5500);

    return () => clearTimeout(hideTimer);
  }, []);

  return (
    <>
      {/* Letterbox bars */}
      <div ref={lbTopRef} className={`${styles.lbBar} ${styles.lbTop}`} />
      <div ref={lbBotRef} className={`${styles.lbBar} ${styles.lbBottom}`} />

      {/* Film grain */}
      <div className={styles.grain} aria-hidden="true" />

      {/* Hero */}
      <section ref={heroRef} className={styles.hero}>

        {/* Ambient blur layer */}
        <div className={styles.videoBluWrap}>
          <video ref={videoBlurRef} className={styles.videoBlur}
            src={videoSrc} autoPlay loop muted playsInline preload="auto" />
        </div>

        {/* Light blooms */}
        <div className={`${styles.bloom} ${styles.bloomOrange} js-bloom`} />
        <div className={`${styles.bloom} ${styles.bloomBlue} js-bloom`} />

        {/* Three.js */}
        <CinematicLayer />

        {/* Gradient overlays */}
        <div className={styles.gradTop} />
        <div className={styles.gradBottom} />
        <div className={styles.gradLeft} />
        <div className={styles.gradRight} />
        <div className={styles.vignette} />

        {/* Main video */}
        <div className={styles.videoMainWrap}>
          <video ref={videoMainRef} className={styles.videoMain}
            src={videoSrc} autoPlay loop muted={isMuted} playsInline preload="auto" />
        </div>

        {/* Sound hint */}
        <div ref={soundHintRef} className={styles.soundHint}
          style={{ opacity: 0 }} aria-hidden="true">
          <div className={styles.pulseDot} />
          <span>Tap for sound</span>
        </div>

        {/* Content */}
        <div ref={contentRef} className={styles.content}>
          <p className={`${styles.tagline} js-tagline`} style={{ opacity: 0 }}>
            Creative Technologist &amp; AI Builder
          </p>
          <div className={styles.nameWrap}>
            <span className={`${styles.nameLine} js-name1`}
              style={{ opacity: 0, transform: 'translateY(110%)' }}>GOUTHAM</span>
            <span className={`${styles.nameLine} ${styles.nameAccent} js-name2`}
              style={{ opacity: 0, transform: 'translateY(110%)' }}>SAI</span>
          </div>
          <p className={`${styles.role} js-role`} style={{ opacity: 0 }}>
            <span>UI/UX</span> · Generative AI ·
            <span>Frontend Engineering</span> · Club President
          </p>
        </div>

        {/* Controls */}
        <div ref={controlsRef} className={styles.controls} style={{ opacity: 0 }}>
          <button className={styles.ctrlBtn} onClick={togglePlay}
            aria-label={isPlaying ? 'Pause video' : 'Play video'}>
            {isPlaying ? <IconPause /> : <IconPlay />}
          </button>
          <button className={styles.ctrlBtn} onClick={toggleMute}
            aria-label={isMuted ? 'Unmute video' : 'Mute video'}>
            {isMuted ? <IconMuted /> : <IconSound />}
          </button>
        </div>

        {/* Scroll indicator */}
        <div ref={scrollRef} className={styles.scrollIndicator}
          style={{ opacity: 0 }} onClick={scrollNext}>
          <span>Scroll</span>
          <div className={styles.scrollLine} />
        </div>

      </section>
    </>
  );
}
