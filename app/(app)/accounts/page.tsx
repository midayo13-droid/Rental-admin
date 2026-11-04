"use client";
import { useState } from "react";
import { get, patch, post } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { Chip, Col, ConfirmDialog, DataTable, ErrorBox, Modal, PageHead, Spinner, StatusChip, useToast } from "@/components/ui";

type Acc = { id: number; email: string; role: string; status: string; mustChangePassword: boolean; createdAt: string; employeeId: number; employeeNo: string; name: string; departmentName: string };
type Cand = { id: number; employeeNo: string; name: string };

function TempBox({ title, name, pw, onClose }: { title: string; name: string; pw: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(pw); setCopied(true); } catch { setCopied(false); }
  }
  return (
    <Modal title={title} onClose={onClose}>
      <div className="body3">{name}님의 임시 비밀번호예요. <b>이 창을 닫으면 다시 볼 수 없으니</b> 지금 전달해 주세요. 처음 로그인할 때 비밀번호를 바꾸게 돼요.</div>
      <div className="mono-box" data-testid="temp-password">{pw}</div>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-secondary btn-sm" onClick={copy}>{copied ? "복사했어요" : "복사"}</button>
        <button className="btn btn-sm" onClick={onClose}>확인했어요</button>
      </div>
    </Modal>
  );
}

export default function AccountsPage() {
  const { user, isAdmin, ready } = useAuth();
  const toast = useToast();
  const list = useFetch(() => (isAdmin ? get<Acc[]>("/accounts") : Promise.resolve([] as Acc[])), [isAdmin]);
  const [page, setPage] = useState(1);
  const [create, setCreate] = useState(false);
  const [role, setRole] = useState<Acc | null>(null);
  const [toggle, setToggle] = useState<Acc | null>(null);
  const [reset, setReset] = useState<Acc | null>(null);
  const [temp, setTemp] = useState<{ title: string; name: string; pw: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!ready) return <Spinner />;
  if (!isAdmin) return <><PageHead title="계정 관리" /><div className="alert alert-caution"><b>이 일은 총무팀 관리자만 할 수 있어요.</b></div></>;

  const all = list.data ?? [];
  async function doToggle() {
    if (!toggle) return;
    setBusy(true); setErr(null);
    try { await patch(`/accounts/${toggle.id}`, { status: toggle.status === "사용" ? "정지" : "사용" }); toast(toggle.status === "사용" ? "사용을 정지했어요." : "정지를 풀었어요."); setToggle(null); list.reload(); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  }
  async function doReset() {
    if (!reset) return;
    setBusy(true); setErr(null);
    try { const r = await post<{ tempPassword: string }>(`/accounts/${reset.id}/reset-password`); setTemp({ title: "임시 비밀번호", name: reset.name, pw: r.tempPassword }); setReset(null); list.reload(); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  const cols: Col<Acc>[] = [
    { key: "n", header: "이름", render: (a) => <><b style={{ color: "var(--text-strong)" }}>{a.name}</b> <span className="muted">{a.employeeNo}</span></> },
    { key: "e", header: "이메일", render: (a) => a.email },
    { key: "r", header: "역할", render: (a) => a.role },
    { key: "s", header: "상태", render: (a) => <StatusChip status={a.status} kind="acc" /> },
    { key: "m", header: "비밀번호 변경 필요", render: (a) => a.mustChangePassword ? <Chip tone="caution">변경 필요</Chip> : <span className="muted">-</span> },
    { key: "c", header: "만든 날", render: (a) => fmtDate(a.createdAt) },
    { key: "a", header: "", align: "right", render: (a) => (
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-tertiary btn-xs" onClick={() => { setErr(null); setRole(a); }}>역할 변경</button>
        <button className="btn btn-tertiary btn-xs" onClick={() => { setErr(null); setReset(a); }}>비밀번호 리셋</button>
        {a.id !== user?.id && (a.status === "사용"
          ? <button className="btn btn-danger btn-xs" onClick={() => { setErr(null); setToggle(a); }}>사용 정지</button>
          : <button className="btn btn-secondary btn-xs" onClick={() => { setErr(null); setToggle(a); }}>정지 해제</button>)}
      </div>) },
  ];

  return (
    <>
      <PageHead title="계정 관리" desc="총무팀 직원 계정을 만들고 관리해요." right={<button className="btn btn-sm" onClick={() => setCreate(true)}>계정 만들기</button>} />
      <ErrorBox message={list.error} />
      <DataTable cols={cols} rows={all.slice((page - 1) * 20, page * 20)} total={all.length} page={page} onPage={setPage} rowKey={(a) => a.id} loading={list.loading} empty="계정이 없어요." />

      {create && <CreateModal onClose={() => setCreate(false)} onDone={(name, pw) => { setCreate(false); setTemp({ title: "계정을 만들었어요", name, pw }); list.reload(); }} />}
      {role && <RoleModal a={role} onClose={() => setRole(null)} onDone={() => { setRole(null); toast("역할을 바꿨어요."); list.reload(); }} />}
      {toggle && <ConfirmDialog title={toggle.status === "사용" ? "사용을 정지할까요?" : "정지를 풀까요?"} danger={toggle.status === "사용"} confirmLabel={toggle.status === "사용" ? "사용 정지" : "정지 해제"} busy={busy} error={err} onConfirm={doToggle} onClose={() => setToggle(null)}
        message={toggle.status === "사용" ? <>{toggle.name}님은 더 이상 로그인할 수 없어요. 이미 로그인해 둔 화면도 막혀요.</> : <>{toggle.name}님이 다시 로그인할 수 있어요.</>} />}
      {reset && <ConfirmDialog title="비밀번호를 리셋할까요?" confirmLabel="리셋" busy={busy} error={err} onConfirm={doReset} onClose={() => setReset(null)}
        message={<>{reset.name}님에게 임시 비밀번호를 새로 만들어요. 지금 비밀번호는 쓸 수 없게 돼요.</>} />}
      {temp && <TempBox title={temp.title} name={temp.name} pw={temp.pw} onClose={() => setTemp(null)} />}
    </>
  );
}

function CreateModal({ onClose, onDone }: { onClose: () => void; onDone: (name: string, pw: string) => void }) {
  const cands = useFetch(() => get<Cand[]>("/accounts/candidates"), []);
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("일반 직원");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!employeeId) { setErr("직원을 골라 주세요."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErr("이메일을 올바르게 적어 주세요."); return; }
    setBusy(true); setErr(null);
    try {
      const r = await post<{ tempPassword: string }>("/accounts", { employeeId: Number(employeeId), email: email.trim(), role });
      onDone((cands.data ?? []).find((c) => String(c.id) === employeeId)?.name ?? "", r.tempPassword);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }
  return (
    <Modal title="계정 만들기" onClose={onClose}>
      {cands.error && <ErrorBox message={cands.error} />}
      <div className="field"><label htmlFor="ce">직원</label>
        <select id="ce" className="select" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">{cands.loading ? "불러오는 중" : (cands.data ?? []).length === 0 ? "계정을 만들 수 있는 직원이 없어요" : "직원 선택"}</option>
          {(cands.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.employeeNo})</option>)}
        </select></div>
      <div className="field"><label htmlFor="cm">이메일</label><input id="cm" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="field"><label htmlFor="cr">역할</label>
        <select id="cr" className="select" value={role} onChange={(e) => setRole(e.target.value)}><option>일반 직원</option><option>관리자</option></select></div>
      {err && <div className="field-error">{err}</div>}
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-tertiary btn-sm" onClick={onClose}>닫기</button>
        <button className="btn btn-sm" onClick={go} disabled={busy}>{busy ? "처리 중" : "만들기"}</button>
      </div>
    </Modal>
  );
}

function RoleModal({ a, onClose, onDone }: { a: Acc; onClose: () => void; onDone: () => void }) {
  const [role, setRole] = useState(a.role);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setErr(null);
    try { await patch(`/accounts/${a.id}`, { role }); onDone(); } catch (e: any) { setErr(e.message); setBusy(false); }
  }
  return (
    <Modal title="역할 변경" onClose={onClose}>
      <div className="body3">{a.name}님의 역할을 바꿔요.</div>
      <div className="field"><label htmlFor="rl">역할</label>
        <select id="rl" className="select" value={role} onChange={(e) => setRole(e.target.value)}><option>일반 직원</option><option>관리자</option></select></div>
      {err && <div className="field-error">{err}</div>}
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-tertiary btn-sm" onClick={onClose}>닫기</button>
        <button className="btn btn-sm" onClick={go} disabled={busy || role === a.role}>{busy ? "처리 중" : "바꾸기"}</button>
      </div>
    </Modal>
  );
}
