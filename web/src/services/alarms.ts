import { apiRequest } from './api';
import { Alarm } from '@/types';

export interface CreateAlarmInput {
  title: string;
  scheduledAt: string;
  repeatPattern?: string;
  timezone: string;
  locale?: string;
  soundId: string;
  snoozeEnabled?: boolean;
  snoozeMinutes?: number;
  challengeMode?: boolean;
  challengeDifficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

export const alarmsApi = {
  list: () => apiRequest<Alarm[]>('/alarms'),
  get: (id: string) => apiRequest<Alarm>(`/alarms/${id}`),
  create: (input: CreateAlarmInput) => apiRequest<Alarm>('/alarms', { method: 'POST', body: input }),
  update: (id: string, input: Partial<CreateAlarmInput> & { status?: 'ACTIVE' | 'PAUSED' }) =>
    apiRequest<Alarm>(`/alarms/${id}`, { method: 'PATCH', body: input }),
  remove: (id: string) => apiRequest<{ id: string }>(`/alarms/${id}`, { method: 'DELETE' }),
  trigger: (id: string) =>
    apiRequest<{ attemptId: string; challenge: Alarm['challenge']; hasFreeSkipAvailable: boolean }>(
      `/alarms/${id}/trigger`,
      { method: 'POST' },
    ),
  validate: (
    id: string,
    body: {
      attemptId: string;
      detectedLabel: string;
      confidence: number;
      boundingBoxAreaRatio: number;
    },
  ) => apiRequest<{ success: boolean; reason?: string }>(`/alarms/${id}/validate`, { method: 'POST', body }),
  skipItem: (id: string, attemptId: string) =>
    apiRequest<{ chargedFreeSkip: boolean }>(`/alarms/${id}/skip-item`, {
      method: 'POST',
      body: { attemptId },
    }),
};
