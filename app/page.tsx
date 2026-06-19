import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { SocialProof } from "@/components/marketing/social-proof";
import { CTA } from "@/components/marketing/cta";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <Hero />
        <SocialProof />
        <Features />
        <CTA />
      </main>
      <MarketingFooter />
    </div>
  );
}
