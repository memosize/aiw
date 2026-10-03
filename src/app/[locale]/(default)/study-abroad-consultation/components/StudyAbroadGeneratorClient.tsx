"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { CheckCircle, ArrowRight, CalendarClock, Clock3, RefreshCw, User, GraduationCap, Target, Trophy, HelpCircle, FileText, X } from "lucide-react";
import { toast } from 'sonner';
import { GlobalLoading } from "@/components/ui/loading";

import { StudyAbroadProvider, useStudyAbroad } from "./StudyAbroadContext";

import BasicInfoModule from "./modules/BasicInfoModule";
import PolishingDetailsModule from "./modules/PolishingDetailsModule";
import AcademicBackgroundModule from "./modules/AcademicBackgroundModule";
import TargetProgramModule from "./modules/TargetProgramModule";
import BackgroundExperienceModule from "./modules/BackgroundExperienceModule";
import ConsultationNeedsModule from "./modules/ConsultationNeedsModule";

import { apiRequest } from '@/lib/api-client';

export interface StudyAbroadModule {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
}

const SCHEDULE_NOTICE_ACKNOWLEDGED_KEY = "study-abroad-schedule-notice-acknowledged";

interface ScheduleNoticeModalProps {
  open: boolean;
  onClose: () => void;
}

function ScheduleNoticeModal({ open, onClose }: ScheduleNoticeModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-[2px]"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-notice-title"
        aria-describedby="schedule-notice-description"
        className="relative w-full max-w-[680px] overflow-hidden rounded-[20px] bg-white shadow-[0_24px_70px_rgba(0,0,0,0.16)]"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-50" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-44 w-44 rounded-full bg-orange-50" />

        <button
          type="button"
          onClick={onClose}
          aria-label="关闭排期提醒"
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative px-6 pb-7 pt-8 sm:px-12 sm:pb-10 sm:pt-10">
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60">
              <CalendarClock className="h-7 w-7" strokeWidth={1.8} />
            </div>

            <h2 id="schedule-notice-title" className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
              人工润色排期提醒
            </h2>

            <div
              id="schedule-notice-description"
              className="mt-6 max-w-[560px] text-left text-[15px] leading-7 text-slate-600 sm:text-base sm:leading-8"
            >
              <p>
                随着申请季进入高峰期，近期人工润色需求持续增加，
                <strong className="font-semibold text-slate-900">
                  目前最早可预约时间预计约为 <span className="whitespace-nowrap text-xl text-orange-500">30 天后</span>
                </strong>
                。
              </p>
              <p className="mt-3">
                如您可以接受当前排期，可直接下单；如时间较紧，建议下单前点击右下角
                <strong className="font-semibold text-emerald-700">「客服小助手」</strong>
                ，添加客服微信确认具体时间。
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 sm:w-[64%]"
            >
              我已了解，继续填写
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmationPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale || 'zh';
  const { 
    data,
    isSubmitting,
    setIsSubmitting,
    submissionError,
    setSubmissionError,
    saveToCache
  } = useStudyAbroad();

  const validateData = () => {
    const { basicInfo, polishingDetails, academicBackground, targetProgram, consultationNeeds } = data;

    if (!basicInfo.full_name || !basicInfo.phone || !basicInfo.email) {
      toast.error('请填写完整的基本信息');
      return false;
    }

    if (!polishingDetails.uploaded_document_name || !polishingDetails.polishing_requirements) {
      toast.error('请上传文档并填写润色要求');
      return false;
    }

    if (!polishingDetails.return_method) {
      toast.error('请选择返还方式');
      return false;
    }

    if (polishingDetails.return_method === 'email' && !polishingDetails.return_email) {
      toast.error('请填写接收邮箱');
      return false;
    }

    if (polishingDetails.return_method === 'wechat' && !polishingDetails.return_wechat) {
      toast.error('请填写微信号');
      return false;
    }

    if (!academicBackground.current_degree || !academicBackground.current_school ||
        !academicBackground.major || !academicBackground.gpa || !academicBackground.graduation_date) {
      toast.error('请填写完整的学术背景信息');
      return false;
    }

    if (!targetProgram.target_degree || !targetProgram.target_country ||
        !targetProgram.target_major || !targetProgram.target_schools || !targetProgram.application_year) {
      toast.error('请填写完整的申请目标信息');
      return false;
    }

    if (!consultationNeeds.main_concerns || !consultationNeeds.service_expectations) {
      toast.error('请填写咨询需求');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateData()) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      saveToCache();
      
      const { data: document } = await apiRequest('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_type: 'study_abroad_consultation',
          title: `留学咨询 - ${data.basicInfo.full_name || '用户'}`.substring(0, 100),
          form_data: data,
          language: 'zh'
        }),
      });

      if (!document) {
        throw new Error('Failed to create consultation record');
      }
      
      router.push(`/${locale}/study-abroad-consultation/result/${document.uuid}`);
    } catch (error) {
      console.error('Error submitting consultation:', error);
      toast.error('提交失败，请重试');
      setIsSubmitting(false);
      setSubmissionError('提交失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-2">确认咨询信息</h2>
        <p className="text-muted-foreground">请确认您填写的信息，提交后我们的顾问将尽快与您联系</p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
        人工润色需一定处理时间，每份材料通常需要5–7个工作日完成。
      </div>

      <div className="bg-muted/30 rounded-xl p-6">
        <h3 className="text-lg font-medium text-foreground mb-4">信息汇总</h3>

        <div className="space-y-4">
          <div className="bg-background rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              基本信息
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>姓名：{data.basicInfo.full_name || '未填写'}</div>
              <div>电话：{data.basicInfo.phone || '未填写'}</div>
              <div>邮箱：{data.basicInfo.email || '未填写'}</div>
              <div>微信：{data.basicInfo.wechat || '未填写'}</div>
            </div>
          </div>

          <div className="bg-background rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              文档润色
            </h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>上传文档：{data.polishingDetails.uploaded_document_name || '未上传'}</div>
              <div>
                润色要求：
                <p className="mt-1 text-foreground">
                  {data.polishingDetails.polishing_requirements || '未填写'}
                </p>
              </div>
              <div>
                返还方式：
                {data.polishingDetails.return_method === 'email' && '邮件'}
                {data.polishingDetails.return_method === 'wechat' && '微信'}
                {!data.polishingDetails.return_method && '未选择'}
                {data.polishingDetails.return_method === 'email' && data.polishingDetails.return_email &&
                  ` (${data.polishingDetails.return_email})`}
                {data.polishingDetails.return_method === 'wechat' && data.polishingDetails.return_wechat &&
                  ` (${data.polishingDetails.return_wechat})`}
              </div>
            </div>
          </div>

          <div className="bg-background rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              学术背景
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>当前学历：{data.academicBackground.current_degree || '未填写'}</div>
              <div>学校：{data.academicBackground.current_school || '未填写'}</div>
              <div>专业：{data.academicBackground.major || '未填写'}</div>
              <div>GPA：{data.academicBackground.gpa || '未填写'}</div>
            </div>
          </div>

          <div className="bg-background rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" />
              申请目标
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>目标学位：{data.targetProgram.target_degree || '未填写'}</div>
              <div>目标国家：{data.targetProgram.target_country || '未填写'}</div>
              <div>目标专业：{data.targetProgram.target_major || '未填写'}</div>
              <div>申请时间：{data.targetProgram.application_year || '未填写'}</div>
            </div>
          </div>
        </div>
      </div>

      {submissionError && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-800 dark:text-red-200">
            {submissionError}
          </p>
        </div>
      )}

      <div className="flex justify-center pt-6">
        <Button 
          size="lg" 
          className="bg-primary hover:bg-primary/90 px-8 py-3"
          disabled={isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              正在提交...
            </>
          ) : (
            <>
              提交咨询申请
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function StudyAbroadGeneratorContent() {
  const [activeModule, setActiveModule] = useState("basicInfo");
  const [showScheduleNotice, setShowScheduleNotice] = useState(false);
  const { data, isSubmitting } = useStudyAbroad();

  useEffect(() => {
    let hasAcknowledged = false;

    try {
      hasAcknowledged = window.sessionStorage.getItem(SCHEDULE_NOTICE_ACKNOWLEDGED_KEY) === "true";
    } catch {
      // Continue with the in-memory state when browser storage is unavailable.
    }

    if (hasAcknowledged) return;

    const timer = window.setTimeout(() => {
      setShowScheduleNotice(true);
    }, 400);

    return () => window.clearTimeout(timer);
  }, []);

  const dismissScheduleNotice = () => {
    try {
      window.sessionStorage.setItem(SCHEDULE_NOTICE_ACKNOWLEDGED_KEY, "true");
    } catch {
      // The modal still closes for the current render when storage is unavailable.
    }

    setShowScheduleNotice(false);
  };

  const modules: StudyAbroadModule[] = [
    {
      id: "basicInfo",
      title: "基本信息",
      icon: User,
      component: BasicInfoModule,
    },
    {
      id: "polishingDetails",
      title: "文档润色",
      icon: FileText,
      component: PolishingDetailsModule,
    },
    {
      id: "academicBackground",
      title: "学术背景",
      icon: GraduationCap,
      component: AcademicBackgroundModule,
    },
    {
      id: "targetProgram",
      title: "申请目标",
      icon: Target,
      component: TargetProgramModule,
    },
    {
      id: "backgroundExperience",
      title: "背景经历",
      icon: Trophy,
      component: BackgroundExperienceModule,
    },
    {
      id: "consultationNeeds",
      title: "咨询需求",
      icon: HelpCircle,
      component: ConsultationNeedsModule,
    },
  ];

  const currentModuleIndex = modules.findIndex(m => m.id === activeModule);
  const currentModule = modules[currentModuleIndex];

  const goToNextModule = () => {
    if (currentModuleIndex < modules.length - 1) {
      setActiveModule(modules[currentModuleIndex + 1].id);
    } else {
      setActiveModule("confirmation");
    }
  };

  const goToPreviousModule = () => {
    if (activeModule === "confirmation") {
      setActiveModule(modules[modules.length - 1].id);
    } else if (currentModuleIndex > 0) {
      setActiveModule(modules[currentModuleIndex - 1].id);
    }
  };

  const allModules = [
    ...modules,
    {
      id: "confirmation",
      title: "确认提交",
      icon: CheckCircle,
      component: ConfirmationPage,
    }
  ];

  const activeModuleData = allModules.find(module => module.id === activeModule);
  const ActiveComponent = activeModuleData?.component || BasicInfoModule;

  return (
    <>
      <GlobalLoading isVisible={isSubmitting} />
      <ScheduleNoticeModal open={showScheduleNotice} onClose={dismissScheduleNotice} />
      <div className="form-page-scale min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <div className="bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">人工文书润色服务</h1>
              <p className="text-muted-foreground mt-2 text-lg">
                提交你的申请材料，获得专业老师的语言优化与逻辑梳理
              </p>
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-orange-200/80 bg-orange-50/80 px-4 py-3 text-sm leading-6 text-slate-600 shadow-sm sm:items-center">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-orange-500 sm:mt-0" />
                <p>
                  当前人工润色排期约 <strong className="font-semibold text-orange-600">30 天起</strong>
                  ，时间较紧的同学建议下单前联系客服确认排期
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-3">
            <div className="bg-card/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-6">
                填写步骤
              </h3>
              <div className="space-y-3">
                {modules.map((module, index) => {
                  const Icon = module.icon;
                  const isCompleted = currentModuleIndex > index;
                  const isCurrent = activeModule === module.id;
                  
                  return (
                    <div key={module.id} className="group">
                      <div
                        className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 relative cursor-pointer ${
                          isCurrent
                            ? "bg-primary text-primary-foreground shadow-lg"
                            : isCompleted
                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                            : "hover:bg-muted/50 text-foreground"
                        }`}
                        onClick={() => setActiveModule(module.id)}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm">{module.title}</div>
                        </div>
                        {isCompleted && (
                          <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
                
                <div className="pt-6 border-t border-border mt-6">
                  <button
                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 ${
                      activeModule === "confirmation"
                        ? "bg-secondary text-secondary-foreground shadow-lg"
                        : "bg-gradient-to-r from-secondary/20 to-secondary/10 text-foreground hover:from-secondary/30 hover:to-secondary/20"
                    }`}
                    onClick={() => setActiveModule("confirmation")}
                  >
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">确认提交</div>
                    </div>
                    <ArrowRight className="w-4 h-4 flex-shrink-0 opacity-60" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-9">
            <div className="bg-card/70 backdrop-blur-sm rounded-2xl p-8 shadow-sm min-h-[600px]">
              <div className="flex items-center gap-4 mb-8">
                {activeModuleData && (
                  <>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      activeModule === "confirmation" ? "bg-secondary/20" : "bg-primary/20"
                    }`}>
                      <activeModuleData.icon className={`w-5 h-5 ${
                        activeModule === "confirmation" ? "text-secondary" : "text-primary"
                      }`} />
                    </div>
                    <h2 className="text-2xl font-semibold text-foreground">{activeModuleData.title}</h2>
                  </>
                )}
              </div>
              
              <div className="min-h-[400px]">
                <ActiveComponent />
              </div>

              {activeModule !== "confirmation" && (
                <div className="flex justify-between pt-8 mt-8 border-t border-border">
                  <Button
                    variant="outline"
                    className="bg-background hover:bg-muted"
                    onClick={goToPreviousModule}
                    disabled={currentModuleIndex === 0}
                  >
                    上一步
                  </Button>
                  
                  <Button
                    className="bg-primary hover:bg-primary/90"
                    onClick={goToNextModule}
                  >
                    {currentModuleIndex === modules.length - 1 ? "确认信息" : "下一步"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default function StudyAbroadGeneratorClient() {
  return (
    <StudyAbroadProvider>
      <StudyAbroadGeneratorContent />
    </StudyAbroadProvider>
  );
}
