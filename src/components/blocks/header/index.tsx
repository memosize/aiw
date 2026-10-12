"use client";
import { navigateFromResult } from "@/lib/result-navigation";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Header as HeaderType } from "@/types/blocks/header";
import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";
import LocaleToggle from "@/components/locale/toggle";
import { Menu } from "lucide-react";
import SignToggle from "@/components/sign/toggle";
import ThemeToggle from "@/components/theme/toggle";
import { cn } from "@/lib/utils";
import { useCustomSession } from "@/hooks/useCustomSession";
import { useAppContext } from "@/contexts/app";
import { useRouter } from "@/i18n/navigation";
import { GlobalLoading } from "@/components/ui/loading";
import { useState } from "react";

export default function Header({ header }: { header: HeaderType }) {
  const { data: session, isPending } = useCustomSession();
  const { setShowSignModal } = useAppContext();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  if (header.disabled) {
    return null;
  }

  const handleCreationCenterClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isPending) {
      return;
    }
    if (!session) {
      setShowSignModal(true);
    } else {
      navigateFromResult("/creation-center", async () => {
        setIsLoading(true);
        // Show the existing loading state only after leaving has been confirmed.
        await new Promise(resolve => setTimeout(resolve, 300));
        router.push("/creation-center");
        setTimeout(() => setIsLoading(false), 1500);
      });
    }
  };

  return (
    <>
      <GlobalLoading isVisible={isLoading} />
      <section className="py-3">
        <div className="container">
        <nav className="hidden justify-between lg:flex">
          <div className="flex items-center gap-6">
            <Link
              href={(header.brand?.url as any) || "/"}
              className="flex items-center gap-2"
            >
              {header.brand?.logo?.src && (
                <img
                  src={header.brand.logo.src}
                  alt={header.brand.logo.alt || header.brand.title}
                  className="w-8"
                />
              )}
              {header.brand?.title && (
                <span className="text-xl text-primary font-bold">
                  {header.brand?.title || ""}
                </span>
              )}
            </Link>
            <div className="flex items-center">
              <NavigationMenu>
                <NavigationMenuList>
                  {header.nav?.items?.map((item, i) => {
                    if (item.children && item.children.length > 0) {
                      return (
                        <NavigationMenuItem
                          key={i}
                          className="text-muted-foreground"
                        >
                          <NavigationMenuTrigger>
                            {item.icon && (
                              <Icon
                                name={item.icon}
                                className="size-4 shrink-0 mr-2"
                              />
                            )}
                            <span>{item.title}</span>
                          </NavigationMenuTrigger>
                          <NavigationMenuContent>
                            <ul className="w-80 p-3">
                              <NavigationMenuLink>
                                {item.children.map((iitem, ii) => (
                                  <li key={ii}>
                                    <Link
                                      className={cn(
                                        "flex select-none gap-4 rounded-md p-3 leading-none no-underline outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                      )}
                                      href={iitem.url as any}
                                      target={iitem.target}
                                    >
                                      {iitem.icon && (
                                        <Icon
                                          name={iitem.icon}
                                          className="size-5 shrink-0"
                                        />
                                      )}
                                      <div>
                                        <div className="text-sm font-semibold">
                                          {iitem.title}
                                        </div>
                                        <p className="text-sm leading-snug text-muted-foreground">
                                          {iitem.description}
                                        </p>
                                      </div>
                                    </Link>
                                  </li>
                                ))}
                              </NavigationMenuLink>
                            </ul>
                          </NavigationMenuContent>
                        </NavigationMenuItem>
                      );
                    }

                    return (
                      <NavigationMenuItem key={i}>
                        <Link
                          className={cn(
                            "text-muted-foreground",
                            navigationMenuTriggerStyle,
                            buttonVariants({
                              variant: "ghost",
                            })
                          )}
                          href={item.url as any}
                          target={item.target}
                        >
                          {item.icon && (
                            <Icon
                              name={item.icon}
                              className="size-4 shrink-0 mr-0"
                            />
                          )}
                          {item.title}
                        </Link>
                      </NavigationMenuItem>
                    );
                  })}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
          <div className="shrink-0 flex gap-2 items-center">
            {header.show_locale && <LocaleToggle />}
            {header.show_theme && <ThemeToggle />}


            <div className="relative group">
              <Button
                variant="ghost"
                className="relative cursor-pointer bg-background/40 backdrop-blur-md border border-border/30 shadow-sm hover:shadow-lg transition-all duration-500 font-semibold rounded-full px-6 overflow-visible hover:bg-background/50"
                onClick={handleCreationCenterClick}
              >
                {/* Glass gradient overlay */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-500/[0.06] via-emerald-500/[0.04] to-teal-500/[0.06] opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Soft glow diffusion on hover */}
                <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none">
                  <div 
                    className="absolute inset-0 rounded-full blur-md"
                    style={{
                      background: "radial-gradient(circle at center, rgba(134, 239, 172, 0.3), rgba(52, 211, 153, 0.2), transparent 70%)",
                    }}
                  />
                </div>
                
                {/* Thinner shimmer effect */}
                <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-60 pointer-events-none overflow-hidden">
                  <div 
                    className="absolute inset-0 -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-2000"
                    style={{
                      background: "linear-gradient(90deg, transparent 0%, transparent 45%, rgba(255, 255, 255, 0.3) 49%, rgba(134, 239, 172, 0.2) 50%, rgba(255, 255, 255, 0.3) 51%, transparent 55%, transparent 100%)",
                      width: "200%",
                    }}
                  />
                </div>
                
                <span className="flex items-center gap-1.5 text-foreground relative z-10">
                  创作中心
                  <Icon name="Plus" className="size-4 shrink-0" />
                </span>
              </Button>
              
              {/* Bottom gradient border animation - signature green glow */}
              <div className="absolute -bottom-[2px] left-4 right-4 h-[2px] overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 h-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div
                    className="absolute bottom-0 h-full translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-3000 ease-linear"
                    style={{
                      width: "50%",
                      background: "linear-gradient(90deg, transparent 0%, #22c55e 25%, #10b981 50%, #14b8a6 75%, transparent 100%)",
                    }}
                  />
                </div>
              </div>
            </div>

            {header.buttons?.map((item, i) => {
              return (
                <Button key={i} variant={item.variant}>
                  <Link
                    href={item.url as any}
                    target={item.target || ""}
                    className="flex items-center gap-1 cursor-pointer"
                  >
                    {item.title}
                    {item.icon && (
                      <Icon name={item.icon} className="size-4 shrink-0" />
                    )}
                  </Link>
                </Button>
              );
            })}
            {header.show_sign && <SignToggle />}
          </div>
        </nav>

        <div className="block lg:hidden">
          <div className="flex items-center justify-between">
            <Link
              href={(header.brand?.url || "/") as any}
              className="flex items-center gap-2"
            >
              {header.brand?.logo?.src && (
                <img
                  src={header.brand.logo.src}
                  alt={header.brand.logo.alt || header.brand.title}
                  className="w-8"
                />
              )}
              {header.brand?.title && (
                <span className="text-xl font-bold">
                  {header.brand?.title || ""}
                </span>
              )}
            </Link>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="default" size="icon">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>
                    <Link
                      href={(header.brand?.url || "/") as any}
                      className="flex items-center gap-2"
                    >
                      {header.brand?.logo?.src && (
                        <img
                          src={header.brand.logo.src}
                          alt={header.brand.logo.alt || header.brand.title}
                          className="w-8"
                        />
                      )}
                      {header.brand?.title && (
                        <span className="text-xl font-bold">
                          {header.brand?.title || ""}
                        </span>
                      )}
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <div className="mb-8 mt-8 flex flex-col gap-4">
                  <Accordion type="single" collapsible className="w-full">
                    {header.nav?.items?.map((item, i) => {
                      if (item.children && item.children.length > 0) {
                        return (
                          <AccordionItem
                            key={i}
                            value={item.title || ""}
                            className="border-b-0"
                          >
                            <AccordionTrigger className="mb-4 py-0 font-semibold hover:no-underline text-left">
                              {item.title}
                            </AccordionTrigger>
                            <AccordionContent className="mt-2">
                              {item.children.map((iitem, ii) => (
                                <Link
                                  key={ii}
                                  className={cn(
                                    "flex select-none gap-4 rounded-md p-3 leading-none outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                  )}
                                  href={iitem.url as any}
                                  target={iitem.target}
                                >
                                  {iitem.icon && (
                                    <Icon
                                      name={iitem.icon}
                                      className="size-4 shrink-0"
                                    />
                                  )}
                                  <div>
                                    <div className="text-sm font-semibold">
                                      {iitem.title}
                                    </div>
                                    <p className="text-sm leading-snug text-muted-foreground">
                                      {iitem.description}
                                    </p>
                                  </div>
                                </Link>
                              ))}
                            </AccordionContent>
                          </AccordionItem>
                        );
                      }
                      return (
                        <Link
                          key={i}
                          href={item.url as any}
                          target={item.target}
                          className="font-semibold my-4 flex items-center gap-2 px-4"
                        >
                          {item.icon && (
                            <Icon
                              name={item.icon}
                              className="size-4 shrink-0"
                            />
                          )}
                          {item.title}
                        </Link>
                      );
                    })}
                  </Accordion>
                </div>
                <div className="flex-1"></div>
                <div className="border-t pt-4">
                  <div className="mt-2 flex flex-col gap-3">
                    <Button
                      variant="ghost"
                      className="cursor-pointer bg-gradient-to-r from-blue-500/15 to-cyan-400/15 backdrop-blur-md border border-blue-200/30 shadow-lg hover:from-blue-500/25 hover:to-cyan-400/25 hover:shadow-blue-200/50 transition-all duration-300 font-semibold rounded-full relative overflow-hidden"
                      onClick={handleCreationCenterClick}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      <span className="flex items-center gap-1 text-foreground relative z-10">
                        创作中心
                        <Icon name="Plus" className="size-4 shrink-0" />
                      </span>
                    </Button>

                    {header.buttons?.map((item, i) => {
                      return (
                        <Button key={i} variant={item.variant}>
                          <Link
                            href={item.url as any}
                            target={item.target || ""}
                            className="flex items-center gap-1"
                          >
                            {item.title}
                            {item.icon && (
                              <Icon
                                name={item.icon}
                                className="size-4 shrink-0"
                              />
                            )}
                          </Link>
                        </Button>
                      );
                    })}

                    {header.show_sign && <SignToggle />}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {header.show_locale && <LocaleToggle />}
                    <div className="flex-1"></div>

                    {header.show_theme && <ThemeToggle />}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
