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
  photoUri?: string;
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
  addReview: (input: { motorId: string; userId: string; userName: string; rating: number; comment: string; photoUri?: string }) => AddReviewResult;
  // Hesap silinirken çağrılır: bu kullanıcının yazdığı tüm yorumları kaldırır.
  // (Yorumlar başka kullanıcılara da görünen genel/ortak bir liste olduğu için
  // bu liste hesaba göre AYRIŞTIRILMAZ — bkz. STORAGE_KEY yorumu altta; ama
  // hesap silindiğinde o kullanıcıya ait yorumların kalıcı olarak silinmesi
  // gerekir.)
  deleteReviewsByUser: (userId: string) => void;
}

// NOT: Bu depo BİLEREK tüm hesaplar için tek/ortak (global) — yorumlar her
// kullanıcıya görünen genel bir katalog içeriğidir (her Review kendi
// userId/userName'ini taşır), FavoritesContext/MaintenanceContext gibi kişiye
// özel veri değildir. Hesap silindiğinde ilgili kullanıcının yorumlarını
// kaldırmak için deleteReviewsByUser kullanılır (bkz. MembersContext.deleteAccount
// çağrısını yapan ekran).
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
  deleteReviewsByUser: () => {},
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
      photoUri: input.photoUri,
    };

    setReviews((prev) => {
      const next = [newReview, ...prev];
      persist(next);
      return next;
    });

    return { success: true, review: newReview };
  };

  const deleteReviewsByUser = (userId: string) => {
    setReviews((prev) => {
      const next = prev.filter((r) => r.userId !== userId);
      if (next.length !== prev.length) persist(next);
      return next;
    });
  };

  return (
    <ReviewsContext.Provider value={{ reviews, getReviewsForMotor, getAverageRating, addReview, deleteReviewsByUser }}>
      {children}
    </ReviewsContext.Provider>
  );
};

export const useReviews = () => useContext(ReviewsContext);
