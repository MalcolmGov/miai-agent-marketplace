"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

interface ISpeechRecognitionResult {
  [index: number]: { transcript: string };
  length: number;
}

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [index: number]: ISpeechRecognitionResult;
    length: number;
  };
}

interface ISpeechRecognitionErrorEvent {
  error: string;
}

interface ISpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onresult: (event: ISpeechRecognitionEvent) => void;
  onerror: (event: ISpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

export interface SynthesizedAgent {
  name: string;
  role: string;
  confidence: number;
  tools: string[];
  systemPrompt: string;
}

const MODES = [
  { id: "copilot", label: "Executive Co-Pilot", desc: "Strategic dilemmas, portfolio health & C-suite briefs" },
  { id: "forge", label: "Autonomous Agent Forge", desc: "Speak an operational bottleneck to compile custom agents" },
  { id: "architect", label: "Systems Architect", desc: "Database schemas, API connectors & infrastructure workflows" },
];

const VOICE_PROFILES = [
  { id: "QeKcckTBICc3UuWL7ETc", name: "Zara Neural (Flagship)", badge: "Flagship Signature" },
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (Calm & Polished)", badge: "Executive" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi (Confident & Crisp)", badge: "Dynamic" },
];

export function VoiceStudioExperience() {
  const [activeMode, setActiveMode] = useState("forge");
  const [selectedVoiceId, setSelectedVoiceId] = useState("QeKcckTBICc3UuWL7ETc");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [subtitles, setSubtitles] = useState(
    "\"Zara Voice Studio is active. Speak naturally or type any operational bottleneck to compile a custom enterprise agent.\""
  );
  const [speakerTag, setSpeakerTag] = useState<"STANDBY" | "YOU" | "ZARA" | "COMPILING">("STANDBY");
  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [specDrawerOpen, setSpecDrawerOpen] = useState(false);
  const [synthesizedAgent, setSynthesizedAgent] = useState<SynthesizedAgent | null>(null);
  const [bargeInFlash, setBargeInFlash] = useState(false);
  const [twoWayMode, setTwoWayMode] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<ISpeechRecognitionInstance | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentBufferSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const shockwavesRef = useRef<Array<{ r: number; maxR: number; alpha: number }>>([]);
  const twoWayModeRef = useRef(true);

  useEffect(() => {
    twoWayModeRef.current = twoWayMode;
  }, [twoWayMode]);

  // Session Call Timer
  useEffect(() => {
    const timer = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  // ── Audio Context Unlock Helper (Crucial for Safari / Chrome Autoplay Policy) ─
  function unlockAudio() {
    if (typeof window === "undefined") return;
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtxClass();
        }
        if (audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume();
        }
      }
    } catch {}
  }

  // ── Speech Output Audio Pipeline (ElevenLabs with Web Speech fallback) ──────
  async function speakZaraAudio(textToSpeak: string) {
    stopCurrentAudio();
    setIsSpeaking(true);
    setSpeakerTag("ZARA");
    unlockAudio();

    try {
      const resp = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSpeak,
          voiceId: selectedVoiceId,
        }),
      });

      const contentType = resp.headers.get("content-type") || "";

      if (resp.ok && contentType.includes("audio")) {
        const audioBlob = await resp.blob();

        // 1. Primary path: HTML5 Audio element
        try {
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;

          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            currentAudioRef.current = null;
            setIsSpeaking(false);
            setSpeakerTag("STANDBY");
            if (twoWayModeRef.current) {
              setSubtitles("Listening... speak your next requirement or answer.");
              setTimeout(() => {
                startListening();
              }, 400);
            }
          };

          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            currentAudioRef.current = null;
            playBrowserTtsFallback(textToSpeak);
          };

          await audio.play();
          return;
        } catch (playErr) {
          console.warn("[VoiceStudio] Audio.play rejected, attempting Web Audio buffer fallback:", playErr);

          // 2. Web Audio API Buffer fallback (avoids Safari/iOS autoplay restrictions on blob URL)
          if (audioCtxRef.current) {
            try {
              if (audioCtxRef.current.state === "suspended") {
                await audioCtxRef.current.resume();
              }
              const arrayBuffer = await audioBlob.arrayBuffer();
              const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
              const source = audioCtxRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioCtxRef.current.destination);
              currentBufferSourceRef.current = source;

              source.onended = () => {
                currentBufferSourceRef.current = null;
                setIsSpeaking(false);
                setSpeakerTag("STANDBY");
                if (twoWayModeRef.current) {
                  setSubtitles("Listening... speak your next requirement or answer.");
                  setTimeout(() => {
                    startListening();
                  }, 400);
                }
              };

              source.start(0);
              return;
            } catch (bufferErr) {
              console.warn("[VoiceStudio] Web Audio buffer decode failed:", bufferErr);
            }
          }
        }
      }
    } catch (err) {
      console.warn("[VoiceStudio] Audio synthesis exception:", err);
    }

    // 3. High-fidelity Web Speech fallback
    playBrowserTtsFallback(textToSpeak);
  }

  function playBrowserTtsFallback(cleanText: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSpeaking(false);
      setSpeakerTag("STANDBY");
      return;
    }

    window.speechSynthesis.cancel();

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
      if (twoWayModeRef.current) {
        setSubtitles("Listening... speak your next requirement or answer.");
        setTimeout(() => {
          startListening();
        }, 400);
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakerTag("STANDBY");
    };

    window.speechSynthesis.speak(utterance);
  }

  function stopCurrentAudio() {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (currentBufferSourceRef.current) {
      try {
        currentBufferSourceRef.current.stop();
      } catch {}
      currentBufferSourceRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }

  // ── Speech Recognition Input Pipeline ──────────────────────────────────────
  function startListening() {
    if (typeof window === "undefined") return;

    stopCurrentAudio();
    unlockAudio();
    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: new () => ISpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => ISpeechRecognitionInstance;
    };
    const SpeechRecognition =
      windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setSpeakerTag("YOU");
        setSubtitles("Listening... speak your business workflow or bottleneck naturally.");
      };

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          interimTranscript += event.results[i][0].transcript;
        }

        const clean = interimTranscript.trim();
        if (!clean) return;

        setSubtitles(`"${clean}"`);

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          stopListening();
          executeAgentSynthesis(clean);
        }, 850);
      };

      recognition.onerror = (event: { error?: string }) => {
        setIsListening(false);
        setSpeakerTag("STANDBY");
        if (event?.error === "not-allowed") {
          setSubtitles("⚠️ Microphone permission denied. Please allow microphone access in your browser settings to enable two-way voice.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
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
    setSpeakerTag("COMPILING");
    setSubtitles(`Synthesizing enterprise agent from: "${userSpokenText}"...`);

    shockwavesRef.current.push({ r: 20, maxR: 320, alpha: 1.0 });

    setTimeout(() => {
      const lower = userSpokenText.toLowerCase();
      let compiled: SynthesizedAgent;

      if (lower.includes("invoice") || lower.includes("collection") || lower.includes("debt") || lower.includes("xero")) {
        compiled = {
          name: "AR Collections Specialist",
          role: "Automated debt recovery, Xero ledger reconciliation & Paystack payment arrangements",
          confidence: 94,
          tools: ["Xero Invoices API", "Paystack Links", "Aging Scheduler", "POPIA Ledger"],
          systemPrompt: "You are the AR Collections Specialist. Manage overdue receivables and issue payment plans compliant with National Credit Act guidelines.",
        };
      } else if (lower.includes("order") || lower.includes("shopify") || lower.includes("delivery") || lower.includes("return")) {
        compiled = {
          name: "Omnichannel Order Specialist",
          role: "Autonomous courier waybill tracking, size exchanges & instant refund management",
          confidence: 98,
          tools: ["Shopify GraphQL", "WhatsApp Cloud Webhook", "The Courier Guy", "Store Credit Emitter"],
          systemPrompt: "You are the Omnichannel Order Specialist. Track waybills and process size exchange authorizations autonomously within approved thresholds.",
        };
      } else if (lower.includes("it") || lower.includes("slack") || lower.includes("access") || lower.includes("password")) {
        compiled = {
          name: "SecOps Identity Concierge",
          role: "Role-based Slack channel provisioning, temporary VPN credentials & MFA resets",
          confidence: 96,
          tools: ["Okta OAuth2", "ServiceNow REST", "Slack Admin API", "Audit Hash Ledger"],
          systemPrompt: "You are the SecOps Identity Concierge. Handle access requests and credential rotation with zero-trust verification.",
        };
      } else {
        compiled = {
          name: "Autonomous Operations Architect",
          role: `Enterprise agent compiled for: "${userSpokenText.slice(0, 48)}..."`,
          confidence: 92,
          tools: ["Workflow DAG Runner", "Universal Webhook Emitter", "Context RAG Engine", "Audit Logger"],
          systemPrompt: `You are the Autonomous Operations Architect synthesized for: ${userSpokenText}.`,
        };
      }

      setSynthesizedAgent(compiled);
      setIsCompiling(false);

      const spokenResponse = `I have compiled ${compiled.name}. Certified toolsets and safety guardrails are pre-audited with ${compiled.confidence}% production readiness.`;
      setSubtitles(`"${spokenResponse}"`);
      speakZaraAudio(spokenResponse);
    }, 500);
  }

  function triggerBargeIn() {
    stopCurrentAudio();
    stopListening();
    setBargeInFlash(true);
    shockwavesRef.current.push({ r: 25, maxR: 280, alpha: 1.0 });
    setSpeakerTag("STANDBY");
    setSubtitles("⚡ Interrupted instantaneously. Speak naturally or tap below.");

    setTimeout(() => {
      setBargeInFlash(false);
    }, 1400);
  }

  function handleVoiceToggle() {
    unlockAudio();
    if (isSpeaking) {
      triggerBargeIn();
      return;
    }
    if (isListening) {
      stopListening();
      return;
    }
    startListening();
  }

  function handleSendText() {
    unlockAudio();
    if (!textInput.trim()) return;
    const msg = textInput.trim();
    setTextInput("");
    setShowTextInput(false);
    executeAgentSynthesis(msg);
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
      H = rect.height;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const NUM_PARTICLES = 420;
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
        size: 1.2 + (i % 3) * 0.7,
      });
    }

    const gimbalRings = [
      { radius: 170, tiltX: 0.85, tiltZ: 0.15, speed: 0.012, packets: [0, 2.1, 4.2] },
      { radius: 145, tiltX: -0.72, tiltZ: 0.65, speed: -0.016, packets: [1.0, 3.1, 5.2] },
      { radius: 120, tiltX: 1.45, tiltZ: -0.45, speed: 0.02, packets: [0.5, 2.6, 4.7] },
    ];

    let rotY = 0;
    const rotX = 0.18;
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

      const spinSpeed = isSpeaking ? 0.025 : isListening ? 0.018 : isCompiling ? 0.035 : 0.007;
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

      // Deep Void Cosmic Aurora Background
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.65);
      bgGrad.addColorStop(0, `rgba(${r},${g},${b},0.12)`);
      bgGrad.addColorStop(0.5, "rgba(4,7,16,0.85)");
      bgGrad.addColorStop(1, "rgba(2,3,8,0.98)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Perspective Cyber-Lattice Floor
      ctx.save();
      const floorY = cy + 110;
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = `rgba(${r},${g},${b},0.65)`;
      ctx.lineWidth = 0.75;
      const GRID_ROWS = 7;
      const GRID_COLS = 16;
      const floorW = Math.min(W * 0.95, 760);
      const floorH = 130;

      for (let row = 0; row <= GRID_ROWS; row++) {
        const frac = row / GRID_ROWS;
        const yp = floorY + frac * floorH;
        const xScale = 0.2 + frac * 0.8;
        ctx.beginPath();
        ctx.moveTo(cx - (floorW / 2) * xScale, yp);
        ctx.lineTo(cx + (floorW / 2) * xScale, yp);
        ctx.stroke();
      }
      for (let col = 0; col <= GRID_COLS; col++) {
        const t = col / GRID_COLS - 0.5;
        ctx.beginPath();
        ctx.moveTo(cx + t * floorW * 0.2, floorY);
        ctx.lineTo(cx + t * floorW, floorY + floorH);
        ctx.stroke();
      }
      ctx.restore();

      // Holographic HUD Calipers
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = `rgba(${r},${g},${b},0.9)`;
      ctx.lineWidth = 1;

      ctx.setLineDash([4, 12]);
      ctx.beginPath();
      ctx.arc(cx, cy, 200, 0, Math.PI * 2);
      ctx.stroke();

      ctx.setLineDash([2, 6]);
      ctx.beginPath();
      ctx.arc(cx, cy, 155, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const angles = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
      angles.forEach((a) => {
        const x1 = cx + Math.cos(a) * 190;
        const y1 = cy + Math.sin(a) * 190;
        const x2 = cx + Math.cos(a) * 210;
        const y2 = cy + Math.sin(a) * 210;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 200, radarAngle, radarAngle + 0.35);
      ctx.fillStyle = `rgba(${r},${g},${b},0.06)`;
      ctx.fill();
      ctx.restore();

      // Singularity Core & Flare Jets
      ctx.save();
      const corona = ctx.createRadialGradient(cx, cy, 10, cx, cy, 210 * amplitude);
      corona.addColorStop(0, `rgba(${r},${g},${b},0.32)`);
      corona.addColorStop(0.4, `rgba(${r},${g},${b},0.1)`);
      corona.addColorStop(1, "transparent");
      ctx.fillStyle = corona;
      ctx.beginPath();
      ctx.arc(cx, cy, 210 * amplitude, 0, Math.PI * 2);
      ctx.fill();

      const RAY_COUNT = 8;
      ctx.globalAlpha = 0.25 * (amplitude / 1.5);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.8)`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < RAY_COUNT; i++) {
        const rayA = (i / RAY_COUNT) * Math.PI * 2 + T * 0.8;
        const rayLen = 50 + Math.sin(T * 4 + i) * 18;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(rayA) * rayLen, cy + Math.sin(rayA) * rayLen);
        ctx.stroke();
      }

      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50 * amplitude);
      core.addColorStop(0, "rgba(255,255,255,0.98)");
      core.addColorStop(0.25, `rgba(${r},${g},${b},0.85)`);
      core.addColorStop(0.6, `rgba(${r},${g},${b},0.22)`);
      core.addColorStop(1, "transparent");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, 50 * amplitude, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3D Projection Matrix
      const fov = 450;
      const cosY = Math.cos(currentRotY);
      const sinY = Math.sin(currentRotY);
      const cosX = Math.cos(currentRotX);
      const sinX = Math.sin(currentRotX);

      function project3D(x: number, y: number, z: number) {
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        const scale = fov / (fov + z2 + 230);
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
        ctx.strokeStyle = `rgba(${r},${g},${b},0.22)`;
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
      const baseRadius = 95;
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
          (isSpeaking ? 20 : isListening ? 15 : 8);
        const curR = baseRadius + wave;

        const x = pt.baseX * curR;
        const y = pt.baseY * curR;
        const z = pt.baseZ * curR;

        const proj = project3D(x, y, z);
        const alpha = Math.max(0.12, Math.min(0.95, (proj.z + 110) / 220));
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
          if (dist < 36) {
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
        ctx.shadowBlur = node.z > 0 ? 9 : 2;
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
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(cx, cy, sw.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        });
        shockwavesRef.current = shockwavesRef.current.filter((sw) => sw.alpha > 0.05);
      }

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

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col justify-between overflow-hidden bg-[#02040a] text-white">
      {/* ── Top Bar (Minimalist Luxury) ─────────────────────────────────── */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-4 border-b border-white/5 bg-black/40 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/agents"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition"
            title="Back to Marketplace"
          >
            ←
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Zara Voice Studio</span>
                <span className="rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-2 py-0.5 text-[10px] font-black text-slate-950 uppercase tracking-widest">
                  LIVE
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Real-time Neural Speech Engine · ElevenLabs Turbo 2.5
            </p>
          </div>
        </div>

        {/* Mode & Voice Profile Selector Capsules */}
        <div className="hidden lg:flex items-center gap-2">
          {/* Mode Selector */}
          <div className="flex items-center rounded-2xl border border-white/10 bg-black/50 p-1 backdrop-blur-md">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setActiveMode(mode.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  activeMode === mode.id
                    ? "bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* ElevenLabs Premier Voice Selector */}
          <div className="flex items-center rounded-2xl border border-white/10 bg-black/50 p-1 backdrop-blur-md">
            <span className="px-2 text-[10px] font-mono uppercase text-slate-500 font-semibold">VOICE</span>
            <select
              value={selectedVoiceId}
              onChange={(e) => setSelectedVoiceId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-cyan-300 focus:outline-none cursor-pointer pr-2"
            >
              {VOICE_PROFILES.map((vp) => (
                <option key={vp.id} value={vp.id} className="bg-slate-900 text-white">
                  {vp.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Telemetry & Two-Way Loop Toggle */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <button
            type="button"
            onClick={() => setTwoWayMode((m) => !m)}
            className={`hidden sm:flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition cursor-pointer ${
              twoWayMode
                ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
            }`}
            title="When enabled, microphone re-arms automatically after Zara speaks for a continuous hands-free conversation"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                twoWayMode ? "bg-cyan-400 animate-pulse" : "bg-slate-600"
              }`}
            />
            <span>{twoWayMode ? "2-Way Loop: ON" : "2-Way Loop: OFF"}</span>
          </button>

          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>&lt;250ms VAD</span>
          </div>
          <div className="text-slate-400 font-bold tracking-wider">{formatTimer(callDuration)}</div>
        </div>
      </header>

      {/* ── Main Cinematic Visualizer Stage ───────────────────────────────── */}
      <main
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={() => isSpeaking && triggerBargeIn()}
        className="relative flex-1 flex flex-col items-center justify-center cursor-pointer select-none"
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

        {/* Instant Interruption Notification */}
        {bargeInFlash && (
          <div className="relative z-30 mb-6 rounded-full bg-rose-500/90 border border-rose-400/50 px-5 py-1.5 text-xs font-black tracking-wide text-white shadow-[0_0_30px_#f43f5e] animate-bounce">
            ⚡ BARGE-IN ENGAGED · 0ms CUT-OFF
          </div>
        )}

        {/* Floating Poetic Subtitles */}
        <div className="relative z-20 max-w-2xl px-6 text-center space-y-2 pointer-events-none">
          <div className="text-[11px] font-mono uppercase tracking-widest text-cyan-400/90 font-bold">
            {speakerTag === "YOU"
              ? "Listening to your voice…"
              : speakerTag === "ZARA"
              ? "Zara Neural Synthesis…"
              : speakerTag === "COMPILING"
              ? "Compiling Agent Specification…"
              : "Voice Chamber Ready"}
          </div>
          <p className="text-base sm:text-xl md:text-2xl font-light text-slate-100 tracking-tight leading-relaxed italic drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            {subtitles}
          </p>
        </div>
      </main>

      {/* ── Floating Translucent Glass Audio Deck ─────────────────────────── */}
      <footer className="relative z-30 pb-8 px-4 flex flex-col items-center gap-4">
        {/* Equalizer Wave Ribbon */}
        <div className="flex items-end justify-center gap-1 h-7 w-64 max-w-full overflow-hidden opacity-80">
          {Array.from({ length: 32 }).map((_, i) => {
            const active = isSpeaking || isListening;
            const h = active ? Math.max(15, (Math.sin(i * 0.6 + Date.now() * 0.006) * 0.5 + 0.5) * 95) : 8;
            return (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className={`w-1 rounded-full transition-all duration-75 ${
                  isSpeaking
                    ? "bg-gradient-to-t from-cyan-400 to-blue-400"
                    : isListening
                    ? "bg-gradient-to-t from-emerald-400 to-teal-300"
                    : "bg-purple-500/30"
                }`}
              />
            );
          })}
        </div>

        {/* Central Controls Pill */}
        <div className="flex items-center gap-3 rounded-3xl border border-white/15 bg-black/60 p-2.5 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
          {/* Main Glowing Microphone Button */}
          <button
            type="button"
            onClick={handleVoiceToggle}
            className={`flex items-center gap-3 rounded-2xl px-6 py-3.5 font-black text-sm transition-all shadow-xl active:scale-95 ${
              isListening
                ? "bg-rose-500 text-white shadow-[0_0_30px_#f43f5e] animate-pulse"
                : isSpeaking
                ? "bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 hover:brightness-110"
                : "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:brightness-110"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
            <span>
              {isListening
                ? "Listening… Tap to Send"
                : isSpeaking
                ? "Zara Speaking… Tap to Interrupt"
                : twoWayMode
                ? "Tap to Speak Naturally (2-Way)"
                : "Tap to Speak Naturally"}
            </span>
          </button>

          {/* Text Input Toggle */}
          <button
            type="button"
            onClick={() => setShowTextInput((s) => !s)}
            className={`rounded-2xl border border-white/10 p-3.5 text-slate-300 transition ${
              showTextInput ? "bg-white/20 text-white" : "bg-white/5 hover:bg-white/10 hover:text-white"
            }`}
            title="Type a message instead"
          >
            ⌨️
          </button>

          {/* Spec Drawer Button (Appears when an agent is synthesized) */}
          {synthesizedAgent && (
            <button
              type="button"
              onClick={() => setSpecDrawerOpen(true)}
              className="flex items-center gap-2 rounded-2xl border border-cyan-400/40 bg-cyan-500/20 px-4 py-3.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition animate-fadeIn"
            >
              <span>✨</span>
              <span>View Spec</span>
            </button>
          )}
        </div>

        {/* Collapsible Clean Text Input */}
        {showTextInput && (
          <div className="w-full max-w-md flex items-center gap-2 rounded-2xl border border-white/15 bg-black/80 p-2 backdrop-blur-xl animate-fadeIn">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendText()}
              placeholder="Describe your workflow or problem..."
              className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSendText}
              className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:brightness-110 transition"
            >
              Send
            </button>
          </div>
        )}
      </footer>

      {/* ── Slide-Over Agent Specification Drawer ─────────────────────────── */}
      {specDrawerOpen && synthesizedAgent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg h-full border-l border-white/10 bg-[#080d19] p-6 space-y-6 overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                  ✓ Agent Compiled via Voice
                </span>
                <h3 className="text-lg font-black text-white">{synthesizedAgent.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSpecDrawerOpen(false)}
                className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="rounded-xl bg-white/5 p-4 border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Synthesized Purpose</span>
                <p className="text-slate-200">{synthesizedAgent.role}</p>
              </div>

              <div className="rounded-xl bg-white/5 p-4 border border-white/5 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Bound Tool Graph</span>
                <div className="flex flex-wrap gap-2">
                  {synthesizedAgent.tools.map((t, idx) => (
                    <span
                      key={idx}
                      className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-mono text-cyan-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-white/5 p-4 border border-white/5 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">System Prompt</span>
                <pre className="font-mono text-[11px] text-slate-300 whitespace-pre-wrap bg-black/40 p-3 rounded-lg border border-white/5">
                  {synthesizedAgent.systemPrompt}
                </pre>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10">
              <Link
                href="/create"
                className="flex-1 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 py-3 text-center text-xs font-black text-slate-950 hover:brightness-110 transition shadow-lg"
              >
                Open in Full Studio Editor →
              </Link>
              <button
                type="button"
                onClick={() => setSpecDrawerOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-slate-300 hover:text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
