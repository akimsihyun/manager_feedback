const fs = require('fs');
const path = require('path');
const envContent = fs.readFileSync(path.resolve(__dirname, '..', '.env.local'), 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) envVars[m[1].trim()] = m[2].trim();
});

const API_KEY = envVars.PLAB_API_KEY;
const BASE_URL = (envVars.PLAB_API_BASE_URL || 'https://vibe.techin.pe.kr').replace(/\/$/, '');

async function q(sql) {
    const res = await fetch(BASE_URL + '/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY.trim() },
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
    console.log('=== 1) 리포트 쿼리 결과 (aggregate) ===\n');
    const agg = await q("SELECT ROUND(AVG(mr.point), 1) as avg_point, COUNT(*) as cnt FROM manager_review mr JOIN `match` m ON mr.match_id = m.id WHERE m.manager_id = 17456 AND m.schedule >= '2026-02-01 00:00:00' AND m.schedule <= '2026-02-28 23:59:59'");
    console.log('avg_point:', agg[0]?.avg_point, '| count:', agg[0]?.cnt);

    console.log('\n=== 2) 2월 매치 목록 ===\n');
    const matches = await q("SELECT m.id, m.schedule, m.name FROM `match` m WHERE m.manager_id = 17456 AND m.schedule >= '2026-02-01 00:00:00' AND m.schedule <= '2026-02-28 23:59:59' ORDER BY m.schedule ASC");
    console.log(matches.length + '건');
    for (const m of matches) {
        console.log('  match_id=' + m.id + ' | schedule=' + m.schedule + ' | ' + (m.name || ''));
    }

    console.log('\n=== 3) 매치별 리뷰 상세 ===\n');
    let allSum = 0, allCount = 0;
    for (const m of matches) {
        const reviews = await q("SELECT mr.id, mr.point, mr.created_at FROM manager_review mr WHERE mr.match_id = " + m.id + " ORDER BY mr.created_at ASC");
        let mSum = 0;
        console.log('매치 ' + m.id + ' (' + m.schedule + ') - 리뷰 ' + reviews.length + '건:');
        for (const r of reviews) {
            console.log('  review_id=' + r.id + ' point=' + r.point + ' created_at=' + r.created_at);
            mSum += Number(r.point);
            allSum += Number(r.point);
            allCount++;
        }
        if (reviews.length > 0) {
            console.log('  -> 매치 평균: ' + (mSum / reviews.length).toFixed(2));
        }
        console.log('');
    }
    console.log('=== 4) 종합 계산 ===');
    console.log('총 리뷰: ' + allCount + '건');
    console.log('합산: ' + allSum);
    if (allCount > 0) {
        console.log('전체 평균(JS): ' + (allSum / allCount).toFixed(2));
        console.log('ROUND(1): ' + (Math.round((allSum / allCount) * 10) / 10).toFixed(1));
    }

    console.log('\n=== 5) point 분포 ===\n');
    const dist = await q("SELECT mr.point, COUNT(*) as cnt FROM manager_review mr JOIN `match` m ON mr.match_id = m.id WHERE m.manager_id = 17456 AND m.schedule >= '2026-02-01 00:00:00' AND m.schedule <= '2026-02-28 23:59:59' GROUP BY mr.point ORDER BY mr.point");
    for (const d of dist) {
        console.log('  point=' + d.point + ' -> ' + d.cnt + '건');
    }

    console.log('\n=== 6) 매치별 평균 비교 ===\n');
    const matchAvgs = await q("SELECT m.id, ROUND(AVG(mr.point), 1) as mavg, COUNT(*) as cnt FROM manager_review mr JOIN `match` m ON mr.match_id = m.id WHERE m.manager_id = 17456 AND m.schedule >= '2026-02-01 00:00:00' AND m.schedule <= '2026-02-28 23:59:59' GROUP BY m.id ORDER BY m.id");
    let avgOfAvgs = 0;
    for (const ma of matchAvgs) {
        console.log('  match ' + ma.id + ' avg=' + ma.mavg + ' (리뷰 ' + ma.cnt + '건)');
        avgOfAvgs += Number(ma.mavg);
    }
    if (matchAvgs.length > 0) {
        console.log('\n매치 평균의 평균(비가중): ' + (avgOfAvgs / matchAvgs.length).toFixed(2));
    }
}

main().catch(console.error);
