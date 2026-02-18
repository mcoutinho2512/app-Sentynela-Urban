import { apiClient } from "./client";

export interface SubscriptionResponse {
  id: number;
  plan: string;
  status: string;
  current_period_end: string | null;
}

export const billingApi = {
  subscribe: (plan: string) =>
    apiClient.post<SubscriptionResponse>("/billing/subscribe", { plan }).then((r) => r.data),

  getSubscription: () =>
    apiClient.get<SubscriptionResponse | null>("/billing/subscription").then((r) => r.data),

  cancelSubscription: () =>
    apiClient.post<SubscriptionResponse>("/billing/cancel").then((r) => r.data),
};
