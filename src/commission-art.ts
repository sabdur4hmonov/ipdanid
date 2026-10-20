import type { CommissionGuide } from "./commission-types";
import { validateInstruction } from "./core/validation";
import { hash } from "./core/engine";
export async function checkedCommissionArt(
  value: CommissionGuide,
  identity: { artHash: string; sequenceHash: string },
) {
  await validateInstruction(value.instruction);
  if (
    value.artHash !== identity.artHash ||
    value.instruction.sequenceHash !== identity.sequenceHash ||
    (await hash(value.instruction)) !== identity.artHash
  )
    throw Error("Art identity differs");
  return value.instruction;
}
