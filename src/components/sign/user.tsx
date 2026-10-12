"use client";

import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Link } from "@/i18n/navigation";
import { User } from "@/types/user";
import { useTranslations } from "next-intl";
import { NavItem } from "@/types/blocks/base";
import { navigateFromResult } from "@/lib/result-navigation";

export default function SignUser({ user }: { user: User }) {
  const t = useTranslations();

  const handleSignOut = () => {
    navigateFromResult(window.location.href, async () => {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      window.location.reload();
    });
  };

  const dropdownItems: NavItem[] = [
    {
      title: user.nickname,
    },
    {
      title: t("user.user_center"),
      url: "/my-documents",
    },
    {
      title: t("user.sign_out"),
      onClick: handleSignOut,
    },
  ];

  const getInitials = (nickname: string) => {
    if (!nickname) return "U";
    return nickname.charAt(0).toUpperCase();
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className="cursor-pointer">
            <AvatarImage src={user.avatar_url} alt={user.nickname} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {getInitials(user.nickname)}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="mx-4 bg-background min-w-[200px]">
          <DropdownMenuItem className="flex-col items-start p-3">
            <div className="font-medium">{user.nickname}</div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {dropdownItems.slice(1).map((item, index) => (
            <React.Fragment key={index}>
              <DropdownMenuItem className="cursor-pointer">
                {item.url ? (
                  <Link href={item.url as any} target={item.target} className="w-full">
                    {item.title}
                  </Link>
                ) : (
                  <button onClick={item.onClick} className="w-full text-left">
                    {item.title}
                  </button>
                )}
              </DropdownMenuItem>
              {index !== dropdownItems.slice(1).length - 1 && <DropdownMenuSeparator />}
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
