/**
 * @file idea.service.ts
 * @description Main service entry point for Idea module
 * @version 4.0.0
 */

// Import all services
import {
  // CRUD Operations
  createIdea,
  updateIdea,
  deleteIdea,
  submitIdea,
  // Query Operations
  getAllIdeas,
  getSingleIdea,
  getUserIdeas,
  getIdeasByCategory,
  // Admin Operations
  approveIdea,
  rejectIdea,
  // Feature Operations
  getFeaturedIdeas,
  getTopVotedIdeas,
  getTestimonials,
  getTestimonialById,
  getTestimonialsStats,
} from "./services";

import { calculateTrendingScore } from "./utils/idea.helpers";
import { ideaCache } from "./utils/idea.cache";

// Create and export IdeaService object
export const IdeaService = {
  // CRUD Operations
  createIdea,
  updateIdea,
  deleteIdea,
  submitIdea,

  // Query Operations
  getAllIdeas,
  getSingleIdea,
  getUserIdeas,
  getIdeasByCategory,

  // Admin Operations
  approveIdea,
  rejectIdea,

  // Feature Operations
  getFeaturedIdeas,
  getTopVotedIdeas,
  getTestimonials,
  getTestimonialById,
  getTestimonialsStats,

  // Utilities
  calculateTrendingScore,
  getCacheStats: ideaCache.getStats.bind(ideaCache),
  clearCache: ideaCache.clear.bind(ideaCache),
};

// Also export individually for flexibility
export {
  createIdea,
  updateIdea,
  deleteIdea,
  submitIdea,
  getAllIdeas,
  getSingleIdea,
  getUserIdeas,
  getIdeasByCategory,
  approveIdea,
  rejectIdea,
  getFeaturedIdeas,
  getTopVotedIdeas,
  getTestimonials,
  getTestimonialById,
  getTestimonialsStats,
  calculateTrendingScore,
  ideaCache,
};
