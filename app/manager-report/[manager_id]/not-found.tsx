export default function NotFound() {
    return (
        <div className="container">
            <div className="card">
                <h1 className="headline">리포트를 찾을 수 없습니다</h1>
                <div className="empty-state">
                    <p>요청하신 매니저 리포트를 찾을 수 없습니다.</p>
                    <p style={{ marginTop: 'var(--spacing-sm)', fontSize: '14px' }}>
                        URL을 확인해주세요.
                    </p>
                </div>
            </div>
        </div>
    );
}
