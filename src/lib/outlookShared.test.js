import { it, expect } from "vitest";
import { sharedBlock, currentBlock } from "../../scripts/inline-outlook-shared.mjs";

it("la edge function outlook contiene la copia aggiornata di mailDates/mailMatch", () => {
  // Se fallisce: node scripts/inline-outlook-shared.mjs
  expect(currentBlock()).toBe(sharedBlock());
});
