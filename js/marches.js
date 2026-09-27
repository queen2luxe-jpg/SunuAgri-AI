/**
 * marches.js — SunuAgri IA
 * Observatoire des marchés sénégalais : cotations en direct, recherche et filtres par filière.
 *
 * Dépend de : utils.js (AGRI_DATA, AppState)
 */

function setupMarketsTab() {
    renderMarketChips();
    renderMarketList();

    const search = document.getElementById('market-search-input');
    if (search) {
        search.addEventListener('input', () => renderMarketList());
    }

    document.querySelectorAll('.sort-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.sort-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            AppState.marketSortMode = chip.dataset.sort;
            renderMarketList();
        });
    });
}

function renderMarketChips() {
    const c = document.getElementById('market-chips');
    if (!c) return;
    c.innerHTML = '';
    AGRI_DATA.products.forEach(p => {
        const chip = document.createElement('button');
        chip.className = `filter-chip${p.id === AppState.activeFilter ? ' active' : ''}`;
        chip.textContent = `${p.emoji} ${p.name.split(' ')[0]}`;
        chip.addEventListener('click', () => {
            AppState.activeFilter = p.id;
            renderMarketChips();
            renderMarketList();
        });
        c.appendChild(chip);
    });
}

function renderMarketList() {
    const c = document.getElementById('markets-list');
    if (!c) return;
    c.innerHTML = '';
    const prod = AGRI_DATA.products.find(p => p.id === AppState.activeFilter);
    if (!prod) return;
    const q = (document.getElementById('market-search-input')?.value || '').toLowerCase().trim();

    let list = [...AGRI_DATA.markets].map(m => {
        const price = Math.round(prod.basePrice * m.demandBonus);
        return { ...m, currentPrice: price };
    });

    if (q) {
        list = list.filter(m =>
            m.name.toLowerCase().includes(q) ||
            m.city.toLowerCase().includes(q) ||
            m.type.toLowerCase().includes(q)
        );
    }

    if (AppState.marketSortMode === 'price-desc') {
        list.sort((a, b) => b.currentPrice - a.currentPrice);
    } else if (AppState.marketSortMode === 'price-asc') {
        list.sort((a, b) => a.currentPrice - b.currentPrice);
    } else {
        list.sort((a, b) => b.demandBonus - a.demandBonus);
    }

    if (!list.length) {
        c.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">Aucun marché trouvé</div><div class="empty-sub">Essayez un autre mot-clé (ex: Castors, Dakar, Touba)</div></div>';
        return;
    }

    list.forEach(m => {
        const hot = m.demandBonus >= 1.18;
        const card = document.createElement('div');
        card.className = 'market-card';
        card.innerHTML = `<div class="market-info"><div class="market-name">${m.name}</div><div class="market-meta">${m.city} · ${m.type}</div><div class="market-tags">${m.tags.map(t => `<span class="market-tag">${t}</span>`).join('')}</div></div><div class="market-price-col"><div class="market-unit">${prod.unit}</div><div class="market-price">${m.currentPrice.toLocaleString('fr-FR')} FCFA</div><span class="trend-badge ${hot ? 'up' : 'stable'}">${hot ? '↑ Très Recherché' : '→ Stable'}</span></div>`;
        c.appendChild(card);
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setupMarketsTab, renderMarketChips, renderMarketList };
}
