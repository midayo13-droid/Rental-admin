"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, clearToken, getToken, handlers, post, setToken } from "./api";

export type User = {
  id: number; email: string; role: "고객" | "일반 직원" | "관리자"; mustChangePassword: boolean;
  employeeId: number; employeeNo: string; name: string; departmentId: number; departmentName: string;
  licenseStatus: string; licenseExpiry: string | null;
};

type Ctx = {
  user: User | null; ready: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string; mustChange?: boolean }>;
  logout: () => void;
  refresh: () => Promise<void>;
  isAdmin: boolean;
};
const AuthCtx = createContext<Ctx>(null as unknown as Ctx);
export const useAuth = () => useContext(AuthCtx);

const FLASH = "nuri_admin_flash";
export function setFlash(msg: string) { try { sessionStorage.setItem(FLASH, msg); } catch { /* ignore */ } }
export function takeFlash(): string | null {
  try { const v = sessionStorage.getItem(FLASH); if (v) sessionStorage.removeItem(FLASH); return v; } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    handlers.onUnauthorized = () => {
      clearToken(); setUser(null); setFlash("다시 로그인해 주세요.");
      routerRef.current.replace("/login");
    };
    handlers.onMustChange = () => routerRef.current.replace("/change-password");
    (async () => {
      if (getToken()) {
        try {
          const me = await api<User>("/auth/me");
          if (me.role === "고객") { clearToken(); setFlash("쓸 수 없는 화면이에요. 직원용 화면이에요."); }
          else setUser(me);
        } catch { /* 401 은 핸들러가 처리 */ }
      }
      setReady(true);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const r = await post<{ token: string; user: User }>("/auth/login", { email, password });
      if (r.user.role === "고객") {
        clearToken(); setUser(null);
        return { ok: false, message: "쓸 수 없는 화면이에요. 직원용 화면이에요." };
      }
      setToken(r.token); setUser(r.user);
      return { ok: true, mustChange: r.user.mustChangePassword };
    } catch (e: any) {
      return { ok: false, message: e.message };
    }
  }, []);

  const logout = useCallback(() => {
    clearToken(); setUser(null); routerRef.current.replace("/login");
  }, []);

  const refresh = useCallback(async () => {
    try { setUser(await api<User>("/auth/me")); } catch { /* ignore */ }
  }, []);

  return <AuthCtx.Provider value={{ user, ready, login, logout, refresh, isAdmin: user?.role === "관리자" }}>{children}</AuthCtx.Provider>;
}
