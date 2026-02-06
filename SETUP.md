# 🚀 Setup Boy App

## Installation automatisée (Recommandé)

### Windows
Ouvrez PowerShell **en administrateur** dans le dossier du projet et lancez :

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\setup.ps1
```

Le script va automatiquement :
1. ✅ Vérifier/installer Ollama
2. ✅ Télécharger le modèle Mistral (~4GB)
3. ✅ Installer les dépendances npm
4. ✅ Lancer l'application

## Installation manuelle (Si le script ne fonctionne pas)

### 1. Installer Ollama
- Allez sur [ollama.ai](https://ollama.ai)
- Téléchargez et installez

### 2. Démarrer le serveur Ollama
```bash
ollama serve
```

### 3. Télécharger le modèle (dans un nouveau terminal)
```bash
ollama pull mistral
```

### 4. Installer les dépendances
```bash
npm install
```

### 5. Lancer l'application
```bash
npm run dev
```

## ⚠️ Utilisation

**Important** : Ollama doit être en cours d'exécution dans un terminal avant de lancer l'app !

Pour vérifier que tout fonctionne :
```bash
ollama list
```
Vous devriez voir `mistral` dans la liste.

## 🛠️ Configuration

- **Modèle** : Mistral (peut être changé dans `src/main/index.ts`)
- **URL Ollama** : `http://localhost:11434` (configurable dans `.env`)
- **Gratuit** : Entièrement local, aucune limite de quota

## 📝 Notes

- Première utilisation du modèle peut être lente (chargement en mémoire)
- Besoin de ~8GB de RAM pour Mistral
- L'app fonctionne **offline** une fois Ollama lancé
