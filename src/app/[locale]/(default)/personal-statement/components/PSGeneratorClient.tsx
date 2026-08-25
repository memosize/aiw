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

const MAX_TEXT_FIELD_LENGTH = 250;

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
    if (data.target.length > MAX_TEXT_FIELD_LENGTH) {
      toast.error("申请目标不能超过 250 个字符");
      return;
    }

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
            language: generationState.languagePreference,
            quota_service_type: quotaData.data?.service_type || "ps_sop"
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
            请填写申请的学校、专业及希望发展的方向，建议 50–150 字。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Textarea
              value={data.target}
              onChange={(e) => updateField("target", e.target.value)}
              maxLength={MAX_TEXT_FIELD_LENGTH}
              placeholder="例如：我计划申请 The University of Hong Kong 的 Master of Science in Marketing，希望进一步学习消费者分析、市场策略和数字营销，并提升运用数据解决营销问题的能力..."
              className="min-h-[100px] bg-white dark:bg-white"
            />
            <p className="text-right text-xs text-muted-foreground">
              {data.target.length}/{MAX_TEXT_FIELD_LENGTH}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            生成字数
          </CardTitle>
          <CardDescription>
            多数学校文书要求为 500–800 字。篇幅过长时，内容处理时间及复杂度会相应增加，偶尔可能出现生成中断或内容不完整；如遇异常请联系客服补发次数
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="number"
            min="1"
            inputMode="numeric"
            value={data.count}
            onChange={(e) => updateField("count", e.target.value.replace(/[^\d]/g, ""))}
            placeholder="例如：600"
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
            请填写本科院校、专业、相关课程及与申请方向有关的学术背景，建议 100–150 字。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.education}
            onChange={(e) => updateField("education", e.target.value)}
            placeholder="例如：本科就读于多伦多大学统计学专业，学习过统计学、概率论、数据分析和经济学等课程，在课程学习和项目实践中逐渐对消费者分析和数据驱动的营销决策产生兴趣..."
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
            请填写与申请方向相关的技能、软件工具或分析能力，建议 30–80 字。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.skill}
            onChange={(e) => updateField("skill", e.target.value)}
            placeholder="例如：能够使用 Excel、Python 和 SPSS 进行数据整理和分析，也有问卷设计、消费者调研和数据可视化的相关经验..."
            className="min-h-[100px] bg-white dark:bg-white"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBar className="w-5 h-5 text-primary" />
            研究 / 项目经历
          </CardTitle>
          <CardDescription>
            请填写相关科研或项目经历，重点说明项目内容、你的任务、过程及收获，建议 100–250 字。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.research}
            onChange={(e) => updateField("research", e.target.value)}
            placeholder="例如：曾参与一个年轻消费者购买行为的课程项目，我主要负责设计问卷、收集和整理数据，并分析价格、品牌认知和社交媒体评价对购买意愿的影响，最后完成消费者分析报告。这个项目让我更加关注数据分析在营销决策中的实际应用..."
            className="min-h-[120px] bg-white dark:bg-white"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            工作 / 实习经历
          </CardTitle>
          <CardDescription>
            请填写相关工作或实习经历，包括主要职责、完成的工作及收获，建议 100–250 字。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.workExperience}
            onChange={(e) => updateField("workExperience", e.target.value)}
            placeholder="例如：曾在一家快消企业市场部门实习，参与新品推广和线上营销活动，主要负责整理销售数据、分析不同渠道的活动表现，并协助完成竞品调研和市场分析报告。这段经历让我更直观地理解了消费者洞察与营销策略之间的联系..."
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
            请说明为什么选择这所学校及该项目，可结合课程设置、项目特色、学习资源与你的兴趣或未来目标展开，建议 100–300 字。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.reason}
            onChange={(e) => updateField("reason", e.target.value)}
            placeholder="例如：我希望申请 The University of Hong Kong 的 Master of Science in Marketing，主要是因为该项目在消费者分析、数字营销和市场策略方面的课程设置与我的兴趣和职业方向高度契合。我希望进一步提升将数据分析应用于营销决策的能力，为未来从事品牌或市场分析相关工作做好准备..."
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
