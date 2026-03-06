interface PlabQueryResult {
    columns?: string[];
    rows?: any[][];
}

interface PlabResponse {
    success: boolean;
    data: any; // Can be object array or PlabQueryResult
    rowCount?: number;
    executionTime?: string;
}

/**
 * Executes a SQL query against the Plab API.
 * 
 * IMPORTANT: If you change PLAB_API_KEY or PLAB_API_BASE_URL in .env.local,
 * you MUST restart the development server (npm run dev) for changes to take effect.
 */
export async function executePlabQuery(sql: string, params: any[] = []): Promise<any[]> {
    const apiKey = process.env.PLAB_API_KEY;
    // Default base URL as specified by the user
    const baseUrl = (process.env.PLAB_API_BASE_URL ?? "https://vibe.techin.pe.kr").replace(/\/$/, "");

    if (!apiKey) {
        throw new Error('PLAB_API_KEY is not configured in .env.local');
    }

    console.log(`[Plab] Executing query via ${baseUrl}/api/query`);
    console.log('[Plab] SQL snippet:', sql.trim().substring(0, 50) + '...');

    const response = await fetch(`${baseUrl}/api/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey.trim(), // As required by the API
        },
        body: JSON.stringify({
            query: sql, // Required field
            params: params
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[Plab] API error:', response.status, errorText);

        if (response.status === 401) {
            throw new Error(`Plab API error: 401 - Authentication failed. Please check your X-API-Key and restart the server.`);
        }

        throw new Error(`Plab API error: ${response.status} - ${errorText}`);
    }

    const result: PlabResponse = await response.json();

    if (!result.success || !result.data) {
        console.warn('[Plab] API returned unsuccessful response or no data:', result);
        return [];
    }

    // Handle both formats: Direct object array or columns/rows structure
    if (Array.isArray(result.data)) {
        // Format 1: Direct array of objects [ {col1: val1, ...}, ... ]
        console.log('[Plab] Query returned', result.data.length, 'rows (object format)');
        return result.data;
    } else if (result.data.columns && result.data.rows) {
        // Format 2: Columns and rows structure { columns: [...], rows: [[...], ...] }
        const { columns, rows } = result.data;
        const objects = rows.map((row: any[]) => {
            const obj: any = {};
            columns.forEach((col: string, idx: number) => {
                obj[col] = row[idx];
            });
            return obj;
        });
        console.log('[Plab] Query returned', objects.length, 'rows (columns/rows format)');
        return objects;
    }

    console.warn('[Plab] API returned unrecognized data format:', result.data);
    return [];
}
