import Link from "next/link";
import React from "react";
import ThemeToggleButton from "@/components/ThemeToggleButton";

const Support = () => {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center text-center px-6 text-foreground bg-background relative">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggleButton />
      </div>
      <div className="text-6xl mb-4">📖</div>
      <h1 className="text-2xl font-semibold mb-2">Support not available yet</h1>
      {/* <p className="text-muted-foreground max-w-md">
        Thank you for your kindness and attempt to support Al-Juthur. We're still working on setting up the support system.
        Check back soon, or follow us for updates!
      </p> */}
      <Link
        href="https://github.com/s1ddiq"
        className="px-5 py-2 mt-4 bg-accent hover:opacity-90 text-accent-foreground rounded-xl text-sm font-medium transition"
      >
        Al-Juthur - Github
      </Link>
      <Link
        href="/home"
        className="px-5 py-2 mt-4 border border-border bg-card hover:bg-muted text-foreground rounded-xl text-sm font-medium transition"
      >
        Go back
      </Link>
    </div>
  );
};

export default Support;
