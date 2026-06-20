export interface CheckoutSessionResult {
  url: string;
  sessionId: string;
}

export interface AdminPaymentFilters {
  status?: string;
  page: number;
  limit: number;
}
