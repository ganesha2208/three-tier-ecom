import axios, { AxiosError, AxiosRequestConfig } from "axios";

import { useAuthStore } from "@/store/auth";

const baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export const api = axios.create({ baseURL });

api.interceptors.request.use((cfg) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    cfg.headers = cfg.headers ?? {};
    cfg.headers["Authorization"] = `Bearer ${token}`;
  }
  return cfg;
});

let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

function flushQueue(token: string | null) {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      const refresh = useAuthStore.getState().refreshToken;
      if (!refresh) {
        useAuthStore.getState().clear();
        return Promise.reject(error);
      }
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push((token) => {
            if (!token) return reject(error);
            original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
            original._retry = true;
            resolve(api(original));
          });
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post(`${baseURL}/auth/refresh`, {
          refresh_token: refresh,
        });
        useAuthStore.getState().setTokens(data.access_token, data.refresh_token);
        flushQueue(data.access_token);
        original.headers = {
          ...original.headers,
          Authorization: `Bearer ${data.access_token}`,
        };
        return api(original);
      } catch (e) {
        flushQueue(null);
        useAuthStore.getState().clear();
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export function extractError(e: unknown): string {
  const err = e as AxiosError<{ detail?: string | Array<{ msg: string }> }>;
  const d = err.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d[0]?.msg) return d[0].msg;
  return err.message || "Something went wrong";
}
