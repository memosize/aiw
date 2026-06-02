"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AITextarea } from "@/components/ui/ai-textarea";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Plus, Trash2, Info } from "lucide-react";
import { useResume, EducationData } from "../ResumeContext";
import { useResumeAI } from "@/hooks/useResumeAI";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export default function EducationModule() {
  const { data, updateEducationData, addEducation, removeEducation, isEditMode } = useResume();
  const educations = data.education;
  const { generateContent, isGenerating } = useResumeAI();
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);

  const handleInputChange = (index: number, field: keyof EducationData, value: string) => {
    updateEducationData(index, { [field]: value });
  };

  const handleAdd = () => {
    addEducation();
  };

  const handleRemove = (index: number) => {
    if (educations.length > 1) {
      removeEducation(index);
    }
  };

  // 确保至少有一个教育经历条目
  useEffect(() => {
    if (educations.length === 0) {
      addEducation();
    }
  }, [educations.length, addEducation]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-muted-foreground text-xs">
            请使用英文填写教育背景信息。学校名称、城市、国家、学位和专业等固定信息需直接输入英文；相关课程请填写真实课程名称，可由 AI 优化为英文简历格式。
          </p>
        </div>
        <Button
          onClick={handleAdd}
          className="h-10 px-5 text-sm w-fit"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          添加教育经历
        </Button>
      </div>

      <div className="space-y-4">
        {educations.map((education, index) => (
          <div key={index} className="p-4 xl:p-6 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">
                教育经历 {index + 1}
              </h3>
              {educations.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemove(index)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {/* 学校名称 */}
              <div className="space-y-2">
                <Label htmlFor={`school_name_${index}`} className="text-xs font-medium text-foreground">
                  学校英文名 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`school_name_${index}`}
                  type="text"
                  placeholder="例如：Peking University"
                  value={education.school_name}
                  onChange={(e) => handleInputChange(index, "school_name", e.target.value)}
                  className="h-10 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">请填写学校的完整英文名称</p>
              </div>

              {/* 学校位置信息 */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`edu_city_${index}`} className="text-xs font-medium text-foreground">
                    城市 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`edu_city_${index}`}
                    type="text"
                    placeholder="例如：Beijing"
                    value={education.edu_city}
                    onChange={(e) => handleInputChange(index, "edu_city", e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`edu_country_${index}`} className="text-xs font-medium text-foreground">
                    国家 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`edu_country_${index}`}
                    type="text"
                    placeholder="例如：China"
                    value={education.edu_country}
                    onChange={(e) => handleInputChange(index, "edu_country", e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              {/* 学位信息 */}
              <div className="space-y-2">
                <Label htmlFor={`degree_${index}`} className="text-xs font-medium text-foreground">
                  学位 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`degree_${index}`}
                  type="text"
                  placeholder="例如：Bachelor of Arts in Psychology"
                  value={education.degree}
                  onChange={(e) => handleInputChange(index, "degree", e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              {/* 时间信息 */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`edu_start_date_${index}`} className="text-xs font-medium text-foreground">
                    入学时间 <span className="text-destructive">*</span>
                  </Label>
                  <DatePicker
                    id={`edu_start_date_${index}`}
                    value={education.edu_start_date}
                    onChange={(value) => handleInputChange(index, "edu_start_date", value)}
                    placeholder="例如：2022-09"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`edu_end_date_${index}`} className="text-xs font-medium text-foreground">
                    毕业时间（预计） <span className="text-destructive">*</span>
                  </Label>
                  <DatePicker
                    id={`edu_end_date_${index}`}
                    value={education.edu_end_date}
                    onChange={(value) => handleInputChange(index, "edu_end_date", value)}
                    placeholder="例如：2026-06"
                  />
                </div>
              </div>

              {/* GPA 信息 */}
              <div className="space-y-2">
                <Label htmlFor={`gpa_or_rank_${index}`} className="text-xs font-medium text-foreground">
                  GPA 或排名 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`gpa_or_rank_${index}`}
                  type="text"
                  placeholder="例如：3.8/4.0 or Top 10%"
                  value={education.gpa_or_rank}
                  onChange={(e) => handleInputChange(index, "gpa_or_rank", e.target.value)}
                  className="h-10 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">请填写 GPA 分数或年级排名百分比</p>
              </div>

              {/* 相关课程 */}
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor={`relevant_courses_${index}`} className="text-xs font-medium text-foreground">
                    相关课程（可选）
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground">
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-xs">
                          可在文本框中补充额外要求，点击 AI 生成按钮后，系统将根据您的要求和上方填写的学校、学位等信息自动生成相关课程建议。如不满意，可多次点击优化。
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {isEditMode ? (
                  <Textarea
                    id={`relevant_courses_${index}`}
                    placeholder="例如：Advanced Statistics, Research Methods, Cognitive Psychology"
                    value={education.relevant_courses}
                    onChange={(e) => handleInputChange(index, "relevant_courses", e.target.value)}
                    className="min-h-[80px] resize-none text-xs"
                    rows={3}
                  />
                ) : (
                  <AITextarea
                    id={`relevant_courses_${index}`}
                    placeholder="例如：Advanced Statistics, Research Methods, Cognitive Psychology"
                    value={education.relevant_courses}
                    onChange={(e) => handleInputChange(index, "relevant_courses", e.target.value)}
                    className="min-h-[80px] resize-none text-xs"
                    rows={3}
                    aiGenerating={isGenerating && generatingIndex === index}
                    showLanguageHint
                    onAIGenerate={async () => {
                      setGeneratingIndex(index);
                      // Type 0: Education - Relevant Courses
                      const context = { education };
                      const generatedContent = await generateContent(context, 0);
                      if (generatedContent) {
                        handleInputChange(index, "relevant_courses", generatedContent);
                      }
                      setGeneratingIndex(null);
                    }}
                    contextHint={`${education.degree} ${education.school_name}`}
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

