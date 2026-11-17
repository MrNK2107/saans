import { applyChange } from "@/core/changes";
import type { AiProvider } from "./contracts";

/**
 * A deterministic stand-in used by tests and the end-to-end suite, so runs never depend on a
 * network or a model. It orders the computed actions by their measured impact.
 */
export const mockProvider: AiProvider = {
  name: "mock",
  async narrate(profile, plan) {
    const hi = profile.language === "hi";
    return {
      headline: hi
        ? `${plan.locality} में आज हवा ${plan.category.replace("_", " ")} है`
        : `Air in ${plan.locality} today: ${plan.category.replace("_", " ")}`,
      summary: hi
        ? `आज औसत PM2.5 ${plan.meanPm25} µg/m³ है। नीचे के कदम आपके घर के हिसाब से चुने गए हैं।`
        : `Average PM2.5 is ${plan.meanPm25} µg/m³. The steps below are chosen for your household.`,
      priorities: plan.actions.slice(0, 5).map((a) => ({
        id: a.id,
        reason: hi ? "आपके घर की स्थिति के हिसाब से।" : "It fits your household's situation.",
      })),
    };
  },
  async converse(profile, _plan, history) {
    const last = history[history.length - 1]?.text.toLowerCase() ?? "";
    if (last.includes("purifier")) {
      const change = { op: "set_purifier", level: "good" } as const;
      return applyChange(profile, change)
        ? {
            reply:
              "A good HEPA purifier in the room you use most would help. Approve to see the change.",
            changes: [change],
          }
        : { reply: "I could not apply that.", changes: [] };
    }
    return {
      reply:
        "Keep windows shut in the dirtiest hours and run a purifier where you spend most time.",
      changes: [],
    };
  },
};
