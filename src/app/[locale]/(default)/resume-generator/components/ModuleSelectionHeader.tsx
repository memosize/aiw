"use client";

import { CheckSquare, Square } from "lucide-react";
import { useResume } from "./ResumeContext";

interface ModuleSelectionHeaderProps {
  moduleId:
    | "header"
    | "education"
    | "workExperience"
    | "research"
    | "activities"
    | "awards"
    | "skillsLanguage";
  title: string;
  description: string;
}

export default function ModuleSelectionHeader({
  moduleId,
  title,
  description,
}: ModuleSelectionHeaderProps) {
  const { isModuleSelected, toggleModuleSelection } = useResume();
  const isSelected = isModuleSelected(moduleId);

  return (
    <div className="flex items-center justify-between rounded-xl border border-green-200/70 bg-green-50/80 p-6 dark:border-green-900/60 dark:bg-green-950/25">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
      <button
        className="flex items-center gap-3 rounded-lg px-4 py-2 transition-colors hover:bg-green-100/80 dark:hover:bg-green-900/30"
        onClick={() => toggleModuleSelection(moduleId)}
      >
        {isSelected ? (
          <CheckSquare className="h-5 w-5 text-green-600" />
        ) : (
          <Square className="h-5 w-5 text-muted-foreground" />
        )}
        <span
          className={`font-medium ${
            isSelected
              ? "text-green-700 dark:text-green-300"
              : "text-muted-foreground"
          }`}
        >
          {isSelected ? "已选择包含在文书中" : "点击选择包含在文书中"}
        </span>
      </button>
    </div>
  );
}
