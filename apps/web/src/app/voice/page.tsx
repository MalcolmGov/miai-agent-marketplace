import type { Metadata } from "next";
import { VoiceStudioExperience } from "@/components/VoiceStudioExperience";

export const metadata: Metadata = {
  title: "Zara Voice Studio — Real-Time Neural Agent Forge",
  description: "Speak naturally to Zara to compile and deploy custom enterprise AI agents in real time with ElevenLabs streaming and sub-second synthesis.",
};

export default function VoiceStudioPage() {
  return <VoiceStudioExperience />;
}
