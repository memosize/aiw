import React, { useEffect, useRef, useState } from "react";
import { StandardResumeData } from "@/lib/resume-field-mapping";
import { cn, isEmptyString } from "./shared/utils";
import { Rating } from "./shared/components";
import { getThemeColor, getThemeFromScale } from "./shared/theme-colors";

// Helper function to normalize bullet lines with proper indentation
const formatBulletPoints = (text: string): React.ReactNode => {
  if (!text) return null;
  const lines = text.split("\n");
  const bulletChar = "\u2022";

  return (
    <>
      {lines.map((line: string, index: number) => {
        const trimmedLine = line.trim();
        const isBullet =
          trimmedLine.startsWith("-") || trimmedLine.startsWith(bulletChar);

        if (isBullet) {
          const textContent = trimmedLine.replace(/^[-•]\s*/, "");
          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "flex-start",
              }}
            >
              <span style={{ flexShrink: 0, width: "16px" }}>{bulletChar}</span>
              <span>{textContent}</span>
            </div>
          );
        }

        return (
          <div key={index}>
            {line}
          </div>
        );
      })}
    </>
  );
};

const Header = ({
  resume,
  theme,
}: {
  resume: StandardResumeData;
  theme: any;
}) => {
  const { basics } = resume;

  return (
    <div>
      {/* Main header area */}
      <div
        className="relative flex items-center"
        style={{
          backgroundColor: theme.header,
          color: "#FFFFFF",
          height: "150px",
        }}
      >
        {/* Avatar positioned absolutely for the overlap effect */}
        {basics.picture?.url && !basics.picture?.effects?.hidden && (
          <div
            className="absolute z-10"
            style={{
              left: "80px",
              top: "50px",
              width: "150px",
              height: "150px",
            }}
          >
            <div
              style={{
                width: "150px",
                height: "150px",
                // borderRadius: "50%",
                backgroundImage: `url(${basics.picture.url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            />
          </div>
        )}

        <div
          className="flex items-center gap-1"
          style={{ marginLeft: basics.picture?.url && !basics.picture?.effects?.hidden ? "260px" : "80px" }}
        >
          {/* 姓名和标题，右侧为头像预留空间 */}
          <div className="flex-1 space-y-1">
            <h1
              className="text-5xl font-bold"
              style={{ fontSize: "48px", lineHeight: "1.6" }}
            >
              {basics.name}
            </h1>
          </div>
        </div>
      </div>

      {/* Contact information area beneath the divider */}
      <div
        className="bg-white"
        style={{
          padding: basics.picture?.url && !basics.picture?.effects?.hidden 
            ? "8px 20px 8px 260px" 
            : "8px 20px 8px 80px",
          borderTop: "1px solid #E0E0E0",
        }}
      >
        <div className="flex flex-wrap gap-x-6 gap-y-2 items-center justify-start text-sm">
          {/* 位置信息 */}
          {basics.location && (
            <div className="flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={theme.primary}
                className="inline-block"
              >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <p style={{ color: "#333333"}}>{basics.location}</p>
            </div>
          )}

          {/* 手机号 */}
          {basics.phone && (
            <div className="flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={theme.primary}
                className="inline-block"
              >
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
              <p style={{ color: "#333333" }}>{basics.phone}</p>
            </div>
          )}

          {/* Email */}
          {basics.email && (
            <div className="flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={theme.primary}
                className="inline-block"
              >
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
              <p style={{ color: "#333333" }}>{basics.email}</p>
            </div>
          )}

          {/* Website link */}
          {basics.url?.href && (
            <div className="flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={theme.primary}
                className="inline-block"
              >
                <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
              </svg>
              <p style={{ color: "#333333" }}>{basics.url.href}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({
  resume,
  theme,
  layoutConfiguration,
}: {
  resume: StandardResumeData;
  theme: any;
  layoutConfiguration?: { mainSections: string[]; sidebarSections: string[] };
}) => {
  const { basics, sections } = resume;

  // Resolve social icons and display names
  const getSocialIcon = (url: string, name: string) => {
    const lowerName = name.toLowerCase();
    const lowerUrl = url.toLowerCase();

    if (lowerName.includes("linkedin") || lowerUrl.includes("linkedin")) {
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="#0077B5"
          className="inline-block"
        >
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    }
    if (lowerName.includes("github") || lowerUrl.includes("github")) {
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="#000000"
          className="inline-block"
        >
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      );
    }
    return "馃敆";
  };

  const getSocialDisplayName = (url: string, name: string) => {
    const lowerName = name.toLowerCase();
    const lowerUrl = url.toLowerCase();

    if (lowerName.includes("linkedin") || lowerUrl.includes("linkedin")) {
      // Extract username (handle full URL or plain username input)
      let username = url;
      if (url.includes("linkedin.com")) {
        // Extract username part from URL - protocol is optional: (https?:\/\/)?
        username = url.replace(/(https?:\/\/)?(www\.)?linkedin\.com\/in\/?/i, "").replace(/\/$/, "");
      }
      return `linkedin.com/in/${username}`;
    }
    if (lowerName.includes("github") || lowerUrl.includes("github")) {
      let username = url;
      if (url.includes("github.com")) {
        // Protocol is optional: (https?:\/\/)?
        username = url.replace(/(https?:\/\/)?(www\.)?github\.com\/?/i, "").replace(/\/$/, "");
      }
      return `github.com/${username}`;
    }
    return name;
  };

  // Renderers for each sidebar section
  const renderSidebarContent = (sectionId: string) => {
    switch (sectionId) {
      case "profiles":
        return (
          basics.customFields?.length > 0 && (
            <div className="space-y-3">
              <h3
                className="font-extrabold"
                style={{
                  fontSize: "20px",
                  color: "#333333",
                  marginBottom: "4px",
                }}
              >
                Profiles
              </h3>
              <div className="space-y-2">
                {basics.customFields?.map((field) => (
                  <div key={field.id} style={{ fontSize: "14px" }}>
                    <div className="break-words" style={{ color: "#333333" }}>
                      {getSocialDisplayName(field.value, field.name)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        );
      case "skills": {
        const professionalText =
          sections.skills?.items
            ?.flatMap((skill) => {
              if (skill.keywords && skill.keywords.length > 0) {
                return skill.keywords;
              }
              if (skill.description) {
                return skill.description
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean);
              }
              return [];
            })
            .join(", ") ?? "";
        const languageItems = sections.languages?.items ?? [];
        const hasProfessional = sections.skills?.visible && professionalText.trim().length > 0;
        const hasLanguages = sections.languages?.visible && languageItems.length > 0;

        return (
          (hasProfessional || hasLanguages) && (
            <div className="space-y-3">
              <h3
                className="font-semibold"
                style={{
                  fontSize: "20px",
                  color: "#333333",
                  marginBottom: "6px",
                }}
              >
                SKILLS
              </h3>
              <div className="space-y-3">
                {hasProfessional && (
                  <div className="space-y-1">
                    <div className="font-medium" style={{ fontSize: "14px", color: "#333333" }}>
                      Professional
                    </div>
                    <div className="break-words" style={{ fontSize: "13px", color: theme.accent, lineHeight: "1.6" }}>
                      {professionalText}
                    </div>
                  </div>
                )}
                {hasLanguages && (
                  <div className="space-y-1">
                    <div className="font-medium" style={{ fontSize: "14px", color: "#333333" }}>
                      Languages
                    </div>
                    <div className="space-y-1">
                      {languageItems.map((item) => (
                        <div key={item.id} className="break-words" style={{ fontSize: "13px", color: "#333333" }}>
                          <span className="font-medium">{item.name}</span>
                          {item.description && <span>{`: ${item.description}`}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        );
      }
      case "certifications":
        return (
          sections.certifications?.visible &&
          sections.certifications?.items?.length > 0 && (
            <div className="space-y-3">
              <h3
                className="font-semibold"
                style={{
                  fontSize: "20px",
                  color: "#333333",
                  marginBottom: "6px",
                }}
              >
                Certifications
              </h3>
              <div className="space-y-2">
                {sections.certifications?.items?.map((item) => (
                  <div key={item.id} className="space-y-1">
                    <div
                      className="font-medium"
                      style={{ fontSize: "14px", color: "#333333" }}
                    >
                      {item.name}
                    </div>
                    <div style={{ fontSize: "13px", color: "#666666" }}>
                      {item.issuer}
                    </div>
                    <div style={{ fontSize: "13px", color: "#666666" }}>
                      {item.date}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        );
      case "awards":
        return (
          sections.awards?.visible &&
          sections.awards?.items?.length > 0 && (
            <div className="space-y-3">
              <h3
                className="font-semibold"
                style={{
                  fontSize: "20px",
                  color: "#333333",
                  marginBottom: "6px",
                }}
              >
                Awards
              </h3>
              <div className="space-y-2">
                {sections.awards?.items?.map((item) => (
                  <div key={item.id}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div
                          className="break-words font-bold"
                          style={{ fontSize: "14px", color: "#333333" }}
                        >
                          {item.title}
                        </div>
                        {item.awarder && (
                          <div className="break-words" style={{ fontSize: "13px", color: "#666666" }}>
                            {item.awarder}
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div
                          className="font-medium"
                          style={{ fontSize: "13px", color: "#333333" }}
                        >
                          {item.date}
                        </div>
                        {item.summary && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: theme.accent,
                              marginTop: "2px",
                            }}
                          >
                            {item.summary}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        );
      case "languages":
        return null;
      default:
        return null;
    }
  };

  // 使用布局配置或默认配置
  const sidebarSections = layoutConfiguration?.sidebarSections || [
    "profiles",
    "skills",
    "certifications",
    "awards",
    "languages",
  ];

  return (
    <div
      className="w-1/3 space-y-2"
      style={{ backgroundColor: "#FFFFFF", padding: "25px 20px 20px 20px" }}
    >
      {/* 鏍规嵁閰嶇疆娓叉煋渚ц竟鏍忓唴瀹?*/}
      {sidebarSections.map((sectionId) => (
        <div key={sectionId}>{renderSidebarContent(sectionId)}</div>
      ))}
    </div>
  );
};

const MainContent = ({
  resume,
  theme,
  layoutConfiguration,
}: {
  resume: StandardResumeData;
  theme: any;
  layoutConfiguration?: { mainSections: string[]; sidebarSections: string[] };
}) => {
  const { sections } = resume;

  const Section = ({
    section,
    children,
    title,
  }: {
    section: any;
    children: React.ReactNode;
    title?: string;
  }) => {
    if (!section?.visible || (section?.items && section?.items?.length === 0))
      return null;

    return (
      <section style={{ marginBottom: "4px", breakInside: "avoid" }}>
        <h3
          className="font-extrabold"
          style={{ fontSize: "20px", color: "#333333", marginBottom: "3px" }}
        >
          {title || section?.name}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {children}
        </div>
      </section>
    );
  };

  const renderProjectSection = (title: string) => {
    const projectsSection = sections.projects;

    return (
      <Section section={projectsSection} title={title}>
        {projectsSection?.items?.map((item) => (
          <div key={item.id} className="relative pl-4">
            {/* 标题部分的粗竖线 */}
            <div
              className="absolute left-0 top-0 w-1"
              style={{
                backgroundColor: theme.primary,
                height:
                  item.summary && !isEmptyString(item.summary)
                    ? item.keywords && item.keywords.length > 0
                      ? "82px"
                      : "52px"
                    : "100%",
              }}
            ></div>
            {/* Summary 部分的细竖线，相对粗线居中 */}
            {item.summary && !isEmptyString(item.summary) && (
              <div
                className="absolute"
                style={{
                  backgroundColor: theme.primary,
                  top:
                    item.keywords && item.keywords.length > 0
                      ? "82px"
                      : "52px",
                  bottom: "0",
                  left: "1.5px",
                  width: "1px",
                }}
              ></div>
            )}
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <div className="min-w-0 flex-1">
                      <div
                        className="break-words font-extrabold"
                        style={{ fontSize: "18px", color: "#333333" }}
                      >
                        {item.name}
                      </div>
                      {item.description && (
                        <div
                          className="break-words font-bold"
                          style={{ fontSize: "16px", color: "#333333" }}
                        >
                          {item.description}
                  </div>
                )}
              </div>
              <div className="whitespace-nowrap ml-4">
                <div
                  className="font-extrabold"
                  style={{ fontSize: "18px", color: "#333333" }}
                >
                  {item.date}
                </div>
                {item.location && (
                  <div
                    style={{ fontSize: "15px", color: "#333333" }}
                  >
                    {item.location}
                  </div>
                )}
              </div>
            </div>
            {item.keywords && item.keywords.length > 0 && (
              <div
                className="mb-2"
                style={{
                  fontSize: "13px",
                  color: theme.accent,
                  lineHeight: "1.6",
                }}
              >
                {item.keywords.map((keyword) => keyword.trim()).join(" • ")}
              </div>
            )}
            {item.summary && !isEmptyString(item.summary) && (
              <div
                style={{
                  fontSize: "14px",
                  color: "#333333",
                  lineHeight: "1.6",
                }}
              >
                {formatBulletPoints(item.summary || '')}
              </div>
            )}
          </div>
        ))}
      </Section>
    );
  };

  // 定义各个模块的渲染函数
  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case "experience":
        return (
          <Section section={sections.experience} title="Experience">
            {sections.experience?.items?.map((item) => (
              <div key={item.id} className="relative min-w-0 pl-4">
                {/* 标题部分的粗竖线 */}
                <div
                  className="absolute left-0 top-0 w-1"
                  style={{
                    backgroundColor: theme.primary,
                    height:
                      item.summary && !isEmptyString(item.summary)
                        ? "52px"
                        : "100%",
                  }}
                ></div>
                {/* Summary 部分的细竖线，相对粗线居中 */}
                {item.summary && !isEmptyString(item.summary) && (
                  <div
                    className="absolute"
                    style={{
                      backgroundColor: theme.primary,
                      top: "52px",
                      bottom: "0",
                      left: "1.5px",
                      width: "1px",
                    }}
                  ></div>
                )}
                <div className="flex justify-between items-start gap-4 mb-2">
                  <div className="min-w-0 flex-1">
                    <div
                      className="break-words font-extrabold"
                      style={{ fontSize: "18px", color: "#333333" }}
                    >
                      {item.position}
                    </div>
                    <div
                      className="break-words italic"
                      style={{ fontSize: "16px", color: "#333333" }}
                    >
                      {item.company}
                    </div>
                  </div>
                  <div className="whitespace-nowrap ml-4">
                    <div
                      className="font-extrabold"
                      style={{ fontSize: "18px", color: "#333333" }}
                    >
                      {item.date}
                    </div>
                    {item.location && (
                      <div
                        className="font-normal"
                        style={{ fontSize: "16px", color: "#333333" }}
                      >
                        {item.location}
                      </div>
                    )}
                  </div>
                </div>
                {item.summary && !isEmptyString(item.summary) && (
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#333333",
                      lineHeight: "1.6",
                    }}
                  >
                    <div className="break-words">{formatBulletPoints(item.summary || '')}</div>
                  </div>
                )}
              </div>
            ))}
          </Section>
        );
      case "education":
        return (
          <Section section={sections.education} title="Education">
            {sections.education?.items?.map((item) => (
              <div key={item.id} className="relative min-w-0 pl-4">
                {/* 标题部分的粗竖线 */}
                <div
                  className="absolute left-0 top-0 w-1"
                  style={{
                    backgroundColor: theme.primary,
                    height:
                      item.summary && !isEmptyString(item.summary)
                        ? item.courses && !isEmptyString(item.courses)
                          ? "82px"
                          : "52px"
                        : "100%",
                  }}
                ></div>
                {/* Summary 部分的细竖线，相对粗线居中 */}
                {item.summary && !isEmptyString(item.summary) && (
                  <div
                    className="absolute"
                    style={{
                      backgroundColor: theme.primary,
                      top:
                        item.courses && !isEmptyString(item.courses)
                          ? "82px"
                          : "52px",
                      bottom: "0",
                      left: "1.5px",
                      width: "1px",
                    }}
                  ></div>
                )}
                <div className="flex justify-between items-start gap-4 mb-2">
                  <div className="min-w-0 flex-1">
                    <div
                      className="break-words font-extrabold"
                      style={{ fontSize: "18px", color: "#333333" }}
                    >
                      {item.institution}
                    </div>
                    {item.location && (
                      <div
                        className="break-words font-bold"
                        style={{ fontSize: "16px", color: "#333333" }}
                      >
                        {item.location}
                      </div>
                    )}
                  </div>
                  <div className="whitespace-nowrap ml-4">
                    <div
                      className="font-extrabold"
                      style={{ fontSize: "18px", color: "#333333" }}
                    >
                      {item.date}
                    </div>
                    {item.area && (
                    <div
                      className="break-words font-normal"
                      style={{ fontSize: "16px", color: "#333333" }}
                    >
                        {item.area}
                      </div>
                    )}
                  </div>
                </div>
                {[
                  item.score
                    ? `GPA: ${/^\s*gpa\b/i.test(item.score) ? item.score.replace(/^\s*gpa\s*:?\s*/i, "") : item.score}`
                    : "",
                  item.summary ? `Honors: ${item.summary}` : "",
                  item.courses
                    ? `Relevant Coursework: ${item.courses.split(",").map((course) => course.trim()).join(", ")}`
                    : "",
                ]
                  .filter((line) => !isEmptyString(line))
                  .map((line, idx) => (
                    <div
                      key={idx}
                      className="mb-1 break-words"
                      style={{
                        fontSize: "13px",
                        color: idx === 2 ? theme.accent : "#333333",
                        lineHeight: "1.6",
                      }}
                    >
                      {`\u2022 ${line}`}
                    </div>
                  ))}
              </div>
            ))}
          </Section>
        );
      case "research":
        return renderProjectSection("Research Experience");
      case "projects":
        return renderProjectSection("Projects");
      case "activities":
        return (
          <Section section={sections.activities} title="Activities">
            {sections.activities?.items?.map((item) => (
              <div key={item.id} className="relative min-w-0 pl-4">
                {/* 标题部分的粗竖线 */}
                <div
                  className="absolute left-0 top-0 w-1"
                  style={{
                    backgroundColor: theme.primary,
                    height:
                      item.summary && !isEmptyString(item.summary)
                        ? "52px"
                        : "100%",
                  }}
                ></div>
                {/* Summary 部分的细竖线，相对粗线居中 */}
                {item.summary && !isEmptyString(item.summary) && (
                  <div
                    className="absolute"
                    style={{
                      backgroundColor: theme.primary,
                      top: "52px",
                      bottom: "0",
                      left: "1.5px",
                      width: "1px",
                    }}
                  ></div>
                )}
                <div className="flex justify-between items-start gap-4 mb-2">
                  <div className="min-w-0 flex-1">
                    <div
                      className="break-words font-extrabold"
                      style={{ fontSize: "18px", color: "#333333" }}
                    >
                      {item.role}
                    </div>
                    <div
                      className="break-words font-normal"
                      style={{ fontSize: "16px", color: "#333333" }}
                    >
                      {item.name}
                    </div>
                  </div>
                  <div className="whitespace-nowrap ml-4">
                    <div
                      className="font-extrabold"
                      style={{ fontSize: "18px", color: "#333333" }}
                    >
                      {item.date}
                    </div>
                    {item.location && (
                      <div
                        className="font-normal"
                        style={{ fontSize: "16px", color: "#333333" }}
                      >
                        {item.location}
                      </div>
                    )}
                  </div>
                </div>
                {item.summary && !isEmptyString(item.summary) && (
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#333333",
                      lineHeight: "1.6",
                    }}
                  >
                    <div className="break-words">{formatBulletPoints(item.summary || '')}</div>
                  </div>
                )}
              </div>
            ))}
          </Section>
        );
      default:
        return null;
    }
  };

  // 使用布局配置或默认配置
  const mainSections = layoutConfiguration?.mainSections || [
    "experience",
    "education",
    "research",
    "activities",
  ];

  return (
    <div className="w-2/3 bg-white" style={{ padding: "20px 30px 30px 0px" }}>
      <div className="space-y-0">
        {/* Render main content according to layout configuration */}
        {mainSections.map((sectionId) => (
          <div key={sectionId}>{renderSectionContent(sectionId)}</div>
        ))}
      </div>
    </div>
  );
};

export const DittoTemplate = ({
  resume,
  themeColor = "sky-500",
  layoutConfiguration,
}: {
  resume: StandardResumeData;
  themeColor?: string;
  layoutConfiguration?: { mainSections: string[]; sidebarSections: string[] };
}) => {
  // 判断是否是新的色阶格式（如 "blue-500"）或旧格式（如 "blue"）
  const theme = themeColor.includes("-")
    ? getThemeFromScale(themeColor)
    : getThemeColor(themeColor);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="mx-auto bg-white shadow-lg resume-content"
      style={{
        width: "210mm",
        minHeight: "297mm",
        fontSize: "14px",
        lineHeight: "1.6",
        color: "#333333",
        fontFamily: "Open Sans,serif",
        overflowWrap: "anywhere",
        wordBreak: "break-word",
      }}
    >
      <Header resume={resume} theme={theme} />
      <div className="flex">
        <Sidebar
          resume={resume}
          theme={theme}
          layoutConfiguration={layoutConfiguration}
        />
        <MainContent
          resume={resume}
          theme={theme}
          layoutConfiguration={layoutConfiguration}
        />
      </div>

      {/* CSS for page breaks and scrolling */}
      <style jsx global>{`
        @media print {
          .resume-page {
            page-break-after: always;
          }
          section {
            break-inside: avoid;
          }
        }

        /* Smooth scrolling for resume preview */
        .resume-scroll-container {
          scroll-behavior: smooth;
        }

        /* Ensure content flows naturally */
        .resume-content {
          overflow-wrap: anywhere;
          word-wrap: break-word;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
};


