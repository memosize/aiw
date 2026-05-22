"use client";

import { useEffect, useRef, useState } from "react";

export default function TutorialCenterModule() {
  const [payload, setPayload] = useState<{
    styles: string;
    body: string;
  } | null>(null);
  const [panel, setPanel] = useState<"cv" | "ps">("cv");
  const [cvPage, setCvPage] = useState<"1" | "2" | "3">("1");
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const basePath = "/essmote-tutorial-handoff/";
    const rewriteUrl = (value: string | null) => {
      if (!value) return value;
      if (
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("//")
      ) {
        return value;
      }
      if (value.startsWith("#")) return value;
      if (value.startsWith("/")) return value;
      return `${basePath}${value}`;
    };

    const sanitizeDoc = (doc: Document) => {
      doc.querySelectorAll("script").forEach((node) => node.remove());
      doc.querySelectorAll<HTMLElement>("[src]").forEach((node) => {
        const src = node.getAttribute("src");
        const next = rewriteUrl(src);
        if (next) node.setAttribute("src", next);
      });
      doc.querySelectorAll<HTMLElement>("[href]").forEach((node) => {
        const href = node.getAttribute("href");
        const next = rewriteUrl(href);
        if (next) node.setAttribute("href", next);
      });
      doc.querySelectorAll<HTMLAnchorElement>("a").forEach((node) => {
        const href = node.getAttribute("href") ?? "";
        const isProtectedEmailLink =
          href.includes("/cdn-cgi/l/email-protection") || href.startsWith("mailto:");
        const insideInputLikeField = Boolean(
          node.closest(
            ".cv-input, .cv-replica-input, .cv-textarea, .cv-replica-textarea"
          )
        );

        if (isProtectedEmailLink || insideInputLikeField) {
          const replacement = doc.createElement("span");
          replacement.className = node.className;
          replacement.textContent = node.textContent ?? "";
          Array.from(node.attributes).forEach((attr) => {
            if (attr.name !== "href" && !attr.name.toLowerCase().startsWith("on")) {
              replacement.setAttribute(attr.name, attr.value);
            }
          });
          node.replaceWith(replacement);
        }
      });
      doc.querySelectorAll<HTMLElement>("*").forEach((node) => {
        Array.from(node.attributes).forEach((attr) => {
          if (attr.name.toLowerCase().startsWith("on")) {
            node.removeAttribute(attr.name);
          }
        });
      });
    };

    const applyInlineSizing = (doc: Document) => {
      const setStyle = (
        selector: string,
        styles: Partial<CSSStyleDeclaration>
      ) => {
        doc.querySelectorAll<HTMLElement>(selector).forEach((node) => {
          Object.entries(styles).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              node.style.setProperty(
                key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`),
                String(value),
                "important"
              );
            }
          });
        });
      };

      const wrapAiChipText = (selector: string) => {
        doc.querySelectorAll<HTMLElement>(selector).forEach((node) => {
          if (node.querySelector(".cv-ai-chip-text")) return;
          const wrapper = doc.createElement("span");
          wrapper.className = "cv-ai-chip-text";
          while (node.firstChild) {
            wrapper.appendChild(node.firstChild);
          }
          node.appendChild(wrapper);
        });
      };

      setStyle(".compare-big h2", {
        fontSize: "16px",
        lineHeight: "1.25",
        marginBottom: "14px",
      });
      setStyle(".compare-big li", {
        fontSize: "12px",
        lineHeight: "1.38",
        minHeight: "20px",
      });
      setStyle(".compare-big li .check", {
        width: "20px",
        height: "20px",
        fontSize: "14px",
      });
      setStyle(".small-compare.bad .line-row", {
        gridTemplateColumns: "34px 1fr",
        gap: "8px",
        marginLeft: "15px",
        marginRight: "15px",
        paddingTop: "15px",
        paddingBottom: "15px",
        paddingLeft: "15px",
        paddingRight: "15px",
      });
      setStyle(".small-compare.bad .line-row .check", {
        justifySelf: "start",
      });
      setStyle(".small-compare.bad h2", {
        paddingTop: "12px",
        paddingBottom: "12px",
        paddingLeft: "0",
        paddingRight: "0",
      });
      setStyle(".tip", {
        fontSize: "12px",
        lineHeight: "1.42",
      });
      setStyle(".tip b", {
        fontSize: "14px",
        lineHeight: "1.3",
      });
      setStyle(".tip .tip-copy", {
        fontSize: "12px",
        lineHeight: "1.45",
      });
      setStyle(".tip .bulb svg", {
        width: "36px",
        height: "36px",
      });
      wrapAiChipText(".cv-ai-chip");
      wrapAiChipText(".cv-replica-ai-pill");
      wrapAiChipText(".cv-inline-pill");
      setStyle(".cv-ai-chip-text", {
        display: "inline-block",
        position: "relative",
        top: "3px",
      });
      setStyle(".module-row", {
        minHeight: "40px",
        paddingTop: "6px",
        paddingBottom: "6px",
        fontSize: "12px",
        lineHeight: "1.35",
      });
      setStyle(".mini-num", {
        width: "36px",
        height: "24px",
        fontSize: "11px",
      });
      setStyle(".module-row b", {
        fontSize: "12px",
      });
      setStyle(".flow-step b", {
        fontSize: "12px",
      });
      setStyle(".flow-step p", {
        fontSize: "11px",
        lineHeight: "1.38",
      });
      setStyle(".service-choice h2", {
        fontSize: "14px",
        lineHeight: "1.22",
      });
      setStyle(".service-choice p", {
        fontSize: "11px",
        lineHeight: "1.4",
      });
      setStyle(".choice-button", {
        fontSize: "11px",
        height: "34px",
        marginTop: "12px",
      });
      setStyle(".footer-band", {
        paddingTop: "108px",
        paddingBottom: "24px",
      });
      setStyle(".service-choice", {
        minHeight: "150px",
        paddingTop: "14px",
        paddingRight: "18px",
        paddingBottom: "18px",
        paddingLeft: "18px",
        gap: "8px",
      });
      setStyle(".service-choice > div:last-child", {
        marginLeft: "-14px",
      });
      setStyle(".choice-art", {
        width: "80px",
        height: "80px",
        marginLeft: "10px",
      });
    };

    Promise.all([
      fetch("/essmote-tutorial-handoff/index.html").then((res) => res.text()),
      fetch("/essmote-tutorial-handoff/ps-sop-tutorial.html").then((res) =>
        res.text()
      ),
    ])
      .then(([indexHtml, psHtml]) => {
        if (cancelled) return;
        const parser = new DOMParser();
        const indexDoc = parser.parseFromString(indexHtml, "text/html");
        const psDoc = parser.parseFromString(psHtml, "text/html");

        sanitizeDoc(indexDoc);
        sanitizeDoc(psDoc);
        applyInlineSizing(psDoc);

        indexDoc.querySelectorAll<HTMLElement>("[data-cv-goto]").forEach((node) => {
          if (node.tagName.toLowerCase() === "a") {
            node.setAttribute("href", "#");
          }
        });

        const psPanelShell = indexDoc.querySelector("#panel-ps .ps-embed-shell");
        if (psPanelShell) {
          psPanelShell.outerHTML = `<div class="ps-inline-shell">${psDoc.body?.innerHTML ?? ""}</div>`;
        }

        const styles = [indexDoc, psDoc]
          .flatMap((doc) =>
            Array.from(doc.querySelectorAll("style")).map(
              (node) => node.textContent ?? ""
            )
          )
          .map((css) =>
            css
              .replaceAll('url("assets/', 'url("/essmote-tutorial-handoff/assets/')
              .replaceAll("url('assets/", "url('/essmote-tutorial-handoff/assets/")
              .replaceAll("url(assets/", "url(/essmote-tutorial-handoff/assets/")
          )
          .join("\n");
        const body = indexDoc.body?.innerHTML ?? "";
        setPayload({ styles, body });
      })
      .catch(() => {
        if (!cancelled) setPayload({ styles: "", body: "" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;

    const syncState = () => {
      root.querySelectorAll<HTMLElement>(".tc-panel").forEach((node) => {
        const id = node.id;
        const active =
          (panel === "cv" && id === "panel-cv") ||
          (panel === "ps" && id === "panel-ps");
        node.classList.toggle("is-active", active);
      });

      root.querySelectorAll<HTMLElement>(".cv-tutorial-page").forEach((node) => {
        node.classList.toggle("is-active", node.dataset.cvPage === cvPage);
      });

      root
        .querySelectorAll<HTMLElement>(".tc-nav button[data-panel]")
        .forEach((node) => {
          node.classList.toggle("is-active", node.dataset.panel === panel);
        });

      root
        .querySelectorAll<HTMLElement>(".tc-subnav [data-cv-goto]")
        .forEach((node) => {
          node.classList.toggle("is-current", node.dataset.cvGoto === cvPage);
        });
    };

    const aside = root.querySelector<HTMLElement>(".tc-sidebar");
    const footer = document.querySelector("footer");
    const updateAsideHeight = () => {
      if (!aside) return;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const top = 18;
      if (window.innerWidth < 1024 || !footer) {
        aside.style.height = `calc(100vh - ${top}px)`;
        return;
      }
      const footerRect = footer.getBoundingClientRect();
      const overlap = Math.min(
        Math.max(0, viewportHeight - footerRect.top + 18),
        viewportHeight - top
      );
      aside.style.height = `calc(100vh - ${top}px - ${Math.round(overlap)}px)`;
    };

    syncState();
    updateAsideHeight();
    window.addEventListener("scroll", updateAsideHeight, { passive: true });
    window.addEventListener("resize", updateAsideHeight);
    window.visualViewport?.addEventListener("resize", updateAsideHeight);
    window.visualViewport?.addEventListener("scroll", updateAsideHeight);
    return () => {
      window.removeEventListener("scroll", updateAsideHeight);
      window.removeEventListener("resize", updateAsideHeight);
      window.visualViewport?.removeEventListener("resize", updateAsideHeight);
      window.visualViewport?.removeEventListener("scroll", updateAsideHeight);
    };
  }, [payload, panel, cvPage]);

  useEffect(() => {
    if (!payload || panel !== "ps") return;
    const root = contentRef.current?.querySelector<HTMLElement>("#panel-ps");
    if (!root) return;

    const setStyle = (selector: string, styles: Record<string, string>) => {
      root.querySelectorAll<HTMLElement>(selector).forEach((node) => {
        Object.entries(styles).forEach(([key, value]) => {
          node.style.setProperty(
            key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`),
            value,
            "important"
          );
        });
      });
    };

    setStyle(".compare-big h2", {
      fontSize: "16px",
      lineHeight: "1.25",
    });
    setStyle(".compare-big li", {
      fontSize: "12px",
      lineHeight: "1.38",
    });
    setStyle(".compare-big li .check", {
      width: "20px",
      height: "20px",
      fontSize: "14px",
    });
    setStyle(".small-compare.bad .line-row", {
      gridTemplateColumns: "34px 1fr",
      gap: "8px",
      marginLeft: "15px",
      marginRight: "15px",
      paddingTop: "15px",
      paddingBottom: "15px",
      paddingLeft: "15px",
      paddingRight: "15px",
    });
    setStyle(".small-compare.bad .line-row .check", {
      justifySelf: "start",
    });
    setStyle(".small-compare.bad h2", {
      paddingTop: "12px",
      paddingBottom: "12px",
      paddingLeft: "0",
      paddingRight: "0",
    });
    setStyle(".tip", {
      fontSize: "12px",
      lineHeight: "1.42",
    });
    setStyle(".tip b", {
      fontSize: "14px",
      lineHeight: "1.3",
    });
    setStyle(".tip .tip-copy", {
      fontSize: "12px",
      lineHeight: "1.45",
    });
    setStyle(".tip .bulb svg", {
      width: "36px",
      height: "36px",
    });
    setStyle(".module-row", {
      minHeight: "40px",
      paddingTop: "6px",
      paddingBottom: "6px",
      fontSize: "12px",
      lineHeight: "1.35",
    });
    setStyle(".mini-num", {
      width: "36px",
      height: "24px",
      fontSize: "11px",
    });
    setStyle(".module-row b", {
      fontSize: "12px",
    });
    setStyle(".flow-step b", {
      fontSize: "12px",
    });
    setStyle(".flow-step p", {
      fontSize: "11px",
      lineHeight: "1.38",
    });
    setStyle(".service-choice h2", {
      fontSize: "14px",
      lineHeight: "1.22",
    });
    setStyle(".service-choice p", {
      fontSize: "11px",
      lineHeight: "1.4",
    });
    setStyle(".choice-button", {
      fontSize: "11px",
      height: "34px",
      marginTop: "12px",
    });
    setStyle(".footer-band", {
      paddingTop: "72px",
      paddingBottom: "20px",
    });
    setStyle(".service-choice", {
      minHeight: "150px",
      paddingTop: "14px",
      paddingRight: "18px",
      paddingBottom: "18px",
      paddingLeft: "18px",
      gap: "8px",
    });
    setStyle(".service-choice > div:last-child", {
      marginLeft: "-14px",
    });
    setStyle(".choice-art", {
      width: "80px",
      height: "80px",
      marginLeft: "10px",
    });
  }, [payload, panel]);

  return (
    <div className="min-h-screen bg-white">
      {payload ? (
        <div
          ref={contentRef}
          className="essmote-tutorial-center"
          suppressHydrationWarning
          onClick={(event) => {
            const target = event.target as HTMLElement | null;
            const panelButton = target?.closest<HTMLElement>("[data-panel]");
            const cvButton = target?.closest<HTMLElement>("[data-cv-goto]");

            if (
              panelButton?.dataset.panel === "cv" ||
              panelButton?.dataset.panel === "ps"
            ) {
              event.preventDefault();
              setPanel(panelButton.dataset.panel);
              return;
            }

            if (
              cvButton?.dataset.cvGoto === "1" ||
              cvButton?.dataset.cvGoto === "2" ||
              cvButton?.dataset.cvGoto === "3"
            ) {
              event.preventDefault();
              setPanel("cv");
              setCvPage(cvButton.dataset.cvGoto);
              window.scrollTo({ top: 0, behavior: "auto" });
            }
          }}
        >
          <style>{`
            ${payload.styles}
            .essmote-tutorial-center {
              width: 100%;
              min-height: 100vh;
              overflow-x: auto;
              overflow-y: visible;
              background: #fff;
              zoom: 0.8;
            }
            .essmote-tutorial-center .tc-shell {
              display: grid !important;
              grid-template-columns: 272px minmax(0, 1fr) !important;
              gap: 12px !important;
              align-items: start !important;
              width: 1180px !important;
              max-width: none !important;
              margin: 0 auto !important;
              padding: 10px !important;
              transform: none !important;
            }
            .essmote-tutorial-center .tc-sidebar {
              position: sticky !important;
              top: 18px !important;
              align-self: start !important;
              min-height: calc(100vh - 36px) !important;
              padding: 10px !important;
              border: 1px solid #d9eee3 !important;
              border-radius: 8px !important;
              background: #fff !important;
              box-shadow: 0 12px 26px rgba(23, 84, 50, 0.06) !important;
              z-index: 2 !important;
            }
            .essmote-tutorial-center .tc-brand {
              width: fit-content !important;
              padding: 7px 12px 7px 9px !important;
              border-radius: 999px !important;
              background: linear-gradient(
                135deg,
                rgba(255, 255, 255, 0.96),
                rgba(231, 248, 239, 0.9)
              ) !important;
              color: #079642 !important;
            }
            .essmote-tutorial-center .tc-side-label {
              margin: 14px 0 6px !important;
              font-size: 12px !important;
            }
            .essmote-tutorial-center .tc-nav button {
              min-height: 36px !important;
              padding: 6px 8px !important;
              border-radius: 8px !important;
              font-size: 14px !important;
            }
            .essmote-tutorial-center .tc-main {
              min-width: 0 !important;
              align-self: start !important;
              width: 100% !important;
              padding: 0 !important;
            }
            .essmote-tutorial-center .deck {
              width: 100% !important;
              max-width: none !important;
              transform: none !important;
            }
            .essmote-tutorial-center .slide.wide {
              padding: 34px 28px !important;
            }
            .essmote-tutorial-center .slide.wide.hero-slide {
              padding: 8px !important;
            }
            .essmote-tutorial-center .header {
              gap: 16px !important;
              margin-bottom: 18px !important;
            }
            .essmote-tutorial-center .num {
              width: 64px !important;
              height: 64px !important;
              font-size: 34px !important;
            }
            .essmote-tutorial-center h1 {
              font-size: 35px !important;
              line-height: 1.14 !important;
            }
            .essmote-tutorial-center .sub {
              font-size: 16px !important;
              line-height: 1.5 !important;
            }
            .essmote-tutorial-center .card,
            .essmote-tutorial-center .soft-card {
              padding: 16px !important;
              border-radius: 16px !important;
            }
            .essmote-tutorial-center .hero-banner,
            .essmote-tutorial-center .hero-media,
            .essmote-tutorial-center .hero-copy {
              min-height: 0 !important;
            }
            .essmote-tutorial-center .hero-banner {
              padding: 18px !important;
            }
            .essmote-tutorial-center p,
            .essmote-tutorial-center li,
            .essmote-tutorial-center .eyebrow,
            .essmote-tutorial-center .label {
              font-size: 14px !important;
              line-height: 1.6 !important;
            }
            .essmote-tutorial-center * {
              box-sizing: border-box;
            }
            .essmote-tutorial-center .deck {
              margin: 0;
            }
            .essmote-tutorial-center .cv-module-table-row.header > span:first-child {
              justify-self: start !important;
              text-align: left !important;
              align-self: center !important;
              margin-bottom: 0 !important;
              padding-bottom: 0 !important;
              line-height: 1 !important;
            }
            .essmote-tutorial-center .cv-module-table-row.header > span:last-child {
              justify-self: start !important;
              text-align: left !important;
              align-self: center !important;
              margin-bottom: 0 !important;
              padding-bottom: 0 !important;
              line-height: 1 !important;
              padding-left: 12px !important;
            }
            .essmote-tutorial-center #panel-ps .deck {
              width: 100% !important;
              max-width: none !important;
              padding: 0 !important;
              transform: none !important;
            }
            .essmote-tutorial-center #panel-ps .ps-inline-shell {
              width: 100% !important;
              --title-size: 34px !important;
              --subtitle-size: 16px !important;
              --section-title-size: 21px !important;
              --body-size: 14px !important;
              --caption-size: 12px !important;
            }
            .essmote-tutorial-center #panel-ps body,
            .essmote-tutorial-center #panel-ps main {
              height: auto !important;
              overflow: visible !important;
            }
            .essmote-tutorial-center #panel-ps .slide {
              margin-bottom: 16px !important;
              border-radius: 8px !important;
              box-shadow: 0 16px 36px rgba(23, 84, 50, 0.06) !important;
            }
            .essmote-tutorial-center #panel-ps .hero-slide {
              padding: 6px !important;
            }
            .essmote-tutorial-center #panel-ps .slide.wide,
            .essmote-tutorial-center #panel-ps .wide {
              padding: 24px 20px !important;
            }
            .essmote-tutorial-center #panel-ps .slide.wide > * + * {
              margin-top: 12px !important;
            }
            .essmote-tutorial-center #panel-ps .slide.wide :is(
              p,
              li,
              span,
              a,
              strong,
              b,
              em,
              small,
              label
            ) {
              line-height: 1.5 !important;
            }
            .essmote-tutorial-center #panel-ps .slide.wide :is(
              h1,
              h2,
              h3,
              h4
            ) {
              line-height: 1.25 !important;
            }
            .essmote-tutorial-center #panel-ps .tall {
              padding: 22px 20px !important;
              max-width: 820px !important;
            }
            .essmote-tutorial-center #panel-ps .portrait {
              padding: 20px 18px !important;
              max-width: 880px !important;
            }
            .essmote-tutorial-center #panel-ps .header {
              gap: 12px !important;
              margin-bottom: 14px !important;
            }
            .essmote-tutorial-center #panel-ps .num {
              width: 54px !important;
              height: 54px !important;
              font-size: 28px !important;
              border-radius: 12px !important;
            }
            .essmote-tutorial-center #panel-ps h1 {
              font-size: 32px !important;
              line-height: 1.14 !important;
            }
            .essmote-tutorial-center #panel-ps h2 {
              font-size: 18px !important;
              line-height: 1.3 !important;
            }
            .essmote-tutorial-center #panel-ps h3 {
              font-size: 15px !important;
              line-height: 1.35 !important;
            }
            .essmote-tutorial-center #panel-ps .sub {
              font-size: 14px !important;
              line-height: 1.5 !important;
            }
            .essmote-tutorial-center #panel-ps p,
            .essmote-tutorial-center #panel-ps li,
            .essmote-tutorial-center #panel-ps .eyebrow,
            .essmote-tutorial-center #panel-ps .label,
            .essmote-tutorial-center #panel-ps .caption {
              font-size: 12px !important;
              line-height: 1.55 !important;
            }
            .essmote-tutorial-center #panel-ps .card,
            .essmote-tutorial-center #panel-ps .soft-card {
              padding: 12px !important;
              border-radius: 12px !important;
            }
            .essmote-tutorial-center #panel-ps .slide.wide .card,
            .essmote-tutorial-center #panel-ps .slide.wide .soft-card {
              padding: 10px !important;
              border-radius: 10px !important;
            }
            .essmote-tutorial-center #panel-ps .hero-banner {
              padding: 12px !important;
            }
            .essmote-tutorial-center #panel-ps .hero-media,
            .essmote-tutorial-center #panel-ps .hero-copy,
            .essmote-tutorial-center #panel-ps .hero-banner {
              min-height: 0 !important;
            }
            .essmote-tutorial-center #panel-ps .icon-round {
              width: 56px !important;
              height: 56px !important;
              font-size: 22px !important;
            }
            .essmote-tutorial-center #panel-ps .slide.wide .icon-round {
              width: 46px !important;
              height: 46px !important;
              font-size: 18px !important;
            }
            .essmote-tutorial-center #panel-ps .check {
              width: 24px !important;
              height: 24px !important;
              font-size: 14px !important;
            }
            .essmote-tutorial-center #panel-ps .slide.wide .check {
              width: 20px !important;
              height: 20px !important;
              font-size: 12px !important;
            }
            .essmote-tutorial-center #panel-ps .tip {
              min-height: 56px !important;
              padding: 8px 14px !important;
              gap: 12px !important;
            }
            .essmote-tutorial-center #panel-ps .tip .bulb svg {
              width: 36px !important;
              height: 36px !important;
            }
            .essmote-tutorial-center #panel-ps .cv-ai-chip-text {
              display: inline-block !important;
              position: relative !important;
              top: 3px !important;
            }
            .essmote-tutorial-center #panel-ps .slide.wide .tip {
              min-height: 48px !important;
              padding: 6px 12px !important;
              gap: 10px !important;
            }
            .essmote-tutorial-center #panel-ps .badge,
            .essmote-tutorial-center #panel-ps .tag,
            .essmote-tutorial-center #panel-ps .pill {
              font-size: 12px !important;
              padding: 4px 8px !important;
            }
            .essmote-tutorial-center #panel-ps .slide.wide h2 {
              font-size: 19px !important;
            }
            .essmote-tutorial-center #panel-ps .slide.wide h3 {
              font-size: 16px !important;
            }
            .essmote-tutorial-center #panel-ps .slide.wide p,
            .essmote-tutorial-center #panel-ps .slide.wide li,
            .essmote-tutorial-center #panel-ps .slide.wide .label,
            .essmote-tutorial-center #panel-ps .slide.wide .caption {
              font-size: 14px !important;
              line-height: 1.55 !important;
            }
            .essmote-tutorial-center #panel-ps .slide.wide .sub {
              font-size: 14px !important;
            }
            .essmote-tutorial-center #panel-ps .slide.wide .eyebrow,
            .essmote-tutorial-center #panel-ps .slide.wide .caption,
            .essmote-tutorial-center #panel-ps .slide.wide small {
              font-size: 12px !important;
            }
            .essmote-tutorial-center #panel-ps .slide.wide .badge,
            .essmote-tutorial-center #panel-ps .slide.wide .tag,
            .essmote-tutorial-center #panel-ps .slide.wide .pill {
              font-size: 11px !important;
              padding: 3px 7px !important;
            }
            .essmote-tutorial-center #panel-ps .tip {
              font-size: 12px !important;
              line-height: 1.42 !important;
            }
            .essmote-tutorial-center #panel-ps .tip b {
              font-size: 16px !important;
              line-height: 1.3 !important;
            }
            .essmote-tutorial-center #panel-ps .tip .tip-copy {
              font-size: 12px !important;
              line-height: 1.45 !important;
            }
            .essmote-tutorial-center #panel-ps .compare-big {
              min-height: 0 !important;
              padding: 20px 104px 20px 20px !important;
            }
            .essmote-tutorial-center #panel-ps .compare-big h2 {
              margin: 0 0 14px !important;
              gap: 10px !important;
              font-size: 16px !important;
            }
            .essmote-tutorial-center #panel-ps .compare-big ul {
              gap: 8px !important;
              margin-top: 6px !important;
              padding-left: 14px !important;
            }
            .essmote-tutorial-center #panel-ps .compare-big li {
              font-size: 12px !important;
              line-height: 1.38 !important;
              min-height: 20px !important;
              white-space: normal !important;
            }
            .essmote-tutorial-center #panel-ps .compare-big li .check {
              flex: 0 0 20px !important;
              width: 20px !important;
              height: 20px !important;
              font-size: 14px !important;
            }
            .essmote-tutorial-center #panel-ps .small-compare.bad .line-row {
              grid-template-columns: 34px 1fr !important;
              gap: 8px !important;
              margin-left: 15px !important;
              margin-right: 15px !important;
              padding: 15px !important;
            }
            .essmote-tutorial-center #panel-ps .small-compare.bad .line-row .check {
              justify-self: start !important;
            }
            .essmote-tutorial-center #panel-ps .small-compare.bad h2 {
              padding: 12px 0 !important;
            }
            .essmote-tutorial-center #panel-ps .module-row {
              grid-template-columns: 46px minmax(0, 1fr) !important;
              gap: 10px !important;
              min-height: 40px !important;
              padding: 6px 0 !important;
              font-size: 12px !important;
              line-height: 1.35 !important;
            }
            .essmote-tutorial-center #panel-ps .module-row > span:last-child {
              white-space: normal !important;
            }
            .essmote-tutorial-center #panel-ps .mini-num {
              width: 36px !important;
              height: 24px !important;
              font-size: 11px !important;
            }
            .essmote-tutorial-center #panel-ps .module-row b {
              font-size: 12px !important;
            }
            .essmote-tutorial-center #panel-ps .footer-band {
              padding-top: 72px !important;
              padding-bottom: 20px !important;
              margin-top: 6px !important;
              position: relative !important;
              z-index: 2 !important;
            }
            .essmote-tutorial-center #panel-ps .footer-band::before {
              font-size: 20px !important;
              top: 10px !important;
              line-height: 1.1 !important;
            }
            .essmote-tutorial-center #panel-ps .service-choice {
              min-height: 150px !important;
              margin-top: -16px !important;
              padding: 14px 18px 18px !important;
              gap: 8px !important;
            }
            .essmote-tutorial-center #panel-ps .service-choice > div:last-child {
              margin-left: -14px !important;
            }
            .essmote-tutorial-center #panel-ps .service-choice.recommended {
              padding-right: 34px !important;
            }
            .essmote-tutorial-center #panel-ps .choice-art {
              width: 80px !important;
              height: 80px !important;
              margin-left: 10px !important;
            }
            .essmote-tutorial-center #panel-ps .choice-art img {
              width: 56px !important;
              height: 56px !important;
            }
            .essmote-tutorial-center #panel-ps .service-choice h2 {
              font-size: 14px !important;
              line-height: 1.22 !important;
            }
            .essmote-tutorial-center #panel-ps .service-choice p {
              font-size: 11px !important;
              line-height: 1.4 !important;
            }
            .essmote-tutorial-center #panel-ps .choice-button {
              font-size: 11px !important;
              padding: 6px 10px !important;
            }
            .essmote-tutorial-center #panel-ps .service-choice.recommended::after {
              font-size: 9px !important;
              padding: 3px 7px !important;
            }
            .essmote-tutorial-center #panel-ps .slide.wide ul,
            .essmote-tutorial-center #panel-ps .slide.wide ol {
              gap: 6px !important;
            }
            .essmote-tutorial-center #panel-ps .slide.wide [class*="grid"] {
              gap: 12px !important;
            }
            .essmote-tutorial-center #panel-ps .slide.wide [class*="cols"] {
              gap: 12px !important;
            }
            .essmote-tutorial-center #panel-ps .slide.wide [style*="font-size: 22px"],
            .essmote-tutorial-center #panel-ps .slide.wide [style*="font-size:22px"] {
              font-size: 15px !important;
            }
            .essmote-tutorial-center #panel-ps .slide.wide [style*="font-size: 18px"],
            .essmote-tutorial-center #panel-ps .slide.wide [style*="font-size:18px"] {
              font-size: 14px !important;
            }
            .essmote-tutorial-center #panel-ps .slide.wide img {
              max-width: 100% !important;
              height: auto !important;
            }
            .essmote-tutorial-center .cv-input a,
            .essmote-tutorial-center .cv-replica-input a,
            .essmote-tutorial-center .cv-textarea a,
            .essmote-tutorial-center .cv-replica-textarea a {
              pointer-events: none !important;
              color: inherit !important;
              text-decoration: none !important;
              cursor: default !important;
            }
          `}</style>
          <div dangerouslySetInnerHTML={{ __html: payload.body }} />
        </div>
      ) : (
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
          {"\u52a0\u8f7d\u4e2d..."}
        </div>
      )}
    </div>
  );
}
