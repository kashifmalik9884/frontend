import axios from "axios";

const TOKEN_KEY = "gym_access_token";
const REFRESH_TOKEN_KEY = "gym_refresh_token";

export const tokenStorage = {
  getAccessToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  },

  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY) || "";
  },

  setTokens({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
    else localStorage.removeItem(TOKEN_KEY);

    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

const baseURL =
  import.meta.env.VITE_API_BASE_URL || "https://gymsaas-api-bik5.onrender.com";

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

const refreshClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let queuedRequests = [];

function processQueue(error, newAccessToken = "") {
  queuedRequests.forEach(({ resolve, reject, originalRequest }) => {
    if (error) {
      reject(error);
      return;
    }

    originalRequest.headers = originalRequest.headers || {};
    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
    resolve(api(originalRequest));
  });

  queuedRequests = [];
}

function redirectToLogin() {
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

api.interceptors.request.use(
  (config) => {
    const accessToken = tokenStorage.getAccessToken();

    if (accessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    const refreshToken = tokenStorage.getRefreshToken();

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || "";
    const isAuthRequest =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/refresh");

    if (status !== 401 || originalRequest._retry || isAuthRequest) {
      return Promise.reject(error);
    }

    if (!refreshToken) {
      tokenStorage.clear();
      redirectToLogin();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queuedRequests.push({ resolve, reject, originalRequest });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await refreshClient.post("/auth/refresh", {
        refreshToken,
      });

      const newAccessToken = data?.accessToken;
      const newRefreshToken = data?.refreshToken;

      if (!newAccessToken || !newRefreshToken) {
        throw new Error("Invalid refresh response");
      }

      tokenStorage.setTokens({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });

      processQueue(null, newAccessToken);

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, "");
      tokenStorage.clear();
      redirectToLogin();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;