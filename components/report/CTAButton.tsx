'use client';

export default function CTAButton() {
    const handleClick = () => {
        // Placeholder for future navigation
        console.log('매치 선택하러 가기');
    };

    return (
        <div style={{ padding: 'var(--spacing-md) 0' }}>
            <button className="button" onClick={handleClick}>
                매치 선택하러 가기
            </button>
        </div>
    );
}
