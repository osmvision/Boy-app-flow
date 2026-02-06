# Script de setup automatisé pour Boy App
# Ce script configure Ollama et lance l'application

Write-Host "🚀 Installation Boy App - Setup automatisé" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Ollama est installé
Write-Host "1️⃣ Vérification d'Ollama..." -ForegroundColor Yellow
try {
    $ollamaVersion = ollama --version
    Write-Host "✅ Ollama trouvé: $ollamaVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Ollama non trouvé. Téléchargement et installation..." -ForegroundColor Red
    
    # Télécharger Ollama
    $ollamaUrl = "https://ollama.ai/download/windows"
    $installerPath = "$env:TEMP\OllamaInstaller.exe"
    
    Write-Host "Téléchargement d'Ollama..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $ollamaUrl -OutFile $installerPath
    
    Write-Host "Installation d'Ollama..." -ForegroundColor Yellow
    & $installerPath
    
    Write-Host "✅ Ollama installé avec succès!" -ForegroundColor Green
    
    # Attendre qu'Ollama termine l'installation
    Start-Sleep -Seconds 5
}

# Lancer le serveur Ollama en background si ce n'est pas déjà fait
Write-Host ""
Write-Host "2️⃣ Vérification du serveur Ollama..." -ForegroundColor Yellow
$ollamaProcess = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
if ($ollamaProcess) {
    Write-Host "✅ Ollama server déjà en cours d'exécution (PID: $($ollamaProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "Démarrage du serveur Ollama..." -ForegroundColor Yellow
    Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    Write-Host "✅ Serveur Ollama lancé" -ForegroundColor Green
}

# Télécharger le modèle Mistral
Write-Host ""
Write-Host "3️⃣ Téléchargement du modèle Mistral..." -ForegroundColor Yellow
Write-Host "Cela peut prendre 10-15 minutes selon votre connexion..." -ForegroundColor Cyan

& ollama pull mistral

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Modèle Mistral téléchargé avec succès!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Erreur lors du téléchargement du modèle" -ForegroundColor Red
}

# Installer les dépendances npm
Write-Host ""
Write-Host "4️⃣ Installation des dépendances npm..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dépendances installées!" -ForegroundColor Green
} else {
    Write-Host "❌ Erreur lors de l'installation des dépendances" -ForegroundColor Red
    exit 1
}

# Lancer l'application
Write-Host ""
Write-Host "5️⃣ Lancement de l'application..." -ForegroundColor Yellow
npm run dev

Write-Host ""
Write-Host "✅ Setup terminé! L'application est prête à être utilisée." -ForegroundColor Green
