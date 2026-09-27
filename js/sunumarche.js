/**
 * sunumarche.js — SunuAgri IA
 * Place de marché SunuMarché : annonces de récoltes, mise en relation directe WhatsApp sans bana-bana.
 *
 * Dépend de : utils.js (AGRI_DATA, AppState, showToast)
 */

function setupMarketplace() {
    const modal = document.getElementById('modal-sell');
    const openBtn = document.getElementById('btn-open-modal');
    const closeBtn = document.getElementById('close-modal');

    if (openBtn && modal) {
        openBtn.addEventListener('click', () => {
            if (window.canSell && !window.canSell()) return;
            modal.classList.add('open');
        });
    }
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => modal.classList.remove('open'));
    }
    if (modal) {
        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
    }

    // Filtres par catégorie
    document.querySelectorAll('#mp-chips .filter-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#mp-chips .filter-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.activeMpFilter = btn.dataset.mpFilter;
            renderListings();
        });
    });

    // Recherche dans les annonces
    const mpSearch = document.getElementById('mp-search-input');
    if (mpSearch) {
        mpSearch.addEventListener('input', () => renderListings());
    }

    // Soumission du formulaire d'annonce
    const form = document.getElementById('sell-form');
    if (form) {
        form.addEventListener('submit', e => {
            e.preventDefault();
            if (window.canSell && !window.canSell()) return;
            const err = document.getElementById('form-error');
            if (err) err.style.display = 'none';

            const name = document.getElementById('seller-name').value.trim();
            const phone = document.getElementById('seller-phone').value.trim();
            const product = document.getElementById('seller-product').value;
            const qty = document.getElementById('seller-qty').value.trim();
            const price = parseInt(document.getElementById('seller-price').value);
            const loc = document.getElementById('seller-loc').value.trim();

            if (!name || !phone || !qty || isNaN(price) || price < 100 || !loc) {
                if (err) {
                    err.textContent = '⚠️ Veuillez remplir tous les champs correctement.';
                    err.style.display = 'block';
                }
                return;
            }

            if (!window.confirm('Confirmez-vous la publication de cette annonce sur SunuMarché ?')) return;

            const prod = AGRI_DATA.products.find(p => p.id === product);
            AGRI_DATA.listings.unshift({
                id: 'L' + Date.now().toString().slice(-5),
                sellerName: name,
                sellerPhone: phone.startsWith('+') ? phone : '+221' + phone.replace(/\D/g, ''),
                product,
                quantity: qty,
                pricePerUnit: price,
                location: loc,
                verified: false,
                badge: 'Nouveau lot',
                image: prod ? prod.emoji : '📦'
            });

            renderListings();
            form.reset();
            if (modal) modal.classList.remove('open');
            if (window.switchTab) window.switchTab('tab-marketplace');
            showToast('✅ Votre récolte a été mise en ligne sur SunuMarché !');
        });
    }

    document.addEventListener('click', event => {
        const link = event.target.closest('.wa-btn');
        if (link && !window.confirm('Ouvrir WhatsApp avec le vendeur ? Le message restera à vérifier et à envoyer dans WhatsApp.')) {
            event.preventDefault();
        }
    });

    renderListings();
}

function renderListings() {
    const c = document.getElementById('listings-container');
    if (!c) return;
    c.innerHTML = '';
    const q = (document.getElementById('mp-search-input')?.value || '').toLowerCase().trim();

    let filtered = AGRI_DATA.listings;
    if (AppState.activeMpFilter !== 'all') {
        filtered = filtered.filter(l => l.product === AppState.activeMpFilter);
    }
    if (q) {
        filtered = filtered.filter(l =>
            l.sellerName.toLowerCase().includes(q) ||
            l.location.toLowerCase().includes(q) ||
            l.quantity.toLowerCase().includes(q)
        );
    }

    if (!filtered.length) {
        const emptyHint = window.canSell && !window.canSell()
            ? 'Essayez un autre filtre ou une autre localité.'
            : 'Soyez le premier à publier votre récolte !';
        c.innerHTML = `<div class="empty-state"><div class="empty-icon">🌾</div><div class="empty-text">Aucune annonce trouvée</div><div class="empty-sub">${emptyHint}</div></div>`;
        return;
    }

    filtered.forEach(l => {
        const prod = AGRI_DATA.products.find(p => p.id === l.product);
        const pn = prod ? prod.name : l.product;
        const clean = l.sellerPhone.replace(/\D/g, '');
        const msg = encodeURIComponent(`Salam Alaykoum ${l.sellerName} ! J'ai vu votre offre sur SunuAgri IA pour ${l.quantity} de ${pn} à ${l.pricePerUnit.toLocaleString('fr-FR')} FCFA. Est-ce toujours disponible ?`);
        const card = document.createElement('div');
        card.className = 'listing-card';
        card.innerHTML = `<div class="listing-top"><div class="listing-product"><div class="listing-emoji">${l.image}</div><div><div class="listing-name">${pn}</div><div class="listing-meta">${l.quantity} · ${l.location}</div><span class="listing-badge">${l.badge}</span></div></div><div style="text-align:right;"><div class="listing-price">${l.pricePerUnit.toLocaleString('fr-FR')}</div><div class="listing-unit">FCFA / unité</div></div></div><div class="listing-bottom"><div><div class="listing-seller">${l.sellerName}</div>${l.verified ? '<span class="verified-badge">✓ Vérifié</span>' : ''}</div><a href="https://wa.me/${clean}?text=${msg}" target="_blank" rel="noopener noreferrer" class="wa-btn"><i data-lucide="message-circle" style="width:14px;height:14px;"></i> WhatsApp</a></div>`;
        c.appendChild(card);
    });

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setupMarketplace, renderListings };
}
