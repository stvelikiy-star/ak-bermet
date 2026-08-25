"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

const INTERNAL_PREFIXES = [
  "/manager",
  "/staff",
  "/housekeeping",
  "/technician",
  "/auth",
];

function isInternalPath(pathname: string): boolean {
  return INTERNAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function ConditionalSiteChrome({
  header,
  footer,
  aiChat,
  intro,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  aiChat: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();

  if (isInternalPath(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      {intro}
      {header}
      {children}
      {footer}
      {aiChat}
    </>
  );
}
