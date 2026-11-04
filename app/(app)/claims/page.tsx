"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { get, Page, post } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { fmtDate, fmtDateTime, monthLabel, monthStr, shiftMonth } from "@/lib/format";
import { Chip, Col, ConfirmDialog, DataTable, ErrorBox, Modal, MonthNav, Num, PageHead, Section, Spinner, StatusChip, useToast } from "@/components/ui";

type Claim = { id: number; employeeId: number; employeeName: string; departmentName: string; travelDate: string; destination: string; distanceKm: number; ratePerKm: number; amount: number;
  distanceWarning: boolean; status: string; decidedAt: string | null; rejectReason: string | null; canceledAt: string | null; createdAt: string };
type Monthly = { month: string; total: number; byEmployee: { employeeId: number; name: string; departmentName: string; claimCount: number; distanceKm: number; amount: number }[];
  byDepartment: { departmentId: number; departmentName: string; claimCount: number; distanceKm: number; amount: number }[] };

const STATUSES = ["신청됨", "승인됨", "반려됨", "취소"];

function Inner() {
  const sp = useSearchParams();
  const toast = useToast();
  const [status, setStatus] = useState(sp.get("status") || "");
  const [page, setPage] = useState(1);
  const [month, setMonth] = useState(monthStr());
  const list = useFetch(() => get<Page<Claim>>("/claims", { status, page, size: 20 }), [status, page]);
  const monthly = useFetch(() => get<Monthly>("/claims/monthly", { month }), [month]);
  const [approve, setApprove] = useState<Claim | null>(null);
  const [reject, setReject] = useState<Claim | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  function reloadAll() { list.reload(); monthly.reload(); }

  async function doApprove() {
    if (!approve) return;
    setBusy(true); setErr(null);
    try { await post(`/claims/${approve.id}/approve`); toast("정산을 승인했어요."); setApprove(null); reloadAll(); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  }
  async function doReject() {
    if (!reject) return;
    if (!reason.trim()) { setErr("반려 사유를 적어 주세요."); return; }
    setBusy(true); setErr(null);
    try { await post(`/claims/${reject.id}/reject`, { reason: reason.trim() }); toast("정산을 반려했어요."); setReject(null); reloadAll(); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  const cols: Col<Claim>[] = [
    { key: "n", header: "신청자", render: (c) => <><b style={{ color: "var(--text-strong)" }}>{c.employeeName}</b> <span className="muted">{c.departmentName}</span></> },
    { key: "d", header: "이용일", render: (c) => fmtDate(c.travelDate) },
    { key: "dest", header: "목적지", render: (c) => c.destination },
    { key: "km", header: "왕복 거리", render: (c) => <><Num v={c.distanceKm} unit="km" />{c.distanceWarning && <> <Chip tone="caution">1,000km 초과</Chip></>}</> },
    { key: "amt", header: "금액", render: (c) => <Num v={c.amount} unit="원" /> },
    { key: "s", header: "상태", render: (c) => <div className="row"><StatusChip status={c.status} kind="claim" />{c.status === "반려됨" && c.rejectReason && <span className="sub" title={c.rejectReason}>{c.rejectReason}</span>}</div> },
    { key: "a", header: "", align: "right", render: (c) => c.status === "신청됨" ? (
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-xs" onClick={() => { setErr(null); setApprove(c); }}>승인</button>
        <button className="btn btn-tertiary btn-xs" onClick={() => { setErr(null); setReason(""); setReject(c); }}>반려</button>
      </div>) : <span className="muted">{c.decidedAt ? fmtDateTime(c.decidedAt) : ""}</span> },
  ];

  const m = monthly.data;
  return (
    <>
      <PageHead title="개인 차량 정산" desc="개인 차량으로 출장 간 거리를 1km당 200원으로 정산해요." />
      <Section title="월별 승인 금액" right={<MonthNav label={monthLabel(month)} onPrev={() => setMonth(shiftMonth(month, -1))} onNext={() => setMonth(shiftMonth(month, 1))} />}>
        <ErrorBox message={monthly.error} />
        <div className="card" style={{ marginBottom: 12 }}><span className="sub">승인 합계 </span><span style={{ fontSize: 22 }}><Num v={m?.total ?? 0} unit="원" /></span></div>
        <div className="cols2">
          <div>
            <h3 style={{ marginBottom: 8 }}>직원별</h3>
            <DataTable hideTotal rows={m?.byEmployee ?? []} rowKey={(r) => r.employeeId} loading={monthly.loading} empty="승인된 정산이 없어요."
              cols={[
                { key: "n", header: "직원", render: (r) => <>{r.name} <span className="muted">{r.departmentName}</span></> },
                { key: "c", header: "건수", render: (r) => <Num v={r.claimCount} unit="건" /> },
                { key: "k", header: "거리", render: (r) => <Num v={r.distanceKm} unit="km" /> },
                { key: "a", header: "금액", render: (r) => <Num v={r.amount} unit="원" /> },
              ]} />
          </div>
          <div>
            <h3 style={{ marginBottom: 8 }}>부서별</h3>
            <DataTable hideTotal rows={m?.byDepartment ?? []} rowKey={(r) => r.departmentId} loading={monthly.loading}
              cols={[
                { key: "n", header: "부서", render: (r) => r.departmentName },
                { key: "c", header: "건수", render: (r) => <Num v={r.claimCount} unit="건" /> },
                { key: "k", header: "거리", render: (r) => <Num v={r.distanceKm} unit="km" /> },
                { key: "a", header: "금액", render: (r) => <Num v={r.amount} unit="원" /> },
              ]} />
          </div>
        </div>
      </Section>

      <Section title="신청 목록">
        <div className="tabs">
          <button className={"pick" + (status === "" ? " on" : "")} onClick={() => { setStatus(""); setPage(1); }}>전체</button>
          {STATUSES.map((s) => <button key={s} className={"pick" + (status === s ? " on" : "")} onClick={() => { setStatus(s); setPage(1); }}>{s}</button>)}
        </div>
        <ErrorBox message={list.error} />
        <DataTable cols={cols} rows={list.data?.items ?? []} rowKey={(c) => c.id} total={list.data?.total} page={page} onPage={setPage} loading={list.loading} empty="정산 신청이 없어요." />
      </Section>

      {approve && <ConfirmDialog title="정산을 승인할까요?" confirmLabel="승인" busy={busy} error={err} onConfirm={doApprove} onClose={() => setApprove(null)}
        message={<>{approve.employeeName}님 · {fmtDate(approve.travelDate)} · {approve.distanceKm.toLocaleString("ko-KR")}km · {approve.amount.toLocaleString("ko-KR")}원을 승인해요.{approve.distanceWarning && <><br /><b>거리가 1,000km를 넘어요. 맞는지 확인해 주세요.</b></>}</>} />}
      {reject && (
        <Modal title="정산을 반려할까요?" onClose={() => setReject(null)}>
          <div className="body3">{reject.employeeName}님 · {fmtDate(reject.travelDate)} · {reject.amount.toLocaleString("ko-KR")}원</div>
          <div className="field"><label htmlFor="rr">반려 사유</label>
            <textarea id="rr" className={"textarea" + (err && !reason.trim() ? " error" : "")} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="직원에게 보여 줄 사유를 적어 주세요" /></div>
          {err && <div className="field-error">{err}</div>}
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn-tertiary btn-sm" onClick={() => setReject(null)} disabled={busy}>닫기</button>
            <button className="btn btn-danger btn-sm" onClick={doReject} disabled={busy}>{busy ? "처리 중" : "반려"}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
export default function ClaimsPage() { return <Suspense fallback={<Spinner />}><Inner /></Suspense>; }
