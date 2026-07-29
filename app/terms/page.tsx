import React from "react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#121212] text-white flex justify-center py-24">
      <div className="w-full max-w-4xl px-8 flex flex-col gap-6">
        <h1 className="text-4xl font-bold text-emerald-500 mb-6">Terms of Service</h1>
        
        <p className="text-gray-300 leading-relaxed">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-white mt-4">1. Agreement to Terms</h2>
          <p className="text-gray-300 leading-relaxed">
            These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity (“you”) and Al-Juthur ("we," "us" or "our"), concerning your access to and use of our website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-white mt-4">2. Intellectual Property Rights</h2>
          <p className="text-gray-300 leading-relaxed">
            Unless otherwise indicated, the website is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the website (collectively, the “Content”) and the trademarks, service marks, and logos contained therein (the “Marks”) are owned or controlled by us or licensed to us.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-white mt-4">3. User Representations</h2>
          <p className="text-gray-300 leading-relaxed">
            By using the website, you represent and warrant that: (1) you have the legal capacity and you agree to comply with these Terms of Service; (2) you are not a minor in the jurisdiction in which you reside; (3) you will not access the website through automated or non-human means, whether through a bot, script, or otherwise; (4) you will not use the website for any illegal or unauthorized purpose; and (5) your use of the website will not violate any applicable law or regulation.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-white mt-4">4. Prohibited Activities</h2>
          <p className="text-gray-300 leading-relaxed">
            You may not access or use the website for any purpose other than that for which we make the website available. The website may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-white mt-4">5. Contact Us</h2>
          <p className="text-gray-300 leading-relaxed">
            In order to resolve a complaint regarding the website or to receive further information regarding use of the website, please contact us at:
            <br />
            <strong>+92 309 085 272</strong>
          </p>
        </section>
      </div>
    </div>
  );
}
