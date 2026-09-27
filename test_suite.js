const fs = require('fs');

console.log('--- STARTING SUNUAGRI IA COMPREHENSIVE MODULAR TEST SUITE ---');

const html = fs.readFileSync('index.html', 'utf8');

const removedControls = ['btn-download', 'btn-fullscreen', 'phone-preview', 'Mode Téléphone'];
const staleControls = removedControls.filter(token => html.includes(token));
if (staleControls.length) {
    console.error('✗ Removed presentation controls are still present in index.html:', staleControls);
    process.exit(1);
}
if (!html.includes('id="btn-theme"') || !html.includes('id="account-toggle"') || !html.includes('id="btn-install"')) {
    console.error('✗ Theme, account or PWA installation control is missing from index.html');
    process.exit(1);
}
const headerStart = html.indexOf('<header class="app-header">');
const headerEnd = html.indexOf('</header>', headerStart);
if (headerStart < 0 || headerEnd < 0 || !html.slice(headerStart, headerEnd).includes('id="account-toggle"')) {
    console.error('✗ Account access must stay in the application header');
    process.exit(1);
}
if (/id="btn-install"[^>]*\shidden(?:\s|>)/.test(html)) {
    console.error('✗ Install button must remain visible until installation is confirmed');
    process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
const serviceWorker = fs.readFileSync('sw.js', 'utf8');
if (manifest.display !== 'standalone' || !serviceWorker.includes("url.pathname.startsWith('/api/')")) {
    console.error('✗ PWA install metadata or API cache exclusion is invalid');
    process.exit(1);
}
console.log('✓ Responsive controls, theme/account buttons and PWA offline safeguards are present');

// TEST 1: File integrity of HTML
console.log('✓ File index.html read successfully, size:', html.length, 'bytes');

// TEST 2: Verify CSS files exist and are linked
const expectedCss = ['css/themes.css', 'css/style.css', 'css/responsive.css'];
expectedCss.forEach(file => {
    if (!fs.existsSync(file)) {
        console.error(`✗ Missing CSS file: ${file}`);
        process.exit(1);
    }
    const size = fs.readFileSync(file, 'utf8').length;
    if (!html.includes(`href="${file}"`)) {
        console.error(`✗ CSS file ${file} is not linked in index.html`);
        process.exit(1);
    }
    console.log(`✓ CSS file ${file} exists (${size} bytes) and is linked in index.html`);
});

// TEST 3: Verify JS modular architecture
const expectedJs = [
    'js/utils.js',
    'js/navigation.js',
    'js/vente.js',
    'js/marches.js',
    'js/sunumarche.js',
    'js/conseiller.js',
    'js/demo.js',
    'js/account.js',
    'js/app.js'
];

let combinedJs = '';
expectedJs.forEach(file => {
    if (!fs.existsSync(file)) {
        console.error(`✗ Missing JS file: ${file}`);
        process.exit(1);
    }
    const code = fs.readFileSync(file, 'utf8');
    combinedJs += '\n' + code;
    if (!html.includes(`src="${file}"`)) {
        console.error(`✗ JS file ${file} is not linked in index.html`);
        process.exit(1);
    }
    console.log(`✓ JS module ${file} exists (${code.length} bytes) and is linked in index.html`);
});

if (combinedJs.includes('GEMINI_API_KEY') || combinedJs.includes('AIza')) {
    console.error('✗ A server API secret marker was found in client JavaScript');
    process.exit(1);
}
console.log('✓ No Gemini API secret or key prefix is present in browser JavaScript');

// TEST 4: Validate syntax of all JS modules combined
new Function(combinedJs);
console.log(`✓ All ${expectedJs.length} JS modules combined syntax is valid (${combinedJs.length} chars)`);

// TEST 5: Verify all referenced element IDs in JS exist in HTML
const idMatches = [...combinedJs.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
const uniqueIds = [...new Set(idMatches)];
const missingIds = uniqueIds.filter(id => !html.includes(`id="${id}"`));
if (missingIds.length > 0) {
    console.error('✗ Missing IDs in HTML:', missingIds);
    process.exit(1);
}
console.log(`✓ All ${uniqueIds.length} element IDs referenced in modular JS exist in HTML`);

// TEST 6: Functional Browser Simulation
const elements = {};
function getMockElement(id) {
    if (!elements[id]) {
        elements[id] = {
            id,
            value: '50',
            textContent: '',
            innerHTML: '',
            style: {},
            dataset: {},
            open: false,
            disabled: false,
            scrollTop: 0,
            scrollHeight: 100,
            classList: {
                add: () => {},
                remove: () => {},
                toggle: () => {},
                contains: () => false
            },
            setAttribute: () => {},
            getAttribute: () => '',
            addEventListener: () => {},
            appendChild: () => {},
            reset: () => {},
            scrollTo: () => {},
            querySelector: () => getMockElement('sub-' + id),
            querySelectorAll: () => []
        };
    }
    return elements[id];
}

const mockDocument = {
    getElementById: (id) => getMockElement(id),
    querySelectorAll: () => [],
    createElement: (tag) => getMockElement(tag),
    documentElement: { dataset: { theme: 'light' } },
    addEventListener: () => {}
};

const mockWindow = {
    speechSynthesis: { getVoices: () => [], cancel: () => {}, speak: () => {} },
    switchTab: () => {},
    addEventListener: () => {}
};

const sandbox = {};
const testFn = new Function('document', 'window', 'localStorage', 'Chart', 'lucide', 'sandbox', `
  ${combinedJs}
  sandbox.AGRI_DATA = AGRI_DATA;
  sandbox.AppState = AppState;
  sandbox.calcTransport = calcTransport;
  sandbox.genCurve = genCurve;
  sandbox.optimizeSale = optimizeSale;
  sandbox.getResponse = getResponse;
  sandbox.initApp = initApp;
`);

testFn(
    mockDocument,
    mockWindow,
    { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    function() { return { destroy: () => {} }; },
    { createIcons: () => {} },
    sandbox
);

// 6.1 calcTransport
const t1 = sandbox.calcTransport(265, 2500); // 265 km, 2.5 tonnes (50 sacs oignon)
console.log('✓ calcTransport test (265km, 2500kg):', t1, 'FCFA');
if (t1 <= 0 || isNaN(t1)) throw new Error('Invalid transport calculation');

// 6.2 optimizeSale for onion
const optOignon = sandbox.optimizeSale('oignon', 50, 'Saint-Louis');
console.log('✓ optimizeSale oignon (50 sacs, Saint-Louis):');
console.log('  - Best market:', optOignon.bestMarket.name);
console.log('  - Recommended day:', optOignon.bestDay, 'days');
console.log('  - Optimal Net Revenue:', optOignon.optimalNet.toLocaleString('fr-FR'), 'FCFA');
console.log('  - Transport cost:', optOignon.tCost.toLocaleString('fr-FR'), 'FCFA');
console.log('  - Extra profit vs local:', optOignon.extra.toLocaleString('fr-FR'), 'FCFA', `(+${optOignon.pct}%)`);
if (!optOignon.bestMarket || optOignon.optimalNet <= 0 || optOignon.extra < 0) {
    throw new Error('Invalid optimizeSale output');
}

// 6.3 optimizeSale for highly perishable tomato
const optTomate = sandbox.optimizeSale('tomate', 40, 'Thiès');
console.log('✓ optimizeSale tomate (40 caisses, Thiès):');
console.log('  - Best market:', optTomate.bestMarket.name);
console.log('  - Recommended day:', optTomate.bestDay, 'days');
console.log('  - Optimal Net Revenue:', optTomate.optimalNet.toLocaleString('fr-FR'), 'FCFA');
if (optTomate.bestDay > 15) throw new Error('Perishable tomato should not recommend long storage');

// 6.4 Multi-lingual Conseiller IA queries
const respFr = sandbox.getResponse('Comment conserver le soble ?');
console.log('✓ Advisor FR query ("Comment conserver le soble ?"):', respFr.lang, '->', respFr.text.slice(0, 55) + '...');
if (respFr.lang !== 'fr' || !respFr.text) throw new Error('Advisor FR query failed');

const respWo = sandbox.getResponse('Naka lañuy dencé soble ?');
console.log('✓ Advisor Wolof query ("Naka lañuy dencé soble ?"):', respWo.lang, '->', respWo.text.slice(0, 55) + '...');
if (respWo.lang !== 'wo' || !respWo.text) throw new Error('Advisor Wolof query failed');

const respEn = sandbox.getResponse('When should I sell my peanuts?');
console.log('✓ Advisor English query ("When should I sell my peanuts?"):', respEn.lang, '->', respEn.text.slice(0, 55) + '...');
if (respEn.lang !== 'en' || !respEn.text) throw new Error('Advisor English query failed');

const respBana = sandbox.getResponse('Comment négocier avec les bana-bana ?');
console.log('✓ Advisor negotiation query:', respBana.lang, '->', respBana.text.slice(0, 55) + '...');
if (!respBana.text) throw new Error('Advisor negotiation query failed');

// 6.5 Lifecycle initApp() test
sandbox.initApp();
console.log('✓ initApp() lifecycle simulation executed without errors');

console.log('\n===========================================');
console.log('🏆 ALL TESTS PASSED SUCCESSFULLY (100%)');
console.log('===========================================');
