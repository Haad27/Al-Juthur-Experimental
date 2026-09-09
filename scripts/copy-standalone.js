const fs = require('fs');
const path = require('path');

function copyStandaloneAssets() {
  console.log('Copying static assets to standalone directory...');
  const standalonePath = path.join(__dirname, '..', '.next', 'standalone');
  const standaloneStaticPath = path.join(standalonePath, '.next', 'static');
  const standalonePublicPath = path.join(standalonePath, 'public');

  const sourceStaticPath = path.join(__dirname, '..', '.next', 'static');
  const sourcePublicPath = path.join(__dirname, '..', 'public');

  if (fs.existsSync(sourceStaticPath)) {
    fs.cpSync(sourceStaticPath, standaloneStaticPath, { recursive: true });
  }
  
  if (fs.existsSync(sourcePublicPath)) {
    fs.cpSync(sourcePublicPath, standalonePublicPath, { recursive: true });
  }
  
  console.log('Assets copied successfully.');
}

copyStandaloneAssets();
