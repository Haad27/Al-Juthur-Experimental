"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTexture, Float } from "@react-three/drei";

export default function QuranCenter() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Load the Quran image directly into WebGL texture memory
  const texture = useTexture("/assets/images/allah-quran.png");

  return (
    <Float
      speed={2}
      rotationIntensity={0.1}
      floatIntensity={0.4}
      floatingRange={[-0.1, 0.1]}
    >
      <group position={[0, 0, 0]}>
        {/* Floating 3D Quran Image centered with proper depth testing & writing */}
        <mesh ref={meshRef} position={[0, 0, 0]} scale={[3.8, 3.8, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial 
            map={texture} 
            transparent={true} 
            alphaTest={0.05}
            depthTest={true}
            depthWrite={true}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </Float>
  );
}
