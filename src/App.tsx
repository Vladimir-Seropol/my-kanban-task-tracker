import { useEffect, useState } from "react";
import { Board } from "./components/Board/Board";
import { AuthPage } from "./components/Auth/AuthPage";
import { supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";
import "./App.css";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setAuthLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (authLoading) {
    return <div className="app-loading">Загрузка...</div>;
  }

  if (!session) {
    return <AuthPage onAuthSuccess={() => undefined} />;
  }

  return (
    <div className="app-shell">
      <div className="app-auth-floating">
        <span className="app-user-email" title={session.user.email}>
          {session.user.email}
        </span>
        <button className="app-logout" type="button" onClick={() => supabase.auth.signOut()}>
          Выйти
        </button>
      </div>
      <Board />
    </div>
  );
}
