import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Review {
  id: string;
  motorId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface AddReviewResult {
  success: boolean;
  error?: string;
  review?: Review;
}

interface ReviewsContextType {
  reviews: Review[];
  getReviewsForMotor: (motorId: string) => Review[];
  getAverageRating: (motorId: string) => number | null;
  addReview: (input: { motorId: string; userId: string; userName: string; rating: number; comment: string }) => AddReviewResult;
}

const STORAGE_KEY = 'motorkarne_reviews';

const loadSaved = async (): Promise<Review[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    // Bozuk veri varsa sessizce yok say
  }
  return [];
};

const persist = (items: Review[]) => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {
    // Depolama kotası dolu vb. durumlarda sessizce yok say
  });
};

const ReviewsContext = createContext<ReviewsContextType>({
  reviews: [],
  getReviewsForMotor: () => [],
  getAverageRating: () => null,
  addReview: () => ({ success: false, error: 'ReviewsProvider bulunamadı' }),
});

export const ReviewsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    (async () => {
      setReviews(await loadSaved());
    })();
  }, []);

  const getReviewsForMotor = (motorId: string) =>
    reviews.filter((r) => r.motorId === motorId).sort((a, b) => Number(b.id) - Number(a.id));

  const getAverageRating = (motorId: string) => {
    const forMotor = reviews.filter((r) => r.motorId === motorId);
    if (forMotor.length === 0) return null;
    const sum = forMotor.reduce((acc, r) => acc + r.rating, 0);
    return sum / forMotor.length;
  };

  const addReview: ReviewsContextType['addReview'] = (input) => {
    if (!input.comment.trim()) {
      return { success: false, error: 'Lütfen bir yorum yazın.' };
    }
    if (input.rating < 1 || input.rating > 5) {
      return { success: false, error: 'Geçerli bir puan seçin.' };
    }

    const newReview: Review = {
      id: String(Date.now()),
      motorId: input.motorId,
      userId: input.userId,
      userName: input.userName,
      rating: input.rating,
      comment: input.comment.trim(),
      createdAt: new Date().toLocaleDateString('tr-TR'),
    };

    setReviews((prev) => {
      const next = [newReview, ...prev];
      persist(next);
      return next;
    });

    return { success: true, review: newReview };
  };

  return (
    <ReviewsContext.Provider value={{ reviews, getReviewsForMotor, getAverageRating, addReview }}>
      {children}
    </ReviewsContext.Provider>
  );
};

export const useReviews = () => useContext(ReviewsContext);
