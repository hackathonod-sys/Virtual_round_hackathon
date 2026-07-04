// frontend/js/api.js
const API_BASE = 'http://localhost/hackathon/backend/api.php';

/**
 * Universal API caller.
 * @param {string} endpoint  – e.g. 'attendance', 'employees', 'leaves'
 * @param {string} method    – GET, POST, PUT, DELETE
 * @param {object|null} body – payload for POST/PUT requests
 * @param {object|null} query – key-value pairs for URL query string
 * @returns {Promise<object>} parsed JSON response
 */
async function apiCall(endpoint, method = 'GET', body = null, query = null) {
    // Build URL
    let url = `${API_BASE}?path=${encodeURIComponent(endpoint)}`;
    if (query) {
        const qs = new URLSearchParams(query).toString();
        if (qs) url += `&${qs}`;
    }

    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include', // send session cookies
    };

    if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
        let errorMsg = 'Request failed';
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
        } catch (_) {}
        throw new Error(errorMsg);
    }
    return response.json();
}