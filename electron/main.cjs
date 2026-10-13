const { app, BrowserWindow, globalShortcut, Menu } = require("electron");
const path = require("node:path");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 780,
    minWidth: 440,
    minHeight: 620,
    backgroundColor: "#f7f2e8",
    title: "사계농가 위젯",
    autoHideMenuBar: true,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "..", "widget-dist", "index.html"));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require("electron").shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  globalShortcut.register("CommandOrControl+Shift+T", () => {
    if (mainWindow) mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop());
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => globalShortcut.unregisterAll());
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
