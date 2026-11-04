"use client";
import { FormEvent, useEffect, useState } from "react";
import PasswordInput from "@/components/PasswordInput";
import { useRouter } from "next/navigation";
import { post } from "@/lib/api";
import { setFlash, useAuth } from "@/lib/auth";

export default function ChangePasswordPage() {
  const { user, ready, refresh, logout } = useAuth();
  const router = useRouter();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (ready && !user) router.replace("/login"); }, [ready, user, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (next.length < 8) { setErr("새 비밀번호는 8자 이상이어야 해요."); return; }
    if (next !== again) { setErr("새 비밀번호가 서로 달라요."); return; }
    setBusy(true); setErr(null);
    try {
      await post("/auth/change-password", { currentPassword: cur, newPassword: next });
      await refresh();
      setFlash("");
      router.replace("/");
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit} noValidate>
        <div><h1>비밀번호를 바꿔 주세요</h1><p className="sub" style={{ marginTop: 4 }}>임시 비밀번호로 들어왔어요. 새 비밀번호로 바꾸면 다른 화면을 쓸 수 있어요.</p></div>
        {err && <div className="alert alert-negative" role="alert">{err}</div>}
        <div className="field"><label htmlFor="c">지금 비밀번호</label><PasswordInput id="c" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
        <div className="field"><label htmlFor="n">새 비밀번호</label><PasswordInput id="n" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /><span className="help">8자 이상</span></div>
        <div className="field"><label htmlFor="a">새 비밀번호 확인</label><PasswordInput id="a" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} /></div>
        <button className={"btn btn-block" + (busy ? " is-loading" : "")} type="submit" disabled={busy}>{busy ? "처리 중" : "비밀번호 바꾸기"}</button>
        <button type="button" className="textbtn dark" onClick={logout}>로그아웃</button>
      </form>
    </div>
  );
}
