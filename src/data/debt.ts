import raw from "./generated/debt.json";
import type { DebtSection } from "@/lib/types";

/**
 * The debt section, as split out of the bundle. Debt is a stock, not a flow:
 * every block states its own scope and reference date because the sources behind
 * them are published on different clocks.
 */
export const { debt } = raw as unknown as DebtSection;
