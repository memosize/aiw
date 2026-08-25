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
            请填写申请的学校、专业及希望重点学习或研究的方向，建议 50–150 字。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.target}
            onChange={(e) => updateField("target", e.target.value)}
            placeholder="例如：我计划申请 Columbia University 的 MS in Data Science，希望进一步学习机器学习、统计建模和大规模数据分析，并探索数据科学在医疗与公共政策中的实际应用。"
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
            请填写本科院校、专业、相关课程及与申请方向有关的学术准备，建议 100–150 字。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.education}
            onChange={(e) => updateField("education", e.target.value)}
            placeholder="例如：本科就读于浙江大学计算机科学与技术专业，学习过概率统计、数据库、算法设计、机器学习和数据挖掘等课程，并通过课程项目逐渐形成了对数据科学和智能分析的兴趣..."
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
            请填写与申请方向相关的技能、软件工具或研究方法，建议 30–80 字。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.skill}
            onChange={(e) => updateField("skill", e.target.value)}
            placeholder="例如：能够使用 Python、SQL 和 PyTorch 进行数据处理、模型训练与结果分析，也具备数据可视化、实验设计和基础统计分析经验..."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            研究 / 项目经历
          </CardTitle>
          <CardDescription>
            请填写与申请方向相关的科研或项目经历，重点说明项目内容、你的具体任务、使用的方法及主要收获，建议 100–250 字。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.research}
            onChange={(e) => updateField("research", e.target.value)}
            placeholder="例如：参与城市交通流量预测项目，我主要负责整理历史交通数据、构建特征并比较不同预测模型的表现，同时分析天气和时间因素对预测结果的影响。项目让我更深入地理解了数据质量、模型选择与实际应用效果之间的关系，也增强了我继续学习数据科学的兴趣。"
            className="min-h-[120px]"
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
            请填写与申请方向相关的工作或实习经历，包括岗位、主要职责、完成的工作及收获，建议 100–250 字。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.workExperience}
            onChange={(e) => updateField("workExperience", e.target.value)}
            placeholder="例如：曾在一家互联网公司的数据团队实习，参与用户行为分析和运营数据整理，主要负责清洗数据、制作分析报表并协助评估不同活动的效果。这段经历让我看到数据分析如何真正参与产品和运营决策，也让我意识到自己还需要进一步提升建模和数据解释能力..."
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
            请填写完成该项目后的学习或职业目标，可说明短期发展方向及长期希望解决的问题，建议 100–200 字。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.plan}
            onChange={(e) => updateField("plan", e.target.value)}
            placeholder="例如：毕业后希望先从事数据科学或数据分析相关工作，将统计建模和机器学习方法应用于真实业务问题；长期希望进一步参与以数据为基础的产品和决策研究，并逐步成长为能够连接技术分析与实际应用的数据专业人才..."
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
