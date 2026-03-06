import './globals.css';

export const metadata = {
    title: '2월 매니저 리포트',
    description: 'FlabFootball 매니저 월간 활동 리포트',
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
