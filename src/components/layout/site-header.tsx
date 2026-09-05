"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/common/logo-mark";
import { ModeToggle } from "@/components/common/mode-toggle";
import { LABS_URL } from "@/config/site";

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-all duration-300",
        isScrolled
          ? "border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href={LABS_URL} className="flex items-center gap-2" aria-label="Back to Joween Labs">
          <LogoMark />
          <span className="hidden text-sm text-muted-foreground sm:inline">Back to Labs</span>
        </a>

        <ModeToggle />
      </div>
    </header>
  );
}
