import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import axios from "axios";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";

type Mode = "login" | "register";

export default function Auth() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState<Mode>("login");

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function switchMode() {
    setMode(mode === "login" ? "register" : "login");

    setName("");
    setUsername("");
    setEmail("");
    setPassword("");

    setMessage("");
    setError("");
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      if (mode === "register") {
        await api.post("/auth/register", {
          username,
          name,
          email,
          password,
        });

        /*
         * IMPORTANT:
         * Registration does NOT authenticate the user.
         * We intentionally send the user to LOGIN.
         */

        setMessage(
          "Account created successfully. Please sign in."
        );

        setMode("login");

        setPassword("");
      } else {
        await login(username, password);

        navigate("/", {
          replace: true,
        });
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.detail ||
            "Something went wrong."
        );
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="eyebrow">
            CRICPULSE ACCOUNT
          </span>

          <h1>
            {mode === "login"
              ? "Welcome back"
              : "Create your account"}
          </h1>

          <p>
            {mode === "login"
              ? "Sign in to your cricket world."
              : "Create your identity and join the CricPulse cricket community."}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <label>Full name</label>

              <div className="input-wrapper">
                <User size={18} />

                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Sujal Tiwari"
                  required
                />
              </div>

              <label>Username</label>

              <div className="input-wrapper">
                <User size={18} />

                <input
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                  placeholder="sujal123"
                  minLength={3}
                  maxLength={30}
                  required
                />
              </div>
            </>
          )}

          <label>
            {mode === "login"
              ? "Username or email"
              : "Email"}
          </label>

          <div className="input-wrapper">
            <Mail size={18} />

            <input
              type={
                mode === "login"
                  ? "text"
                  : "email"
              }
              value={
                mode === "login"
                  ? username
                  : email
              }
              onChange={(e) =>
                mode === "login"
                  ? setUsername(e.target.value)
                  : setEmail(e.target.value)
              }
              placeholder={
                mode === "login"
                  ? "sujal123 or email"
                  : "you@example.com"
              }
              required
            />
          </div>

          {mode === "login" && (
            <div className="login-email-hint">
              You can sign in using your username or email.
            </div>
          )}

          <label>Password</label>

          <div className="input-wrapper">
            <Lock size={18} />

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="••••••••"
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowPassword(!showPassword)
              }
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {message && (
            <div className="success-message">
              {message}
            </div>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={submitting}
          >
            {submitting
              ? "Please wait..."
              : mode === "login"
              ? "Sign in"
              : "Create account"}
          </button>
        </form>

        <button
          type="button"
          className="switch-auth"
          onClick={switchMode}
        >
          {mode === "login"
            ? "Need an account? Register"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}