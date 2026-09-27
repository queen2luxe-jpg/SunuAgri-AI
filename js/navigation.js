/**
 * navigation.js — SunuAgri IA
 * Gestion de la navigation entre les onglets et les vues de l'application.
 */

function setupNav() {
    const navBtns = document.querySelectorAll('.nav-item[data-tab]');
    const panes = document.querySelectorAll('.tab-pane');

    function switchTab(id) {
        navBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === id));
        panes.forEach(p => p.classList.toggle('active', p.id === id));
        const appScreen = document.getElementById('app-screen');
        if (appScreen) appScreen.scrollTop = 0;
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }

    navBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    document.querySelectorAll('.feat-card[data-nav]').forEach(c => {
        c.addEventListener('click', () => switchTab(c.dataset.nav));
        c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') switchTab(c.dataset.nav); });
    });

    window.switchTab = switchTab;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setupNav };
}
