export interface ReviewItem {
    name: string;
    count: number;
    latest_at?: string;
}

export interface RatingTrend {
    month: string;
    avg_point: number | null;
}

export interface ManagerInfo {
    id: number;
    name: string;
}

export interface ManagerReport {
    manager: ManagerInfo;
    year: number;
    month: number;
    monthly_avg_point: number | null;
    chart_3months: RatingTrend[];
    good_review_top5: ReviewItem[];
    bad_review_top3: ReviewItem[];
    hasData: boolean;
}
