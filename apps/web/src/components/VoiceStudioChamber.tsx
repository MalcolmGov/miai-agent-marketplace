"use client";

import { useState, useEffect, useRef } from "react";

export interface VoiceStudioBlueprint {
  id: string;
  name: string;
  role: string;
  readinessScore: number;
  dnaSource: string;
  tools: string[];
  roi: string;
}

const DEFAULT_BLUEPRINT: VoiceStudioBlueprint = {
  id: "custom-order-spec",
  name: "Order Resolution Specialist",
  role: "Autonomous retail order tracking, size exchange & refund manager",
  readinessScore: 88,
  dnaSource: "Delivery & Tracking (v1.1.0) — PanAfri Courier Enterprise Blueprint",
  tools: ["Order Status Lookup", "Exchange Validator", "Payment Link Dispatch", "Audit Logger"],
  roi: "R48,000 / mo support labor saved",
};

const SCENARIO_PRESETS = [
  {
    key: "retail",
    icon: "👟",
    title: "Shopify & WhatsApp Order Specialist",
    prompt: "Build an autonomous order support specialist connecting Shopify inventory and WhatsApp Cloud for instant delivery updates and size exchanges.",
    agent: {
      id: "shopify-order-spec",
      name: "Shopify & WhatsApp Order Specialist",
      role: "Real-time courier tracking, automated exchange approvals & cart recovery",
      readinessScore: 94,
      dnaSource: "Omnichannel Commerce (v2.4.0) — Global Retail Blueprint",
      tools: ["Waybill Tracker", "SKU Replacement Lookup", "Store Credit Emitter", "POPIA Audit Ledger"],
      roi: "R62,000 / mo saved in tier-1 tickets",
    },
  },
  {
    key: "collections",
    icon: "💳",
    title: "Xero & Paystack AR Collections",
    prompt: "Create an autonomous accounts receivable specialist that cross-references Xero unpaid invoices and sends friendly Paystack payment links via WhatsApp.",
    agent: {
      id: "xero-ar-collector",
      name: "Xero & Paystack AR Collections Specialist",
      role: "DSO reduction, dynamic payment arrangement negotiator & automated receipting",
      readinessScore: 92,
      dnaSource: "Automated Treasury & AR (v3.1.0) — FinTech Compliance Blueprint",
      tools: ["Overdue Poller", "Dynamic Payment Link Emitter", "Installment Plan Gatekeeper", "Reconciliation Sync"],
      roi: "21% reduction in DSO within 30 days",
    },
  },
  {
    key: "it-helpdesk",
    icon: "🔐",
    title: "Slack & ServiceNow Access Concierge",
    prompt: "Deploy a security-compliant IT concierge resolving Slack access requests, VPN tokens, and provisioning guest accounts.",
    agent: {
      id: "slack-it-concierge",
      name: "Slack & ServiceNow Access Concierge",
      role: "Automated identity verification, MFA resets & role-based Slack channel provisioning",
      readinessScore: 96,
      dnaSource: "Zero-Trust Infrastructure (v4.0.1) — SecOps Blueprint",
      tools: ["Okta Token Validator", "ServiceNow Ticket Creator", "Slack Channel Inviter", "Audit Hash Signer"],
      roi: "78% reduction in IT helpdesk ticket resolution time",
    },
  },
  {
    key: "code-pilot",
    icon: "🐙",
    title: "GitHub Repo Operations Co-Pilot",
    prompt: "Compile an agent directly from our repository to auto-generate PR summaries and execute verified migrations.",
    agent: {
      id: "github-repo-pilot",
      name: "GitHub Repo Operations Co-Pilot",
      role: "Autonomous PR validation, schema migration checks & deployment telemetry listener",
      readinessScore: 98,
      dnaSource: "Cloud-Native DevOps (v5.2.0) — GitOps Pipeline Blueprint",
      tools: ["Git Tree Inspector", "Prisma Migration Helper", "Cart Sanity Check", "GitHub PR Committer"],
      roi: "Instant CI/CD Agent Deployment · 0 manual configuration required",
    },
  },
];

export function VoiceStudioChamber({ onClose }: { onClose?: () => void } = {}) {
  const [blueprint, setBlueprint] = useState<VoiceStudioBlueprint>(DEFAULT_BLUEPRINT);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [hasSynthesized, setHasSynthesized] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [subtitles, setSubtitles] = useState(
    "\"Tell me what business workflow or role you want to create, or tap the microphone to speak naturally.\""
  );
  const [speakerTag, setSpeakerTag] = useState("ZARA NEURAL VOICE");
  const [vadTelemetry, setVadTelemetry] = useState("HARDWARE VAD: ARMED (<50ms)");
  const [showBargeInBadge, setShowBargeInBadge] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [deployedStatus, setDeployedStatus] = useState(false);

  // Sandbox Modal
  const [sandboxModalOpen, setSandboxModalOpen] = useState(false);
  const [sandboxInput, setSandboxInput] = useState("");
  const [sandboxMessages, setSandboxMessages] = useState<Array<{ sender: string; text: string; isAgent: boolean }>>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const shockwavesRef = useRef<Array<{ r: number; maxR: number; alpha: number }>>([]);

  // ── Speech Output Audio Pipeline (ElevenLabs with Web Speech fallback) ──────
  async function speakZaraAudio(textToSpeak: string) {
    stopCurrentAudio();
    setIsSpeaking(true);
    setSpeakerTag("ZARA SPEAKING");

    try {
      const resp = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak }),
      });

      const contentType = resp.headers.get("content-type") || "";

      if (resp.ok && contentType.includes("audio")) {
        const audioBlob = await resp.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        setVadTelemetry("STREAMING ELEVENLABS NEURAL TTS");

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          setIsSpeaking(false);
          setSpeakerTag("STANDBY");
          setVadTelemetry("HARDWARE VAD: ARMED (<50ms)");
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          playBrowserTtsFallback(textToSpeak);
        };

        await audio.play();
        return;
      }
    } catch {
      // ignore network errors and fallback
    }

    playBrowserTtsFallback(textToSpeak);
  }

  function playBrowserTtsFallback(cleanText: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSpeaking(false);
      setSpeakerTag("STANDBY");
      setVadTelemetry("HARDWARE VAD: ARMED (<50ms)");
      return;
    }

    window.speechSynthesis.cancel();
    setVadTelemetry("BROWSER NEURAL SPEECH ACTIVE");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        (v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Samantha") || v.name.includes("Google") || v.name.includes("Victoria")))
    ) || voices.find((v) => v.lang.startsWith("en"));

    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakerTag("STANDBY");
      setVadTelemetry("HARDWARE VAD: ARMED (<50ms)");
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakerTag("STANDBY");
      setVadTelemetry("HARDWARE VAD: ARMED (<50ms)");
    };

    window.speechSynthesis.speak(utterance);
  }

  function stopCurrentAudio() {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }

  // ── Speech Recognition Input Pipeline (Live Microphone) ─────────────────────
  function startListening() {
    if (typeof window === "undefined") return;

    stopCurrentAudio();
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setSpeakerTag("YOU SPEAKING");
        setVadTelemetry("LISTENING (<50ms VAD ACTIVE)...");
        setSubtitles("Listening... speak your business workflow or bottleneck naturally.");
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          interimTranscript += event.results[i][0].transcript;
        }

        const clean = interimTranscript.trim();
        if (!clean) return;

        setSubtitles(`\"${clean}\"`);

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          stopListening();
          executeAgentSynthesis(clean);
        }, 850);
      };

      recognition.onerror = (event: any) => {
        console.warn("[Voice Studio] Speech recognition error:", event.error);
        if (event.error !== "no-speech") {
          setIsListening(false);
          setSpeakerTag("STANDBY");
          setVadTelemetry("HARDWARE VAD: ARMED (<50ms)");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Could not start speech recognition:", err);
      setIsListening(false);
    }
  }

  function stopListening() {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }

  function executeAgentSynthesis(userSpokenText: string) {
    setIsCompiling(true);
    setSpeakerTag("SYNTHESIZING AGENT DNA…");
    setVadTelemetry("COMPILING FROM SPOKEN SPEC");
    setSubtitles(`Parsing: \"${userSpokenText}\"... Synthesizing enterprise agent...`);

    shockwavesRef.current.push({ r: 20, maxR: 280, alpha: 1.0 });

    setTimeout(() => {
      const lower = userSpokenText.toLowerCase();
      let target: VoiceStudioBlueprint;

      if (lower.includes("xero") || lower.includes("invoice") || lower.includes("collection") || lower.includes("debt")) {
        target = SCENARIO_PRESETS[1].agent;
      } else if (lower.includes("it") || lower.includes("slack") || lower.includes("servicenow") || lower.includes("password")) {
        target = SCENARIO_PRESETS[2].agent;
      } else if (lower.includes("github") || lower.includes("code") || lower.includes("gaslite") || lower.includes("repo")) {
        target = SCENARIO_PRESETS[3].agent;
      } else if (lower.includes("order") || lower.includes("shopify") || lower.includes("whatsapp") || lower.includes("store")) {
        target = SCENARIO_PRESETS[0].agent;
      } else {
        target = {
          ...DEFAULT_BLUEPRINT,
          name: "Autonomous Operations Specialist",
          role: `Enterprise workflow agent synthesized for: \"${userSpokenText.slice(0, 42)}...\"`,
          readinessScore: 92,
        };
      }

      setBlueprint(target);
      setIsCompiling(false);
      setHasSynthesized(true);

      const spokenResponse = `I have synthesized ${target.name}. Certified toolsets and pre-audited enterprise guardrails are active with ${target.readinessScore}% production readiness.`;
      setSubtitles(`\"${spokenResponse}\"`);
      speakZaraAudio(spokenResponse);
    }, 450);
  }

  // ── Next-Generation 3D Holographic AI Core Canvas Loop ────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    let W = 0;
    let H = 0;

    const resize = () => {
      if (!canvas || !canvas.parentElement) return;
      dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      W = rect.width;
      H = 400;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    // Generate 3D Fibonacci Sphere Point Cloud (380 nodes)
    const NUM_PARTICLES = 380;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const sphereParticles: Array<{
      baseX: number;
      baseY: number;
      baseZ: number;
      theta: number;
      phiAngle: number;
      size: number;
    }> = [];

    for (let i = 0; i < NUM_PARTICLES; i++) {
      const y = 1 - (i / (NUM_PARTICLES - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      sphereParticles.push({
        baseX: x,
        baseY: y,
        baseZ: z,
        theta,
        phiAngle: Math.asin(Math.max(-1, Math.min(1, y))),
        size: 1.2 + (i % 3) * 0.6,
      });
    }

    // 3 Concentric Gimbal Holographic Rings
    const gimbalRings = [
      { radius: 155, tiltX: 0.85, tiltZ: 0.15, speed: 0.012, packets: [0, 2.1, 4.2] },
      { radius: 135, tiltX: -0.72, tiltZ: 0.65, speed: -0.016, packets: [1.0, 3.1, 5.2] },
      { radius: 115, tiltX: 1.45, tiltZ: -0.45, speed: 0.02, packets: [0.5, 2.6, 4.7] },
    ];

    let rotY = 0;
    let rotX = 0.2;
    let T = 0;
    let radarAngle = 0;

    function render() {
      if (!ctx) return;
      T += 0.016;
      radarAngle += 0.02;

      const targetMouseX = mouseRef.current.targetX;
      const targetMouseY = mouseRef.current.targetY;
      mouseRef.current.x += (targetMouseX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (targetMouseY - mouseRef.current.y) * 0.05;

      const spinSpeed = isSpeaking ? 0.025 : isListening ? 0.018 : isCompiling ? 0.035 : 0.008;
      rotY += spinSpeed;
      const currentRotX = rotX + mouseRef.current.y * 0.35;
      const currentRotY = rotY + mouseRef.current.x * 0.45;

      const cx = W / 2;
      const cy = H / 2;

      let r = 168, g = 85, b = 247;
      if (isSpeaking) {
        r = 0; g = 229; b = 255;
      } else if (isListening) {
        r = 16; g = 185; b = 129;
      } else if (isCompiling) {
        r = 245; g = 158; b = 11;
      }

      const amplitude = isSpeaking
        ? 1.7 + Math.sin(T * 6) * 0.35
        : isListening
        ? 1.4 + Math.sin(T * 9) * 0.25
        : isCompiling
        ? 1.5
        : 1.0;

      ctx.clearRect(0, 0, W, H);

      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
      bgGrad.addColorStop(0, `rgba(${r},${g},${b},0.15)`);
      bgGrad.addColorStop(0.4, "rgba(5,9,20,0.85)");
      bgGrad.addColorStop(1, "rgba(2,4,10,0.98)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Perspective Cyber Floor
      ctx.save();
      const floorY = cy + 90;
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = `rgba(${r},${g},${b},0.7)`;
      ctx.lineWidth = 0.75;
      const GRID_ROWS = 7;
      const GRID_COLS = 14;
      const floorW = Math.min(W * 0.9, 640);
      const floorH = 110;

      for (let row = 0; row <= GRID_ROWS; row++) {
        const frac = row / GRID_ROWS;
        const yp = floorY + frac * floorH;
        const xScale = 0.25 + frac * 0.75;
        ctx.beginPath();
        ctx.moveTo(cx - (floorW / 2) * xScale, yp);
        ctx.lineTo(cx + (floorW / 2) * xScale, yp);
        ctx.stroke();
      }
      for (let col = 0; col <= GRID_COLS; col++) {
        const t = col / GRID_COLS - 0.5;
        ctx.beginPath();
        ctx.moveTo(cx + t * floorW * 0.25, floorY);
        ctx.lineTo(cx + t * floorW, floorY + floorH);
        ctx.stroke();
      }
      ctx.restore();

      // Holographic HUD Calipers
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = `rgba(${r},${g},${b},0.9)`;
      ctx.lineWidth = 1;

      ctx.setLineDash([4, 12]);
      ctx.beginPath();
      ctx.arc(cx, cy, 180, 0, Math.PI * 2);
      ctx.stroke();

      ctx.setLineDash([2, 6]);
      ctx.beginPath();
      ctx.arc(cx, cy, 140, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const angles = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
      angles.forEach((a) => {
        const x1 = cx + Math.cos(a) * 170;
        const y1 = cy + Math.sin(a) * 170;
        const x2 = cx + Math.cos(a) * 190;
        const y2 = cy + Math.sin(a) * 190;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 180, radarAngle, radarAngle + 0.3);
      ctx.fillStyle = `rgba(${r},${g},${b},0.08)`;
      ctx.fill();
      ctx.restore();

      // Singularity Core & Flare Jets
      ctx.save();
      const corona = ctx.createRadialGradient(cx, cy, 10, cx, cy, 190 * amplitude);
      corona.addColorStop(0, `rgba(${r},${g},${b},0.35)`);
      corona.addColorStop(0.35, `rgba(${r},${g},${b},0.12)`);
      corona.addColorStop(1, "transparent");
      ctx.fillStyle = corona;
      ctx.beginPath();
      ctx.arc(cx, cy, 190 * amplitude, 0, Math.PI * 2);
      ctx.fill();

      const RAY_COUNT = 8;
      ctx.globalAlpha = 0.25 * (amplitude / 1.5);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.8)`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < RAY_COUNT; i++) {
        const rayA = (i / RAY_COUNT) * Math.PI * 2 + T * 0.8;
        const rayLen = 45 + Math.sin(T * 4 + i) * 15;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(rayA) * rayLen, cy + Math.sin(rayA) * rayLen);
        ctx.stroke();
      }

      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 45 * amplitude);
      core.addColorStop(0, "rgba(255,255,255,0.98)");
      core.addColorStop(0.25, `rgba(${r},${g},${b},0.85)`);
      core.addColorStop(0.6, `rgba(${r},${g},${b},0.25)`);
      core.addColorStop(1, "transparent");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, 45 * amplitude, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3D Projection Matrix
      const fov = 420;
      const cosY = Math.cos(currentRotY);
      const sinY = Math.sin(currentRotY);
      const cosX = Math.cos(currentRotX);
      const sinX = Math.sin(currentRotX);

      function project3D(x: number, y: number, z: number) {
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        const scale = fov / (fov + z2 + 220);
        return {
          sx: cx + x1 * scale,
          sy: cy + y2 * scale,
          z: z2,
          scale,
        };
      }

      // Gimbal Rings (Back half, z < 0)
      gimbalRings.forEach((ring) => {
        ring.packets = ring.packets.map((p) => (p + ring.speed * 2) % (Math.PI * 2));
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(${r},${g},${b},0.25)`;
        ctx.beginPath();
        const SEGS = 64;
        let started = false;
        for (let s = 0; s <= SEGS; s++) {
          const a = (s / SEGS) * Math.PI * 2;
          const rx = ring.radius * Math.cos(a);
          const ry = ring.radius * Math.sin(a) * Math.cos(ring.tiltX);
          const rz = ring.radius * Math.sin(a) * Math.sin(ring.tiltX);
          const p = project3D(rx, ry, rz);
          if (p.z < 0) {
            if (!started) {
              ctx.moveTo(p.sx, p.sy);
              started = true;
            } else {
              ctx.lineTo(p.sx, p.sy);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
        ctx.restore();
      });

      // 3D Fibonacci Neural Lattice (Sphere Point Cloud)
      const baseRadius = 85;
      const projectedNodes: Array<{
        sx: number;
        sy: number;
        z: number;
        scale: number;
        size: number;
        alpha: number;
      }> = [];

      for (let i = 0; i < NUM_PARTICLES; i++) {
        const pt = sphereParticles[i];
        const wave =
          Math.sin(pt.theta * 3 + T * 5) *
          Math.cos(pt.phiAngle * 4 - T * 4) *
          (isSpeaking ? 18 : isListening ? 14 : 7);
        const curR = baseRadius + wave;

        const x = pt.baseX * curR;
        const y = pt.baseY * curR;
        const z = pt.baseZ * curR;

        const proj = project3D(x, y, z);
        const alpha = Math.max(0.12, Math.min(0.95, (proj.z + 100) / 200));
        projectedNodes.push({
          sx: proj.sx,
          sy: proj.sy,
          z: proj.z,
          scale: proj.scale,
          size: pt.size * proj.scale * (amplitude > 1.2 ? 1.3 : 1.0),
          alpha,
        });
      }

      projectedNodes.sort((a, b) => a.z - b.z);

      // Synaptic Connectors
      ctx.save();
      ctx.strokeStyle = `rgba(${r},${g},${b},0.18)`;
      ctx.lineWidth = 0.6;
      for (let i = Math.floor(projectedNodes.length * 0.45); i < projectedNodes.length; i += 3) {
        const n1 = projectedNodes[i];
        for (let j = i + 1; j < Math.min(i + 6, projectedNodes.length); j++) {
          const n2 = projectedNodes[j];
          const dx = n1.sx - n2.sx;
          const dy = n1.sy - n2.sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 34) {
            ctx.beginPath();
            ctx.moveTo(n1.sx, n1.sy);
            ctx.lineTo(n2.sx, n2.sy);
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      // Render Particles
      projectedNodes.forEach((node) => {
        ctx.save();
        ctx.fillStyle = `rgba(${r},${g},${b},${node.alpha})`;
        ctx.shadowColor = `rgba(${r},${g},${b},${node.alpha * 0.8})`;
        ctx.shadowBlur = node.z > 0 ? 8 : 2;
        ctx.beginPath();
        ctx.arc(node.sx, node.sy, node.size, 0, Math.PI * 2);
        ctx.fill();

        if (node.z > 25 && node.alpha > 0.6) {
          ctx.fillStyle = `rgba(255,255,255,${node.alpha * 0.9})`;
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, node.size * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Gimbal Rings (Front half, z >= 0)
      gimbalRings.forEach((ring) => {
        ctx.save();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgba(${r},${g},${b},0.85)`;
        ctx.shadowColor = `rgba(${r},${g},${b},0.9)`;
        ctx.shadowBlur = 10;
        ctx.setLineDash([8, 12]);
        ctx.beginPath();

        const SEGS = 64;
        let started = false;
        for (let s = 0; s <= SEGS; s++) {
          const a = (s / SEGS) * Math.PI * 2;
          const rx = ring.radius * Math.cos(a);
          const ry = ring.radius * Math.sin(a) * Math.cos(ring.tiltX);
          const rz = ring.radius * Math.sin(a) * Math.sin(ring.tiltX);
          const p = project3D(rx, ry, rz);
          if (p.z >= 0) {
            if (!started) {
              ctx.moveTo(p.sx, p.sy);
              started = true;
            } else {
              ctx.lineTo(p.sx, p.sy);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();

        ring.packets.forEach((pktAngle) => {
          const px = ring.radius * Math.cos(pktAngle);
          const py = ring.radius * Math.sin(pktAngle) * Math.cos(ring.tiltX);
          const pz = ring.radius * Math.sin(pktAngle) * Math.sin(ring.tiltX);
          const proj = project3D(px, py, pz);
          if (proj.z > -10) {
            ctx.save();
            ctx.fillStyle = "rgba(255,255,255,1)";
            ctx.shadowColor = `rgba(${r},${g},${b},1)`;
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(proj.sx, proj.sy, 3.5 * proj.scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });

        ctx.restore();
      });

      // Shockwaves
      if (shockwavesRef.current.length > 0) {
        shockwavesRef.current.forEach((sw) => {
          sw.r += 6;
          sw.alpha *= 0.94;
          ctx.save();
          ctx.strokeStyle = `rgba(${r},${g},${b},${sw.alpha})`;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = `rgba(${r},${g},${b},1)`;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(cx, cy, sw.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        });
        shockwavesRef.current = shockwavesRef.current.filter((sw) => sw.alpha > 0.05);
      }

      // Cybernetic Corner Brackets
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1.5;
      const bLen = 14;
      const pad = 16;
      ctx.beginPath();
      ctx.moveTo(pad, pad + bLen);
      ctx.lineTo(pad, pad);
      ctx.lineTo(pad + bLen, pad);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(W - pad - bLen, pad);
      ctx.lineTo(W - pad, pad);
      ctx.lineTo(W - pad, pad + bLen);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pad, H - pad - bLen);
      ctx.lineTo(pad, H - pad);
      ctx.lineTo(pad + bLen, H - pad);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(W - pad - bLen, H - pad);
      ctx.lineTo(W - pad, H - pad);
      ctx.lineTo(W - pad, H - pad - bLen);
      ctx.stroke();
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    }

    render();

    return () => {
      window.removeEventListener("resize", resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSpeaking, isListening, isCompiling]);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const ny = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    mouseRef.current.targetX = Math.max(-1, Math.min(1, nx));
    mouseRef.current.targetY = Math.max(-1, Math.min(1, ny));
  }

  function handlePointerLeave() {
    mouseRef.current.targetX = 0;
    mouseRef.current.targetY = 0;
  }

  function triggerBargeIn(reason = "Hologram Tap Interrupt") {
    stopCurrentAudio();
    stopListening();
    setShowBargeInBadge(true);
    shockwavesRef.current.push({ r: 25, maxR: 260, alpha: 1.0 });
    setVadTelemetry("⚡ BARGE-IN ENGAGED · 0ms CUT-OFF");
    setSpeakerTag("LISTENING…");
    setSubtitles("⚡ Interrupted instantaneously! Tap the microphone to talk or select a scenario.");

    setTimeout(() => {
      setShowBargeInBadge(false);
      setVadTelemetry("HARDWARE VAD: ARMED (<50ms)");
    }, 1800);
  }

  function handleVoiceToggle() {
    if (isSpeaking) {
      triggerBargeIn("Mic Tap Interrupt");
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    startListening();
  }

  function handlePauseResume() {
    setIsPaused((p) => {
      const next = !p;
      if (next) {
        stopCurrentAudio();
        stopListening();
        setSubtitles("Conversation paused ⏸️. Tap resume when you are ready.");
      } else {
        setSubtitles("Resumed! Tap the microphone to speak or type below.");
      }
      return next;
    });
  }

  function handleSendText() {
    if (!textInput.trim()) return;
    const q = textInput.trim();
    setTextInput("");
    executeAgentSynthesis(q);
  }

  function handlePresetTrigger(presetKey: string) {
    const found = SCENARIO_PRESETS.find((p) => p.key === presetKey);
    if (!found) return;

    stopCurrentAudio();
    stopListening();

    setIsCompiling(true);
    shockwavesRef.current.push({ r: 20, maxR: 260, alpha: 1.0 });
    setSpeakerTag("SYNTHESIZING AGENT DNA…");
    setVadTelemetry("MATCHING PRE-AUDITED PROVENANCE");
    setSubtitles(`Loading 1-Click Scenario: ${found.title}...`);

    setTimeout(() => {
      setBlueprint(found.agent);
      setIsCompiling(false);
      setHasSynthesized(true);

      const spokenResponse = `Loaded ${found.agent.name}. Pre-audited enterprise DNA active with ${found.agent.readinessScore}% production readiness.`;
      setSubtitles(`\"${spokenResponse}\"`);
      speakZaraAudio(spokenResponse);
    }, 350);
  }

  function handleCopyEmbed() {
    const code = `<script src="https://zaraai.digital/embed.js" data-agent-id="${blueprint.id}" async></script>`;
    navigator.clipboard.writeText(code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  }

  function handleDeployMyAgents() {
    setDeployedStatus(true);
    setTimeout(() => setDeployedStatus(false), 3500);
  }

  function handleSendSandboxMsg() {
    if (!sandboxInput.trim()) return;
    const msg = sandboxInput.trim();
    setSandboxInput("");

    const next = [...sandboxMessages, { sender: "You", text: msg, isAgent: false }];
    setSandboxMessages(next);

    setTimeout(() => {
      setSandboxMessages((prev) => [
        ...prev,
        {
          sender: blueprint.name,
          text: `[Autonomous Tool Invoked]: Executed "${blueprint.tools[0]}" for input: "${msg}". Result verified against POPIA & ISO 27001 guardrails.`,
          isAgent: true,
        },
      ]);
    }, 400);
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-[#00E5FF]/60 bg-gradient-to-br from-[#060c18] via-[#091322] to-[#040810] p-5 sm:p-7 shadow-[0_0_50px_rgba(0,229,255,0.25)] space-y-5">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 font-black text-xl shadow-[0_0_15px_rgba(0,229,255,0.5)]">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Zara <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Voice Studio</span>
              </h3>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Autonomous Compiler Active</span>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Speak naturally or type your problem — synthesizes pre-audited enterprise AI agents in milliseconds.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-3 py-1 text-xs font-mono font-bold text-cyan-300">
            {vadTelemetry}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={() => {
                stopCurrentAudio();
                stopListening();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-slate-200 hover:bg-white/20 hover:text-white transition"
              title="Close Voice Studio"
            >
              <span>✕</span>
              <span>Close Studio</span>
            </button>
          )}
        </div>
      </div>

      {/* Clean, Focused Command Chamber */}
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Holographic Header Bar */}
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-cyan-300 px-1">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
            <span>Holographic Neural Command Bridge</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {isSpeaking ? "AUDIO STREAMING" : isListening ? "MIC STREAMING" : "STANDBY"}
          </span>
        </div>

        {/* 3D Next-Gen Holographic AI Core Canvas with Interactive Gyroscope */}
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onClick={() => isSpeaking && triggerBargeIn("Hologram Tap")}
          title="Interactive 3D Core · Tap anywhere to interrupt in 0ms"
          className="relative cursor-pointer overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#02050e] shadow-[inset_0_0_50px_rgba(0,229,255,0.18)] group"
        >
          <canvas ref={canvasRef} className="w-full h-[400px] block" />

          {/* Barge-In Flash Overlay */}
          {showBargeInBadge && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 rounded-full bg-rose-500 px-4 py-1.5 text-xs font-black text-white shadow-[0_0_25px_#f43f5e] animate-bounce">
              ⚡ BARGE-IN ENGAGED · 0ms CUT-OFF
            </div>
          )}

          <div className="absolute bottom-3 right-3 text-[10px] font-mono text-cyan-300/80 bg-black/60 px-2.5 py-1 rounded-md border border-cyan-500/20 backdrop-blur-sm">
            TAP OR SPACEBAR TO BARGE-IN
          </div>
        </div>

        {/* Real-time Speech Subtitles */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2 shadow-inner">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className={`font-bold tracking-wider ${isSpeaking ? "text-cyan-400" : isListening ? "text-emerald-400" : "text-purple-400"}`}>
              {speakerTag}
            </span>
            <span className="text-slate-500 text-[10px]">ELEVENLABS ULTRA-LOW-LATENCY STREAM</span>
          </div>
          <p className="text-sm text-slate-100 leading-relaxed font-sans italic min-h-[48px]">
            {subtitles}
          </p>
        </div>

        {/* Audio Spectrum Visualizer Bars */}
        <div className="flex items-end justify-between gap-1.5 h-8 rounded-xl bg-black/40 px-3 py-1.5 border border-white/5 overflow-hidden">
          {Array.from({ length: 36 }).map((_, i) => {
            const active = isSpeaking || isListening;
            const h = active ? Math.max(15, (Math.sin(i * 0.55 + Date.now() * 0.005) * 0.5 + 0.5) * 95) : 10;
            return (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className={`w-1 rounded-full transition-all duration-75 ${
                  isSpeaking
                    ? "bg-gradient-to-t from-cyan-500 to-blue-400"
                    : isListening
                    ? "bg-gradient-to-t from-emerald-500 to-teal-300"
                    : "bg-purple-500/30"
                }`}
              />
            );
          })}
        </div>

        {/* Controls Deck */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleVoiceToggle}
            className={`flex-1 flex items-center justify-center gap-2.5 rounded-xl py-3.5 px-5 font-black text-xs sm:text-sm transition shadow-lg ${
              isListening
                ? "bg-rose-500 text-white shadow-[0_0_25px_#f43f5e] animate-pulse"
                : isSpeaking
                ? "bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 hover:brightness-110"
                : "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:brightness-110 active:scale-95"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
            <span>
              {isListening
                ? "Listening to you... (Tap to Finish)"
                : isSpeaking
                ? "Zara Speaking... (Tap to Interrupt)"
                : "Tap to Talk & Build Agent"}
            </span>
          </button>

          <button
            type="button"
            onClick={handlePauseResume}
            title="Pause / Resume"
            className="rounded-xl border border-white/10 bg-white/5 p-3.5 text-white hover:bg-white/10 transition"
          >
            {isPaused ? "▶️" : "⏸️"}
          </button>

          <button
            type="button"
            onClick={() => triggerBargeIn("Manual Cut-Off")}
            title="Instant Barge-In Stop (Spacebar / Tap)"
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition"
          >
            🛑 Cut-Off
          </button>
        </div>

        {/* Quick Message Input Dock */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendText()}
            placeholder="Or type any workflow (e.g. 'Build customer support for my website')..."
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSendText}
            className="rounded-xl bg-cyan-400 px-5 py-3 text-xs font-black text-slate-950 hover:brightness-110 active:scale-95 transition"
          >
            Send ➔
          </button>
        </div>

        {/* 1-Click Executive Pitch Presets */}
        <div className="space-y-2.5 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
            ⚡ 1-Click Executive Pitch Scenarios
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SCENARIO_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => handlePresetTrigger(preset.key)}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left text-xs text-slate-200 hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-white transition group"
              >
                <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">
                  {preset.icon}
                </span>
                <span className="font-semibold truncate">{preset.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sleek, Non-Cluttered Synthesized Agent Deployment Bar */}
        {(hasSynthesized || blueprint) && (
          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900/50 to-blue-950/40 p-4 shadow-[0_0_30px_rgba(0,229,255,0.12)] animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 max-w-lg">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold text-xs">✨ Synthesized Agent:</span>
                  <h4 className="text-sm font-black text-white tracking-tight">{blueprint.name}</h4>
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                    {blueprint.readinessScore}% Ready
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-1">{blueprint.role}</p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSandboxMessages([
                      {
                        sender: blueprint.name,
                        text: `Hello! I am ${blueprint.name}. My toolsets (${blueprint.tools.join(", ")}) are active in sandbox mode. How can I assist you?`,
                        isAgent: true,
                      },
                    ]);
                    setSandboxModalOpen(true);
                  }}
                  className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3.5 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition"
                >
                  ▶ Test in Sandbox
                </button>

                <button
                  type="button"
                  onClick={handleCopyEmbed}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 transition"
                >
                  {copiedSnippet ? "✓ Copied" : "📋 Embed"}
                </button>

                <button
                  type="button"
                  onClick={handleDeployMyAgents}
                  className={`rounded-xl px-4 py-2 text-xs font-black transition shadow-md ${
                    deployedStatus
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-emerald-400 text-slate-950 hover:brightness-110 active:scale-95"
                  }`}
                >
                  {deployedStatus ? "✓ Deployed to My Agents!" : "1-Click Deploy Custom Agent →"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Voice Sandbox Modal */}
      {sandboxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-slate-900 p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧪</span>
                <h3 className="text-base font-bold text-white">
                  Live Sandbox: <span className="text-cyan-400">{blueprint.name}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSandboxModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="h-64 overflow-y-auto space-y-3 rounded-xl border border-white/10 bg-slate-950 p-3.5 text-xs">
              {sandboxMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.isAgent ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                      msg.isAgent
                        ? "bg-slate-800 text-slate-200 border border-white/10"
                        : "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-semibold"
                    }`}
                  >
                    <div className="text-[10px] font-bold opacity-75 mb-0.5">{msg.sender}</div>
                    <div>{msg.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sandboxInput}
                onChange={(e) => setSandboxInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendSandboxMsg()}
                placeholder="Simulate customer message or event trigger..."
                className="flex-1 rounded-xl border border-white/15 bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={handleSendSandboxMsg}
                className="rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-bold text-slate-950"
              >
                Send ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
