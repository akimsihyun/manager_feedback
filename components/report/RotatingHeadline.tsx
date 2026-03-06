'use client';

import { useEffect, useState } from 'react';

interface RotatingHeadlineProps {
    avgPoint: number;
}

export default function RotatingHeadline({ avgPoint }: RotatingHeadlineProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const messages = getMessages(avgPoint);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % messages.length);
        }, 2500);

        return () => clearInterval(interval);
    }, [messages.length]);

    return (
        <div className="card">
            <p className="subheadline" style={{ minHeight: '60px', transition: 'opacity 0.3s' }}>
                {messages[currentIndex]}
            </p>
        </div>
    );
}

function getMessages(avgPoint: number): string[] {
    const formattedPoint = avgPoint.toFixed(1);
    if (avgPoint >= 4.6) {
        return [
            `평점이 ${formattedPoint}점이에요. 플랩 매니저로 최고의 활동을 보여주고 있어요`,
        ];
    } else if (avgPoint >= 4.3) {
        return [
            `평점이 ${formattedPoint}점이에요. 조금 더 관리하면 최고의 매니저가 될 수 있어요`,
        ];
    } else {
        return [
            `평점이 ${formattedPoint}점이에요. 경고를 받을 수 있는 위험 구간이에요`,
        ];
    }
}
