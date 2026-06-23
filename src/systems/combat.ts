import Phaser from 'phaser';
import type { EnemyData, HeroState } from '../types/game';

export function calculateHeroDamage(hero: HeroState, enemy: EnemyData, skillPower = 0): number {
  const variance = Phaser.Math.Between(-2, 3);
  return Math.max(1, hero.attack + skillPower - enemy.defense + variance);
}

export function calculateEnemyDamage(enemy: EnemyData, hero: HeroState, guarding = false): number {
  const variance = Phaser.Math.Between(-2, 2);
  const raw = Math.max(1, enemy.attack - hero.defense + variance);
  return guarding ? Math.ceil(raw / 2) : raw;
}

export function firstLivingHero(party: HeroState[]): HeroState | undefined {
  return party.find((hero) => hero.hp > 0);
}

export function isPartyDefeated(party: HeroState[]): boolean {
  return party.every((hero) => hero.hp <= 0);
}
