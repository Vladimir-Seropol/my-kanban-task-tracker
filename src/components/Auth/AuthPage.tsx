import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./AuthPage.module.css";

type AuthPageProps = {
  onAuthSuccess: () => void;
};

const EyeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export const AuthPage = ({ onAuthSuccess }: AuthPageProps) => {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (mode === "signUp") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;

        setInfo(
          "Регистрация успешна. Если включено подтверждение email, проверьте почту."
        );
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        onAuthSuccess();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ошибка авторизации. Попробуйте снова.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Kanban Board</h1>
        <p className={styles.subtitle}>Войдите, чтобы открыть вашу доску.</p>

        <div className={styles.switchRow}>
          <button
            type="button"
            className={mode === "signIn" ? styles.switchActive : styles.switch}
            onClick={() => {
              setMode("signIn");
              setShowPassword(false);
            }}
          >
            Вход
          </button>
          <button
            type="button"
            className={mode === "signUp" ? styles.switchActive : styles.switch}
            onClick={() => {
              setMode("signUp");
              setShowPassword(false);
            }}
          >
            Регистрация
          </button>
        </div>

        <form className={styles.form} onSubmit={submit}>
          <label className={styles.label}>
            Email
            <input
              className={styles.input}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <div className={styles.label}>
            <label className={styles.passwordLabel} htmlFor="auth-password">
              Пароль
            </label>
            <div className={styles.passwordField}>
              <input
                id="auth-password"
                className={styles.inputPassword}
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                title={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {error ? <p className={styles.error}>{error}</p> : null}
          {info ? <p className={styles.info}>{info}</p> : null}

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading
              ? "Подождите..."
              : mode === "signIn"
              ? "Войти"
              : "Создать аккаунт"}
          </button>
        </form>
      </div>
    </div>
  );
};
