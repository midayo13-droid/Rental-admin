"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { get, Page, patch, post } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { fmtDate, fmtShortDate, todayStr } from "@/lib/format";
import { Chip, Col, DataTable, ErrorBox, PageHead, Section, useToast } from "@/components/ui";

type Acc = { id: number; accidentDate: string; description: string; reportSubmitted: boolean; reservationId: number; model: string; plateNo: string; driverName: string; reportOverdue: boolean };
type ResOpt = { id: number; startAt: string; status: string; model: string; plateNo: string; driverName: string };

export default function AccidentsPage() {
  const router = useRouter();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const list = useFetch(() => get<Page<Acc>>("/accidents", { page, size: 20 }), [page]);
  const opts = useFetch(() => get<ResOpt[]>("/accidents/reservations"), []);
  const [form, setForm] = useState({ reservationId: "", accidentDate: todayStr(), description: "", reportSubmitted: false });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.reservationId) { setErr("사고가 난 예약을 골라 주세요."); return; }
    if (!form.description.trim()) { setErr("사고 내용을 적어 주세요."); return; }
    setBusy(true);
    try {
      await post("/accidents", { reservationId: Number(form.reservationId), accidentDate: form.accidentDate, description: form.description.trim(), reportSubmitted: form.reportSubmitted });
      toast("사고 기록을 등록했어요.");
      setForm({ ...form, reservationId: "", description: "", reportSubmitted: false });
      setPage(1); list.reload();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  async function toggle(a: Acc) {
    try { await patch(`/accidents/${a.id}`, { reportSubmitted: !a.reportSubmitted }); list.reload(); }
    catch (e: any) { toast(e.message); }
  }

  const cols: Col<Acc>[] = [
    { key: "d", header: "사고 날짜", render: (a) => fmtDate(a.accidentDate) },
    { key: "v", header: "차량", render: (a) => <>{a.model} <span className="muted">{a.plateNo}</span></> },
    { key: "n", header: "운전자", render: (a) => a.driverName },
    { key: "c", header: "내용", render: (a) => <span style={{ whiteSpace: "normal", display: "inline-block", maxWidth: 360 }}>{a.description}</span> },
    { key: "r", header: "보고서", render: (a) => <div className="row">
      <Chip tone={a.reportSubmitted ? "positive" : "gray"}>{a.reportSubmitted ? "제출" : "미제출"}</Chip>
      {a.reportOverdue && <Chip tone="negative">기한 초과</Chip>}
    </div> },
    { key: "a", header: "", align: "right", render: (a) => <button className="btn btn-tertiary btn-xs" onClick={(e) => { e.stopPropagation(); toggle(a); }}>{a.reportSubmitted ? "미제출로 바꾸기" : "제출 확인"}</button> },
  ];

  return (
    <>
      <PageHead title="사고 기록" desc="사고일 3일이 지나도 보고서를 내지 않으면 기한 초과로 표시돼요." />
      <Section title="사고 기록 등록">
        <form className="card" onSubmit={submit} noValidate>
          <div className="filters" style={{ marginBottom: 8 }}>
            <div className="field" style={{ minWidth: 280 }}><label>예약</label>
              <select className="select" value={form.reservationId} onChange={(e) => setForm({ ...form, reservationId: e.target.value })}>
                <option value="">예약 선택</option>
                {(opts.data ?? []).map((o) => <option key={o.id} value={o.id}>#{o.id} · {o.model} {o.plateNo} · {o.driverName} · {fmtShortDate(o.startAt)}</option>)}
              </select></div>
            <div className="field"><label>사고 날짜</label><input className="input" type="date" max={todayStr()} value={form.accidentDate} onChange={(e) => setForm({ ...form, accidentDate: e.target.value })} /></div>
            <div className="field grow" style={{ minWidth: 240 }}><label>내용</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="어떤 사고였는지 적어 주세요" /></div>
            <label className="row body3" style={{ height: 40 }}><input type="checkbox" checked={form.reportSubmitted} onChange={(e) => setForm({ ...form, reportSubmitted: e.target.checked })} style={{ width: 18, height: 18 }} />보고서 제출함</label>
            <button className="btn btn-sm" type="submit" disabled={busy}>{busy ? "처리 중" : "등록"}</button>
          </div>
          {err && <div className="field-error">{err}</div>}
        </form>
      </Section>
      <Section title="사고 목록">
        <ErrorBox message={list.error} />
        <DataTable cols={cols} rows={list.data?.items ?? []} rowKey={(a) => a.id} total={list.data?.total} page={page} onPage={setPage} loading={list.loading}
          onRow={(a) => router.push(`/reservations/${a.reservationId}`)} empty="사고 기록이 없어요." />
      </Section>
    </>
  );
}
