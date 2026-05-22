"use client";

import TutorialCenterModule from "./TutorialCenterModule";

interface HelpClientProps {
  locale: string;
}

export default function HelpClient({ locale: _locale }: HelpClientProps) {
  return <TutorialCenterModule />;
}
