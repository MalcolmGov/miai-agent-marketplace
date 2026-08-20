import type { ReactNode } from "react";
import { parseRichText, youtubeVideoId } from "./rich-text-parse";

/**
 * Minimal, safe rich-text rendering for assistant chat messages. The model replies in light
 * markdown — links, images, `**bold**`, and bare URLs — which the plain-text bubble showed literally
 * (so "links weren't clickable" and cover images never showed). This turns the parsed segments (see
 * `rich-text-parse.ts`) into real nodes without a markdown dependency and without
 * dangerouslySetInnerHTML: only http/https links and https images are ever emitted.
 *
 * YouTube results are the common case: each result carries a `youtube.com/watch?v=<id>` link, so we
 * render those as a compact card with the video's cover image (derived from the id — no connector or
 * model cooperation needed) rather than a bare "Watch here" link.
 */

/** A YouTube link rendered as a card: cover image (from the video id) + clickable label. */
function YouTubeCard({ id, label }: { id: string; label: string }): ReactNode {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${id}`}
      target="_blank"
      rel="noreferrer"
      className="group my-1 flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg-panel)] p-2 no-underline hover:border-[var(--accent)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote thumbnail, no next/image domain config */}
      <img
        src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`}
        alt=""
        loading="lazy"
        width={120}
        height={68}
        className="h-[68px] w-[120px] shrink-0 rounded-md object-cover"
      />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent-dim)]">
          {label}
        </span>
        <span className="mt-0.5 block text-xs text-[var(--text-dim)]">Watch on YouTube ›</span>
      </span>
    </a>
  );
}

/** Render a message as React nodes with clickable links, cover images, and bold. */
export function renderRichText(input: string): ReactNode[] {
  return parseRichText(input).map((seg, i) => {
    if (seg.type === "link") {
      const yt = youtubeVideoId(seg.href);
      if (yt) return <YouTubeCard key={i} id={yt} label={seg.text} />;
      return (
        <a
          key={i}
          href={seg.href}
          target="_blank"
          rel="noreferrer"
          className="break-words text-[var(--accent-dim)] underline decoration-1 underline-offset-2 hover:opacity-80"
        >
          {seg.text}
        </a>
      );
    }
    if (seg.type === "image") {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- model-supplied remote image, no next/image domain config
        <img
          key={i}
          src={seg.src}
          alt={seg.alt}
          loading="lazy"
          className="my-1 max-h-64 max-w-full rounded-lg border border-[var(--line)] object-contain"
        />
      );
    }
    if (seg.type === "bold") return <strong key={i}>{seg.text}</strong>;
    return <span key={i}>{seg.text}</span>;
  });
}
