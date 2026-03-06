import { NextRequest, NextResponse } from 'next/server';
import { executePlabQuery } from '@/lib/plab-client';
import { ManagerReport, ReviewItem, RatingTrend } from '@/types/report';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ manager_id: string }> }
) {
  try {
    // Await params for Next.js 15 compatibility
    const { manager_id: raw_manager_id } = await params;

    // Helper to resolve potentially Base64 encoded ID
    const resolveManagerId = (id: string) => {
      if (!id) return id;
      if (/^\d+$/.test(id)) return id;
      try {
        const normalized = decodeURIComponent(id).trim();
        const decoded = Buffer.from(normalized, 'base64').toString('utf-8');
        if (/^\d+$/.test(decoded)) return decoded;
      } catch (e) { }
      return id;
    };

    const manager_id = resolveManagerId(raw_manager_id);
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get('year') || '2026');
    const month = parseInt(searchParams.get('month') || '2');

    console.log(`[API] Fetching report for manager_id=${manager_id} (raw=${raw_manager_id}), year=${year}, month=${month}`);

    // Calculate date range: [startDate, nextMonthStart) (Stable style)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonthStart = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01 00:00:00`;

    const dateFilter = `m.schedule >= '${startDate}' AND m.schedule < '${nextMonthStart}'`;

    // 1. Check if manager exists
    let managerResult;
    try {
      const managerQuery = `
        SELECT id, name 
        FROM manager 
        WHERE id = ?
        LIMIT 1
      `;
      managerResult = await executePlabQuery(managerQuery, [manager_id]);
    } catch (err: any) {
      console.error('[API] Database lookup error:', err);
      // DNS / Network errors
      const isDnsError = err.message?.includes('ENOTFOUND') ||
        err.message?.includes('EAI_AGAIN') ||
        err.cause?.code === 'ENOTFOUND' ||
        err.cause?.code === 'EAI_AGAIN';

      if (isDnsError) {
        return NextResponse.json(
          {
            error: "DATA_SOURCE_UNREACHABLE",
            detail: err.message,
            baseUrl: process.env.PLAB_API_BASE_URL ?? "https://vibe.techin.pe.kr"
          },
          { status: 502 }
        );
      }
      throw err;
    }

    if (managerResult.length === 0) {
      console.log(`[API] Manager ${manager_id} not found in database`);
      return NextResponse.json(
        { error: 'Manager not found' },
        { status: 404 }
      );
    }

    const manager = {
      id: parseInt(manager_id),
      name: managerResult[0].name
    };

    console.log(`[API] Manager found: ${manager.name}`);

    // 2. Count matches for the month
    const matchCountQuery = `
      SELECT COUNT(*) as count
      FROM \`match\` m
      WHERE m.manager_id = ?
        AND m.schedule >= ? AND m.schedule < ?
    `;
    const matchCountResult = await executePlabQuery(matchCountQuery, [manager_id, startDate, nextMonthStart]);
    const matchCount = matchCountResult[0]?.count || 0;
    console.log(`[API] Match count for ${year}-${month}: ${matchCount}`);

    // 3. Calculate monthly average rating (Only is_active = 1)
    const monthlyRatingQuery = `
      SELECT ROUND(AVG(mr.point), 1) as avg_point
      FROM manager_review mr
      JOIN \`match\` m ON mr.match_id = m.id
      WHERE m.manager_id = ?
        AND m.schedule >= ? AND m.schedule < ?
        AND mr.is_active = 1
    `;
    const monthlyRatingResult = await executePlabQuery(monthlyRatingQuery, [manager_id, startDate, nextMonthStart]);
    const monthly_avg_point = monthlyRatingResult[0]?.avg_point || null;
    console.log(`[API] Monthly avg rating: ${monthly_avg_point}`);

    // 4. Get 3-month rating trend (Only is_active = 1)
    const chart_3months: RatingTrend[] = [];
    for (let i = 2; i >= 0; i--) {
      let trendMonth = month - i;
      let trendYear = year;
      if (trendMonth <= 0) {
        trendMonth += 12;
        trendYear -= 1;
      }

      const tStartDate = `${trendYear}-${String(trendMonth).padStart(2, '0')}-01 00:00:00`;
      const tNextMonth = trendMonth === 12 ? 1 : trendMonth + 1;
      const tNextYear = trendMonth === 12 ? trendYear + 1 : trendYear;
      const tNextMonthStart = `${tNextYear}-${String(tNextMonth).padStart(2, '0')}-01 00:00:00`;

      const trendQuery = `
        SELECT ROUND(AVG(mr.point), 1) as avg_point
        FROM manager_review mr
        JOIN \`match\` m ON mr.match_id = m.id
        WHERE m.manager_id = ?
          AND m.schedule >= ?
          AND m.schedule < ?
          AND mr.is_active = 1
      `;

      const trendResult = await executePlabQuery(trendQuery, [manager_id, tStartDate, tNextMonthStart]);
      chart_3months.push({
        month: `${trendYear}-${String(trendMonth).padStart(2, '0')}`,
        avg_point: trendResult[0]?.avg_point || null,
      });
    }

    // 5. Get good review top 5 (Original list - include all if exists)
    const goodReviewQuery = `
      SELECT 
        gmt.name,
        COUNT(*) as count
      FROM good_manager gm
      JOIN good_manager_type gmt ON gm.good_manager_type_id = gmt.id
      JOIN manager_review mr ON gm.manager_review_id = mr.id
      JOIN \`match\` m ON mr.match_id = m.id
      WHERE m.manager_id = ?
        AND m.schedule >= ? AND m.schedule < ?
      GROUP BY gmt.name
      ORDER BY count DESC
      LIMIT 5
    `;
    const goodReviewResult = await executePlabQuery(goodReviewQuery, [manager_id, startDate, nextMonthStart]);
    const good_review_top5: ReviewItem[] = goodReviewResult.map(row => ({
      name: row.name,
      count: parseInt(row.count),
    }));
    console.log(`[API] Good reviews: ${good_review_top5.length} types`);

    // 6. Get bad review (negative tags) using bad_manager table (Original list - include all if exists)
    const badReviewQuery = `
      SELECT 
        bmt.name,
        COUNT(*) as count
      FROM bad_manager bm
      JOIN bad_manager_type bmt ON bm.bad_manager_type_id = bmt.id
      JOIN manager_review mr ON bm.manager_review_id = mr.id
      JOIN \`match\` m ON mr.match_id = m.id
      WHERE m.manager_id = ?
        AND m.schedule >= ? AND m.schedule < ?
      GROUP BY bmt.name
      ORDER BY count DESC
      LIMIT 10
    `;
    const badReviewResult = await executePlabQuery(badReviewQuery, [manager_id, startDate, nextMonthStart]);
    let bad_review_top3: ReviewItem[] = badReviewResult.map(row => ({
      name: row.name,
      count: parseInt(row.count),
    }));

    if (bad_review_top3.length > 3) {
      const cutoffCount = bad_review_top3[2].count;
      bad_review_top3 = bad_review_top3.filter((item, index) => index < 3 || item.count === cutoffCount);
    }

    const hasData = matchCount > 0 || good_review_top5.length > 0 || bad_review_top3.length > 0;

    const report: ManagerReport = {
      manager,
      year,
      month,
      monthly_avg_point,
      chart_3months,
      good_review_top5,
      bad_review_top3,
      hasData,
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
