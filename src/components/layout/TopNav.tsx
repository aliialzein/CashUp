"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "./navigation";

function isActive(pathname: string | null, item: NavItem): boolean {
  if (pathname === null) return false;
  return item.activePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function NavLinks({ items, pathname }: { items: NavItem[]; pathname: string | null }) {
  return (
    <nav aria-label="Main" className="flex">
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-16 items-center border-b-2 px-4 text-sm ${
              active
                ? "border-ink font-semibold text-ink"
                : "border-transparent font-medium text-muted hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** The links with the current page highlighted. It needs the browser address, so it sits inside Suspense. */
export function TopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return <NavLinks items={items} pathname={pathname} />;
}

/** The same links with no highlight, shown until the address is known. */
export function TopNavFallback({ items }: { items: NavItem[] }) {
  return <NavLinks items={items} pathname={null} />;
}





















// ## Error Message
// Route "/sales/[id]/complete": Next.js encountered URL data usePathname() in a Client Component outside of <Suspense>.

// This blocks prerendering because the value is only available at runtime.

// Ways to fix this:
//   - [stream] Wrap the component in <Suspense fallback={...}> so the hook value streams in after prerendering
//   - [block] Set export const instant = false to allow a blocking route

// Learn more: https://nextjs.org/docs/messages/blocking-prerender-client-hook

//     at TopNav (src/components/layout/TopNav.tsx:12:31)
//     at AppShell (src/components/layout/AppShell.tsx:30:13)
//     at DriverLayout (src/app/(driver)/layout.tsx:10:5)

// ## Code Frame
//   10 |
//   11 | export function TopNav({ items }: { items: NavItem[] }) {

// 12 |   const pathname = usePathname();

//      |                               ^
//   13 |
//   14 |   return (
//   15 |     <nav aria-label="Main" className="flex">

// Next.js version: 16.4.3 (Turbopack)


// "use client";

// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import type { NavItem } from "./navigation";

// function isActive(pathname: string, item: NavItem): boolean {
//   return item.activePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
// }

// export function TopNav({ items }: { items: NavItem[] }) {
//   const pathname = usePathname();

//   return (
//     <nav aria-label="Main" className="flex">
//       {items.map((item) => {
//         const active = isActive(pathname, item);
//         return (
//           <Link
//             key={item.href}
//             href={item.href}
//             aria-current={active ? "page" : undefined}
//             className={`flex h-16 items-center border-b-2 px-4 text-sm ${
//               active
//                 ? "border-ink font-semibold text-ink"
//                 : "border-transparent font-medium text-muted hover:text-ink"
//             }`}
//           >
//             {item.label}
//           </Link>
//         );
//       })}
//     </nav>
//   );
// }
