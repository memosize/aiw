"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useResume, ResearchData } from "../ResumeContext";
import { useResumeAI } from "@/hooks/useResumeAI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AITextarea } from "@/components/ui/ai-textarea";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";

export default function ResearchModule() {
  const { data, updateResearchData, addResearch, removeResearch, isEditMode } = useResume();
  const researchProjects = data.research;
  const { generateContent, isGenerating } = useResumeAI();
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [generatingField, setGeneratingField] = useState<string | null>(null);

  const handleInputChange = (index: number, field: keyof ResearchData, value: string) => {
    updateResearchData(index, { [field]: value });
  };

  const handleAdd = () => {
    addResearch();
  };

  const handleRemove = (index: number) => {
    if (researchProjects.length > 1) {
      removeResearch(index);
    }
  };

  useEffect(() => {
    if (researchProjects.length === 0) {
      addResearch();
    }
  }, [researchProjects.length, addResearch]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-xs text-muted-foreground">
            请使用英文填写科研项目中的固定信息，如项目名称、研究单位、城市和国家等。研究内容/贡献支持中文或英文填写，AI 将帮助整理为英文简历表述。
          </p>

        </div>
        <Button onClick={handleAdd} className="h-10 w-fit px-5 text-sm">
          <Plus className="mr-1.5 h-4 w-4" />
          添加科研项目
        </Button>
      </div>

      <div className="space-y-4">
        {researchProjects.map((project, index) => (
          <div
            key={index}
            className="rounded-xl border-0 bg-gradient-to-br from-primary/5 to-primary/10 p-4 xl:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                科研项目 {index + 1}
              </h3>
              {researchProjects.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemove(index)}
                  className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`project_title-${index}`} className="text-xs font-medium text-foreground">
                    项目名称 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`project_title-${index}`}
                    type="text"
                    placeholder="例如：Machine Learning for Image Recognition"
                    value={project.project_title}
                    onChange={(e) => handleInputChange(index, "project_title", e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`lab_or_unit-${index}`} className="text-xs font-medium text-foreground">
                    研究单位 / 实验室（可选）
                  </Label>
                  <Input
                    id={`lab_or_unit-${index}`}
                    type="text"
                    placeholder="例如：Artificial Intelligence Lab"
                    value={project.lab_or_unit}
                    onChange={(e) => handleInputChange(index, "lab_or_unit", e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`res_city-${index}`} className="text-xs font-medium text-foreground">
                    城市（可选）
                  </Label>
                  <Input
                    id={`res_city-${index}`}
                    type="text"
                    placeholder="例如：Beijing"
                    value={project.res_city}
                    onChange={(e) => handleInputChange(index, "res_city", e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`res_country-${index}`} className="text-xs font-medium text-foreground">
                    国家 / 地区（可选）
                  </Label>
                  <Input
                    id={`res_country-${index}`}
                    type="text"
                    placeholder="例如：China"
                    value={project.res_country}
                    onChange={(e) => handleInputChange(index, "res_country", e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`res_start_date-${index}`} className="text-xs font-medium text-foreground">
                    开始时间 <span className="text-destructive">*</span>
                  </Label>
                  <DatePicker
                    id={`res_start_date-${index}`}
                    value={project.res_start_date}
                    onChange={(value) => handleInputChange(index, "res_start_date", value)}
                    placeholder="例如：2024-09"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`res_end_date-${index}`} className="text-xs font-medium text-foreground">
                    结束时间 <span className="text-destructive">*</span>
                  </Label>
                  <DatePicker
                    id={`res_end_date-${index}`}
                    value={project.res_end_date}
                    onChange={(value) => handleInputChange(index, "res_end_date", value)}
                    placeholder="例如：2025-03"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    如果项目仍在进行中，可填写预计结束时间或当前时间
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`your_contributions-${index}`} className="text-xs font-medium text-foreground">
                  研究内容 / 贡献 <span className="text-destructive">*</span>
                </Label>
                {isEditMode ? (
                  <Textarea
                    id={`your_contributions-${index}`}
                    placeholder="例如：Developed a CNN model and improved accuracy by 12%, one bullet per line"
                    value={project.your_contributions}
                    onChange={(e) => handleInputChange(index, "your_contributions", e.target.value)}
                    className="min-h-[100px] resize-none text-xs"
                    rows={4}
                  />
                ) : (
                  <AITextarea
                    id={`your_contributions-${index}`}
                    placeholder="例如：Developed a CNN model and improved accuracy by 12%, one bullet per line"
                    value={project.your_contributions}
                    onChange={(e) => handleInputChange(index, "your_contributions", e.target.value)}
                    className="min-h-[100px] resize-none text-xs"
                    rows={4}
                    aiGenerating={
                      isGenerating &&
                      generatingIndex === index &&
                      generatingField === "contributions"
                    }
                    showLanguageHint
                    onAIGenerate={async () => {
                      setGeneratingIndex(index);
                      setGeneratingField("contributions");
                      const context = { research: [project] };
                      const generatedContent = await generateContent(context, 5);
                      if (generatedContent) {
                        handleInputChange(index, "your_contributions", generatedContent);
                      }
                      setGeneratingIndex(null);
                      setGeneratingField(null);
                    }}
                    contextHint={project.project_title}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`tools_used-${index}`} className="text-xs font-medium text-foreground">
                    使用工具 / 方法（可选）
                  </Label>
                  <Input
                    id={`tools_used-${index}`}
                    type="text"
                    placeholder="例如：Python, TensorFlow, OpenCV, MATLAB"
                    value={project.tools_used}
                    onChange={(e) => handleInputChange(index, "tools_used", e.target.value)}
                    className="h-10 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    可填写研究中使用的软件、编程语言、数据库或研究方法。
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
