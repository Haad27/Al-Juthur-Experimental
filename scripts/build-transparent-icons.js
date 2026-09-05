const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Clean transparent SVG for Al-Juthur logo mark (Book + Roots)
// Perfectly centered with viewBox '4 10 92 92'
const getTransparentSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="4 10 92 92" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="aljuthur-book-grad" x1="15" y1="15" x2="85" y2="90" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#C4A574"/>
      <stop offset="50%" stop-color="#8B6914"/>
      <stop offset="100%" stop-color="#C4A574"/>
    </linearGradient>
    <linearGradient id="aljuthur-roots-grad" x1="50" y1="50" x2="50" y2="96" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#8B6914"/>
      <stop offset="40%" stop-color="#C4A574"/>
      <stop offset="100%" stop-color="#DFBF86"/>
    </linearGradient>
  </defs>

  <!-- Book Outer Hardcover Spine & Base Outline -->
  <path d="M 16 26 L 16 52 C 26 55 38 58 50 64 C 62 58 74 55 84 52 L 84 26 L 81 26 L 81 50 C 71 53 60 56 50 61 C 40 56 29 53 19 50 L 19 26 Z" fill="#2A1E14"/>

  <!-- Outer Thick Page Leaves -->
  <path d="M 20 22 C 30 25 41 28 49 32 L 49 57 C 40 53 30 50 20 47 Z" fill="url(#aljuthur-book-grad)"/>
  <path d="M 80 22 C 70 25 59 28 51 32 L 51 57 C 60 53 70 50 80 47 Z" fill="url(#aljuthur-book-grad)"/>

  <!-- Inner Raised Mus'haf Pages -->
  <path d="M 24 17 C 33 20 42 23 49 26 L 49 51 C 42 48 33 45 24 42 Z" fill="#EDE4D0" stroke="#C4A574" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M 76 17 C 67 20 58 23 51 26 L 51 51 C 58 48 67 45 76 42 Z" fill="#EDE4D0" stroke="#C4A574" stroke-width="1.2" stroke-linejoin="round"/>

  <!-- Inner Script Guideline Accents -->
  <path d="M 28 27 Q 37 30 44 32.5 M 28 33 Q 37 36 44 38.5 M 28 39 Q 37 42 44 44.5" stroke="#8B6914" stroke-width="0.9" stroke-linecap="round" opacity="0.65"/>
  <path d="M 72 27 Q 63 30 56 32.5 M 72 33 Q 63 36 56 38.5 M 72 39 Q 63 42 56 44.5" stroke="#8B6914" stroke-width="0.9" stroke-linecap="round" opacity="0.65"/>

  <!-- Spine Central Seam -->
  <line x1="50" y1="25" x2="50" y2="63" stroke="#2A1E14" stroke-width="1.5" stroke-linecap="round"/>

  <!-- Organic Roots Network -->
  <path d="M 48.5 61 C 48.5 68 47.2 76 47.8 83 C 48.3 88 49.6 92 50 95 C 50.4 92 51.7 88 52.2 83 C 52.8 76 51.5 68 51.5 61 Z" fill="url(#aljuthur-roots-grad)"/>
  <path d="M 47 64 C 42 69 33 73 26 79 C 22 83 19.5 88 18.5 91 C 20.5 90 23.5 86 26.5 83 C 32.5 78 40 75 46 71 Z" fill="url(#aljuthur-roots-grad)"/>
  <path d="M 42 62 C 34 65 24 67 17 72 C 13 75 11 78.5 10 82 C 12 81 15.5 77.5 20.5 75 C 28 72 36 69 41 65 Z" fill="url(#aljuthur-roots-grad)"/>
  <path d="M 47 74 C 42 79 36 85 30 90.5 C 32 89.5 36.5 85.5 41.5 80.5 Z" fill="url(#aljuthur-roots-grad)"/>
  <path d="M 53 64 C 58 69 67 73 74 79 C 78 83 80.5 88 81.5 91 C 79.5 90 76.5 86 73.5 83 C 67.5 78 60 75 54 71 Z" fill="url(#aljuthur-roots-grad)"/>
  <path d="M 58 62 C 66 65 76 67 83 72 C 87 75 89 78.5 90 82 C 88 81 84.5 77.5 79.5 75 C 72 72 64 69 59 65 Z" fill="url(#aljuthur-roots-grad)"/>
  <path d="M 53 74 C 58 79 64 85 70 90.5 C 68 89.5 63.5 85.5 58.5 80.5 Z" fill="url(#aljuthur-roots-grad)"/>
</svg>
`;

async function generate() {
  const rootDir = path.join(__dirname, '..');
  const favDir = path.join(rootDir, 'public', 'assets', 'favicon');

  const svg512 = getTransparentSvg(512);
  const buf512 = Buffer.from(svg512);

  // 1. Generate transparent 512x512 and 1024x1024
  const svg1024 = getTransparentSvg(1024);
  const buf1024 = Buffer.from(svg1024);
  const logoDir = path.join(rootDir, 'public', 'assets', 'logo');
  await sharp(buf1024).resize(1024, 1024).png().toFile(path.join(logoDir, 'al_juthur_mark_1024.png'));
  await sharp(buf1024).resize(1024, 1024).png().toFile(path.join(logoDir, 'al_juthur_mark_transparent.png'));
  await sharp(buf512).resize(512, 512).png().toFile(path.join(favDir, 'android-chrome-512x512.png'));
  await sharp(buf512).resize(512, 512).png().toFile(path.join(rootDir, 'public', 'al-juthur-logo.png'));
  console.log('Generated transparent marks (1024 & 512) & al-juthur-logo.png');

  // 2. Generate transparent 192x192
  await sharp(buf512).resize(192, 192).png().toFile(path.join(favDir, 'android-chrome-192x192.png'));
  console.log('Generated android-chrome-192x192.png');

  // 3. Generate transparent 180x180 (Apple Touch Icon)
  await sharp(buf512).resize(180, 180).png().toFile(path.join(favDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // 4. Generate transparent 32x32
  await sharp(buf512).resize(32, 32).png().toFile(path.join(favDir, 'favicon-32x32.png'));
  console.log('Generated favicon-32x32.png');

  // 5. Generate transparent 16x16
  await sharp(buf512).resize(16, 16).png().toFile(path.join(favDir, 'favicon-16x16.png'));
  console.log('Generated favicon-16x16.png');

  // 6. Save vector SVGs
  fs.writeFileSync(path.join(favDir, 'favicon.svg'), svg512);
  fs.writeFileSync(path.join(rootDir, 'public', 'favicon.svg'), svg512);
  fs.writeFileSync(path.join(rootDir, 'app', 'icon.svg'), svg512);
  console.log('Updated transparent favicon.svg and app/icon.svg');
}

generate().catch(console.error);
