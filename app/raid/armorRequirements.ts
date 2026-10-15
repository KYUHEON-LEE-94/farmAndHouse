import type { ArmorDef } from "./data";

/** 선행 방어구는 보유만 필요하며 제작 시 소모하지 않는다. */
export function hasArmorPrerequisite(armor: Pick<ArmorDef, "prerequisite">, owned: readonly string[]): boolean {
  return !armor.prerequisite || owned.includes(armor.prerequisite);
}
