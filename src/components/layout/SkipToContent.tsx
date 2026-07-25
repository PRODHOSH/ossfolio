"use client";

import { useTranslations } from "next-intl";

export function SkipToContent() {
  const t = useTranslations("Navigation");

  return (
    <a
      href="#main-content"
      className="absolute left-[-9999px] top-0 z-[9999] rounded-br-md bg-primary px-5 py-3 text-sm font-semibold text-on-primary no-underline focus:left-0 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
    >
      {t("skipToMainContent") || "Skip to main content"}
    </a>
  );
}
