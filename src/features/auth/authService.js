import api from "../../services/api";

const authService = {
  async login({ email, password }) {
    const { data } = await api.post("/auth/login", { email, password });
    return data;
  },

  async register({ fullName, email, password }) {
    const { data } = await api.post("/auth/register", {
      fullName,
      email,
      password,
    });
    return data;
  },

  async getMe(config = {}) {
    const { data } = await api.get("/auth/me", config);
    return data;
  },

  async logout(refreshToken) {
    return api.post("/auth/logout", { refreshToken });
  },

  async refresh(refreshToken) {
    const { data } = await api.post("/auth/refresh", { refreshToken });
    return data;
  },
};

export default authService;