import { createContext, useContext, useEffect, useMemo, useState } from "react";
import authService from "../features/auth/authService";
import { tokenStorage } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => tokenStorage.getAccessToken());
  const [refreshToken, setRefreshToken] = useState(() => tokenStorage.getRefreshToken());
  const [bootstrapping, setBootstrapping] = useState(true);

  const isAuthenticated = Boolean(accessToken && user);

  const applyAuth = ({
    accessToken: nextAccessToken = "",
    refreshToken: nextRefreshToken = "",
    user: nextUser = null,
  }) => {
    setAccessToken(nextAccessToken);
    setRefreshToken(nextRefreshToken);
    tokenStorage.setTokens({
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
    });
    setUser(nextUser);
  };

  const clearAuth = () => {
    setAccessToken("");
    setRefreshToken("");
    setUser(null);
    tokenStorage.clear();
  };

  const bootstrapUser = async () => {
    const storedAccessToken = tokenStorage.getAccessToken();
    const storedRefreshToken = tokenStorage.getRefreshToken();

    if (!storedAccessToken) {
      clearAuth();
      setBootstrapping(false);
      return;
    }

    try {
      const currentUser = await authService.getMe();

      applyAuth({
        accessToken: tokenStorage.getAccessToken() || storedAccessToken,
        refreshToken: tokenStorage.getRefreshToken() || storedRefreshToken,
        user: currentUser,
      });
    } catch (error) {
      clearAuth();
    } finally {
      setBootstrapping(false);
    }
  };

  useEffect(() => {
    bootstrapUser();
  }, []);

  const login = async ({ email, password }) => {
    const authData = await authService.login({ email, password });

    tokenStorage.setTokens({
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
    });

    const currentUser = await authService.getMe();

    applyAuth({
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
      user: currentUser,
    });

    return currentUser;
  };

  const register = async ({ fullName, email, password }) => {
    const authData = await authService.register({ fullName, email, password });

    tokenStorage.setTokens({
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
    });

    const currentUser = await authService.getMe();

    applyAuth({
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
      user: currentUser,
    });

    return currentUser;
  };

  const logout = async () => {
    try {
      const currentRefreshToken = tokenStorage.getRefreshToken();
      if (currentRefreshToken) {
        await authService.logout(currentRefreshToken);
      }
    } catch (error) {
    } finally {
      clearAuth();
    }
  };

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      isAuthenticated,
      bootstrapping,
      login,
      register,
      logout,
      bootstrapUser,
      clearAuth,
    }),
    [user, accessToken, refreshToken, isAuthenticated, bootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}