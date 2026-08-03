"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import ParticleTrails from "./ParticleTrails";
import type { CylindricalGalleryHandle } from "./CylindricalGallery";

/**
 * Per-section 3D visual activations tied to scroll progress.
 * Drives gallery panel uniforms, spawns overlays, and activates particle trails.
 *
 * Section activation ranges (matching ScrollCameraRig keyframes):
 *   Quran View:     0.10 – 0.25
 *   Tafsirs:        0.25 – 0.42
 *   Lexicon:        0.42 – 0.58
 *   RAG AI:         0.58 – 0.75
 *   AI Translation: 0.75 – 0.92
 */

interface SectionActivationsProps {
  scrollProgress: React.MutableRefObject<number>;
  galleryRef: React.RefObject<CylindricalGalleryHandle | null>;
}

// Helper: compute activation intensity for a section's progress range
function sectionIntensity(progress: number, start: number, end: number): number {
  if (progress < start || progress > end) return 0;
  const mid = (start + end) / 2;
  const halfRange = (end - start) / 2;
  const dist = Math.abs(progress - mid) / halfRange;
  return Math.max(0, 1 - dist * dist);
}

/**
 * Glowing Arabic text overlay — uses direct DOM ref to avoid re-render issues.
 * Updates opacity in useFrame by manipulating the DOM element directly.
 */
function ArabicOverlay({
  scrollProgress,
}: {
  scrollProgress: React.MutableRefObject<number>;
}) {
  const domRef = useRef<HTMLDivElement>(null);

  useFrame(() => {
    if (!domRef.current) return;
    const opacity = sectionIntensity(scrollProgress.current, 0.10, 0.28);
    domRef.current.style.opacity = String(opacity);
    domRef.current.style.transform = `translateY(${(1 - opacity) * 10}px)`;
  });

  return (
    <Html position={[0, 2.2, 0]} center>
      <div
        ref={domRef}
        style={{
          opacity: 0,
          color: "#6df4ce",
          fontSize: "1.6rem",
          fontWeight: 700,
          textShadow:
            "0 0 20px #6df4ce, 0 0 40px #6df4ce60, 0 0 80px #6df4ce30",
          whiteSpace: "nowrap",
          fontFamily: "'Scheherazade New', 'Amiri', serif",
          letterSpacing: "0.05em",
          userSelect: "none",
          pointerEvents: "none",
          transition: "transform 0.3s ease",
        }}
      >
        بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
      </div>
    </Html>
  );
}

/**
 * English translation overlay — appears during AI Translation section.
 */
function EnglishOverlay({
  scrollProgress,
}: {
  scrollProgress: React.MutableRefObject<number>;
}) {
  const domRef = useRef<HTMLDivElement>(null);

  useFrame(() => {
    if (!domRef.current) return;
    const opacity = sectionIntensity(scrollProgress.current, 0.75, 0.95);
    domRef.current.style.opacity = String(opacity);
    domRef.current.style.transform = `translateY(${(1 - opacity) * 10}px)`;
  });

  return (
    <Html position={[0, -2.0, 0]} center>
      <div
        ref={domRef}
        style={{
          opacity: 0,
          color: "#a7f3d0",
          fontSize: "1.1rem",
          fontWeight: 600,
          textShadow:
            "0 0 15px #a7f3d060, 0 0 30px #a7f3d030",
          whiteSpace: "nowrap",
          fontFamily: "'Inter', sans-serif",
          letterSpacing: "0.03em",
          userSelect: "none",
          pointerEvents: "none",
          transition: "transform 0.3s ease",
        }}
      >
        In the name of ALLAH ﷻ, the Most Gracious, the Most Merciful
      </div>
    </Html>
  );
}

/**
 * Small glowing word-node spheres for the Lexicon section.
 * Each sphere floats and pulses. Visibility driven by scroll progress.
 */
function WordNodes({
  scrollProgress,
}: {
  scrollProgress: React.MutableRefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const positions: [number, number, number][] = useMemo(
    () => [
      [1.5, 1.0, 1.0],
      [-1.2, -0.5, 1.5],
      [0.8, -1.2, -1.0],
      [-1.8, 0.8, -0.5],
      [0.3, 1.5, -1.2],
    ],
    []
  );

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#6df4ce"),
        transparent: true,
        toneMapped: false,
      }),
    []
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const opacity = sectionIntensity(scrollProgress.current, 0.42, 0.58);
    const time = state.clock.elapsedTime;

    material.opacity = opacity * 0.9;

    groupRef.current.children.forEach((child, i) => {
      const floatY = Math.sin(time * 1.5 + i * 1.2) * 0.15;
      const baseScale = opacity * (0.08 + Math.sin(time * 2 + i * 0.8) * 0.03);
      child.position.y = positions[i][1] + floatY;
      child.scale.setScalar(Math.max(0.001, baseScale));
    });
  });

  return (
    <group ref={groupRef}>
      {positions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[1, 12, 8]} />
          <primitive object={material} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Gallery uniform driver — modifies gallery shader uniforms each frame
 * based on which section is active.
 */
function GalleryDriver({
  scrollProgress,
  galleryRef,
}: {
  scrollProgress: React.MutableRefObject<number>;
  galleryRef: React.RefObject<CylindricalGalleryHandle | null>;
}) {
  const baseEmission = 0.25;
  const baseBorderEmission = 0;
  const baseBrightness = 1.0;

  useFrame(() => {
    const p = scrollProgress.current;
    const mesh = galleryRef.current?.getMesh?.();
    if (!mesh) return;

    const mat = mesh.material as THREE.ShaderMaterial;
    if (!mat.uniforms) return;

    const quranIntensity = sectionIntensity(p, 0.10, 0.25);
    const tafsirIntensity = sectionIntensity(p, 0.25, 0.42);
    const lexiconIntensity = sectionIntensity(p, 0.42, 0.58);
    const ragIntensity = sectionIntensity(p, 0.58, 0.75);
    const translationIntensity = sectionIntensity(p, 0.75, 0.92);

    // Emission: ramps up during Tafsirs, moderate during others
    const targetEmission =
      baseEmission +
      quranIntensity * 0.3 +
      tafsirIntensity * 1.5 +
      lexiconIntensity * 0.4 +
      ragIntensity * 0.6 +
      translationIntensity * 0.3;

    // Border emission: strongest during Tafsirs and Quran View
    const targetBorderEmission =
      baseBorderEmission +
      quranIntensity * 1.5 +
      tafsirIntensity * 3.0 +
      lexiconIntensity * 0.8 +
      ragIntensity * 0.3 +
      translationIntensity * 0.5;

    // Brightness: slightly boosted during Tafsirs
    const targetBrightness =
      baseBrightness + tafsirIntensity * 0.5 + quranIntensity * 0.2;

    // Smooth lerp to targets
    mat.uniforms.uEmission.value = THREE.MathUtils.lerp(
      mat.uniforms.uEmission.value,
      targetEmission,
      0.05
    );
    mat.uniforms.uBorderEmission.value = THREE.MathUtils.lerp(
      mat.uniforms.uBorderEmission.value,
      targetBorderEmission,
      0.05
    );
    mat.uniforms.uBrightness.value = THREE.MathUtils.lerp(
      mat.uniforms.uBrightness.value,
      targetBrightness,
      0.05
    );
  });

  return null;
}

export default function SectionActivations({
  scrollProgress,
  galleryRef,
}: SectionActivationsProps) {
  return (
    <>
      {/* Gallery uniform driver */}
      <GalleryDriver scrollProgress={scrollProgress} galleryRef={galleryRef} />

      {/* Quran View: Arabic text overlay near the book */}
      <ArabicOverlay scrollProgress={scrollProgress} />

      {/* AI Translation: English text overlay */}
      <EnglishOverlay scrollProgress={scrollProgress} />

      {/* Lexicon: Word node spheres */}
      <WordNodes scrollProgress={scrollProgress} />

      {/* RAG AI: Particle trails */}
      <ParticleTrails scrollProgress={scrollProgress} activeRange={[0.55, 0.78]} />
    </>
  );
}
