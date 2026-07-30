"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Camera keyframes for each scroll section.
 * Progress values correspond to section midpoints across the full page scroll.
 * Total page: hero(100vh) + 5 features(120vh each) + CTA(100vh) = 800vh
 * 
 * Section layout:
 *   Hero:           0vh - 100vh    → progress 0.000 - 0.125
 *   Quran View:   100vh - 220vh   → progress 0.125 - 0.275
 *   Tafsirs:      220vh - 340vh   → progress 0.275 - 0.425
 *   Lexicon:      340vh - 460vh   → progress 0.425 - 0.575
 *   RAG AI:       460vh - 580vh   → progress 0.575 - 0.725
 *   AI Translation: 580vh - 700vh → progress 0.725 - 0.875
 *   Final CTA:    700vh - 800vh   → progress 0.875 - 1.000
 */
interface CameraKeyframe {
  progress: number;
  position: [number, number, number];
  lookAt: [number, number, number];
}

const KEYFRAMES: CameraKeyframe[] = [
  { progress: 0.0,   position: [0, 0, 12],      lookAt: [0, 0.1, 0] },   // Hero — establishing shot
  { progress: 0.18,  position: [0, 0.5, 7],      lookAt: [0, 0, 0] },     // Quran View — push in
  { progress: 0.35,  position: [3.5, 1.2, 10],   lookAt: [0, 0, 0] },     // Tafsirs — orbit, show panels
  { progress: 0.50,  position: [2, 0.3, 7.5],    lookAt: [0, 0, 0] },     // Lexicon — 3/4 angle close
  { progress: 0.65,  position: [-1, 2, 13],      lookAt: [0, 0, 0] },     // RAG AI — wide, high
  { progress: 0.82,  position: [0, -0.5, 9],     lookAt: [0, 0, 0] },     // AI Translation — centered lower
  { progress: 1.0,   position: [0, 0, 11],       lookAt: [0, 0.1, 0] },   // Final CTA — calm settle
];

// Linearly interpolate between two keyframes based on scroll progress
function getInterpolatedKeyframe(progress: number) {
  // Clamp
  const p = Math.max(0, Math.min(1, progress));

  // Find surrounding keyframes
  let lower = KEYFRAMES[0];
  let upper = KEYFRAMES[KEYFRAMES.length - 1];

  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (p >= KEYFRAMES[i].progress && p <= KEYFRAMES[i + 1].progress) {
      lower = KEYFRAMES[i];
      upper = KEYFRAMES[i + 1];
      break;
    }
  }

  const range = upper.progress - lower.progress;
  const t = range > 0 ? (p - lower.progress) / range : 0;

  // Smooth step for more natural easing
  const st = t * t * (3 - 2 * t);

  return {
    position: [
      THREE.MathUtils.lerp(lower.position[0], upper.position[0], st),
      THREE.MathUtils.lerp(lower.position[1], upper.position[1], st),
      THREE.MathUtils.lerp(lower.position[2], upper.position[2], st),
    ] as [number, number, number],
    lookAt: [
      THREE.MathUtils.lerp(lower.lookAt[0], upper.lookAt[0], st),
      THREE.MathUtils.lerp(lower.lookAt[1], upper.lookAt[1], st),
      THREE.MathUtils.lerp(lower.lookAt[2], upper.lookAt[2], st),
    ] as [number, number, number],
  };
}

interface ScrollCameraRigProps {
  scrollProgress: React.MutableRefObject<number>;
  scrollVelocity: React.MutableRefObject<number>;
}

export default function ScrollCameraRig({
  scrollProgress,
  scrollVelocity,
}: ScrollCameraRigProps) {
  const { camera } = useThree();

  // Mouse parallax state
  const mousePosition = useRef({ x: 0, y: 0 });
  const smoothMouse = useRef({ x: 0, y: 0 });

  // Hero-mode velocity zoom state
  const targetZoom = useRef(0);
  const currentZoomOffset = useRef(0);

  // Smooth camera target state (for lerping)
  const smoothPosition = useRef(new THREE.Vector3(0, 0, 12));
  const smoothLookAt = useRef(new THREE.Vector3(0, 0.1, 0));

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mousePosition.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mousePosition.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame(() => {
    const progress = scrollProgress.current;

    // --- Mouse parallax ---
    const smoothing = 0.06;
    smoothMouse.current.x += (mousePosition.current.x - smoothMouse.current.x) * smoothing;
    smoothMouse.current.y += (mousePosition.current.y - smoothMouse.current.y) * smoothing;

    // Reduce parallax intensity as we scroll deeper into feature sections
    const parallaxFalloff = Math.max(0, 1 - progress * 3); // full at hero, ~0 by section 2
    const panX = smoothMouse.current.x * 0.8 * (0.3 + 0.7 * parallaxFalloff);
    const panY = smoothMouse.current.y * 1.2 * (0.3 + 0.7 * parallaxFalloff);

    // --- Hero-mode velocity zoom (only active in hero section) ---
    const heroBlend = Math.max(0, 1 - progress * 8); // 1 at hero, 0 by progress 0.125
    const absVelocity = Math.abs(scrollVelocity.current);
    targetZoom.current += absVelocity * 0.05 * heroBlend;
    targetZoom.current = THREE.MathUtils.clamp(targetZoom.current, 0, 17);
    currentZoomOffset.current += (targetZoom.current - currentZoomOffset.current) * 0.1;
    // Decay zoom back toward 0
    targetZoom.current = THREE.MathUtils.lerp(targetZoom.current, 0, 0.1);

    // --- Keyframe interpolation ---
    const kf = getInterpolatedKeyframe(progress);

    // Mobile responsive zoom
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const mobileZoomFactor = isMobile ? Math.max(1, 680 / window.innerWidth) : 1;

    // Combine: keyframe position + parallax + hero zoom
    const targetPos = new THREE.Vector3(
      kf.position[0] + panX,
      kf.position[1] + panY,
      (kf.position[2] + currentZoomOffset.current) * mobileZoomFactor
    );

    const targetLookAtVec = new THREE.Vector3(
      kf.lookAt[0],
      kf.lookAt[1],
      kf.lookAt[2]
    );

    // Smooth lerp toward targets (higher lerp = snappier, lower = smoother)
    const lerpSpeed = 0.04;
    smoothPosition.current.lerp(targetPos, lerpSpeed);
    smoothLookAt.current.lerp(targetLookAtVec, lerpSpeed);

    camera.position.copy(smoothPosition.current);
    camera.lookAt(smoothLookAt.current);
  });

  return null;
}
