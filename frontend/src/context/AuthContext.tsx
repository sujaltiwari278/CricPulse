import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import api from "../api/client";

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;

  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  // ---------------------------------------
  // LOAD CURRENT USER
  // ---------------------------------------

  async function loadUser() {
    const token = localStorage.getItem("cricpulse_token");

    console.log("Stored token:", token);

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get<User>("/auth/me");

      console.log("Current user:", response.data);

      setUser(response.data);
    } catch (error) {
      console.error("Failed to load user:", error);

      localStorage.removeItem("cricpulse_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  // ---------------------------------------
  // LOGIN
  // ---------------------------------------

  async function login(
    identifier: string,
    password: string
  ) {
    const response = await api.post<LoginResponse>(
      "/auth/login",
      {
        identifier,
        password,
      }
    );

    console.log("LOGIN RESPONSE:", response.data);

    const token = response.data.access_token;

    if (!token) {
      throw new Error("Login succeeded but no access token was returned.");
    }

    // IMPORTANT
    localStorage.setItem(
      "cricpulse_token",
      token
    );

    console.log(
      "Token stored:",
      localStorage.getItem("cricpulse_token")
    );

    // Now get current user
    const me = await api.get<User>("/auth/me");

    setUser(me.data);
  }

  // ---------------------------------------
  // LOGOUT
  // ---------------------------------------

  function logout() {
    localStorage.removeItem("cricpulse_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}