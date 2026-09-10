const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const pkgStr = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgStr);

function run() {
  // 1. Rebuild native modules for Electron
  console.log('Rebuilding native modules for Electron...');
  execSync('npx electron-builder install-app-deps', { stdio: 'inherit', cwd: rootDir });

  // 2. Copy the rebuilt better-sqlite3 to the standalone directory
  const rootSqlite = path.join(rootDir, 'node_modules', 'better-sqlite3');
  const standaloneSqlite = path.join(rootDir, '.next', 'standalone', 'node_modules', 'better-sqlite3');
  
  if (fs.existsSync(rootSqlite)) {
    console.log('Copying rebuilt better-sqlite3 to standalone node_modules...');
    fs.rmSync(standaloneSqlite, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(standaloneSqlite), { recursive: true });
    fs.cpSync(rootSqlite, standaloneSqlite, { recursive: true });
  } else {
    console.log('Warning: better-sqlite3 not found in root node_modules.');
  }

  // 3. Temporarily remove dependencies to avoid electron-builder OOM
  console.log('Stripping dependencies from package.json...');
  const tempPkg = { ...pkg };
  tempPkg.dependencies = {};

  fs.writeFileSync(pkgPath, JSON.stringify(tempPkg, null, 2));

  try {
    // 4. Run electron-builder build
    console.log('Running electron-builder build...');
    const args = process.argv.slice(2).join(' '); // pass through arguments like --publish always
    execSync(`npx electron-builder ${args}`, { stdio: 'inherit', cwd: rootDir });
  } catch (err) {
    console.error('electron-builder failed:', err);
    process.exitCode = 1;
  } finally {
    // 5. Restore package.json
    console.log('Restoring package.json...');
    fs.writeFileSync(pkgPath, pkgStr);
  }
}

run();
