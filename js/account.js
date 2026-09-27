const ACCOUNT_STORAGE_KEY = 'sunuagri_users';
const ACCOUNT_SESSION_KEY = 'sunuagri_current_user';
const FORUM_STORAGE_KEY = 'sunuagri_forum';
const ACCOUNT_CATEGORIES = ['vendeur_standard', 'vendeur_premium', 'acheteur_standard', 'acheteur_premium'];
const STANDARD_CATEGORIES = ['vendeur_standard', 'acheteur_standard'];
const CATEGORY_LABELS = {
    vendeur_standard: 'Vendeur standard',
    vendeur_premium: 'Vendeur premium',
    acheteur_standard: 'Acheteur standard',
    acheteur_premium: 'Acheteur premium'
};

function readLocalUsers() {
    try {
        const users = JSON.parse(localStorage.getItem(ACCOUNT_STORAGE_KEY) || '[]');
        return Array.isArray(users) ? users.filter(user => user && typeof user.phone === 'string' && ACCOUNT_CATEGORIES.includes(user.category)) : [];
    } catch {
        return [];
    }
}

function getCurrentAccount() {
    const phone = localStorage.getItem(ACCOUNT_SESSION_KEY);
    return phone && readLocalUsers().find(user => user.phone === phone) || null;
}

function isPremiumAccount(user = getCurrentAccount()) {
    return Boolean(user && user.category.endsWith('_premium') && user.premiumSince);
}

function canSell(user = getCurrentAccount()) {
    return !user || user.category.startsWith('vendeur_');
}

function setupAccount() {
    const panel = document.getElementById('account-panel');
    const toggle = document.getElementById('account-toggle');
    const close = document.getElementById('account-close');
    const authView = document.getElementById('account-auth-view');
    const profileView = document.getElementById('account-profile-view');
    const loginForm = document.getElementById('account-login-form');
    const signupForm = document.getElementById('account-signup-form');
    const profileForm = document.getElementById('account-profile-form');
    const paymentModal = document.getElementById('premium-payment-modal');
    const paymentForm = document.getElementById('premium-payment-form');
    const message = document.getElementById('account-message');
    if (!panel || !toggle || !loginForm || !signupForm || !profileForm || !paymentModal || !paymentForm) return;

    const writeUsers = users => localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(users));

    function showMessage(text, isError = false) {
        message.textContent = text;
        message.classList.toggle('is-error', isError);
    }

    function selectAccountView(view) {
        const signup = view === 'signup';
        loginForm.hidden = signup;
        signupForm.hidden = !signup;
        document.querySelectorAll('[data-account-view]').forEach(tab => {
            const active = tab.dataset.accountView === view;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-selected', String(active));
        });
    }

    function renderPremiumProducts() {
        const container = document.getElementById('premium-products-list');
        if (!container || !window.AGRI_DATA) return;
        container.innerHTML = '';
        AGRI_DATA.products.slice(0, 4).forEach(product => {
            const item = document.createElement('div');
            item.className = 'premium-product-row';
            const name = document.createElement('strong');
            name.textContent = `${product.emoji} ${product.name}`;
            const price = document.createElement('span');
            price.textContent = `${product.basePrice.toLocaleString('fr-FR')} FCFA / ${product.unit}`;
            item.appendChild(name);
            item.appendChild(price);
            container.appendChild(item);
        });
    }

    function renderForum() {
        const list = document.getElementById('forum-messages');
        if (!list) return;
        let messages = [];
        try {
            const saved = JSON.parse(localStorage.getItem(FORUM_STORAGE_KEY) || '[]');
            if (Array.isArray(saved)) messages = saved;
        } catch { /* Ignore invalid local demo data. */ }
        list.innerHTML = '';
        messages.slice(-50).forEach(entry => {
            const item = document.createElement('article');
            item.className = 'forum-message';
            const heading = document.createElement('div');
            heading.className = 'forum-message__meta';
            const timestamp = new Date(entry.time);
            heading.textContent = `${entry.name} · ${Number.isNaN(timestamp.getTime()) ? '' : timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
            const text = document.createElement('p');
            text.textContent = entry.text;
            item.appendChild(heading);
            item.appendChild(text);
            list.appendChild(item);
        });
        if (!messages.length) list.innerHTML = '<p class="forum-empty">Aucun message pour le moment.</p>';
    }

    function setOpen(open) {
        panel.hidden = !open;
        panel.setAttribute('aria-hidden', String(!open));
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Fermer mon compte' : 'Ouvrir mon compte');
        if (open) {
            document.body.classList.add('account-page-open');
            if (window.closeSunuCompagnon) window.closeSunuCompagnon();
            renderAccount();
        } else {
            document.body.classList.remove('account-page-open');
        }
    }

    function renderAccount() {
        const account = getCurrentAccount();
        const signedIn = Boolean(account);
        authView.hidden = signedIn;
        profileView.hidden = !signedIn;
        const categoryBadge = document.getElementById('account-category-badge');
        const premiumBadge = document.getElementById('account-premium-badge');
        categoryBadge.hidden = !signedIn;
        premiumBadge.hidden = !isPremiumAccount(account);
        if (signedIn) {
            categoryBadge.textContent = account.category.startsWith('vendeur_') ? 'Vendeur' : 'Acheteur';
            document.getElementById('account-profile-name').value = account.name;
            document.getElementById('account-profile-phone').value = account.phone;
            document.getElementById('account-profile-category').textContent = CATEGORY_LABELS[account.category];
            const subscribeButton = document.getElementById('account-subscribe');
            const premiumStatus = document.getElementById('account-premium-status');
            const upgradeSection = document.getElementById('account-upgrade-section');
            const isStandard = account.category.endsWith('_standard');
            upgradeSection.hidden = !isStandard;
            document.getElementById('account-upgrade-description').textContent = account.category.startsWith('vendeur_')
                ? 'Vendez vos produits premium et rejoignez la communauté vendeurs.'
                : 'Accédez aux produits premium des vendeurs premium.';
            premiumStatus.hidden = !account.premiumSince;
            premiumStatus.textContent = account.premiumSince
                ? `Abonnement démo actif depuis le ${new Date(account.premiumSince).toLocaleDateString('fr-FR')}. Aucun paiement effectué.`
                : '';
            showMessage('Profil local chargé sur cet appareil.');
        } else {
            localStorage.removeItem(ACCOUNT_SESSION_KEY);
            categoryBadge.textContent = '';
            premiumBadge.hidden = true;
            selectAccountView('login');
            showMessage('Créez un compte local sur cet appareil ou connectez-vous.');
        }
        if (window.applyAccountAccess) window.applyAccountAccess(account);
        renderPremiumProducts();
        renderForum();
    }

    toggle.addEventListener('click', () => setOpen(panel.hidden));
    close.addEventListener('click', () => setOpen(false));
    window.closeAccountPanel = () => setOpen(false);
    document.querySelectorAll('[data-account-view]').forEach(button => {
        button.addEventListener('click', () => {
            selectAccountView(button.dataset.accountView);
            showMessage(button.dataset.accountView === 'signup' ? 'Compte de démonstration enregistré uniquement dans ce navigateur.' : 'Connectez-vous avec votre numéro enregistré sur cet appareil.');
        });
    });

    signupForm.addEventListener('submit', event => {
        event.preventDefault();
        const name = document.getElementById('account-signup-name').value.trim();
        const phone = document.getElementById('account-signup-phone').value.trim();
        const password = document.getElementById('account-signup-password').value;
        const selectedCategory = signupForm.querySelector('input[name="account-category"]:checked');
        const category = selectedCategory && selectedCategory.value;
        if (!name || !phone || !STANDARD_CATEGORIES.includes(category)) return showMessage('Complétez tous les champs et choisissez Vendeur ou Acheteur.', true);
        if (password.length < 8) return showMessage('Choisissez un mot de passe de 8 caractères minimum (démo locale).', true);
        const users = readLocalUsers();
        if (users.some(user => user.phone === phone)) return showMessage('Un compte local existe déjà avec ce numéro.', true);
        const user = { name, phone, password, category, premiumSince: null };
        try {
            users.push(user);
            writeUsers(users);
            localStorage.setItem(ACCOUNT_SESSION_KEY, phone);
            signupForm.reset();
            renderAccount();
            showMessage('Compte standard de démonstration créé et connecté.');
        } catch {
            showMessage('Impossible d’enregistrer le compte local.', true);
        }
    });

    loginForm.addEventListener('submit', event => {
        event.preventDefault();
        const phone = document.getElementById('account-login-phone').value.trim();
        const password = document.getElementById('account-login-password').value;
        const user = readLocalUsers().find(account => account.phone === phone && account.password === password);
        if (!user) return showMessage('Numéro ou mot de passe incorrect.', true);
        localStorage.setItem(ACCOUNT_SESSION_KEY, phone);
        loginForm.reset();
        renderAccount();
    });

    profileForm.addEventListener('submit', event => {
        event.preventDefault();
        const current = getCurrentAccount();
        if (!current) return renderAccount();
        const users = readLocalUsers();
        const user = users.find(account => account.phone === current.phone);
        const newPhone = document.getElementById('account-profile-phone').value.trim();
        if (users.some(account => account.phone === newPhone && account !== user)) return showMessage('Ce numéro est déjà associé à un compte.', true);
        user.name = document.getElementById('account-profile-name').value.trim();
        user.phone = newPhone;
        try {
            writeUsers(users);
            localStorage.setItem(ACCOUNT_SESSION_KEY, newPhone);
            renderAccount();
            showMessage('Profil enregistré sur cet appareil.');
        } catch {
            showMessage('Impossible d’enregistrer le profil local.', true);
        }
    });

    document.getElementById('account-subscribe').addEventListener('click', () => {
        const user = getCurrentAccount();
        if (!user || !user.category.endsWith('_standard')) return;
        document.getElementById('premium-payment-phone').value = user.phone;
        document.getElementById('premium-payment-message').textContent = '';
        paymentModal.classList.add('open');
        paymentModal.setAttribute('aria-hidden', 'false');
        document.getElementById('premium-payment-phone').focus();
    });

    function closePaymentModal() {
        paymentModal.classList.remove('open');
        paymentModal.setAttribute('aria-hidden', 'true');
    }

    document.getElementById('premium-payment-close').addEventListener('click', closePaymentModal);
    paymentModal.addEventListener('click', event => {
        if (event.target === paymentModal) closePaymentModal();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && paymentModal.classList.contains('open')) closePaymentModal();
    });

    paymentForm.addEventListener('submit', event => {
        event.preventDefault();
        const current = getCurrentAccount();
        const paymentPhone = document.getElementById('premium-payment-phone').value.trim();
        const paymentMessage = document.getElementById('premium-payment-message');
        if (!current || !current.category.endsWith('_standard')) {
            paymentMessage.textContent = 'Aucun abonnement standard à mettre à niveau.';
            return;
        }
        if (!paymentPhone) {
            paymentMessage.textContent = 'Saisissez le numéro Mobile Money de démonstration.';
            return;
        }
        const users = readLocalUsers();
        const savedUser = users.find(account => account.phone === current.phone);
        if (!savedUser || !savedUser.category.endsWith('_standard')) return renderAccount();
        savedUser.category = savedUser.category.replace('_standard', '_premium');
        savedUser.premiumSince = new Date().toISOString();
        try {
            writeUsers(users);
            closePaymentModal();
            paymentForm.reset();
            renderAccount();
            showMessage('Abonnement activé (simulation) ✅');
        } catch {
            paymentMessage.textContent = 'Impossible d’enregistrer l’abonnement de démonstration.';
        }
    });

    const forumForm = document.getElementById('forum-form');
    forumForm.addEventListener('submit', event => {
        event.preventDefault();
        const user = getCurrentAccount();
        if (!isPremiumAccount(user)) return showMessage('La communauté est réservée aux comptes Premium actifs.', true);
        const input = document.getElementById('forum-input');
        const text = input.value.trim();
        if (!text) return;
        let messages = [];
        try {
            const saved = JSON.parse(localStorage.getItem(FORUM_STORAGE_KEY) || '[]');
            if (Array.isArray(saved)) messages = saved;
        } catch { /* Start a fresh local forum if storage is invalid. */ }
        messages.push({ name: user.name, time: new Date().toISOString(), text: text.slice(0, 500) });
        try {
            localStorage.setItem(FORUM_STORAGE_KEY, JSON.stringify(messages.slice(-50)));
            input.value = '';
            renderForum();
        } catch {
            showMessage('Impossible d’enregistrer le message dans ce navigateur.', true);
        }
    });

    document.getElementById('account-logout').addEventListener('click', () => {
        localStorage.removeItem(ACCOUNT_SESSION_KEY);
        renderAccount();
    });
    document.getElementById('account-delete').addEventListener('click', () => {
        if (!window.confirm('Supprimer définitivement ce profil de démonstration sur cet appareil ?')) return;
        const user = getCurrentAccount();
        writeUsers(readLocalUsers().filter(account => account.phone !== (user && user.phone)));
        localStorage.removeItem(ACCOUNT_SESSION_KEY);
        renderAccount();
    });

    renderAccount();
}

if (typeof window !== 'undefined') {
    window.getCurrentAccount = getCurrentAccount;
    window.isPremiumAccount = isPremiumAccount;
    window.canSell = canSell;
    window.canUseSalesTools = canSell;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setupAccount, getCurrentAccount, isPremiumAccount, canSell, readLocalUsers };
}
