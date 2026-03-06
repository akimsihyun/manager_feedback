const https = require('https');

console.log('[STEP 1] script start');

const API_KEY = 'x-plab-38d7df7c0b981f243f919901ac00b088fbd2432cd94e3dc95c06e5809f9ab881';
const BASE_URL = 'vibe.techin.pe.kr';

console.log('[STEP 2] env loaded');

function query(sql) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ query: sql, params: [] });
        console.log('[STEP 3] request config ready');

        const options = {
            hostname: BASE_URL,
            port: 443,
            path: '/api/query',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
                'Content-Length': data.length
            },
            timeout: 10000 // 10 seconds timeout
        };

        console.log('[STEP 4] fetch start');
        const req = https.request(options, (res) => {
            console.log(`[STEP 5] response status received: ${res.statusCode}`);

            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                console.log('[STEP 6] response body received');
                try {
                    const result = JSON.parse(body);
                    console.log('[STEP 7] json parsed');
                    if (result.success) {
                        if (Array.isArray(result.data)) {
                            resolve(result.data);
                        } else if (result.data.columns && result.data.rows) {
                            const { columns, rows } = result.data;
                            resolve(rows.map(row => {
                                const obj = {};
                                columns.forEach((col, i) => obj[col] = row[i]);
                                return obj;
                            }));
                        } else {
                            resolve([]);
                        }
                    } else {
                        reject({ type: 'auth/permission', message: result.error || 'Query failed' });
                    }
                } catch (e) {
                    reject({ type: 'json parse', message: e.message });
                }
            });
        });

        req.on('timeout', () => {
            req.destroy();
            reject({ type: 'timeout', message: 'Request timed out after 10s' });
        });

        req.on('error', (e) => {
            reject({ type: 'network', message: e.message });
        });

        req.write(data);
        req.end();
    });
}

async function run() {
    try {
        const managerId = 17456;
        const start = '2026-02-01 00:00:00';
        const end = '2026-03-01 00:00:00';

        // We only do one simple query for diagnosis
        await query(`SELECT 1 as probe`);

        console.log('[STEP 8] script end');
    } catch (e) {
        console.error(`\n--- ERROR DIAGNOSIS ---`);
        console.error(`Error Type: ${e.type || 'unknown'}`);
        console.error(`Message: ${e.message || e}`);
    }
}

run();
