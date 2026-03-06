import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import HeadlineSection from '@/components/report/HeadlineSection';
import RotatingHeadline from '@/components/report/RotatingHeadline';
import SummaryRows from '@/components/report/SummaryRows';
import ReviewTabs from '@/components/report/ReviewTabs';
import CTAButton from '@/components/report/CTAButton';
import { ManagerReport } from '@/types/report';

interface PageProps {
    params: Promise<{
        manager_id: string;
    }>;
    searchParams: Promise<{
        year?: string;
        month?: string;
    }>;
}

interface FetchError {
    error: string;
    details?: string;
    baseUrl?: string;
}

async function getManagerReport(
    managerId: string,
    year: string,
    month: string,
    origin: string
): Promise<{ data?: ManagerReport; error?: FetchError; status: number }> {
    try {
        const url = `${origin}/api/manager-report/${managerId}?year=${year}&month=${month}`;
        console.log(`[Page] Fetching report from: ${url}`);

        const response = await fetch(url, { cache: 'no-store' });

        if (response.status === 404) {
            return { status: 404 };
        }

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('[Page] JSON parse error. Body snippet:', responseText.substring(0, 100));
            return { status: response.status, error: { error: 'PARSE_ERROR', details: responseText.substring(0, 200) } };
        }

        if (!response.ok) {
            return { error: data, status: response.status };
        }

        return { data, status: 200 };
    } catch (error) {
        console.error('[Page] Fetch exception:', error);
        return { status: 500, error: { error: 'FETCH_ERROR', details: error instanceof Error ? error.message : String(error) } };
    }
}

export default async function ManagerReportPage({ params, searchParams }: PageProps) {
    const { manager_id } = await params;
    const resolvedSearchParams = await searchParams;

    // origin detection
    const host = (await headers()).get('host');
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const origin = `${protocol}://${host}`;

    const year = resolvedSearchParams.year || '2026';
    const month = resolvedSearchParams.month || '2';

    const result = await getManagerReport(manager_id, year, month, origin);

    // 1. Handle API Errors (not 404, not 200)
    if (result.status !== 200 && result.status !== 404) {
        const isQuotaError = result.error?.details?.includes('429') || result.error?.details?.includes('할당량');

        return (
            <div className="container">
                <div className="card">
                    <h1 className="headline" style={{ color: 'var(--color-danger)' }}>
                        {isQuotaError ? '요청 한도 초과' : '데이터를 가져올 수 없어요'}
                    </h1>
                    <div className="empty-state text-left">
                        <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {isQuotaError
                                ? '일일 데이터 조회 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
                                : '잠시 후 다시 시도하거나, 네트워크 연결을 확인해주세요.'}
                        </p>
                        <div style={{ marginTop: 'var(--spacing-lg)', padding: '12px', background: '#f8f9fa', borderRadius: '8px', fontSize: '12px', color: '#6b7280', overflowWrap: 'break-word' }}>
                            <p><strong>Status:</strong> {result.status}</p>
                            <p><strong>Error:</strong> {result.error?.error}</p>
                            {result.error?.details && <p style={{ marginTop: '4px' }}><strong>Details:</strong> {result.error.details}</p>}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Manager not found (404)
    if (result.status === 404) {
        notFound();
    }

    // 3. Success state
    const report = result.data!;

    // 4. Empty data state (manager exists but no matches)
    if (!report.hasData) {
        return (
            <div className="container">
                <div className="card">
                    <h1 className="headline" style={{ color: 'var(--color-text-primary)' }}>
                        {report.manager.name} 매니저님의<br />
                        {report.month}월 리포트
                    </h1>
                    <div className="empty-state">
                        <p>해당 월에 리포트 데이터가 없어요</p>
                        <p style={{ marginTop: 'var(--spacing-sm)', fontSize: '14px' }}>
                            매치를 진행하면 리포트가 생성됩니다.
                        </p>
                    </div>
                </div>
                <CTAButton />
            </div>
        );
    }

    const avgPoint = report.monthly_avg_point ? Number(report.monthly_avg_point) : 0;

    // Global Filter for "기타 할 말이 있어요"
    const filteredBadReviews = report.bad_review_top3.filter(item => item.name !== "기타 할 말이 있어요");

    // Determine Top 1 Negative Item for coaching logic
    // Sort logic: count DESC, then label ASC (JS side)
    const sortedBadReviews = [...filteredBadReviews].sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
    });
    const topNegativeLabel = sortedBadReviews.length > 0 ? sortedBadReviews[0].name : null;

    return (
        <div className="container">
            <HeadlineSection
                managerName={report.manager.name}
                month={report.month}
                ratingTrend={report.chart_3months.map(t => ({
                    ...t,
                    avg_point: t.avg_point ? Number(t.avg_point) : 0
                }))}
            />

            <SummaryRows
                avgPoint={avgPoint}
                topNegativeLabel={topNegativeLabel}
            />

            <ReviewTabs
                goodReviews={report.good_review_top5}
                badReviews={filteredBadReviews}
            />

            <CTAButton />
        </div>
    );
}
