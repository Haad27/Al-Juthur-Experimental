const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const isDev = !app.isPackaged;

let mainWindow;
let nextProcess;

async function startNextServer() {
  if (isDev) {
    // In dev, next is started by concurrently. We just return the default dev port.
    return 'http://localhost:3000';
  } else {
    // In prod, start the standalone Next.js server
    return new Promise(async (resolve, reject) => {
      try {
        // dynamic import of get-port because it's esm
        const getPort = await import('get-port');
        const port = await getPort.default({ port: 3000 });
        
        // When packaged by electron-builder with 'asar: false' or extraResources,
        // the Next.js standalone app will be located relatively to process.resourcesPath.
        // We will configure electron-builder to copy the build to 'app/standalone'.
        const serverPath = path.join(__dirname, '..', 'standalone', 'server.js');
        const prodServerPath = path.join(process.resourcesPath, 'standalone', 'server.js');
        
        const finalServerPath = fs.existsSync(prodServerPath) ? prodServerPath : serverPath;

        if (!fs.existsSync(finalServerPath)) {
          console.error(`Next.js standalone server not found at: ${finalServerPath}`);
          reject(new Error("Next.js standalone server not found"));
          return;
        }

        nextProcess = spawn(process.execPath, [finalServerPath], {
          env: {
            ...process.env,
            NODE_ENV: 'production',
            PORT: port.toString(),
            HOSTNAME: '127.0.0.1'
          },
          stdio: 'inherit'
        });

        // Wait a small delay to ensure server listens before loading URL
        setTimeout(() => {
          resolve(`http://127.0.0.1:${port}`);
        }, 1500);

      } catch (err) {
        console.error("Error starting next server:", err);
        reject(err);
      }
    });
  }
}

async function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  await mainWindow.loadURL(url);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(async () => {
  const url = await startNextServer();
  createWindow(url);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(url);
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (nextProcess) {
    nextProcess.kill();
  }
});
