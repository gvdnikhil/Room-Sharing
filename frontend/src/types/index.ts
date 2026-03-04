export interface User {
    id: string;
    name: string;
    email: string;
    created_at: string;
}

export interface RoomMember {
    id: string;
    user: User;
    joined_at: string;
}

export interface Room {
    id: string;
    name: string;
    invite_code: string;
    created_at: string;
    members: RoomMember[];
}

export interface Item {
    id: string;
    room_id: string;
    name: string;
    total_quantity: number;
    remaining_quantity: number;
    unit: string;
    created_by: string;
    created_at: string;
    creator?: User;
}

export interface ActivityEntry {
    id: string;
    activity_type: 'consumption' | 'refill' | 'chore';
    user_name: string;
    recorded_by_name?: string;
    item_name?: string;
    quantity?: number;
    unit?: string;
    chore_type?: string;
    created_at: string;
}

export interface Chore {
    id: string;
    room_id: string;
    user_id: string;
    chore_type: string;
    created_at: string;
}

export interface UsageSummaryEntry {
    user_id: string;
    user_name: string;
    item_name: string;
    unit: string;
    total_consumed: number;
}


export interface RestockInsightEntry {
    item_id: string;
    item_name: string;
    unit: string;
    remaining_quantity: number;
    total_quantity: number;
    usage_last_n_days: number;
    avg_daily_usage: number;
    estimated_days_left?: number | null;
    urgency: 'normal' | 'watch' | 'urgent';
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: User;
}
