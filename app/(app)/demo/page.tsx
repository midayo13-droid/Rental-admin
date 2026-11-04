"use client";
import { useState } from "react";
import { post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ConfirmDialog, PageHead, Section, useToast } from "@/components/ui";

/** 관리자 전용: 테스트하다 어지러워진 활동 데이터를 처음 가상 데이터로 되돌려요. */
export default function DemoPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ reservations: number; claims: number } | null>(null);

  if (!isAdmin) {
    return <><PageHead title="가상 데이터" /><div className="alert alert-caution"><b>이 일은 총무팀 관리자만 할 수 있어요.</b></div></>;
  }

  async function reset() {
    setBusy(true); setErr(null);
    try {
      const r = await post<{ reservations: number; claims: number }>("/admin/reset-demo", {});
      setDone(r);
      setOpen(false);
      toast("가상 데이터를 다시 채웠어요.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "다시 채우지 못했어요.");
    }
    setBusy(false);
  }

  return (
    <>
      <PageHead title="가상 데이터" desc="시연·연습용 가상 데이터를 처음 상태로 되돌려요." />
      <Section title="다시 채우기">
        <div className="stack">
          <div className="grid2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            <div className="card">
              <h3>지우고 다시 채우는 것</h3>
              <ul className="body3" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                <li>예약, 운행 기록, 동승자</li>
                <li>주유 기록, 사고 기록</li>
                <li>점검 일정</li>
                <li>개인 차량 정산</li>
              </ul>
            </div>
            <div className="card">
              <h3>그대로 두는 것</h3>
              <ul className="body3" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                <li>로그인 계정(가입한 계정 포함)</li>
                <li>직원 명부와 면허 상태</li>
                <li>차량 정보, 부서</li>
              </ul>
            </div>
          </div>
          <div className="alert alert-caution">
            <span><b>되돌릴 수 없어요.</b> 지금까지 테스트로 만든 예약·정산·점검·사고 기록이 모두 사라지고, 처음 가상 데이터로 다시 채워져요. 로그인은 그대로 유지돼요.</span>
          </div>
          {done && (
            <div className="alert alert-positive">
              <span>다시 채웠어요. 예약 <b>{done.reservations}</b>건, 개인 차량 정산 <b>{done.claims}</b>건이 들어 있어요.</span>
            </div>
          )}
          <div><button className="btn btn-danger" onClick={() => { setErr(null); setOpen(true); }}>가상 데이터 다시 채우기</button></div>
        </div>
      </Section>

      {open && (
        <ConfirmDialog
          title="가상 데이터를 다시 채울까요?" danger confirmLabel="다시 채우기" busy={busy} error={err}
          message="예약·운행·주유·사고·점검·정산 기록이 모두 지워지고 처음 가상 데이터로 다시 채워져요. 계정과 직원 명부는 그대로예요."
          onConfirm={reset} onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
