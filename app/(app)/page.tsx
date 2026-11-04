"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { get, Page } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { ConfirmReturnModal, confirmWaitCols, overdueCols, Resv } from "@/components/reservation";
import { DataTable, ErrorBox, PageHead, Section } from "@/components/ui";

type Home = { confirmWaiting: number; overdue: number; licensePending: number; licenseExpiring: number; claimsPending: number; accidentsOverdue: number };

async function loadWaiting(page: number): Promise<Page<Resv>> {
  const p = await get<Page<Resv>>("/reservations", { status: "확인 대기", page, size: 20 });
  // 목록에는 도착 입력 시각·주유비가 없어서 상세에서 채워요.
  const items = await Promise.all(p.items.map(async (r) => {
    try {
      const d = await get<any>(`/reservations/${r.id}`);
      return { ...r, returnEnteredAt: d.trip?.returnEnteredAt ?? null, fuelTotal: (d.fuel || []).reduce((s: number, f: any) => s + (f.amount || 0), 0) } as Resv;
    } catch { return r; }
  }));
  return { ...p, items };
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [wpage, setWpage] = useState(1);
  const [target, setTarget] = useState<Resv | null>(null);
  const stats = useFetch(() => get<Home>("/stats/home"), []);
  const overdue = useFetch(() => get<Resv[]>("/reservations/overdue"), []);
  const waiting = useFetch(() => loadWaiting(wpage), [wpage]);

  const s = stats.data;
  const cards = [
    { t: "반납 확인 대기", v: s?.confirmWaiting, u: "건", href: "/#waiting", tone: "caution" },
    { t: "미반납", v: s?.overdue, u: "건", href: "/overdue", tone: "negative" },
    { t: "면허 승인 대기", v: s?.licensePending, u: "명", href: "/employees?tab=pending", tone: "" },
    { t: "면허 만료 30일 이내", v: s?.licenseExpiring, u: "명", href: "/employees?tab=expiring", tone: "" },
    { t: "개인 차량 정산 승인 대기", v: s?.claimsPending, u: "건", href: "/claims?status=신청됨", tone: "" },
    { t: "사고 보고서 기한 초과", v: s?.accidentsOverdue, u: "건", href: "/accidents", tone: "" },
  ];

  function reload() { stats.reload(); overdue.reload(); waiting.reload(); }

  return (
    <>
      <PageHead title="오늘 할 일" desc={user ? `${user.name} · ${user.role}` : undefined} />
      <ErrorBox message={stats.error} />
      <div className="grid-cards">
        {cards.map((c) => (
          <button key={c.t} className={"todo " + c.tone} onClick={() => (c.href === "/#waiting" ? document.getElementById("waiting")?.scrollIntoView({ behavior: "smooth" }) : router.push(c.href))}>
            <div className="t">{c.t}</div>
            <div className="v">{c.v === undefined ? "-" : c.v.toLocaleString("ko-KR")}<small>{c.u}</small></div>
          </button>
        ))}
      </div>

      <Section title="미반납" right={<Link href="/overdue" className="textbtn">전체 보기</Link>}>
        <ErrorBox message={overdue.error} />
        <DataTable cols={overdueCols()} rows={overdue.data ?? []} rowKey={(r) => r.id} loading={overdue.loading} onRow={(r) => router.push(`/reservations/${r.id}`)} empty="미반납 차량이 없어요." />
      </Section>

      <div id="waiting" />
      <Section title="반납 확인 대기" right={<Link href="/reservations?status=확인 대기" className="textbtn">전체 보기</Link>}>
        <ErrorBox message={waiting.error} />
        <DataTable cols={confirmWaitCols((r) => setTarget(r))} rows={waiting.data?.items ?? []} rowKey={(r) => r.id} total={waiting.data?.total} page={wpage} onPage={setWpage}
          loading={waiting.loading} onRow={(r) => router.push(`/reservations/${r.id}`)} empty="확인을 기다리는 반납이 없어요." />
      </Section>

      {target && <ConfirmReturnModal r={target} onClose={() => setTarget(null)} onDone={() => { setTarget(null); reload(); }} />}
    </>
  );
}
