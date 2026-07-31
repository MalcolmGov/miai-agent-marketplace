import { ComingSoon } from "@/components/ComingSoon";

export default function CreatePage() {
  return (
    <ComingSoon
      title="Build an agent instantly"
      description="Describe the job in plain language and we'll scaffold a custom agent from catalogue patterns — channels, tools, and guardrails included."
      ctaHref="/request"
      ctaLabel="Request custom instead"
    />
  );
}
