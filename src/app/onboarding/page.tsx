import type { Metadata } from "next";
import { OnboardingFlow } from "../../components/onboarding/onboarding-flow";

export const metadata: Metadata = {
  title: "Getting started | ThinkPin",
  description: "Set up your ThinkPin internet memory.",
};

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
