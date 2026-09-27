const ACCOUNT_STORAGE_KEY = 'sunuagri-local-accounts-v1';
const ACCOUNT_SESSION_KEY = 'sunuagri-local-session-v1';
const PASSWORD_ITERATIONS = 210_000;

function setupAccount() {
    const panel = document.getElementById('account-panel');
    const toggle = document.getElementById('account-toggle');
    const close = document.getElementById('account-close');
    const authView = document.getElementById('account-auth-view');
    const profileView = document.getElementById('account-profile-view');
    const loginForm = document.getElementById('account-login-form');
    const signupForm = document.getElementById('account-signup-form');
    const profileForm = document.getElementById('account-profile-form');
    const message = document.getElementById('account-message');
    if (!panel || !toggle || !loginForm || !signupForm || !profileForm) return;

    const readAccounts = () => {
        try {
            const value = JSON.parse(localStorage.getItem(ACCOUNT_STORAGE_KEY) || '[]');
            return Array.isArray(value) ? value.filter(account => account && typeof account.email === 'string' && typeof account.passwordHash === 'string') : [];
        } catch {
            return [];
        }
    };
    const writeAccounts = accounts => localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
    const encode = bytes => btoa(Array.from(new Uint8Array(bytes), byte => String.fromCharCode(byte)).join(''));
    const decode = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));

    async function hashPassword(password, salt) {
        if (!window.crypto || !window.crypto.subtle) throw new Error('La création de compte nécessite HTTPS ou localhost.');
        const key = await window.crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
        const bits = await window.crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PASSWORD_ITERATIONS, hash: 'SHA-256' }, key, 256);
        return encode(bits);
    }

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
        const email = localStorage.getItem(ACCOUNT_SESSION_KEY);
        const account = email && readAccounts().find(item => item.email === email);
        const signedIn = Boolean(account);
        authView.hidden = signedIn;
        profileView.hidden = !signedIn;
        if (signedIn) {
            document.getElementById('account-profile-name').value = account.name;
            document.getElementById('account-profile-email').value = account.email;
            showMessage('Profil local chargé.');
        } else {
            localStorage.removeItem(ACCOUNT_SESSION_KEY);
            selectAccountView('login');
            showMessage('Créez un profil sur cet appareil ou connectez-vous.');
        }
    }

    toggle.addEventListener('click', () => setOpen(panel.hidden));
    close.addEventListener('click', () => setOpen(false));
    window.closeAccountPanel = () => setOpen(false);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !panel.hidden) setOpen(false);
    });

    document.querySelectorAll('[data-account-view]').forEach(button => {
        button.addEventListener('click', () => {
            const signup = button.dataset.accountView === 'signup';
            selectAccountView(button.dataset.accountView);
            showMessage(signup ? 'Le profil et la connexion restent sur cet appareil.' : 'Connectez-vous avec un profil enregistré sur cet appareil.');
        });
    });

    signupForm.addEventListener('submit', async event => {
        event.preventDefault();
        const name = document.getElementById('account-signup-name').value.trim();
        const email = document.getElementById('account-signup-email').value.trim().toLowerCase();
        const password = document.getElementById('account-signup-password').value;
        const confirmation = document.getElementById('account-signup-confirm').value;
        if (password.length < 8) return showMessage('Choisissez un mot de passe de 8 caractères minimum.', true);
        if (password !== confirmation) return showMessage('Les deux mots de passe ne correspondent pas.', true);

        const accounts = readAccounts();
        if (accounts.some(account => account.email === email)) return showMessage('Un compte local existe déjà avec cette adresse.', true);
        try {
            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            const passwordHash = await hashPassword(password, salt);
            accounts.push({ email, name, salt: encode(salt), passwordHash, createdAt: new Date().toISOString() });
            writeAccounts(accounts);
            localStorage.setItem(ACCOUNT_SESSION_KEY, email);
            signupForm.reset();
            renderAccount();
        } catch (error) {
            showMessage(error.name === 'QuotaExceededError' ? 'Espace local insuffisant pour enregistrer ce profil.' : error.message || 'Impossible de créer le compte local.', true);
        }
    });

    loginForm.addEventListener('submit', async event => {
        event.preventDefault();
        const email = document.getElementById('account-login-email').value.trim().toLowerCase();
        const password = document.getElementById('account-login-password').value;
        const account = readAccounts().find(item => item.email === email);
        if (!account) return showMessage('Aucun compte local trouvé pour cette adresse.', true);
        try {
            const candidate = await hashPassword(password, decode(account.salt));
            if (candidate !== account.passwordHash) return showMessage('Adresse e-mail ou mot de passe incorrect.', true);
            localStorage.setItem(ACCOUNT_SESSION_KEY, email);
            loginForm.reset();
            renderAccount();
        } catch (error) {
            showMessage(error.message || 'Impossible de vérifier ce compte local.', true);
        }
    });

    profileForm.addEventListener('submit', event => {
        event.preventDefault();
        const email = localStorage.getItem(ACCOUNT_SESSION_KEY);
        const accounts = readAccounts();
        const account = accounts.find(item => item.email === email);
        if (!account) return renderAccount();
        account.name = document.getElementById('account-profile-name').value.trim();
        try {
            writeAccounts(accounts);
            showMessage('Profil enregistré sur cet appareil.');
        } catch {
            showMessage('Impossible d’enregistrer le profil local.', true);
        }
    });

    document.getElementById('account-logout').addEventListener('click', () => {
        localStorage.removeItem(ACCOUNT_SESSION_KEY);
        renderAccount();
    });
    document.getElementById('account-delete').addEventListener('click', () => {
        if (!window.confirm('Supprimer définitivement ce profil de cet appareil ?')) return;
        const email = localStorage.getItem(ACCOUNT_SESSION_KEY);
        writeAccounts(readAccounts().filter(account => account.email !== email));
        localStorage.removeItem(ACCOUNT_SESSION_KEY);
        renderAccount();
    });

    renderAccount();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setupAccount };
}
