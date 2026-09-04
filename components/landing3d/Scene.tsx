"use client";

import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import PostProcessing from "./PostProcessing";
import ScrollCameraRig from "./ScrollCameraRig";
import CylindricalGallery, { CylindricalGalleryHandle } from "./CylindricalGallery";
import BackgroundGrid from "./BackgroundGrid";
import { useVirtualScroll } from "./CylindricalGallery/useVirtualScroll";
import SectionActivations from "./SectionActivations";
import QuranCenter from "./QuranCenter";
import { Leva } from "leva";

interface GallerySceneProps {
  avatars: string[];
  captions?: string[];
  scrollProgress: React.MutableRefObject<number>;
}

function SceneContent({
  avatars,
  captions = [],
  galleryRef,
  scrollProgress,
}: GallerySceneProps & {
  galleryRef: React.RefObject<CylindricalGalleryHandle | null>;
}) {
  const { scrollOffset, scrollVelocity, frictionRef, update } = useVirtualScroll(0.95);

  return (
    <>
      <BackgroundGrid />
      <ScrollCameraRig
        scrollProgress={scrollProgress}
        scrollVelocity={scrollVelocity}
      />
      <QuranCenter />
      <CylindricalGallery
        ref={galleryRef}
        images={avatars}
        captions={captions}
        scrollVelocity={scrollVelocity}
        scrollOffset={scrollOffset}
        frictionRef={frictionRef}
        updateScroll={update}
        preset="scholarGold"
        debugMode="none"
      />
      <SectionActivations
        scrollProgress={scrollProgress}
        galleryRef={galleryRef}
      />
      <PostProcessing preset="scholarGold" />
    </>
  );
}

export default function Scene({ avatars, captions, scrollProgress }: GallerySceneProps) {
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
          scrollProgress={scrollProgress}
        />
      </Canvas>
      <Leva hidden />
    </div>
  );
}
