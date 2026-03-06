'use client';

import { useState } from 'react';
import { ReviewItem } from '@/types/report';

interface ReviewTabsProps {
    goodReviews: ReviewItem[];
    badReviews: ReviewItem[];
}

export default function ReviewTabs({ goodReviews, badReviews }: ReviewTabsProps) {
    const [activeTab, setActiveTab] = useState<'good' | 'bad'>('good');

    // Safety filter for "기타 할말이 있어요"
    const filteredBadReviews = badReviews.filter(item => item.name !== "기타 할말이 있어요");

    return (
        <div className="card">
            <h2 className="subheadline" style={{ marginBottom: 'var(--spacing-md)' }}>
                평점에 영향을 준 정보예요
            </h2>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'good' ? 'active' : ''}`}
                    onClick={() => setActiveTab('good')}
                >
                    긍정
                </button>
                <button
                    className={`tab ${activeTab === 'bad' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bad')}
                >
                    부정
                </button>
            </div>

            <div>
                {activeTab === 'good' ? (
                    goodReviews.length > 0 ? (
                        goodReviews.map((item, index) => (
                            <div key={index} className="review-item">
                                <span className="review-name">{item.name}</span>
                                <span className="review-count">{item.count}회</span>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">긍정 리뷰가 없습니다</div>
                    )
                ) : (
                    filteredBadReviews.length > 0 ? (
                        filteredBadReviews.map((item, index) => (
                            <div key={index} className="review-item">
                                <span className="review-name">{item.name}</span>
                                <span className="review-count" style={{ color: '#6B7280' }}>
                                    {item.count}회
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">부정 리뷰가 없습니다</div>
                    )
                )}
            </div>
        </div>
    );
}
