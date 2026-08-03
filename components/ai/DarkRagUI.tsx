import React from 'react';
import { Network, Circle, Plus, Menu } from 'lucide-react';
import { fraunces, inter, amiri } from '@/app/fonts';

// The container for the AI response
export function ResponseContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className={`w-full max-w-[800px] bg-[#131b17] border border-[#1e2e25] rounded-[24px] p-6 sm:p-10 ${inter.className} shadow-xl shadow-black/20`}>
      {children}
    </div>
  );
}

// The eyebrow (e.g. ROOT · خ م ر)
export function ResponseEyebrow({ root }: { root: string }) {
  if (!root) return null;
  const letters = root.split('').join(' ');
  return (
    <div className="flex items-center gap-2 text-[#4ade80] text-[11px] font-bold tracking-[0.15em] uppercase mb-4">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-90"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      <span>ROOT · {letters}</span>
    </div>
  );
}

// The main heading
export function MainHeading({ children }: { children: React.ReactNode }) {
  return (
    <h1 className={`${fraunces.className} text-2xl sm:text-[34px] font-medium text-[#f3f4e8] mb-6 leading-[1.2]`}>
      {children}
    </h1>
  );
}

// Subheading H2
export function SubheadingH2({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mt-10 mb-5 group">
      <Circle className="w-5 h-5 text-[#5a8069] shrink-0" strokeWidth={2} />
      <h2 className={`${fraunces.className} text-xl sm:text-[22px] font-medium text-[#f3f4e8] m-0 tracking-tight`}>{children}</h2>
      <div className="flex-1 h-[1px] bg-gradient-to-r from-[#253b2f] to-transparent ml-3" />
    </div>
  );
}

// Subheading H3
export function SubheadingH3({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mt-10 mb-5 group">
      <Plus className="w-[18px] h-[18px] text-[#5a8069] shrink-0" strokeWidth={2.5} />
      <h3 className={`${fraunces.className} text-lg sm:text-[20px] font-medium text-[#f3f4e8] m-0 tracking-tight`}>{children}</h3>
      <div className="flex-1 h-[1px] bg-gradient-to-r from-[#253b2f] to-transparent ml-3" />
    </div>
  );
}

// Subheading H4
export function SubheadingH4({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mt-10 mb-5 group">
      <Menu className="w-[18px] h-[18px] text-[#5a8069] shrink-0" strokeWidth={2.5} />
      <h4 className={`${fraunces.className} text-lg sm:text-[19px] font-medium text-[#f3f4e8] m-0 tracking-tight`}>{children}</h4>
      <div className="flex-1 h-[1px] bg-gradient-to-r from-[#253b2f] to-transparent ml-3" />
    </div>
  );
}

// Footnote
export function FootnoteMarker({ index }: { index: number }) {
  return (
    <a 
      href={`#s${index}`}
      className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full border border-[#2b593f] bg-transparent text-[#4db57f] text-[10px] font-semibold mx-[3px] px-1 no-underline hover:bg-[#2b593f] transition-colors cursor-pointer align-middle relative -top-[2px]"
    >
      {index}
    </a>
  );
}

// Verse Panel
export function DarkVersePanel({ arabic, english, reference }: { arabic: string; english?: string; reference?: string }) {
  return (
    <div className="rounded-[16px] border border-[#253b2f] bg-[#16231c] p-6 sm:p-8 my-8 flex flex-col gap-4 shadow-sm relative overflow-hidden">
      <div className={`${amiri.className} text-right text-[26px] sm:text-[32px] text-[#f3f4e8] leading-[2.4]`} dir="rtl">
        {arabic}
      </div>
      {english && (
        <div className={`${fraunces.className} italic text-[#a4b5aa] text-[16px] sm:text-[17px] leading-[1.7] mt-3`}>
          "{english}"
        </div>
      )}
      {reference && (
        <div className="text-[#43b581] text-[10px] font-bold tracking-[0.15em] uppercase mt-4">
          {reference}
        </div>
      )}
    </div>
  );
}
