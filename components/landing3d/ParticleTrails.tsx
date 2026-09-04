"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Animated particle trails that flow from the center (book position)
 * outward to surrounding panel-approximate positions.
 * Used for the RAG AI section to visualize data flowing from the Quran
 * through AI to surrounding reference panels.
 */

const TRAIL_COUNT = 5;
const PARTICLES_PER_TRAIL = 16;
const TOTAL_PARTICLES = TRAIL_COUNT * PARTICLES_PER_TRAIL;

// Target positions (approximate panel positions around the cylinder)
const TRAIL_TARGETS: [number, number, number][] = [
  [5, 2, -2],
  [-4, 1, -3],
  [3, -1.5, -4],
  [-5, 0.5, 1],
  [2, 3, 3],
];

interface ParticleTrailsProps {
  scrollProgress: React.MutableRefObject<number>;
  /** Progress range where trails are active */
  activeRange: [number, number];
}

export default function ParticleTrails({
  scrollProgress,
  activeRange,
}: ParticleTrailsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Create curves from center to each target
  const curves = useMemo(() => {
    const origin = new THREE.Vector3(0, 0, 0);
    return TRAIL_TARGETS.map((target) => {
      const end = new THREE.Vector3(...target);
      const mid1 = new THREE.Vector3().lerpVectors(origin, end, 0.3);
      mid1.y += (Math.random() - 0.5) * 2;
      mid1.x += (Math.random() - 0.5) * 1.5;
      const mid2 = new THREE.Vector3().lerpVectors(origin, end, 0.65);
      mid2.y += (Math.random() - 0.5) * 1.5;
      mid2.z += (Math.random() - 0.5) * 1;
      return new THREE.CatmullRomCurve3([origin, mid1, mid2, end]);
    });
  }, []);

  // Per-particle phase offsets for staggered movement
  const phaseOffsets = useMemo(() => {
    const arr = new Float32Array(TOTAL_PARTICLES);
    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      const trailIdx = Math.floor(i / PARTICLES_PER_TRAIL);
      const particleIdx = i % PARTICLES_PER_TRAIL;
      arr[i] = (particleIdx / PARTICLES_PER_TRAIL) + trailIdx * 0.15;
    }
    return arr;
  }, []);

  // Create emissive radiant gold material
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#D4AF37"),
        transparent: true,
        opacity: 0.9,
        toneMapped: false,
      }),
    []
  );

  useFrame((state) => {
    if (!meshRef.current) return;

    const progress = scrollProgress.current;
    const [start, end] = activeRange;

    // Calculate visibility: 0 outside range, 0-1 within range with fade-in/out
    const fadeInEnd = start + (end - start) * 0.15;
    const fadeOutStart = end - (end - start) * 0.2;

    let visibility = 0;
    if (progress >= start && progress <= end) {
      if (progress < fadeInEnd) {
        visibility = (progress - start) / (fadeInEnd - start);
      } else if (progress > fadeOutStart) {
        visibility = 1 - (progress - fadeOutStart) / (end - fadeOutStart);
      } else {
        visibility = 1;
      }
    }

    const time = state.clock.elapsedTime;

    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      const trailIdx = Math.floor(i / PARTICLES_PER_TRAIL);
      const curve = curves[trailIdx];

      // Animate t along curve (looping with phase offset)
      const t = ((time * 0.3 + phaseOffsets[i]) % 1);
      const point = curve.getPointAt(t);

      dummy.position.copy(point);

      // Scale: smaller at endpoints, larger in middle of trail
      // Also scale by visibility
      const trailT = (i % PARTICLES_PER_TRAIL) / PARTICLES_PER_TRAIL;
      const sizeAlongTrail = Math.sin(trailT * Math.PI) * 0.6 + 0.15;
      const scale = sizeAlongTrail * visibility * (0.5 + Math.sin(time * 2 + i) * 0.2);
      dummy.scale.setScalar(Math.max(0, scale));

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    
    // Update material opacity based on visibility
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = visibility * 0.8;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, TOTAL_PARTICLES]}
      frustumCulled={false}
    >
      <sphereGeometry args={[0.06, 8, 6]} />
      <primitive object={material} attach="material" />
    </instancedMesh>
  );
}
