'use client';

import React from 'react';

interface SummaryRowsProps {
    avgPoint: number;
    topNegativeLabel: string | null;
}

const COACHING_MAP: Record<string, string> = {
    "플랩 로테이션을 지켜주세요": "플랩 로테이션이 원활하게 진행될 수 있도록 조금 더 신경 써보세요.",
    "밸런스를 조절을 해주세요": "팀 밸런스를 조금 더 신경 써서 맞춰보면 더 좋은 매치가 될 수 있어요.",
    "매치가 과열되지 않게 해주세요": "매치 분위기가 과열되지 않도록 한 번 더 신경 써주세요.",
    "실제 조끼 번호랑 달라요": "조끼 번호와 팀 구성이 잘 맞는지 한 번 더 확인해 주세요.",
    "매니저가 늦게 도착했어요": "매치 시작 전에 여유 있게 도착해 준비해 주세요.",
    "매치 시작 전 설명이 부족해요": "매치 시작 전에 진행 방식과 규칙을 조금 더 자세히 안내해 주세요.",
    "친절히 대해주세요": "참가자들과 조금 더 밝고 친절하게 소통해 보세요.",
    "매치 중 흡연을 해요": "매치 진행 중에는 흡연을 자제해 주세요.",
    "매치 중 자리를 벗어났어요": "매치 진행 중에는 자리를 오래 비우지 않도록 신경 써주세요.",
    "목소리가 잘 안들려요": "참가자들이 잘 들을 수 있도록 조금 더 크게 안내해 주세요.",
    "핸드폰 사용을 자제해 주세요": "매치 진행 중에는 휴대폰 사용을 최소화해 주세요.",
    "풋살화&운동화를 착용해 주세요": "매치 진행 시 풋살화 또는 운동화를 착용해 주세요.",
    "조끼 세탁에 신경 써 주세요": "조끼 상태와 위생에 조금 더 신경 써주세요.",
    "공이 노후화 되었어요": "공 상태를 확인하고 필요하면 교체해 주세요.",
    "다른 매니저가 진행했어요": "배정된 매니저가 직접 매치를 진행해 주세요.",
    "신청 인원과 실제 참여 인원이 달라요": "참가 인원이 신청 인원과 맞는지 한 번 더 확인해 주세요.",
};

export default function SummaryRows({ avgPoint, topNegativeLabel }: SummaryRowsProps) {
    const formattedPoint = avgPoint.toFixed(1);

    const getRows = () => {
        if (avgPoint >= 4.6) {
            return {
                row1: { small: "매우 안정적으로 운영하고 있어요", bold: `평점 ${formattedPoint}점으로 높은 만족도를 유지하고 있어요` },
                row2: { small: "", bold: "지금처럼 매치 분위기와 진행을 유지해 주세요!" }
            };
        } else if (avgPoint >= 4.3) {
            let coaching = "매치 분위기와 참여 인원 관리가 안정적으로 이루어지고 있어요.";
            if (topNegativeLabel && COACHING_MAP[topNegativeLabel]) {
                coaching = COACHING_MAP[topNegativeLabel];
            }
            return {
                row1: { small: "안정적으로 운영하고 있어요", bold: `평점 ${formattedPoint}점, 전반적으로 좋은 평가를 받고 있어요` },
                row2: { small: "다음 매치에서 참고하면 좋은 부분이에요.", bold: coaching }
            };
        } else {
            let coaching = "매치 분위기와 참여 인원 관리가 안정적으로 이루어지고 있어요.";
            if (topNegativeLabel && COACHING_MAP[topNegativeLabel]) {
                coaching = COACHING_MAP[topNegativeLabel];
            }
            return {
                row1: { small: "관리가 필요해요", bold: `평점 ${formattedPoint}점으로 아쉬운 평가가 있었어요` },
                row2: { small: "다음 매치에서 참고하면 좋은 부분이에요.", bold: coaching }
            };
        }
    };

    const rows = getRows();

    return (
        <div className="card" style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                <SummaryRow small={rows.row1.small} bold={rows.row1.bold} />
                <SummaryRow small={rows.row2.small} bold={rows.row2.bold} />
            </div>
        </div>
    );
}

function SummaryRow({ small, bold }: { small: string; bold: string }) {
    return (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
                fontSize: '14px',
                marginTop: '4px',
                flexShrink: 0,
            }}>
                🔵
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {small && <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>{small}</span>}
                <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text-primary)', lineHeight: '1.4' }}>{bold}</span>
            </div>
        </div>
    );
}
