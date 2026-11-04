"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { get, Page, post } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { fmtDate, fmtRange } from "@/lib/format";
import { Chip, Col, ConfirmDialog, DataTable, ErrorBox, Num, PageHead, Section, Spinner, StatusChip, useToast } from "@/components/ui";

type Emp = { id: number; employeeNo: string; name: string; departmentId: number; departmentName: string; licenseStatus: string; licenseExpiry: string | null; hasAccount: boolean; role?: string | null };
type Pending = { id: number; employeeNo: string; name: string; departmentName: string; licenseExpiry: string };
type Expiring = { expiring: { id: number; name: string; departmentName: string; licenseExpiry: string; daysLeft: number }[];
  expiredReservations: { id: number; startAt: string; endAt: string; status: string; model: string; plateNo: string; driverName: string; licenseExpiry: string }[] };

const TABS = [{ k: "all", l: "직원 명부" }, { k: "pending", l: "면허 승인 대기" }, { k: "expiring", l: "면허 만료 30일 이내" }];

function Inner() {
  const sp = useSearchParams();
  const initial = sp.get("tab");
  const [tab, setTab] = useState(TABS.some((t) => t.k === initial) ? (initial as string) : "all");
  return (
    <>
      <PageHead title="임직원·면허" />
      <div className="tabs">
        {TABS.map((t) => <button key={t.k} className={"pick" + (tab === t.k ? " on" : "")} onClick={() => setTab(t.k)}>{t.l}</button>)}
      </div>
      {tab === "all" && <AllTab />}
      {tab === "pending" && <PendingTab />}
      {tab === "expiring" && <ExpiringTab />}
    </>
  );
}
export default function EmployeesPage() { return <Suspense fallback={<Spinner />}><Inner /></Suspense>; }

function AllTab() {
  const [q, setQ] = useState("");
  const [dep, setDep] = useState("");
  const [applied, setApplied] = useState({ q: "", departmentId: "" });
  const [page, setPage] = useState(1);
  const depts = useFetch(() => get<any[]>("/departments"), []);
  const list = useFetch(() => get<Page<Emp>>("/employees", { ...applied, page, size: 20 }), [applied, page]);
  const cols: Col<Emp>[] = [
    { key: "no", header: "사번", render: (e) => e.employeeNo },
    { key: "n", header: "이름", render: (e) => <b style={{ color: "var(--text-strong)" }}>{e.name}</b> },
    { key: "d", header: "부서", render: (e) => e.departmentName },
    { key: "a", header: "가입 여부", render: (e) => e.hasAccount ? <Chip tone="info">가입{e.role ? ` · ${e.role}` : ""}</Chip> : <Chip tone="gray">미가입</Chip> },
    { key: "l", header: "면허 상태", render: (e) => <StatusChip status={e.licenseStatus} kind="lic" /> },
    { key: "x", header: "면허 만료일", render: (e) => fmtDate(e.licenseExpiry) },
  ];
  return (
    <>
      <form className="filters" onSubmit={(e) => { e.preventDefault(); setApplied({ q, departmentId: dep }); setPage(1); }}>
        <div className="field"><label>부서</label>
          <select className="select" value={dep} onChange={(e) => { setDep(e.target.value); setApplied({ q, departmentId: e.target.value }); setPage(1); }}>
            <option value="">전체</option>{(depts.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select></div>
        <div className="field" style={{ minWidth: 220 }}><label>검색</label><input className="input" placeholder="이름·사번" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <button className="btn btn-secondary btn-sm" type="submit">검색</button>
      </form>
      <ErrorBox message={list.error} />
      <DataTable cols={cols} rows={list.data?.items ?? []} rowKey={(e) => e.id} total={list.data?.total} page={page} onPage={setPage} loading={list.loading} empty="조건에 맞는 직원이 없어요." />
    </>
  );
}

function PendingTab() {
  const toast = useToast();
  const list = useFetch(() => get<Pending[]>("/employees/license-pending"), []);
  const [target, setTarget] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  async function approve() {
    if (!target) return;
    setBusy(true); setErr(null);
    try { await post(`/employees/${target.id}/license/approve`); toast(`${target.name}님의 면허를 승인했어요.`); setTarget(null); list.reload(); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  }
  const all = list.data ?? [];
  const cols: Col<Pending>[] = [
    { key: "no", header: "사번", render: (e) => e.employeeNo },
    { key: "n", header: "이름", render: (e) => <b style={{ color: "var(--text-strong)" }}>{e.name}</b> },
    { key: "d", header: "부서", render: (e) => e.departmentName },
    { key: "x", header: "면허 만료일", render: (e) => fmtDate(e.licenseExpiry) },
    { key: "a", header: "", align: "right", render: (e) => <button className="btn btn-xs" onClick={() => { setErr(null); setTarget(e); }}>승인</button> },
  ];
  return (
    <>
      <ErrorBox message={list.error} />
      <DataTable cols={cols} rows={all.slice((page - 1) * 20, page * 20)} total={all.length} page={page} onPage={setPage} rowKey={(e) => e.id} loading={list.loading} empty="승인을 기다리는 면허가 없어요." />
      {target && <ConfirmDialog title="면허를 승인할까요?" confirmLabel="승인" busy={busy} error={err} onConfirm={approve} onClose={() => setTarget(null)}
        message={<>{target.name}({target.departmentName})님의 면허 만료일 {fmtDate(target.licenseExpiry)}을 승인해요.</>} />}
    </>
  );
}

function ExpiringTab() {
  const router = useRouter();
  const list = useFetch(() => get<Expiring>("/employees/license-expiring"), []);
  const [p1, setP1] = useState(1);
  const [p2, setP2] = useState(1);
  const ex = list.data?.expiring ?? [];
  const rs = list.data?.expiredReservations ?? [];
  const c1: Col<Expiring["expiring"][number]>[] = [
    { key: "n", header: "이름", render: (e) => <b style={{ color: "var(--text-strong)" }}>{e.name}</b> },
    { key: "d", header: "부서", render: (e) => e.departmentName },
    { key: "x", header: "면허 만료일", render: (e) => fmtDate(e.licenseExpiry) },
    { key: "l", header: "남은 일수", render: (e) => <><Num v={e.daysLeft} unit="일" />{e.daysLeft <= 7 && <> <Chip tone="caution">곧 만료</Chip></>}</> },
  ];
  const c2: Col<Expiring["expiredReservations"][number]>[] = [
    { key: "id", header: "예약", render: (r) => `#${r.id}` },
    { key: "v", header: "차량", render: (r) => <>{r.model} <span className="muted">{r.plateNo}</span></> },
    { key: "d", header: "운전자", render: (r) => r.driverName },
    { key: "t", header: "이용 시간", render: (r) => fmtRange(r.startAt, r.endAt) },
    { key: "x", header: "면허 만료일", render: (r) => <b style={{ color: "var(--red-600)" }}>{fmtDate(r.licenseExpiry)}</b> },
    { key: "s", header: "상태", render: (r) => <StatusChip status={r.status} /> },
  ];
  return (
    <>
      <ErrorBox message={list.error} />
      <Section title="면허 만료 30일 이내 직원">
        <DataTable cols={c1} rows={ex.slice((p1 - 1) * 20, p1 * 20)} total={ex.length} page={p1} onPage={setP1} rowKey={(e) => e.id} loading={list.loading} empty="곧 만료되는 면허가 없어요." />
      </Section>
      <Section title="예약 후 면허가 만료되는 예약">
        <DataTable cols={c2} rows={rs.slice((p2 - 1) * 20, p2 * 20)} total={rs.length} page={p2} onPage={setP2} rowKey={(r) => r.id} loading={list.loading}
          onRow={(r) => router.push(`/reservations/${r.id}`)} empty="해당하는 예약이 없어요." />
      </Section>
    </>
  );
}
