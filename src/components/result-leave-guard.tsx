"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { HISTORY_INDEX, registerDocumentPopGuard } from "@/components/document-history-tracker";
import { navigateFromResult, RESULT_NAVIGATION_EVENT } from "@/lib/result-navigation";
import styles from "./result-leave-guard.module.css";

async function readFreeRevisionStatus(documentUuid: string) {
  const response = await fetch(`/api/documents/${documentUuid}/free-revision`, { cache: "no-store" });
  if (!response.ok) throw new Error("FREE_REVISION_STATE_UNAVAILABLE");
  const result = await response.json();
  if (typeof result?.data?.state !== "string" || typeof result.data.can_abandon !== "boolean") {
    throw new Error("FREE_REVISION_STATE_UNAVAILABLE");
  }
  return result.data as { state: string; can_abandon: boolean };
}

export default function ResultLeaveGuard({ documentUuid, busy, unavailable, onUseFreeOptimization, wide }: {
  documentUuid: string; busy: boolean; unavailable: boolean; onUseFreeOptimization: () => void; wide?: "cover-letter" | "recommendation-letter";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const pending = useRef<(() => void) | null>(null);
  const checking = useRef(false);
  const savingRef = useRef(false);
  const bypass = useRef(false);
  const latest = useRef({ busy, unavailable, onUseFreeOptimization });
  latest.current = { busy, unavailable, onUseFreeOptimization };
  const eligible = useRef(false);
  useEffect(() => {
    bypass.current = false;
    pending.current = null;
    setOpen(false);
  }, [documentUuid]);
  useEffect(() => {
    let active = true;
    eligible.current = false;
    if (!busy && !unavailable) {
      readFreeRevisionStatus(documentUuid)
        .then((data) => { if (active) eligible.current = data.can_abandon; })
        .catch(() => {});
    }
    return () => { active = false; };
  }, [documentUuid, busy, unavailable]);

  useEffect(() => {
    let active = true;
    let restoring = false;
    let afterRestore: (() => void) | null = null;
    let index = window.history.state?.[HISTORY_INDEX];
    const documentUrl = new URL(window.location.href);
    const hashChanged = () => { index = window.history.state?.[HISTORY_INDEX]; };
    const requestLeave = async (proceed: () => void) => {
      if (checking.current || pending.current) return;
      if (latest.current.busy || latest.current.unavailable || bypass.current) { proceed(); return; }
      checking.current = true;
      try {
        const data = await readFreeRevisionStatus(documentUuid);
        if (!active) return;
        if (latest.current.busy) return;
        if (latest.current.unavailable) { proceed(); return; }
        eligible.current = data.can_abandon;
        if (data.can_abandon) { pending.current = proceed; setOpen(true); }
        else { proceed(); }
      } catch {
        if (active) toast.error("无法确认文书保存及免费优化状态，请稍后重试。");
      } finally { checking.current = false; }
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && !["_self", "_top", "_parent"].includes(anchor.target.toLowerCase()))) return;
      const url = new URL(anchor.href, window.location.href);
      if (!["http:", "https:"].includes(url.protocol)) return;
      const internal = url.origin === window.location.origin;
      if (internal && url.pathname === location.pathname && url.search === location.search) return;
      event.preventDefault(); event.stopImmediatePropagation();
      void requestLeave(() => internal ? router.push(url.pathname + url.search + url.hash) : window.location.assign(url.href));
    };
    const custom = (event: Event) => {
      event.preventDefault();
      void requestLeave((event as CustomEvent).detail.proceed);
    };
    const pop = (event: PopStateEvent) => {
      if (restoring) { restoring = false; event.stopImmediatePropagation(); afterRestore?.(); afterRestore = null; return; }
      if (bypass.current || latest.current.busy || latest.current.unavailable) return;
      const target = event.state?.[HISTORY_INDEX];
      if (location.pathname === documentUrl.pathname && location.search === documentUrl.search) {
        if (typeof target === "number") index = target;
        return;
      }
      // Unindexed/cross-document history uses browser behavior. Never invent entries.
      if (typeof index !== "number" || typeof target !== "number" || target === index) return;
      const delta = target - index;
      event.stopImmediatePropagation();
      restoring = true;
      afterRestore = () => {
        void requestLeave(() => { bypass.current = true; window.history.go(delta); });
      };
      window.history.go(-delta);
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!bypass.current && eligible.current && !latest.current.unavailable) { event.preventDefault(); event.returnValue = ""; }
      // Native browser prompt only; never persist abandonment here.
    };
    document.addEventListener("click", click, true);
    window.addEventListener(RESULT_NAVIGATION_EVENT, custom);
    const unregisterPop = registerDocumentPopGuard(pop);
    window.addEventListener("hashchange", hashChanged);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      active = false;
      document.removeEventListener("click", click, true);
      window.removeEventListener(RESULT_NAVIGATION_EVENT, custom);
      unregisterPop();
      window.removeEventListener("hashchange", hashChanged);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [documentUuid, router]);

  const close = () => { if (!savingRef.current) { pending.current = null; setOpen(false); } };
  const abandon = async () => {
    if (savingRef.current || !pending.current) return;
    savingRef.current = true;
    setSaving(true);
    const proceed = () => {
      const destination = pending.current;
      pending.current = null;
      eligible.current = false;
      bypass.current = true;
      setOpen(false);
      destination?.();
    };
    try {
      const response = await fetch(`/api/documents/${documentUuid}/free-revision`, { method: "POST" });
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (result?.data?.state !== "abandoned") throw new Error();
      proceed();
    } catch {
      // A lost response can follow a committed abandonment. Reconcile before navigating.
      try {
        const data = await readFreeRevisionStatus(documentUuid);
        eligible.current = data.can_abandon;
        if (data.state === "abandoned" || data.state === "used") { proceed(); return; }
        if (!data.can_abandon) {
          pending.current = null;
          setOpen(false);
        }
      } catch { /* Unknown outcome stays on this page for a later status check. */ }
      toast.error("未能确认放弃状态，请留在本页重试。");
    }
    finally { savingRef.current = false; setSaving(false); }
  };
  return <>
    <div className={`${styles.returnContainer}${wide ? ` ${styles.returnWide}` : ""}${wide === "recommendation-letter" ? ` ${styles.returnRecommendation}` : ""}`}>
      <Button variant="ghost" className={styles.returnButton} onClick={() => navigateFromResult("/creation-center", () => router.push("/creation-center"))}><ChevronLeft aria-hidden="true" />返回创作中心</Button>
    </div>
    <Dialog open={open} onOpenChange={(value) => { if (!value) close(); }}>
      <DialogContent className={styles.dialog} overlayClassName={styles.overlay}>
        <DialogHeader className={styles.heading}>
          <span className={styles.documentIcon} aria-hidden="true"><FileText /></span>
          <DialogTitle>确定要离开当前文书吗？</DialogTitle>
        </DialogHeader>
        <DialogDescription asChild><div className={styles.description}>
          <p>您还有一次免费全文优化机会，建议先使用。</p>
          <p className={styles.warning}><strong>确认离开后，本篇未使用的免费优化机会将失效，<span className={styles.noWrap}>无法再次使用。</span></strong></p>
          <p>已保存的文书仍可在「我的文档」中查看和下载。</p>
        </div></DialogDescription>
        <div className={styles.actions}>
          <Button className={styles.primary} disabled={saving} onClick={() => { close(); latest.current.onUseFreeOptimization(); }}>使用免费优化</Button>
          <Button className={styles.secondary} variant="outline" disabled={saving} onClick={abandon}>{saving ? "正在保存…" : "我已了解，直接离开"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
