export interface ICreateCommentPayload {
  content: string;
  ideaId: string;
  parentId?: string;
}

export interface IUpdateCommentPayload {
  content: string;
}