"use client";
import { ReactNode, useState } from "react";
import { get } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { monthLabel, monthStr, shiftMonth } from "@/lib/format";
import { Col, DataTable, ErrorBox, MonthNav, Num, PageHead, Section } from "@/components/ui";

type V = { vehicleId: number; model: string; plateNo: string; tripCount: number; distanceKm: number; fuelAmount: number; fuelLiters: number; costPerKm: number | null };
type D = { departmentId: number; departmentName: string; useCount: number; distanceKm: number };

function Bars({ title, rows, unit }: { title: string; unit: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="card white" style={{ marginBottom: 12 }}>
      <h3 style={{ marginBottom: 6 }}>{title}</h3>
      {rows.map((r) => (
        <div className="bar-row" key={r.label}>
          <span>{r.label}</span>
          <div className="bar-track" role="img" aria-label={`${r.label} ${r.value.toLocaleString("ko-KR")}${unit}`}><div className="bar-fill" style={{ width: `${(r.value / max) * 100}%` }} /></div>
          <span style={{ textAlign: "right" }}><Num v={r.value} unit={unit} /></span>
        </div>
      ))}
    </div>
  );
}

export default function StatsPage() {
  const [month, setMonth] = useState(monthStr());
  const veh = useFetch(() => get<{ month: string; items: V[] }>("/stats/vehicles-monthly", { month }), [month]);
  const dep = useFetch(() => get<{ month: string; items: D[] }>("/stats/departments-monthly", { month }), [month]);
  const vi = veh.data?.items ?? [];
  const di = dep.data?.items ?? [];

  const vCols: Col<V>[] = [
    { key: "v", header: "차량", render: (v) => <>{v.model} <span className="muted">{v.plateNo}</span></> },
    { key: "t", header: "운행 횟수", render: (v) => <Num v={v.tripCount} unit="회" /> },
    { key: "k", header: "운행 거리", render: (v) => <Num v={v.distanceKm} unit="km" /> },
    { key: "f", header: "주유비", render: (v) => <Num v={v.fuelAmount} unit="원" /> },
    { key: "c", header: "1km당 주유비", render: (v) => v.costPerKm == null || v.distanceKm === 0 ? <span className="muted">-</span> : <Num v={Math.round(v.costPerKm).toLocaleString("ko-KR")} unit="원" /> },
  ];
  const dCols: Col<D>[] = [
    { key: "d", header: "부서", render: (d) => d.departmentName },
    { key: "u", header: "이용 횟수", render: (d) => <Num v={d.useCount} unit="회" /> },
    { key: "k", header: "운행 거리", render: (d) => <Num v={d.distanceKm} unit="km" /> },
  ];
  const note: ReactNode = <span className="sub">운행 거리·횟수는 반납 확인이 끝난 예약만, 주유비는 주유한 날짜 기준이에요.</span>;

  return (
    <>
      <PageHead title="차량·부서 통계" desc={note} right={<MonthNav label={monthLabel(month)} onPrev={() => setMonth(shiftMonth(month, -1))} onNext={() => setMonth(shiftMonth(month, 1))} />} />
      <Section title="차량별">
        <ErrorBox message={veh.error} />
        <DataTable cols={vCols} rows={vi} rowKey={(v) => v.vehicleId} loading={veh.loading} hideTotal />
        {!veh.loading && vi.length > 0 && (
          <div className="cols2" style={{ marginTop: 14 }}>
            <Bars title="운행 거리" unit="km" rows={vi.map((v) => ({ label: `${v.model} ${v.plateNo}`, value: v.distanceKm }))} />
            <Bars title="주유비" unit="원" rows={vi.map((v) => ({ label: `${v.model} ${v.plateNo}`, value: v.fuelAmount }))} />
          </div>
        )}
      </Section>
      <Section title="부서별">
        <ErrorBox message={dep.error} />
        <DataTable cols={dCols} rows={di} rowKey={(d) => d.departmentId} loading={dep.loading} hideTotal />
        {!dep.loading && di.length > 0 && (
          <div className="cols2" style={{ marginTop: 14 }}>
            <Bars title="이용 횟수" unit="회" rows={di.map((d) => ({ label: d.departmentName, value: d.useCount }))} />
            <Bars title="운행 거리" unit="km" rows={di.map((d) => ({ label: d.departmentName, value: d.distanceKm }))} />
          </div>
        )}
      </Section>
    </>
  );
}
