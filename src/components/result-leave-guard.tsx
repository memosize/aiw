"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { HISTORY_INDEX, registerDocumentPopGuard } from "@/components/document-history-tracker";
import { navigateFromResult, RESULT_NAVIGATION_EVENT } from "@/lib/result-navigation";

export default function ResultLeaveGuard({ documentUuid, busy, unavailable, onUseFreeOptimization }: {
  documentUuid: string; busy: boolean; unavailable: boolean; onUseFreeOptimization: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const pending = useRef<(() => void) | null>(null);
  const checking = useRef(false);
  const bypass = useRef(false);
  const latest = useRef({ busy, unavailable, onUseFreeOptimization });
  latest.current = { busy, unavailable, onUseFreeOptimization };
  const eligible = useRef(false);
  useEffect(() => {
    let active = true;
    eligible.current = false;
    if (!busy && !unavailable) {
      fetch(`/api/documents/${documentUuid}/free-revision`, { cache: "no-store" })
        .then(async (response) => response.ok ? response.json() : null)
        .then((result) => { if (active) eligible.current = result?.data?.can_abandon === true; })
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
        const response = await fetch(`/api/documents/${documentUuid}/free-revision`, { cache: "no-store" });
        if (!response.ok) throw new Error();
        const { data } = await response.json();
        if (!active) return;
        if (latest.current.busy) return;
        if (data.can_abandon) { pending.current = proceed; setOpen(true); }
        else { bypass.current = true; proceed(); }
      } catch {
        if (active) toast.error("无法确认文书保存及免费优化状态，请稍后重试。");
      } finally { checking.current = false; }
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || !["http:", "https:"].includes(url.protocol)) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      event.preventDefault(); event.stopImmediatePropagation();
      void requestLeave(() => router.push(url.pathname + url.search + url.hash));
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
      window.history.go(-delta);
      afterRestore = () => {
        void requestLeave(() => { bypass.current = true; window.history.go(delta); });
      };
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

  const close = () => { if (!saving) { pending.current = null; setOpen(false); } };
  const abandon = async () => {
    if (saving || !pending.current) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/documents/${documentUuid}/free-revision`, { method: "POST" });
      if (!response.ok) throw new Error();
      const proceed = pending.current;
      pending.current = null; bypass.current = true; setOpen(false); proceed?.();
    } catch { toast.error("未能保存放弃状态，请留在本页重试。"); }
    finally { setSaving(false); }
  };
  return <>
    <div className="max-w-7xl mx-auto px-6 pt-4">
      <Button variant="ghost" onClick={() => navigateFromResult("/creation-center", () => router.push("/creation-center"))}>← 返回创作中心</Button>
    </div>
    <Dialog open={open} onOpenChange={(value) => { if (!value) close(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确定要离开当前文书吗？</DialogTitle>
          <DialogDescription>
            您还有一次免费全文优化机会。如果对当前文书还不太满意，建议先使用。
            <strong>确认离开后，本篇未使用的免费优化机会将失效，无法再次使用。</strong>
            已保存的文书仍可在「我的文档」中查看和下载。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button disabled={saving} onClick={() => { close(); latest.current.onUseFreeOptimization(); }}>使用免费优化</Button>
          <Button variant="outline" disabled={saving} onClick={abandon}>{saving ? "正在保存…" : "我已了解，直接离开"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
