import { useMemo, useRef } from "react";
import { useLoader } from "@react-three/fiber";
import { TextureLoader, CanvasTexture, LinearFilter, ClampToEdgeWrapping } from "three";

interface AtlasMetadata {
  atlas: CanvasTexture;
  cols: number;
  rows: number;
  uniqueCount: number;
  /** Maps original image index to atlas tile index */
  indexMap: number[];
  /** Reference to the atlas canvas for debug download */
  atlasCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function useTextureAtlas(images: string[]): AtlasMetadata {
  const atlasCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Deduplicate images and encode URI to handle spaces safely across mobile browsers
  const uniqueImages = useMemo(() => {
    const rawUnique = Array.from(new Set(images));
    return rawUnique.map((img) => encodeURI(img));
  }, [images]);

  // Build index map: for each image in the original array, which atlas tile?
  const indexMap = useMemo(() => {
    return images.map((img) => uniqueImages.indexOf(encodeURI(img)));
  }, [images, uniqueImages]);

  // Load unique textures
  const textures = useLoader(TextureLoader, uniqueImages);

  const { atlas, cols, rows } = useMemo(() => {
    const count = uniqueImages.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    // Get natural dimensions from loaded textures
    const origW = textures[0]?.image?.width || 1920;
    const origH = textures[0]?.image?.height || 1080;
    const aspect = origH / origW;

    // Mobile WebGL safety limit:
    // Many Android devices (Mali, Adreno) have MAX_TEXTURE_SIZE = 4096 (or 2048 on older devices).
    // Original images (1920x1080 in 3x3 grid) produced a 5760x3240 canvas, which exceeds MAX_TEXTURE_SIZE
    // and causes WebGL on Android to fail and display black cards.
    // Capping the atlas dimension to 2048px guarantees 100% compatibility across all Android & iOS devices.
    const MAX_ATLAS_DIM = 2048;
    const maxTileW = Math.floor(MAX_ATLAS_DIM / cols);
    const maxTileH = Math.floor(MAX_ATLAS_DIM / rows);

    let tileW = Math.min(origW, maxTileW);
    let tileH = Math.round(tileW * aspect);

    if (tileH * rows > MAX_ATLAS_DIM) {
      tileH = Math.min(origH, maxTileH);
      tileW = Math.round(tileH / aspect);
    }

    tileW = Math.floor(tileW / 2) * 2;
    tileH = Math.floor(tileH / 2) * 2;

    const canvasW = cols * tileW;
    const canvasH = rows * tileH;

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;

    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * tileW;
        const y = row * tileH;
        const img = textures[i]?.image;
        if (img) {
          ctx.drawImage(img, x, y, tileW, tileH);
        }
      }
    }

    const atlasTexture = new CanvasTexture(canvas);
    atlasTexture.minFilter = LinearFilter;
    atlasTexture.magFilter = LinearFilter;
    atlasTexture.wrapS = ClampToEdgeWrapping;
    atlasTexture.wrapT = ClampToEdgeWrapping;
    atlasTexture.needsUpdate = true;

    atlasCanvasRef.current = canvas;

    return { atlas: atlasTexture, cols, rows };
  }, [textures, uniqueImages]);

  return { atlas, cols, rows, uniqueCount: uniqueImages.length, indexMap, atlasCanvasRef };
}
