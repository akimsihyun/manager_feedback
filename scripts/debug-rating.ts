/**
 * Debug script to investigate rating discrepancy for manager_id 17456
 * Run: npx tsx scripts/debug-rating.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.PLAB_API_KEY!;
const BASE_URL = (process.env.PLAB_API_BASE_URL ?? "https://vibe.techin.pe.kr").replace(/\/$/, "");

async function query(sql: string): Promise<any[]> {
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
        return result.data.rows.map((row: any[]) => {
            const obj: any = {};
            result.data.columns.forEach((col: string, idx: number) => { obj[col] = row[idx]; });
            return obj;
        });
    }
    return [];
}

async function main() {
    const managerId = 17456;
    const year = 2026;
    const month = 2;

    console.log(`\n=== Manager ${managerId} - ${year}년 ${month}월 평점 조사 ===\n`);

    // 1. Report's current query (match.schedule based)
    const avgBySchedule = await query(`
        SELECT ROUND(AVG(mr.point), 1) as avg_point, COUNT(*) as review_count
        FROM manager_review mr
        JOIN \`match\` m ON mr.match_id = m.id
        WHERE m.manager_id = ${managerId}
          AND m.schedule >= '${year}-${String(month).padStart(2, '0')}-01 00:00:00'
          AND m.schedule <= '${year}-${String(month).padStart(2, '0')}-28 23:59:59'
    `);
    console.log('1) 리포트 쿼리 결과 (match.schedule 기준):');
    console.log('   avg_point:', avgBySchedule[0]?.avg_point, '| review_count:', avgBySchedule[0]?.review_count);

    // 2. Average by created_at
    const avgByCreatedAt = await query(`
        SELECT ROUND(AVG(mr.point), 1) as avg_point, COUNT(*) as review_count
        FROM manager_review mr
        JOIN \`match\` m ON mr.match_id = m.id
        WHERE m.manager_id = ${managerId}
          AND mr.created_at >= '${year}-${String(month).padStart(2, '0')}-01 00:00:00'
          AND mr.created_at <= '${year}-${String(month).padStart(2, '0')}-28 23:59:59'
    `);
    console.log('\n2) created_at 기준 필터링 결과:');
    console.log('   avg_point:', avgByCreatedAt[0]?.avg_point, '| review_count:', avgByCreatedAt[0]?.review_count);

    // 3. Match list for February
    const matches = await query(`
        SELECT m.id as match_id, m.schedule, m.name as match_name
        FROM \`match\` m
        WHERE m.manager_id = ${managerId}
          AND m.schedule >= '${year}-${String(month).padStart(2, '0')}-01 00:00:00'
          AND m.schedule <= '${year}-${String(month).padStart(2, '0')}-28 23:59:59'
        ORDER BY m.schedule ASC
    `);
    console.log(`\n3) 2월 매치 목록 (${matches.length}건):`);
    for (const m of matches) {
        console.log(`   매치ID: ${m.match_id} | 일정: ${m.schedule} | ${m.match_name || ''}`);
    }

    // 4. Reviews per match with created_at
    console.log('\n4) 각 매치별 리뷰 상세:');
    for (const m of matches) {
        const reviews = await query(`
            SELECT mr.id, mr.point, mr.created_at, mr.match_id
            FROM manager_review mr
            WHERE mr.match_id = ${m.match_id}
            ORDER BY mr.created_at ASC
        `);
        const avgPt = reviews.length > 0
            ? (reviews.reduce((s: number, r: any) => s + Number(r.point), 0) / reviews.length).toFixed(2)
            : 'N/A';
        console.log(`\n   매치 ${m.match_id} (${m.schedule}):`);
        console.log(`   리뷰 ${reviews.length}건 | 평균: ${avgPt}`);
        for (const r of reviews) {
            console.log(`     - point: ${r.point} | created_at: ${r.created_at}`);
        }
    }

    // 5. Check if any reviews for Feb matches were created in March
    const lateReviews = await query(`
        SELECT mr.id, mr.point, mr.created_at, mr.match_id, m.schedule
        FROM manager_review mr
        JOIN \`match\` m ON mr.match_id = m.id
        WHERE m.manager_id = ${managerId}
          AND m.schedule >= '${year}-${String(month).padStart(2, '0')}-01 00:00:00'
          AND m.schedule <= '${year}-${String(month).padStart(2, '0')}-28 23:59:59'
          AND mr.created_at >= '${year}-03-01 00:00:00'
        ORDER BY mr.created_at ASC
    `);
    console.log(`\n5) 2월 매치인데 3월에 작성된 리뷰 (${lateReviews.length}건):`);
    for (const r of lateReviews) {
        console.log(`   review_id: ${r.id} | point: ${r.point} | match_schedule: ${r.schedule} | created_at: ${r.created_at}`);
    }

    // 6. Check if there's a "deleted" or "status" filter we might be missing
    const reviewColumns = await query(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'manager_review'
        ORDER BY ORDINAL_POSITION
    `);
    console.log('\n6) manager_review 테이블 컬럼 목록:');
    for (const col of reviewColumns) {
        console.log(`   ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    }

    // 7. Check match table for any status/deleted column
    const matchColumns = await query(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'match'
        ORDER BY ORDINAL_POSITION
    `);
    console.log('\n7) match 테이블 컬럼 목록:');
    for (const col of matchColumns) {
        console.log(`   ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    }
}

main().catch(console.error);
