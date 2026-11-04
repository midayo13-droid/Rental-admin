"use client";
import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Icon, Spinner } from "./ui";

type Item = { href: string; label: string; icon: string; adminOnly?: boolean };
const GROUPS: { title?: string; items: Item[] }[] = [
  { items: [
    { href: "/", label: "홈", icon: "home" },
    { href: "/reservations", label: "예약 관리", icon: "list" },
    { href: "/overdue", label: "미반납", icon: "alert" },
    { href: "/availability", label: "예약 현황표", icon: "grid" },
  ] },
  { title: "차량·직원", items: [
    { href: "/vehicles", label: "차량·점검", icon: "car" },
    { href: "/employees", label: "임직원·면허", icon: "users" },
    { href: "/accidents", label: "사고 기록", icon: "shield" },
  ] },
  { title: "정산·통계", items: [
    { href: "/claims", label: "개인 차량 정산", icon: "won" },
    { href: "/stats", label: "차량·부서 통계", icon: "chart" },
  ] },
  { title: "관리자 전용", items: [
    { href: "/accounts", label: "계정 관리", icon: "key", adminOnly: true },
    { href: "/demo", label: "가상 데이터", icon: "refresh", adminOnly: true },
  ] },
];

export default function Shell({ children }: { children: ReactNode }) {
  const { user, ready, logout, isAdmin } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (user.mustChangePassword) router.replace("/change-password");
  }, [ready, user, router]);

  if (!ready || !user || user.mustChangePassword) return <div style={{ padding: 60 }}><Spinner label="불러오는 중" /></div>;

  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

  return (
    <div className="admin">
      <aside className="sidebar">
        <div className="brand"><b>누리상사</b><span>어드민</span></div>
        {GROUPS.map((g, gi) => {
          const items = g.items.filter((i) => !i.adminOnly || isAdmin);
          if (items.length === 0) return null;
          return (
            <div key={gi} style={{ display: "contents" }}>
              {g.title && <div className="nav-group">{g.title}</div>}
              {items.map((i) => (
                <Link key={i.href} href={i.href} className={"nav-item" + (active(i.href) ? " on" : "")} aria-current={active(i.href) ? "page" : undefined}>
                  <Icon name={i.icon} />{i.label}
                </Link>
              ))}
            </div>
          );
        })}
        <div className="side-foot">
          <div className="who"><b>{user.name}</b>{user.role}</div>
          <button className="btn btn-tertiary btn-sm" onClick={logout} style={{ width: "100%" }}>로그아웃</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
