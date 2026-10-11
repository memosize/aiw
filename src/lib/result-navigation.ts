"use client";

export const RESULT_NAVIGATION_EVENT = "aiw-result-navigation";
export function navigateFromResult(href: string, proceed = () => window.location.assign(href)) {
  const event = new CustomEvent(RESULT_NAVIGATION_EVENT, { cancelable: true, detail: { href, proceed } });
  if (window.dispatchEvent(event)) proceed();
}
