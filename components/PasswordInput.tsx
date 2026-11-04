"use client";
import { useState, type InputHTMLAttributes } from "react";

/** 비밀번호 칸 + 눈 모양 "보기" 버튼. 한 번 누르면 보이고, 다시 누르면 숨겨져요. */
export default function PasswordInput({ className = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap">
      <input {...props} className={`input ${className}`} type={show ? "text" : "password"} />
      <button type="button" className="pw-toggle" aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"} aria-pressed={show} onClick={() => setShow((s) => !s)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {show ? (
            <>
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </>
          ) : (
            <>
              <path d="M3 3l18 18" />
              <path d="M10.6 6.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.5 6.9A17.4 17.4 0 0 0 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1" />
              <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
