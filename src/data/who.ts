import raw from "./generated/who.json";
import type { WhoSection } from "@/lib/types";

/**
 * AEAT administrative detail behind the revenue components — who actually
 * generates each one. Every block is published on its own basis, with its own
 * total that does not equal the national-accounts headline above it. The console
 * states that gap in words; it never rescales one to fit the other.
 */
export const whoSection = raw as unknown as WhoSection;

export const { who } = whoSection;
