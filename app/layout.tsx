import './globals.css';

export const metadata = {
    title: {
        default: '매니저 리포트',
        template: '%s | 플랩풋볼',
    },
    description: '플랩풋볼 매니저 월간 활동 리포트입니다.',
    openGraph: {
        title: '플랩풋볼 매니저 리포트',
        description: '매니저님의 활동 현황을 확인해보세요.',
        type: 'website',
        locale: 'ko_KR',
    },
    twitter: {
        card: 'summary_large_image',
        title: '플랩풋볼 매니저 리포트',
        description: '매니저님의 활동 현황을 확인해보세요.',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <body suppressHydrationWarning>{children}</body>
        </html>
    );
}
