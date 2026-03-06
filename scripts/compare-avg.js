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
        return result.data.rows.map(row => {
            const obj = {};
            result.data.columns.forEach((col, idx) => { obj[col] = row[idx]; });
            return obj;
        });
    }
    return [];
}

async function main() {
    const id = 17456;

    // A) 수정 전: 현재 route.ts의 원래 방식 (UTC 그대로 비교)
    const sqlBefore = `
      SELECT ROUND(AVG(mr.point), 1) as avg_point, COUNT(*) as cnt
      FROM manager_review mr
      JOIN \`match\` m ON mr.match_id = m.id
      WHERE m.manager_id = ${id}
        AND m.schedule >= '2026-02-01 00:00:00'
        AND m.schedule <= '2026-02-28 23:59:59'
    `;

    // B) 수정 후: KST 기준 (DATE_ADD +9h)
    const sqlAfterKST = `
      SELECT ROUND(AVG(mr.point), 1) as avg_point, COUNT(*) as cnt
      FROM manager_review mr
      JOIN \`match\` m ON mr.match_id = m.id
      WHERE m.manager_id = ${id}
        AND DATE_ADD(m.schedule, INTERVAL 9 HOUR) >= '2026-02-01'
        AND DATE_ADD(m.schedule, INTERVAL 9 HOUR) < '2026-03-01'
    `;

    // C) 역방향: 비교 날짜를 UTC로 변환 (KST 2/1 00:00 = UTC 1/31 15:00)
    const sqlAfterUTC = `
      SELECT ROUND(AVG(mr.point), 1) as avg_point, COUNT(*) as cnt
      FROM manager_review mr
      JOIN \`match\` m ON mr.match_id = m.id
      WHERE m.manager_id = ${id}
        AND m.schedule >= '2026-01-31 15:00:00'
        AND m.schedule < '2026-02-28 15:00:00'
    `;

    // D) 넓은 범위: 2/1 ~ 3/1 미만 (UTC 그대로)
    const sqlWide = `
      SELECT ROUND(AVG(mr.point), 1) as avg_point, COUNT(*) as cnt
      FROM manager_review mr
      JOIN \`match\` m ON mr.match_id = m.id
      WHERE m.manager_id = ${id}
        AND m.schedule >= '2026-02-01'
        AND m.schedule < '2026-03-01'
    `;

    console.log('=== manager_id 17456 / 2026년 2월 avg_point 비교 ===\n');

    const rA = await q(sqlBefore);
    console.log('A) 수정 전 (UTC, >= 2/1 AND <= 2/28 23:59:59):');
    console.log('   avg_point=' + rA[0]?.avg_point + '  cnt=' + rA[0]?.cnt);

    const rB = await q(sqlAfterKST);
    console.log('\nB) KST 변환 (DATE_ADD +9h, >= 2/1 AND < 3/1):');
    console.log('   avg_point=' + rB[0]?.avg_point + '  cnt=' + rB[0]?.cnt);

    const rC = await q(sqlAfterUTC);
    console.log('\nC) UTC 역변환 (>= 1/31 15:00 AND < 2/28 15:00):');
    console.log('   avg_point=' + rC[0]?.avg_point + '  cnt=' + rC[0]?.cnt);

    const rD = await q(sqlWide);
    console.log('\nD) 넓은 범위 (UTC, >= 2/1 AND < 3/1):');
    console.log('   avg_point=' + rD[0]?.avg_point + '  cnt=' + rD[0]?.cnt);

    // E) schedule 값 확인: DB에 저장된 실제 시간 확인
    console.log('\n=== 2월 전후 매치의 실제 schedule 값 ===\n');
    const schedules = await q(`
      SELECT m.id, m.schedule, m.name
      FROM \`match\` m
      WHERE m.manager_id = ${id}
        AND m.schedule >= '2026-01-31'
        AND m.schedule <= '2026-03-01'
      ORDER BY m.schedule ASC
    `);
    for (const s of schedules) {
        console.log('  match_id=' + s.id + '  schedule=' + s.schedule + '  ' + (s.name || ''));
    }
}

main().catch(console.error);
