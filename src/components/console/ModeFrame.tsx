"use client";

import { usePathname } from "next/navigation";
import { modeFromPath } from "@/lib/modes";

/**
 * Carries the active mode as a `data-mode` attribute so one CSS rule remaps the
 * accent for the whole screen — the prototype's `body.exp` / `body.debt`, moved
 * onto an element a layout can own.
 *
 * A layout cannot read the URL on the server, so this reads it on the client;
 * `children` stay server components and are passed straight through. The value is
 * resolved during prerender, so the static HTML already carries the right accent —
 * no flash on load.
 */
export default function ModeFrame({ children }: { children: React.ReactNode }) {
  return <div data-mode={modeFromPath(usePathname() ?? "")}>{children}</div>;
}
