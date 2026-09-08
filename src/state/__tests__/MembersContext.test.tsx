import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { MembersProvider, useMembers } from '../MembersContext';
import { API_ENDPOINTS } from '../../config/api';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MembersProvider>{children}</MembersProvider>
);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---- Sahte (mock) motorkarne-api sunucusu ----
// MembersContext artık her şeyi cihaz-yerel tutmuyor; kayıt/giriş/profil
// işlemleri gerçek motorkarne-api backend'ine (routes/auth.js) fetch ile
// gidiyor. Testlerin gerçek bir ağa/backend'e ihtiyaç duymaması için, o
// endpoint'lerin davranışını (doğrulama kuralları, hata kodları, token
// üretimi) taklit eden bellek-içi basit bir sahte sunucu tanımlıyoruz.
type FakeMember = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  password?: string;
  provider: 'email' | 'google';
  providerId?: string;
  createdAt: string;
};

let members: FakeMember[] = [];
let nextId = 1;

function resetServer() {
  members = [];
  nextId = 1;
}

function toPublicUser(m: FakeMember) {
  return {
    id: m.id,
    fullName: m.fullName,
    email: m.email,
    phone: m.phone,
    createdAt: m.createdAt,
    provider: m.provider,
    providerId: m.providerId,
    isAdmin: false,
  };
}

function tokenFor(id: string) {
  return `test-token-${id}`;
}
function userIdFromToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer test-token-')) return null;
  return authHeader.replace('Bearer test-token-', '');
}

function jsonResponse(status: number, body: any) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

function handleFetch(url: string, options: any = {}): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};
  const authHeader: string | null = (options.headers && options.headers.Authorization) || null;

  if (url === API_ENDPOINTS.auth.register && method === 'POST') {
    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '').trim();
    if (!fullName) return jsonResponse(400, { error: 'Ad Soyad alanı zorunludur.' });
    if (!EMAIL_REGEX.test(email)) return jsonResponse(400, { error: 'Geçerli bir e-posta adresi girin.' });
    if (password.length < 6) return jsonResponse(400, { error: 'Şifre en az 6 karakter olmalıdır.' });
    if (members.some((m) => m.email === email)) {
      return jsonResponse(400, { error: 'Bu e-posta adresiyle zaten bir üyelik mevcut.' });
    }
    const m: FakeMember = {
      id: String(nextId++),
      fullName,
      email,
      phone: body.phone || undefined,
      password,
      provider: 'email',
      createdAt: '01.01.2024',
    };
    members.push(m);
    return jsonResponse(201, { token: tokenFor(m.id), user: toPublicUser(m) });
  }

  if (url === API_ENDPOINTS.auth.login && method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '').trim();
    const m = members.find((mm) => mm.email === email);
    if (!m || m.password !== password) {
      return jsonResponse(401, { error: 'E-posta veya şifre hatalı.' });
    }
    return jsonResponse(200, { token: tokenFor(m.id), user: toPublicUser(m) });
  }

  if (url === API_ENDPOINTS.auth.socialLogin && method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    const existing = members.find((mm) => mm.email === email);
    if (existing) return jsonResponse(200, { token: tokenFor(existing.id), user: toPublicUser(existing) });
    const m: FakeMember = {
      id: String(nextId++),
      fullName: body.fullName,
      email,
      provider: 'google',
      providerId: body.providerId,
      createdAt: '01.01.2024',
    };
    members.push(m);
    return jsonResponse(201, { token: tokenFor(m.id), user: toPublicUser(m) });
  }

  if (url.startsWith(API_ENDPOINTS.auth.checkEmail) && method === 'GET') {
    const email = decodeURIComponent(url.split('email=')[1] || '').toLowerCase();
    return jsonResponse(200, { taken: members.some((m) => m.email === email) });
  }

  if (url === API_ENDPOINTS.auth.resetPassword && method === 'PUT') {
    const email = String(body.email || '').trim().toLowerCase();
    const newPassword = String(body.newPassword || '').trim();
    if (newPassword.length < 6) return jsonResponse(400, { error: 'Şifre en az 6 karakter olmalıdır.' });
    const m = members.find((mm) => mm.email === email);
    if (!m) return jsonResponse(404, { error: 'Bu e-posta adresiyle kayıtlı bir üyelik bulunamadı.' });
    m.password = newPassword;
    return jsonResponse(200, { success: true });
  }

  if (url === API_ENDPOINTS.auth.me && method === 'GET') {
    const m = members.find((mm) => mm.id === userIdFromToken(authHeader));
    if (!m) return jsonResponse(401, { error: 'Yetkisiz.' });
    return jsonResponse(200, { user: toPublicUser(m) });
  }

  if (url === API_ENDPOINTS.auth.me && method === 'PUT') {
    const m = members.find((mm) => mm.id === userIdFromToken(authHeader));
    if (!m) return jsonResponse(401, { error: 'Yetkisiz.' });
    const fullName = body.fullName !== undefined ? String(body.fullName).trim() : m.fullName;
    if (!fullName) return jsonResponse(400, { error: 'Ad Soyad alanı zorunludur.' });
    const email = body.email !== undefined ? String(body.email).trim().toLowerCase() : m.email;
    if (!EMAIL_REGEX.test(email)) return jsonResponse(400, { error: 'Geçerli bir e-posta adresi girin.' });
    if (email !== m.email && members.some((mm) => mm.email === email && mm.id !== m.id)) {
      return jsonResponse(400, { error: 'Bu e-posta adresiyle zaten bir üyelik mevcut.' });
    }
    m.fullName = fullName;
    m.email = email;
    if (body.phone !== undefined) m.phone = String(body.phone).trim();
    return jsonResponse(200, { user: toPublicUser(m) });
  }

  if (url === API_ENDPOINTS.auth.mePassword && method === 'PUT') {
    const m = members.find((mm) => mm.id === userIdFromToken(authHeader));
    if (!m) return jsonResponse(401, { error: 'Yetkisiz.' });
    const currentPassword = String(body.currentPassword || '').trim();
    const newPassword = String(body.newPassword || '').trim();
    if (newPassword.length < 6) return jsonResponse(400, { error: 'Yeni şifre en az 6 karakter olmalı.' });
    if (m.password !== currentPassword) return jsonResponse(400, { error: 'Mevcut şifreniz yanlış.' });
    m.password = newPassword;
    return jsonResponse(200, { success: true });
  }

  if (url === API_ENDPOINTS.auth.me && method === 'DELETE') {
    members = members.filter((mm) => mm.id !== userIdFromToken(authHeader));
    return jsonResponse(200, { success: true });
  }

  return jsonResponse(404, { error: 'Bilinmeyen uç nokta (test mock).' });
}

beforeEach(() => {
  resetServer();
  AsyncStorage.clear();
  (SecureStore as any).__reset();
  global.fetch = jest.fn((url: string, options?: any) => handleFetch(url, options)) as any;
});

// Her testte MembersProvider'ın mount anındaki oturum geri yükleme (session
// restore) efektinin tamamlanmasını bekler — aksi halde testler, henüz
// isRestoringSession=true iken sonuçları kontrol edip yanlış pozitif/negatif
// verebilir ya da React "act" uyarısı üretebilir.
async function renderMembers() {
  const rendered = renderHook(() => useMembers(), { wrapper });
  await waitFor(() => expect(rendered.result.current.isRestoringSession).toBe(false));
  return rendered;
}

describe('MembersContext', () => {
  it('rejects registration with an invalid email format', async () => {
    const { result } = await renderMembers();

    let response: { success: boolean; error?: string } | undefined;
    await act(async () => {
      response = await result.current.registerMember({
        fullName: 'Test Kullanıcı',
        email: 'gecersiz-eposta',
        password: 'sifre123',
      });
    });

    expect(response?.success).toBe(false);
    expect(response?.error).toBeTruthy();
  });

  it('rejects registration with a password shorter than 6 characters', async () => {
    const { result } = await renderMembers();

    let response: { success: boolean; error?: string } | undefined;
    await act(async () => {
      response = await result.current.registerMember({
        fullName: 'Test Kullanıcı',
        email: 'test@example.com',
        password: '123',
      });
    });

    expect(response?.success).toBe(false);
  });

  it('registers a valid member and logs them in automatically', async () => {
    const { result } = await renderMembers();

    await act(async () => {
      await result.current.registerMember({
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        password: 'sifre123',
      });
    });

    expect(result.current.currentUser?.email).toBe('ada@example.com');
    expect(result.current.currentUser?.isAdmin).toBeFalsy();
  });

  it('prevents registering the same email address twice', async () => {
    const { result } = await renderMembers();

    await act(async () => {
      await result.current.registerMember({
        fullName: 'Birinci Kullanıcı',
        email: 'ayni@example.com',
        password: 'sifre123',
      });
    });

    let secondResponse: { success: boolean; error?: string } | undefined;
    await act(async () => {
      secondResponse = await result.current.registerMember({
        fullName: 'İkinci Kullanıcı',
        email: 'ayni@example.com',
        password: 'baskasifre',
      });
    });

    expect(secondResponse?.success).toBe(false);
  });

  it('logs in the default demo admin account and exposes isAdmin', async () => {
    const { result } = await renderMembers();

    await act(async () => {
      await result.current.logout();
    });

    let loginResult: { success: boolean; error?: string } | undefined;
    await act(async () => {
      loginResult = await result.current.login('admin@motorkarne.com', 'admin123');
    });

    expect(loginResult?.success).toBe(true);
    expect(result.current.currentUser?.isAdmin).toBe(true);
    // Yerel demo admin girişi sunucuya hiç istek atmamalı.
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects login with a wrong password', async () => {
    const { result } = await renderMembers();

    let loginResult: { success: boolean; error?: string } | undefined;
    await act(async () => {
      loginResult = await result.current.login('admin@motorkarne.com', 'yanlis-sifre');
    });

    expect(loginResult?.success).toBe(false);
  });

  it('logs the user out', async () => {
    const { result } = await renderMembers();

    await act(async () => {
      await result.current.login('admin@motorkarne.com', 'admin123');
    });
    expect(result.current.currentUser).not.toBeNull();

    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.currentUser).toBeNull();
  });

  it('rejects clearing the full name to empty when editing a profile', async () => {
    const { result } = await renderMembers();

    await act(async () => {
      await result.current.registerMember({
        fullName: 'İsim Soyisim',
        email: `bosisim-${Date.now()}@example.com`,
        password: 'sifre123',
      });
    });

    let updateResult: { success: boolean; error?: string } | undefined;
    await act(async () => {
      updateResult = await result.current.updateCurrentUser({ fullName: '   ' });
    });

    expect(updateResult?.success).toBe(false);
    expect(result.current.currentUser?.fullName).toBe('İsim Soyisim');
  });
});
