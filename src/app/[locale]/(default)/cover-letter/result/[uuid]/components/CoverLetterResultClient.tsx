"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import {
  CheckCircle,
  Square,
  CheckSquare,
  Copy,
  Download,
  Save,
  RefreshCw,
  FileText,
  Sparkles,
  Edit3,
  Loader2,
  Wand2,
  Eye,
  GitCompare,
  ChevronDown,
  Zap,
  Stars
} from "lucide-react";
import { toast } from "sonner";
import { useDify } from '@/hooks/useDify';
import { useDifyReviseCoverLetter } from '@/hooks/useDifyReviseCoverLetter';
import {
  exportCoverLetterToTXT,
  exportCoverLetterToDOCX
} from '@/lib/cover-letter-document-export';
import { exportCoverLetterToPDF } from '@/lib/paged-cover-letter-pdf-export';
import { smartWordCount } from '@/lib/word-count';
import Markdown from "@/components/markdown";
import MarkdownEditor from "@/components/blocks/mdeditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Import context and modules
import { CoverLetterProvider, useCoverLetter } from "../../../components/CoverLetterContext";
import BasicInfoModule from "../../../components/modules/BasicInfoModule";
import ApplicationBackgroundModule from "../../../components/modules/ApplicationBackgroundModule";
import ExperienceHistoryModule from "../../../components/modules/ExperienceHistoryModule";
import FitAndClosingModule from "../../../components/modules/FitAndClosingModule";

// Import SVG icons
import BasicInfoIcon from "../../../components/icons/BasicInfoIcon";
import ApplicationBackgroundIcon from "../../../components/icons/ApplicationBackgroundIcon";
import ExperienceHistoryIcon from "../../../components/icons/ExperienceHistoryIcon";
import FitAndClosingIcon from "../../../components/icons/FitAndClosingIcon";

// Import revision components
import RevisionModal from "../../../components/RevisionModal";
import FullRevisionModal from "../../../components/FullRevisionModal";
import ParagraphRevision from "../../../components/ParagraphRevision";
import VersionComparison from "../../../components/VersionComparison";

export interface CoverLetterModule {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
}

// AI生成Loading组件
const AIGeneratingLoader = ({ currentNodeName }: { currentNodeName?: string }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { icon: Sparkles, text: "分析您的求职信内容...", color: "text-blue-500" },
    { icon: Zap, text: "运用AI智能生成技术...", color: "text-blue-500" },
    { icon: Stars, text: "优化语言和结构...", color: "text-blue-500" },
    { icon: FileText, text: "完成求职信生成...", color: "text-blue-500" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev: number) => (prev + 1) % steps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] space-y-8">
      <div className="relative">
        <div className="w-32 h-32 border-4 border-primary/20 rounded-full animate-spin">
          <div className="absolute top-2 left-2 w-4 h-4 bg-primary rounded-full"></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-12 h-12 text-primary animate-pulse" />
        </div>
      </div>

      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-4">
          {steps.map((step: { icon: any; text: string; color: string }, index: number) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            return (
              <div
                key={index}
                className={`transition-all duration-300 ${
                  isActive ? 'scale-125' : 'scale-100 opacity-50'
                }`}
              >
                <Icon className={`w-6 h-6 ${step.color}`} />
              </div>
            );
          })}
        </div>
        <p className="text-lg font-medium text-foreground animate-pulse">
          {currentNodeName || steps[currentStep].text}
        </p>
        <p className="text-sm text-muted-foreground">
          请稍候，AI正在为您生成专业的求职信...
        </p>
      </div>
    </div>
  );
};

// 生成求职信内容
const generateCoverLetter = (data: any) => {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `${data.basicInfo.full_name || '[Your Name]'}
${data.basicInfo.address || '[Your Address]'}
${data.basicInfo.email || '[Your Email]'}
${data.basicInfo.phone || '[Your Phone]'}

${data.basicInfo.date || today}

${data.basicInfo.recruiter_name || '[Hiring Manager Name]'}
${data.basicInfo.recruiter_title || '[Title]'}
${data.basicInfo.company_name || '[Company Name]'}
${data.basicInfo.company_address || '[Company Address]'}

Dear ${data.basicInfo.recruiter_name ? `${data.basicInfo.recruiter_name}` : 'Hiring Manager'},

${data.applicationBackground.current_program ? `I am currently ${data.applicationBackground.current_program}, and I am writing to express my strong interest in the ${data.applicationBackground.target_position || '[Position Name]'} position` : `I am writing to express my strong interest in the ${data.applicationBackground.target_position || '[Position Name]'} position`}${data.applicationBackground.department ? ` in the ${data.applicationBackground.department} department` : ''} at ${data.basicInfo.company_name || '[Company Name]'}. ${data.applicationBackground.application_channel ? `I learned about this opportunity through ${data.applicationBackground.application_channel}.` : ''}

${data.applicationBackground.why_this_company ? `What particularly draws me to ${data.basicInfo.company_name || '[Company Name]'} is ${data.applicationBackground.why_this_company}` : ''}

${data.experienceHistory.past_internship_1 ? `In my previous experience, ${data.experienceHistory.past_internship_1}.` : ''} ${data.experienceHistory.skills_from_internship ? `Through this experience, I have developed ${data.experienceHistory.skills_from_internship}, which I believe will be valuable in this role.` : ''}

${data.experienceHistory.highlight_project ? `One of my most significant accomplishments was ${data.experienceHistory.highlight_project}.` : ''} ${data.experienceHistory.leadership_or_teamwork ? `Additionally, ${data.experienceHistory.leadership_or_teamwork}` : ''}

${data.fitAndClosing.fit_reason ? `I am particularly well-suited for this position because ${data.fitAndClosing.fit_reason}.` : ''} ${data.fitAndClosing.impressed_by_company ? `I am impressed by ${data.fitAndClosing.impressed_by_company}` : ''}

${data.fitAndClosing.final_expectation ? `${data.fitAndClosing.final_expectation}` : 'I would welcome the opportunity to discuss how my background and enthusiasm can contribute to your team.'} Thank you for considering my application. I look forward to hearing from you.

Sincerely,
${data.basicInfo.full_name || '[Your Name]'}`;
};

interface CoverLetterResultContentProps {
  documentUuid: string;
}

function CoverLetterResultContent({ documentUuid }: CoverLetterResultContentProps) {
  const t = useTranslations();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale || 'zh';
  
  const [activeTab, setActiveTab] = useState("basicInfo");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingContent, setEditingContent] = useState("");
  const [shouldAutoOpenRevision, setShouldAutoOpenRevision] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Generation streaming states
  const [isStreamingText, setIsStreamingText] = useState(false);
  const [firstChunkReceived, setFirstChunkReceived] = useState(false);
  const [currentNodeName, setCurrentNodeName] = useState('');
  const contentEndRef = useRef<HTMLDivElement>(null);

  // Flag-based generation triggering (prevents repeated API calls)
  const [hasGenerated, setHasGenerated] = useState(false);

  // 修改相关状态
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showFullRevisionModal, setShowFullRevisionModal] = useState(false);
  const [showVersionComparison, setShowVersionComparison] = useState(false);
  const [serverRevisionStatus, setServerRevisionStatus] = useState<boolean | null>(null);
  const [revisingParagraphIndex, setRevisingParagraphIndex] = useState<number | null>(null);
  // 正在保存修改
  const [isSavingRevision, setIsSavingRevision] = useState(false);
  const [highlightedParagraphIndex, setHighlightedParagraphIndex] = useState<number | null>(null);

  // Revision streaming states
  const [isRevisionStreaming, setIsRevisionStreaming] = useState(false);
  const [revisionFirstChunkReceived, setRevisionFirstChunkReceived] = useState(false);
  const [revisionCurrentNodeName, setRevisionCurrentNodeName] = useState('');
  const [isRevisionLoading, setIsRevisionLoading] = useState(false);

  // 版本历史状态（从数据库加载）
  const [dbVersions, setDbVersions] = useState<any[]>([]);
  const [currentDbVersionId, setCurrentDbVersionId] = useState<string | null>(null);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  
  const { runWorkflow, runWorkflowStreamingWithCallbacks } = useDify({ functionType: 'cover-letter' });
  const { runRevision, runRevisionStreaming, isRevising } = useDifyReviseCoverLetter();

  useEffect(() => {
    setShouldAutoOpenRevision(searchParams.get('openRevision') === 'true');
  }, [searchParams]);

  const {
    data,
    isModuleSelected,
    toggleModuleSelection,
    updateBasicInfoData,
    updateApplicationBackgroundData,
    updateExperienceHistoryData,
    updateFitAndClosingData,
    updateGeneratedContent,
    getSelectedData,
    addVersion,
    versions,
    currentVersionId,
    switchVersion,
    hasUsedFreeRevision,
    generationState,
    setLanguagePreference
  } = useCoverLetter();

  // Define displayContent before wordCountInfo to avoid initialization order errors
  const displayContent = (() => {
    if (currentDbVersionId && dbVersions.length > 0) {
      const version = dbVersions.find(v => v.uuid === currentDbVersionId);
      return version?.content || generatedContent || generateCoverLetter(data);
    }
    return generatedContent || generateCoverLetter(data);
  })();

  // Smart word count with useMemo optimization
  const wordCountInfo = useMemo(() => {
    return smartWordCount(displayContent, generationState.languagePreference);
  }, [displayContent, generationState.languagePreference]);

  const modules: CoverLetterModule[] = [
    {
      id: "basicInfo",
      title: "基本信息",
      icon: BasicInfoIcon,
      component: BasicInfoModule,
    },
    {
      id: "applicationBackground",
      title: "申请背景",
      icon: ApplicationBackgroundIcon,
      component: ApplicationBackgroundModule,
    },
    {
      id: "experienceHistory",
      title: "实习与经历",
      icon: ExperienceHistoryIcon,
      component: ExperienceHistoryModule,
    },
    {
      id: "fitAndClosing",
      title: "匹配度与结尾",
      icon: FitAndClosingIcon,
      component: FitAndClosingModule,
    },
  ];

  const handleGenerate = useCallback(async () => {
    console.log('[DEBUG] handleGenerate called');
    console.log('[DEBUG] Current data state:', JSON.stringify(data, null, 2));
    console.log('[DEBUG] Language preference:', generationState.languagePreference);

    setIsGenerating(true);
    setFirstChunkReceived(false);
    setIsStreamingText(false);
    setCurrentNodeName('');

    // 准备Dify API输入
    const difyInputs = {
      language: generationState.languagePreference,
      // Basic Info fields
      full_name: data.basicInfo.full_name || '',
      address: data.basicInfo.address || '',
      email: data.basicInfo.email || '',
      phone: data.basicInfo.phone || '',
      date: data.basicInfo.date || '',
      recruiter_name: data.basicInfo.recruiter_name || '',
      recruiter_title: data.basicInfo.recruiter_title || '',
      company_name: data.basicInfo.company_name || '',
      company_address: data.basicInfo.company_address || '',
      // Application Background
      current_program: data.applicationBackground.current_program || '',
      target_position: data.applicationBackground.target_position || '',
      department: data.applicationBackground.department || '',
      application_channel: data.applicationBackground.application_channel || '',
      why_this_company: data.applicationBackground.why_this_company || '',
      // Experience History
      past_internship_1: data.experienceHistory.past_internship_1 || '',
      skills_from_internship: data.experienceHistory.skills_from_internship || '',
      highlight_project: data.experienceHistory.highlight_project || '',
      leadership_or_teamwork: data.experienceHistory.leadership_or_teamwork || '',
      // Fit and Closing
      fit_reason: data.fitAndClosing.fit_reason || '',
      impressed_by_company: data.fitAndClosing.impressed_by_company || '',
      final_expectation: data.fitAndClosing.final_expectation || ''
    };

    // Text accumulation - MUST use array pattern
    const chunks: string[] = [];

    try {
      await runWorkflowStreamingWithCallbacks(
        {
          inputs: difyInputs,
          response_mode: 'streaming',
          user: 'cover-letter-user'
        },
        {
          onWorkflowStarted: (data) => {
            console.log('[Cover Letter] Workflow started:', data.workflow_run_id);
          },

          onNodeStarted: (data) => {
            const nodeName = data.data.title || data.data.node_type || 'Processing...';
            setCurrentNodeName(nodeName);
            console.log('[Cover Letter] Node started:', nodeName);
          },

          onTextChunk: (text: string, isFirst: boolean) => {
            // First chunk closes loading immediately
            if (isFirst && !firstChunkReceived) {
              setFirstChunkReceived(true);
              setIsGenerating(false);
              setIsStreamingText(true);
              console.log('[Cover Letter] First chunk received, closing loader');
            }

            // Accumulate chunks (official pattern)
            chunks.push(text);
            const fullText = chunks.join('');

            // Update display (triggers re-render for typewriter effect)
            setGeneratedContent(fullText);
            setEditingContent(fullText);
          },

          onNodeFinished: (data) => {
            console.log('[Cover Letter] Node finished:', data.data.title || data.data.node_type);
          },

          onWorkflowFinished: async (data) => {
            setIsStreamingText(false);
            setCurrentNodeName('');
            console.log('[Cover Letter] Workflow finished');

            // Get final content from outputs (fallback if no text_chunk events)
            const finalContent = data.data.outputs?.text ||
                                data.data.outputs?.output ||
                                chunks.join('') ||
                                '';

            if (finalContent && !firstChunkReceived) {
              setGeneratedContent(finalContent);
              setEditingContent(finalContent);
            }

            // Save to database with smart word count
            const saveContent = finalContent || chunks.join('');
            const wordCount = smartWordCount(saveContent, generationState.languagePreference);

            try {
              const updateResponse = await fetch('/api/documents', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  uuid: documentUuid,
                  content: saveContent,
                  ai_workflow_id: data.workflow_run_id,
                  word_count: wordCount.count.toString()
                }),
              });

              if (!updateResponse.ok) {
                console.error('Failed to update document in database');
              } else {
                toast.success("求职信已成功生成！");
              }
            } catch (error) {
              console.error('Error updating document:', error);
            }
          },

          onError: (msg: string, code?: string) => {
            console.error('[Cover Letter] Error:', msg, code);
            setIsGenerating(false);
            setIsStreamingText(false);
            // Fallback to template generation
            const generated = generateCoverLetter(data);
            setGeneratedContent(generated);
            setEditingContent(generated);
            toast.error(`AI生成失败: ${msg}`);
          }
        }
      );
    } catch (error) {
      console.error('[Cover Letter] Generation failed:', error);
      setIsGenerating(false);
      setIsStreamingText(false);
      // Fallback to template generation
      const generated = generateCoverLetter(data);
      setGeneratedContent(generated);
      setEditingContent(generated);
      toast.error("AI生成失败，使用模板生成");
    }
  }, [data, runWorkflowStreamingWithCallbacks, documentUuid, firstChunkReceived]);

  // Effect 1: Load data from database ONLY (no generation triggering)
  useEffect(() => {
    const initializeDocument = async () => {
      if (!documentUuid) return;

      try {
        // 从数据库加载文档数据
        console.log('[Cover Letter] Loading document from database:', documentUuid);
        const response = await fetch(`/api/documents/${documentUuid}`);
        if (response.ok) {
          const result = await response.json();
          console.log('[Cover Letter] Document loaded from DB:', result.data);

          if (result.data?.form_data) {
            // form_data 是扁平结构，需要转换为嵌套结构
            const formData = result.data.form_data;

            // 转换扁平结构为嵌套结构
            const basicInfo = {
              full_name: formData.full_name || '',
              address: formData.address || '',
              email: formData.email || '',
              phone: formData.phone || '',
              date: formData.date || '',
              recruiter_name: formData.recruiter_name || '',
              recruiter_title: formData.recruiter_title || '',
              company_name: formData.company_name || '',
              company_address: formData.company_address || ''
            };

            const applicationBackground = {
              current_program: formData.current_program || '',
              target_position: formData.target_position || '',
              department: formData.department || '',
              application_channel: formData.application_channel || '',
              why_this_company: formData.why_this_company || ''
            };

            const experienceHistory = {
              past_internship_1: formData.past_internship_1 || '',
              skills_from_internship: formData.skills_from_internship || '',
              highlight_project: formData.highlight_project || '',
              leadership_or_teamwork: formData.leadership_or_teamwork || ''
            };

            const fitAndClosing = {
              fit_reason: formData.fit_reason || '',
              impressed_by_company: formData.impressed_by_company || '',
              final_expectation: formData.final_expectation || ''
            };

            // 更新Context中的数据 (atomic update)
            updateBasicInfoData(basicInfo);
            updateApplicationBackgroundData(applicationBackground);
            updateExperienceHistoryData(experienceHistory);
            updateFitAndClosingData(fitAndClosing);

            // 更新语言偏好（如果数据库中有）
            if (formData.language) {
              setLanguagePreference(formData.language as 'English' | 'Chinese');
            }

            console.log('[Cover Letter] Context updated with form data');
          }

          // 如果有内容，加载到生成内容中
          if (result.data?.content) {
            setGeneratedContent(result.data.content);
            setEditingContent(result.data.content);
          }

          // 检查是否需要自动生成
          const urlParams = new URLSearchParams(window.location.search);
          const shouldAutoGenerate = urlParams.get('autoGenerate') === 'true';

          if (shouldAutoGenerate && result.data?.form_data) {
            console.log('[Cover Letter] Setting hasGenerated flag for auto-generation');
            // 清理URL参数
            window.history.replaceState({}, '', window.location.pathname);
            // Set flag to trigger generation (Effect 2 will handle it)
            setHasGenerated(true);
          }
        }
      } catch (error) {
        console.error('[Cover Letter] Error loading document:', error);
      }

      // 检查文档的修改状态
      try {
        const response = await fetch(`/api/documents/${documentUuid}/revisions`);
        if (response.ok) {
          const { data } = await response.json();
          setServerRevisionStatus(data.has_used_free_revision);
        }
      } catch (error) {
        console.error('[Cover Letter] Error checking revision status:', error);
      }

      // Load document versions inline (following SOP pattern)
      setIsLoadingVersions(true);
      try {
        const response = await fetch(`/api/documents/${documentUuid}/versions`);
        if (response.ok) {
          const data = await response.json();
          const versions = data.data?.versions || data.versions || [];
          setDbVersions(versions);

          if (versions && versions.length > 0) {
            // Default to original version
            const originalVersion = versions.find((v: any) => v.version_type === 'original');
            const versionToSet = originalVersion || versions[0];
            setCurrentDbVersionId(versionToSet.uuid);

            // If version has content, update display
            if (versionToSet.content) {
              setGeneratedContent(versionToSet.content);
              setEditingContent(versionToSet.content);
            }
          }

          // Set revision status
          if (data.has_used_revision !== undefined) {
            setServerRevisionStatus(data.has_used_revision);
          }
        }
      } catch (error) {
        console.error('[Cover Letter] Failed to load document versions:', error);
      } finally {
        setIsLoadingVersions(false);
      }
    };

    initializeDocument();
  }, [documentUuid]); // ONLY documentUuid dependency to prevent re-triggers

  // Effect 2: Watch for data readiness and trigger generation ONCE
  useEffect(() => {
    // Only trigger if flag is set, data exists, and not already generating
    if (hasGenerated && data.basicInfo.full_name && !isGenerating) {
      console.log('[Cover Letter] Data ready, triggering generation');
      // Reset flag immediately to prevent re-triggers
      setHasGenerated(false);
      // Call generate with fresh data
      handleGenerate();
    }
  }, [hasGenerated, data.basicInfo.full_name, isGenerating, handleGenerate]); // Include handleGenerate for completeness

  // 监听版本切换
  useEffect(() => {
    if (currentDbVersionId && dbVersions.length > 0) {
      const version = dbVersions.find(v => v.uuid === currentDbVersionId);
      if (version && version.content) {
        setGeneratedContent(version.content);
        setEditingContent(version.content);
      }
    }
  }, [currentDbVersionId, dbVersions]);

  useEffect(() => {
    if (!shouldAutoOpenRevision || isGenerating || !generatedContent) {
      return;
    }

    if (serverRevisionStatus === true) {
      setShouldAutoOpenRevision(false);
      return;
    }

    if (serverRevisionStatus === false) {
      setShowRevisionModal(true);
      setShouldAutoOpenRevision(false);
    }
  }, [shouldAutoOpenRevision, isGenerating, generatedContent, serverRevisionStatus]);

  const handleCopy = async () => {
    const contentToCopy = isEditMode ? editingContent : generatedContent;
    try {
      await navigator.clipboard.writeText(contentToCopy);
      toast.success("内容已复制到剪贴板");
    } catch (error) {
      toast.error("复制失败");
    }
  };

  const handleExport = async (format: 'txt' | 'pdf' | 'docx') => {
    const contentToExport = isEditMode ? editingContent : generatedContent;
    const baseFilename = `cover-letter-${data.basicInfo.full_name || 'applicant'}`;
    const language = generationState.languagePreference === 'Chinese' ? 'zh' : 'en';

    // 准备导出选项
    const exportOptions = {
      filename: `${baseFilename}.${format}`,
      language: language as 'en' | 'zh',
      senderInfo: {
        full_name: data.basicInfo.full_name || '',
        address: data.basicInfo.address || undefined,
        email: data.basicInfo.email || '',
        phone: data.basicInfo.phone || ''
      },
      recipientInfo: {
        recruiter_name: data.basicInfo.recruiter_name || undefined,
        recruiter_title: data.basicInfo.recruiter_title || undefined,
        company_name: data.basicInfo.company_name || '',
        company_address: data.basicInfo.company_address || undefined
      },
      date: data.basicInfo.date || ''
    };

    try {
      switch (format) {
        case 'txt': {
          await exportCoverLetterToTXT(contentToExport, exportOptions);
          break;
        }
        case 'pdf': {
          await exportCoverLetterToPDF(contentToExport, exportOptions);
          break;
        }
        case 'docx': {
          await exportCoverLetterToDOCX(contentToExport, exportOptions);
          break;
        }
      }
    } catch (error) {
      console.error('导出失败:', error);
      toast.error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleSave = () => {
    const contentToSave = isEditMode ? editingContent : generatedContent;
    // 这里可以实现保存到数据库的逻辑
    localStorage.setItem('saved-cover-letter', contentToSave);
    if (isEditMode) {
      setGeneratedContent(editingContent);
    }
    toast.success("求职信已保存");
  };
  
  const handleMarkdownChange = (value: string) => {
    setEditingContent(value);
  };

  // 加载文档版本历史
  const loadDocumentVersions = useCallback(async (forceVersionId?: string) => {
    if (!documentUuid) return;
    
    setIsLoadingVersions(true);
    try {
      const response = await fetch(`/api/documents/${documentUuid}/versions`);
      if (response.ok) {
        const data = await response.json();
        
        // 解析响应数据
        const versions = data.data?.versions || data.versions || [];
        setDbVersions(versions);
        
        // 如果有版本，设置当前版本
        if (versions && versions.length > 0) {
          // 如果指定了强制版本ID（新创建的修订版本），使用它
          if (forceVersionId) {
            const targetVersion = versions.find((v: any) => v.uuid === forceVersionId);
            if (targetVersion) {
              setCurrentDbVersionId(forceVersionId);
              if (targetVersion.content) {
                setGeneratedContent(targetVersion.content);
                setEditingContent(targetVersion.content);
              }
            }
          } else if (!currentDbVersionId) {
            // 如果还没有设置当前版本ID，默认选择原始版本
            const originalVersion = versions.find((v: any) => v.version_type === 'original');
            const versionToSet = originalVersion || versions[0]; // 如果没有原始版本，使用第一个版本
            setCurrentDbVersionId(versionToSet.uuid);
            
            // 如果版本有内容，更新显示内容
            if (versionToSet.content) {
              setGeneratedContent(versionToSet.content);
              setEditingContent(versionToSet.content);
            }
          } else {
            // 如果已经有当前版本ID，保持不变，只更新内容（用于版本切换）
            const currentVersion = versions.find((v: any) => v.uuid === currentDbVersionId);
            if (currentVersion?.content) {
              setGeneratedContent(currentVersion.content);
              setEditingContent(currentVersion.content);
            }
          }
        }
        
        // 设置修改状态
        if (data.has_used_revision !== undefined) {
          setServerRevisionStatus(data.has_used_revision);
        }
      }
    } catch (error) {
      console.error('Failed to load document versions:', error);
    } finally {
      setIsLoadingVersions(false);
    }
  }, [documentUuid]); // Removed currentDbVersionId to prevent recreation loop

  // Note: Removed the separate useEffect that called loadDocumentVersions()
  // which caused an infinite loop. Version loading is now handled inline
  // in the initialization effect above (following SOP pattern).

  // 获取当前数据库版本内容
  const getCurrentDbVersion = () => {
    if (currentDbVersionId && dbVersions.length > 0) {
      const version = dbVersions.find(v => v.uuid === currentDbVersionId);
      return version?.content || '';
    }
    return '';
  };

  // Note: displayContent is defined earlier (line ~152) to avoid initialization order errors

  // 修改功能处理函数
  const handleRevisionClick = () => {
    // 优先使用服务器数据，如果没有则使用本地缓存
    const hasUsed = serverRevisionStatus !== null ? serverRevisionStatus : hasUsedFreeRevision();
    if (hasUsed) {
      toast.error("您已经使用过免费修改机会");
      return;
    }
    setShowRevisionModal(true);
  };

  const handleContinueRevision = () => {
    setShowRevisionModal(false);
    setShowFullRevisionModal(true);
  };

  const handleBackToEdit = () => {
    setShowRevisionModal(false);
    // 返回编辑页面
    window.location.href = `/${locale}/cover-letter`;
  };

  const handleFullRevision = async (settings: any) => {
    setShowFullRevisionModal(false);
    setIsRevisionLoading(true);
    setRevisionFirstChunkReceived(false);
    setIsRevisionStreaming(false);
    setRevisionCurrentNodeName('');

    // 风格选项定义（与 FullRevisionModal 中的一致）
    const STYLE_OPTIONS = [
      { value: 'concise', label: '更精炼' },
      { value: 'formal', label: '更正式' },
      { value: 'logical', label: '更有逻辑' },
      { value: 'emotional', label: '更感性' },
      { value: 'persuasive', label: '更有说服力' },
      { value: 'professional', label: '更专业' },
      { value: 'enthusiastic', label: '更热情' },
      { value: 'confident', label: '更自信' },
      { value: 'clarity', label: '更清晰' },
    ];

    // 将选中的风格值转换为中文标签
    const styleLabels = settings.styles.map((styleValue: string) => {
      const option = STYLE_OPTIONS.find(opt => opt.value === styleValue);
      return option ? option.label : styleValue;
    });

    const params = {
      revise_type: (settings.wordControl === 'keep' ? 0 : (settings.wordControl === 'expand' ? 1 : 2)).toString(),
      style: styleLabels.join(';'),
      original_word_count: wordCountInfo.count.toString(),
      word_count: settings.targetWordCount?.toString() || wordCountInfo.count.toString(),
      detail: settings.direction,
      original_context: displayContent,
      whole: '0', // 整篇修改
      language: generationState.languagePreference // API要求的格式
    };

    // Text accumulation - MUST use array pattern
    const chunks: string[] = [];

    try {
      await runRevisionStreaming(params, {
        onWorkflowStarted: (data) => {
          console.log('[Cover Letter Revision] Workflow started:', data.workflow_run_id);
        },

        onNodeStarted: (data) => {
          const nodeName = data.data.title || data.data.node_type || 'Processing...';
          setRevisionCurrentNodeName(nodeName);
          console.log('[Cover Letter Revision] Node started:', nodeName);
        },

        onTextChunk: (text: string, isFirst: boolean) => {
          // First chunk closes loading immediately
          if (isFirst && !revisionFirstChunkReceived) {
            setRevisionFirstChunkReceived(true);
            setIsRevisionLoading(false);
            setIsRevisionStreaming(true);
            console.log('[Cover Letter Revision] First chunk received, closing loader');
          }

          // Accumulate chunks (official pattern)
          chunks.push(text);
          const fullText = chunks.join('');

          // Update display (triggers re-render for typewriter effect)
          setGeneratedContent(fullText);
          setEditingContent(fullText);
          updateGeneratedContent(fullText);
        },

        onNodeFinished: (data) => {
          console.log('[Cover Letter Revision] Node finished:', data.data.title || data.data.node_type);
        },

        onWorkflowFinished: async (data) => {
          setIsRevisionStreaming(false);
          setRevisionCurrentNodeName('');
          console.log('[Cover Letter Revision] Workflow finished');

          // Get final content from outputs (fallback if no text_chunk events)
          const finalContent = data.data.outputs?.text ||
                              data.data.outputs?.output ||
                              chunks.join('') ||
                              '';

          if (finalContent && !revisionFirstChunkReceived) {
            setGeneratedContent(finalContent);
            setEditingContent(finalContent);
            updateGeneratedContent(finalContent);
          }

          // Save to database with smart word count
          const saveContent = finalContent || chunks.join('');

          if (documentUuid) {
            try {
              const response = await fetch(`/api/documents/${documentUuid}/revisions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  content: saveContent,
                  revision_settings: settings
                })
              });

              if (response.ok) {
                const { data: revision } = await response.json();

                // 立即更新修改状态，禁用修改按钮
                setServerRevisionStatus(true);

                // 重新加载版本历史，并强制选择新版本
                if (revision?.uuid) {
                  await loadDocumentVersions(revision.uuid);
                } else {
                  await loadDocumentVersions();
                }

                toast.success('求职信修改成功');
              } else {
                toast.error('保存失败');
              }
            } catch (saveError) {
              console.error('[Cover Letter Revision] Save failed:', saveError);
              toast.error('保存失败，请重试');
            }
          }

          // 添加本地版本
          addVersion(saveContent, 'revised');
        },

        onError: (msg: string, code?: string) => {
          console.error('[Cover Letter Revision] Error:', msg, code);
          setIsRevisionLoading(false);
          setIsRevisionStreaming(false);
          toast.error(`修改失败: ${msg}`);
        }
      });
    } catch (error) {
      console.error('[Cover Letter Revision] Revision failed:', error);
      toast.error('修改失败，请重试');
      setIsRevisionLoading(false);
      setIsRevisionStreaming(false);
    }
  };

  // 段落修改API调用
  const handleParagraphRevisionAPI = async (params: any, paragraphIndex: number) => {
    setRevisingParagraphIndex(paragraphIndex);
    try {
      // 获取语言设置
      const selectedData = getSelectedData();
      const paramsWithLanguage = {
        ...params,
        language: generationState.languagePreference // API要求的格式
      };

      const revisedContent = await runRevision(paramsWithLanguage);
      return revisedContent;
    } catch (error) {
      console.error('Paragraph revision failed:', error);
      toast.error('段落重写失败，请重试');
      throw error;
    } finally {
      setRevisingParagraphIndex(null);
    }
  };

  // 处理段落修改并保存
  const handleParagraphRevise = async (index: number, newText: string) => {
    const paragraphs = displayContent.split('\n\n');
    paragraphs[index] = newText;
    const newContent = paragraphs.join('\n\n');
    setEditingContent(newContent);
    setGeneratedContent(newContent);
    
    // 创建修改版本并保存到数据库
    try {
      setIsSavingRevision(true);
      const response = await fetch(`/api/documents/${documentUuid}/revisions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newContent,
          revision_settings: {
            type: 'paragraph',
            paragraphIndex: index
          }
        }),
      });

      if (response.ok) {
        const { data: revision } = await response.json();
        
        // 立即更新修改状态，禁用修改按钮
        setServerRevisionStatus(true);
        
        // 重新加载版本历史，并强制选择新版本
        if (revision?.uuid) {
          await loadDocumentVersions(revision.uuid);
        } else {
          await loadDocumentVersions();
        }
        
        toast.success('段落已成功修改并创建新版本！');
      } else {
        throw new Error('Failed to save paragraph revision');
      }
    } catch (error) {
      console.error('Failed to save paragraph revision:', error);
      toast.error('保存失败，请重试');
    } finally {
      setIsSavingRevision(false);
    }
  };

  // 版本切换处理
  const handleVersionChange = (versionId: string) => {
    setCurrentDbVersionId(versionId);
    const version = dbVersions.find(v => v.uuid === versionId);
    if (version && version.content) {
      setGeneratedContent(version.content);
      setEditingContent(version.content);
    }
  };

  const getModuleKey = (moduleId: string) => {
    if (moduleId === 'applicationBackground') return 'applicationBackground';
    if (moduleId === 'experienceHistory') return 'experienceHistory';
    if (moduleId === 'fitAndClosing') return 'fitAndClosing';
    return moduleId;
  };

  const currentModule = modules.find(m => m.id === activeTab);
  const ActiveComponent = currentModule?.component || BasicInfoModule;

  // Auto-scroll during streaming
  useEffect(() => {
    if ((isStreamingText || isRevisionStreaming) && contentEndRef.current) {
      contentEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [displayContent, isStreamingText, isRevisionStreaming]);

  // Show loader only if generating/revising AND no chunks received yet
  if ((isGenerating && !firstChunkReceived) ||
      (isRevisionLoading && !revisionFirstChunkReceived)) {
    return <AIGeneratingLoader currentNodeName={currentNodeName || revisionCurrentNodeName} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-[1800px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">求职信生成结果</h1>
                <p className="text-muted-foreground text-base">
                  编辑内容并导出您的求职信
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                <CheckCircle className="w-3 h-3 mr-1" />
                已生成
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          
          {/* Left Sidebar - Module Navigation */}
          <div className="col-span-2">
            <div className="bg-card/70 backdrop-blur-sm rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-base text-muted-foreground uppercase tracking-wide mb-4">
                内容模块
              </h3>
              <div className="space-y-2">
                {modules.map((module) => {
                  const Icon = module.icon;
                  const moduleKey = getModuleKey(module.id);
                  const isSelected = isModuleSelected(moduleKey as any);
                  
                  return (
                    <div key={module.id} className="group">
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
                        <button
                          className={`p-2 rounded transition-all duration-200 hover:scale-110 ${
                            isSelected 
                              ? "text-primary" 
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          onClick={() => toggleModuleSelection(moduleKey as any)}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                        <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <span className="text-base font-medium text-foreground flex-1">
                          {module.title}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Middle Section - Tabs and Form */}
          <div className="col-span-4">
            <div className="bg-card/70 backdrop-blur-sm rounded-2xl shadow-sm flex flex-col min-h-[calc(100vh-200px)]">
              {/* Tab Headers */}
              <div className="border-b border-border p-4">
                <div className="flex flex-wrap gap-2">
                  {modules.map((module) => {
                    const Icon = module.icon;
                    const moduleKey = getModuleKey(module.id);
                    const isSelected = isModuleSelected(moduleKey as any);
                    
                    if (!isSelected) return null;
                    
                    return (
                      <button
                        key={module.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                          activeTab === module.id
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                        onClick={() => setActiveTab(module.id)}
                      >
                        <Icon className="w-5 h-5" />
                        {module.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Module Content */}
              <div className="flex-1 p-6 overflow-y-auto min-h-0">
                {currentModule && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <currentModule.icon className="w-6 h-6 text-primary" />
                      <h3 className="text-xl font-semibold text-foreground">
                        {currentModule.title}
                      </h3>
                    </div>
                    {/* 只读视图：显示填写的内容 */}
                    <div className="space-y-4 pointer-events-none opacity-80">
                      <ActiveComponent />
                    </div>
                  </div>
                )}
              </div>

              {/* Revision Button */}
              <div className="border-t border-border p-6 mt-auto">
                <Button
                  onClick={handleRevisionClick}
                  disabled={isGenerating || (serverRevisionStatus !== null ? serverRevisionStatus : hasUsedFreeRevision())}
                  className="w-full bg-primary hover:bg-primary/90 text-lg py-4 h-14"
                  size="lg"
                >
                  <Wand2 className="w-6 h-6 mr-3" />
                  {(serverRevisionStatus !== null ? serverRevisionStatus : hasUsedFreeRevision()) 
                    ? '免费优化已使用' 
                    : '免费优化一次'}
                </Button>
              </div>
            </div>
          </div>

          {/* Right Section - Generated Content */}
          <div className="col-span-6">
            <div className="bg-card/70 backdrop-blur-sm rounded-2xl shadow-sm flex flex-col min-h-[calc(100vh-200px)]">
              {/* Header with Actions */}
              <div className="border-b border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Edit3 className="w-6 h-6 text-primary" />
                    <h3 className="text-xl font-semibold text-foreground">结果</h3>
                    
                    {/* 版本切换器 */}
                    {dbVersions.length > 0 && (
                      <div className="flex items-center gap-2 ml-4">
                        <Label className="text-sm text-muted-foreground">版本：</Label>
                        <Select
                          value={currentDbVersionId || ''}
                          onValueChange={(value) => setCurrentDbVersionId(value)}
                          disabled={isLoadingVersions}
                        >
                          <SelectTrigger className="w-[100px] sm:w-[120px] lg:w-[140px] h-9">
                            <SelectValue placeholder="选择版本" />
                          </SelectTrigger>
                          <SelectContent>
                            {dbVersions.map((version) => (
                              <SelectItem key={version.uuid} value={version.uuid}>
                                {version.version_type === 'original' ? '原始版本' : `修改版本 ${version.revision_count || version.version}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {dbVersions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowVersionComparison(!showVersionComparison)}
                            disabled={isLoadingVersions}
                          >
                            <GitCompare className="w-4 h-4 mr-1" />
                            对比
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      复制
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          导出
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleExport('txt')}>
                          <FileText className="mr-2 h-4 w-4" />
                          导出为 TXT
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('pdf')}>
                          <FileText className="mr-2 h-4 w-4" />
                          导出为 PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('docx')}>
                          <FileText className="mr-2 h-4 w-4" />
                          导出为 DOCX
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRevisionClick}
                      disabled={serverRevisionStatus || revisingParagraphIndex !== null || isLoadingVersions}
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      免费优化一次
                      {serverRevisionStatus ? (
                        <Badge variant="secondary" className="ml-2">
                          已使用
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="ml-2">
                          免费
                        </Badge>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Editable Content */}
              <div className="flex-1 p-4 overflow-auto">
                {isSavingRevision ? (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    <span className="ml-3 text-lg text-muted-foreground">正在保存修改...</span>
                  </div>
                ) : isGenerating ? (
                  <div className="flex items-center justify-center min-h-[500px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="ml-3 text-lg">正在生成求职信...</span>
                  </div>
                ) : isEditMode ? (
                  <div className="min-h-[600px]">
                    <MarkdownEditor
                      value={editingContent}
                      onChange={handleMarkdownChange}
                    />
                  </div>
                ) : (
                  <div>
                    {/* Streaming indicator - Generation */}
                    {isStreamingText && (
                      <div className="flex items-center gap-2 p-3 mb-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">
                          {currentNodeName || 'AI 正在生成内容...'}
                        </span>
                        <Badge variant="secondary" className="ml-auto">
                          {wordCountInfo.count} {wordCountInfo.label}
                        </Badge>
                      </div>
                    )}

                    {/* Streaming indicator - Revision */}
                    {isRevisionStreaming && (
                      <div className="flex items-center gap-2 p-3 mb-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                        <span className="text-sm text-orange-900 dark:text-orange-100">
                          {revisionCurrentNodeName || 'AI 正在修改内容...'}
                        </span>
                        <Badge variant="secondary" className="ml-auto">
                          {wordCountInfo.count} {wordCountInfo.label}
                        </Badge>
                      </div>
                    )}

                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      {/* 如果还没有使用修改功能且有显示内容，显示可编辑的段落 */}
                      {!serverRevisionStatus && displayContent && !isLoadingVersions ? (
                        <div className="space-y-4">
                          {displayContent.split('\n\n').map((paragraph: string, index: number) => (
                            <ParagraphRevision
                              key={index}
                              paragraph={paragraph}
                              index={index}
                              onRevise={handleParagraphRevise}
                              isHighlighted={highlightedParagraphIndex === index}
                              onHighlightChange={(shouldHighlight) => {
                                setHighlightedParagraphIndex(shouldHighlight ? index : null);
                              }}
                              onStartRevision={handleParagraphRevisionAPI}
                              isRevising={revisingParagraphIndex === index}
                            />
                          ))}
                        </div>
                      ) : (
                        <Markdown content={displayContent} />
                      )}
                      <div ref={contentEndRef} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 修改相关弹窗 */}
      <RevisionModal
        isOpen={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        onContinueRevision={handleContinueRevision}
        onBackToEdit={handleBackToEdit}
      />
      
      <FullRevisionModal
        isOpen={showFullRevisionModal}
        onClose={() => setShowFullRevisionModal(false)}
        onConfirm={handleFullRevision}
        currentWordCount={wordCountInfo.count}
      />
      
      {/* 版本对比弹窗 */}
      {showVersionComparison && dbVersions.length > 1 && (
        <VersionComparison
          isOpen={showVersionComparison}
          onClose={() => setShowVersionComparison(false)}
          originalContent={dbVersions.find(v => v.version_type === 'original')?.content || ''}
          revisedContent={dbVersions.find(v => v.version_type === 'revised')?.content || displayContent}
        />
      )}
    </div>
  );
}

interface CoverLetterResultClientProps {
  documentUuid: string;
}

export default function CoverLetterResultClient({ documentUuid }: CoverLetterResultClientProps) {
  return (
    <CoverLetterProvider>
      <CoverLetterResultContent documentUuid={documentUuid} />
    </CoverLetterProvider>
  );
} 
