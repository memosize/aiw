"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useResume, WorkExperienceData } from "../ResumeContext";
import { useResumeAI } from "@/hooks/useResumeAI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AITextarea } from "@/components/ui/ai-textarea";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";

export default function WorkExperienceModule() {
  const { data, updateWorkExperienceData, addWorkExperience, removeWorkExperience, isEditMode } =
    useResume();
  const workExperiences = data.workExperience;
  const { generateContent, isGenerating } = useResumeAI();
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);

  const handleInputChange = (index: number, field: keyof WorkExperienceData, value: string) => {
    updateWorkExperienceData(index, { [field]: value });
  };

  const handleAdd = () => {
    addWorkExperience();
  };

  const handleRemove = (index: number) => {
    if (workExperiences.length > 1) {
      removeWorkExperience(index);
    }
  };

  useEffect(() => {
    if (workExperiences.length === 0) {
      addWorkExperience();
    }
  }, [workExperiences.length, addWorkExperience]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-xs text-muted-foreground">
            请使用英文填写实习 / 工作经历中的固定信息，如公司名称、职位名称、城市和国家等。具体职责支持中文或英文填写，您可以先写清楚真实工作内容，AI 将帮助优化为正式英文简历。
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            英文简历中的城市 / 国家请直接输入英文，例如 Melbourne, Australia
          </p>
        </div>
        <Button onClick={handleAdd} className="h-10 w-fit px-5 text-sm">
          <Plus className="mr-1.5 h-4 w-4" />
          添加工作经历
        </Button>
      </div>

      <div className="space-y-4">
        {workExperiences.map((experience, index) => (
          <div
            key={index}
            className="rounded-xl border-0 bg-gradient-to-br from-primary/5 to-primary/10 p-4 xl:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                工作经历 {index + 1}
              </h3>
              {workExperiences.length > 1 && (
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
                  <Label htmlFor={`company-${index}`} className="text-xs font-medium text-foreground">
                    公司名称 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`company-${index}`}
                    type="text"
                    placeholder="例如：ByteDance Ltd."
                    value={experience.company}
                    onChange={(e) => handleInputChange(index, "company", e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`job_title-${index}`} className="text-xs font-medium text-foreground">
                    职位名称 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`job_title-${index}`}
                    type="text"
                    placeholder="例如：Software Engineer Intern"
                    value={experience.job_title}
                    onChange={(e) => handleInputChange(index, "job_title", e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`work_city-${index}`} className="text-xs font-medium text-foreground">
                    城市 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`work_city-${index}`}
                    type="text"
                    placeholder="例如：Shenzhen"
                    value={experience.work_city}
                    onChange={(e) => handleInputChange(index, "work_city", e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`work_country-${index}`} className="text-xs font-medium text-foreground">
                    国家 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`work_country-${index}`}
                    type="text"
                    placeholder="例如：China"
                    value={experience.work_country}
                    onChange={(e) => handleInputChange(index, "work_country", e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`work_start_date-${index}`} className="text-xs font-medium text-foreground">
                    起始时间 <span className="text-destructive">*</span>
                  </Label>
                  <DatePicker
                    id={`work_start_date-${index}`}
                    value={experience.work_start_date}
                    onChange={(value) => handleInputChange(index, "work_start_date", value)}
                    placeholder="例如：2024-06"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`work_end_date-${index}`} className="text-xs font-medium text-foreground">
                    结束时间 <span className="text-destructive">*</span>
                  </Label>
                  <DatePicker
                    id={`work_end_date-${index}`}
                    value={experience.work_end_date}
                    onChange={(value) => handleInputChange(index, "work_end_date", value)}
                    placeholder="例如：2024-08"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    如果仍在职，请填写预计离职时间或当前日期
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`responsibilities-${index}`} className="text-xs font-medium text-foreground">
                  具体职责 <span className="text-destructive">*</span>
                </Label>
                {isEditMode ? (
                  <Textarea
                    id={`responsibilities-${index}`}
                    placeholder="例如：Analyzed user data and built weekly dashboards, one bullet per line"
                    value={experience.responsibilities}
                    onChange={(e) => handleInputChange(index, "responsibilities", e.target.value)}
                    className="min-h-[100px] resize-none text-xs"
                    rows={4}
                  />
                ) : (
                  <AITextarea
                    id={`responsibilities-${index}`}
                    placeholder="例如：Analyzed user data and built weekly dashboards, one bullet per line"
                    value={experience.responsibilities}
                    onChange={(e) => handleInputChange(index, "responsibilities", e.target.value)}
                    className="min-h-[100px] resize-none text-xs"
                    showLanguageHint
                    rows={4}
                    aiGenerating={isGenerating && generatingIndex === index}
                    onAIGenerate={async () => {
                      setGeneratingIndex(index);
                      const context = { workExperience: [experience] };
                      const generatedContent = await generateContent(context, 2);
                      if (generatedContent) {
                        handleInputChange(index, "responsibilities", generatedContent);
                      }
                      setGeneratingIndex(null);
                    }}
                    contextHint={`${experience.company} ${experience.job_title}`}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
