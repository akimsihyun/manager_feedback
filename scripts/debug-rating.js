/**
 * Debug script to investigate rating discrepancy for manager_id 17456
 * No external dependencies - reads .env.local manually
 */
const fs = require('fs');
const path = require('path');

// Parse .env.local manually
const envContent = fs.readFileSync(path.resolve(__dirname, '..', '.env.local'), 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) envVars[match[1].trim()] = match[2].trim();
});

const API_KEY = envVars.PLAB_API_KEY;
const BASE_URL = (envVars.PLAB_API_BASE_URL || "https://vibe.techin.pe.kr").replace(/\/$/, "");

async function query(sql) {
    const res = await fetch(`${BASE_URL}/api/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY.trim(),
        },
        body: JSON.stringify({ query: sql, params: [] }),
    });
    const result = await res.json();
    if (!result.success || !result.data) return [];
    if (Array.isArray(result.data)) return result.data;
    if (result.data.columns && result.data.rows) {
        return result.data.rows.map((row) => {
            const obj = {};
            result.data.columns.forEach((col, idx) => { obj[col] = row[idx]; });
            return obj;
        });
    }
    return [];
}

async function main() {
    const managerId = 17456;

    console.log('=== 리포트에서 사용하는 정확한 SQL ===\n');

    // This is the EXACT query from route.ts line 82-88
    const reportSQL = `
        SELECT ROUND(AVG(mr.point), 1) as avg_point
        FROM manager_review mr
        JOIN \`match\` m ON mr.match_id = m.id
        WHERE m.manager_id = ${managerId}
          AND m.schedule >= '2026-02-01 00:00:00'
          AND m.schedule <= '2026-02-28 23:59:59'
    `;
    console.log('리포트 평점 SQL:');
    console.log(reportSQL);

    const reportResult = await query(reportSQL);
    console.log('리포트 결과:', JSON.stringify(reportResult));

    // Get individual reviews used in the average
    console.log('\n=== 리포트 평균 계산에 사용된 개별 리뷰 ===\n');

    const reviewsSQL = `
        SELECT mr.id as review_id, mr.point, mr.match_id, mr.created_at,
               m.schedule, m.name as match_name
        FROM manager_review mr
        JOIN \`match\` m ON mr.match_id = m.id
        WHERE m.manager_id = ${managerId}
          AND m.schedule >= '2026-02-01 00:00:00'
          AND m.schedule <= '2026-02-28 23:59:59'
        ORDER BY m.schedule ASC, mr.created_at ASC
    `;
    const reviews = await query(reviewsSQL);
    console.log(`총 리뷰 수: ${reviews.length}건\n`);

    let sum = 0;
    let count = 0;
    let prevMatchId = null;
    for (const r of reviews) {
        if (r.match_id !== prevMatchId) {
            console.log(`\n--- 매치 ${r.match_id} | schedule: ${r.schedule} | ${r.match_name || ''} ---`);
            prevMatchId = r.match_id;
        }
        const pt = Number(r.point);
        sum += pt;
        count++;
        console.log(`  review_id: ${r.review_id} | point: ${r.point} | created_at: ${r.created_at}`);
    }

    console.log(`\n=== 계산 결과 ===`);
    console.log(`총 리뷰: ${count}건`);
    console.log(`합산: ${sum}`);
    if (count > 0) {
        console.log(`평균 (JS): ${(sum / count).toFixed(2)}`);
        console.log(`평균 (ROUND 1): ${(Math.round((sum / count) * 10) / 10).toFixed(1)}`);
    }

    // Match-level averages
    console.log('\n=== 매치별 평균 ===\n');
    const matchAvgSQL = `
        SELECT m.id as match_id, m.schedule, m.name as match_name,
               ROUND(AVG(mr.point), 1) as match_avg, COUNT(*) as review_count
        FROM manager_review mr
        JOIN \`match\` m ON mr.match_id = m.id
        WHERE m.manager_id = ${managerId}
          AND m.schedule >= '2026-02-01 00:00:00'
          AND m.schedule <= '2026-02-28 23:59:59'
        GROUP BY m.id, m.schedule, m.name
        ORDER BY m.schedule ASC
    `;
    const matchAvgs = await query(matchAvgSQL);
    let matchSum = 0;
    let matchCount = 0;
    for (const ma of matchAvgs) {
        console.log(`  매치 ${ma.match_id} | schedule: ${ma.schedule} | avg: ${ma.match_avg} | 리뷰수: ${ma.review_count} | ${ma.match_name || ''}`);
        matchSum += Number(ma.match_avg);
        matchCount++;
    }
    if (matchCount > 0) {
        console.log(`\n매치별 평균의 평균: ${(matchSum / matchCount).toFixed(2)}`);
    }

    // Alt range check
    const altRangeSQL = `
        SELECT ROUND(AVG(mr.point), 1) as avg_point, COUNT(*) as cnt
        FROM manager_review mr
        JOIN \`match\` m ON mr.match_id = m.id
        WHERE m.manager_id = ${managerId}
          AND m.schedule >= '2026-02-01'
          AND m.schedule < '2026-03-01'
    `;
    const altResult = await query(altRangeSQL);
    console.log(`\n대체 범위 (>= 2/1 AND < 3/1): avg=${altResult[0]?.avg_point}, count=${altResult[0]?.cnt}`);

    // Check for status/deleted columns
    console.log('\n=== 테이블 상태 컬럼 확인 ===\n');

    const matchColsSQL = `
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'match' 
        AND (COLUMN_NAME LIKE '%delete%' OR COLUMN_NAME LIKE '%status%' OR COLUMN_NAME LIKE '%cancel%')
    `;
    const matchCols = await query(matchColsSQL);
    console.log('match 상태 관련 컬럼:', matchCols.map(c => c.COLUMN_NAME).join(', ') || '없음');

    const revColsSQL = `
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'manager_review' 
        AND (COLUMN_NAME LIKE '%delete%' OR COLUMN_NAME LIKE '%status%' OR COLUMN_NAME LIKE '%active%')
    `;
    const revCols = await query(revColsSQL);
    console.log('manager_review 상태 관련 컬럼:', revCols.map(c => c.COLUMN_NAME).join(', ') || '없음');

    // If match has deleted_at, check for soft-deleted matches
    if (matchCols.some(c => c.COLUMN_NAME === 'deleted_at')) {
        const deletedSQL = `
            SELECT m.id, m.schedule, m.deleted_at
            FROM \`match\` m
            WHERE m.manager_id = ${managerId}
              AND m.schedule >= '2026-02-01 00:00:00'
              AND m.schedule <= '2026-02-28 23:59:59'
              AND m.deleted_at IS NOT NULL
        `;
        const deletedResult = await query(deletedSQL);
        console.log(`\n삭제된(soft-delete) 매치: ${deletedResult.length}건`);
        for (const d of deletedResult) {
            console.log(`  매치 ${d.id} | schedule: ${d.schedule} | deleted_at: ${d.deleted_at}`);
        }
    }

    // If match has status, check cancelled matches
    if (matchCols.some(c => c.COLUMN_NAME === 'status')) {
        const statusSQL = `
            SELECT m.id, m.schedule, m.status, m.name,
                   ROUND(AVG(mr.point),1) as avg, COUNT(mr.id) as cnt
            FROM \`match\` m
            LEFT JOIN manager_review mr ON mr.match_id = m.id
            WHERE m.manager_id = ${managerId}
              AND m.schedule >= '2026-02-01 00:00:00'
              AND m.schedule <= '2026-02-28 23:59:59'
            GROUP BY m.id, m.schedule, m.status, m.name
            ORDER BY m.schedule
        `;
        const statusResult = await query(statusSQL);
        console.log('\n매치별 status:');
        for (const s of statusResult) {
            console.log(`  매치 ${s.id} | status: ${s.status} | schedule: ${s.schedule} | avg: ${s.avg} | 리뷰수: ${s.cnt} | ${s.name || ''}`);
        }
    }
}

main().catch(console.error);
