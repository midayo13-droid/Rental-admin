"use client";
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

/** 불러오는 동안 회색 자리표시자(스켈레톤)를 보여 줘요. (이름은 예전 그대로) */
export function Spinner({ label }: { label?: string }) {
  return (
    <div className="stack" role="status" aria-label={label ?? "불러오는 중"} style={{ gap: 8 }}>
      {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}
    </div>
  );
}
export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="alert alert-negative" role="alert" style={{ marginBottom: 12 }}><span>{message}</span></div>;
}
export function Empty({ children }: { children?: ReactNode }) {
  return <div className="empty">{children ?? "표시할 내용이 없어요."}</div>;
}
export function Num({ v, unit }: { v: string | number; unit?: string }) {
  return <><span className="num">{typeof v === "number" ? v.toLocaleString("ko-KR") : v}</span>{unit && <span className="unit">{unit}</span>}</>;
}

const RES: Record<string, string> = { "예약됨": "chip-info", "운행 중": "chip-positive", "확인 대기": "chip-caution", "반납": "chip-gray", "취소": "chip-muted", "미반납": "chip-negative", "기한 초과": "chip-negative" };
const LIC: Record<string, string> = { "승인": "chip-positive", "승인 대기": "chip-caution", "미등록": "chip-gray" };
const CLAIM: Record<string, string> = { "신청됨": "chip-info", "승인됨": "chip-positive", "반려됨": "chip-negative", "취소": "chip-muted" };
const ACC: Record<string, string> = { "사용": "chip-positive", "정지": "chip-negative" };
export function StatusChip({ status, kind = "res" }: { status: string; kind?: "res" | "lic" | "claim" | "acc" }) {
  const map = kind === "lic" ? LIC : kind === "claim" ? CLAIM : kind === "acc" ? ACC : RES;
  return <span className={"chip " + (map[status] || "")}>{status}</span>;
}
export function Chip({ tone, children }: { tone: "caution" | "negative" | "info" | "gray" | "positive"; children: ReactNode }) {
  return <span className={"chip chip-" + tone}>{children}</span>;
}

export function Modal({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="dim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} style={wide ? { maxWidth: 560 } : undefined}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog(props: {
  title: string; message: ReactNode; confirmLabel: string; danger?: boolean; busy?: boolean; error?: string | null;
  onConfirm: () => void; onClose: () => void; children?: ReactNode; confirmDisabled?: boolean;
}) {
  return (
    <Modal title={props.title} onClose={props.onClose}>
      <div className="body3">{props.message}</div>
      {props.children}
      {props.error && <div className="field-error">{props.error}</div>}
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-tertiary btn-sm" onClick={props.onClose} disabled={props.busy}>닫기</button>
        <button className={"btn btn-sm " + (props.danger ? "btn-danger" : "")} onClick={props.onConfirm} disabled={props.busy || props.confirmDisabled}>
          {props.busy ? "처리 중" : props.confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

type ToastFn = (msg: string) => void;
const ToastCtx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const show = useCallback((m: string) => setMsg(m), []);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 2600); return () => clearTimeout(t); }, [msg]);
  return <ToastCtx.Provider value={show}>{children}{msg && <div className="toast" role="status" style={{ bottom: 40 }}>{msg}</div>}</ToastCtx.Provider>;
}

export function MonthNav({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  const b = { height: 36, width: 36, padding: 0 } as const;
  return (
    <div className="row">
      <button className="btn btn-outline btn-xs" style={b} onClick={onPrev} aria-label="이전 달">‹</button>
      <span className="num" style={{ minWidth: 100, textAlign: "center" }}>{label}</span>
      <button className="btn btn-outline btn-xs" style={b} onClick={onNext} aria-label="다음 달">›</button>
    </div>
  );
}

export function PageHead({ title, desc, right }: { title: string; desc?: ReactNode; right?: ReactNode }) {
  return (
    <div className="between wrap" style={{ marginBottom: 16, alignItems: "flex-end" }}>
      <div><h1>{title}</h1>{desc && <div className="sub" style={{ marginTop: 2 }}>{desc}</div>}</div>
      {right}
    </div>
  );
}

export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div className="between" style={{ marginBottom: 10 }}><h2>{title}</h2>{right}</div>
      {children}
    </section>
  );
}

export function Pager({ page, total, size = 20, onPage }: { page: number; total: number; size?: number; onPage: (p: number) => void }) {
  const last = Math.max(1, Math.ceil(total / size));
  if (last <= 1) return null;
  const nums: number[] = [];
  const start = Math.max(1, Math.min(page - 2, last - 4));
  for (let i = start; i <= Math.min(last, start + 4); i++) nums.push(i);
  return (
    <div className="pager">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="이전 쪽">‹</button>
      {nums.map((n) => <button key={n} className={n === page ? "on" : ""} onClick={() => onPage(n)}>{n}</button>)}
      <button disabled={page >= last} onClick={() => onPage(page + 1)} aria-label="다음 쪽">›</button>
    </div>
  );
}

export type Col<T> = { key: string; header: string; render: (r: T) => ReactNode; align?: "right" };
export function DataTable<T>({ cols, rows, rowKey, onRow, total, page, size = 20, onPage, hideTotal, empty, loading }: {
  cols: Col<T>[]; rows: T[]; rowKey: (r: T) => string | number; onRow?: (r: T) => void;
  total?: number; page?: number; size?: number; onPage?: (p: number) => void; hideTotal?: boolean; empty?: string; loading?: boolean;
}) {
  const t = total ?? rows.length;
  return (
    <div>
      {!hideTotal && <div className="sub" style={{ marginBottom: 8 }}>총 <span className="num">{t.toLocaleString("ko-KR")}</span>건</div>}
      {loading ? <Spinner /> : rows.length === 0 ? <Empty>{empty}</Empty> : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr>{cols.map((c) => <th key={c.key} style={c.align ? { textAlign: c.align } : undefined}>{c.header}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={rowKey(r)} className={onRow ? "clickable" : ""} onClick={onRow ? () => onRow(r) : undefined}>
                  {cols.map((c) => <td key={c.key} style={c.align ? { textAlign: c.align } : undefined}>{c.render(r)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {onPage && page !== undefined && <Pager page={page} total={t} size={size} onPage={onPage} />}
    </div>
  );
}

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const p: Record<string, ReactNode> = {
    home: <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" />,
    list: <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
    alert: <><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.01" /></>,
    grid: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 4v16" /></>,
    car: <><path d="M5 16V11l2-5h10l2 5v5" /><path d="M3 16h18v3H3z" /></>,
    users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" /><path d="M16 5a3.5 3.5 0 010 6M18 14c2 .7 3.5 2.6 3.5 6" /></>,
    shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M12 8v5M12 16v.01" /></>,
    won: <><circle cx="12" cy="12" r="9" /><path d="M7.5 9l1.7 6 2.8-6 2.8 6 1.7-6" /></>,
    chart: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
    key: <><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3" /></>,
    refresh: <><path d="M20 12a8 8 0 11-2.4-5.7" /><path d="M20 4v5h-5" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p[name]}</svg>;
}
