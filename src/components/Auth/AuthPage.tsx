import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./AuthPage.module.css";

type AuthPageProps = {
  onAuthSuccess: () => void;
};

export const AuthPage = ({ onAuthSuccess }: AuthPageProps) => {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
            onClick={() => setMode("signIn")}
          >
            Вход
          </button>
          <button
            type="button"
            className={mode === "signUp" ? styles.switchActive : styles.switch}
            onClick={() => setMode("signUp")}
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
          <label className={styles.label}>
            Пароль
            <input
              className={styles.input}
              type="password"
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>

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
