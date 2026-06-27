// Configuração do Metro (Expo) — garante que arquivos de áudio entrem no bundle.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Áudio das narrações embarcadas (assets/audio/*.mp3).
if (!config.resolver.assetExts.includes('mp3')) {
  config.resolver.assetExts.push('mp3');
}

module.exports = config;
