import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join, dirname } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { promises as fs } from 'fs';
import { config } from 'dotenv'

// Charger les variables d'environnement depuis .env
config()

// URL Ollama (serveur local)
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || "http://localhost:11434"
const OLLAMA_MODEL = "mistral"  // Ou "neural-chat" pour plus léger

// Définir le chemin de sauvegarde (Dans le dossier utilisateur AppData)
const DB_PATH = join(app.getPath('userData'), 'flow-db.json');

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => { mainWindow.show() })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('ask-gemini', async (_, prompt: string) => {
    try {
      console.log("Appel à Ollama...");
      
      const response = await fetch(`${OLLAMA_API_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [
            { role: 'user', content: prompt }
          ],
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error:", errorText);
        throw new Error(`Ollama Error: ${response.status} - Assurez-vous que Ollama est lancé avec 'ollama serve'`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error: any) {
      console.error("ERREUR:", error);
      return "Erreur : " + error.message;
    }
  })

  // SAUVEGARDE RENFORCÉE
  ipcMain.handle('save-data', async (_, data) => {
    try {
      // ÉTAPE CRUCIALE : On vérifie si le dossier existe, sinon on le crée
      const folder = dirname(DB_PATH);
      await fs.mkdir(folder, { recursive: true });
      
      // On écrit le fichier
      await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
      console.log("Sauvegarde réussie dans :", DB_PATH);
      return { success: true };
    } catch (e) {
      console.error("ERREUR SAUVEGARDE:", e);
      return { success: false };
    }
  });

  // CHARGEMENT
  ipcMain.handle('load-data', async () => {
    try {
      const data = await fs.readFile(DB_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      // Si le fichier n'existe pas, on renvoie null pour que le frontend le sache
      return null;
    }
  });

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})