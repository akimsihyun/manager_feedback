'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to default manager report
        router.push('/manager-report/15729?year=2025&month=12');
    }, [router]);

    return (
        <div className="container">
            <div className="card">
                <h1 className="headline">매니저 월간 리포트</h1>
                <p className="text-secondary" style={{ marginBottom: 'var(--spacing-md)' }}>
                    리포트 페이지로 이동 중...
                </p>
            </div>
        </div>
    );
}
