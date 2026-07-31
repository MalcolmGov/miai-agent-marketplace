import { ComingSoon } from "@/components/ComingSoon";

export default function ScanPage() {
  return (
    <ComingSoon
      title="Scan my website"
      description="Paste your URL and we'll crawl pages into Knowledge, suggest the best agent family, and pre-fill brand tone for personalization."
      ctaHref="/personalize"
      ctaLabel="Personalize instead"
    />
  );
}
