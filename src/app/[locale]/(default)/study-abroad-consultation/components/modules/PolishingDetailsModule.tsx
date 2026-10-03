"use client";

import { useStudyAbroad } from "../StudyAbroadContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import {
  Upload,
  FileText,
  Mail,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function PolishingDetailsModule() {
  const { data, updatePolishingDetails } = useStudyAbroad();
  const [polishingQrUrl, setPolishingQrUrl] = useState(
    "/imgs/wechat-qr-placeholder.svg"
  );
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/site-settings?key=polishing_wechat_qr_url")
      .then((res: Response) => res.json())
      .then((result: any) => {
        if (result.code === 0 && result.data?.value) {
          setPolishingQrUrl(result.data.value);
        }
      })
      .catch(() => {});
  }, []);

  const polishingDetails = data.polishingDetails || {
    document_type: "",
    uploaded_document_name: "",
    uploaded_document_url: "",
    polishing_requirements: "",
    return_method: "",
    return_email: "",
    return_wechat: "",
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("仅支持 PDF、DOCX 或 TXT 格式文件");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("文件大小不能超过 10MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/document", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "文件上传失败");
      }

      const result = await response.json();

      updatePolishingDetails({
        uploaded_document_name: file.name,
        uploaded_document_url: result.url,
      });

      toast.success("文件上传成功");
    } catch (error) {
      console.error("Error uploading file:", error);
      const errorMessage =
        error instanceof Error ? error.message : "文件上传失败，请重试";
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleReturnMethodChange = (value: string) => {
    updatePolishingDetails({
      return_method: value as "email" | "wechat",
      ...(value === "email" ? { return_wechat: "" } : { return_email: "" }),
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <Label className="mb-4 block">
          <div className="mb-2 flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span>文件类型 *</span>
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            请选择需要人工润色的文件类型，后续支付金额会随之变化
          </span>
        </Label>

        <RadioGroup
          value={polishingDetails.document_type}
          onValueChange={(value) =>
            updatePolishingDetails({
              document_type: value as "resume" | "ps_sop",
            })
          }
          className="space-y-3"
        >
          <label
            htmlFor="document-type-resume"
            className="flex cursor-pointer items-start justify-between rounded-lg border border-border p-4 transition-colors hover:border-primary/50"
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem value="resume" id="document-type-resume" className="mt-1" />
              <div>
                <p className="font-medium text-foreground">简历</p>
                <p className="text-sm text-muted-foreground">适用于 Resume / CV 人工润色</p>
              </div>
            </div>
            <span className="text-base font-semibold text-primary">¥399</span>
          </label>

          <label
            htmlFor="document-type-ps-sop"
            className="flex cursor-pointer items-start justify-between rounded-lg border border-border p-4 transition-colors hover:border-primary/50"
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem value="ps_sop" id="document-type-ps-sop" className="mt-1" />
              <div>
                <p className="font-medium text-foreground">PS / SOP</p>
                <p className="text-sm text-muted-foreground">适用于 Personal Statement 或 SOP 人工润色</p>
              </div>
            </div>
            <span className="text-base font-semibold text-primary">¥699</span>
          </label>
        </RadioGroup>
      </Card>

      <div className="space-y-2">
        <h3 className="text-lg font-medium text-foreground">文档上传</h3>
        <p className="text-sm text-muted-foreground">
          请上传需要润色的文档（支持 PDF、DOCX、TXT 格式，最大 10MB）
        </p>
      </div>

      <Card className="p-6">
        <Label htmlFor="document-upload" className="mb-4 block">
          <div className="mb-2 flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span>上传文档 *</span>
          </div>
        </Label>

        <div className="cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50">
          <input
            id="document-upload"
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          <label htmlFor="document-upload" className="cursor-pointer">
            {polishingDetails.uploaded_document_name ? (
              <div className="flex items-center justify-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-foreground">
                    {polishingDetails.uploaded_document_name}
                  </p>
                  <p className="text-sm text-muted-foreground">点击重新上传</p>
                </div>
              </div>
            ) : (
              <div>
                <FileText className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {uploading ? "上传中..." : "点击选择文件或拖拽文件到此处"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  支持 PDF、DOCX、TXT 格式，最大 10MB
                </p>
              </div>
            )}
          </label>
        </div>
      </Card>

      <Card className="p-6">
        <Label htmlFor="polishing-requirements" className="mb-4 block">
          <div className="mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>润色要求 *</span>
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            请详细说明您的润色需求，如：语法检查、表达优化、风格调整等
          </span>
        </Label>
        <Textarea
          id="polishing-requirements"
          placeholder="例如：希望老师重点关注语法错误和表达流畅度，特别是第二段关于研究经历的部分需要重点润色..."
          value={polishingDetails.polishing_requirements}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            updatePolishingDetails({ polishing_requirements: e.target.value })
          }
          rows={5}
          className="resize-none"
        />
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label className="mb-4 block">
              <div className="mb-2 flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span>返还方式 *</span>
              </div>
              <span className="text-sm font-normal text-muted-foreground">
                请选择您希望接收润色后文档的方式
              </span>
            </Label>
          </div>

          <RadioGroup
            value={polishingDetails.return_method}
            onValueChange={handleReturnMethodChange}
            className="space-y-4"
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="email" id="return-email" className="mt-1" />
              <div className="flex-1">
                <Label
                  htmlFor="return-email"
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  <span className="font-medium">通过邮件返还</span>
                </Label>
                {polishingDetails.return_method === "email" && (
                  <div className="mt-3">
                    <Input
                      type="email"
                      placeholder="请输入您的邮箱地址"
                      value={polishingDetails.return_email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updatePolishingDetails({ return_email: e.target.value })
                      }
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <RadioGroupItem value="wechat" id="return-wechat" className="mt-1" />
              <div className="flex-1">
                <Label
                  htmlFor="return-wechat"
                  className="flex cursor-pointer items-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="font-medium">通过微信返还</span>
                </Label>
                {polishingDetails.return_method === "wechat" && (
                  <div className="mt-3 space-y-3">
                    <Input
                      type="text"
                      placeholder="请输入您的微信号"
                      value={polishingDetails.return_wechat}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updatePolishingDetails({ return_wechat: e.target.value })
                      }
                      className="w-full"
                    />

                    <div className="rounded-lg bg-muted/30 p-4">
                      <p className="mb-3 text-sm text-muted-foreground">
                        请扫描下方二维码添加客服微信，润色完成后我们将通过微信发送给您
                      </p>
                      <div className="flex justify-center">
                        <div className="rounded-lg bg-white p-4 shadow-sm">
                          <img
                            src={polishingQrUrl}
                            alt="WeChat QR Code"
                            width={200}
                            height={200}
                            className="rounded"
                          />
                          <p className="mt-2 text-center text-xs text-muted-foreground">
                            扫码添加客服微信
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>
        </div>
      </Card>

      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="mb-1 font-medium">温馨提示</p>
          <ul className="list-inside list-disc space-y-1">
            <li>人工润色需一定处理时间，每份材料通常需要5–7个工作日完成。</li>
            <li>我们的老师均为英语母语专业人士</li>
            <li>润色完成后会通过您选择的方式第一时间通知您</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
