"use client";
import { useState } from "react";
import { post } from "@/lib/api";
import { fmtDateTime, fmtMinutes, fmtNum } from "@/lib/format";
import { Chip, Col, ConfirmDialog, Num, StatusChip, useToast } from "./ui";

export type Resv = {
  id: number; vehicleId: number; model: string; plateNo: string; driverId: number; driverName: string; departmentName: string;
  startAt: string; endAt: string; destination: string; passengerCount: number;
  status: string; createdAt: string; tripId: number | null; startOdometer: number | null; endOdometer: number | null;
  confirmedBy: number | null; confirmedAt: string | null; smokingViolation: boolean | null;
  overdue: boolean; distanceWarning: boolean; overdueMinutes?: number;
  returnEnteredAt?: string | null; fuelTotal?: number | null; fuelAmount?: number | null;
};

export const vehicleCell = (r: Resv) => <><b style={{ color: "var(--text-strong)" }}>{r.model}</b> <span className="muted">{r.plateNo}</span></>;
export const dist = (r: Resv) => (r.endOdometer != null && r.startOdometer != null ? r.endOdometer - r.startOdometer : null);

export function statusOf(r: Resv) {
  return r.overdue ? "미반납" : r.status;
}

export function overdueCols(): Col<Resv>[] {
  return [
    { key: "v", header: "차량", render: vehicleCell },
    { key: "d", header: "운전자", render: (r) => r.driverName },
    { key: "dep", header: "부서", render: (r) => r.departmentName },
    { key: "e", header: "반납 예정", render: (r) => fmtDateTime(r.endAt) },
    { key: "o", header: "지난 시간", render: (r) => <b style={{ color: "var(--red-600)" }}>{fmtMinutes(r.overdueMinutes)}</b> },
    { key: "s", header: "상태", render: () => <StatusChip status="미반납" /> },
  ];
}

/** 반납 확인 창 (흡연 위반 체크 + 확인) */
export function ConfirmReturnModal({ r, onClose, onDone }: { r: Resv; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [smoking, setSmoking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    setBusy(true); setErr(null);
    try {
      await post(`/reservations/${r.id}/confirm`, { smokingViolation: smoking });
      toast("반납을 확인했어요.");
      onDone();
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }
  const d = dist(r);
  return (
    <ConfirmDialog title="반납을 확인할까요?" confirmLabel="반납 확인" busy={busy} error={err} onConfirm={go} onClose={onClose}
      message={<>{r.model} {r.plateNo} · {r.driverName}<br />운행 거리 {d != null ? <Num v={d} unit="km" /> : "-"}. 확인하면 되돌릴 수 없어요.</>}>
      <label className="row body3" style={{ gap: 8 }}>
        <input type="checkbox" checked={smoking} onChange={(e) => setSmoking(e.target.checked)} style={{ width: 18, height: 18 }} />
        차 안에서 흡연한 흔적이 있어요 (흡연 위반)
      </label>
    </ConfirmDialog>
  );
}

export function confirmWaitCols(onConfirm: (r: Resv) => void): Col<Resv>[] {
  return [
    { key: "v", header: "차량", render: vehicleCell },
    { key: "d", header: "운전자", render: (r) => r.driverName },
    { key: "km", header: "운행 거리", render: (r) => { const d = dist(r); return d == null ? "-" : <><Num v={d} unit="km" />{r.distanceWarning && <> <Chip tone="caution">500km 초과</Chip></>}</>; } },
    { key: "fuel", header: "주유비", render: (r) => (r.fuelTotal ?? r.fuelAmount) != null ? <Num v={(r.fuelTotal ?? r.fuelAmount) as number} unit="원" /> : <span className="muted">-</span> },
    { key: "t", header: "도착 입력 시각", render: (r) => fmtDateTime(r.returnEnteredAt) },
    { key: "a", header: "", align: "right", render: (r) => <button className="btn btn-xs" onClick={(e) => { e.stopPropagation(); onConfirm(r); }}>반납 확인</button> },
  ];
}

export { fmtNum };
