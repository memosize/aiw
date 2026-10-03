import { getTranslations } from "next-intl/server";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import Link from "next/link";
import { CreationToolCard } from "@/components/console/CreationToolCard";
import { AnimatedDivider } from "@/components/ui/animated-divider";

export default async function CreationCenterPage() {
  const t = await getTranslations();

  const allTools = [
    {
      icon: "resume-generate",
      title: "简历生成",
      description: "AI智能简历生成器，根据您的个人信息、教育背景、工作经验等自动生成专业的简历模板，支持多种格式导出",
      price: 80,
      url: "/resume-generator"
    },
    {
      icon: "personal-statement-write",
      title: "个人陈述撰写",
      description: "专业的Personal Statement撰写服务，展现您的独特背景、学术热情和职业目标，让您的申请脱颖而出",
      price: 100,
      url: "/personal-statement"
    },
    {
      icon: "sop-statement",
      title: "SOP 目的陈述撰写",
      description: "专业的Statement of Purpose撰写服务，帮助您清晰表达学术目标和研究兴趣，展现个人动机和未来规划",
      price: 120,
      url: "/sop"
    },
    {
      icon: "recommendation-letter-write",
      title: "推荐信撰写",
      description: "我们提供针对性的推荐信工具，支持科研推荐/实习/理科等专业推荐场景",
      price: 100,
      url: "/recommendation-letter"
    },
    {
      icon: "document-polish",
      title: "Cover Letter撰写",
      description: "专业的Cover Letter撰写服务，帮助您清晰表达学术目标和研究兴趣，展现个人动机和未来规划",
      price: 90,
      url: "/cover-letter"
    },
    {
      icon: "document-polish",
      title: "人工润色",
      description: "专业的母语老师人工润色服务，为您的文书提供地道、流畅的语言表达，确保符合学术规范",
      price: 150,
      url: "/study-abroad-consultation"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="bg-card">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              {t("creation_center.title")}
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              AI工具让留学申请简单、高效、低价
            </p>
            
            {/* Search Bar */}
            {/* <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="搜索工具..."
                className="pl-10 pr-4 py-2 w-full"
              />
            </div> */}
          </div>
        </div>
        
        {/* Animated Divider */}
        <AnimatedDivider className="mb-0" height="2px" />
      </div>

      {/* Navigation Categories */}
       


      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {allTools.map((tool: any, index: number) => (
            <CreationToolCard
              key={index}
              icon={tool.icon}
              title={tool.title}
              description={tool.description}
              price={tool.price}
              url={tool.url}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
} 
