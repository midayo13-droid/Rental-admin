"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { get, patch, post } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { fmtDate, fmtDateTime, fmtRange } from "@/lib/format";
import { ConfirmReturnModal } from "@/components/reservation";
import { Chip, ConfirmDialog, ErrorBox, Modal, Num, PageHead, Section, Spinner, StatusChip, useToast } from "@/components/ui";

const STEPS = ["예약됨", "운행 중", "확인 대기", "반납"];

export default function ReservationDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { data: r, error, loading, reload } = useFetch(() => get<any>(`/reservations/${id}`), [id]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [odoOpen, setOdoOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actErr, setActErr] = useState<string | null>(null);

  if (loading && !r) return <Spinner />;
  if (error && !r) return <><ErrorBox message={error} /><Link href="/reservations" className="textbtn">목록으로</Link></>;
  if (!r) return null;

  const trip = r.trip;
  const stepIdx = STEPS.indexOf(r.status);
  const distance = trip?.endOdometer != null ? trip.endOdometer - trip.startOdometer : null;
  const fuelSum = (r.fuel || []).reduce((s: number, f: any) => s + f.amount, 0);

  async function cancel() {
    setBusy(true); setActErr(null);
    try { await post(`/reservations/${id}/cancel`); toast("예약을 취소했어요."); setCancelOpen(false); reload(); }
    catch (e: any) { setActErr(e.message); }
    setBusy(false);
  }
  async function toggleReceipt(f: any) {
    try { await patch(`/fuel-records/${f.id}`, { receiptSubmitted: !f.receiptSubmitted }); reload(); }
    catch (e: any) { setActErr(e.message); }
  }

  return (
    <>
      <PageHead title={`예약 #${r.id}`} desc={<Link href="/reservations" className="textbtn" style={{ padding: 0 }}>‹ 예약 목록</Link>}
        right={<div className="row">
          {r.status === "예약됨" && <button className="btn btn-danger btn-sm" onClick={() => { setActErr(null); setCancelOpen(true); }}>대리 취소</button>}
          {r.status === "확인 대기" && <button className="btn btn-sm" onClick={() => { setActErr(null); setConfirmOpen(true); }}>반납 확인</button>}
        </div>} />
      <ErrorBox message={actErr} />
      {r.overdue && <div className="alert alert-negative" style={{ marginBottom: 12 }}><b>미반납</b> 반납 예정 시각이 지났는데 도착 입력이 없어요.</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="step-labels">{STEPS.map((s, i) => <span key={s} className={i <= stepIdx ? "on" : ""}>{s}</span>)}</div>
        <div className="steps">{STEPS.map((s, i) => <i key={s} className={i <= stepIdx ? "on" : ""} />)}</div>
        {r.status === "취소" && <div className="sub" style={{ marginTop: 8 }}>취소된 예약이에요. {r.canceledAt && fmtDateTime(r.canceledAt)}</div>}
      </div>

      <div className="cols2">
        <Section title="예약 정보">
          <div className="card"><dl className="kv" style={{ margin: 0 }}>
            <dt>상태</dt><dd><StatusChip status={r.overdue ? "미반납" : r.status} /></dd>
            <dt>차량</dt><dd>{r.model} <span className="muted">{r.plateNo}</span> · {r.seatCount}석</dd>
            <dt>운전자</dt><dd>{r.driverName} · {r.departmentName}</dd>
            <dt>이용 시간</dt><dd>{fmtRange(r.startAt, r.endAt)}</dd>
            <dt>목적지</dt><dd>{r.destination}</dd>
            <dt>탑승 인원</dt><dd><Num v={r.passengerCount} unit="명" /></dd>
            <dt>신청 시각</dt><dd>{fmtDateTime(r.createdAt)}</dd>
            {r.status === "취소" && <><dt>취소 시각</dt><dd>{fmtDateTime(r.canceledAt)}</dd></>}
          </dl></div>
        </Section>

        <Section title="운행 정보" right={trip && r.status !== "취소" ? <button className="btn btn-tertiary btn-xs" onClick={() => { setActErr(null); setOdoOpen(true); }}>출발 거리 수정</button> : undefined}>
          <div className="card">
            {!trip ? <div className="sub">아직 출발하지 않았어요.</div> : (
              <dl className="kv" style={{ margin: 0 }}>
                <dt>출발</dt><dd>{fmtDateTime(trip.departedAt)} · <Num v={trip.startOdometer} unit="km" /></dd>
                <dt>도착 입력</dt><dd>{trip.endOdometer != null ? <>{fmtDateTime(trip.returnEnteredAt)} · <Num v={trip.endOdometer} unit="km" /></> : <span className="muted">아직 입력하지 않았어요</span>}</dd>
                <dt>운행 거리</dt><dd>{distance != null ? <><Num v={distance} unit="km" />{r.distanceWarning && <> <Chip tone="caution">500km 초과</Chip></>}</> : "-"}</dd>
                <dt>반납 확인</dt><dd>{trip.confirmedAt ? <>{trip.confirmedByName} · {fmtDateTime(trip.confirmedAt)}</> : <span className="muted">확인 전</span>}</dd>
                <dt>흡연 위반</dt><dd>{trip.confirmedAt ? (trip.smokingViolation ? <Chip tone="negative">위반</Chip> : "없음") : <span className="muted">-</span>}</dd>
              </dl>
            )}
          </div>
        </Section>
      </div>

      <Section title="동승자">
        {(r.companions || []).length === 0 ? <div className="sub">동승자가 없어요.</div> : (
          <div className="row wrap">{r.companions.map((c: any) => (
            <span key={c.id} className="chip chip-info">{c.name}{c.isGuest ? ` · 외부 손님${c.guestOrg ? " " + c.guestOrg : ""}` : c.departmentName ? ` · ${c.departmentName}` : ""}</span>
          ))}</div>
        )}
      </Section>

      <Section title="주유 기록" right={fuelSum > 0 ? <span className="sub">합계 <Num v={fuelSum} unit="원" /></span> : undefined}>
        {(r.fuel || []).length === 0 ? <div className="sub">주유 기록이 없어요.</div> : (
          <div className="table-wrap"><table className="data">
            <thead><tr><th>주유 날짜</th><th>금액</th><th>주유량</th><th>영수증 제출</th></tr></thead>
            <tbody>{r.fuel.map((f: any) => (
              <tr key={f.id}>
                <td>{fmtDate(f.fueledOn)}</td>
                <td><Num v={f.amount} unit="원" /></td>
                <td><Num v={Number(f.liters)} unit="L" /></td>
                <td><div className="row"><Chip tone={f.receiptSubmitted ? "positive" : "gray"}>{f.receiptSubmitted ? "제출" : "미제출"}</Chip>
                  <button className="btn btn-tertiary btn-xs" onClick={() => toggleReceipt(f)}>{f.receiptSubmitted ? "미제출로 바꾸기" : "제출 확인"}</button></div></td>
              </tr>))}</tbody>
          </table></div>
        )}
      </Section>

      <Section title="사고 기록" right={<Link href="/accidents" className="textbtn">사고 기록 화면</Link>}>
        {(r.accidents || []).length === 0 ? <div className="sub">연결된 사고 기록이 없어요.</div> : (
          <div className="stack" style={{ gap: 8 }}>{r.accidents.map((a: any) => (
            <div key={a.id} className="card between"><span>{fmtDate(a.accidentDate)} · {a.description}</span>
              <Chip tone={a.reportSubmitted ? "positive" : "caution"}>{a.reportSubmitted ? "보고서 제출" : "보고서 미제출"}</Chip></div>
          ))}</div>
        )}
      </Section>

      {confirmOpen && <ConfirmReturnModal r={{ ...r, startOdometer: trip?.startOdometer, endOdometer: trip?.endOdometer }} onClose={() => setConfirmOpen(false)} onDone={() => { setConfirmOpen(false); reload(); }} />}
      {cancelOpen && <ConfirmDialog title="대신 취소할까요?" danger confirmLabel="예약 취소" busy={busy} error={actErr} onConfirm={cancel} onClose={() => setCancelOpen(false)}
        message={<>{r.driverName}님의 {fmtRange(r.startAt, r.endAt)} 예약을 취소해요. 취소한 예약은 되살릴 수 없어요.</>} />}
      {odoOpen && trip && <OdoModal current={trip.startOdometer} id={String(id)} onClose={() => setOdoOpen(false)} onDone={() => { setOdoOpen(false); toast("출발 거리를 고쳤어요."); reload(); }} />}
    </>
  );
}

function OdoModal({ current, id, onClose, onDone }: { current: number; id: string; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState(String(current));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setErr(null);
    try { await patch(`/reservations/${id}/start-odometer`, { startOdometer: Number(v) }); onDone(); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  }
  return (
    <Modal title="출발 거리 수정" onClose={onClose}>
      <div className="field"><label htmlFor="odo">출발 주행거리(km)</label>
        <input id="odo" className={"input" + (err ? " error" : "")} inputMode="numeric" value={v} onChange={(e) => setV(e.target.value.replace(/[^0-9]/g, ""))} />
        {err && <span className="field-error">{err}</span>}</div>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-tertiary btn-sm" onClick={onClose}>닫기</button>
        <button className="btn btn-sm" onClick={go} disabled={busy || v === ""}>{busy ? "처리 중" : "고치기"}</button>
      </div>
    </Modal>
  );
}
