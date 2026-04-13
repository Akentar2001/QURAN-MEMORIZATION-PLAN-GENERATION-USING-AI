import { describe, it } from "vitest";
import { generatePlan } from "../planGenerator";

describe("visual output for debugging", () => {
  it("show all 40 assignments for Al-Hadid descending", () => {
    const plan = generatePlan({
      id: "test",
      name: "أحمد",
      halaqah: "حلقة ١",
      planType: "independent",
      memStartSurah: 57,
      memStartAyah: 1,
      linesPerSession: 15,
      direction: "descending",
      minorRevPages: 5,
      majRevStartSurah: 58,
      majRevStartAyah: 1,
      majRevPages: 3,
    });

    console.log("\n=== All 40 assignments ===");
    plan.assignments.forEach((a) => {
      const mem = `${a.memFrom || "---"} → ${a.memTo || "---"}`;
      const minor = `${a.minorFrom || "---"} → ${a.minorTo || "---"}`;
      const major =
        a.majorBlocks.length === 0
          ? "---"
          : a.majorBlocks.map((b) => `${b.from} ← ${b.to}`).join(" • ");
      console.log(
        `W${String(a.assignmentNumber).padStart(2)} | حفظ: ${mem} | صغيرة: ${minor} | كبيرة: ${major}`
      );
    });
  });

  it("show all 40 assignments for Muhammad descending 7 lines (user W26/W36 scenario)", () => {
    const plan = generatePlan({
      id: "test",
      name: "أحمد",
      halaqah: "حلقة ١",
      planType: "independent",
      memStartSurah: 47,
      memStartAyah: 1,
      linesPerSession: 7,
      direction: "descending",
      minorRevPages: 5,
      majRevStartSurah: 58,
      majRevStartAyah: 1,
      majRevPages: 10,
    });

    console.log("\n=== Muhammad 7-line scenario ===");
    plan.assignments.forEach((a) => {
      const mem = `${a.memFrom || "---"} → ${a.memTo || "---"}`;
      const minor = `${a.minorFrom || "---"} → ${a.minorTo || "---"}`;
      const major =
        a.majorBlocks.length === 0
          ? "---"
          : a.majorBlocks.map((b) => `${b.from} ← ${b.to}`).join(" • ");
      console.log(
        `W${String(a.assignmentNumber).padStart(2)} | حفظ: ${mem} | صغيرة: ${minor} | كبيرة: ${major}`
      );
    });
  });
});
