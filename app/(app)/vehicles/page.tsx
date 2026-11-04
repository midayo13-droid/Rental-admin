"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { ApiError, del, get, patch, post } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { fmtDate, fmtDateTime, todayStr } from "@/lib/format";
import { Col, ConfirmDialog, DataTable, ErrorBox, Modal, Num, PageHead, Section, useToast } from "@/components/ui";

type Vehicle = { id: number; model: string; plateNo: string; seatCount: number; initialOdometer: number };
type Maint = { id: number; vehicleId: number; model: string; plateNo: string; startDate: string; endDate: string; reason: string };

export default function VehiclesPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const vehicles = useFetch(() => get<Vehicle[]>("/vehicles"), []);
  const maint = useFetch(() => get<Maint[]>("/maintenance"), []);
  const [edit, setEdit] = useState<Vehicle | null>(null);
  const [delTarget, setDelTarget] = useState<Maint | null>(null);
  const [delErr, setDelErr] = useState<string | null>(null);
  const [mpage, setMpage] = useState(1);

  // 점검 등록 폼
  const [form, setForm] = useState({ vehicleId: "", startDate: todayStr(), endDate: todayStr(), reason: "" });
  const [fErr, setFErr] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFErr(null); setConflicts([]);
    if (!form.vehicleId) { setFErr("차량을 골라 주세요."); return; }
    if (!form.reason.trim()) { setFErr("점검 사유를 적어 주세요."); return; }
    if (form.endDate < form.startDate) { setFErr("끝일은 시작일보다 같거나 늦어야 해요."); return; }
    setBusy(true);
    try {
      await post("/maintenance", { vehicleId: Number(form.vehicleId), startDate: form.startDate, endDate: form.endDate, reason: form.reason.trim() });
      toast("점검 일정을 등록했어요.");
      setForm({ ...form, reason: "" });
      maint.reload();
    } catch (err: any) {
      setFErr(err.message);
      if (err instanceof ApiError && Array.isArray(err.body?.reservations)) setConflicts(err.body.reservations);
    }
    setBusy(false);
  }

  async function doDelete() {
    if (!delTarget) return;
    setBusy(true); setDelErr(null);
    try { await del(`/maintenance/${delTarget.id}`); toast("점검 일정을 지웠어요."); setDelTarget(null); maint.reload(); }
    catch (e: any) { setDelErr(e.message); }
    setBusy(false);
  }

  const vCols: Col<Vehicle>[] = [
    { key: "m", header: "차종", render: (v) => <b style={{ color: "var(--text-strong)" }}>{v.model}</b> },
    { key: "p", header: "차량번호", render: (v) => v.plateNo },
    { key: "s", header: "좌석 수", render: (v) => <Num v={v.seatCount} unit="석" /> },
    { key: "o", header: "초기 주행거리", render: (v) => <Num v={v.initialOdometer} unit="km" /> },
    { key: "a", header: "", align: "right", render: (v) => <button className="btn btn-tertiary btn-xs" onClick={() => setEdit(v)}>수정</button> },
  ];
  const allM = maint.data ?? [];
  const today = todayStr();
  const mCols: Col<Maint>[] = [
    { key: "v", header: "차량", render: (m) => <>{m.model} <span className="muted">{m.plateNo}</span></> },
    { key: "p", header: "기간", render: (m) => `${fmtDate(m.startDate)} ~ ${fmtDate(m.endDate)}` },
    { key: "r", header: "사유", render: (m) => m.reason },
    { key: "s", header: "상태", render: (m) => m.endDate < today ? <span className="chip chip-muted">지남</span> : m.startDate <= today ? <span className="chip chip-caution">점검 중</span> : <span className="chip chip-info">예정</span> },
    ...(isAdmin ? [{ key: "a", header: "", align: "right" as const, render: (m: Maint) => <button className="btn btn-danger btn-xs" onClick={() => { setDelErr(null); setDelTarget(m); }}>삭제</button> }] : []),
  ];

  return (
    <>
      <PageHead title="차량·점검" />
      <Section title="차량">
        <ErrorBox message={vehicles.error} />
        <DataTable cols={vCols} rows={vehicles.data ?? []} rowKey={(v) => v.id} loading={vehicles.loading} />
      </Section>

      <Section title="점검 일정 등록">
        <form className="card" onSubmit={submit} noValidate>
          <div className="filters" style={{ marginBottom: 8 }}>
            <div className="field"><label>차량</label>
              <select className="select" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
                <option value="">차량 선택</option>{(vehicles.data ?? []).map((v) => <option key={v.id} value={v.id}>{v.model} {v.plateNo}</option>)}
              </select></div>
            <div className="field"><label>시작일</label><input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div className="field"><label>끝일</label><input className="input" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            <div className="field grow" style={{ minWidth: 200 }}><label>사유</label><input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="예: 정기 점검" /></div>
            <button className="btn btn-sm" type="submit" disabled={busy}>{busy ? "처리 중" : "등록"}</button>
          </div>
          {fErr && <div className="field-error">{fErr}</div>}
          {conflicts.length > 0 && (
            <div className="alert alert-caution" style={{ marginTop: 8, flexDirection: "column" }}>
              <b>먼저 정리해야 할 예약</b>
              {conflicts.map((c) => (
                <Link key={c.id} href={`/reservations/${c.id}`} style={{ textDecoration: "underline" }}>
                  #{c.id} {c.driverName ?? ""} · {fmtDateTime(c.startAt)} ~ {fmtDateTime(c.endAt)} {c.status && `(${c.status})`}
                </Link>
              ))}
            </div>
          )}
        </form>
      </Section>

      <Section title="점검 일정">
        <ErrorBox message={maint.error} />
        <DataTable cols={mCols} rows={allM.slice((mpage - 1) * 20, mpage * 20)} total={allM.length} page={mpage} onPage={setMpage} rowKey={(m) => m.id} loading={maint.loading} empty="등록된 점검 일정이 없어요." />
      </Section>

      {edit && <EditModal v={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); toast("차량 정보를 고쳤어요."); vehicles.reload(); }} />}
      {delTarget && <ConfirmDialog title="점검 일정을 지울까요?" danger confirmLabel="삭제" busy={busy} error={delErr} onConfirm={doDelete} onClose={() => setDelTarget(null)}
        message={<>{delTarget.model} {delTarget.plateNo} · {fmtDate(delTarget.startDate)} ~ {fmtDate(delTarget.endDate)}</>} />}
    </>
  );
}

function EditModal({ v, onClose, onDone }: { v: Vehicle; onClose: () => void; onDone: () => void }) {
  const [model, setModel] = useState(v.model);
  const [plate, setPlate] = useState(v.plateNo);
  const [seat, setSeat] = useState(String(v.seatCount));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!model.trim() || !plate.trim()) { setErr("차종과 차량번호를 적어 주세요."); return; }
    const n = Number(seat);
    if (!Number.isInteger(n) || n < 1) { setErr("좌석 수는 1 이상의 숫자로 적어 주세요."); return; }
    setBusy(true); setErr(null);
    try { await patch(`/vehicles/${v.id}`, { model: model.trim(), plateNo: plate.trim(), seatCount: n }); onDone(); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  }
  return (
    <Modal title="차량 수정" onClose={onClose}>
      <div className="field"><label htmlFor="vm">차종</label><input id="vm" className="input" value={model} onChange={(e) => setModel(e.target.value)} /></div>
      <div className="field"><label htmlFor="vp">차량번호</label><input id="vp" className="input" value={plate} onChange={(e) => setPlate(e.target.value)} /></div>
      <div className="field"><label htmlFor="vs">좌석 수</label><input id="vs" className="input" inputMode="numeric" value={seat} onChange={(e) => setSeat(e.target.value.replace(/[^0-9]/g, ""))} /></div>
      {err && <div className="field-error">{err}</div>}
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-tertiary btn-sm" onClick={onClose}>닫기</button>
        <button className="btn btn-sm" onClick={go} disabled={busy}>{busy ? "처리 중" : "저장"}</button>
      </div>
    </Modal>
  );
}
