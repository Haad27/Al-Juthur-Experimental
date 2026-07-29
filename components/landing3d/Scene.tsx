"use client";

import { useState, useCallback, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import PostProcessing from "./PostProcessing";
import CameraController from "./CameraController";
import CylindricalGallery, { CylindricalGalleryHandle } from "./CylindricalGallery";
import BackgroundGrid from "./BackgroundGrid";
import { useVirtualScroll } from "./CylindricalGallery/useVirtualScroll";
import PresetSelector from "./PresetSelector";
import QuranCenter from "./QuranCenter";
import { Leva } from "leva";

const LEVA_THEME = {
  colors: {
    elevation1: '#0a0a0a',
    elevation2: '#141414',
    elevation3: '#1e1e1e',
    accent1: '#f5f2ed',
    accent2: '#3a3836',
    accent3: '#3a3836',
    highlight1: '#f5f2ed',
    highlight2: 'rgba(245,242,237,0.6)',
    highlight3: 'rgba(245,242,237,0.3)',
    vivid1: '#f5f2ed',
  },
  fonts: {
    mono: "'IBM Plex Mono', monospace",
    sans: "'IBM Plex Mono', monospace",
  },
  sizes: {
    titleBarHeight: '28px',
  },
  fontSizes: {
    root: '10px',
  },
  borderWidths: {
    root: '1px',
    input: '1px',
    focus: '1px',
    hover: '1px',
    active: '1px',
    folder: '1px',
  },
  radii: {
    xs: '1px',
    sm: '2px',
    lg: '2px',
  },
}

interface GallerySceneProps {
  avatars: string[];
  captions?: string[];
}

function SceneContent({
  avatars,
  captions = [],
  galleryRef,
}: GallerySceneProps & {
  galleryRef: React.Ref<CylindricalGalleryHandle>;
}) {
  const { scrollOffset, scrollVelocity, frictionRef, update } = useVirtualScroll(0.95);

  return (
    <>
      <BackgroundGrid />
      <CameraController scrollVelocity={scrollVelocity} />
      <QuranCenter />
      <CylindricalGallery
        ref={galleryRef}
        images={avatars}
        captions={captions}
        scrollVelocity={scrollVelocity}
        scrollOffset={scrollOffset}
        frictionRef={frictionRef}
        updateScroll={update}
        preset="greenScifi"
        debugMode="none"
      />
      <PostProcessing preset="greenScifi" />
    </>
  );
}

export default function Scene({ avatars, captions }: GallerySceneProps) {
  const galleryRef = useRef<CylindricalGalleryHandle>(null);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
      }}
    >
      <Canvas 
        gl={{ powerPreference: "high-performance", alpha: false, antialias: false }}
        camera={{ fov: 75, position: [0, 0, 12], rotation: [0, 0, 0] }}
        fallback={
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black/90 pointer-events-auto z-50">
            <h2 className="text-2xl font-bold text-white mb-2">3D Experience Unavailable</h2>
            <p className="text-gray-400 max-w-md">
              Your browser or device does not support WebGL, or Hardware Acceleration is disabled. 
              <br/><br/>
              To see the 3D interactive gallery, please enable <b>Hardware Acceleration</b> in your browser settings (Chrome/Edge/Brave/Firefox).
            </p>
          </div>
        }
      >
        <SceneContent
          avatars={avatars}
          captions={captions}
          galleryRef={galleryRef}
        />
      </Canvas>
      <Leva hidden />
    </div>
  );
}
