"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { get } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { Col, DataTable, ErrorBox, PageHead } from "@/components/ui";
import { overdueCols, Resv } from "@/components/reservation";

export default function OverduePage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const list = useFetch(() => get<Resv[]>("/reservations/overdue"), []);
  const all = list.data ?? [];
  const rows = all.slice((page - 1) * 20, page * 20);
  const cols: Col<Resv>[] = [
    ...overdueCols().slice(0, 4),
    { key: "dest", header: "목적지", render: (r) => r.destination },
    ...overdueCols().slice(4),
  ];
  return (
    <>
      <PageHead title="미반납" desc="반납 예정 시각 30분이 지났는데 도착 입력이 없는 예약이에요." />
      <ErrorBox message={list.error} />
      <DataTable cols={cols} rows={rows} rowKey={(r) => r.id} total={all.length} page={page} onPage={setPage} loading={list.loading}
        onRow={(r) => router.push(`/reservations/${r.id}`)} empty="미반납 차량이 없어요." />
    </>
  );
}
