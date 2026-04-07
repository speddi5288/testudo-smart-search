/**
 * Service worker — manages the offscreen document and relays search messages.
 *
 * Message flow:
 *   content.js  →(SEARCH)→  service_worker.js  →(OFFSCREEN_SEARCH)→  offscreen.js
 *   offscreen.js →(sendResponse)→ service_worker.js →(sendResponse)→ content.js
 */

const OFFSCREEN_URL = chrome.runtime.getURL('offscreen/offscreen.html');

async function ensureOffscreen() {
    try {
        await chrome.offscreen.createDocument({
            url: OFFSCREEN_URL,
            reasons: ['WORKERS'],
            justification: 'Run Transformers.js WebAssembly for semantic course search',
        });
    } catch (e) {
        // Throws if the document already exists — that's fine, ignore it.
        if (!e.message?.includes('already') && !e.message?.includes('single')) throw e;
    }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type !== 'SEARCH') return false;

    (async () => {
        try {
            await ensureOffscreen();
            const resp = await chrome.runtime.sendMessage({
                type: 'OFFSCREEN_SEARCH',
                query: msg.query,
            });
            sendResponse(resp);
        } catch (err) {
            sendResponse({ ok: false, error: err.message });
        }
    })();

    return true; // keep message channel open for async response
});
