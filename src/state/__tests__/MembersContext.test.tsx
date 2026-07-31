import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { MembersProvider, useMembers } from '../MembersContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MembersProvider>{children}</MembersProvider>
);

describe('MembersContext', () => {
  it('rejects registration with an invalid email format', () => {
    const { result } = renderHook(() => useMembers(), { wrapper });

    let response: { success: boolean; error?: string } | undefined;
    act(() => {
      response = result.current.registerMember({
        fullName: 'Test Kullanıcı',
        email: 'gecersiz-eposta',
        password: 'sifre123',
      });
    });

    expect(response?.success).toBe(false);
    expect(response?.error).toBeTruthy();
  });

  it('rejects registration with a password shorter than 6 characters', () => {
    const { result } = renderHook(() => useMembers(), { wrapper });

    let response: { success: boolean; error?: string } | undefined;
    act(() => {
      response = result.current.registerMember({
        fullName: 'Test Kullanıcı',
        email: 'test@example.com',
        password: '123',
      });
    });

    expect(response?.success).toBe(false);
  });

  it('registers a valid member and logs them in automatically', () => {
    const { result } = renderHook(() => useMembers(), { wrapper });

    act(() => {
      result.current.registerMember({
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        password: 'sifre123',
      });
    });

    expect(result.current.currentUser?.email).toBe('ada@example.com');
    expect(result.current.currentUser?.isAdmin).toBeFalsy();
  });

  it('prevents registering the same email address twice', () => {
    const { result } = renderHook(() => useMembers(), { wrapper });

    act(() => {
      result.current.registerMember({
        fullName: 'Birinci Kullanıcı',
        email: 'ayni@example.com',
        password: 'sifre123',
      });
    });

    let secondResponse: { success: boolean; error?: string } | undefined;
    act(() => {
      secondResponse = result.current.registerMember({
        fullName: 'İkinci Kullanıcı',
        email: 'ayni@example.com',
        password: 'baskasifre',
      });
    });

    expect(secondResponse?.success).toBe(false);
  });

  it('logs in the default demo admin account and exposes isAdmin', () => {
    const { result } = renderHook(() => useMembers(), { wrapper });

    act(() => {
      result.current.logout();
    });

    let loginResult: { success: boolean; error?: string } | undefined;
    act(() => {
      loginResult = result.current.login('admin@motorkarne.com', 'admin123');
    });

    expect(loginResult?.success).toBe(true);
    expect(result.current.currentUser?.isAdmin).toBe(true);
  });

  it('rejects login with a wrong password', () => {
    const { result } = renderHook(() => useMembers(), { wrapper });

    let loginResult: { success: boolean; error?: string } | undefined;
    act(() => {
      loginResult = result.current.login('admin@motorkarne.com', 'yanlis-sifre');
    });

    expect(loginResult?.success).toBe(false);
  });

  it('logs the user out', () => {
    const { result } = renderHook(() => useMembers(), { wrapper });

    act(() => {
      result.current.login('admin@motorkarne.com', 'admin123');
    });
    expect(result.current.currentUser).not.toBeNull();

    act(() => {
      result.current.logout();
    });
    expect(result.current.currentUser).toBeNull();
  });
});
