/**
 * Offscreen document — runs Transformers.js (WebAssembly) for semantic search.
 *
 * Lifecycle:
 *  1. Service worker creates this document on first search.
 *  2. On creation, starts loading the model + course embeddings immediately.
 *  3. Receives OFFSCREEN_SEARCH messages, returns ranked results via sendResponse.
 */

import { pipeline, env } from '../lib/transformers.min.js';

// Allow HuggingFace model download; browser caches it in IndexedDB after first use.
env.allowRemoteModels = true;
env.useBrowserCache = true;

let extractor = null;      // Transformers.js feature-extraction pipeline
let coursesData = null;    // { dims, count, courses[] }
let embeddingMatrix = null; // Float32Array of shape [count × dims]
let initPromise = null;

async function init() {
    // Load model — downloads from HuggingFace on first use (~23 MB), then cached.
    extractor = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        { quantized: true }
    );

    // Load pre-computed course embeddings bundled with the extension.
    const url = chrome.runtime.getURL('data/courses_embeddings.json');
    const resp = await fetch(url);
    const json = await resp.json();

    // Decode base64 → Float32Array
    const binary = atob(json.embeddings);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    embeddingMatrix = new Float32Array(bytes.buffer);

    coursesData = {
        dims: json.dims,
        count: json.count,
        courses: json.courses,
    };
    // json.embeddings no longer needed; let GC collect it.
}

function ensureInit() {
    if (!initPromise) initPromise = init();
    return initPromise;
}

async function search(query) {
    await ensureInit();

    // Embed the query (same model + pooling + normalization as Python script).
    const output = await extractor(query, { pooling: 'mean', normalize: true });
    const queryVec = output.data; // Float32Array, length = dims

    // Dot product = cosine similarity (both vectors are L2-normalized).
    const dims = coursesData.dims;
    const n = coursesData.count;
    const scores = new Float32Array(n);

    // Keyword boost: if query words appear in the course id or name, add up to
    // 0.40 on top of the semantic score so exact/near-exact matches rank higher.
    const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    function keywordBoost(course) {
        if (queryWords.length === 0) return 0;
        const target = (course.course_id + ' ' + course.name).toLowerCase();
        const hits = queryWords.filter((w) => target.includes(w)).length;
        return (hits / queryWords.length) * 0.40;
    }

    for (let i = 0; i < n; i++) {
        let dot = 0.0;
        const offset = i * dims;
        for (let j = 0; j < dims; j++) {
            dot += queryVec[j] * embeddingMatrix[offset + j];
        }
        scores[i] = Math.min(1.0, dot + keywordBoost(coursesData.courses[i]));
    }

    // Sort indices by score descending.
    const indices = Array.from({ length: n }, (_, i) => i);
    indices.sort((a, b) => scores[b] - scores[a]);

    // Keep results above the noise threshold; always include at least the top result.
    const MIN_SCORE = 0.30;
    const MAX_RESULTS = 5;
    let top = indices.filter((i) => scores[i] >= MIN_SCORE).slice(0, MAX_RESULTS);
    if (top.length === 0 && indices.length > 0) top = [indices[0]];

    return {
        query,
        results: top.map((i) => ({
            course_id: coursesData.courses[i].course_id,
            dept_id: coursesData.courses[i].dept_id,
            title: coursesData.courses[i].name,
            match_score: Math.round(scores[i] * 100),
            description: coursesData.courses[i].description,
        })),
    };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type !== 'OFFSCREEN_SEARCH') return false;

    search(msg.query)
        .then((data) => sendResponse({ ok: true, data }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));

    return true; // keep message channel open for async response
});

// Pre-warm: start loading immediately so first search is faster.
ensureInit().catch(console.error);
