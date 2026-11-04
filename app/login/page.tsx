"use client";
import { FormEvent, useEffect, useState } from "react";
import PasswordInput from "@/components/PasswordInput";
import { useRouter } from "next/navigation";
import { takeFlash, useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false); // 4초 넘게 걸리면 "서버 깨우는 중" 안내
  useEffect(() => {
    if (!busy) { setSlow(false); return; }
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, [busy]);

  useEffect(() => { const f = takeFlash(); if (f) setErr(f); }, []);
  useEffect(() => {
    if (ready && user) router.replace(user.mustChangePassword ? "/change-password" : "/");
  }, [ready, user, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) { setErr("이메일과 비밀번호를 입력해 주세요."); return; }
    setBusy(true); setErr(null);
    const r = await login(email.trim(), password);
    setBusy(false);
    if (!r.ok) setErr(r.message || "이메일이나 비밀번호를 다시 확인해 주세요.");
    else router.replace(r.mustChange ? "/change-password" : "/");
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit} noValidate>
        <div><h1>누리상사 어드민</h1><p className="sub" style={{ marginTop: 4 }}>총무팀 직원만 들어올 수 있어요.</p></div>
        {err && <div className="alert alert-negative" role="alert">{err}</div>}
        {slow && <div className="alert alert-info" role="status">서버를 깨우는 중이에요. 무료 서버라 한동안 쓰지 않으면 잠들어서, 첫 접속은 30초~1분쯤 걸릴 수 있어요. 잠시만 기다려 주세요.</div>}
        <div className="field">
          <label htmlFor="email">이메일</label>
          <input id="email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pw">비밀번호</label>
          <PasswordInput id="pw" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className={"btn btn-block" + (busy ? " is-loading" : "")} type="submit" disabled={busy}>{busy ? "처리 중" : "로그인"}</button>
      </form>
    </div>
  );
}
