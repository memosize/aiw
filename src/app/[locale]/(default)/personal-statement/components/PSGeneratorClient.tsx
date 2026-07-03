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
import { PSProvider, usePS } from "./PSContext";
import PSIcon from "./icons/PSIcon";
import { apiRequest } from "@/lib/api-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function PSForm() {
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
  } = usePS();

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
        body: JSON.stringify({ function_type: "personal-statement" }),
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
          document_type: "personal_statement",
          title: `Personal Statement - ${(formData.target || "申请目标").substring(0, 100)}${formData.target && formData.target.length > 100 ? "..." : ""}`,
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

      router.push(`/${locale}/personal-statement/result/${document.uuid}?${resultParams.toString()}`);
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
            <PSIcon className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">个人陈述撰写</h1>
        <p className="text-muted-foreground text-lg">
          专业的 Personal Statement 撰写服务，展现您的独特背景和学术热情
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
            placeholder="例如：申请麻省理工学院数据科学硕士项目，专注于医疗健康领域的机器学习应用..."
            className="min-h-[100px] bg-white dark:bg-white"
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
            className="bg-white dark:bg-white"
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
            placeholder="例如：北京大学计算机科学与技术本科，GPA 3.85/4.0，主修课程包括数据结构、算法、机器学习..."
            className="min-h-[120px] bg-white dark:bg-white"
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
            placeholder="例如：编程语言：Python、R、SQL；数据科学工具：pandas、scikit-learn、TensorFlow..."
            className="min-h-[100px] bg-white dark:bg-white"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBar className="w-5 h-5 text-primary" />
            研究经历
          </CardTitle>
          <CardDescription>
            科研项目、论文发表、学术成果等
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.research}
            onChange={(e) => updateField("research", e.target.value)}
            placeholder="例如：在 PKU 人工智能实验室担任研究助理，开发医学图像分析的机器学习模型..."
            className="min-h-[120px] bg-white dark:bg-white"
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
            实习、兼职、全职工作经历
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.workExperience}
            onChange={(e) => updateField("workExperience", e.target.value)}
            placeholder="例如：腾讯医疗健康部数据科学实习生，构建疾病进展分析的预测模型..."
            className="min-h-[120px] bg-white dark:bg-white"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            申请理由
          </CardTitle>
          <CardDescription>
            为什么选择这个项目，您的动机和目标
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.reason}
            onChange={(e) => updateField("reason", e.target.value)}
            placeholder="例如：我对利用 AI 解决医疗挑战充满热情，因为我亲眼目睹了技术差距如何影响农村地区的患者护理..."
            className="min-h-[120px] bg-white dark:bg-white"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Globe className="w-4 h-4" />
                生成语言
              </span>
              <Select
                value={generationState.languagePreference}
                onValueChange={(value: "English" | "Chinese") => setLanguagePreference(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Chinese">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !canGenerate()}
              size="lg"
              className="min-w-[150px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  生成个人陈述
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {!canGenerate() && (
            <p className="text-sm text-muted-foreground mt-2 text-right">
              请至少填写申请目标和教育背景
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PSGeneratorClient() {
  return (
    <PSProvider>
      <PSForm />
    </PSProvider>
  );
}
