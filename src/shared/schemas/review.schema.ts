import { z } from 'zod';

export const createReviewSchema = z.object({
  flatRating: z.coerce.number().int().min(1).max(5),
  ownerRating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(8).max(1000),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export interface PublicReview {
  id: string;
  flatId: string;
  flatRating: number;
  ownerRating: number;
  comment: string;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  createdAt: string;
  updatedAt: string;
}
