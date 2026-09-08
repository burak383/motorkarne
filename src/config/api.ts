// MotorKarne canlı API yapılandırması.
// Railway'de deploy edilen backend'in genel adresi.
export const API_BASE_URL = 'https://motorkarne-production.up.railway.app';

export const API_ENDPOINTS = {
  motors: `${API_BASE_URL}/api/motors`,
  vehicles: `${API_BASE_URL}/api/vehicles`,
  health: `${API_BASE_URL}/health`,
  auth: {
    register: `${API_BASE_URL}/api/auth/register`,
    login: `${API_BASE_URL}/api/auth/login`,
    socialLogin: `${API_BASE_URL}/api/auth/social-login`,
    checkEmail: `${API_BASE_URL}/api/auth/check-email`,
    resetPassword: `${API_BASE_URL}/api/auth/reset-password`,
    me: `${API_BASE_URL}/api/auth/me`,
    mePassword: `${API_BASE_URL}/api/auth/me/password`,
  },
};
