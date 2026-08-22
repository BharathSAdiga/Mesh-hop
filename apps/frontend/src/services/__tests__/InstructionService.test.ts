import { describe, it, expect } from 'vitest';
import { InstructionService } from '../InstructionService';

describe('InstructionService', () => {
  it('contains survival instructions for all 4 primary disaster categories plus triage', () => {
    const instructions = InstructionService.getInstructions();
    expect(instructions.length).toBeGreaterThanOrEqual(5);

    const collapse = InstructionService.getByCategory('STRUCTURAL_COLLAPSE');
    expect(collapse).toBeDefined();
    expect(collapse?.steps.length).toBeGreaterThanOrEqual(4);
    expect(collapse?.doNotList.length).toBeGreaterThanOrEqual(2);

    const stampede = InstructionService.getByCategory('STAMPEDE');
    expect(stampede).toBeDefined();

    const fire = InstructionService.getByCategory('FIRE');
    expect(fire).toBeDefined();

    const flood = InstructionService.getByCategory('FLOOD');
    expect(flood).toBeDefined();

    const triage = InstructionService.getByCategory('TRIAGE');
    expect(triage).toBeDefined();
  });
});
