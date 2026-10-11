import DocumentHistoryTracker from "@/components/document-history-tracker";
import Footer from "@/components/blocks/footer";
import Header from "@/components/blocks/header";
import { ReactNode } from "react";
import { getLandingPage } from "@/services/page";
import Feedback from "@/components/feedback";
import { GlobalLoadingWrapper } from "@/components/ui/global-loading-wrapper";
import { HeroProvider } from "@/contexts/hero-context";

export default async function DefaultLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getLandingPage(locale);

  return (
    <HeroProvider>
      <DocumentHistoryTracker />
      {page.header && <Header header={page.header} />}
      <main className="[overflow-x:clip]">{children}</main>
      {page.footer && <Footer footer={page.footer} />}
      {/* <Feedback socialLinks={page.footer?.social?.items} /> */}
      <GlobalLoadingWrapper />
    </HeroProvider>
  );
}
