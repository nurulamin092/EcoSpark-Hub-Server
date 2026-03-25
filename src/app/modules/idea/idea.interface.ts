export interface ICreateIdeaPayload {
  title: string;
  problem: string;
  solution: string;
  description: string;
  categoryId: string;
  isPaid?: boolean;
  price?: number;
}

export interface IUpdateIdeaPayload extends Partial<ICreateIdeaPayload> {
  status?: "DRAFT" | "UNDER_REVIEW";
}
