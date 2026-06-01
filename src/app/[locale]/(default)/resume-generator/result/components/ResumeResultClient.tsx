"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import "./resume-result.css";
import {
  CheckCircle,
  Square,
  CheckSquare,
  Download,
  FileText,
  Edit3,
  Layout,
  ChevronDown,
  GripVertical,
  ArrowRight,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Save,
  Check,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { exportMultiPagePDF } from "@/lib/paged-resume-pdf-export";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportResumeDocx } from "@/lib/resume-docx-export";

// Import context and modules
import { ResumeProvider, useResume } from "../../components/ResumeContext";
import HeaderModule from "../../components/modules/HeaderModule";
import EducationModule from "../../components/modules/EducationModule";
import WorkExperienceModule from "../../components/modules/WorkExperienceModule";
import ResearchModule from "../../components/modules/ResearchModule";
import ActivitiesModule from "../../components/modules/ActivitiesModule";
import AwardsModule from "../../components/modules/AwardsModule";
import SkillsLanguageModule from "../../components/modules/SkillsLanguageModule";
import { CompactThemeColorPicker } from "../../components/templates/shared/CompactThemeColorPicker";
import {
  getThemeColor,
  getThemeFromScale,
  getColorFromScale,
} from "../../components/templates/shared/theme-colors";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// Import SVG icons
import HeaderIcon from "../../components/icons/HeaderIcon";
import EducationIcon from "../../components/icons/EducationIcon";
import WorkExperienceIcon from "../../components/icons/WorkExperienceIcon";
import ResearchIcon from "../../components/icons/ResearchIcon";
import ActivitiesIcon from "../../components/icons/ActivitiesIcon";
import AwardsIcon from "../../components/icons/AwardsIcon";
import SkillsLanguageIcon from "../../components/icons/SkillsLanguageIcon";

// Import template system
import { mapToStandardFormat } from "@/lib/resume-field-mapping";
import { KakunaTemplate } from "../../components/templates/kakuna";
import { DittoTemplate } from "../../components/templates/ditto";
import { TemplateSelector } from "../../components/TemplateSelector";
import { useAutoSaveResume } from "@/hooks/useAutoSaveResume";

// layoutConfiguration 中的名称 → StandardResumeData section key 映射
const SECTION_KEY_MAP: Record<string, string> = {
  'workExperience': 'experience',
  'education': 'education',
  'research': 'projects',
  'activities': 'activities',
  'awards': 'awards',
  'skillsLanguage': 'skills',
};

const normalizeSidebarSections = (sidebarSections: string[]) =>
  Array.from(
    new Set(
      sidebarSections.map((moduleId) =>
        moduleId === "languages" ? "skills" : moduleId
      )
    )
  ).filter((moduleId) => moduleId !== "profiles" && moduleId !== "certifications");

export interface ResumeModule {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
}

const FloatingTip = ({
  icon: Icon,
  message,
  description,
  onClose,
  className,
  arrowClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
  description?: string;
  onClose: () => void;
  className: string;
  arrowClassName: string;
}) => {
  return (
    <div
      className={`absolute z-[80] max-w-[240px] rounded-2xl border border-primary/15 bg-white/98 px-3 py-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-sm ${className}`}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-2 pr-5">
        <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium leading-5 text-foreground">
            {message}
          </p>
          {description ? (
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div
        className={`absolute h-4 w-4 rotate-45 border-primary/15 bg-white/98 ${arrowClassName}`}
      />
    </div>
  );
};

// 可拖拽的模块组件
const DraggableModuleItem = ({
  moduleId,
  title,
  area,
  index,
  onMoveToMain,
  onMoveToSidebar,
  onReorder,
}: {
  moduleId: string;
  title: string;
  area: "main" | "sidebar";
  index: number;
  onMoveToMain: (moduleId: string, targetIndex?: number) => void;
  onMoveToSidebar: (moduleId: string, targetIndex?: number) => void;
  onReorder: (
    dragIndex: number,
    hoverIndex: number,
    area: "main" | "sidebar"
  ) => void;
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: "module",
    item: { id: moduleId, area, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "module",
    hover: (
      item: { id: string; area: "main" | "sidebar"; index: number },
      monitor
    ) => {
      if (!monitor.isOver({ shallow: true })) {
        return;
      }

      // 如果是同一个元素，不处理
      if (item.id === moduleId) {
        return;
      }

      // 六个板块列表中仅处理同区域排序，避免跨区域拖拽时状态回退
      if (item.area !== area) {
        return;
      }

      // 同一区域内重新排序
      if (item.area === area && item.index !== index) {
        onReorder(item.index, index, area);
        item.index = index;
      }
    },
  });

  const targetArea = area === "main" ? "sidebar" : "main";
  const handleMove = () => {
    if (area === "main") {
      onMoveToSidebar(moduleId);
    } else {
      onMoveToMain(moduleId);
    }
  };

  return (
    <div
      ref={(node) => {
        drag(drop(node));
      }}
      className={`
        flex items-center justify-between p-2 xl:p-2.5 bg-white rounded-lg border shadow-sm
        cursor-move transition-all duration-200 hover:shadow-md
        ${isDragging ? "opacity-50" : "opacity-100"}
        ${
          area === "main"
            ? "border-blue-200 bg-blue-50"
            : "border-green-200 bg-green-50"
        }
      `}
    >
      <div className="flex items-center gap-1.5 xl:gap-2">
        <GripVertical className="w-3 h-3 xl:w-4 xl:h-4 text-gray-400" />
        <span className="text-xs xl:text-sm font-medium text-gray-700">
          {title}
        </span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleMove}
        className="p-0.5 xl:p-1 h-5 w-5 xl:h-6 xl:w-6"
        title={`移动到 ${targetArea === "main" ? "主要区域" : "侧边栏"}`}
      >
        {area === "main" ? (
          <ArrowRight className="w-2.5 h-2.5 xl:w-3 xl:h-3" />
        ) : (
          <ArrowLeft className="w-2.5 h-2.5 xl:w-3 xl:h-3" />
        )}
      </Button>
    </div>
  );
};

// 获取模板组件
const getTemplateComponent = (templateName: string) => {
  switch (templateName) {
    case "kakuna":
      return KakunaTemplate;
    case "ditto":
      return DittoTemplate;
    case "gengar":
      return KakunaTemplate; // 暂时使用Kakuna模板，待GengarTemplate开发完成后替换
    default:
      return DittoTemplate; // 默认使用 Ditto 模板
  }
};

function ResumeResultContent() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState("header");
  const [zoomLevel, setZoomLevel] = useState(1); // Will be calculated dynamically
  const [defaultZoom, setDefaultZoom] = useState(1); // Store the calculated default
  const [isExporting, setIsExporting] = useState(false); // PDF导出状态
  const [showContentTip, setShowContentTip] = useState(true);
  const [showExportTip, setShowExportTip] = useState(true);
  const [showLayoutTip, setShowLayoutTip] = useState(true);
  const resumeContainerRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isModuleSelected,
    isModuleRequired,
    toggleModuleSelection,
    updateSelectedTemplate,
    updateThemeColor,
    moveModuleToMain,
    moveModuleToSidebar,
    reorderMainSections,
    reorderSidebarSections,
    documentState,
  } = useResume();

  // Use auto-save hook
  const { isSaving, lastSavedAt, saveError } = useAutoSaveResume();

  // 使用 context 中的模板选择，而不是本地 state
  const selectedTemplate = data.selectedTemplate;
  const standardResumeData = useMemo(
    () => mapToStandardFormat(data, selectedTemplate),
    [data, selectedTemplate]
  );

  const themePalette = useMemo(() => {
    const themeKey = data.themeColor || "sky-500";
    return themeKey.includes("-")
      ? getThemeFromScale(themeKey)
      : getThemeColor(themeKey);
  }, [data.themeColor]);

  const effectiveLayoutConfiguration = useMemo(
    () => ({
      ...data.layoutConfiguration,
      sidebarSections: normalizeSidebarSections(data.layoutConfiguration.sidebarSections),
    }),
    [data.layoutConfiguration]
  );

  // 计算适合屏幕的默认缩放比例
  const calculateDefaultZoom = () => {
    if (!resumeContainerRef.current) return 1;

    const container = resumeContainerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // A4 paper dimensions in pixels at 96 DPI
    const a4Width = 794; // 210mm at 96 DPI
    const a4Height = 1123; // 297mm at 96 DPI

    // Calculate zoom to fit width with some padding
    const paddingFactor = 0.9; // 90% of container width
    const zoomToFitWidth = (containerWidth * paddingFactor) / a4Width;
    const zoomToFitHeight = (containerHeight * paddingFactor) / a4Height;

    // Use the smaller zoom to ensure it fits both width and height
    let calculatedZoom = Math.min(zoomToFitWidth, zoomToFitHeight);

    // Clamp between min and max zoom levels
    calculatedZoom = Math.max(0.5, Math.min(2, calculatedZoom));

    return calculatedZoom;
  };

  // Set initial zoom based on screen size
  useEffect(() => {
    // Small delay to ensure container is fully rendered
    setTimeout(() => {
      const initialZoom = calculateDefaultZoom();
      setDefaultZoom(initialZoom);
      setZoomLevel(initialZoom);
    }, 100);
  }, []);

  // Update zoom when window resizes
  useEffect(() => {
    const handleResize = () => {
      const newDefaultZoom = calculateDefaultZoom();
      setDefaultZoom(newDefaultZoom);
      // Optionally update current zoom to match new default
      // setZoomLevel(newDefaultZoom);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const container = resumeContainerRef.current;
    if (!container) return;

    const handleNativeWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }

      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel((prev) => Math.max(0.5, Math.min(2, prev + delta)));
    };

    container.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleNativeWheel);
    };
  }, []);

  // 获取模块显示名称
    const getSectionDisplayName = (moduleId: string): string => {
      const sectionNames: { [key: string]: string } = {
        experience: "工作经历",
        education: "教育背景",
        research: "研究项目",
        activities: "课外活动",
        profiles: "个人资料",
        skills: "语言技能",
        certifications: "证书",
        awards: "获奖情况",
      };
      return sectionNames[moduleId] || moduleId;
    };

  type LayoutPanelItem = {
    moduleId: string;
    area: "main" | "sidebar";
    index: number;
  };

  const managedMainSectionIds = new Set([
    "education",
    "experience",
    "research",
    "activities",
  ]);

  const managedSidebarSectionIds = new Set([
      "skills",
      "awards",
    ]);

    const normalizedSidebarSectionIds = effectiveLayoutConfiguration.sidebarSections;

    const mainLayoutItems: LayoutPanelItem[] =
      effectiveLayoutConfiguration.mainSections
        .filter((moduleId) => managedMainSectionIds.has(moduleId))
      .map((moduleId, index) => ({
        moduleId,
        area: "main" as const,
        index,
      }));

    const sidebarLayoutItems: LayoutPanelItem[] =
      normalizedSidebarSectionIds
        .filter((moduleId) => managedSidebarSectionIds.has(moduleId))
        .map((moduleId) => ({
          moduleId,
          area: "sidebar" as const,
          index: effectiveLayoutConfiguration.sidebarSections.indexOf(moduleId),
        }));

  const layoutPanelItems: LayoutPanelItem[] = [
    ...mainLayoutItems,
    ...sidebarLayoutItems,
  ];

  // 处理重新排序
  const handleReorder = (
    dragIndex: number,
    hoverIndex: number,
    area: "main" | "sidebar"
  ) => {
    if (area === "main") {
      const newMainSections = [...effectiveLayoutConfiguration.mainSections];
      const draggedItem = newMainSections.splice(dragIndex, 1)[0];
      newMainSections.splice(hoverIndex, 0, draggedItem);
      reorderMainSections(newMainSections);
    } else {
      const newSidebarSections = [...effectiveLayoutConfiguration.sidebarSections];
      const draggedItem = newSidebarSections.splice(dragIndex, 1)[0];
      newSidebarSections.splice(hoverIndex, 0, draggedItem);
      reorderSidebarSections(newSidebarSections);
    }
  };

  // 缩放控制函数
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 2)); // Max zoom 200%
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.5)); // Min zoom 50%
  };

  const handleZoomReset = () => {
    setZoomLevel(defaultZoom); // Reset to calculated default
  };

  // 可用模板选项
  const templateOptions = [
    {
      value: "kakuna",
      label: "Kakuna",
      subtitle: "留学申研",
      description: "简洁现代的单栏布局，适合大多数职业应用",
      color: "from-blue-500 to-purple-600",
      image: "/imgs/templates/kakuna.jpg",
    },
    {
      value: "ditto",
      label: "Ditto",
      subtitle: "求职简历",
      description: "专业的双栏侧边栏布局，信息层次清晰",
      color: "from-emerald-500 to-teal-600",
      image: "/imgs/templates/ditto.jpg",
    },
    // {
    //   value: "gengar",
    //   label: "Gengar",
    //   subtitle: "创意设计",
    //   description: "独特的创意布局，适合设计类职业",
    //   color: "from-purple-500 to-pink-600",
    //   image: "/imgs/templates/gengar.jpg"
    // }
  ];

  const modules: ResumeModule[] = [
    {
      id: "template",
      title: "选择模板",
      icon: Layout,
      component: TemplateSelector,
    },
    {
      id: "header",
      title: "个人背景",
      icon: HeaderIcon,
      component: HeaderModule,
    },
    {
      id: "education",
      title: "教育经历",
      icon: EducationIcon,
      component: EducationModule,
    },
    {
      id: "workExperience",
      title: "实习/工作经历",
      icon: WorkExperienceIcon,
      component: WorkExperienceModule,
    },
    {
      id: "research",
      title: "学术研究兴趣",
      icon: ResearchIcon,
      component: ResearchModule,
    },
    {
      id: "activities",
      title: "课外活动",
      icon: ActivitiesIcon,
      component: ActivitiesModule,
    },
    {
      id: "awards",
      title: "获奖情况",
      icon: AwardsIcon,
      component: AwardsModule,
    },
    {
      id: "skillsLanguage",
      title: "技能语言",
      icon: SkillsLanguageIcon,
      component: SkillsLanguageModule,
    },
  ];

  const editableModules = modules.slice(1); // Exclude template selector
  const currentModule = editableModules.find((m) => m.id === activeTab);
  const ActiveComponent = currentModule?.component || HeaderModule;

  // oklch颜色转换为rgb的函数
  const convertOklchToRgb = (oklchStr: string): string => {
    // 解析oklch值
    const match = oklchStr.match(/oklch\(([^)]+)\)/);
    if (!match) return oklchStr;

    const values = match[1].split(/\s+/).map((v) => parseFloat(v));
    if (values.length < 3) return oklchStr;

    const [l, c, h] = values;

    // 简化的oklch到rgb转换（近似值）
    // 这是一个简化的转换，对于PDF导出已经足够
    const lightness = l * 100;
    const chroma = c * 100;
    const hue = h || 0;

    // 转换为HSL然后到RGB
    const hsl_h = hue;
    const hsl_s = Math.min(100, chroma * 2);
    const hsl_l = lightness;

    // HSL到RGB转换
    const hslToRgb = (h: number, s: number, l: number) => {
      h /= 360;
      s /= 100;
      l /= 100;

      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      let r, g, b;

      if (s === 0) {
        r = g = b = l;
      } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }

      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    };

    const [r, g, b] = hslToRgb(hsl_h, hsl_s, hsl_l);
    return `rgb(${r}, ${g}, ${b})`;
  };

  // oklab颜色转换为rgb的函数
  const convertOklabToRgb = (oklabStr: string): string => {
    // 解析oklab值
    const match = oklabStr.match(/oklab\(([^)]+)\)/);
    if (!match) return oklabStr;

    const values = match[1].split(/\s+/).map((v) => parseFloat(v));
    if (values.length < 3) return oklabStr;

    const [l, a, bValue] = values;

    // 简化的oklab到rgb转换（近似值）
    // 这是一个简化的转换，对于PDF导出已经足够
    const lightness = l * 100;

    // 将a和b值转换为色相和饱和度
    const chroma = Math.sqrt(a * a + bValue * bValue) * 100;
    const hue = (Math.atan2(bValue, a) * 180) / Math.PI;
    const normalizedHue = hue < 0 ? hue + 360 : hue;

    // 转换为HSL然后到RGB
    const hsl_h = normalizedHue;
    const hsl_s = Math.min(100, chroma * 2);
    const hsl_l = lightness;

    // HSL到RGB转换
    const hslToRgb = (h: number, s: number, l: number) => {
      h /= 360;
      s /= 100;
      l /= 100;

      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      let r, g, b;

      if (s === 0) {
        r = g = b = l;
      } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }

      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    };

    const [r, g, b] = hslToRgb(hsl_h, hsl_s, hsl_l);
    return `rgb(${r}, ${g}, ${b})`;
  };

  // 临时替换oklch和oklab颜色的函数
  const replaceModernColors = (element: HTMLElement) => {
    const originalStyles: Array<{
      element: HTMLElement;
      property: string;
      value: string;
    }> = [];

    const processElement = (el: HTMLElement) => {
      const computedStyle = window.getComputedStyle(el);
      const styleProperties = [
        "color",
        "backgroundColor",
        "borderColor",
        "borderTopColor",
        "borderRightColor",
        "borderBottomColor",
        "borderLeftColor",
        "boxShadow",
        "textShadow",
        "fill",
        "stroke",
      ];

      styleProperties.forEach((prop) => {
        const value = computedStyle.getPropertyValue(prop);
        console.log("🚀 ~ processElement ~ value:", value);

        if (value && (value.includes("oklch(") || value.includes("oklab("))) {
          let convertedValue = value;

          // 替换oklch颜色
          convertedValue = convertedValue.replace(
            /oklch\([^)]+\)/g,
            (match) => {
              return convertOklchToRgb(match);
            }
          );

          // 替换oklab颜色
          convertedValue = convertedValue.replace(
            /oklab\([^)]+\)/g,
            (match) => {
              return convertOklabToRgb(match);
            }
          );

          originalStyles.push({
            element: el,
            property: prop,
            value: (el.style as any)[prop] || "",
          });

          (el.style as any)[prop] = convertedValue;
        }
      });

      // 处理CSS变量
      const rootStyles = getComputedStyle(document.documentElement);
      const cssVars = Array.from(document.styleSheets)
        .flatMap((sheet) => {
          try {
            return Array.from(sheet.cssRules);
          } catch {
            return [];
          }
        })
        .filter((rule) => rule.type === CSSRule.STYLE_RULE)
        .flatMap((rule) => Array.from((rule as CSSStyleRule).style))
        .filter((prop) => prop.startsWith("--"));

      cssVars.forEach((varName) => {
        const value = rootStyles.getPropertyValue(varName);
        if (value && (value.includes("oklch(") || value.includes("oklab("))) {
          let convertedValue = value.trim();

          // 替换oklch颜色
          convertedValue = convertedValue.replace(
            /oklch\([^)]+\)/g,
            (match) => {
              return convertOklchToRgb(match);
            }
          );

          // 替换oklab颜色
          convertedValue = convertedValue.replace(
            /oklab\([^)]+\)/g,
            (match) => {
              return convertOklabToRgb(match);
            }
          );

          document.documentElement.style.setProperty(varName, convertedValue);
        }
      });
    };

    // 处理当前元素及其所有子元素
    processElement(element);
    const allElements = element.querySelectorAll("*");
    allElements.forEach((el) => processElement(el as HTMLElement));

    return originalStyles;
  };

  // 恢复原始样式的函数
  const restoreOriginalStyles = (
    originalStyles: Array<{
      element: HTMLElement;
      property: string;
      value: string;
    }>
  ) => {
    originalStyles.forEach(({ element, property, value }) => {
      if (value) {
        (element.style as any)[property] = value;
      } else {
        (element.style as any)[property] = "";
      }
    });

    // 恢复CSS变量（重新加载原始样式）
    const rootElement = document.documentElement;
    const originalVars = Array.from(document.styleSheets)
      .flatMap((sheet) => {
        try {
          return Array.from(sheet.cssRules);
        } catch {
          return [];
        }
      })
      .filter(
        (rule) =>
          rule.type === CSSRule.STYLE_RULE &&
          (rule as CSSStyleRule).selectorText === ":root"
      )
      .flatMap((rule) => Array.from((rule as CSSStyleRule).style))
      .filter((prop) => prop.startsWith("--"));

    // 清除临时设置的CSS变量
    originalVars.forEach((varName) => {
      rootElement.style.removeProperty(varName);
    });
  };

  // 导出简历
  const exportResume = async (format: "pdf" | "docx") => {
    if (isExporting) return;

    const baseFilename = `简历_${new Date()
      .toLocaleDateString("zh-CN")
      .replace(/\//g, "-")}`;
    const toastId = format === "pdf" ? "pdf-export" : "docx-export";

    setIsExporting(true);

    try {
      const resumeContainer = document.getElementById("resume-container");
      if (!resumeContainer) {
        toast.error("未找到简历内容，请确保简历已正确加载");
        return;
      }

      if (format === "pdf") {
        await exportMultiPagePDF("resume-container", {
          filename: `${baseFilename}.pdf`,
          quality: 0.95,
          scale: 2,
          margin: 10,
        });
      } else {
        toast.loading("正在生成 Word 文件，请稍候...", {
          id: toastId,
        });

        // 将 layoutConfiguration 的模块名映射为 StandardResumeData 的 section key
        const mainLayoutOrder = effectiveLayoutConfiguration.mainSections.map(
          (section: string) => SECTION_KEY_MAP[section] || section
        );
        const sidebarLayoutOrder = effectiveLayoutConfiguration.sidebarSections.map(
          (section: string) => SECTION_KEY_MAP[section] || section
        );
        const layoutOrder = [...mainLayoutOrder, ...sidebarLayoutOrder];

        await exportResumeDocx(standardResumeData, {
          filename: `${baseFilename}.docx`,
          themePrimary: themePalette.primary,
          layoutOrder,
          mainLayoutOrder,
          sidebarLayoutOrder,
        });

        toast.success("Word 导出成功！您可以继续在本地修改该文件。", {
          id: toastId,
        });
      }
    } catch (error) {
      console.error("简历导出失败:", error);
      toast.error(
        `导出失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`,
        { id: toastId }
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
        {/* Header */}
        <div className="bg-background/80 backdrop-blur-sm border-b">
          <div className="w-full max-w-none px-8 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    简历模板预览
                  </h1>
                  <p className="text-muted-foreground text-base">
                    编辑内容并预览您的简历模板
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Save Status Indicator */}
                {documentState.documentUuid && (
                  <div className="flex items-center gap-2">
                    {isSaving ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Save className="w-4 h-4 animate-pulse" />
                        <span>保存中...</span>
                      </div>
                    ) : saveError ? (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        <span>保存失败</span>
                      </div>
                    ) : lastSavedAt ? (
                      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <Check className="w-4 h-4" />
                        <span>
                          已保存{" "}
                          {new Date(lastSavedAt).toLocaleTimeString("zh-CN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ) : null}
                  </div>
                )}

                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  模板预览
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-none py-3 relative">
          {/* Scroll indicator for mobile/tablet */}
          <div className="xl:hidden absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-primary/10 backdrop-blur-sm rounded-full p-2 animate-pulse">
            <ArrowRight className="w-5 h-5 text-primary" />
          </div>

          <div className="overflow-x-auto px-4 md:px-6 custom-scrollbar">
            <div className="flex flex-col xl:flex-row gap-3 xl:gap-4 min-h-[calc(100vh-150px)] min-w-[1300px] xl:min-w-0">
              {/* Left Column - Module Navigation Tabs */}
              <div
                className={`relative z-[70] w-full flex-shrink-0 overflow-visible xl:w-64 2xl:w-72 ${
                  showContentTip ? "pt-16 xl:pt-[4.5rem]" : ""
                }`}
              >
                {showContentTip && (
                  <FloatingTip
                    icon={Edit3}
                    message="选择并编辑内容"
                    description="勾选需要展示的模块，并在编辑区填写或修改内容。"
                    onClose={() => setShowContentTip(false)}
                    className="left-4 top-0"
                    arrowClassName="-bottom-2 left-7 border-b border-r"
                  />
                )}
                <div className="bg-card/70 backdrop-blur-sm rounded-2xl p-3 xl:p-4 2xl:p-6 shadow-sm h-full xl:h-full min-h-[300px]">
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="font-semibold text-xs xl:text-sm text-muted-foreground uppercase tracking-wide">
                      内容模块
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4 xl:mb-6">
                    勾选需要在简历上呈现的部分
                  </p>
                  <div className="flex xl:flex-col gap-2 xl:gap-3 overflow-x-auto xl:overflow-x-visible xl:overflow-y-auto">
                    {modules.slice(1).map((module) => {
                      // Skip template selector module
                      const Icon = module.icon;
                      // Map module IDs to context keys
                      const moduleKey =
                        module.id === "workExperience"
                          ? "workExperience"
                          : module.id === "skillsLanguage"
                          ? "skillsLanguage"
                          : module.id;
                      const isSelected = isModuleSelected(moduleKey as any);
                      const isRequired = isModuleRequired(moduleKey as any);

                      return (
                        <div key={module.id} className="group relative">
                          <button
                            className={`w-full flex items-center gap-2 xl:gap-3 2xl:gap-4 p-3 xl:p-3 2xl:p-4 rounded-lg xl:rounded-xl transition-all duration-200 relative ${
                              activeTab === module.id
                                ? "bg-primary text-primary-foreground shadow-lg"
                                : isSelected
                                ? "bg-primary/10 text-primary hover:bg-primary/20"
                                : "hover:bg-muted/50 text-foreground"
                            }`}
                            onClick={() => setActiveTab(module.id)}
                          >
                            <Icon className="w-4 h-4 xl:w-4 xl:h-4 2xl:w-5 2xl:h-5 flex-shrink-0" />
                            <div className="flex-1 text-left">
                              <div className="font-medium text-xs xl:text-sm">
                                {module.title}
                              </div>
                              {isRequired && (
                                <div className="text-xs text-red-500 font-medium"></div>
                              )}
                            </div>

                            {/* 集成的选择按钮 */}
                            <div
                              role="checkbox"
                              aria-checked={isSelected}
                              aria-disabled={isRequired}
                              className={`p-1 xl:p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                                isRequired
                                  ? "bg-gray-100 text-red-300 cursor-not-allowed"
                                  : isSelected
                                  ? "bg-primary text-primary-foreground shadow-sm hover:scale-110"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:scale-110"
                              } ${
                                activeTab === module.id && !isRequired
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : ""
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isRequired) {
                                  toggleModuleSelection(moduleKey as any);
                                }
                              }}
                              title={
                                isRequired
                                  ? "此模块为必选，无法取消"
                                  : undefined
                              }
                            >
                              {isSelected ? (
                                <CheckSquare className="w-3 h-3 xl:w-4 xl:h-4" />
                              ) : (
                                <Square className="w-3 h-3 xl:w-4 xl:h-4" />
                              )}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Middle Column - Module Editing + Resume Preview */}
              <div className="w-full xl:flex-1 flex flex-col xl:flex-row gap-3 xl:gap-4">
                {/* Module Editing Area */}
                <div className="w-full xl:w-[360px] 2xl:w-[420px] flex-shrink-0">
                  <div className="bg-card/70 backdrop-blur-sm rounded-2xl shadow-sm h-full flex flex-col min-h-[600px]">
                    {/* Active Module Content */}
                    <div className="flex-1 p-3 xl:p-4 2xl:p-5 overflow-y-auto overflow-x-hidden">
                      <div className="w-full">
                        <div className="flex items-center gap-2 xl:gap-3 mb-3 xl:mb-4">
                          {currentModule ? (
                            <>
                              <currentModule.icon className="w-4 h-4 xl:w-5 xl:h-5 text-primary" />
                              <h3 className="text-base xl:text-lg font-semibold text-foreground">
                                {currentModule.title}
                              </h3>
                            </>
                          ) : (
                            <>
                              <Edit3 className="w-4 h-4 xl:w-5 xl:h-5 text-primary" />
                              <h3 className="text-base xl:text-lg font-semibold text-foreground">
                                选择模块进行编辑
                              </h3>
                            </>
                          )}
                        </div>
                        <div className="text-xs w-full">
                          <ActiveComponent />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resume Preview Area */}
                <div
                  className={`relative z-[60] w-full flex-shrink-0 overflow-visible xl:w-[480px] 2xl:flex-1 ${
                    showExportTip ? "pt-14 xl:pt-16" : ""
                  }`}
                >
                  {showExportTip && (
                    <FloatingTip
                      icon={Download}
                      message="支持导出 Word"
                      description="下载后也可继续修改"
                      onClose={() => setShowExportTip(false)}
                      className="right-0 top-0"
                      arrowClassName="-bottom-2 right-7 border-b border-r"
                    />
                  )}
                  <div className="bg-card/70 backdrop-blur-sm rounded-2xl shadow-sm h-full flex flex-col min-h-[600px]">
                    {/* Preview Header */}
                    <div className="relative overflow-visible border-b border-border p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="w-3 h-3 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">
                              简历预览
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {(() => {
                                const currentTemplate = templateOptions.find(
                                  (t) => t.value === selectedTemplate
                                );
                                return `当前模板: ${

                                  currentTemplate?.subtitle || "未选择"
                                }`;
                              })()}
                            </p>
                          </div>
                        </div>
                        <div className="relative flex items-center gap-2">
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isExporting}
                                className="bg-white/80 border-white/20 shadow-sm hover:bg-white hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isExporting ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <Download className="w-3 h-3 mr-1" />
                                )}
                                {isExporting ? "导出中..." : "导出"}
                                <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
                              </Button>
                            </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            sideOffset={8}
                            className="z-[140] w-44 bg-white shadow-xl"
                          >
                            <DropdownMenuLabel>选择导出格式</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => void exportResume("pdf")}
                              disabled={isExporting}
                              className="cursor-pointer"
                            >
                              <Download className="w-3 h-3 mr-2" />
                              PDF（推荐）
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => void exportResume("docx")}
                              disabled={isExporting}
                              className="cursor-pointer"
                            >
                              <FileText className="w-3 h-3 mr-2" />
                              Word (.docx)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>

                    {/* Preview Content */}
                    <div className="flex-1 p-1 relative">
                      <div
                        ref={resumeContainerRef}
                        className="w-full h-full overflow-y-auto overflow-x-hidden rounded-xl relative resume-scroll-container"
                        style={{
                          background:
                            "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
                        }}
                      >
                        {/* 背景装饰 */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 rounded-xl pointer-events-none"></div>
                        <div className="absolute top-4 left-4 w-16 h-16 bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                        <div className="absolute bottom-4 right-4 w-12 h-12 bg-secondary/10 rounded-full blur-2xl opacity-60 pointer-events-none"></div>

                        <div className="relative flex justify-center p-2">
                          {(() => {
                            const TemplateComponent =
                              getTemplateComponent(selectedTemplate);

                            return (
                              <div
                                id="resume-container"
                                className="transform-gpu origin-top transition-all duration-300 ease-out"
                                style={{
                                  transform: `scale(${zoomLevel})`,
                                  overflowWrap: "anywhere",
                                  wordBreak: "break-word",
                                  filter:
                                    "drop-shadow(0 25px 50px rgba(0, 0, 0, 0.15))",
                                  boxShadow: `
                                0 0 0 1px rgba(255, 255, 255, 0.8),
                                0 20px 40px -12px rgba(0, 0, 0, 0.25),
                                0 8px 16px -8px rgba(0, 0, 0, 0.3),
                                0 0 80px -20px rgba(59, 130, 246, 0.15)
                              `,
                                }}
                              >
                                <TemplateComponent
                                  resume={standardResumeData}
                                  themeColor={data.themeColor}
                                  layoutConfiguration={effectiveLayoutConfiguration}
                                />
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Zoom Controls Hint */}
                      <div className="absolute top-4 right-4">
                        <div className="text-[10px] text-muted-foreground bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm">
                          Ctrl + 滚轮缩放
                        </div>
                      </div>

                      {/* Zoom Controls Buttons */}
                      <div className="absolute bottom-4 right-4">
                        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-border p-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleZoomOut}
                            disabled={zoomLevel <= 0.5}
                            className="h-8 w-8 p-0"
                          >
                            <ZoomOut className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleZoomReset}
                            className="h-8 px-3 text-xs font-medium"
                          >
                            {Math.round(zoomLevel * 100)}%
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleZoomIn}
                            disabled={zoomLevel >= 2}
                            className="h-8 w-8 p-0"
                          >
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Template & Color Selection */}
              <div
                className="relative z-[70] w-full flex-shrink-0 overflow-visible xl:w-[280px] 2xl:w-[340px]"
              >
                <div className="bg-card/70 backdrop-blur-sm rounded-2xl shadow-sm h-full flex flex-col min-h-[500px]">
                  {/* Template Selection Section */}
                  <div className="border-b border-border p-3 xl:p-4 2xl:p-5">
                    <div className="flex items-center gap-2 xl:gap-3 mb-3 xl:mb-4">
                      <div className="w-5 h-5 xl:w-6 xl:h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Layout className="w-3 h-3 text-primary" />
                      </div>
                      <h3 className="text-xs xl:text-sm font-semibold text-foreground">
                        选择模板
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-2 xl:gap-3">
                      {templateOptions.map((template) => (
                        <div
                          key={template.value}
                          className={`relative group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-md ${
                            selectedTemplate === template.value
                              ? "ring-2 ring-primary ring-offset-1 ring-offset-background shadow-md"
                              : "hover:shadow-sm"
                          }`}
                          onClick={() => updateSelectedTemplate(template.value)}
                        >
                          {/* Template Preview */}
                          <div className="relative aspect-[3/4] bg-white">
                            <img
                              src={template.image}
                              alt={template.label}
                              className="w-full h-full object-cover object-top"
                            />

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            {/* Selected Badge */}
                            {selectedTemplate === template.value && (
                              <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                选中
                              </div>
                            )}
                          </div>

                          {/* Template Info */}
                          <div className="p-1.5 xl:p-2 bg-white border-t border-border">
                            <div className="flex items-center gap-1 xl:gap-2">
                              <div
                                className={`w-1.5 h-1.5 xl:w-2 xl:h-2 rounded-full bg-gradient-to-br ${template.color}`}
                              ></div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-xs xl:text-sm text-foreground">
                                  {template.label}
                                </h4>
                                <p className="text-[10px] xl:text-xs text-muted-foreground">
                                  {template.subtitle}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Layout Management Section */}
                  <div className="relative overflow-visible border-b border-border p-3 xl:p-4 2xl:p-5">
                    <div className="flex items-center gap-2 xl:gap-3 mb-3 xl:mb-4">
                      <div className="w-5 h-5 xl:w-6 xl:h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Layout className="w-3 h-3 text-primary" />
                      </div>
                      <h3 className="text-xs xl:text-sm font-semibold text-foreground">
                        布局管理
                      </h3>
                    </div>

                    <p className="text-xs text-muted-foreground mb-4 xl:mb-6">
                      您可以拖动模块调整布局顺序，以自定义简历结构。
                    </p>

                    <div className="space-y-4">
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-2 xl:mb-3">
                          <div className="w-2.5 h-2.5 xl:w-3 xl:h-3 rounded bg-blue-500"></div>
                          <h4 className="text-xs xl:text-sm font-medium text-foreground">
                            六个板块
                          </h4>
                          <span className="text-[10px] xl:text-xs text-muted-foreground">
                            ({layoutPanelItems.length}个模块)
                          </span>
                        </div>
                        {showLayoutTip && (
                          <FloatingTip
                            icon={GripVertical}
                            message="想换顺序？拖一下试试"
                            description="拖动模块即可调整简历里的展示顺序。"
                            onClose={() => setShowLayoutTip(false)}
                            className="top-[39px] right-0"
                            arrowClassName="left-5 -bottom-2 border-b border-r"
                          />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2 xl:mb-3">
                          <div className="w-2.5 h-2.5 xl:w-3 xl:h-3 rounded bg-blue-500"></div>
                          <h4 className="text-xs xl:text-sm font-medium text-foreground">
                            主内容区
                          </h4>
                        </div>
                        <div
                          className={`space-y-2 ${
                            showLayoutTip ? "pt-14 xl:pt-16" : ""
                          }`}
                        >
                          {mainLayoutItems.map((item) => (
                            <DraggableModuleItem
                              key={item.moduleId}
                              moduleId={item.moduleId}
                              title={getSectionDisplayName(item.moduleId)}
                              area={item.area}
                              index={item.index}
                              onMoveToMain={moveModuleToMain}
                              onMoveToSidebar={moveModuleToSidebar}
                              onReorder={handleReorder}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2 xl:mb-3">
                          <div className="w-2.5 h-2.5 xl:w-3 xl:h-3 rounded bg-green-500"></div>
                          <h4 className="text-xs xl:text-sm font-medium text-foreground">
                            侧边栏
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {sidebarLayoutItems.map((item) => (
                            <DraggableModuleItem
                              key={item.moduleId}
                              moduleId={item.moduleId}
                              title={getSectionDisplayName(item.moduleId)}
                              area={item.area}
                              index={item.index}
                              onMoveToMain={moveModuleToMain}
                              onMoveToSidebar={moveModuleToSidebar}
                              onReorder={handleReorder}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Color Selection Section */}
                  <div className="flex-1 p-3 xl:p-4 2xl:p-5 overflow-y-auto">
                    <div className="flex items-center gap-2 xl:gap-3 mb-3 xl:mb-4">
                      <div className="w-5 h-5 xl:w-6 xl:h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                        <div
                          className="w-2.5 h-2.5 xl:w-3 xl:h-3 rounded-full"
                          style={{
                            backgroundColor: data.themeColor.includes("-")
                              ? getColorFromScale(data.themeColor)
                              : getThemeColor(data.themeColor).primary,
                          }}
                        />
                      </div>
                      <h3 className="text-xs xl:text-sm font-semibold text-foreground">
                        主题颜色
                      </h3>
                    </div>

                    <CompactThemeColorPicker
                      currentTheme={data.themeColor}
                      onThemeChange={(color) => {
                        updateThemeColor(color);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}

export default function ResumeResultClient() {
  return <ResumeResultContent />;
}
