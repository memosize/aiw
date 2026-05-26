import ConsoleLayout from "@/components/console/layout";
import { ReactNode } from "react";
import { Sidebar } from "@/types/blocks/sidebar";
import { unstable_noStore as noStore } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getUserInfo } from "@/services/user";
import { redirect } from "next/navigation";

export default async function ({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  noStore();
  const { locale } = await params;
  const userInfo = await getUserInfo();
  if (!userInfo || !userInfo.email) {
    const callbackUrl =
      locale === "zh" ? "/creation-center" : `/${locale}/creation-center`;
    redirect("/auth/signin?callbackUrl=" + encodeURIComponent(callbackUrl));
  }

  const t = await getTranslations();

  const sidebar: Sidebar = {
    nav: {
      items: [
        {
          title: t("creation_center.title"),
          url: "/creation-center",
          icon: "RiEditBoxLine",
          is_active: false,
        },
        // {
        //   title: t("resume_generator.title"),
        //   url: "/resume-generator",
        //   icon: "RiFileUserLine",
        //   is_active: false,
        // },
        {
          title: t("my_documents.title"),
          url: "/my-documents",
          icon: "RiFileTextLine",
          is_active: false,
        },
        {
          title: t("user.my_orders"),
          url: "/my-orders",
          icon: "RiOrderPlayLine",
          is_active: false,
        },
        {
          title: t("my_credits.title"),
          url: "/my-credits",
          icon: "RiBankCardLine",
          is_active: false,
        },
        {
          title: t("my_invites.title"),
          url: "/my-invites",
          icon: "RiMoneyCnyCircleFill",
          is_active: false,
        },
        // {
        //   title: t("api_keys.title"),
        //   url: "/api-keys",
        //   icon: "RiKey2Line",
        //   is_active: false,
        // },
      ],
    },
  };

  return <ConsoleLayout sidebar={sidebar}>{children}</ConsoleLayout>;
}
