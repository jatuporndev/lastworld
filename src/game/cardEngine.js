// Card Engine — per-hero draw pile, hand, discard and cooldown track during a battle.
import { cardStats } from '../data/cards.js';

export const HAND_SIZE = 5;
export const HAND_LIMIT = 7;
export const ACTION_SLOTS = 3;

let instCounter = 1;

export class CardEngine {
  constructor(deckIds, levelOf, rng) {
    this.rng = rng;
    this.draw = deckIds.map((id) => ({ uid: 'c' + instCounter++, id, lv: levelOf(id), card: cardStats(id, levelOf(id)) }));
    rng.shuffle(this.draw);
    this.hand = []; this.discard = []; this.cooldown = []; // cooldown: [{inst, left, total}]
  }

  drawOne() {
    if (this.hand.length >= HAND_LIMIT) return null;
    if (!this.draw.length) {
      if (!this.discard.length) return null;
      this.draw = this.rng.shuffle(this.discard); this.discard = [];
    }
    const c = this.draw.pop(); this.hand.push(c); return c;
  }

  drawTo(n) {
    const drawn = [];
    while (this.hand.length < n) { const c = this.drawOne(); if (!c) break; drawn.push(c); }
    return drawn;
  }

  // Called at the start of the owner's turn. Returns instances that came off cooldown.
  tickCooldowns() {
    const ready = [];
    this.cooldown = this.cooldown.filter((e) => {
      e.left -= 1;
      if (e.left <= 0) { this.discard.push(e.inst); ready.push(e.inst); return false; }
      return true;
    });
    return ready;
  }

  takeFromHand(uid) {
    const i = this.hand.findIndex((c) => c.uid === uid);
    return i >= 0 ? this.hand.splice(i, 1)[0] : null;
  }
  returnToHand(inst) { this.hand.push(inst); }

  // After a card resolves it enters the cooldown track (or the discard pile when it has no cooldown).
  spend(inst) {
    if (inst.card.cd > 0) this.cooldown.push({ inst, left: inst.card.cd, total: inst.card.cd });
    else this.discard.push(inst);
  }
}
