"use client";

import { useTranslations } from "next-intl";

export function SkipToContent() {
  const t = useTranslations("Navigation");

  return (
    <a
      href="#main-content"
      className="absolute left-[-9999px] top-0 z-[9999] rounded-br-lg bg-[#3ecf8e] px-5 py-3 text-sm font-semibold text-[#171717] no-underline focus:left-0 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3ecf8e]"
    >
      {t("skipToMainContent") || "Skip to main content"}
    </a>
  );
}
