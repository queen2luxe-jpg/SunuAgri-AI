/**
 * vente.js — SunuAgri IA
 * Module IA Vente : calculs d'optimisation, rendu UI des résultats,
 * prévision graphique (Chart.js), synthèse vocale multilingue.
 *
 * Dépend de : utils.js (AGRI_DATA, AppState, showToast)
 */

// ================================================================
// FONCTIONS DE CALCUL (Business Logic)
// ================================================================

/**
 * Calcule le coût de transport (CFA) en fonction de la distance et du poids.
 * @param {number} distKm
 * @param {number} weightKg
 * @returns {number}
 */
function calcTransport(distKm, weightKg) {
    if (distKm <= 15) return Math.round(3000 + weightKg * 1.5);
    return Math.round(distKm * weightKg * 0.135 + 5000);
}

/**
 * Génère une courbe prévisionnelle prix/jour pour un produit et un marché donnés.
 * @param {Object} product
 * @param {Object} market
 * @returns {Array}
 */
function genCurve(product, market) {
    const days = [0, 3, 7, 10, 14, 18, 21, 25, 30];
    const base = Math.round(product.basePrice * market.demandBonus);
    const peakMap = {
        oignon: { day: 14, factor: 1.25 },
        tomate: { day: 8,  factor: 1.20 },
        arachide: { day: 22, factor: 1.15 },
        mangue: { day: 6,  factor: 1.14 }
    };
    const peak = peakMap[product.id] || { day: 12, factor: 1.18 };
    return days.map(day => {
        const g = day <= peak.day
            ? 1 + (peak.factor - 1) * (day / peak.day)
            : peak.factor - (day - peak.day) * 0.015;
        return {
            day,
            label: day === 0 ? 'Auj.' : `+${day}j`,
            projectedPrice: Math.round(base * g),
            effectiveValueFactor: 1 - Math.min((day / 7) * product.lossRiskPerWeek, 0.4)
        };
    });
}

/**
 * Calcule la stratégie de vente optimale toutes marchés confondus.
 * @param {string} productId
 * @param {number} qty
 * @param {string} region
 * @returns {Object|null}
 */
function optimizeSale(productId, qty, region) {
    const product = AGRI_DATA.products.find(p => p.id === productId);
    if (!product) return null;
    const totalKg = qty * product.unitWeightKg;

    const ev = AGRI_DATA.markets.map(market => {
        const dist = market.distancesKm[region] || 150;
        const tCost = calcTransport(dist, totalKg);
        const curve = genCurve(product, market);
        const curNet = curve[0].projectedPrice * qty - tCost;
        let bestIdx = 0, bestNet = curNet;
        curve.forEach((pt, i) => {
            const n = pt.projectedPrice * qty * pt.effectiveValueFactor - tCost;
            if (n > bestNet) { bestNet = n; bestIdx = i; }
        });
        const best = curve[bestIdx];
        return { market, dist, tCost, curNet, bestDay: best.day, bestPrice: best.projectedPrice, bestNet: Math.round(bestNet), curve };
    });

    ev.sort((a, b) => b.bestNet - a.bestNet);
    const top = ev[0];
    const local = ev.reduce((m, c) => c.dist < m.dist ? c : m, ev[0]);
    const baseline = local.curNet;
    const extra = Math.max(0, top.bestNet - baseline);
    const pct = baseline > 0 ? Math.round(extra / baseline * 100) : 0;

    const td = new Date(); td.setDate(td.getDate() + top.bestDay);
    const dateFr = td.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const dateEn = td.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const speechTexts = {
        fr: top.bestDay === 0
            ? `Salam Alaykoum ! D'après SunuAgri IA, vendez dès aujourd'hui vos ${qty} unités au ${top.market.name}. Les cours sont au plus haut !`
            : `Salam Alaykoum ! Conseil SunuAgri IA : attendez ${top.bestDay} jours jusqu'au ${dateFr}. En vendant au ${top.market.name}, vous gagnerez environ ${extra.toLocaleString('fr-FR')} Francs CFA supplémentaires !`,
        wo: top.bestDay === 0
            ? `Salam Alaykoum ! SunuAgri IA : jaayal tey jii sa meññeef ca ${top.market.name}. Jamono bii la prix bi gënë baax !`
            : `Salam Alaykoum ! SunuAgri IA : bul jaay tey. Xaaral ${top.bestDay} fan ba ${dateFr}. Soo ko jaayee ca ${top.market.name}, danga am bénéfice bu tollu ci ${extra.toLocaleString('fr-FR')} Francs CFA !`,
        en: top.bestDay === 0
            ? `Hello! SunuAgri AI advises you to sell your ${qty} units at ${top.market.name} today. Prices are at their peak!`
            : `Hello! SunuAgri AI advice: Wait ${top.bestDay} days until ${dateEn}. Selling at ${top.market.name} will give you an extra ${extra.toLocaleString('fr-FR')} CFA Francs!`
    };
    const headlines = {
        fr: `Vendre au ${top.market.name} — ${top.bestDay === 0 ? "Aujourd'hui" : top.bestDay + ' jours'}`,
        wo: `Jaay ca ${top.market.name} — ${top.bestDay === 0 ? 'Tey jii' : top.bestDay + ' fan'}`,
        en: `Sell at ${top.market.name} — ${top.bestDay === 0 ? 'Today' : top.bestDay + ' days'}`
    };
    const storageTips = {
        fr: product.shelfLifeDays <= 14
            ? "⚠️ Denrée très fragile : stockez à l'ombre totale, transportez tôt le matin ou de nuit."
            : "💡 Bon potentiel de garde : surélevez les sacs sur palettes en bois, protégez de l'humidité.",
        wo: product.shelfLifeDays <= 14
            ? "⚠️ Meññeef mu gaawe yàqu : dencal ci ker gi bu ko tëj ci tangoor, te nga yóbbu ko ci suba tél."
            : "💡 Denc ko bu baax : tegal saag yi ci palet u bant ngir bañ mu tooy.",
        en: product.shelfLifeDays <= 14
            ? "⚠️ Highly perishable: Store in full shade, transport early morning or overnight."
            : "💡 Good storage: Elevate bags on wooden pallets away from moisture."
    };

    return { product, qty, allMarkets: ev, bestMarket: top.market, bestDay: top.bestDay, dateFr, recommendedPrice: top.bestPrice, optimalNet: top.bestNet, baseline, extra, pct, tCost: top.tCost, dist: top.dist, totalKg, curve: top.curve, headlines, speechTexts, storageTips };
}

// ================================================================
// UI — MISE À JOUR DES RÉSULTATS
// ================================================================

function runPrediction() {
    const pEl = document.getElementById('input-product');
    let pid = (pEl && pEl.value) || 'oignon';
    if (!AGRI_DATA.products.some(p => p.id === pid)) pid = 'oignon';
    const qEl = document.getElementById('input-quantity');
    const qty = Math.max(1, parseInt(qEl ? qEl.value : 50) || 50);
    const rEl = document.getElementById('input-region');
    const reg = (rEl && rEl.value) || 'Saint-Louis';
    const btn = document.getElementById('btn-run-prediction');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>Calcul en cours...</span>';
    }
    setTimeout(() => {
        AppState.lastResult = optimizeSale(pid, qty, reg);
        if (AppState.lastResult) {
            updateResultUI();
            renderMarketCompare();
            renderForecastChart(AppState.lastResult.curve, AppState.lastResult.bestDay);
        }
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="sparkles" style="width:16px;height:16px;"></i><span>Lancer l\'Analyse IA</span>';
        }
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }, 350);
}

function updateResultUI() {
    if (!AppState.lastResult) return;
    const r = AppState.lastResult;
    const L = AppState.currentLang;
    document.getElementById('res-headline').textContent = r.headlines[L];
    document.getElementById('res-extra-profit').textContent = `+${r.extra.toLocaleString('fr-FR')} FCFA`;
    document.getElementById('res-profit-percent').textContent = `+${r.pct}% de marge`;
    document.getElementById('res-best-date').textContent = r.dateFr;
    document.getElementById('res-wait-days').textContent = r.bestDay === 0 ? "Aujourd'hui ✅" : `Dans ${r.bestDay} jours`;
    document.getElementById('res-unit-price').textContent = `${r.recommendedPrice.toLocaleString('fr-FR')} FCFA / ${r.product.unit}`;
    document.getElementById('res-net-revenue').textContent = `${r.optimalNet.toLocaleString('fr-FR')} FCFA`;
    document.getElementById('res-transport-cost').textContent = `-${r.tCost.toLocaleString('fr-FR')} FCFA (${r.dist} km)`;
    document.getElementById('res-baseline-price').textContent = `${r.baseline.toLocaleString('fr-FR')} FCFA`;
    document.getElementById('res-storage-tip').textContent = r.storageTips[L];

    const distEl = document.getElementById('calc-dist');
    const tonnEl = document.getElementById('calc-tonnage');
    if (distEl) distEl.textContent = `${r.dist} km`;
    if (tonnEl) tonnEl.textContent = `${(r.totalKg / 1000).toFixed(1)} tonne${r.totalKg >= 2000 ? 's' : ''} (${r.qty} ${r.product.unit})`;

    const vl = { fr: 'Écouter en Français 🇫🇷', wo: 'Déglu ci Wolof 🇸🇳', en: 'Listen in English 🇬🇧' };
    document.getElementById('voice-action-label').textContent = vl[L];
    document.getElementById('lang-badge').textContent = L.toUpperCase();
    document.getElementById('voice-preview').textContent = `"${r.speechTexts[L].slice(0, 68)}..."`;
}

function renderMarketCompare() {
    if (!AppState.lastResult) return;
    const c = document.getElementById('market-compare-list');
    c.innerHTML = '';
    AppState.lastResult.allMarkets.slice(0, 6).forEach((item, i) => {
        const d = document.createElement('div');
        d.className = `compare-item${i === 0 ? ' best' : ''}`;
        d.innerHTML = `<div><div class="compare-name">${i === 0 ? '🥇 ' : ''}${item.market.name}</div><div class="compare-dist">${item.dist} km · ${item.market.type}</div></div><div style="display:flex;align-items:center;gap:6px;"><div class="compare-price">${item.bestNet.toLocaleString('fr-FR')} FCFA</div>${i === 0 ? '<span class="compare-badge">Optimal</span>' : ''}</div>`;
        c.appendChild(d);
    });
}

function renderForecastChart(curve, bestDay) {
    const ctx = document.getElementById('forecastChart');
    if (!ctx) return;
    if (AppState.forecastChart) AppState.forecastChart.destroy();
    const dark = document.documentElement.dataset.theme === 'dark';
    AppState.forecastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: curve.map(c => c.label),
            datasets: [{
                label: 'Prix Prévisionnel (FCFA)',
                data: curve.map(c => c.projectedPrice),
                borderColor: '#059669',
                backgroundColor: dark ? 'rgba(5,150,105,.1)' : 'rgba(5,150,105,.07)',
                fill: true, tension: .38,
                pointBackgroundColor: curve.map(c => c.day === bestDay ? '#f59e0b' : '#10b981'),
                pointBorderColor: dark ? '#1e293b' : '#fff',
                pointBorderWidth: 2,
                pointRadius: curve.map(c => c.day === bestDay ? 8 : 4)
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.parsed.y.toLocaleString('fr-FR')} FCFA` } } },
            scales: {
                y: { grid: { color: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)' }, ticks: { color: dark ? '#64748b' : '#94a3b8', font: { size: 10 }, callback: v => `${(v / 1000).toFixed(0)}k` } },
                x: { grid: { display: false }, ticks: { color: dark ? '#64748b' : '#94a3b8', font: { size: 9 } } }
            }
        }
    });
}

function toggleSpeech() {
    const wave = document.getElementById('audio-wave');
    if (!('speechSynthesis' in window)) { alert('Synthèse vocale non supportée par votre navigateur.'); return; }
    if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); wave.style.display = 'none'; return; }
    if (!AppState.lastResult) return;
    const utt = new SpeechSynthesisUtterance(AppState.lastResult.speechTexts[AppState.currentLang]);
    const voices = window.speechSynthesis.getVoices();
    if (AppState.currentLang === 'en') { utt.lang = 'en-US'; const v = voices.find(v => v.lang.startsWith('en')); if (v) utt.voice = v; }
    else if (AppState.currentLang === 'wo') { utt.lang = 'fr-SN'; utt.rate = .9; utt.pitch = 1.05; const v = voices.find(v => v.lang.startsWith('fr')); if (v) utt.voice = v; }
    else { utt.lang = 'fr-FR'; const v = voices.find(v => v.lang.startsWith('fr')); if (v) utt.voice = v; }
    wave.style.display = 'inline-flex';
    utt.onend = utt.onerror = () => { wave.style.display = 'none'; };
    window.speechSynthesis.speak(utt);
}

// ================================================================
// SETUP DU MODULE VENTE
// ================================================================
function setupPrediction() {
    document.getElementById('btn-run-prediction').addEventListener('click', runPrediction);
    document.getElementById('btn-speak').addEventListener('click', toggleSpeech);

    document.querySelectorAll('#lang-selector .lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            AppState.currentLang = btn.dataset.lang;
            document.querySelectorAll('#lang-selector .lang-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateResultUI();
            if (window.speechSynthesis?.speaking) { window.speechSynthesis.cancel(); toggleSpeech(); }
        });
    });

    // Pré-remplissage depuis les résultats IA vers SunuMarché
    document.getElementById('btn-quick-publish').addEventListener('click', () => {
        if (AppState.lastResult) {
            document.getElementById('seller-product').value = AppState.lastResult.product.id;
            document.getElementById('seller-qty').value = `${AppState.lastResult.qty} ${AppState.lastResult.product.unit.split(' ')[0]}s`;
            document.getElementById('seller-price').value = AppState.lastResult.recommendedPrice;
            const reg = document.getElementById('input-region').value;
            document.getElementById('seller-loc').value = reg.split(' ')[0];
        }
        window.switchTab('tab-marketplace');
        document.getElementById('modal-sell').classList.add('open');
        showToast('Formulaire pré-rempli avec les résultats IA !');
    });
}

if (typeof window !== 'undefined') {
    window.calcTransport = calcTransport;
    window.genCurve = genCurve;
    window.optimizeSale = optimizeSale;
    window.runPrediction = runPrediction;
    window.updateResultUI = updateResultUI;
    window.renderMarketCompare = renderMarketCompare;
    window.renderForecastChart = renderForecastChart;
    window.toggleSpeech = toggleSpeech;
    window.setupPrediction = setupPrediction;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calcTransport, genCurve, optimizeSale, runPrediction, updateResultUI, renderMarketCompare, renderForecastChart, toggleSpeech, setupPrediction };
}
