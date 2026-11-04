// 시각 문자열 'YYYY-MM-DDTHH:mm:ss'(한국 시간)을 시간대 변환 없이 그대로 파싱해요.
export function parts(s?: string | null) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s);
  if (!m) return null;
  return { y: +m[1], mo: +m[2], d: +m[3], h: m[4] !== undefined ? +m[4] : null, mi: m[5] !== undefined ? +m[5] : null };
}
const p2 = (n: number) => String(n).padStart(2, "0");

export function fmtDateTime(s?: string | null) {
  const p = parts(s);
  if (!p) return "-";
  return `${p.mo}월 ${p.d}일 ${p2(p.h ?? 0)}:${p2(p.mi ?? 0)}`;
}
export function fmtDate(s?: string | null) {
  const p = parts(s);
  if (!p) return "-";
  return `${p.y}년 ${p.mo}월 ${p.d}일`;
}
export function fmtShortDate(s?: string | null) {
  const p = parts(s);
  if (!p) return "-";
  return `${p.mo}월 ${p.d}일`;
}
export function fmtRange(a?: string | null, b?: string | null) {
  const pa = parts(a), pb = parts(b);
  if (!pa || !pb) return "-";
  if (pa.y === pb.y && pa.mo === pb.mo && pa.d === pb.d) return `${fmtDateTime(a)} ~ ${p2(pb.h ?? 0)}:${p2(pb.mi ?? 0)}`;
  return `${fmtDateTime(a)} ~ ${fmtDateTime(b)}`;
}
export function fmtNum(n?: number | null) {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return n.toLocaleString("ko-KR");
}
export function fmtMinutes(min?: number | null) {
  if (min === null || min === undefined) return "-";
  const h = Math.floor(min / 60), m = min % 60;
  if (h >= 24) return `${Math.floor(h / 24)}일 ${h % 24}시간`;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
export function monthStr(d = new Date()) {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`;
}
export function shiftMonth(m: string, delta: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return monthStr(d);
}
export function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return `${y}년 ${mo}월`;
}
export function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  const x = new Date(y, m - 1, d + n);
  return `${x.getFullYear()}-${p2(x.getMonth() + 1)}-${p2(x.getDate())}`;
}
// 'YYYY-MM-DDTHH:mm:ss' -> 분(해당 날짜 0시 기준). 날짜가 다르면 범위를 넘어갈 수 있음
export function minutesFromDay(s: string, day: string) {
  const p = parts(s)!;
  const [y, m, d] = day.split("-").map(Number);
  const base = Date.UTC(y, m - 1, d);
  const t = Date.UTC(p.y, p.mo - 1, p.d, p.h ?? 0, p.mi ?? 0);
  return Math.round((t - base) / 60000);
}
