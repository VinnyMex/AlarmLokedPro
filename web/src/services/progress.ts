import { apiRequest } from './api';
import { RankingEntry, UserProgress } from '@/types';

export const progressApi = {
  get: () => apiRequest<UserProgress>('/progress'),
};

export const rankingsApi = {
  list: (period: 'weekly' | 'monthly' = 'weekly') =>
    apiRequest<{ entries: RankingEntry[]; me?: RankingEntry }>(`/rankings?period=${period}`),
};

export const sharesApi = {
  render: (input: {
    alarmId?: string;
    templateCode: string;
    includeWeather?: boolean;
    includeLocation?: boolean;
    includeTime?: boolean;
    watermarkText?: string;
  }) => apiRequest<{ id: string; imagePath: string | null }>('/shares/render', { method: 'POST', body: input }),
};
