import {
  ArrowLeft,
  Check,
  Dice5,
  Lock,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import {
  CSSProperties,
  FormEvent,
  PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { randomizeTeams, validateRandomizeInput } from "./random";
import { loadJson, loadSessionJson, saveJson, saveSessionJson } from "./storage";
import type {
  Assignment,
  BenchAssignment,
  FormationSlot,
  MatchConfig,
  MatchEvent,
  Player,
  PlayerKind,
  RandomResult,
  Team,
} from "./types";

const AUTH_KEY = "football-randomizer-auth-v3";
const CONFIG_KEY = "football-randomizer-config-v3";
const RESULT_KEY = "football-randomizer-result-v3";
const INVITE_CODES = parseInviteCodes(
  import.meta.env.VITE_INVITE_CODES ?? import.meta.env.VITE_INVITE_CODE,
);

type CrestPreset = {
  id: string;
  label: string;
  short: string;
  color: string;
  accent: string;
  textColor?: string;
  logoUrl?: string;
};

const CREST_PRESETS: CrestPreset[] = [
  {
    id: "man-united",
    label: "曼联",
    short: "MU",
    color: "#da291c",
    accent: "#fbe122",
    logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/360.png",
  },
  {
    id: "barcelona",
    label: "巴萨",
    short: "BAR",
    color: "#a50044",
    accent: "#004d98",
    logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/83.png",
  },
  {
    id: "real-madrid",
    label: "皇马",
    short: "RMA",
    color: "#f8fafc",
    accent: "#d4af37",
    textColor: "#111827",
    logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/86.png",
  },
  {
    id: "juventus",
    label: "尤文",
    short: "JUV",
    color: "#111827",
    accent: "#f8fafc",
    logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/111.png",
  },
  {
    id: "psg",
    label: "巴黎",
    short: "PSG",
    color: "#004170",
    accent: "#da291c",
    logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/160.png",
  },
  {
    id: "arsenal",
    label: "阿森纳",
    short: "ARS",
    color: "#ef0107",
    accent: "#f9d616",
    logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/359.png",
  },
  {
    id: "liverpool",
    label: "利物浦",
    short: "LIV",
    color: "#c8102e",
    accent: "#00b2a9",
    logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/364.png",
  },
  {
    id: "man-city",
    label: "曼城",
    short: "MCI",
    color: "#6cabdd",
    accent: "#ffffff",
    logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/382.png",
  },
];

const DEFAULT_TEAMS: Team[] = [
  { id: "team-main", name: "曼联", color: "#da291c", textColor: "#ffffff", crestId: "man-united" },
];

const DEFAULT_CONFIG: MatchConfig = {
  teams: DEFAULT_TEAMS,
  perTeamCount: 6,
  playerMode: "number",
  numberPlayerCount: 6,
  namesText: "阿明\n小林\n健太\nLeo\n翔太\n小王",
  formationSlots: presetFormation(6),
  pinnedAssignments: [],
  randomRounds: 1,
};

type Step = "teams" | "formation" | "board";

type GoalDraft = {
  scorerId: string;
  assistId: string;
  minute: string;
  note: string;
};

type BoardDisplayMode = "number" | "name";

export default function App() {
  const [isAuthed, setIsAuthed] = useState(() => loadJson(AUTH_KEY, false));
  const [inviteInput, setInviteInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [config, setConfig] = useState<MatchConfig>(() =>
    loadSessionJson(CONFIG_KEY, DEFAULT_CONFIG),
  );
  const [result, setResult] = useState<RandomResult | null>(() =>
    loadSessionJson<RandomResult | null>(RESULT_KEY, null),
  );
  const [step, setStep] = useState<Step>(() =>
    loadSessionJson(RESULT_KEY, null) ? "board" : "teams",
  );
  const [activeTeamId, setActiveTeamId] = useState(
    () =>
      loadSessionJson<RandomResult | null>(RESULT_KEY, null)?.teams[0]?.id ??
      DEFAULT_TEAMS[0].id,
  );
  const [message, setMessage] = useState("");

  const players = useMemo(() => buildPlayers(config), [config]);
  const neededCount = config.teams.length * config.perTeamCount;
  const shortage = Math.max(0, neededCount - players.length);
  const surplus = Math.max(0, players.length - neededCount);
  const validation = useMemo(
    () =>
      validateRandomizeInput({
        teams: config.teams,
        perTeamCount: config.perTeamCount,
        players,
        formationSlots: config.formationSlots,
        pinnedAssignments: [],
        randomRounds: config.randomRounds,
      }),
    [config, players],
  );

  useEffect(() => saveJson(AUTH_KEY, isAuthed), [isAuthed]);
  useEffect(() => saveSessionJson(CONFIG_KEY, config), [config]);
  useEffect(() => saveSessionJson(RESULT_KEY, result), [result]);

  function updateConfig(patch: Partial<MatchConfig>) {
    setConfig((current) => ({ ...current, ...patch, pinnedAssignments: [] }));
  }

  function handleInviteSubmit(event: FormEvent) {
    event.preventDefault();
    if (INVITE_CODES.includes(inviteInput.trim())) {
      setIsAuthed(true);
      setAuthError("");
      return;
    }
    setAuthError("邀请码不正确。");
  }

  function handleRandomize() {
    try {
      const next = randomizeTeams({
        teams: config.teams,
        perTeamCount: config.perTeamCount,
        players,
        formationSlots: config.formationSlots,
        pinnedAssignments: [],
        randomRounds: config.randomRounds,
      });
      setResult(next);
      setActiveTeamId(next.teams[0]?.id ?? "");
      setStep("board");
      setMessage(
        `随机完成。${next.virtualCount ? `已补入 ${next.virtualCount} 名虚拟球员。` : ""}${next.benchCount ? ` ${next.benchCount} 名球员进入替补。` : ""}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "随机失败，请检查配置。");
    }
  }

  if (!isAuthed) {
    return (
      <main className="login-shell">
        <form className="login-card" onSubmit={handleInviteSubmit}>
          <div className="lock-mark">
            <Lock size={24} />
          </div>
          <p className="eyebrow">Invite Only</p>
          <h1>足球随机分队</h1>
          <label className="field">
            <span>邀请码</span>
            <input
              value={inviteInput}
              onChange={(event) => setInviteInput(event.target.value)}
              placeholder="请输入邀请码"
              autoFocus
            />
          </label>
          {authError && <p className="error-text">{authError}</p>}
          <button className="primary-button full" type="submit">
            <Check size={18} />
            进入
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Web Crypto Randomizer</p>
          <h1>足球随机分队</h1>
        </div>
        <nav className="step-tabs" aria-label="流程">
          <button className={step === "teams" ? "active" : ""} onClick={() => setStep("teams")}>
            1 队伍
          </button>
          <button
            className={step === "formation" ? "active" : ""}
            onClick={() => setStep("formation")}
          >
            2 位置
          </button>
          <button
            className={step === "board" ? "active" : ""}
            onClick={() => setStep("board")}
            disabled={!result}
          >
            3 战术板
          </button>
        </nav>
      </header>

      {message && (
        <section className="notice" role="status">
          {message}
          <button onClick={() => setMessage("")} aria-label="关闭提示">
            ×
          </button>
        </section>
      )}

      {step === "teams" && (
        <TeamSetup
          config={config}
          players={players}
          neededCount={neededCount}
          shortage={shortage}
          surplus={surplus}
          updateConfig={updateConfig}
          onNext={() => setStep("formation")}
        />
      )}

      {step === "formation" && (
        <FormationSetup
          config={config}
          validationErrors={validation.errors}
          updateConfig={updateConfig}
          onBack={() => setStep("teams")}
          onRandomize={handleRandomize}
        />
      )}

      {step === "board" && result && (
        <TacticalBoard
          result={result}
          activeTeamId={activeTeamId}
          setActiveTeamId={setActiveTeamId}
          setResult={setResult}
          onBackToFormation={() => setStep("formation")}
        />
      )}
    </main>
  );
}

function TeamSetup({
  config,
  players,
  neededCount,
  shortage,
  surplus,
  updateConfig,
  onNext,
}: {
  config: MatchConfig;
  players: Player[];
  neededCount: number;
  shortage: number;
  surplus: number;
  updateConfig: (patch: Partial<MatchConfig>) => void;
  onNext: () => void;
}) {
  return (
    <div className="mobile-flow">
      <section className="panel">
        <div className="section-title inline">
          <div>
            <h2>创建队伍</h2>
            <p>这个页面只管理一支队伍。多支队伍请打开多个页面。</p>
          </div>
        </div>

        <div className="team-list">
          {config.teams.slice(0, 1).map((team) => (
            <div className="team-row" key={team.id}>
              <CrestMark preset={getCrestPreset(team)} />
              <input
                value={team.name}
                onChange={(event) =>
                  updateConfig({
                    teams: config.teams.map((item) =>
                      item.id === team.id ? { ...item, name: event.target.value } : item,
                    ),
                  })
                }
              />
            </div>
          ))}
        </div>

        <div className="crest-picker" aria-label="队徽预设">
          {CREST_PRESETS.map((preset) => (
            <button
              className={
                config.teams[0]?.crestId === preset.id ? "crest-option active" : "crest-option"
              }
              key={preset.id}
              onClick={() =>
                updateConfig({
                  teams: config.teams.map((team, index) =>
                    index === 0
                      ? {
                          ...team,
                          color: preset.color,
                          textColor: preset.textColor ?? readableTextColor(preset.color),
                          crestId: preset.id,
                          crestUrl: preset.logoUrl,
                          name: preset.label,
                        }
                      : team,
                  ),
                })
              }
            >
              <CrestMark preset={preset} />
              <span>{preset.label}</span>
            </button>
          ))}
          <button
            className={config.teams[0]?.crestId === "custom" ? "crest-option active" : "crest-option"}
            onClick={() =>
              updateConfig({
                teams: config.teams.map((team, index) =>
                  index === 0
                    ? {
                        ...team,
                        crestId: "custom",
                        crestUrl: undefined,
                        color: team.color,
                        textColor: readableTextColor(team.color),
                      }
                    : team,
                ),
              })
            }
          >
            <CrestMark
              preset={{
                id: "custom",
                label: "自定义",
                short: "自",
                color: config.teams[0]?.color ?? "#c9ff31",
                textColor: readableTextColor(config.teams[0]?.color ?? "#c9ff31"),
                accent: "#c9ff31",
              }}
            />
            <span>自定义</span>
          </button>
        </div>

        {config.teams[0]?.crestId === "custom" && (
          <div className="custom-crest">
            <label>
              主色
              <input
                type="color"
                value={config.teams[0]?.color ?? ""}
                onChange={(event) =>
                  updateConfig({
                    teams: config.teams.map((team, index) =>
                      index === 0
                        ? {
                            ...team,
                            color: event.target.value,
                            textColor: readableTextColor(event.target.value),
                          }
                        : team,
                    ),
                  })
                }
              />
            </label>
            <div className="todo-field">
              <strong>队标图片</strong>
              <span>TODO</span>
            </div>
          </div>
        )}

        <label className="field">
          <span>上场人数</span>
          <div className="preset-row">
            {[11, 9, 6].map((count) => (
              <button
                className={config.perTeamCount === count ? "chip active" : "chip"}
                key={count}
                onClick={() =>
                  updateConfig({
                    perTeamCount: count,
                    formationSlots: presetFormation(count),
                  })
                }
              >
                {count}
              </button>
            ))}
            <input
              className="small-number"
              type="number"
              min={1}
              max={30}
              value={config.perTeamCount}
              onChange={(event) => {
                const next = Number(event.target.value) || 1;
                updateConfig({
                  perTeamCount: next,
                  formationSlots: rebalanceFormation(config.formationSlots, next),
                });
              }}
            />
          </div>
        </label>
      </section>

      <section className="panel">
        <div className="section-title inline">
          <div>
            <h2>球员名单</h2>
            <p>可以用数字，也可以用姓名。</p>
          </div>
          <div className="segmented">
            {(["number", "name"] as PlayerKind[]).map((mode) => (
              <button
                key={mode}
                className={config.playerMode === mode ? "active" : ""}
                onClick={() => updateConfig({ playerMode: mode })}
              >
                {mode === "number" ? "号码" : "姓名"}
              </button>
            ))}
          </div>
        </div>

        {config.playerMode === "number" ? (
          <label className="field">
            <span>生成号码数量</span>
            <input
              type="number"
              min={1}
              max={300}
              value={config.numberPlayerCount}
              onChange={(event) =>
                updateConfig({ numberPlayerCount: Number(event.target.value) || 1 })
              }
            />
          </label>
        ) : (
          <label className="field">
            <span>每行一名球员</span>
            <textarea
              rows={8}
              value={config.namesText}
              onChange={(event) => updateConfig({ namesText: event.target.value })}
            />
          </label>
        )}

        <div className="summary-strip">
          <span>需要 {neededCount} 人</span>
          <span>当前 {players.length} 人</span>
          {shortage > 0 && <strong>不足会补 {shortage} 个虚拟球员</strong>}
          {surplus > 0 && <strong>超出 {surplus} 人会进替补</strong>}
        </div>

        <div className="number-preview">
          {players.slice(0, 40).map((player) => (
            <span className="mini-player" key={player.id}>
              {player.label}
            </span>
          ))}
          {players.length > 40 && <span className="mini-player">+{players.length - 40}</span>}
        </div>
      </section>

      <button className="primary-button full sticky-action" onClick={onNext}>
        <Users size={18} />
        下一步：设置位置
      </button>
    </div>
  );
}

function FormationSetup({
  config,
  validationErrors,
  updateConfig,
  onBack,
  onRandomize,
}: {
  config: MatchConfig;
  validationErrors: string[];
  updateConfig: (patch: Partial<MatchConfig>) => void;
  onBack: () => void;
  onRandomize: () => void;
}) {
  const formationTotal = config.formationSlots.reduce((sum, slot) => sum + slot.count, 0);

  return (
    <div className="mobile-flow">
      <section className="panel">
        <div className="section-title inline">
          <div>
            <h2>设置位置</h2>
            <p>
              当前 {formationTotal} / {config.perTeamCount} 人。每个队都会按这些位置随机分配。
            </p>
          </div>
          <button
            className="soft-button"
            onClick={() =>
              updateConfig({
                formationSlots: [
                  ...config.formationSlots,
                  {
                    id: createId("slot"),
                    label: "新位置",
                    count: 1,
                    defaultX: 50,
                    defaultY: 50,
                  },
                ],
              })
            }
          >
            <Plus size={17} />
            添加
          </button>
        </div>

        <div className="formation-list">
          {config.formationSlots.map((slot) => (
            <div className="formation-card" key={slot.id}>
              <input
                value={slot.label}
                aria-label="位置名称"
                onChange={(event) =>
                  updateSlot(config, updateConfig, slot.id, { label: event.target.value })
                }
              />
              <label>
                人数
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={slot.count}
                  onChange={(event) =>
                    updateSlot(config, updateConfig, slot.id, {
                      count: Number(event.target.value) || 1,
                    })
                  }
                />
              </label>
              <details className="position-tune">
                <summary>站位微调</summary>
                <label>
                  左右
                  <input
                    type="range"
                    min={10}
                    max={90}
                    value={slot.defaultX}
                    onChange={(event) =>
                      updateSlot(config, updateConfig, slot.id, {
                        defaultX: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  前后
                  <input
                    type="range"
                    min={10}
                    max={90}
                    value={slot.defaultY}
                    onChange={(event) =>
                      updateSlot(config, updateConfig, slot.id, {
                        defaultY: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </details>
              <button
                className="icon-button danger"
                title="删除位置"
                disabled={config.formationSlots.length <= 1}
                onClick={() =>
                  updateConfig({
                    formationSlots: config.formationSlots.filter((item) => item.id !== slot.id),
                  })
                }
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>

        <div className="random-options">
          <label className="field">
            <span>随机次数</span>
            <input
              type="number"
              min={1}
              max={20}
              value={config.randomRounds}
              onChange={(event) => updateConfig({ randomRounds: Number(event.target.value) || 1 })}
            />
          </label>
          <div className="validation-list">
            {validationErrors.length ? (
              validationErrors.map((error) => <p key={error}>{error}</p>)
            ) : (
              <p className="ok-text">可以开始随机。</p>
            )}
          </div>
        </div>
      </section>

      <div className="bottom-actions">
        <button className="soft-button" onClick={onBack}>
          <ArrowLeft size={17} />
          返回
        </button>
        <button
          className="primary-button"
          onClick={onRandomize}
          disabled={validationErrors.length > 0}
        >
          <Dice5 size={18} />
          开始随机
        </button>
      </div>
    </div>
  );
}

function TacticalBoard({
  result,
  activeTeamId,
  setActiveTeamId,
  setResult,
  onBackToFormation,
}: {
  result: RandomResult;
  activeTeamId: string;
  setActiveTeamId: (teamId: string) => void;
  setResult: (updater: (current: RandomResult | null) => RandomResult | null) => void;
  onBackToFormation: () => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [goalDraft, setGoalDraft] = useState<GoalDraft>({
    scorerId: "",
    assistId: "",
    minute: "",
    note: "",
  });
  const [displayMode, setDisplayMode] = useState<BoardDisplayMode>("name");
  const playersById = useMemo(() => mapPlayers(result.players), [result.players]);
  const slotsById = useMemo(() => mapSlots(result.formationSlots), [result.formationSlots]);
  const activeTeam = result.teams.find((team) => team.id === activeTeamId) ?? result.teams[0];
  const activeCrest = getCrestPreset(activeTeam);
  const starters = result.assignments.filter((assignment) => assignment.teamId === activeTeam.id);
  const bench = result.bench.filter((item) => item.teamId === activeTeam.id);
  const scoreByTeam = scoreFromEvents(result.events, result.teams);

  useEffect(() => {
    if (!result.teams.some((team) => team.id === activeTeamId)) {
      setActiveTeamId(result.teams[0]?.id ?? "");
    }
  }, [activeTeamId, result.teams, setActiveTeamId]);

  function movePlayer(event: PointerEvent<HTMLElement>, playerId: string) {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setResult((current) =>
      current
        ? {
            ...current,
            assignments: current.assignments.map((assignment) =>
              assignment.playerId === playerId
                ? { ...assignment, boardX: clamp(x, 6, 94), boardY: clamp(y, 6, 94) }
                : assignment,
            ),
          }
        : current,
    );
  }

  function addGoal() {
    if (!goalDraft.scorerId) return;
    const event: MatchEvent = {
      id: createId("goal"),
      teamId: activeTeam.id,
      scorerId: goalDraft.scorerId,
      assistId: goalDraft.assistId || undefined,
      minute: goalDraft.minute || undefined,
      note: goalDraft.note || undefined,
    };
    setResult((current) =>
      current ? { ...current, events: [...current.events, event] } : current,
    );
    setGoalDraft({ scorerId: "", assistId: "", minute: "", note: "" });
  }

  function resetActiveTeam() {
    setResult((current) => {
      if (!current) return current;
      return {
        ...current,
        assignments: current.assignments.map((assignment) => {
          if (assignment.teamId !== activeTeam.id) return assignment;
          return defaultPositionForAssignment(assignment, current.formationSlots);
        }),
      };
    });
  }

  function updatePlayerLabel(playerId: string, label: string) {
    setResult((current) =>
      current
        ? {
            ...current,
            players: current.players.map((player) =>
              player.id === playerId ? { ...player, label } : player,
            ),
          }
        : current,
    );
  }

  return (
    <div className="board-flow">
      <section className="panel compact-panel">
        <div className="team-switcher">
          {result.teams.map((team) => (
            <button
              key={team.id}
              className={team.id === activeTeam.id ? "team-tab active" : "team-tab"}
              style={crestVars(getCrestPreset(team))}
              onClick={() => {
                setActiveTeamId(team.id);
                setGoalDraft({ scorerId: "", assistId: "", minute: "", note: "" });
              }}
            >
              <span />
              {team.name}
              <b>{scoreByTeam.get(team.id) ?? 0}</b>
            </button>
          ))}
        </div>
      </section>

      <section className="pitch-panel single-board">
        <div className="pitch-toolbar">
          <div>
            <strong style={{ color: activeTeam.color }}>{activeTeam.name}</strong>
            <span>
              {new Date(result.createdAt).toLocaleString()} · {result.randomSource} · 随机{" "}
              {result.randomRounds} 次
            </span>
          </div>
          <div className="toolbar-actions">
            <div className="segmented compact-segmented" aria-label="战术板显示">
              <button
                className={displayMode === "number" ? "active" : ""}
                onClick={() => setDisplayMode("number")}
              >
                号码
              </button>
              <button
                className={displayMode === "name" ? "active" : ""}
                onClick={() => setDisplayMode("name")}
              >
                名字
              </button>
            </div>
            <button className="soft-button" onClick={resetActiveTeam}>
              <RotateCcw size={17} />
              重置
            </button>
          </div>
        </div>

        <div className="pitch" ref={boardRef} style={crestVars(activeCrest)}>
          <div className="pitch-crest-layer" data-crest={activeCrest.short} />
          <div className="pitch-line halfway" />
          <div className="pitch-circle" />
          <div className="box box-top" />
          <div className="box box-bottom" />
          {starters.map((assignment, index) => {
            const player = playersById.get(assignment.playerId);
            const slot = slotsById.get(assignment.slotId);
            return (
              <button
                className={`round-token ${player?.isVirtual ? "virtual" : ""}`}
                key={assignment.playerId}
                title={`${player?.label ?? "未知"} · ${slot?.label ?? "位置"}`}
                data-crest={activeCrest.short}
                data-mode={displayMode}
                data-len={displayTokenLabel(player, index, displayMode).length}
                style={{
                  left: `${assignment.boardX}%`,
                  top: `${assignment.boardY}%`,
                  ...crestVars(activeCrest),
                }}
                onPointerDown={(event) => {
                  setDraggingId(assignment.playerId);
                  event.currentTarget.setPointerCapture(event.pointerId);
                  movePlayer(event, assignment.playerId);
                }}
                onPointerMove={(event) => {
                  if (draggingId === assignment.playerId) {
                    movePlayer(event, assignment.playerId);
                  }
                }}
                onPointerUp={() => setDraggingId(null)}
                onPointerCancel={() => setDraggingId(null)}
              >
                {displayTokenLabel(player, index, displayMode)}
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel board-details">
        <div className="detail-block">
          <h2>进球</h2>
          <div className="goal-form">
            <input
              placeholder="进球人"
              value={goalDraft.scorerId}
              onChange={(event) => setGoalDraft({ ...goalDraft, scorerId: event.target.value })}
            />
            <input
              placeholder="助攻人"
              value={goalDraft.assistId}
              onChange={(event) => setGoalDraft({ ...goalDraft, assistId: event.target.value })}
            />
            <div className="inline-fields">
              <input
                placeholder="时间"
                value={goalDraft.minute}
                onChange={(event) => setGoalDraft({ ...goalDraft, minute: event.target.value })}
              />
              <input
                placeholder="备注"
                value={goalDraft.note}
                onChange={(event) => setGoalDraft({ ...goalDraft, note: event.target.value })}
              />
            </div>
            <button className="primary-button full" onClick={addGoal}>
              <Save size={17} />
              记录进球
            </button>
          </div>
        </div>

        <details className="detail-block collapsible">
          <summary>名单</summary>
          <div className="roster-list">
            {starters.map((assignment, index) => {
              const player = playersById.get(assignment.playerId);
              const slot = slotsById.get(assignment.slotId);
              return (
                <div className="roster-row" key={assignment.playerId}>
                  <span
                    style={{
                      background: activeTeam.color,
                      color: activeTeam.textColor ?? readableTextColor(activeTeam.color),
                    }}
                  >
                    {playerNumber(player, index)}
                  </span>
                  <p>
                    <input
                      className="roster-name-input"
                      value={editablePlayerName(player)}
                      onChange={(event) =>
                        updatePlayerLabel(assignment.playerId, event.target.value)
                      }
                    />
                    <small>
                      {slot?.label} #{assignment.slotIndex}
                      {player?.isVirtual ? " · 补位" : ""}
                    </small>
                  </p>
                </div>
              );
            })}
          </div>
        </details>

        <div className="detail-block">
          <h2>替补</h2>
          <div className="bench-list">
            {bench.length ? (
              bench.map((item) => (
                <span className="bench-pill" key={item.playerId}>
                  {playersById.get(item.playerId)?.label}
                </span>
              ))
            ) : (
              <p className="empty-text">无替补</p>
            )}
          </div>
        </div>

        <div className="detail-block">
          <h2>记录</h2>
          <div className="event-list">
            {result.events.length ? (
              result.events.map((event) => {
                const team = result.teams.find((item) => item.id === event.teamId);
                return (
                  <div className="event-row" key={event.id}>
                    <span style={{ background: team?.color }} />
                    <p>
                      <strong>{team?.name}</strong> {eventName(playersById, event.scorerId)}
                      {event.assistId && ` · 助攻 ${eventName(playersById, event.assistId)}`}
                      {event.minute && ` · ${event.minute}`}
                      {event.note && ` · ${event.note}`}
                    </p>
                    <button
                      className="icon-button danger"
                      title="删除记录"
                      onClick={() =>
                        setResult((current) =>
                          current
                            ? {
                                ...current,
                                events: current.events.filter((item) => item.id !== event.id),
                              }
                            : current,
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="empty-text">暂无进球记录。</p>
            )}
          </div>
        </div>

        <button className="soft-button full" onClick={onBackToFormation}>
          <ArrowLeft size={17} />
          返回位置设置
        </button>
      </section>
    </div>
  );
}

function buildPlayers(config: MatchConfig): Player[] {
  if (config.playerMode === "number") {
    return Array.from({ length: Math.max(0, config.numberPlayerCount) }, (_, index) => ({
      id: `number-${index + 1}`,
      label: String(index + 1),
      kind: "number",
      number: String(index + 1),
    }));
  }

  return config.namesText
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name, index) => ({
      id: `name-${index + 1}-${encodeURIComponent(name)}`,
      label: name,
      kind: "name",
      number: String(index + 1),
    }));
}

function presetFormation(count: number): FormationSlot[] {
  const presets: Record<number, Array<Omit<FormationSlot, "id">>> = {
    11: [
      { label: "门将", count: 1, defaultX: 50, defaultY: 90 },
      { label: "左后卫", count: 1, defaultX: 24, defaultY: 72 },
      { label: "中后卫", count: 2, defaultX: 50, defaultY: 72 },
      { label: "右后卫", count: 1, defaultX: 76, defaultY: 72 },
      { label: "后腰", count: 2, defaultX: 50, defaultY: 55 },
      { label: "前腰", count: 1, defaultX: 50, defaultY: 38 },
      { label: "边锋", count: 2, defaultX: 28, defaultY: 22 },
      { label: "中锋", count: 1, defaultX: 50, defaultY: 16 },
    ],
    9: [
      { label: "门将", count: 1, defaultX: 50, defaultY: 90 },
      { label: "后卫", count: 3, defaultX: 50, defaultY: 70 },
      { label: "中场", count: 3, defaultX: 50, defaultY: 46 },
      { label: "前锋", count: 2, defaultX: 50, defaultY: 20 },
    ],
    6: [
      { label: "门将", count: 1, defaultX: 50, defaultY: 90 },
      { label: "后卫", count: 2, defaultX: 50, defaultY: 66 },
      { label: "中场", count: 2, defaultX: 50, defaultY: 42 },
      { label: "前锋", count: 1, defaultX: 50, defaultY: 18 },
    ],
  };

  const base =
    presets[count] ??
    Array.from({ length: count }, (_, index) => ({
      label: `位置 ${index + 1}`,
      count: 1,
      defaultX: 50,
      defaultY: 88 - (index / Math.max(1, count - 1)) * 72,
    }));

  return base.map((slot, index) => ({ ...slot, id: `slot-${count}-${index + 1}` }));
}

function rebalanceFormation(slots: FormationSlot[], targetCount: number): FormationSlot[] {
  const currentTotal = slots.reduce((sum, slot) => sum + slot.count, 0);
  if (!slots.length) return presetFormation(targetCount);
  const diff = targetCount - currentTotal;
  return slots.map((slot, index) =>
    index === slots.length - 1 ? { ...slot, count: Math.max(1, slot.count + diff) } : slot,
  );
}

function updateSlot(
  config: MatchConfig,
  updateConfig: (patch: Partial<MatchConfig>) => void,
  slotId: string,
  patch: Partial<FormationSlot>,
) {
  updateConfig({
    formationSlots: config.formationSlots.map((slot) =>
      slot.id === slotId ? { ...slot, ...patch } : slot,
    ),
  });
}

function defaultPositionForAssignment(
  assignment: Assignment,
  slots: FormationSlot[],
): Assignment {
  const slot = slots.find((item) => item.id === assignment.slotId);
  const slotMiddleOffset = assignment.slotIndex - 1 - ((slot?.count ?? 1) - 1) / 2;
  return {
    ...assignment,
    boardX: clamp((slot?.defaultX ?? 50) + slotMiddleOffset * 13, 8, 92),
    boardY: clamp((slot?.defaultY ?? 50) + slotMiddleOffset * 8, 8, 92),
  };
}

function mapPlayers(players: Player[]): Map<string, Player> {
  return new Map(players.map((player) => [player.id, player]));
}

function mapSlots(slots: FormationSlot[]): Map<string, FormationSlot> {
  return new Map(slots.map((slot) => [slot.id, slot]));
}

function scoreFromEvents(events: MatchEvent[], teams: Team[]) {
  const score = new Map(teams.map((team) => [team.id, 0]));
  events.forEach((event) => score.set(event.teamId, (score.get(event.teamId) ?? 0) + 1));
  return score;
}

function displayTokenLabel(
  player: Player | undefined,
  fallback: number,
  mode: BoardDisplayMode,
): string {
  if (mode === "number") return playerNumber(player, fallback);
  return clampDisplayName(editablePlayerName(player) || playerNumber(player, fallback));
}

function playerNumber(player: Player | undefined, fallback: number): string {
  if (!player) return String(fallback + 1);
  return player.number ?? (player.kind === "number" ? player.label : String(fallback + 1));
}

function editablePlayerName(player: Player | undefined): string {
  if (!player) return "";
  if (player.kind === "number" && player.label === player.number) return "";
  return player.label;
}

function clampDisplayName(value: string): string {
  const chars = Array.from(value.trim());
  return chars.slice(0, 4).join("");
}

function eventName(playersById: Map<string, Player>, value: string): string {
  return playersById.get(value)?.label ?? value;
}

function getCrestPreset(team?: Team): CrestPreset {
  if (team?.crestId === "custom") {
    return {
      id: "custom",
      label: "自定义",
      short: "自",
      color: team.color,
      textColor: team.textColor ?? readableTextColor(team.color),
      accent: "#c9ff31",
      logoUrl: team.crestUrl,
    };
  }
  return (
    CREST_PRESETS.find((preset) => preset.id === team?.crestId) ??
    CREST_PRESETS.find((preset) => preset.color === team?.color) ??
    CREST_PRESETS[0]
  );
}

function crestVars(preset: CrestPreset): CSSProperties {
  return {
    "--team-color": preset.color,
    "--team-text": preset.textColor ?? readableTextColor(preset.color),
    "--crest-accent": preset.accent,
    "--crest-image": preset.logoUrl ? `url("${preset.logoUrl}")` : "none",
  } as CSSProperties;
}

function CrestMark({ preset }: { preset: CrestPreset }) {
  return (
    <span className="crest-mark" style={crestVars(preset)}>
      {preset.logoUrl ? <img src={preset.logoUrl} alt="" /> : preset.short}
    </span>
  );
}

function pickTeamColor(index: number): string {
  const colors = ["#e11d48", "#2563eb", "#111827", "#16a34a", "#f59e0b", "#7c3aed"];
  return colors[index % colors.length];
}

function readableTextColor(hex: string): string {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return "#ffffff";
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#111827" : "#ffffff";
}

function parseInviteCodes(raw?: string): string[] {
  const codes = (raw ?? "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
  return codes;
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
