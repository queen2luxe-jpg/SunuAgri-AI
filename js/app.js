/**
 * app.js — SunuAgri IA
 * Point d'entrée principal : initialisation et coordination des différents modules.
 */

function initApp() {
    if (window.navigator && window.navigator.serviceWorker && window.location && /^https?:$/.test(window.location.protocol)) {
        window.navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Service worker indisponible :', error));
    }

    // 1. Utilitaires
    if (typeof populateSelects === 'function') populateSelects();

    // 2. Navigation
    if (typeof setupNav === 'function') setupNav();

    // 3. Modules fonctionnels
    if (typeof setupPrediction === 'function') setupPrediction();
    if (typeof setupMarketsTab === 'function') setupMarketsTab();
    if (typeof setupMarketplace === 'function') setupMarketplace();
    if (typeof setupChat === 'function') setupChat();

    // 4. Thème et installation PWA
    if (typeof setupTheme === 'function') setupTheme();
    if (typeof setupInstallPrompt === 'function') setupInstallPrompt();
    if (typeof setupAccount === 'function') setupAccount();

    // 5. Première prédiction automatique pour afficher des données dès l'ouverture
    if (typeof runPrediction === 'function') runPrediction();

    // 6. Rendu des icônes Lucide
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }

    // 7. Préchauffage des voix de synthèse vocale du navigateur
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.getVoices();
        };
    }
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initApp);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initApp };
}
