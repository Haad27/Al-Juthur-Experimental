import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#121212] text-white flex justify-center py-24">
      <div className="w-full max-w-4xl px-8 flex flex-col gap-6">
        <h1 className="text-4xl font-bold text-emerald-500 mb-6">Privacy Policy</h1>
        
        <p className="text-gray-300 leading-relaxed">
          Last updated: 27/07/2026
        </p>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-white mt-4">1. Introduction</h2>
          <p className="text-gray-300 leading-relaxed">
            Welcome to Al-Juthur. This Privacy Policy is very simple because <strong>we do not collect any personal data</strong>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-white mt-4">2. Zero Data Collection</h2>
          <p className="text-gray-300 leading-relaxed">
            Al-Juthur is purely a service built for exploring authentic Tafsir, profound classical Lexicons, and an AI-powered RAG system. It has absolutely nothing to do with collecting your personal data. Your privacy is 100% protected while using our platform.
          </p>
          <p className="text-gray-300 leading-relaxed">
            We do not track you, we do not store your usage data, and we do not require you to provide any personal information to use the core features of the site.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-white mt-4">3. Contact Us</h2>
          <p className="text-gray-300 leading-relaxed">
            If you have any questions or comments, you may contact us by phone at:
            <br />
            <strong>+92 309 085 272</strong>
          </p>
        </section>
      </div>
    </div>
  );
}
