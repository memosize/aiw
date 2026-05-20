"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Menu,
  MoveLeft,
  MoveRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SopTutorialModule from "./SopTutorialModule";
import TutorialCenterModule from "./TutorialCenterModule";

import zhMessages from "@/i18n/pages/help/zh.json";
import enMessages from "@/i18n/pages/help/en.json";

interface HelpClientProps {
  locale: string;
}

type TutorialPage = {
  key: "resume_page_1" | "resume_page_2" | "resume_page_3";
  title: string;
  description: string;
  images: string[];
};

type TutorialNavChild = {
  key: TutorialPage["key"];
  title: string;
};

type TutorialNavItem = {
  key: string;
  title: string;
  children?: TutorialNavChild[];
};

const PS_TUTORIAL_IMAGES = [
  "/imgs/jiaocheng/new3.svg",
  "/imgs/jiaocheng/new1.svg",
  "/imgs/jiaocheng/new2.svg",
];

const FOOTER_DIVIDER_HEIGHT_PX = 2;
const FOOTER_DIVIDER_GAP_PX = 16;
const FOOTER_DIVIDER_SHIFT_DOWN_PX = 1;
const SIDEBAR_FOOTER_CLEARANCE_PX = 0.5;
const SIDEBAR_TIMELINE_CENTER_PX = 6;
const SIDEBAR_TIMELINE_DOT_SIZE_PX = 7;
const SIDEBAR_TOP_EXTRA_OFFSET_PX = 4;
const LAYOUT_RIGHT_SHIFT_PX = 24;

const RESUME_PAGE_ORDER: TutorialPage["key"][] = [
  "resume_page_1",
  "resume_page_2",
  "resume_page_3",
];

const RESUME_TUTORIAL_PAGES: TutorialPage[] = [
  {
    key: "resume_page_1",
    title: "第1页：基础信息与主要经历",
    description:
      "本页面重点讲解如何填写基础信息、教育经历与实习/工作经历，搭建你的简历基础内容框架。",
    images: [
      "/imgs/jiaocheng/pic1.png",
      "/imgs/jiaocheng/pic2.png",
      "/imgs/jiaocheng/pic3.png",
      "/imgs/jiaocheng/pic4.png",
      "/imgs/jiaocheng/pic5.png",
    ],
  },
  {
    key: "resume_page_2",
    title: "第2页：经历补充与 AI 优化",
    description:
      "补充更多可选信息，让你的简历内容更完整、更专业，提升申请竞争力。",
    images: [
      "/imgs/jiaocheng/pic6.png",
      "/imgs/jiaocheng/pic7.png",
      "/imgs/jiaocheng/pic8.png",
      "/imgs/jiaocheng/pic9.png",
    ],
  },
  {
    key: "resume_page_3",
    title: "第3页：预览、编辑与导出",
    description:
      "本页核心是调整简历结构与展示内容，选择模版并导出最终版本。",
    images: [
      "/imgs/jiaocheng/pic10.png",
      "/imgs/jiaocheng/pic11.png",
      "/imgs/jiaocheng/pic12.png",
    ],
  },
];

const zhTutorialNavItems: TutorialNavItem[] = [
  {
    key: "resume_cv_tutorial",
    title: "简历 CV 教程",
    children: [
      { key: "resume_page_1", title: "第1页：基础信息与主要经历" },
      { key: "resume_page_2", title: "第2页：经历补充与 AI 优化" },
      { key: "resume_page_3", title: "第3页：预览、编辑与导出" },
    ],
  },
  { key: "ps_tutorial", title: "PS 教程" },
  { key: "sop_tutorial", title: "SOP 教程" },
  { key: "recommendation_tutorial", title: "推荐信教程" },
  { key: "cover_letter_tutorial", title: "求职信教程" },
];

export default function HelpClient({ locale }: HelpClientProps) {
  const messages = locale === "zh" ? zhMessages.help : enMessages.help;
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    "resume_cv_tutorial",
  ]);
  const [selectedMainKey, setSelectedMainKey] = useState("resume_cv_tutorial");
  const [selectedPageKey, setSelectedPageKey] =
    useState<TutorialPage["key"]>("resume_page_1");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const lastLegacyMainKeyRef = useRef("resume_cv_tutorial");
  const pageRootRef = useRef<HTMLDivElement | null>(null);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);

  const selectedPage = useMemo(
    () =>
      RESUME_TUTORIAL_PAGES.find((page) => page.key === selectedPageKey) ??
      RESUME_TUTORIAL_PAGES[0],
    [selectedPageKey]
  );

  const selectedMainTitle =
    zhTutorialNavItems.find((item) => item.key === selectedMainKey)?.title ??
    "简历 CV 教程";

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const isTutorialParentActive = (item: TutorialNavItem) => {
    if (!item.children?.length) return selectedMainKey === item.key;
    return (
      selectedMainKey === item.key &&
      item.children.some((child) => child.key === selectedPageKey)
    );
  };

  const goToResumePage = (pageKey: TutorialPage["key"]) => {
    setSelectedMainKey("resume_cv_tutorial");
    setSelectedPageKey(pageKey);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToTutorialCenter = () => {
    setSelectedMainKey("tutorial_center");
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentPageIndex = RESUME_PAGE_ORDER.indexOf(selectedPageKey);
  const prevPageKey =
    currentPageIndex > 0 ? RESUME_PAGE_ORDER[currentPageIndex - 1] : null;
  const nextPageKey =
    currentPageIndex < RESUME_PAGE_ORDER.length - 1
      ? RESUME_PAGE_ORDER[currentPageIndex + 1]
      : null;

  const renderPageImages = () => {
    if (selectedPage.key === "resume_page_1") {
      return (
        <div className="space-y-4">
          <div className="-mt-6 grid grid-cols-1 gap-0 md:-ml-2 md:w-[calc(100%-20px)] md:grid-cols-2">
            {selectedPage.images.slice(0, 2).map((src, index) => (
              <div
                key={src}
                className={cn(
                  "overflow-hidden",
                  index === 0 && "md:ml-[8px] md:w-[calc(100%+21px)]",
                  index === 1 && "md:ml-[-24px] md:w-[calc(100%+25px)]"
                )}
              >
                <Image
                  src={src}
                  alt={selectedPage.title}
                  width={1200}
                  height={800}
                  className={cn(
                    "h-auto w-[80%]",
                    index === 0 && "md:h-[calc(100%+2px)]",
                    index === 1 && "md:h-[calc(100%+3px)]"
                  )}
                  unoptimized
                />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {selectedPage.images.slice(2).map((src) => (
              <div
                key={src}
                className="overflow-hidden"
              >
                <Image
                  src={src}
                  alt={selectedPage.title}
                  width={1600}
                  height={900}
                  className="h-auto w-[86%]"
                  unoptimized
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {selectedPage.images.map((src) => (
          <div
            key={src}
            className={cn(
              "overflow-hidden",
              src === "/imgs/jiaocheng/pic6.png" && "-mt-2",
              src === "/imgs/jiaocheng/pic10.png" && "-mt-2"
            )}
          >
            <Image
              src={src}
              alt={selectedPage.title}
              width={1600}
              height={900}
              className={cn(
                "h-auto w-[86%]",
                src === "/imgs/jiaocheng/pic7.png" && "w-[calc(86%+0px)]",
                src === "/imgs/jiaocheng/pic10.png" &&
                  "w-[calc(86%-0px)]"
              )}
              unoptimized
            />
          </div>
        ))}
      </div>
    );
  };

  const renderPsTutorialImages = () => {
    return (
      <div className="space-y-3">
        {PS_TUTORIAL_IMAGES.map((src) => (
          <div key={src} className="overflow-hidden">
            <Image
              src={src}
              alt="PS tutorial"
              width={1600}
              height={900}
              className="h-auto w-[86%]"
              unoptimized
            />
          </div>
        ))}
      </div>
    );
  };

  useEffect(() => {
    if (selectedMainKey !== "tutorial_center") {
      lastLegacyMainKeyRef.current = selectedMainKey;
    }
  }, [selectedMainKey]);

  useEffect(() => {
    if (selectedMainKey === "tutorial_center") {
      return;
    }

    const aside = asideRef.current;
    if (!aside) return;

    const footer = document.querySelector("footer");
    const docEl = document.documentElement;
    const bodyEl = document.body;

    const updateAsideHeight = () => {
      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;

      const topBarVisibleHeight = (() => {
        const rootTop = pageRootRef.current?.getBoundingClientRect().top ?? 0;
        return Math.max(0, Math.round(rootTop) + SIDEBAR_TOP_EXTRA_OFFSET_PX);
      })();

      aside.style.top = `${Math.round(topBarVisibleHeight)}px`;

      if (window.innerWidth >= 1024) {
        const layoutLeft = layoutRef.current?.getBoundingClientRect().left ?? 0;
        aside.style.left = `${Math.round(layoutLeft + LAYOUT_RIGHT_SHIFT_PX)}px`;
      } else {
        aside.style.left = "0px";
      }

      if (window.innerWidth < 1024 || !footer) {
        aside.style.height = `calc(100vh - ${Math.round(topBarVisibleHeight)}px)`;
        return;
      }

      const footerRect = footer.getBoundingClientRect();
      const footerDividerOffset =
        FOOTER_DIVIDER_HEIGHT_PX +
        FOOTER_DIVIDER_GAP_PX -
        FOOTER_DIVIDER_SHIFT_DOWN_PX +
        SIDEBAR_FOOTER_CLEARANCE_PX;
      const overlap = Math.min(
        Math.max(0, viewportHeight - footerRect.top + footerDividerOffset),
        viewportHeight - Math.round(topBarVisibleHeight)
      );
      aside.style.height = `calc(100vh - ${Math.round(topBarVisibleHeight)}px - ${Math.round(overlap)}px)`;
    };

    updateAsideHeight();
    window.addEventListener("scroll", updateAsideHeight, { passive: true });
    document.addEventListener("scroll", updateAsideHeight, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", updateAsideHeight);
    window.visualViewport?.addEventListener("resize", updateAsideHeight);
    window.visualViewport?.addEventListener("scroll", updateAsideHeight);

    const resizeObserver = new ResizeObserver(() => updateAsideHeight());
    resizeObserver.observe(docEl);
    resizeObserver.observe(bodyEl);
    if (footer && resizeObserver) {
      resizeObserver.observe(footer);
    }

    return () => {
      window.removeEventListener("scroll", updateAsideHeight);
      document.removeEventListener("scroll", updateAsideHeight, true);
      window.removeEventListener("resize", updateAsideHeight);
      window.visualViewport?.removeEventListener("resize", updateAsideHeight);
      window.visualViewport?.removeEventListener("scroll", updateAsideHeight);
      resizeObserver?.disconnect();
    };
  }, [selectedMainKey]);

  useEffect(() => {
    const footer = document.querySelector("footer") as HTMLElement | null;
    if (!footer) return;

    const divider = document.createElement("div");
    divider.setAttribute("data-help-footer-divider", "true");
    divider.style.height = `${FOOTER_DIVIDER_HEIGHT_PX}px`;
    divider.style.background = "#f3f5f7";
    divider.style.marginBottom = `${FOOTER_DIVIDER_GAP_PX}px`;
    divider.style.position = "relative";
    divider.style.top = `${FOOTER_DIVIDER_SHIFT_DOWN_PX}px`;
    divider.style.width = "100vw";
    divider.style.left = "50%";
    divider.style.transform = "translateX(-50%)";
    divider.style.zIndex = "60";
    divider.style.pointerEvents = "none";

    footer.parentElement?.insertBefore(divider, footer);

    return () => {
      divider.remove();
    };
  }, []);

  if (selectedMainKey === "tutorial_center") {
    return (
      <TutorialCenterModule
        onBack={() => setSelectedMainKey(lastLegacyMainKeyRef.current)}
      />
    );
  }

  return (
    <div ref={pageRootRef} className="min-h-screen bg-background">
      <div className="fixed bottom-6 right-6 z-[80]">
        <Button
          type="button"
          onClick={goToTutorialCenter}
          className="bg-emerald-600 text-white shadow-lg hover:bg-emerald-700"
        >
          进入新页面
        </Button>
      </div>

      <div className="fixed left-4 top-20 z-50 lg:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-background shadow-md"
        >
          {isMobileMenuOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="border-t-2 border-[#f3f5f7] lg:ml-[10%]">
        <div
          ref={layoutRef}
          className="mx-auto flex w-full max-w-[1480px]"
        >
        <aside
          ref={asideRef}
          className={cn(
            "fixed left-0 z-30 h-[calc(100vh-4rem)] w-80 shrink-0 overflow-y-auto border-r-2 border-[#f3f5f7] bg-background transition-transform duration-200 lg:translate-x-0",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          <div className="space-y-4 py-4 pl-7 pr-3">
            <div className="px-2 py-1">
              <span className="text-base font-semibold">{messages.label}</span>
            </div>

            <nav className="space-y-2">
              {zhTutorialNavItems.map((item) => {
                const hasChildren = !!item.children?.length;
                const isExpanded = expandedCategories.includes(item.key);
                const filteredChildren = hasChildren ? item.children || [] : [];
                const parentActive = isTutorialParentActive(item);

                return (
                  <div key={item.key}>
                    <button
                      onClick={() => {
                        if (hasChildren) {
                          toggleCategory(item.key);
                          setSelectedMainKey(item.key);
                          return;
                        }
                        setSelectedMainKey(item.key);
                        setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-3 text-left text-sm font-medium transition-colors",
                        parentActive
                          ? "text-green-600 dark:text-green-400"
                          : "text-foreground hover:bg-muted/50"
                      )}
                    >
                      <span>{item.title}</span>
                      {hasChildren &&
                        (isExpanded ? (
                          <ChevronDown
                            className={cn(
                              "h-4 w-4",
                              parentActive
                                ? "text-green-600 dark:text-green-400"
                                : "text-muted-foreground"
                            )}
                          />
                        ) : (
                          <ChevronRight
                            className={cn(
                              "h-4 w-4",
                              parentActive
                                ? "text-green-600 dark:text-green-400"
                                : "text-muted-foreground"
                            )}
                          />
                        ))}
                    </button>

                    {hasChildren && isExpanded && filteredChildren.length > 0 && (
                      <div className="relative ml-3 mt-2 space-y-1.5 pl-6">
                        {filteredChildren.map((child) => {
                          const childActive = selectedPageKey === child.key;
                          return (
                            <div key={child.key} className="relative">
                              <span
                                className={cn(
                                  "absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-gray-400",
                                  childActive && "bg-green-500"
                                )}
                                style={{
                                  left: `${SIDEBAR_TIMELINE_CENTER_PX - SIDEBAR_TIMELINE_DOT_SIZE_PX / 2}px`,
                                  width: `${SIDEBAR_TIMELINE_DOT_SIZE_PX}px`,
                                  height: `${SIDEBAR_TIMELINE_DOT_SIZE_PX}px`,
                                }}
                              />
                              <button
                                onClick={() => goToResumePage(child.key)}
                                className={cn(
                                  "-ml-4 flex w-[calc(100%+1rem)] items-center gap-2 rounded-[5px] px-3 py-2.5 pl-6 text-left text-sm transition-colors",
                                  childActive
                                    ? "bg-green-50 font-medium text-green-600 dark:bg-green-950/30 dark:text-green-400"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                              >
                                <span className="ml-4 truncate">{child.title}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="flex-1 lg:ml-[30%]">
          <div className="bg-muted/30">
            <div className="w-[76%] max-w-4xl px-6 py-3">
              <div className="ml-1 flex items-center gap-2 text-sm text-muted-foreground">
                <span>{messages.label}</span>
                <ChevronRight className="h-3 w-3" />
                <span>{selectedMainTitle}</span>
                {selectedMainKey === "resume_cv_tutorial" && (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    <span>{selectedPage.title}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="w-[76%] max-w-4xl px-6 py-8">
            <div className="mb-8">
              <h1 className="ml-1 mb-3 text-3xl font-bold">
                {selectedMainKey === "resume_cv_tutorial"
                  ? "简历 CV 使用教程"
                  : selectedMainTitle}
              </h1>
              {selectedMainKey === "resume_cv_tutorial" &&
              selectedPage.key === "resume_page_3" ? (
                <div className="ml-1 inline-flex items-center gap-2 rounded-md bg-[#f0fdf4] px-3 py-2 text-green-600 dark:text-green-400">
                  <Lightbulb className="h-4 w-4 text-green-600" />
                  <span>{selectedPage.description}</span>
                </div>
              ) : (
                <p className={cn("ml-1 text-muted-foreground", selectedMainKey === "ps_tutorial" && "hidden")}>
                  {selectedMainKey === "resume_cv_tutorial"
                    ? selectedPage.description
                    : "该教程内容正在整理中，敬请期待。"}
                </p>
              )}
            </div>

            {selectedMainKey === "resume_cv_tutorial" ? (
              <>
                {renderPageImages()}

                <div className="mt-8 flex items-center justify-between">
                  {prevPageKey ? (
                    <button
                      onClick={() => goToResumePage(prevPageKey)}
                      className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-muted"
                    >
                      <MoveLeft className="h-4 w-4" />
                      {"返回上一页"}
                    </button>
                  ) : (
                    <div />
                  )}

                  {nextPageKey && (
                    <button
                      onClick={() => goToResumePage(nextPageKey)}
                      className="inline-flex items-center gap-2 rounded-md bg-[#06883b] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    >
                      进入下一页
                      <MoveRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </>
            ) : selectedMainKey === "ps_tutorial" ? (
              <SopTutorialModule />
            ) : selectedMainKey === "sop_tutorial" ? (
              <div className="rounded-xl border border-border/70 p-6 text-sm text-muted-foreground">
                该教程模块暂未上线。
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 p-6 text-sm text-muted-foreground">
                该教程模块暂未上线。
              </div>
            )}
          </div>
        </main>
        </div>
      </div>
    </div>
  );
}

