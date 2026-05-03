/**
 * @file index.ts
 * @description Service exports for Idea module
 * @version 1.0.0
 */

// CRUD Operations
export {
  createIdea,
  updateIdea,
  deleteIdea,
  submitIdea,
} from "./idea.crud.service";

// Query Operations
export {
  getAllIdeas,
  getSingleIdea,
  getUserIdeas,
  getIdeasByCategory,
} from "./idea.query.service";

// Admin Operations
export {
  approveIdea,
  rejectIdea,
  getPendingIdeasForAdmin,
  getAllIdeasForAdmin,
} from "./idea.admin.service";

// Feature Operations
export {
  getFeaturedIdeas,
  getTopVotedIdeas,
  getTestimonials,
  getTestimonialById,
  getTestimonialsStats,
} from "./idea.feature.service";
