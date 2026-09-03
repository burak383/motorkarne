// MotorKarne canlı API yapılandırması.
// Railway'de deploy edilen backend'in genel adresi.
export const API_BASE_URL = 'https://motorkarne-production.up.railway.app';

export const API_ENDPOINTS = {
  motors: `${API_BASE_URL}/api/motors`,
  vehicles: `${API_BASE_URL}/api/vehicles`,
  health: `${API_BASE_URL}/health`,
};
