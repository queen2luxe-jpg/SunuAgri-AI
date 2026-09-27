/** SunuCompagnon: conversation en mémoire de page, outils locaux contrôlés et API serveur facultative. */
const assistantConversation = [];
let assistantMode = 'demo';
let assistantBusy = false;
let demoPendingSale = null;
let demoPendingListing = null;

function setupChat() {
    const assistantForm = document.getElementById('assistant-form');
    const assistantInput = document.getElementById('assistant-input');
    const advisorInput = document.getElementById('chat-input');
    const advisorSend = document.getElementById('chat-send');
    const panel = document.getElementById('assistant-panel');
    const toggle = document.getElementById('assistant-toggle');
    const close = document.getElementById('assistant-close');
    const inputs = [assistantInput, advisorInput].filter(Boolean);
    const messageLists = [document.getElementById('assistant-messages'), document.getElementById('chat-messages')].filter(Boolean);

    function setMode(mode, model) {
        assistantMode = mode;
        document.querySelectorAll('.assistant-mode').forEach(el => {
            el.dataset.mode = mode;
            el.textContent = mode === 'gemini' ? `${model || 'Gemini'} · connecté` : 'Démo locale · sans modèle IA';
        });
    }

    if (window.fetch) {
        window.fetch('/api/assistant', { method: 'GET', credentials: 'same-origin' })
            .then(response => response.ok ? response.json() : null)
            .then(status => setMode(status && status.configured ? 'gemini' : 'demo', status && status.model))
            .catch(() => setMode('demo'));
    } else {
        setMode('demo');
    }

    function setPanelOpen(open) {
        if (!panel || !toggle) return;
        if (open && window.closeAccountPanel) window.closeAccountPanel();
        panel.hidden = !open;
        panel.setAttribute('aria-hidden', String(!open));
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Fermer SunuCompagnon' : 'Ouvrir SunuCompagnon');
        if (open && assistantInput) assistantInput.focus();
    }

    if (toggle) toggle.addEventListener('click', () => setPanelOpen(panel.hidden));
    if (close) close.addEventListener('click', () => setPanelOpen(false));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && panel && !panel.hidden) setPanelOpen(false);
    });
    window.openSunuCompagnon = () => setPanelOpen(true);
    window.closeSunuCompagnon = () => setPanelOpen(false);

    if (assistantForm) assistantForm.addEventListener('submit', event => {
        event.preventDefault();
        sendMessage(assistantInput && assistantInput.value);
    });
    if (advisorSend) advisorSend.addEventListener('click', () => sendMessage(advisorInput && advisorInput.value));
    if (advisorInput) advisorInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendMessage(advisorInput.value);
        }
    });
    document.querySelectorAll('.quick-chip[data-msg]').forEach(chip => {
        chip.addEventListener('click', () => sendMessage(chip.dataset.msg));
    });

    async function sendMessage(rawMessage) {
        const message = (rawMessage || '').trim();
        if (!message || assistantBusy) return;
        assistantBusy = true;
        inputs.forEach(input => { input.value = ''; });
        assistantConversation.push({ role: 'user', text: message });
        trimConversation();
        appendConversationMessage('user', message, messageLists);
        const pending = appendConversationMessage('assistant', 'SunuCompagnon prépare une réponse…', messageLists, true);

        try {
            let answer;
            if (assistantMode === 'gemini') {
                answer = await answerWithGemini(message);
            } else {
                answer = await answerInDemoMode(message);
            }
            pending.forEach(node => node.remove());
            assistantConversation.push({ role: 'assistant', text: answer });
            trimConversation();
            appendConversationMessage('assistant', answer, messageLists);
        } catch (error) {
            pending.forEach(node => node.remove());
            appendConversationMessage('assistant', `Je ne peux pas joindre Gemini pour le moment. ${error.message} Votre message n’a pas été basculé vers une réponse simulée.`, messageLists);
        } finally {
            assistantBusy = false;
        }
    }

    async function answerWithGemini(userMessage) {
        let response = await requestAssistant();
        let actionCount = 0;
        let lastActionResult = null;
        while (response.action && actionCount < 2) {
            const actionResult = await executeAssistantAction(response.action);
            lastActionResult = actionResult;
            assistantConversation.push({ role: 'assistant', text: `[Outil contrôlé: ${response.action.name}]`, internal: true });
            assistantConversation.push({ role: 'user', text: `[Résultat d’outil, données de l’application: ${JSON.stringify(actionResult)}]`, internal: true });
            trimConversation();
            actionCount += 1;
            response = await requestAssistant();
        }
        if (response.action) return `J’ai effectué l’action autorisée. ${formatActionResult(lastActionResult)} Pour continuer, précisez votre prochaine étape.`;
        const answer = response.text || (lastActionResult ? formatActionResult(lastActionResult) : 'Je n’ai pas reçu de réponse exploitable. Pouvez-vous reformuler ?');
        const discussesMarketData = /\b(simulation|simuler|marché|marchés|prix|cours)\b/i.test(`${userMessage} ${response.text || ''}`);
        const hasTraceableAction = lastActionResult && ['simulation', 'simulation_explanation', 'market_search'].includes(lastActionResult.action);
        if (!response.text || (!hasTraceableAction && !discussesMarketData)) return answer;
        const trace = hasTraceableAction
            ? getActionTraceability(lastActionResult)
            : formatDataTraceability(AppState.lastResult && AppState.lastResult.bestMarket.meta || AGRI_DATA.markets[0].meta);
        return `${answer}\n\n${trace}`;
    }

    async function requestAssistant() {
        const safeMessages = assistantConversation.slice(-12).map(item => ({
            role: item.role,
            text: redactContactDetails(item.text)
        }));
        const response = await window.fetch('/api/assistant', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: safeMessages, context: getAssistantContext() })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            if (data.error && data.error.code === 'not_configured') setMode('demo');
            throw new Error(data.error && data.error.message || `Erreur du service (${response.status}).`);
        }
        return data;
    }

    async function answerInDemoMode(message) {
        if (demoPendingSale) {
            demoPendingSale.product = demoPendingSale.product || findProductInText(message);
            demoPendingSale.quantity = demoPendingSale.quantity || Number((message.match(/\b(\d{1,4})\s*(?:sacs?|caisses?|unités?)\b/i) || [])[1]);
            demoPendingSale.region = demoPendingSale.region || findRegionInText(message);
            if (demoPendingSale.product && demoPendingSale.quantity && demoPendingSale.region) {
                const result = await executeAssistantAction({ name: 'run_sale_simulation', args: demoPendingSale });
                demoPendingSale = null;
                return `Mode démonstration locale (sans modèle IA connecté). ${formatActionResult(result)}`;
            }
            return `Mode démonstration locale. Pour lancer la simulation, il me manque : ${[!demoPendingSale.product && 'la culture', !demoPendingSale.quantity && 'la quantité', !demoPendingSale.region && 'la région'].filter(Boolean).join(', ')}.`;
        }
        if (demoPendingListing) {
            demoPendingListing.product = demoPendingListing.product || findProductInText(message);
            const quantity = message.match(/\b\d{1,4}\s*(?:sacs?|caisses?|unités?)\b/i);
            demoPendingListing.quantity = demoPendingListing.quantity || (quantity && quantity[0]);
            if (demoPendingListing.product && demoPendingListing.quantity) {
                const result = await executeAssistantAction({ name: 'prepare_listing', args: demoPendingListing });
                demoPendingListing = null;
                return `Mode démonstration locale (sans modèle IA connecté). ${formatActionResult(result)}`;
            }
            return `Mode démonstration locale. Dites-moi la culture et la quantité à inscrire dans le lot.`;
        }
        const action = inferDemoAction(message);
        if (action) {
            if (action.name === 'ask_missing_sale_details') {
                demoPendingSale = { product: action.args.product, quantity: action.args.quantity, region: action.args.region };
                return `Mode démonstration locale. J’ai ouvert IA Vente et prérempli les informations données. Pour lancer le calcul, il me manque : ${action.args.missing.join(', ')}.`;
            }
            if (action.name === 'ask_missing_listing_details') {
                demoPendingListing = { product: action.args.product, quantity: action.args.quantity };
                return 'Mode démonstration locale. Je vous aide à préparer l’annonce. Quelle culture et quelle quantité souhaitez-vous vendre ? Rien ne sera publié sans votre confirmation.';
            }
            const result = await executeAssistantAction(action);
            return `Mode démonstration locale (sans modèle IA connecté). ${formatActionResult(result)}`;
        }
        const local = getResponse(message);
        const isMarketAnswer = /\b(marché|marchés|prix|cours)\b/i.test(message);
        const trace = isMarketAnswer ? ` ${formatDataTraceability(AGRI_DATA.markets[0].meta)}` : '';
        return `Mode démonstration locale (sans modèle IA connecté). ${local.text} Ces réponses proviennent d’une base locale et ne sont pas des données en direct.${trace}`;
    }
}

function trimConversation() {
    while (assistantConversation.length > 12) assistantConversation.shift();
}

function redactContactDetails(text) {
    return text.replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[coordonnée masquée]');
}

function appendConversationMessage(role, text, lists, pending = false) {
    return lists.map(list => {
        const item = document.createElement('div');
        item.className = role === 'user' ? 'bubble-user' : 'bubble-bot';
        if (pending) item.classList.add('assistant-pending');
        if (role === 'assistant') {
            const heading = document.createElement('div');
            heading.className = 'bubble-bot__head';
            heading.textContent = '🌱 SunuCompagnon';
            item.appendChild(heading);
        }
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        item.appendChild(paragraph);
        list.appendChild(item);
        list.scrollTop = list.scrollHeight;
        return item;
    });
}

function getAssistantContext() {
    const result = AppState.lastResult;
    const productInput = document.getElementById('input-product');
    const quantityInput = document.getElementById('input-quantity');
    const regionInput = document.getElementById('input-region');
    return {
        dataAreEstimates: true,
        currentInputs: {
            product: productInput && productInput.value || null,
            quantity: quantityInput && Number(quantityInput.value) || null,
            region: regionInput && regionInput.value || null
        },
        lastSimulation: result ? {
            product: result.product.id,
            productName: result.product.name,
            unit: result.product.unit,
            quantity: result.qty,
            region: regionInput && regionInput.value || null,
            market: result.bestMarket.name,
            meta: result.bestMarket.meta,
            days: result.bestDay,
            netRevenueFcfa: result.optimalNet,
            localBaselineFcfa: result.baseline,
            extraFcfa: result.extra,
            transportFcfa: result.tCost,
            distanceKm: result.dist,
            alternatives: result.allMarkets.slice(0, 5).map(item => ({
                market: item.market.name,
                netRevenueFcfa: item.bestNet,
                transportFcfa: item.tCost,
                distanceKm: item.dist,
                meta: item.market.meta
            }))
        } : null
    };
}

async function executeAssistantAction(action) {
    const args = action.args || {};
    const sections = { home: 'tab-home', sale: 'tab-predict', markets: 'tab-markets', marketplace: 'tab-marketplace', advisor: 'tab-advisor' };
    if (action.name === 'navigate_to_section' && sections[args.section]) {
        window.switchTab(sections[args.section]);
        return { action: 'navigation', section: args.section };
    }
    if (action.name === 'run_sale_simulation') {
        if (window.canUseSalesTools && !window.canUseSalesTools()) throw new Error('La simulation IA Vente est réservée aux comptes vendeur.');
        if (!AGRI_DATA.products.some(product => product.id === args.product) || !AGRI_DATA.regions.some(region => region.id === args.region) || !Number.isInteger(args.quantity) || args.quantity < 1 || args.quantity > 2000) {
            throw new Error('Paramètres de simulation invalides.');
        }
        window.switchTab('tab-predict');
        document.getElementById('input-product').value = args.product;
        document.getElementById('input-quantity').value = String(args.quantity);
        document.getElementById('input-region').value = args.region;
        runPrediction();
        await new Promise(resolve => setTimeout(resolve, 450));
        return { action: 'simulation', ...getAssistantContext().lastSimulation };
    }
    if (action.name === 'search_markets') {
        if (args.product && !AGRI_DATA.products.some(product => product.id === args.product)) throw new Error('Culture inconnue.');
        window.switchTab('tab-markets');
        if (args.product) AppState.activeFilter = args.product;
        const search = document.getElementById('market-search-input');
        if (search) search.value = typeof args.query === 'string' ? args.query.slice(0, 100) : '';
        renderMarketChips();
        renderMarketList();
        const product = AGRI_DATA.products.find(item => item.id === AppState.activeFilter);
        const query = (search && search.value || '').toLowerCase();
        const matches = AGRI_DATA.markets.filter(market => !query || `${market.name} ${market.city} ${market.type}`.toLowerCase().includes(query));
        return { action: 'market_search', product: product && product.name, meta: product && product.meta, estimatedPrices: matches.slice(0, 6).map(market => ({ market: market.name, city: market.city, estimateFcfa: Math.round(product.basePrice * market.demandBonus), type: market.type, meta: market.meta })), simulated: true };
    }
    if (action.name === 'prepare_listing') {
        if (window.canSell && !window.canSell()) throw new Error('La publication d’annonces est réservée aux comptes vendeur.');
        if (!AGRI_DATA.products.some(product => product.id === args.product) || typeof args.quantity !== 'string' || !args.quantity.trim() || args.quantity.length > 80) {
            throw new Error('Informations de lot invalides.');
        }
        window.switchTab('tab-marketplace');
        document.getElementById('btn-open-modal').click();
        document.getElementById('seller-product').value = args.product;
        document.getElementById('seller-qty').value = args.quantity.trim();
        if (Number.isInteger(args.price_per_unit) && args.price_per_unit >= 100) document.getElementById('seller-price').value = String(args.price_per_unit);
        if (typeof args.location === 'string') document.getElementById('seller-loc').value = args.location.slice(0, 120);
        return { action: 'listing_prepared', publication: 'not_performed', requiresSellerNameAndPhone: true, requiresUserReviewAndConfirmation: true };
    }
    if (action.name === 'explain_simulation') {
        if (!AppState.lastResult) return { action: 'simulation_explanation', available: false };
        return { action: 'simulation_explanation', ...getAssistantContext().lastSimulation };
    }
    throw new Error('Action non autorisée.');
}

function formatActionResult(result) {
    if (!result) return 'Aucun résultat disponible.';
    if (result.action === 'navigation') return `J’ai ouvert la section ${result.section}.`;
    if (result.action === 'simulation') return `Simulation terminée avec les données estimatives de l’application : ${result.quantity} ${result.unit || 'unités'} de ${result.productName || result.product}, meilleur résultat ${result.market}, revenu net estimé ${Number(result.netRevenueFcfa).toLocaleString('fr-FR')} FCFA, transport estimé ${Number(result.transportFcfa).toLocaleString('fr-FR')} FCFA, délai ${result.days} jours. ${getActionTraceability(result)}`;
    if (result.action === 'market_search') return `Observatoire ouvert pour ${result.product || 'la culture sélectionnée'}. ${result.estimatedPrices.length} marché(s) affiché(s); les prix sont simulés, pas des cours en direct. ${getActionTraceability(result)}`;
    if (result.action === 'listing_prepared') return 'Le formulaire SunuMarché est prérempli. Je n’ai rien publié. Vérifiez le lot, complétez votre nom et votre numéro dans le formulaire puis confirmez vous-même la publication.';
    if (result.action === 'simulation_explanation') {
        if (!result.available) return 'Aucune simulation n’est encore disponible. Lancez-en une dans IA Vente et je pourrai expliquer ses résultats.';
        return `Résultat estimé : ${result.market}, ${Number(result.netRevenueFcfa).toLocaleString('fr-FR')} FCFA nets après environ ${Number(result.transportFcfa).toLocaleString('fr-FR')} FCFA de transport sur ${result.distanceKm} km. Le surplus estimé par rapport à la référence locale est ${Number(result.extraFcfa).toLocaleString('fr-FR')} FCFA. Ce sont des estimations, pas une garantie de prix. ${getActionTraceability(result)}`;
    }
    return 'Action effectuée.';
}

function getActionTraceability(result) {
    const firstEstimate = result.estimatedPrices && result.estimatedPrices[0];
    const meta = firstEstimate && firstEstimate.meta || result.meta;
    return formatDataTraceability(meta);
}

function inferDemoAction(message) {
    const text = message.toLowerCase();
    if (/\b(annonce|publier|publication|lot à vendre|mettre en vente)\b/.test(text)) {
        const product = findProductInText(text);
        const quantity = text.match(/\b\d{1,4}\s*(?:sacs?|caisses?|unités?)\b/i);
        if (!product || !quantity) {
            if (window.switchTab) window.switchTab('tab-marketplace');
            document.getElementById('btn-open-modal').click();
            return { name: 'ask_missing_listing_details', args: { product, quantity: quantity && quantity[0] } };
        }
        return { name: 'prepare_listing', args: { product, quantity: quantity[0] } };
    }
    if (/\b(observatoire|marchés?|markets|cours des prix|compare les marchés)\b/.test(text)) {
        const query = ['castors', 'dakar', 'kaolack', 'touba', 'thiaroye', 'diaobé', 'saint-louis'].find(place => text.includes(place));
        return { name: 'search_markets', args: { query, product: findProductInText(text) } };
    }
    if (/\b(explique|expliquer|analyse les résultats|résultats de ma simulation|compare les résultats)\b/.test(text)) {
        return { name: 'explain_simulation', args: {} };
    }
    if (/\b(vendre|vente|simuler|simulation|analyser|sell|calculate)\b/.test(text)) {
        const product = findProductInText(text);
        const quantity = text.match(/\b(\d{1,4})\s*(sacs?|caisses?|unités?)\b/i);
        const region = findRegionInText(text);
        if (product && quantity && region) {
            return { name: 'run_sale_simulation', args: { product, quantity: Number(quantity[1]), region } };
        }
        if (window.switchTab) window.switchTab('tab-predict');
        if (product) document.getElementById('input-product').value = product;
        if (quantity) document.getElementById('input-quantity').value = quantity[1];
        return { name: 'ask_missing_sale_details', args: { product, quantity: quantity && Number(quantity[1]), region, missing: [!product && 'culture', !quantity && 'quantité', !region && 'région'].filter(Boolean) } };
    }
    if (/\b(ouvre|ouvrir|affiche|aller à|va à)\b/.test(text)) {
        if (/marché|observatoire|market/.test(text)) return { name: 'navigate_to_section', args: { section: 'markets' } };
        if (/sunu.?marché|annonce/.test(text)) return { name: 'navigate_to_section', args: { section: 'marketplace' } };
        if (/conseiller|assistant/.test(text)) return { name: 'navigate_to_section', args: { section: 'advisor' } };
        if (/vente|simulation|ia/.test(text)) return { name: 'navigate_to_section', args: { section: 'sale' } };
        if (/accueil/.test(text)) return { name: 'navigate_to_section', args: { section: 'home' } };
    }
    return null;
}

function findProductInText(text) {
    text = text.toLowerCase();
    const match = [
        ['oignon', /oignon|soble/], ['arachide', /arachide|gerté|gerte|peanut/], ['mangue', /mangue|mango/],
        ['tomate', /tomate|tomato/], ['niebe', /niébé|niebe/], ['piment', /piment|chili/], ['mais', /maïs|mais|corn/]
    ].find(([, pattern]) => pattern.test(text));
    return match && match[0];
}

function findRegionInText(text) {
    text = text.toLowerCase();
    const match = [
        ['Saint-Louis', /saint.?louis|podor|dagana/], ['Thies', /thiès|thies|mboro|pout/], ['Kaolack', /kaolack|nioro/],
        ['Diourbel', /diourbel|touba|bambey|mbacké|mbacke/], ['Dakar', /dakar|rufisque|sangalkam/],
        ['Kolda', /kolda|vélingara|velingara|sédhiou|sedhiou/], ['Fatick', /fatick|gossas/]
    ].find(([, pattern]) => pattern.test(text));
    return match && match[0];
}

/**
 * Analyse la requête utilisateur et retourne la réponse adaptée ainsi que la langue détectée.
 * @param {string} q - Question posée par l'agriculteur
 * @returns {{text: string, lang: string}}
 */
function getResponse(q) {
    const ql = q.toLowerCase();
    const hasFr = ['comment', 'quel', 'quelle', 'pourquoi', 'combien', 'vendre', 'stocker', 'conserver', 'négocier', 'prix', 'transport', 'bonjour', 'salut', 'marché', 'coût'].some(k => ql.includes(k));
    const hasWo = ['naka', 'lan', 'dencé', 'dencal', 'ñoo', 'bàyyil', 'jaay', 'tey', 'ban', 'fane', 'ndax', 'ana', 'jerejef', 'am na', 'meññeef', 'xaalis'].some(k => ql.includes(k));
    const hasEn = ['how', 'when', 'where', 'what', 'price', 'sell', 'store', 'negotiate', 'transport', 'hello', 'hi', 'market', 'cost'].some(k => ql.includes(k));

    let lang = 'fr';
    if (hasEn && !hasFr && !hasWo) lang = 'en';
    else if (hasWo && !hasFr) lang = 'wo';
    else if (hasWo && hasFr) lang = (ql.includes('naka') || ql.includes('dencé') || ql.includes('ñoo')) ? 'wo' : 'fr';

    for (const item of AGRI_DATA.aiKnowledge) {
        if (item.kw.some(k => ql.includes(k))) {
            if (lang === 'wo' && item.wo) return { text: item.wo, lang: 'wo' };
            if (lang === 'en') return { text: item.en || item.fr, lang: 'en' };
            return { text: item.fr, lang: 'fr' };
        }
    }

    if (lang === 'wo') return { text: "Salam Alaykoum ! SunuAgri IA mi ngi lay xamal ni marché yi ci Dakar (Castors ak Thiaroye) ñoo gënë dihé xaalis. Bàyyil sa meññeef ci jamono ju baax ngir am njariñ bu rëy !", lang: 'wo' };
    if (lang === 'en') return { text: "Hello! SunuAgri AI shows that Castors and Thiaroye markets in Dakar offer the best profit margins. Use the AI Sell tab to calculate the exact optimal timing for your harvest!", lang: 'en' };
    return { text: "Excellente question ! D'après les tendances agricoles actuelles, la meilleure stratégie est de surveiller les prix du Marché Castors et de Thiaroye, et d'éviter de vendre à la hâte. Utilisez l'onglet « IA Vente » pour un calcul personnalisé !", lang: 'fr' };
}

function appendMsg(sender, text, lang = 'fr') {
    const c = document.getElementById('chat-messages');
    if (!c) return;
    const div = document.createElement('div');
    if (sender === 'user') {
        div.className = 'bubble-user';
        div.textContent = text;
    } else {
        const flag = { fr: '🇫🇷 Français', wo: '🇸🇳 Wolof', en: '🇬🇧 English' }[lang] || '🇫🇷 Français';
        div.className = 'bubble-bot';
        div.innerHTML = `<div class="bubble-bot__head"><span class="bot-name">🌾 SunuConseiller</span><div style="display:flex;align-items:center;gap:6px;"><span style="font-size:9px;font-weight:700;background:var(--primary-light);color:var(--primary-darker);padding:2px 5px;border-radius:4px;">${flag}</span><button class="tts-btn"><i data-lucide="volume-2" style="width:11px;height:11px;"></i> <span>Écouter</span></button></div></div><p style="line-height:1.6;">${text}</p>`;
        const ttsBtn = div.querySelector('.tts-btn');
        if (ttsBtn) {
            ttsBtn.addEventListener('click', () => {
                if (!('speechSynthesis' in window)) return;
                const utt = new SpeechSynthesisUtterance(text);
                const voices = window.speechSynthesis.getVoices();
                if (lang === 'en') {
                    utt.lang = 'en-US';
                    const v = voices.find(v => v.lang.startsWith('en'));
                    if (v) utt.voice = v;
                } else {
                    utt.lang = lang === 'wo' ? 'fr-SN' : 'fr-FR';
                    if (lang === 'wo') { utt.rate = 0.9; utt.pitch = 1.05; }
                    const v = voices.find(v => v.lang.startsWith('fr'));
                    if (v) utt.voice = v;
                }
                window.speechSynthesis.speak(utt);
            });
        }
    }
    c.appendChild(div);
    c.scrollTop = c.scrollHeight;
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setupChat, getResponse, appendMsg };
}
