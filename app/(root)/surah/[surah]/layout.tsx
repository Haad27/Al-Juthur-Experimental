import Sidebar from "@/components/sidebar/Sidebar";
import React from "react";

const HomeLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="flex relative min-h-screen">
      <Sidebar />
      <section className="flex-1 min-w-0">{children}</section>
    </main>
  );
};

export default HomeLayout;
