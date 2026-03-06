'use client';

import { RatingTrend } from '@/types/report';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload }: any) {
    if (!active || !payload || payload.length === 0) return null;

    const data: RatingTrend = payload[0].payload;
    const [, m] = data.month.split('-');
    const score = data.avg_point != null ? Number(data.avg_point).toFixed(1) : '0.0';

    return (
        <div style={{
            background: 'rgba(0, 0, 0, 0.75)',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 500,
            padding: '4px 8px',
            borderRadius: '6px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.2px',
            lineHeight: 1.4,
            pointerEvents: 'none',
        }}>
            {parseInt(m)}월 {score}점
        </div>
    );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

interface HeadlineSectionProps {
    managerName: string;
    month: number;
    ratingTrend: RatingTrend[];
}

export default function HeadlineSection({ managerName, month, ratingTrend }: HeadlineSectionProps) {
    return (
        <div className="card" style={{
            padding: '24px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
        }}>
            {/* Left: Text hierarchy (visual center) */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                    fontSize: '13px',
                    color: 'var(--color-text-tertiary)',
                    fontWeight: 500,
                    marginBottom: '4px',
                    letterSpacing: '-0.2px',
                }}>
                    2월 매니저 리포트
                </p>
                <h1 style={{
                    fontSize: '21px',
                    fontWeight: 700,
                    lineHeight: 1.4,
                    color: 'var(--color-text-primary)',
                    letterSpacing: '-0.5px',
                    margin: 0,
                }}>
                    {managerName} 매니저님의<br />
                    {month}월 리포트가 도착했어요
                </h1>
            </div>

            {/* Right: Compact sparkline chart */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                flexShrink: 0,
                marginTop: '4px',
            }}>
                <div style={{ width: '100px', height: '44px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={ratingTrend}
                            margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                        >
                            <YAxis hide domain={[0, 5]} />
                            <XAxis hide dataKey="month" />
                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={false}
                                allowEscapeViewBox={{ x: true, y: true }}
                                offset={-5}
                                position={{ y: -30 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="avg_point"
                                stroke="#6366f1"
                                strokeWidth={2}
                                dot={{ fill: '#6366f1', r: 2.5, strokeWidth: 0 }}
                                activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 1.5, stroke: '#fff' }}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <span style={{
                    fontSize: '11px',
                    color: 'var(--color-text-tertiary)',
                    fontWeight: 500,
                    marginTop: '4px',
                    letterSpacing: '-0.2px',
                }}>
                    최근 3개월 흐름
                </span>
            </div>
        </div>
    );
}
