import { describe, expect, it, vi } from "vitest";
import { randomizeTeams, validateRandomizeInput } from "./random";
import type { FormationSlot, Player, Team } from "./types";

vi.stubGlobal("crypto", {
  getRandomValues: (array: Uint32Array) => {
    array[0] = 7;
    return array;
  },
  randomUUID: () => "test-id",
});

const teams: Team[] = [
  { id: "red", name: "红队", color: "#d7263d" },
  { id: "blue", name: "蓝队", color: "#1d4ed8" },
];

const slots: FormationSlot[] = [
  { id: "fw", label: "前锋", count: 1, defaultX: 50, defaultY: 25 },
  { id: "df", label: "后卫", count: 1, defaultX: 50, defaultY: 65 },
];

const players: Player[] = [
  { id: "p1", label: "1", kind: "number", number: "1" },
  { id: "p2", label: "2", kind: "number", number: "2" },
  { id: "p3", label: "3", kind: "number", number: "3" },
  { id: "p4", label: "4", kind: "number", number: "4" },
  { id: "p5", label: "5", kind: "number", number: "5" },
];

describe("randomizeTeams", () => {
  it("supports a single-team page for opening multiple teams in separate tabs", () => {
    const result = randomizeTeams({
      teams: teams.slice(0, 1),
      perTeamCount: 2,
      players: players.slice(0, 3),
      formationSlots: slots,
      pinnedAssignments: [],
      randomRounds: 1,
    });

    expect(result.teams).toHaveLength(1);
    expect(result.assignments).toHaveLength(2);
    expect(result.bench).toHaveLength(1);
  });

  it("keeps generated player numbers separate from editable display labels", () => {
    const result = randomizeTeams({
      teams: teams.slice(0, 1),
      perTeamCount: 2,
      players,
      formationSlots: slots,
      pinnedAssignments: [],
      randomRounds: 1,
    });

    expect(result.players.every((player) => player.number)).toBe(true);
  });

  it("adds virtual players when the real player list is short", () => {
    const result = randomizeTeams({
      teams,
      perTeamCount: 2,
      players: players.slice(0, 3),
      formationSlots: slots,
      pinnedAssignments: [],
      randomRounds: 1,
    });

    expect(result.assignments).toHaveLength(4);
    expect(result.virtualCount).toBe(1);
    expect(result.players.some((player) => player.isVirtual)).toBe(true);
  });

  it("puts surplus real players on the bench", () => {
    const result = randomizeTeams({
      teams,
      perTeamCount: 2,
      players,
      formationSlots: slots,
      pinnedAssignments: [],
      randomRounds: 1,
    });

    expect(result.assignments).toHaveLength(4);
    expect(result.bench).toHaveLength(1);
    expect(new Set([...result.assignments.map((item) => item.playerId), ...result.bench.map((item) => item.playerId)]).size).toBe(5);
  });

  it("rejects impossible formation totals", () => {
    const validation = validateRandomizeInput({
      teams,
      perTeamCount: 3,
      players,
      formationSlots: slots,
      pinnedAssignments: [],
      randomRounds: 1,
    });

    expect(validation.ok).toBe(false);
  });

  it("keeps pinned players in their locked slot", () => {
    const result = randomizeTeams({
      teams: teams.slice(0, 1),
      perTeamCount: 2,
      players,
      formationSlots: slots,
      pinnedAssignments: [
        {
          playerId: "p1",
          teamId: "red",
          slotId: "df",
          slotIndex: 1,
        },
      ],
      randomRounds: 1,
    });

    expect(result.assignments).toContainEqual(
      expect.objectContaining({
        playerId: "p1",
        teamId: "red",
        slotId: "df",
        slotIndex: 1,
      }),
    );
  });
});
