"use client";

import React, { useState, useEffect } from "react";
import TopicSearchModal from "./TopicSearchModal";
import { useRouter } from "next/navigation";

export default function GlobalTopicSearchProvider() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-global-topic-modal", handleOpen);
    return () => window.removeEventListener("open-global-topic-modal", handleOpen);
  }, []);

  if (!isOpen) return null;

  return (
    <TopicSearchModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      mode="quran"
      onSelectAyah={(ayahNumber, toAyah, resultSurahId) => {
        if (resultSurahId) {
          router.push(`/surah/${resultSurahId}?ayah=${ayahNumber}`);
        }
      }}
    />
  );
}
