/**
 * utils.js — SunuAgri IA
 * Fonctions utilitaires partagées entre tous les modules.
 */

// ================================================================
// DONNÉES GLOBALES DE L'APPLICATION
// ================================================================
const AGRI_DATA = {
    products: [
        { id:'oignon', name:'Oignon Local (Podor / Gandiol)', emoji:'🧅', unit:'Sac de 50 kg', unitWeightKg:50, basePrice:17500, lossRiskPerWeek:0.04, shelfLifeDays:45 },
        { id:'arachide', name:'Arachide Décortiquée (Bassin arachidier)', emoji:'🥜', unit:'Sac de 100 kg', unitWeightKg:100, basePrice:38000, lossRiskPerWeek:0.015, shelfLifeDays:180 },
        { id:'mangue', name:'Mangue Kent (Niayes / Casamance)', emoji:'🥭', unit:'Caisse de 20 kg', unitWeightKg:20, basePrice:9500, lossRiskPerWeek:0.12, shelfLifeDays:12 },
        { id:'tomate', name:'Tomate Fraîche Locale', emoji:'🍅', unit:'Caisse de 25 kg', unitWeightKg:25, basePrice:12500, lossRiskPerWeek:0.15, shelfLifeDays:8 },
        { id:'niebe', name:'Niébé (Haricot rouge / blanc)', emoji:'🌱', unit:'Sac de 50 kg', unitWeightKg:50, basePrice:24500, lossRiskPerWeek:0.02, shelfLifeDays:120 },
        { id:'piment', name:'Piment Frais (Piment oiseau)', emoji:'🌶️', unit:'Sac de 25 kg', unitWeightKg:25, basePrice:21000, lossRiskPerWeek:0.08, shelfLifeDays:20 },
        { id:'mais', name:'Maïs Grain Local', emoji:'🌽', unit:'Sac de 50 kg', unitWeightKg:50, basePrice:14000, lossRiskPerWeek:0.02, shelfLifeDays:150 }
    ],
    regions: [
        { id:'Saint-Louis', name:'Saint-Louis (Vallée du Fleuve, Podor, Dagana)', hubDistKm:265 },
        { id:'Thies', name:'Thiès (Zone des Niayes, Pout, Mboro)', hubDistKm:70 },
        { id:'Kaolack', name:'Kaolack (Bassin Arachidier, Nioro)', hubDistKm:190 },
        { id:'Diourbel', name:'Diourbel / Touba (Bambey, Mbacké)', hubDistKm:150 },
        { id:'Dakar', name:'Région de Dakar (Rufisque, Sangalkam)', hubDistKm:25 },
        { id:'Kolda', name:'Kolda / Casamance (Vélingara, Sédhiou)', hubDistKm:460 },
        { id:'Fatick', name:'Fatick / Gossas', hubDistKm:155 }
    ],
    markets: [
        { id:'castors', name:'Marché Castors (Dakar)', city:'Dakar', type:'Gros & Demi-gros', demandBonus:1.24, tags:['Très Forte Demande','Gros volumes'], distancesKm:{'Saint-Louis':265,'Thies':70,'Kaolack':190,'Diourbel':150,'Dakar':12,'Kolda':460,'Fatick':155} },
        { id:'thiaroye', name:'Marché Syndicat de Thiaroye', city:'Dakar Banlieue', type:"Hub d'Éclatement", demandBonus:1.19, tags:['Rotations rapides','Arrivages directs'], distancesKm:{'Saint-Louis':255,'Thies':58,'Kaolack':180,'Diourbel':140,'Dakar':18,'Kolda':450,'Fatick':145} },
        { id:'kaolack_m', name:'Marché Central de Kaolack', city:'Kaolack', type:'Carrefour Régional', demandBonus:1.06, tags:['Hub Bassin Arachidier'], distancesKm:{'Saint-Louis':280,'Thies':120,'Kaolack':8,'Diourbel':85,'Dakar':190,'Kolda':270,'Fatick':45} },
        { id:'diaobe', name:'Marché International de Diaobé', city:'Kolda / Vélingara', type:'Marché Hebdomadaire', demandBonus:1.15, tags:['Sous-régional','Grossistes'], distancesKm:{'Saint-Louis':580,'Thies':490,'Kaolack':320,'Diourbel':360,'Dakar':470,'Kolda':60,'Fatick':340} },
        { id:'touba_m', name:'Marché Okass de Touba', city:'Touba', type:'Consommation Massive', demandBonus:1.12, tags:['Forte Affluence'], distancesKm:{'Saint-Louis':210,'Thies':105,'Kaolack':90,'Diourbel':15,'Dakar':155,'Kolda':370,'Fatick':110} },
        { id:'ndar', name:'Marché Ndar (Saint-Louis)', city:'Saint-Louis', type:'Marché Urbain Régional', demandBonus:0.98, tags:['Proximité Vallée'], distancesKm:{'Saint-Louis':10,'Thies':200,'Kaolack':280,'Diourbel':210,'Dakar':265,'Kolda':580,'Fatick':270} }
    ],
    listings: [
        { id:'L001', sellerName:'El Hadj Ndiaye (GIE Podor)', sellerPhone:'+221776543210', product:'oignon', quantity:'80 sacs de 50 kg', pricePerUnit:19500, location:'Podor (Saint-Louis)', verified:true, badge:'Récolte fraîche', image:'🧅' },
        { id:'L002', sellerName:'Awa Seck', sellerPhone:'+221781234567', product:'tomate', quantity:'35 caisses de 25 kg', pricePerUnit:13500, location:'Mboro (Niayes)', verified:true, badge:'Vente urgente', image:'🍅' },
        { id:'L003', sellerName:'Coopérative Nioro du Rip', sellerPhone:'+221764321987', product:'arachide', quantity:'120 sacs de 100 kg', pricePerUnit:39500, location:'Nioro (Kaolack)', verified:true, badge:'Stock certifié', image:'🥜' },
        { id:'L004', sellerName:'Mamadou Baldé', sellerPhone:'+221773456789', product:'mangue', quantity:'50 caisses de 20 kg', pricePerUnit:10500, location:'Oussouye (Ziguinchor)', verified:false, badge:'Qualité Kent', image:'🥭' }
    ],
    aiKnowledge: [
        {
            kw:['soble','oignon','conservation','stocker','denc'],
            fr:"Pour l'oignon local : laissez sécher le feuillage au champ pendant 3 à 5 jours après récolte (ressuyage). Stockez ensuite les sacs sur des palettes en bois surélevées de 20 cm dans un abri sombre, sec et bien ventilé. Ne jamais poser à même le sol pour éviter la pourriture basale.",
            wo:"Ngir soble bi dencu bu baax : bàyyil xob yi ñu wow ci tool bi 3 ba 5 fan ginaaw góob gi. Ginaaw loolu, tegal saag yi ci palet u bant yu kawe ci suuf ci bërëb bu sedd, amul tooyaay te ngelaw li di ci dugg. Bul ko teg mukk ci suuf si ngir bañ mu tooy te pourir.",
            en:"For local onions: let the foliage dry in the field for 3 to 5 days after harvest (curing). Then store bags on wooden pallets raised 20cm off the ground in a cool, dry, well-ventilated shelter. Never place directly on the ground to avoid basal rot."
        },
        {
            kw:['tomate','kerese','fragile','pourriture','gaspillage'],
            fr:"La tomate est hautement périssable (durée max 8 à 10 jours sans chambre froide). Si les cours chutent au marché local, privilégiez la vente rapide en demi-gros sur Dakar (Thiaroye) ou envisagez la transformation artisanale en purée/concentré pour valoriser les écarts de tri.",
            wo:"Keece (tomate) dafa gaawe yàqu (du weesu 8 ba 10 fan bu amul chambre froide). Soo gisee prix bi wàcc, gaaweel jaay ca Thiaroye walla nga defar ko purée/concentré ngir bañ a ñakk sa xaalis.",
            en:"Tomatoes are highly perishable (max 8-10 days without cold storage). If local market prices drop, prioritize quick wholesale to Dakar (Thiaroye) or consider artisanal transformation into purée/concentrate."
        },
        {
            kw:['gerte','gerté','arachide','aflatoxine','huilerie','sonacos'],
            fr:"Pour l'arachide : veillez à un séchage complet (taux d'humidité inférieur à 9%) pour écarter tout risque d'aflatoxine. Si les prix officiels des huileries tardent, les marchés hebdomadaires comme Diaobé ou Kaolack offrent d'excellentes opportunités auprès des commerçants privés.",
            wo:"Ngir gerte gi : wawal ko bu baax ba tooyaay bi wàcc bu baax (taux d'humidité < 9%) ngir bañ aflatoxine. Soo amee gerte gu baax, jaay ca marché Touba, Kaolack walla Diaobé dina la amal njariñ bu baax.",
            en:"For groundnuts: ensure complete drying (moisture below 9%) to prevent aflatoxin risk. If oil mill prices are delayed, weekly markets like Diaobé or Kaolack offer excellent private trader opportunities."
        },
        {
            kw:['mangue','màngo','kent','casamance'],
            fr:"Pour la mangue Kent : récoltez au stade vert-mûr (pédoncule bien formé). Évitez absolument le stockage en tas chaud ; transportez en cageots aérés la nuit ou tôt le matin vers Dakar pour préserver la fermeté et négocier le prix fort auprès des exportateurs et supermarchés.",
            wo:"Màngo Kent : goobeel ko bu ñoragul mukk (ba mu dëgër). Yóbbul ko ci saag walla caisse yu aéré ci guddig walla suba tél jëm Dakar ngir gën ko mëna jaayee cher ca grossiste yi.",
            en:"For Kent mangoes: harvest at green-ripe stage (well-formed stalk). Never store in hot piles; transport in aerated crates at night or early morning to Dakar to preserve firmness and negotiate premium prices with exporters."
        },
        {
            kw:['prix','cours','cher','castors','thiaroye','marche','marché'],
            fr:"Le Marché Castors (Dakar) affiche structurellement les cours les plus élevés du Sénégal grâce à la forte concentration de consommateurs et de restaurants. Le Marché Syndicat de Thiaroye est idéal pour écouler rapidement de très gros volumes de camions entiers.",
            wo:"Marché Castors mooy marché bi gënë dihé xaalis ci Sénégal ndax nit ñi dafa bari lool te restoran yi dañuy bëgg meññeef mu rafet. Thiaroye tamit baax na ngir gaawe jaay camion bu fees dell.",
            en:"Castors Market (Dakar) structurally displays the highest prices in Senegal due to high consumer and restaurant concentration. Thiaroye Syndicat is ideal for quickly moving very large truck-load volumes."
        },
        {
            kw:['transport','frais','camion','cout','coût','logistique','ndiaga'],
            fr:"Pour réduire vos coûts de transport : regroupez-vous au sein de votre GIE ou coopérative pour affréter un camion de 10 tonnes au lieu de petits chargements individuels. Cela divise le coût unitaire par sac par plus de deux !",
            wo:"Ngir wàññi xaalis u transport bi : bokkleen benn GIE walla camion 10 tonnes ak yeneen baykat yi. Soo leen ko defee, li ngay faye benn saag dina wàcc bu baax !",
            en:"To reduce transport costs: pool together within your GIE or cooperative to charter a 10-tonne truck instead of small individual loads. This cuts the per-bag unit cost by more than half!"
        },
        {
            kw:['negocier','négocier','bana','intermediaire','courtier','négociation'],
            fr:"Face aux bana-bana (intermédiaires) : pesez toujours vous-même vos lots avant la négociation, consultez les cours officiels SunuAgri IA du jour comme référence minimale, et refusez le crédit non garanti. Vendre directement via SunuMarché vous permet de sauter ces intermédiaires !",
            wo:"Sooy wax ak bana-bana yi : nattal sa meññeef ci balance bu leer bala ngay wax, xoolal prix SunuAgri IA te bul nangu ñu lay dencal xaalis ci crédit bu leerul. Soo ko jaayee ci SunuMarché, danga leen di weesu te am say bénéfice !",
            en:"When dealing with bana-bana middlemen: always weigh your lots yourself before negotiating, check SunuAgri IA's daily prices as your minimum reference, and refuse unsecured credit. Sell directly via SunuMarché to bypass these intermediaries!"
        },
        {
            kw:['quand','periode','moment','vendre','temps'],
            fr:"La règle d'or SunuAgri IA : ne vendez jamais pendant le pic d'arrivage massif de votre région où l'offre excède la demande. Si votre culture permet un stockage de 10 à 20 jours (comme l'oignon ou l'arachide), attendez le tarissement du marché pour capter jusqu'à +40% de valeur.",
            wo:"Li gën ci jamono jaay : bul jaay ci jamono ji baykat yépp di indi séen meññeef ndax prix bi dina wàcc. Soo mënë denc 10 ba 20 fan (soble ak gerte), xaaral tuti dina la may bénéfice bu rëy !",
            en:"SunuAgri IA's golden rule: never sell during the peak mass arrival in your region when supply exceeds demand. If your crop allows 10-20 days storage (like onions or groundnuts), wait for market tightening to capture up to +40% in value."
        }
    ]
};

// ================================================================
// ÉTAT GLOBAL DE L'APPLICATION
// ================================================================
const AppState = {
    lastResult: null,
    currentLang: 'fr',
    activeFilter: 'oignon',
    activeMpFilter: 'all',
    marketSortMode: 'best',
    forecastChart: null
};

// ================================================================
// FONCTIONS UTILITAIRES PARTAGÉES
// ================================================================

/**
 * Affiche un toast de notification en bas de l'écran.
 * @param {string} text - Texte du toast
 * @param {number} duration - Durée d'affichage en ms
 */
function showToast(text, duration = 2800) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = text;
    t.style.display = 'flex';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.display = 'none'; }, duration);
}

/**
 * Remplit les listes déroulantes de l'application (produits, régions).
 */
function populateSelects() {
    const pSel = document.getElementById('input-product');
    const spSel = document.getElementById('seller-product');
    const rSel = document.getElementById('input-region');
    if (!pSel || !rSel) return;
    pSel.innerHTML = '';
    if (spSel) spSel.innerHTML = '';
    rSel.innerHTML = '';
    const createOpt = (text, val) => {
        if (typeof Option !== 'undefined') return new Option(text, val);
        const opt = document.createElement('option');
        opt.textContent = text;
        opt.value = val;
        return opt;
    };
    AGRI_DATA.products.forEach(p => {
        pSel.appendChild(createOpt(`${p.emoji} ${p.name} (${p.unit})`, p.id));
        if (spSel) spSel.appendChild(createOpt(`${p.emoji} ${p.name}`, p.id));
    });
    AGRI_DATA.regions.forEach(r => rSel.appendChild(createOpt(r.name, r.id)));
    pSel.addEventListener('change', () => {
        const p = AGRI_DATA.products.find(pr => pr.id === pSel.value);
        const unitLabel = document.getElementById('unit-label');
        if (p && unitLabel) unitLabel.textContent = p.unit.split(' ')[0];
    });
}

if (typeof window !== 'undefined') {
    window.AGRI_DATA = AGRI_DATA;
    window.AppState = AppState;
    window.showToast = showToast;
    window.populateSelects = populateSelects;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AGRI_DATA, AppState, showToast, populateSelects };
}
