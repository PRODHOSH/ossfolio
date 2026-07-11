"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/home/Hero";
import { Features } from "@/components/home/Features";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Testimonials } from "@/components/home/Testimonials";
import { CTABanner } from "@/components/home/CTABanner";
import { AuthModal } from "@/components/auth/AuthModal";

export default function HomePage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  function openAuth(mode: "signin" | "signup") {
    setAuthMode(mode);
    setAuthOpen(true);
  }

  return (
    <>
      {/* HomePage mounts inside layout's ThemeProvider context */}
      <Navbar
        onSignIn={() => openAuth("signin")}
        onGetStarted={() => openAuth("signup")}
      />

      <main id="main-content">
        <Hero onGetStarted={() => openAuth("signup")} />
        <Features />
        <HowItWorks />
        <Testimonials />
        <CTABanner onGetStarted={() => openAuth("signup")} />
      </main>

      <Footer />

      <AuthModal
        key={authMode}
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        defaultMode={authMode}
      />
    </>
  );
}