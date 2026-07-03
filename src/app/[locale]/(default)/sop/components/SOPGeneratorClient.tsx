"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  GraduationCap,
  Briefcase,
  Target,
  Lightbulb,
  ChartBar,
  Loader2,
  Globe,
  BookOpen,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { SOPProvider, useSOP } from "./SOPContext";
import SOPIcon from "./icons/SOPIcon";
import { apiRequest } from "@/lib/api-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function SOPForm() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale || "zh";

  const {
    data,
    updateField,
    clearCache,
    generationState,
    setGenerationLoading,
    setGenerationError,
    setLanguagePreference,
    canGenerate,
    saveToCache,
    getFormData
  } = useSOP();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!canGenerate()) {
      toast.error("请至少填写申请目标和教育背景");
      return;
    }

    setIsSubmitting(true);
    setGenerationLoading(true);
    setGenerationError(null);

    try {
      const quotaRes = await fetch("/api/user/deduct-quota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ function_type: "sop" }),
      });
      const quotaData = await quotaRes.json();
      if (quotaData.code !== 0) {
        toast.error(quotaData.message || "PS/SOP 次数不足，请先购买套餐");
        setIsSubmitting(false);
        setGenerationLoading(false);
        return;
      }

      saveToCache();

      const formData = getFormData();
      const { data: document } = await apiRequest("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_type: "sop",
          title: `SOP - ${(formData.target || "申请目标").substring(0, 100)}${formData.target && formData.target.length > 100 ? "..." : ""}`,
          form_data: {
            ...formData,
            language: generationState.languagePreference
          },
          language: generationState.languagePreference === "English" ? "en" : "zh"
        }),
      });

      if (!document) {
        throw new Error("Failed to create document");
      }

      const shouldOpenRevision =
        searchParams.get("intent") === "free-revision" ||
        searchParams.get("openRevision") === "true";
      const resultParams = new URLSearchParams({ autoGenerate: "true" });

      if (shouldOpenRevision) {
        resultParams.set("openRevision", "true");
      }

      router.push(`/${locale}/sop/result/${document.uuid}?${resultParams.toString()}`);
    } catch (error) {
      console.error("Error creating document:", error);
      toast.error("创建文档失败，请重试");
      setGenerationLoading(false);
      setGenerationError("创建文档失败");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-page-scale max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <SOPIcon className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">SOP 目的陈述撰写</h1>
        <p className="text-muted-foreground text-lg">
          专业的 Statement of Purpose 撰写服务，清晰表达您的学术目标和研究兴趣
        </p>
        <div className="mt-4">
          <Link href={`/${locale}/help`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <BookOpen className="w-4 h-4" />
              {locale === "zh" ? "查看教程" : "View Tutorial"}
            </Button>
          </Link>
        </div>

        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.confirm("确定要清空所有已填写的内容吗？此操作无法恢复。")) {
                clearCache();
                toast.success("已清空所有内容");
              }
            }}
            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 hover:border-destructive/50"
          >
            <Trash2 className="w-4 h-4" />
            一键清空
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            申请目标
          </CardTitle>
          <CardDescription>
            请描述您的申请目标，包括申请的学校、专业和学位
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.target}
            onChange={(e) => updateField("target", e.target.value)}
            placeholder="例如：申请哈佛大学计算机科学博士项目，专注于人工智能和机器学习研究..."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            生成字数
          </CardTitle>
          <CardDescription>
            填写希望生成的文档字数
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="number"
            min="1"
            inputMode="numeric"
            value={data.count}
            onChange={(e) => updateField("count", e.target.value.replace(/[^\d]/g, ""))}
            placeholder="例如：800"
            className="w-full"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            教育背景
          </CardTitle>
          <CardDescription>
            您的教育经历，包括学校、专业、GPA、相关课程等
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.education}
            onChange={(e) => updateField("education", e.target.value)}
            placeholder="例如：清华大学计算机科学与技术本科，GPA 3.8/4.0，主修课程包括算法设计、机器学习、深度学习..."
            className="min-h-[120px]"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            相关技能
          </CardTitle>
          <CardDescription>
            与申请目标相关的专业技能、编程语言、工具等
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.skill}
            onChange={(e) => updateField("skill", e.target.value)}
            placeholder="例如：熟练掌握 Python、TensorFlow、PyTorch，具备深度学习模型开发经验..."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            研究经历
          </CardTitle>
          <CardDescription>
            科研项目、实验室经历、论文发表等
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.research}
            onChange={(e) => updateField("research", e.target.value)}
            placeholder="例如：在 XX 教授的指导下，参与自然语言处理研究项目，负责模型设计和实验..."
            className="min-h-[120px]"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            工作经历
          </CardTitle>
          <CardDescription>
            实习或全职工作经历，特别是与申请领域相关的
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.workExperience}
            onChange={(e) => updateField("workExperience", e.target.value)}
            placeholder="例如：在 Google AI 研究院实习 3 个月，参与大语言模型优化项目..."
            className="min-h-[120px]"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBar className="w-5 h-5 text-primary" />
            未来规划
          </CardTitle>
          <CardDescription>
            您的职业目标和长期规划
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.plan}
            onChange={(e) => updateField("plan", e.target.value)}
            placeholder="例如：希望在博士期间深入研究强化学习在机器人控制中的应用..."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            生成语言 / Generation Language
          </CardTitle>
          <CardDescription>
            选择 SOP 的生成语言 / Choose the language for your SOP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={generationState.languagePreference}
            onValueChange={(value: "English" | "Chinese") => setLanguagePreference(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="English">English (英文)</SelectItem>
              <SelectItem value="Chinese">Chinese (中文)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="flex justify-center pt-6 pb-12">
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={!canGenerate() || isSubmitting}
          className="min-w-[200px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              生成 SOP
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function SOPGeneratorClient() {
  return (
    <SOPProvider>
      <SOPForm />
    </SOPProvider>
  );
}
