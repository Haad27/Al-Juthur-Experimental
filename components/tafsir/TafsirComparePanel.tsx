"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Layers, Loader2, Plus, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TafsirTextRenderer from "@/components/tafsir/TafsirTextRenderer";
import { cn } from "@/lib/utils";

interface Author {
  id: number;
  name: string;
  authorName?: string;
  languageId: number;
}

interface Language {
  id: number;
  name: string;
  authors: Author[];
}

interface CompareAuthor {
  author: Author;
  languageName: string;
}

interface TafsirComparePanelProps {
  ayahIndex: number;
  ayahNumber: number;
  surahId: number;
  currentAuthorId: number;
  languages: Language[];
}

const COMPARE_STORAGE_KEY = "tafsir-compare-authors";

function loadPinnedIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

function savePinnedIds(ids: number[]) {
  try {
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(ids.slice(0, 6)));
  } catch {
    /* ignore */
  }
}

export default function TafsirComparePanel({
  ayahIndex,
  ayahNumber,
  surahId,
  currentAuthorId,
  languages,
}: TafsirComparePanelProps) {
  const catalog = useMemo<CompareAuthor[]>(() => {
    const list: CompareAuthor[] = [];
    languages.forEach((lang) => {
      (lang.authors || []).forEach((author) => {
        if (author.id !== currentAuthorId) {
          list.push({ author, languageName: lang.name });
        }
      });
    });
    return list;
  }, [languages, currentAuthorId]);

  const [pinnedIds, setPinnedIds] = useState<number[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("");
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<number | null>(null);

  useEffect(() => {
    setPinnedIds(loadPinnedIds().filter((id) => id !== currentAuthorId));
  }, [currentAuthorId]);

  const pinned = useMemo(
    () => catalog.filter((c) => pinnedIds.includes(c.author.id)).slice(0, 6),
    [catalog, pinnedIds]
  );

  useEffect(() => {
    if (pinned.length && !pinned.some((p) => String(p.author.id) === activeTab)) {
      setActiveTab(String(pinned[0].author.id));
    }
  }, [pinned, activeTab]);

  const fetchAuthorAyah = useCallback(
    async (authorId: number) => {
      const cacheKey = `${authorId}:${surahId}:${ayahIndex}`;
      if (texts[cacheKey]) return;
      setLoadingId(authorId);
      try {
        const res = await fetch(`/api/tafsir?authorId=${authorId}&surahId=${surahId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const entry = data.data[ayahIndex] || data.data.find((e: { ayah?: { numberInSurah?: number } }) => e.ayah?.numberInSurah === ayahNumber);
          setTexts((prev) => ({ ...prev, [cacheKey]: entry?.text || "" }));
        }
      } catch {
        /* keep empty */
      } finally {
        setLoadingId(null);
      }
    },
    [ayahIndex, ayahNumber, surahId, texts]
  );

  useEffect(() => {
    if (!activeTab) return;
    const id = Number(activeTab);
    if (id) fetchAuthorAyah(id);
  }, [activeTab, fetchAuthorAyah]);

  const togglePin = (id: number) => {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev.filter((x) => x !== id), id].slice(0, 6);
      savePinnedIds(next);
      if (!prev.includes(id)) setActiveTab(String(id));
      return next;
    });
  };

  const filteredCatalog = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog.slice(0, 40);
    return catalog
      .filter((c) => {
        const hay = `${c.author.name} ${c.author.authorName || ""} ${c.languageName}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 40);
  }, [catalog, query]);

  if (catalog.length === 0) return null;

  return (
    <Accordion type="single" collapsible className="mt-6 border-t border-border">
      <AccordionItem value="compare" className="border-b-0">
        <AccordionTrigger className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
          <span className="inline-flex items-center gap-2">
            <Layers className="size-3.5" />
            Compare other tafsirs
            {pinned.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                {pinned.length}
              </span>
            )}
          </span>
        </AccordionTrigger>
        <AccordionContent>
          {pinned.length === 0 ? (
            <p className="mb-3 text-xs text-muted-foreground">
              Pin up to 6 commentaries to read them side-by-side for this verse.
            </p>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-2">
              <TabsList className="justify-start">
                {pinned.map(({ author, languageName }) => (
                  <TabsTrigger key={author.id} value={String(author.id)} className="max-w-[10rem] truncate">
                    {author.name.replace(/\s*\([^)]*\)\s*$/, "").trim()}
                    <span className="ml-1 hidden text-[10px] opacity-60 sm:inline">{languageName}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              {pinned.map(({ author, languageName }) => {
                const cacheKey = `${author.id}:${surahId}:${ayahIndex}`;
                const isArabic = languageName.toLowerCase().includes("arabic") || languageName === "العربية";
                const isUrdu = languageName.toLowerCase().includes("urdu");
                return (
                  <TabsContent key={author.id} value={String(author.id)}>
                    <div className="flex items-center justify-between gap-2 border-b border-border pb-2 mb-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {author.name.replace(/\s*\([^)]*\)\s*$/, "").trim()}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{languageName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePin(author.id)}
                        className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Remove from comparison"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                    {loadingId === author.id && !texts[cacheKey] ? (
                      <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" />
                        Loading commentary…
                      </div>
                    ) : (
                      <div className="reading-measure reading-prose">
                        <TafsirTextRenderer
                          text={texts[cacheKey] || ""}
                          isArabic={isArabic}
                          isUrdu={isUrdu}
                          langName={languageName}
                          authorName={author.name}
                        />
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          )}

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
            >
              <Plus className="size-3.5" />
              {pickerOpen ? "Close picker" : "Add tafsir"}
            </button>
          </div>

          {pickerOpen && (
            <div className="mt-3 rounded-xl border border-border bg-card p-3">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tafsirs…"
                className="mb-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-0.5">
                {filteredCatalog.map(({ author, languageName }) => {
                  const selected = pinnedIds.includes(author.id);
                  return (
                    <button
                      key={`${languageName}-${author.id}`}
                      type="button"
                      onClick={() => togglePin(author.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                        selected ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-medium">{author.name.replace(/\s*\([^)]*\)\s*$/, "").trim()}</span>
                        <span className="ml-1.5 text-[10px] opacity-70">{languageName}</span>
                      </span>
                      {selected && <Check className="size-3.5 shrink-0 text-accent" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
