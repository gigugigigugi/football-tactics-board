import type {
  Assignment,
  BenchAssignment,
  FormationSlot,
  PinnedAssignment,
  Player,
  RandomResult,
  Team,
} from "./types";

type SlotTarget = {
  teamId: string;
  slotId: string;
  slotIndex: number;
};

export type RandomizeInput = {
  teams: Team[];
  perTeamCount: number;
  players: Player[];
  formationSlots: FormationSlot[];
  pinnedAssignments: PinnedAssignment[];
  randomRounds: number;
};

export type ValidationResult = {
  ok: boolean;
  errors: string[];
};

export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error("maxExclusive must be a positive integer");
  }

  const maxUint = 0xffffffff;
  const limit = maxUint - (maxUint % maxExclusive);
  const buffer = new Uint32Array(1);

  while (true) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < limit) {
      return buffer[0] % maxExclusive;
    }
  }
}

export function shuffleWithCrypto<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomInt(index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function validateRandomizeInput(input: RandomizeInput): ValidationResult {
  const errors: string[] = [];
  const formationTotal = input.formationSlots.reduce((sum, slot) => sum + slot.count, 0);

  if (input.teams.length < 1) errors.push("至少需要 1 个队伍。");
  if (input.perTeamCount < 1) errors.push("每队人数必须大于 0。");
  if (formationTotal !== input.perTeamCount) {
    errors.push(
      `位置总人数是 ${formationTotal}，必须等于每队人数 ${input.perTeamCount}。`,
    );
  }

  const playerIds = new Set(input.players.map((player) => player.id));
  const teamIds = new Set(input.teams.map((team) => team.id));
  const slots = new Map(input.formationSlots.map((slot) => [slot.id, slot]));
  const pinnedPlayers = new Set<string>();
  const pinnedTargets = new Set<string>();
  const pinnedByTeam = new Map<string, number>();

  input.pinnedAssignments.forEach((pin, index) => {
    const label = `第 ${index + 1} 条指定`;
    const slot = slots.get(pin.slotId);

    if (!playerIds.has(pin.playerId)) errors.push(`${label} 的球员不存在。`);
    if (!teamIds.has(pin.teamId)) errors.push(`${label} 的队伍不存在。`);
    if (!slot) {
      errors.push(`${label} 的位置不存在。`);
      return;
    }
    if (pin.slotIndex < 1 || pin.slotIndex > slot.count) {
      errors.push(`${label} 的位置序号超出 ${slot.label} 容量。`);
    }
    if (pinnedPlayers.has(pin.playerId)) {
      errors.push(`${label} 重复指定了同一名球员。`);
    }
    pinnedPlayers.add(pin.playerId);

    const targetKey = targetKeyOf(pin);
    if (pinnedTargets.has(targetKey)) {
      errors.push(`${label} 重复占用了同一个队伍位置。`);
    }
    pinnedTargets.add(targetKey);

    pinnedByTeam.set(pin.teamId, (pinnedByTeam.get(pin.teamId) ?? 0) + 1);
  });

  pinnedByTeam.forEach((count, teamId) => {
    if (count > input.perTeamCount) {
      const team = input.teams.find((item) => item.id === teamId);
      errors.push(`${team?.name ?? "某队"} 的指定球员超过了上场人数。`);
    }
  });

  return { ok: errors.length === 0, errors };
}

export function randomizeTeams(input: RandomizeInput): RandomResult {
  const validation = validateRandomizeInput(input);
  if (!validation.ok) {
    throw new Error(validation.errors.join("\n"));
  }

  let result: RandomResult | undefined;
  const rounds = Math.max(1, Math.trunc(input.randomRounds));
  for (let round = 0; round < rounds; round += 1) {
    result = runSingleRandomize(input, rounds);
  }
  return result as RandomResult;
}

function runSingleRandomize(input: RandomizeInput, rounds: number): RandomResult {
  const requiredPlayers = input.teams.length * input.perTeamCount;
  const virtualCount = Math.max(0, requiredPlayers - input.players.length);
  const virtualPlayers: Player[] = Array.from({ length: virtualCount }, (_, index) => ({
    id: `virtual-${index + 1}`,
    label: `虚拟球员 ${index + 1}`,
    kind: "name",
    number: `V${index + 1}`,
    isVirtual: true,
  }));
  const allPlayers = [...input.players, ...virtualPlayers];
  const targets = buildSlotTargets(input.teams, input.formationSlots);
  const pinnedTargetKeys = new Set(input.pinnedAssignments.map((pin) => targetKeyOf(pin)));
  const openTargets = targets.filter((target) => !pinnedTargetKeys.has(targetKeyOf(target)));
  const usedPinnedPlayers = new Set(input.pinnedAssignments.map((pin) => pin.playerId));
  const shuffledPool = shuffleWithCrypto(
    allPlayers.filter((player) => !usedPinnedPlayers.has(player.id)),
  );

  const assignments: Assignment[] = input.pinnedAssignments.map((pin) => ({
    ...assignmentFromTarget(pin, input.formationSlots),
    playerId: pin.playerId,
  }));

  openTargets.forEach((target, index) => {
    const player = shuffledPool[index];
    if (!player) return;
    assignments.push({
      ...assignmentFromTarget(target, input.formationSlots),
      playerId: player.id,
    });
  });

  const assignedPlayerIds = new Set(assignments.map((assignment) => assignment.playerId));
  const benchPlayers = shuffleWithCrypto(
    allPlayers.filter((player) => !assignedPlayerIds.has(player.id) && !player.isVirtual),
  );
  const bench = assignBenchPlayers(benchPlayers, input.teams);

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    randomSource: "Web Crypto",
    randomRounds: rounds,
    teams: input.teams,
    perTeamCount: input.perTeamCount,
    players: allPlayers,
    formationSlots: input.formationSlots,
    assignments,
    bench,
    events: [],
    virtualCount,
    benchCount: bench.length,
  };
}

function buildSlotTargets(teams: Team[], formationSlots: FormationSlot[]): SlotTarget[] {
  return teams.flatMap((team) =>
    formationSlots.flatMap((slot) =>
      Array.from({ length: slot.count }, (_, index) => ({
        teamId: team.id,
        slotId: slot.id,
        slotIndex: index + 1,
      })),
    ),
  );
}

function assignmentFromTarget(target: SlotTarget, formationSlots: FormationSlot[]): Assignment {
  const slot = formationSlots.find((item) => item.id === target.slotId);
  const slotMiddleOffset = target.slotIndex - 1 - ((slot?.count ?? 1) - 1) / 2;

  return {
    playerId: "pending",
    teamId: target.teamId,
    slotId: target.slotId,
    slotIndex: target.slotIndex,
    boardX: clamp((slot?.defaultX ?? 50) + slotMiddleOffset * 13, 8, 92),
    boardY: clamp((slot?.defaultY ?? 50) + slotMiddleOffset * 8, 8, 92),
  };
}

function assignBenchPlayers(players: Player[], teams: Team[]): BenchAssignment[] {
  const benchCounts = new Map(teams.map((team) => [team.id, 0]));

  return players.map((player, order) => {
    const randomizedTeams = shuffleWithCrypto(teams);
    const team = randomizedTeams.reduce((best, current) => {
      const bestCount = benchCounts.get(best.id) ?? 0;
      const currentCount = benchCounts.get(current.id) ?? 0;
      return currentCount < bestCount ? current : best;
    });
    benchCounts.set(team.id, (benchCounts.get(team.id) ?? 0) + 1);

    return {
      playerId: player.id,
      teamId: team.id,
      order: order + 1,
    };
  });
}

function targetKeyOf(target: SlotTarget): string {
  return `${target.teamId}:${target.slotId}:${target.slotIndex}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
