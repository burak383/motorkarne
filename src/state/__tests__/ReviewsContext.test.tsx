import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { ReviewsProvider, useReviews } from '../ReviewsContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ReviewsProvider>{children}</ReviewsProvider>
);

describe('ReviewsContext', () => {
  it('rejects a review with an empty comment', () => {
    const { result } = renderHook(() => useReviews(), { wrapper });

    let response: ReturnType<typeof result.current.addReview> | undefined;
    act(() => {
      response = result.current.addReview({
        motorId: 'motor-1', userId: 'u1', userName: 'Test User', rating: 5, comment: '   ',
      });
    });

    expect(response?.success).toBe(false);
  });

  it('rejects a review with a rating outside the 1-5 range', () => {
    const { result } = renderHook(() => useReviews(), { wrapper });

    let response: ReturnType<typeof result.current.addReview> | undefined;
    act(() => {
      response = result.current.addReview({
        motorId: 'motor-1', userId: 'u1', userName: 'Test User', rating: 6, comment: 'Harika bir motor.',
      });
    });

    expect(response?.success).toBe(false);
  });

  it('accepts a valid review and stores it', () => {
    const { result } = renderHook(() => useReviews(), { wrapper });

    act(() => {
      result.current.addReview({
        motorId: 'motor-valid', userId: 'u1', userName: 'Test User', rating: 4, comment: 'Gayet iyi.',
      });
    });

    const forMotor = result.current.getReviewsForMotor('motor-valid');
    expect(forMotor.length).toBe(1);
    expect(forMotor[0].comment).toBe('Gayet iyi.');
    expect(forMotor[0].rating).toBe(4);
  });

  it('trims whitespace from the comment before saving', () => {
    const { result } = renderHook(() => useReviews(), { wrapper });

    act(() => {
      result.current.addReview({
        motorId: 'motor-trim', userId: 'u1', userName: 'Test', rating: 3, comment: '  boşluklu yorum  ',
      });
    });

    expect(result.current.getReviewsForMotor('motor-trim')[0].comment).toBe('boşluklu yorum');
  });

  it('getReviewsForMotor only returns reviews for that specific motor', () => {
    const { result } = renderHook(() => useReviews(), { wrapper });

    act(() => {
      result.current.addReview({ motorId: 'motor-x', userId: 'u1', userName: 'A', rating: 5, comment: 'X icin yorum' });
      result.current.addReview({ motorId: 'motor-y', userId: 'u2', userName: 'B', rating: 3, comment: 'Y icin yorum' });
    });

    expect(result.current.getReviewsForMotor('motor-x').every((r) => r.motorId === 'motor-x')).toBe(true);
    expect(result.current.getReviewsForMotor('motor-x').some((r) => r.motorId === 'motor-y')).toBe(false);
  });

  it('getAverageRating returns null when a motor has no reviews', () => {
    const { result } = renderHook(() => useReviews(), { wrapper });
    expect(result.current.getAverageRating('motor-with-no-reviews')).toBeNull();
  });

  it('getAverageRating computes the correct mean across multiple reviews', () => {
    const { result } = renderHook(() => useReviews(), { wrapper });

    act(() => {
      result.current.addReview({ motorId: 'motor-avg', userId: 'u1', userName: 'A', rating: 4, comment: 'Birinci yorum' });
      result.current.addReview({ motorId: 'motor-avg', userId: 'u2', userName: 'B', rating: 2, comment: 'Ikinci yorum' });
    });

    expect(result.current.getAverageRating('motor-avg')).toBe(3);
  });
});
