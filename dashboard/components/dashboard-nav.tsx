"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";


const links = [
  {
    label: "Overview",
    href: "/",
  },
  {
    label: "Demand Patterns",
    href: "/demand-patterns",
  },
  {
    label: "Forecast Performance",
    href: "/forecast-performance",
  },
];


export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav
      className="
        mb-6
        flex
        gap-1
        overflow-x-auto
        border-b
        border-neutral-200
        dark:border-neutral-800
      "
    >
      {links.map((link) => {
        const active =
          pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`
              whitespace-nowrap
              border-b-2
              px-3
              py-3
              text-sm
              font-medium
              transition-colors

              ${
                active
                  ? `
                    border-neutral-900
                    text-neutral-900
                    dark:border-neutral-100
                    dark:text-neutral-100
                  `
                  : `
                    border-transparent
                    text-neutral-500
                    hover:text-neutral-900
                    dark:text-neutral-400
                    dark:hover:text-neutral-100
                  `
              }
            `}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}