"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { get } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { addDays, fmtDate, fmtDateTime, minutesFromDay, todayStr } from "@/lib/format";
import { ErrorBox, PageHead, Spinner } from "@/components/ui";

type Av = { date: string; vehicles: { id: number; model: string; plateNo: string; seatCount: number;
  reservations: { id: number; startAt: string; endAt: string; status: string; driverName?: string; departmentName?: string }[];
  maintenance: { startDate: string; endDate: string; reason: string }[] }[] };

const hours = Array.from({ length: 24 }, (_, i) => i);

export default function AvailabilityPage() {
  const router = useRouter();
  const [date, setDate] = useState(todayStr());
  const { data, error, loading } = useFetch(() => get<Av>("/reservations/availability", { date }), [date]);

  return (
    <>
      <PageHead title="예약 현황표" desc={fmtDate(date)}
        right={<div className="row">
          <button className="btn btn-outline btn-xs" style={{ height: 40, width: 40, padding: 0 }} onClick={() => setDate(addDays(date, -1))} aria-label="전날">‹</button>
          <input className="input" type="date" style={{ height: 40, width: 160 }} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="날짜" />
          <button className="btn btn-outline btn-xs" style={{ height: 40, width: 40, padding: 0 }} onClick={() => setDate(addDays(date, 1))} aria-label="다음날">›</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setDate(todayStr())}>오늘</button>
        </div>} />
      <ErrorBox message={error} />
      <div className="legend">
        <span><i style={{ background: "var(--blue-100)" }} />예약됨</span>
        <span><i style={{ background: "var(--green-50)", outline: "1px solid var(--green-500)" }} />운행 중</span>
        <span><i style={{ background: "var(--orange-50)" }} />확인 대기</span>
        <span><i style={{ background: "var(--gray-100)" }} />반납</span>
        <span><i style={{ background: "repeating-linear-gradient(135deg,var(--gray-100) 0,var(--gray-100) 3px,var(--gray-300) 3px,var(--gray-300) 6px)" }} />점검</span>
      </div>
      {loading && !data ? <Spinner /> : data && (
        <div className="gantt">
          <div className="gantt-in">
            <div className="g-head">
              <div style={{ padding: 8 }}>차량</div>
              <div className="g-hours">{hours.map((h) => <span key={h}>{h}</span>)}</div>
            </div>
            {data.vehicles.map((v) => {
              const maint = v.maintenance.filter((m) => m.startDate <= date && date <= m.endDate);
              return (
                <div className="g-row" key={v.id}>
                  <div className="g-label"><b>{v.model}</b><span className="muted">{v.plateNo} · {v.seatCount}석</span></div>
                  <div className="g-track">
                    {maint.map((m, i) => (
                      <div key={i} className="g-maint" style={{ left: 0, width: "100%" }}><b>점검</b> {m.reason}</div>
                    ))}
                    {v.reservations.map((r) => {
                      const s = Math.max(0, minutesFromDay(r.startAt, date));
                      const e = Math.min(1440, minutesFromDay(r.endAt, date));
                      if (e <= 0 || s >= 1440) return null;
                      return (
                        <button key={r.id} className={"g-bar s-" + r.status.replace(/ /g, "")} style={{ left: `${(s / 1440) * 100}%`, width: `${Math.max(((e - s) / 1440) * 100, 1.5)}%` }}
                          title={`${r.driverName ?? ""} ${r.departmentName ?? ""} ${fmtDateTime(r.startAt)} ~ ${fmtDateTime(r.endAt)} (${r.status})`}
                          onClick={() => router.push(`/reservations/${r.id}`)}>
                          <b>{r.driverName ?? r.status}</b>{r.departmentName ?? ""} · {r.status}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
