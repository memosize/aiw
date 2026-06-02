"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AITextarea } from "@/components/ui/ai-textarea";
import { Textarea } from "@/components/ui/textarea";
import { useResume, SkillsLanguageData } from "../ResumeContext";
import { useResumeAI } from "@/hooks/useResumeAI";

export default function SkillsLanguageModule() {
  const { data, updateSkillsLanguageData, isEditMode } = useResume();
  const formData = data.skillsLanguage;
  const { generateContent, isGenerating } = useResumeAI();

  const handleInputChange = (field: keyof SkillsLanguageData, value: string) => {
    updateSkillsLanguageData({ [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        
        <p className="text-sm text-muted-foreground leading-relaxed">
          请使用英文填写技能和语言信息。技能名称、软件工具、语言名称和熟练程度建议直接输入英文，确保生成后的英文简历格式统一。如技能较多，AI 可帮助整理分类和优化展示。
        </p>
      </div>
      
      <div className="p-4 xl:p-6 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border-0 space-y-4">
        {/* 专业技能 */}
        <div className="space-y-2">
          <Label htmlFor="skills" className="text-xs font-medium text-foreground">
            技能 <span className="text-destructive">*</span>
          </Label>
          {isEditMode ? (
            <Textarea
              id="skills"
              placeholder="例如：Python, SQL, Excel, Power BI"
              value={formData.skills}
              onChange={(e) => handleInputChange("skills", e.target.value)}
              className="min-h-[80px] resize-none text-xs"
              rows={3}
            />
          ) : (
            <AITextarea
              id="skills"
              placeholder="例如：Python, SQL, Excel, Power BI"
              value={formData.skills}
              onChange={(e) => handleInputChange("skills", e.target.value)}
              className="min-h-[80px] resize-none text-xs"
              rows={3}
              aiGenerating={isGenerating}
              showLanguageHint
              onAIGenerate={async () => {
                // Type 1: Skills Language - Skills
                // Pass entire resume JSON for better context
                const context = data;
                const generatedContent = await generateContent(context, 1);
                if (generatedContent) {
                  handleInputChange("skills", generatedContent);
                }
              }}
            />
          )}
          <p className="text-[10px] text-muted-foreground">请列出编程语言、软件工具、专业技能等，用逗号分隔</p>
        </div>

        {/* 语言能力 */}
        <div className="space-y-3">
          <div className="border-t border-border pt-4">
            <h4 className="text-xs font-semibold text-foreground mb-3">语言能力</h4>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="english_level" className="text-xs font-medium text-foreground">
                英语能力 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="english_level"
                type="text"
                placeholder="例如：IELTS 6.5, TOEFL 95, CET-6"
                value={formData.english_level}
                onChange={(e) => handleInputChange("english_level", e.target.value)}
                className="h-10 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">请填写考试成绩或水平描述</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="native_language" className="text-xs font-medium text-foreground">
                母语 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="native_language"
                type="text"
                placeholder="例如：Chinese, English"
                value={formData.native_language}
                onChange={(e) => handleInputChange("native_language", e.target.value)}
                className="h-10 text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="other_languages" className="text-xs font-medium text-foreground">
              其他语言（可选）
            </Label>
            <Input
              id="other_languages"
              type="text"
              placeholder="例如：Japanese - Basic, French - Intermediate"
              value={formData.other_languages}
              onChange={(e) => handleInputChange("other_languages", e.target.value)}
              className="h-10 text-xs"
            />
            <p className="text-[10px] text-muted-foreground">请标注语言名称和熟练程度，用逗号分隔多种语言</p>
          </div>
        </div>

      </div>

      {/* 帮助信息 */}
      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4">
        <h4 className="font-semibold text-blue-800 dark:text-blue-200 text-xs mb-2">💡 填写指南</h4>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <h5 className="font-medium text-blue-700 dark:text-blue-300 text-[10px] mb-1">技能建议：</h5>
            <ul className="text-[10px] text-blue-600 dark:text-blue-400 space-y-0.5">
              <li>• 编程语言：Python, Java, C++, JavaScript</li>
              <li>• 数据分析：Excel, SPSS, R, Tableau, Power BI</li>
              <li>• 专业软件：AutoCAD, Photoshop, Figma</li>
              <li>• 框架工具：React, Django, Git, Docker</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-blue-700 dark:text-blue-300 text-[10px] mb-1">语言水平：</h5>
            <ul className="text-[10px] text-blue-600 dark:text-blue-400 space-y-0.5">
              <li>• 英语考试：IELTS, TOEFL, CET, GRE</li>
              <li>• 水平描述：Native, Fluent, Advanced</li>
              <li>• 其他语言：Basic, Intermediate, Conversational</li>
              <li>• 多语种格式：Japanese – Basic, German – Intermediate</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 
