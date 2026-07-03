"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResume } from "./ResumeContext";
import { ThemeColorPicker } from "./templates/shared/ThemeColorPicker";

export const TemplateSelector = () => {
  const { data, updateSelectedTemplate, updateThemeColor } = useResume();

  const templates = [
    {
      id: "kakuna",
      name: "Kakuna",
      description: "Clean and centered layout with clear section headers",
      preview: "Classic centered format for traditional applications",
    },
    {
      id: "ditto",
      name: "Ditto",
      description: "Modern sidebar layout with contact info and skills on the left",
      preview: "Professional two-column layout with sidebar emphasis",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-xl font-semibold text-foreground">选择简历模板</h3>
        <p className="text-muted-foreground">
          选择一个适合当前用途的模板。模板会自动套用你已经填写的简历内容。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {templates.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              data.selectedTemplate === template.id
                ? "bg-green-50 ring-2 ring-green-500 dark:bg-green-950/30"
                : "hover:border-green-300"
            }`}
            onClick={() => updateSelectedTemplate(template.id)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-lg">
                {template.name}
                {data.selectedTemplate === template.id ? (
                  <span className="text-sm text-green-600 dark:text-green-300">已选择</span>
                ) : null}
              </CardTitle>
              <CardDescription className="text-sm">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted p-3 text-center text-sm text-muted-foreground">
                {template.preview}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <ThemeColorPicker
          currentTheme={data.themeColor}
          onThemeChange={updateThemeColor}
        />
      </div>

      <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-950/25">
        <h4 className="mb-2 font-semibold text-blue-800 dark:text-blue-200">模板说明</h4>
        <div className="grid grid-cols-1 gap-4 text-sm text-blue-700 dark:text-blue-300 md:grid-cols-2">
          <div>
            <strong>Kakuna</strong>
            <ul className="mt-1 space-y-1">
              <li>适合传统、学术或申请场景</li>
              <li>结构清晰，阅读负担低</li>
              <li>更偏单栏、中心化呈现</li>
            </ul>
          </div>
          <div>
            <strong>Ditto</strong>
            <ul className="mt-1 space-y-1">
              <li>适合求职和信息密度更高的简历</li>
              <li>侧边栏更突出技能和联系方式</li>
              <li>整体更现代，适合双栏信息布局</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
