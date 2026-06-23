import type { InventoryStack, SaveState } from '../types/game';

export class InventorySystem {
  static addItem(state: SaveState, itemId: string, quantity = 1): void {
    const stack = state.inventory.find((entry) => entry.itemId === itemId);
    if (stack) {
      stack.quantity += quantity;
      return;
    }

    state.inventory.push({ itemId, quantity });
  }

  static removeItem(state: SaveState, itemId: string, quantity = 1): boolean {
    const stack = state.inventory.find((entry) => entry.itemId === itemId);
    if (!stack || stack.quantity < quantity) return false;

    stack.quantity -= quantity;
    if (stack.quantity <= 0) {
      state.inventory = state.inventory.filter((entry) => entry.itemId !== itemId);
    }

    return true;
  }

  static count(state: SaveState, itemId: string): number {
    return state.inventory.find((entry) => entry.itemId === itemId)?.quantity ?? 0;
  }

  static clone(stacks: InventoryStack[]): InventoryStack[] {
    return stacks.map((stack) => ({ ...stack }));
  }
}
