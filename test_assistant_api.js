const assert = require('assert');
const assistantHandler = require('./api/assistant.js');

function responseMock() {
    return {
        headers: {},
        statusCode: 200,
        body: '',
        setHeader(name, value) { this.headers[name] = value; },
        end(body) { this.body = body; }
    };
}

async function call(method, body, ip = 'test-client') {
    const res = responseMock();
    await assistantHandler({ method, body, headers: { 'x-forwarded-for': ip } }, res);
    return { ...res, json: JSON.parse(res.body) };
}

async function run() {
    const originalKey = process.env.GEMINI_API_KEY;
    const originalProvider = process.env.AI_PROVIDER;
    const originalModel = process.env.GEMINI_MODEL;
    const originalFetch = global.fetch;
    delete process.env.GEMINI_API_KEY;
    delete process.env.AI_PROVIDER;
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';

    try {
        const status = await call('GET');
        assert.strictEqual(status.statusCode, 200);
        assert.strictEqual(status.json.configured, false);
        assert(!JSON.stringify(status.json).includes('GEMINI_API_KEY'));

        const unconfigured = await call('POST', { messages: [{ role: 'user', text: 'Bonjour' }] });
        assert.strictEqual(unconfigured.statusCode, 503);
        assert.strictEqual(unconfigured.json.error.code, 'not_configured');

        const unsupportedMethod = await call('DELETE');
        assert.strictEqual(unsupportedMethod.statusCode, 405);

        process.env.GEMINI_API_KEY = 'test-secret-never-returned';
        let capturedRequest;
        global.fetch = async (url, options) => {
            capturedRequest = { url: String(url), options, body: JSON.parse(options.body) };
            return {
                ok: true,
                status: 200,
                json: async () => ({ candidates: [{ content: { parts: [{ functionCall: {
                    name: 'run_sale_simulation',
                    args: { product: 'oignon', quantity: 50, region: 'Saint-Louis' }
                } }] } }] })
            };
        };
        const toolResponse = await call('POST', { messages: [{ role: 'user', text: '50 sacs d’oignons à Podor' }], context: { dataAreEstimates: true } }, 'tool-client');
        assert.strictEqual(toolResponse.statusCode, 200);
        assert.deepStrictEqual(toolResponse.json.action, { name: 'run_sale_simulation', args: { product: 'oignon', quantity: 50, region: 'Saint-Louis' } });
        assert(capturedRequest.url.includes('models/gemini-3.8-flash:generateContent'));
        assert(capturedRequest.url.includes(encodeURIComponent(process.env.GEMINI_API_KEY)));
        assert(!JSON.stringify(toolResponse.json).includes(process.env.GEMINI_API_KEY));
        assert.strictEqual(capturedRequest.body.tools[0].functionDeclarations.length, 5);
        assert.strictEqual(capturedRequest.body.contents[0].parts[0].text, '50 sacs d’oignons à Podor');
        assert.deepStrictEqual(assistantHandler.validateToolCall({ name: 'prepare_listing', args: {
            product: 'oignon', quantity: '50 sacs', price_per_unit: 19_500
        } }), { name: 'prepare_listing', args: { product: 'oignon', quantity: '50 sacs', price_per_unit: 19_500 } });

        const invalidInput = await call('POST', { messages: [] }, 'invalid-client');
        assert.strictEqual(invalidInput.statusCode, 400);
        const invalidJson = await call('POST', '{bad json', 'invalid-json-client');
        assert.strictEqual(invalidJson.statusCode, 400);

        global.fetch = async () => ({ ok: false, status: 429, json: async () => ({}) });
        const upstreamLimit = await call('POST', { messages: [{ role: 'user', text: 'Bonjour' }] }, 'limited-client');
        assert.strictEqual(upstreamLimit.statusCode, 429);

        global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ functionCall: { name: 'arbitrary_code', args: {} } }] } }] }) });
        const rejectedTool = await call('POST', { messages: [{ role: 'user', text: 'Test' }] }, 'invalid-tool-client');
        assert.strictEqual(rejectedTool.statusCode, 200);
        assert.strictEqual(rejectedTool.json.action, null);

        let rateLimited;
        for (let index = 0; index < 13; index++) {
            rateLimited = await call('POST', { messages: [{ role: 'user', text: 'Test' }] }, 'rate-limit-client');
        }
        assert.strictEqual(rateLimited.statusCode, 429);
        assert.strictEqual(rateLimited.json.error.code, 'rate_limited');

        console.log('PASS assistant API: no-key status, method/body validation, Gemini request, safe tools and upstream/internal rate limits');
    } finally {
        global.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
        else process.env.GEMINI_API_KEY = originalKey;
        if (originalProvider === undefined) delete process.env.AI_PROVIDER;
        else process.env.AI_PROVIDER = originalProvider;
        if (originalModel === undefined) delete process.env.GEMINI_MODEL;
        else process.env.GEMINI_MODEL = originalModel;
    }
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
