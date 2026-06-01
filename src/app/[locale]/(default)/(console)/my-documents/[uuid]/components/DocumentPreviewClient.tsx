"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Copy,
  Download,
  Calendar,
  FileText,
  Loader2,
  AlertCircle,
  GitCompare,
  History,
  RotateCcw,
  ChevronDown
} from "lucide-react";
import { Document, DocumentType, VersionType } from "@/models/document";
import { getDocumentTypeDisplayName, formatDocumentDate } from "@/services/document";
import { toast } from "sonner";
import Markdown from "@/components/markdown";
import VersionComparison from "@/app/[locale]/(default)/recommendation-letter/components/VersionComparison";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportMarkdownToPDF } from "@/lib/paged-markdown-pdf-export";
import { exportSOPToTXT, exportSOPToDOCX } from "@/lib/sop-document-export";
import { exportSOPToPDF } from "@/lib/paged-sop-pdf-export";
import { exportCoverLetterToTXT, exportCoverLetterToDOCX } from "@/lib/cover-letter-document-export";
import { exportCoverLetterToPDF } from "@/lib/paged-cover-letter-pdf-export";
import { exportTextToDOCX } from "@/lib/text-document-export";
import { 
  RecommendationLetterIcon, 
  CoverLetterIcon, 
  PersonalStatementIcon, 
  ResumeIcon, 
  SOPIcon,
  StudyAbroadConsultationIcon,
  DocumentIcon 
} from "@/components/console/icons/DocumentIcons";

interface DocumentPreviewClientProps {
  documentUuid: string;
}

const getDocumentIcon = (type: DocumentType) => {
  const iconMap: Record<DocumentType, React.ComponentType<{ className?: string }>> = {
    [DocumentType.RecommendationLetter]: RecommendationLetterIcon,
    [DocumentType.Resume]: ResumeIcon,
    [DocumentType.CoverLetter]: CoverLetterIcon,
    [DocumentType.SOP]: SOPIcon,
    [DocumentType.PersonalStatement]: PersonalStatementIcon,
    [DocumentType.StudyAbroadConsultation]: StudyAbroadConsultationIcon,
  };
  
  return iconMap[type] || DocumentIcon;
};

export default function DocumentPreviewClient({ documentUuid }: DocumentPreviewClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 版本历史相关状态
  const [versions, setVersions] = useState<Document[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [showVersionComparison, setShowVersionComparison] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<Document | null>(null);
  const [restoringVersion, setRestoringVersion] = useState(false);

  useEffect(() => {
    fetchDocument();
  }, [documentUuid]);

  const fetchDocument = async () => {
    try {
      const response = await fetch(`/api/documents/${documentUuid}`);
      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }
      const data = await response.json();
      if (data.success) {
        setDocument(data.data);
        // 获取文档后，加载版本历史
        fetchVersions();
      } else {
        throw new Error(data.error || 'Failed to fetch document');
      }
    } catch (error) {
      console.error('Error fetching document:', error);
      setError('无法加载文档');
      toast.error("获取文档详情失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    setLoadingVersions(true);
    try {
      const response = await fetch(`/api/documents/${documentUuid}/versions`);
      if (!response.ok) {
        throw new Error('Failed to fetch versions');
      }
      const data = await response.json();
      if (data.success && data.data.versions) {
        setVersions(data.data.versions);
        // 设置当前版本为最新版本
        if (data.data.versions.length > 0) {
          const latestVersion = data.data.versions[data.data.versions.length - 1];
          setCurrentVersionId(latestVersion.uuid);
        }
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
      toast.error("获取版本历史失败");
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleCopy = async () => {
    if (!document?.content) return;
    
    try {
      await navigator.clipboard.writeText(document.content);
      toast.success("已复制到剪贴板");
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error("复制失败");
    }
  };

  const handleDownload = () => {
    if (!document) return;

    const element = window.document.createElement("a");
    const file = new Blob([document.content], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    element.download = `${document.title || '文档'}.md`;
    window.document.body.appendChild(element);
    element.click();
    window.document.body.removeChild(element);
    toast.success("下载成功");
  };

  const handleSOPExport = async (format: 'txt' | 'pdf' | 'docx') => {
    if (!document) return;

    // 从 form_data 中获取 target 信息
    let target = '';
    if (document.form_data) {
      try {
        const formData = typeof document.form_data === 'string'
          ? JSON.parse(document.form_data)
          : document.form_data;
        target = formData.target || '';
      } catch (e) {
        console.error('Failed to parse form_data:', e);
      }
    }

    // 检测语言（从内容判断）
    const content = document.content || '';
    const hasChineseChars = /[\u4e00-\u9fa5]/.test(content);
    const language = hasChineseChars ? 'zh' : 'en';

    const baseFilename = `sop-${target || document.title || 'document'}`;
    const exportOptions = {
      filename: `${baseFilename}.${format}`,
      title: language === 'zh' ? '个人陈述' : 'Statement of Purpose',
      target: target,
      language: language as 'en' | 'zh',
      includeDate: true
    };

    try {
      switch (format) {
        case 'txt':
          await exportSOPToTXT(content, exportOptions);
          break;
        case 'pdf':
          await exportSOPToPDF(content, exportOptions);
          break;
        case 'docx':
          await exportSOPToDOCX(content, exportOptions);
          break;
      }
    } catch (error) {
      console.error('导出失败:', error);
      toast.error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleCoverLetterExport = async (format: 'txt' | 'pdf' | 'docx') => {
    if (!document) return;

    // 从 form_data 中获取发件人和收件人信息
    let senderInfo = {
      full_name: '',
      address: undefined as string | undefined,
      email: '',
      phone: ''
    };
    let recipientInfo = {
      recruiter_name: undefined as string | undefined,
      recruiter_title: undefined as string | undefined,
      company_name: '',
      company_address: undefined as string | undefined
    };
    let date = '';

    if (document.form_data) {
      try {
        const formData = typeof document.form_data === 'string'
          ? JSON.parse(document.form_data)
          : document.form_data;

        // 发件人信息
        senderInfo.full_name = formData.full_name || '';
        senderInfo.email = formData.email || '';
        senderInfo.phone = formData.phone || '';

        // 收件人信息
        recipientInfo.recruiter_name = formData.recruiter_name || undefined;
        recipientInfo.company_name = formData.company_name || '';
        recipientInfo.company_address = formData.company_address || undefined;

        // 日期
        date = formData.date || '';
      } catch (e) {
        console.error('Failed to parse form_data:', e);
      }
    }

    // 检测语言（从内容判断）
    const content = document.content || '';
    const hasChineseChars = /[\u4e00-\u9fa5]/.test(content);
    const language = hasChineseChars ? 'zh' : 'en';

    const baseFilename = `cover-letter-${senderInfo.full_name || document.title || 'document'}`;
    const exportOptions = {
      filename: `${baseFilename}.${format}`,
      language: language as 'en' | 'zh',
      senderInfo,
      recipientInfo,
      date
    };

    try {
      switch (format) {
        case 'txt':
          await exportCoverLetterToTXT(content, exportOptions);
          break;
        case 'pdf':
          await exportCoverLetterToPDF(content, exportOptions);
          break;
        case 'docx':
          await exportCoverLetterToDOCX(content, exportOptions);
          break;
      }
    } catch (error) {
      console.error('导出失败:', error);
      toast.error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handlePersonalStatementExport = async (format: 'txt' | 'pdf' | 'docx') => {
    if (!document) return;

    const content = document.content || '';
    const hasChineseChars = /[\u4e00-\u9fa5]/.test(content);
    const language = hasChineseChars ? 'zh' : 'en';

    let target = '';
    if (document.form_data) {
      try {
        const formData = typeof document.form_data === 'string'
          ? JSON.parse(document.form_data)
          : document.form_data;
        target = formData.target || '';
      } catch (e) {
        console.error('Failed to parse form_data:', e);
      }
    }

    const baseFilename = `personal-statement-${target || document.title || 'document'}`;

    try {
      switch (format) {
        case 'txt': {
          const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const element = window.document.createElement("a");
          element.href = url;
          element.download = `${baseFilename}.txt`;
          window.document.body.appendChild(element);
          element.click();
          window.document.body.removeChild(element);
          URL.revokeObjectURL(url);
          toast.success("TXT 文件已导出");
          break;
        }
        case 'pdf':
          await exportMarkdownToPDF(content, {
            filename: `${baseFilename}.pdf`,
            title: 'Personal Statement',
            language,
            quality: 0.95,
            scale: 2,
            margin: 20
          });
          break;
        case 'docx':
          await exportTextToDOCX(content, {
            filename: `${baseFilename}.docx`,
            title: 'Personal Statement',
            language
          });
          break;
      }
    } catch (error) {
      console.error('导出失败:', error);
      toast.error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleVersionChange = (versionId: string) => {
    setCurrentVersionId(versionId);
    const selectedVersion = versions.find(v => v.uuid === versionId);
    if (selectedVersion) {
      setDocument(selectedVersion);
    }
  };

  const handleRestoreClick = () => {
    const currentVersion = versions.find(v => v.uuid === currentVersionId);
    if (currentVersion) {
      setVersionToRestore(currentVersion);
      setShowRestoreDialog(true);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!versionToRestore || !document) return;
    
    setRestoringVersion(true);
    try {
      const response = await fetch(`/api/documents/${document.parent_document_uuid || documentUuid}/revisions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: versionToRestore.content,
          revision_settings: {
            restored_from: versionToRestore.uuid,
            restored_version: versionToRestore.version,
            restore_timestamp: new Date().toISOString()
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to restore version');
      }

      const { data: newVersion } = await response.json();
      
      toast.success("版本恢复成功");
      setShowRestoreDialog(false);
      
      // 重新加载版本历史
      await fetchVersions();
      
      // 切换到新恢复的版本
      if (newVersion.uuid) {
        setCurrentVersionId(newVersion.uuid);
        setDocument(newVersion);
      }
    } catch (error: any) {
      console.error('Error restoring version:', error);
      toast.error(error.message || "版本恢复失败");
      setRestoringVersion(false);
    } finally {
      setRestoringVersion(false);
    }
  };
  const displayContent = document?.content || '';
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{error || "文档不存在"}</h3>
          <Button 
            variant="outline" 
            onClick={() => router.push('/my-documents')}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回文档列表
          </Button>
        </div>
      </div>
    );
  }

  const Icon = getDocumentIcon(document.document_type);

  // 简历类型暂不支持预览
  if (document.document_type === DocumentType.Resume) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/my-documents')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回文档列表
          </Button>

          <Card className="text-center py-12">
            <CardContent>
              <ResumeIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">简历预览功能开发中</h3>
              <p className="text-muted-foreground">
                简历文档的预览功能正在开发中，敬请期待
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (document.document_type === DocumentType.StudyAbroadConsultation) {
    const formData = document.form_data || {};
    
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/my-documents')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回文档列表
          </Button>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start gap-4">
                <StudyAbroadConsultationIcon className="w-8 h-8 text-primary mt-1" />
                <div>
                  <CardTitle className="text-2xl mb-2">
                    {document.title || "留学咨询"}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {getDocumentTypeDisplayName(document.document_type)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDocumentDate(document.created_at || '')}
                    </span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="space-y-6">
            {/* 基本信息 */}
            {formData.basicInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">基本信息</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {formData.basicInfo.full_name && (
                    <div>
                      <Label className="text-muted-foreground">姓名</Label>
                      <p className="font-medium">{formData.basicInfo.full_name}</p>
                    </div>
                  )}
                  {formData.basicInfo.email && (
                    <div>
                      <Label className="text-muted-foreground">邮箱</Label>
                      <p className="font-medium">{formData.basicInfo.email}</p>
                    </div>
                  )}
                  {formData.basicInfo.phone && (
                    <div>
                      <Label className="text-muted-foreground">电话</Label>
                      <p className="font-medium">{formData.basicInfo.phone}</p>
                    </div>
                  )}
                  {formData.basicInfo.wechat && (
                    <div>
                      <Label className="text-muted-foreground">微信</Label>
                      <p className="font-medium">{formData.basicInfo.wechat}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 学术背景 */}
            {formData.academicBackground && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">学术背景</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {formData.academicBackground.current_school && (
                    <div>
                      <Label className="text-muted-foreground">当前学校</Label>
                      <p className="font-medium">{formData.academicBackground.current_school}</p>
                    </div>
                  )}
                  {formData.academicBackground.current_degree && (
                    <div>
                      <Label className="text-muted-foreground">当前学历</Label>
                      <p className="font-medium">{formData.academicBackground.current_degree}</p>
                    </div>
                  )}
                  {formData.academicBackground.major && (
                    <div>
                      <Label className="text-muted-foreground">专业</Label>
                      <p className="font-medium">{formData.academicBackground.major}</p>
                    </div>
                  )}
                  {formData.academicBackground.gpa && (
                    <div>
                      <Label className="text-muted-foreground">GPA</Label>
                      <p className="font-medium">{formData.academicBackground.gpa}</p>
                    </div>
                  )}
                  {formData.academicBackground.language_scores && (
                    <div>
                      <Label className="text-muted-foreground">语言成绩</Label>
                      <p className="font-medium">{formData.academicBackground.language_scores}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 申请目标 */}
            {formData.targetProgram && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">申请目标</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {formData.targetProgram.target_country && (
                    <div>
                      <Label className="text-muted-foreground">目标国家/地区</Label>
                      <p className="font-medium">{formData.targetProgram.target_country}</p>
                    </div>
                  )}
                  {formData.targetProgram.target_degree && (
                    <div>
                      <Label className="text-muted-foreground">目标学位</Label>
                      <p className="font-medium">{formData.targetProgram.target_degree}</p>
                    </div>
                  )}
                  {formData.targetProgram.target_major && (
                    <div>
                      <Label className="text-muted-foreground">目标专业</Label>
                      <p className="font-medium">{formData.targetProgram.target_major}</p>
                    </div>
                  )}
                  {formData.targetProgram.target_schools && (
                    <div>
                      <Label className="text-muted-foreground">目标院校</Label>
                      <p className="font-medium">{formData.targetProgram.target_schools}</p>
                    </div>
                  )}
                  {formData.targetProgram.application_year && (
                    <div>
                      <Label className="text-muted-foreground">申请时间</Label>
                      <p className="font-medium">{formData.targetProgram.application_year}</p>
                    </div>
                  )}
                  {formData.targetProgram.budget_range && (
                    <div>
                      <Label className="text-muted-foreground">预算范围</Label>
                      <p className="font-medium">{formData.targetProgram.budget_range}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 背景经历 */}
            {formData.backgroundExperience && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">背景经历</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {formData.backgroundExperience.internship_experience && (
                    <div>
                      <Label className="text-muted-foreground">实习经历</Label>
                      <p className="font-medium">{formData.backgroundExperience.internship_experience}</p>
                    </div>
                  )}
                  {formData.backgroundExperience.research_experience && (
                    <div>
                      <Label className="text-muted-foreground">科研经历</Label>
                      <p className="font-medium">{formData.backgroundExperience.research_experience}</p>
                    </div>
                  )}
                  {formData.backgroundExperience.competition_awards && (
                    <div>
                      <Label className="text-muted-foreground">竞赛奖项</Label>
                      <p className="font-medium">{formData.backgroundExperience.competition_awards}</p>
                    </div>
                  )}
                  {formData.backgroundExperience.publications && (
                    <div>
                      <Label className="text-muted-foreground">发表论文</Label>
                      <p className="font-medium">{formData.backgroundExperience.publications}</p>
                    </div>
                  )}
                  {formData.backgroundExperience.other_achievements && (
                    <div>
                      <Label className="text-muted-foreground">其他成就</Label>
                      <p className="font-medium">{formData.backgroundExperience.other_achievements}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 咨询需求 */}
            {formData.consultationNeeds && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">咨询需求</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {formData.consultationNeeds.main_concerns && (
                    <div>
                      <Label className="text-muted-foreground">主要关注</Label>
                      <p className="font-medium">{formData.consultationNeeds.main_concerns}</p>
                    </div>
                  )}
                  {formData.consultationNeeds.service_expectations && (
                    <div>
                      <Label className="text-muted-foreground">服务期望</Label>
                      <p className="font-medium">{formData.consultationNeeds.service_expectations}</p>
                    </div>
                  )}
                  {formData.consultationNeeds.additional_notes && (
                    <div>
                      <Label className="text-muted-foreground">其他说明</Label>
                      <p className="font-medium">{formData.consultationNeeds.additional_notes}</p>
                    </div>
                  )}
                  {formData.consultationNeeds.preferred_consultation_time && (
                    <div>
                      <Label className="text-muted-foreground">偏好咨询时间</Label>
                      <p className="font-medium">{formData.consultationNeeds.preferred_consultation_time}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部导航 */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/my-documents')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回文档列表
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-2" />
              复制
            </Button>
            {document.document_type === DocumentType.SOP ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    下载
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSOPExport('txt')}>
                    <FileText className="w-4 h-4 mr-2" />
                    导出为 TXT
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSOPExport('pdf')}>
                    <FileText className="w-4 h-4 mr-2" />
                    导出为 PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSOPExport('docx')}>
                    <FileText className="w-4 h-4 mr-2" />
                    导出为 DOCX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : document.document_type === DocumentType.PersonalStatement ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    下载
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handlePersonalStatementExport('txt')}>
                    <FileText className="w-4 h-4 mr-2" />
                    导出为 TXT
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePersonalStatementExport('pdf')}>
                    <FileText className="w-4 h-4 mr-2" />
                    导出为 PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePersonalStatementExport('docx')}>
                    <FileText className="w-4 h-4 mr-2" />
                    导出为 DOCX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : document.document_type === DocumentType.CoverLetter ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    下载
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleCoverLetterExport('txt')}>
                    <FileText className="w-4 h-4 mr-2" />
                    导出为 TXT
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCoverLetterExport('pdf')}>
                    <FileText className="w-4 h-4 mr-2" />
                    导出为 PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCoverLetterExport('docx')}>
                    <FileText className="w-4 h-4 mr-2" />
                    导出为 DOCX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                下载
              </Button>
            )}
          </div>
        </div>

        {/* 文档信息卡片 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <Icon className="w-8 h-8 text-primary mt-1" />
                <div>
                  <CardTitle className="text-2xl mb-2">
                    {document.title || "未命名文档"}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {getDocumentTypeDisplayName(document.document_type)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDocumentDate(document.created_at || '')}
                    </span>
                    {document.word_count && (
                      <Badge variant="secondary">
                        {document.word_count} 字
                      </Badge>
                    )}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 版本控制 */}
        {versions.length > 1 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <History className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">版本历史</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">当前版本：</Label>
                  <select
                    value={currentVersionId || ''}
                    onChange={(e) => handleVersionChange(e.target.value)}
                    className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                    disabled={loadingVersions}
                  >
                    {versions.map((version) => (
                      <option key={version.uuid} value={version.uuid}>
                        版本 {version.version} - {version.version_type === VersionType.Original ? '原始版本' : `修订版本`}
                        {version.revision_settings?.restored_from && ' (从历史版本恢复)'}
                      </option>
                    ))}
                  </select>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVersionComparison(true)}
                    disabled={loadingVersions}
                  >
                    <GitCompare className="w-4 h-4 mr-2" />
                    版本对比
                  </Button>

                  {currentVersionId !== versions[versions.length - 1]?.uuid && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRestoreClick}
                      disabled={loadingVersions || restoringVersion}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      恢复此版本
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* 文档内容 */}
        <Card>
          <CardContent className="prose prose-gray dark:prose-invert max-w-none p-8">
            <Markdown content={displayContent} />
          </CardContent>
        </Card>
      </div>

      {/* 版本对比弹窗 */}
      {showVersionComparison && versions.length > 1 && (
        <VersionComparison
          isOpen={showVersionComparison}
          onClose={() => setShowVersionComparison(false)}
          versions={versions}
          currentVersionId={currentVersionId}
        />
      )}

      {/* 版本恢复确认对话框 */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认恢复版本</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要恢复到版本 {versionToRestore?.version} 吗？
              <br />
              这将创建一个新版本，当前版本不会被覆盖。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoringVersion}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreConfirm}
              disabled={restoringVersion}
            >
              {restoringVersion ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  恢复中...
                </>
              ) : (
                '确认恢复'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
