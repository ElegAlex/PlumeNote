// ===========================================
// Client API (Axios-like fetch wrapper)
// ===========================================

const API_BASE = '/api/v1';

interface ApiResponse<T = any> {
  data: T;
  status: number;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
    status?: number;
  };
  message: string;
}

async function request<T = any>(
  method: string,
  path: string,
  data?: any
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${path}`;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Pour les cookies
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error: ApiError = {
      response: {
        data: errorData,
        status: response.status,
      },
      message: errorData.message || `HTTP Error ${response.status}`,
    };
    throw error;
  }

  const responseData = await response.json().catch(() => ({}));

  return {
    data: responseData,
    status: response.status,
  };
}

export const api = {
  get: <T = any>(path: string) => request<T>('GET', path),
  post: <T = any>(path: string, data?: any) => request<T>('POST', path, data),
  put: <T = any>(path: string, data?: any) => request<T>('PUT', path, data),
  patch: <T = any>(path: string, data?: any) => request<T>('PATCH', path, data),
  delete: <T = any>(path: string) => request<T>('DELETE', path),
};
