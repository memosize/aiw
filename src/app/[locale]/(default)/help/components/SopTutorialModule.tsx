"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import {
  GraduationCap,
  Lightbulb,
  Send,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

const asset = (path: string) => `/ps-sop-tutorial/${path}`;

const sopTips = [
  {
    title: "1. 填写真实且具体的信息",
    description:
      "写清楚做了什么、用了什么方法或工具、取得了什么结果，以及你的具体收获。",
    image: asset("tips-new/tip-01.png"),
  },
  {
    title: "2. 避免只写泛泛的兴趣",
    description:
      "不要只写“我感兴趣”，尽量用课程、项目、实习或研究经历来支撑动机。",
    image: asset("tips-new/tip-02.png"),
  },
  {
    title: "3. 专业名词建议使用英文填写",
    description:
      "学校、课程、项目、职位、技术工具等名称建议用英文填写，系统识别会更准确。",
    image: asset("tips-new/tip-03.png"),
  },
  {
    title: "4. 内容之间保持一致",
    description:
      "技能、项目经历、研究兴趣和申请方向之间，需要形成清晰的对应关系。",
    image: asset("tips-new/tip-04.png"),
  },
  {
    title: "5. 优先填写相关经历",
    description:
      "强调与你的申请方向最相关、最能突出你能力与潜力的经历和成果。",
    image: asset("tips-new/tip-05.png"),
  },
];

const moduleRows = [
  "01 申请目标：说明你要申请的学校、项目和专业。",
  "02 教育背景：填写学校、专业、学位、GPA 等信息。",
  "03 相关技能：填写你掌握的技能和工具。",
  "04 科研 / 项目经历：描述项目背景、任务和成果。",
  "05 工作经历：说明实习或工作的职责与产出。",
  "06 申请理由：填写你申请的动机和未来方向。",
];

const wrongExamples = [
  "我对人工智能很感兴趣。",
  "我参加过机器学习项目，也做过数据分析实习。",
  "我觉得排名、课程丰富，所以想申请。",
  "我认为自己适合这个项目，并且能学到很多知识。",
  "我真的很想去贵校学习，拜托给我一个机会！",
];

const goodExamples = [
  "我在课程项目中使用 CNN 处理医学影像后，开始关注 AI 在医疗诊断中的应用。",
  "这些经历让我掌握了模型训练、数据清洗和结果评估的方法，也明确了继续学习 AI 的方向。",
  "该项目中机器学习与医疗数据的课程，能帮助我继续深化 AI 在健康领域的应用能力。",
  "我具备编程和统计背景，且在实践项目中解决过数据不平衡问题，能匹配该项目的培养目标。",
  "我希望在贵校系统地培养下，将所学知识应用到解决实际问题中，为未来的研究和职业发展打下坚实基础。",
];

const resultSteps = [
  ["01", "预览文书", "查看生成的文书内容，整体了解文书结构与信息。", asset("result-icons/result-d-01.png")],
  ["02", "判断是否修改", "评估文书是否需要优化，决定是否进行修改或直接使用。", asset("result-icons/result-d-02.png")],
  ["03", "选择修改范围", "选择需要修改的部分内容，支持全文或局部调整。", asset("result-icons/result-d-03.png")],
  ["04", "设置修改方向", "设定修改要求与方向，如语气、侧重点、结构等。", asset("result-icons/result-d-04.png")],
  ["05", "应用修改并优化", "系统根据设置进行内容优化，生成更符合你需求的版本。", asset("result-icons/result-d-05.png")],
  ["06", "导出文档", "确认无误后导出最终文档，支持多种格式保存与使用。", asset("result-icons/result-d-06.png")],
] as const;

const serviceItems = [
  ["优化表达与语言", "提升语言准确性与流畅度，减少语法与用词错误。", asset("section6-icons/service-01.png")],
  ["调整结构与逻辑", "优化段落结构与逻辑衔接，使内容更清晰、更有说服力。", asset("section6-icons/service-02.png")],
  ["提升内容深度", "强化学术观点，补充专业视角与深度思考，提升整体质量。", asset("section6-icons/service-03.png")],
  ["针对申请方向优化", "结合目标院校特点，突出匹配优势，提升个人竞争力。", asset("section6-icons/service-04.png")],
] as const;

const flowSteps = [
  ["01", "提交材料", "填写信息并上传材料。", asset("section6-icons/flow-01.png")],
  ["02", "编辑分配", "了解目标并分配编辑。", asset("section6-icons/flow-02.png")],
  ["03", "人工润色", "优化表达与结构。", asset("section6-icons/flow-03.png")],
  ["04", "质量审核", "多轮审核确保质量。", asset("section6-icons/flow-04.png")],
  ["05", "交付反馈", "交付文档并提供反馈。", asset("section6-icons/flow-05.png")],
] as const;

function SectionHeader({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-7 flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-600 to-green-800 text-xl font-extrabold text-white shadow-md">
        {index}
      </div>
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 md:text-2xl">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          {description}
        </p>
      </div>
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-emerald-100 bg-white shadow-[0_10px_24px_rgba(31,65,48,0.05)] ${className}`}
    >
      {children}
    </div>
  );
}

export default function SopTutorialModule() {
  return (
    <div className="space-y-3">
      <style>{`
        .sop-compare-panel .border-b.border-red-200,
        .sop-compare-panel .border-b.border-emerald-200 {
          font-size: 14px !important;
          line-height: 1.25 !important;
          padding-top: 10px !important;
          padding-bottom: 10px !important;
        }
        .sop-compare-panel .space-y-0 {
          font-size: 10px !important;
          line-height: 1.35 !important;
        }
        .sop-compare-panel .space-y-0 > div {
          padding-top: 6px !important;
          padding-bottom: 6px !important;
        }
        .sop-compare-panel .space-y-0 span:last-child {
          font-size: 10px !important;
          line-height: 1.35 !important;
        }
        .sop-compare-panel .space-y-0 .flex.h-5,
        .sop-compare-panel .space-y-0 .flex.h-4 {
          width: 18px !important;
          height: 18px !important;
          font-size: 9px !important;
        }
        .sop-service-panel .font-bold.text-slate-900,
        .sop-service-panel .text-sm.font-bold.text-slate-900 {
          font-size: 11px !important;
          line-height: 1.25 !important;
        }
        .sop-service-panel .text-xs.leading-5.text-slate-700,
        .sop-service-panel .mt-1.text-xs.leading-5.text-slate-700 {
          font-size: 10px !important;
          line-height: 1.35 !important;
        }
        .sop-service-panel .text-xs.text-slate-700,
        .sop-service-panel .text-3xl.font-black.text-emerald-700 {
          font-size: 10px !important;
          line-height: 1.25 !important;
        }
        .sop-service-panel .mt-1.text-3xl.font-black.text-emerald-700 {
          font-size: 22px !important;
        }
        .sop-service-panel .text-xs.font-extrabold.text-emerald-700,
        .sop-service-panel .text-sm.font-extrabold.text-emerald-700,
        .sop-service-panel .text-sm.font-extrabold.text-emerald-700 {
          font-size: 11px !important;
          line-height: 1.25 !important;
        }
        .sop-service-panel .mt-1.5.text-xs.leading-5.text-slate-700,
        .sop-service-panel .mt-1.5.text-xs.leading-5.text-slate-700 {
          font-size: 10px !important;
          line-height: 1.35 !important;
        }
        .sop-service-panel .text-sm.font-bold.text-slate-900 {
          font-size: 11px !important;
        }
        .sop-service-panel .text-sm.font-extrabold.text-emerald-700 {
          font-size: 11px !important;
        }
        .sop-service-panel .grid.gap-3 > div,
        .sop-service-panel .grid.gap-2.5 > div {
          padding-top: 8px !important;
          padding-bottom: 8px !important;
        }
        .sop-service-panel .flex.h-10.w-10,
        .sop-service-panel .flex.h-9.w-9 {
          width: 28px !important;
          height: 28px !important;
        }
        .sop-service-panel .choice-button {
          font-size: 10px !important;
          height: 30px !important;
          margin-top: 10px !important;
        }
        .sop-service-panel .footer-band::before {
          top: 10px !important;
          font-size: 24px !important;
          line-height: 1.1 !important;
        }
        .sop-service-panel .footer-band {
          padding-top: 72px !important;
          padding-bottom: 20px !important;
          z-index: 2 !important;
        }
      `}</style>
      <div className="w-[86%] space-y-3">
        <Card className="overflow-hidden p-3">
          <div className="relative aspect-[2172/724] w-full overflow-hidden rounded-xl">
            <Image
              src={asset("intro/hero.png")}
              alt="PS 教程封面"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <SectionHeader
            index="01"
            title="PS 是什么 / PS 与 SOP 的区别"
            description="PS（Personal Statement）用于展示你的个人经历、成长路径与申请动机；而 SOP（Statement of Purpose）更侧重学术背景、研究方向与未来规划。"
          />

          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
            <Card className="p-4">
              <div className="mb-4 flex items-center gap-3 text-emerald-700">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
                  <UserRound className="h-5 w-5" />
                </div>
                <h3 className="text-base font-extrabold">个人陈述（PS）</h3>
              </div>
              <ul className="space-y-2.5 text-sm leading-7 text-slate-700">
                <li>侧重个人经历与成长路径</li>
                <li>解释申请动机与选择原因</li>
                <li>展示个人特质与思考方式</li>
                <li>突出独特性与价值观</li>
              </ul>
            </Card>

            <div className="hidden items-center justify-center lg:flex">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-600 to-green-800 text-base font-black text-white shadow-md">
                VS
              </div>
            </div>

            <Card className="p-4">
              <div className="mb-4 flex items-center gap-3 text-emerald-700">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <h3 className="text-base font-extrabold">目的陈述（SOP）</h3>
              </div>
              <ul className="space-y-2.5 text-sm leading-7 text-slate-700">
                <li>侧重学术背景与研究经历</li>
                <li>明确研究方向与学习目标</li>
                <li>展示学术能力与专业潜力</li>
                <li>强调未来规划与发展路径</li>
              </ul>
            </Card>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-7 text-slate-700">
            <Lightbulb className="mt-1 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <b className="text-emerald-700">核心差异一句话总结：</b>
              PS 以个人经历为主线，解释申请动机；SOP 以学术经历为基础，明确研究兴趣与未来规划。
            </div>
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <SectionHeader
            index="02"
            title="填写前的重要提示"
            description="在开始填写前，先确保你的信息清晰、具体，这将直接影响生成内容的质量。"
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {sopTips.map((item) => (
              <Card
                key={item.title}
                className="border-emerald-100 bg-[linear-gradient(180deg,rgba(255,255,255,.98),rgba(250,253,251,.98))] p-4 shadow-none"
              >
                <div className="mx-auto mb-4 flex h-18 w-18 items-center justify-center overflow-hidden rounded-full bg-emerald-50 md:h-20 md:w-20">
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={96}
                    height={96}
                    className="h-full w-full object-contain"
                    unoptimized
                  />
                </div>
                <h3 className="text-center text-sm font-extrabold leading-6 text-emerald-700">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {item.description}
                </p>
              </Card>
            ))}
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <SectionHeader
            index="03"
            title="常见误区与填写示例对比"
            description="看看下面的常见误区和推荐写法对比，帮你写出更有说服力的内容。"
          />

          <div className="sop-compare-panel grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <Card className="border-red-200">
              <div className="border-b border-red-200 bg-red-50 px-5 py-4 text-center font-extrabold text-red-600" style={{ fontSize: "11px", lineHeight: "1.25" }}>
                常见误区（不建议这样写）
              </div>
              <div className="space-y-0 px-4 py-3 text-slate-700" style={{ fontSize: "9px", lineHeight: "1.3" }}>
                {wrongExamples.map((text) => (
                  <div
                    key={text}
                    className="flex items-start gap-2.5 border-b border-dashed border-slate-200 py-2 last:border-b-0"
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 font-black text-white" style={{ fontSize: "8px" }}>
                      ×
                    </span>
                    <span style={{ fontSize: "9px", lineHeight: "1.3" }}>{text}</span>
                  </div>
                ))}
              </div>
            </Card>

            <div className="hidden items-center justify-center lg:flex">
              <div className="font-black text-emerald-700" style={{ fontSize: "14px", lineHeight: "1" }}>↔</div>
            </div>

            <Card>
              <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-4 text-center font-extrabold text-emerald-700" style={{ fontSize: "11px", lineHeight: "1.25" }}>
                推荐写法（建议这样写）
              </div>
              <div className="space-y-0 px-4 py-3 text-slate-700" style={{ fontSize: "9px", lineHeight: "1.3" }}>
                {goodExamples.map((text) => (
                  <div
                    key={text}
                    className="flex items-start gap-2.5 border-b border-dashed border-slate-200 py-2 last:border-b-0"
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 font-black text-white" style={{ fontSize: "8px" }}>
                      ✓
                    </span>
                    <span style={{ fontSize: "9px", lineHeight: "1.3" }}>{text}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-100 bg-white">
            <Image
              src={asset("why/why-flow.png")}
              alt="写法对比流程图"
              width={1600}
              height={400}
              className="h-auto w-full"
              unoptimized
            />
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <SectionHeader
            index="04"
            title="各板块填写说明（按页面顺序）"
            description="请根据自身情况如实填写以下信息，内容越具体，生成的文书质量越高。"
          />

          <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
            <Card className="border-emerald-100 bg-emerald-50 p-4">
              <div className="space-y-3 rounded-xl border border-emerald-200 bg-white p-4">
                {[
                  "申请目标",
                  "教育背景",
                  "相关技能",
                  "科研 / 项目经历",
                  "工作经历",
                  "申请理由",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  >
                    {item}
                  </div>
                ))}
                <div className="rounded-lg bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white">
                  保存
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              {moduleRows.map((row) => (
                <div
                  key={row}
                  className="rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm leading-7 text-slate-700"
                >
                  {row}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <SectionHeader
            index="05"
            title="生成结果页使用指南"
            description="生成结果页提供预览、修改与导出等功能，帮助你优化文书内容并生成最终版本。"
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {resultSteps.map(([index, title, description, image]) => (
              <Card
                key={index}
                className="border-emerald-100 bg-[linear-gradient(180deg,rgba(255,255,255,.98),rgba(250,253,251,.98))] p-4 shadow-none"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-black text-emerald-700">
                    {index}
                  </span>
                  <div className="h-14 w-14 overflow-hidden rounded-full bg-emerald-50">
                    <Image
                      src={image}
                      alt={title}
                      width={88}
                      height={88}
                      className="h-full w-full object-contain"
                      unoptimized
                    />
                  </div>
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {description}
                </p>
              </Card>
            ))}
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-7 text-slate-700">
            <Lightbulb className="mt-1 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <b className="text-emerald-700">使用小提示：</b>
              生成结果可多次优化，建议先局部调整，再整体优化，逐步打造最满意的文书。
            </div>
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <SectionHeader
            index="06"
            title="人工润色服务指南"
            description="专业导师为你优化文书表达、逻辑结构和内容深度，让你的申请更出彩。"
          />

          <div className="sop-service-panel grid gap-4 xl:grid-cols-[2fr_1fr_1fr]">
            <Card className="p-4">
              <h3 className="mb-3 font-extrabold text-emerald-700" style={{ fontSize: "11px", lineHeight: "1.25" }}>
                我们的服务
              </h3>
              <div className="grid gap-3">
                {serviceItems.map(([title, description, image]) => (
                  <div
                    key={title}
                    className="grid gap-2.5 rounded-xl border border-emerald-100 p-2.5"
                    style={{ gridTemplateColumns: "clamp(50px, 5vw, 50px) 1fr" }}
                  >
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-emerald-50">
                      <Image
                        src={image}
                        alt={title}
                        width={60}
                        height={60}
                        className="h-full w-full object-contain"
                        unoptimized
                      />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900" style={{ fontSize: "11px", lineHeight: "1.25" }}>{title}</div>
                      <p className="mt-1 text-slate-700" style={{ fontSize: "10px", lineHeight: "1.35" }}>
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="flex flex-col items-center justify-center p-4 text-center">
              <h3 className="mb-3 font-extrabold text-emerald-700" style={{ fontSize: "11px", lineHeight: "1.25" }}>
                交付周期
              </h3>
              <div className="mb-3 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-emerald-50">
                <Image
                  src={asset("section6-icons/calendar.png")}
                  alt="交付周期"
                  width={68}
                  height={68}
                  className="h-full w-full object-contain"
                  unoptimized
                />
              </div>
              <p className="text-slate-700" style={{ fontSize: "10px", lineHeight: "1.3" }}>每份材料</p>
              <div className="mt-1 font-black text-emerald-700" style={{ fontSize: "22px", lineHeight: "1" }}>5-7</div>
              <p className="text-slate-700" style={{ fontSize: "10px", lineHeight: "1.3" }}>个工作日</p>
            </Card>

            <Card className="p-4">
              <h3 className="mb-3 font-extrabold text-emerald-700" style={{ fontSize: "11px", lineHeight: "1.25" }}>
                适用材料
              </h3>
              <div className="space-y-3">
                {[
                  "mat-svg-ps.svg",
                  "mat-svg-cv.svg",
                  "mat-svg-sop.svg",
                ].map((name) => (
                  <div
                    key={name}
                    className="rounded-xl border border-emerald-100 p-3"
                  >
                    <Image
                      src={asset(`material-badges/${name}`)}
                      alt={name}
                      width={220}
                      height={52}
                      className="h-auto w-full"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="mt-5 p-4">
            <h3 className="mb-3 font-extrabold text-emerald-700" style={{ fontSize: "11px", lineHeight: "1.25" }}>
              服务流程
            </h3>
            <div className="grid gap-1.5 xl:grid-cols-[repeat(5,minmax(0,1fr))]">
              {flowSteps.map(([index, title, description, image]) => (
                <div
                  key={index}
                  className="rounded-xl border border-emerald-100 px-2 py-1.5 text-center"
                >
                  <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-emerald-50">
                    <Image
                      src={image}
                      alt={title}
                      width={60}
                      height={60}
                      className="h-full w-full object-contain"
                      unoptimized
                    />
                  </div>
                  <div className="mx-auto whitespace-nowrap font-bold text-slate-900" style={{ fontSize: "10px", lineHeight: "1.15" }}>
                    {index} {title}
                  </div>
                  <p className="mx-auto mt-0.5 max-w-[96%] text-slate-700" style={{ fontSize: "9px", lineHeight: "1.25" }}>
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Card className="p-4">
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Send className="h-5 w-5" />
              </div>
              <div className="text-sm font-bold text-slate-900">提交人工润色申请</div>
              <p className="mt-1.5 text-xs leading-5 text-slate-700">
                一键提交，专业团队为你服务。
              </p>
            </Card>

            <Card className="p-4">
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="text-sm font-bold text-slate-900">信息安全保障</div>
              <p className="mt-1.5 text-xs leading-5 text-slate-700">
                严格保密机制，保护隐私安全。
              </p>
            </Card>

            <Card className="p-4">
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Users className="h-5 w-5" />
              </div>
              <div className="text-sm font-bold text-slate-900">专业导师团队</div>
              <p className="mt-1.5 text-xs leading-5 text-slate-700">
                资深导师把关，助你申请更出彩。
              </p>
            </Card>
          </div>
        </Card>
      </div>
    </div>
  );
}
