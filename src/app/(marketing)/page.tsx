import { redirect } from "next/navigation";
import { HeroSection } from "../../components/hero-section";
import { HowItWorksSection } from "../../components/how-it-works-section";
import { IntelligenceSection } from "../../components/intelligence-section";
import { AskLibrarySection } from "../../components/ask-library-section";
import { TrustSection } from "../../components/trust-section";
import { ProductShowcase } from "../../components/product-showcase";
import { UseCasesSection } from "../../components/use-cases-section";
import { MemorySection } from "../../components/memory-section";
import { TimelineSection } from "../../components/timeline-section";
import { CTASection } from "../../components/cta-section";
import { FAQSection } from "../../components/faq-section";
import { createClient } from "../../lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error) {
    console.warn("Could not check the session before rendering the homepage.", error);
  }
  if (data?.claims?.sub) {
    redirect("/app");
  }

  return (
    <main>
      <HeroSection />
      <TrustSection />
      <HowItWorksSection />
      <IntelligenceSection />
      <AskLibrarySection />
      <ProductShowcase />
      <UseCasesSection />
      <MemorySection />
      <TimelineSection />
      <CTASection />
      <FAQSection />
    </main>
  );
}
