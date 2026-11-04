"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { get, Page } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { fmtRange } from "@/lib/format";
import { Resv, statusOf, vehicleCell } from "@/components/reservation";
import { Col, DataTable, ErrorBox, PageHead, Spinner, StatusChip } from "@/components/ui";

const STATUSES = ["예약됨", "운행 중", "확인 대기", "반납", "취소"];

function Inner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [f, setF] = useState({ status: sp.get("status") || "", vehicleId: "", from: "", to: "", departmentId: "", q: "" });
  const [applied, setApplied] = useState(f);
  const [page, setPage] = useState(1);
  const vehicles = useFetch(() => get<any[]>("/vehicles"), []);
  const depts = useFetch(() => get<any[]>("/departments"), []);
  const list = useFetch(() => get<Page<Resv>>("/reservations", { ...applied, page, size: 20 }), [applied, page]);

  const set = (k: string, v: string) => setF((o) => ({ ...o, [k]: v }));
  const apply = (next = f) => { setApplied(next); setPage(1); };

  const cols: Col<Resv>[] = [
    { key: "id", header: "번호", render: (r) => <span className="num">{r.id}</span> },
    { key: "v", header: "차량", render: vehicleCell },
    { key: "d", header: "운전자", render: (r) => r.driverName },
    { key: "dep", header: "부서", render: (r) => r.departmentName },
    { key: "t", header: "이용 시간", render: (r) => fmtRange(r.startAt, r.endAt) },
    { key: "dest", header: "목적지", render: (r) => r.destination },
    { key: "s", header: "상태", render: (r) => <StatusChip status={statusOf(r)} /> },
  ];

  return (
    <>
      <PageHead title="예약 관리" />
      <form className="filters" onSubmit={(e) => { e.preventDefault(); apply(); }}>
        <div className="field"><label>상태</label>
          <select className="select" value={f.status} onChange={(e) => { const n = { ...f, status: e.target.value }; setF(n); apply(n); }}>
            <option value="">전체</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select></div>
        <div className="field"><label>차량</label>
          <select className="select" value={f.vehicleId} onChange={(e) => { const n = { ...f, vehicleId: e.target.value }; setF(n); apply(n); }}>
            <option value="">전체</option>{(vehicles.data ?? []).map((v) => <option key={v.id} value={v.id}>{v.model} {v.plateNo}</option>)}
          </select></div>
        <div className="field"><label>부서</label>
          <select className="select" value={f.departmentId} onChange={(e) => { const n = { ...f, departmentId: e.target.value }; setF(n); apply(n); }}>
            <option value="">전체</option>{(depts.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select></div>
        <div className="field"><label>시작일</label><input className="input" type="date" value={f.from} onChange={(e) => set("from", e.target.value)} /></div>
        <div className="field"><label>끝일</label><input className="input" type="date" value={f.to} onChange={(e) => set("to", e.target.value)} /></div>
        <div className="field" style={{ minWidth: 200 }}><label>검색</label><input className="input" placeholder="운전자·목적지" value={f.q} onChange={(e) => set("q", e.target.value)} /></div>
        <button className="btn btn-secondary btn-sm" type="submit">검색</button>
      </form>
      <ErrorBox message={list.error} />
      <DataTable cols={cols} rows={list.data?.items ?? []} rowKey={(r) => r.id} total={list.data?.total} page={page} onPage={setPage}
        loading={list.loading} onRow={(r) => router.push(`/reservations/${r.id}`)} empty="조건에 맞는 예약이 없어요." />
    </>
  );
}

export default function ReservationsPage() {
  return <Suspense fallback={<Spinner />}><Inner /></Suspense>;
}
