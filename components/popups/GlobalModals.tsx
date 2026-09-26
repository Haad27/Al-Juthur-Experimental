"use client";

import React, { useEffect, useState } from "react";
import PricingModal from "./PricingModal";
import AuthModal from "@/components/auth/AuthModal";

export default function GlobalModals() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <AuthModal />
      {/* <PricingModal /> */}
    </>
  );
}
