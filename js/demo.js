/**
 * demo.js — Thème et installation PWA de SunuAgri IA.
 */

function setupTheme() {
    const btn = document.getElementById('btn-theme');
    const saved = localStorage.getItem('sunuagri-theme') || 'light';
    applyTheme(saved);

    if (btn) {
        btn.addEventListener('click', () => {
            const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            localStorage.setItem('sunuagri-theme', next);
        });
    }

    function applyTheme(t) {
        document.documentElement.dataset.theme = t;
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            themeIcon.setAttribute('data-lucide', t === 'dark' ? 'sun' : 'moon');
        }
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
        if (AppState.lastResult && typeof renderForecastChart === 'function') {
            renderForecastChart(AppState.lastResult.curve, AppState.lastResult.bestDay);
        }
    }
}

function setupInstallPrompt() {
    const btn = document.getElementById('btn-install');
    if (!btn) return;

    const installed = Boolean((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        (window.navigator && window.navigator.standalone));
    btn.hidden = installed;
    if (installed) return;

    let installEvent = null;
    window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault();
        installEvent = event;
        btn.hidden = false;
    });

    btn.addEventListener('click', async () => {
        if (!installEvent) {
            showToast('Utilisez le menu du navigateur : « Installer l’application » ou « Ajouter à l’écran d’accueil ».', 5000);
            return;
        }
        await installEvent.prompt();
        const choice = await installEvent.userChoice;
        installEvent = null;
        if (choice.outcome === 'accepted') showToast('SunuAgri IA est en cours d’installation.');
    });

    window.addEventListener('appinstalled', () => {
        installEvent = null;
        btn.hidden = true;
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setupTheme, setupInstallPrompt };
}
