export type PlayerKind = "name" | "number";

export type Team = {
  id: string;
  name: string;
  color: string;
  textColor?: string;
  crestId?: string;
  crestUrl?: string;
};

export type Player = {
  id: string;
  label: string;
  kind: PlayerKind;
  number?: string;
  isVirtual?: boolean;
};

export type FormationSlot = {
  id: string;
  label: string;
  count: number;
  defaultX: number;
  defaultY: number;
};

export type PinnedAssignment = {
  playerId: string;
  teamId: string;
  slotId: string;
  slotIndex: number;
};

export type Assignment = {
  playerId: string;
  teamId: string;
  slotId: string;
  slotIndex: number;
  boardX: number;
  boardY: number;
};

export type BenchAssignment = {
  playerId: string;
  teamId: string;
  order: number;
};

export type MatchEvent = {
  id: string;
  teamId: string;
  scorerId: string;
  assistId?: string;
  minute?: string;
  note?: string;
};

export type MatchConfig = {
  teams: Team[];
  perTeamCount: number;
  playerMode: PlayerKind;
  numberPlayerCount: number;
  namesText: string;
  formationSlots: FormationSlot[];
  pinnedAssignments: PinnedAssignment[];
  randomRounds: number;
};

export type RandomResult = {
  id: string;
  createdAt: string;
  randomSource: "Web Crypto";
  randomRounds: number;
  teams: Team[];
  perTeamCount: number;
  players: Player[];
  formationSlots: FormationSlot[];
  assignments: Assignment[];
  bench: BenchAssignment[];
  events: MatchEvent[];
  virtualCount: number;
  benchCount: number;
};
