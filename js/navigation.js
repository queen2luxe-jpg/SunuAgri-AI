/**
 * navigation.js — SunuAgri IA
 * Gestion de la navigation entre les onglets et les vues de l'application.
 */

function setupNav() {
    const navBtns = document.querySelectorAll('.nav-item[data-tab]');
    const panes = document.querySelectorAll('.tab-pane');

    function applyAccountAccess(account = window.getCurrentAccount && window.getCurrentAccount()) {
        const buyer = Boolean(account && account.category.startsWith('acheteur'));
        const premium = Boolean(window.isPremiumAccount && window.isPremiumAccount(account));
        document.querySelectorAll('[data-seller-only]').forEach(element => { element.hidden = buyer; });
        document.querySelectorAll('[data-premium-only]').forEach(element => { element.hidden = !premium; });

        const title = document.getElementById('marketplace-hero-title');
        const subtitle = document.getElementById('marketplace-hero-subtitle');
        const featureDescription = document.getElementById('marketplace-feature-desc');
        if (title) title.textContent = buyer ? 'Parcourez les annonces' : 'Vendez sans intermédiaire';
        if (subtitle) subtitle.textContent = buyer ? 'Contact direct avec les producteurs' : 'Contact direct par WhatsApp en 1 clic';
        if (featureDescription) featureDescription.textContent = buyer ? 'Parcourir les annonces' : 'Vendre sans intermédiaire';

        const hiddenActivePane = Array.from(panes).find(pane => pane.classList.contains('active') && pane.hidden);
        if (hiddenActivePane) switchTab('tab-home');
    }

    function switchTab(id) {
        const target = document.getElementById(id);
        if (!target || target.hidden) return;
        const account = window.getCurrentAccount && window.getCurrentAccount();
        if (id === 'tab-predict' && account && account.category.startsWith('acheteur')) return;
        if (id === 'tab-premium' && !(window.isPremiumAccount && window.isPremiumAccount(account))) return;
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
    window.applyAccountAccess = applyAccountAccess;
    applyAccountAccess();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setupNav };
}
