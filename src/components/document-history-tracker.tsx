"use client";
import { useEffect } from "react";

export const HISTORY_INDEX = "__aiwDocumentHistoryIndex";
let popGuard: ((event: PopStateEvent) => void) | undefined;
export function registerDocumentPopGuard(guard: (event: PopStateEvent) => void) {
  popGuard = guard;
  return () => { if (popGuard === guard) popGuard = undefined; };
}
export default function DocumentHistoryTracker() {
  useEffect(() => {
    let currentIndex = window.history.state?.[HISTORY_INDEX] ?? 0;
    const onPop = (event: PopStateEvent) => {
      if (typeof event.state?.[HISTORY_INDEX] === "number") currentIndex = event.state[HISTORY_INDEX];
      popGuard?.(event);
    };
    window.addEventListener("popstate", onPop, true);
    const push = window.history.pushState;
    const replace = window.history.replaceState;
    replace.call(window.history, { ...window.history.state, [HISTORY_INDEX]: currentIndex }, "");
    const trackedPush: History["pushState"] = function (this: History, state, unused, url) {
      push.call(this, { ...state, [HISTORY_INDEX]: ++currentIndex }, unused, url);
    };
    const trackedReplace: History["replaceState"] = function (this: History, state, unused, url) {
      replace.call(this, { ...state, [HISTORY_INDEX]: currentIndex }, unused, url);
    };
    const onHashChange = () => {
      if (typeof window.history.state?.[HISTORY_INDEX] !== "number") {
        currentIndex += 1;
        replace.call(window.history, { ...window.history.state, [HISTORY_INDEX]: currentIndex }, "");
      }
    };
    window.addEventListener("hashchange", onHashChange);
    window.history.pushState = trackedPush;
    window.history.replaceState = trackedReplace;
    return () => {
      window.removeEventListener("popstate", onPop, true);
      window.removeEventListener("hashchange", onHashChange);
      if (window.history.pushState === trackedPush) window.history.pushState = push;
      if (window.history.replaceState === trackedReplace) window.history.replaceState = replace;
    };
  }, []);
  return null;
}
