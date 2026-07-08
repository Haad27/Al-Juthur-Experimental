"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, ScrollText, Library } from "lucide-react";

const BottomNav = () => {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: <Home className="w-6 h-6" />,
    },
    {
      label: "Surah",
      href: "/surah/1",
      icon: <BookOpen className="w-6 h-6" />,
    },
    {
      label: "Tafsir",
      href: "#",
      icon: <ScrollText className="w-6 h-6" />,
    },
    {
      label: "Lexicon",
      href: "#",
      icon: <Library className="w-6 h-6" />,
    },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-50 md:hidden bg-zinc-900 border-t border-[#262629ff] pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname?.startsWith("/surah/") && item.label === "Surah");
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? "text-blue-500" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
