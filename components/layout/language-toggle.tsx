"use client";

import { useTranslation } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageToggle() {
  const { language, setLanguage, t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="h-9 px-2 gap-1.5 text-muted-foreground hover:text-foreground font-medium text-xs">
            <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="uppercase font-semibold">{language}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setLanguage("vi")}
          className={`gap-2 cursor-pointer font-medium ${language === "vi" ? "bg-accent font-semibold text-primary" : ""}`}
        >
          <span className="text-base">🇻🇳</span>
          <span>{t("lang.vi")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage("en")}
          className={`gap-2 cursor-pointer font-medium ${language === "en" ? "bg-accent font-semibold text-primary" : ""}`}
        >
          <span className="text-base">🇬🇧</span>
          <span>{t("lang.en")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
