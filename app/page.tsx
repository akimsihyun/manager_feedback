export default function HomePage() {
    return (
        <div className="container">
            <div className="card">
                <h1 className="headline" style={{ color: 'var(--color-text-primary)' }}>
                    해당 페이지는 존재하지 않습니다.
                </h1>
                <div className="empty-state">
                    <p>요청하신 페이지를 찾을 수 없습니다.</p>
                </div>
            </div>
        </div>
    );
}
