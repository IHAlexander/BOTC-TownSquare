'use strict';

// Message catalog for the server (game log, nomination log, reset messages)
// and the single source of truth for client UI strings: the active language's
// messages are included in every STATE broadcast.
//
// Placeholders use {name} syntax; values are plain strings so the catalog can
// travel over the wire as JSON.

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: '简体中文' },
];

const MESSAGES = {
  en: {
    'app.title': 'BOTC Town Square',
    'app.stTitle': 'ST Console — BOTC',
    'title.default': 'Blood on the Clocktower',
    'phase.day': 'Day {n}',
    'phase.night': 'Night {n}',
    'seat.empty': 'Empty',
    'block.onBlock': '{name} is on the block',
    'block.votesSoFar_one': '1 vote so far',
    'block.votesSoFar_other': '{n} votes so far',
    'block.majority_one': '1 vote needed for majority',
    'block.majority_other': '{n} votes needed for majority',
    'qr.label': 'ST Console',
    'button.fullscreen': 'Enter fullscreen',
    'button.undo': '↩ Undo',
    'button.undoTitle': 'Undo last action',
    'input.title': 'Session title…',
    'button.beginNight': 'Begin Night',
    'button.beginDay': 'Begin Day',
    'label.players': 'Players',
    'label.language': 'Language',
    'header.majority': '{alive} alive · {needed} to execute',
    'nomination.nominator': 'Nominator…',
    'nomination.nominates': 'nominates',
    'nomination.nominee': 'Nominee…',
    'nomination.submit': 'Nominate',
    'nomination.votesLabel': 'Votes:',
    'nomination.submitVotes': 'Submit Votes',
    'nomination.executeMarked': '⚰ Execute Marked',
    'nomination.marked': '{name} marked for execution',
    'button.cancel': 'Cancel',
    'button.putOnBlock': 'Put on block',
    'button.clearSeat': 'Clear seat',
    'button.execute': 'Execute',
    'block.showOnTV': 'Show on TV',
    'input.seatPlaceholder': 'Empty seat…',
    'confirm.execute': 'Execute {name}?',
    'confirm.thisPlayer': 'this player',
    'state.aliveShort': 'ALV',
    'state.deadVoteShort': 'D+V',
    'state.deadNoVoteShort': 'DED',
    'log.nominationLog': 'Nomination Log',
    'log.gameLog': 'Game Log',
    'button.reset': 'Reset Game',
    'reset.keepQuestion': 'Would you like to keep the existing players?',
    'reset.keep': 'Keep Players',
    'reset.full': 'Full Reset',
    'log.dayBegins': 'Day {n} begins',
    'log.nightBegins': 'Night {n} begins',
    'log.playerJoined': '{name} joined',
    'log.playerRemoved': '{name} removed',
    'log.playerRenamed': '{old} renamed to {new}',
    'log.nowAlive': '{name} is now alive',
    'log.nowDeadVote': '{name} is now dead (vote remaining)',
    'log.nowDeadNoVote': '{name} is now dead',
    'log.onBlock': '{name} is on the block',
    'log.executed': '{name} was executed',
    'log.nominated': '{nominator} nominated {nominee}',
    'log.voteResult_one': '{nominee}: 1 vote (need {threshold}) — {outcome}',
    'log.voteResult_other': '{nominee}: {votes} votes (need {threshold}) — {outcome}',
    'outcome.safe': 'safe',
    'outcome.marked': 'marked for execution',
    'outcome.tie': 'tie — no execution',
    'log.gameReset': 'Game reset',
    'log.gameResetPlayersKept': 'Game reset (players kept)',
    'nomlog.nominated': 'Day {n}: {nominator} nominated {nominee}',
    'nomlog.voteResult': 'Day {n}: {result}',
  },

  'zh-CN': {
    'app.title': '染 城镇广场',
    'app.stTitle': '说书人控制台 — 染',
    'title.default': '染·钟楼谜团',
    'phase.day': '第 {n} 天',
    'phase.night': '第 {n} 夜',
    'seat.empty': '空位',
    'block.onBlock': '{name} 即将被处决',
    'block.votesSoFar_one': '已有 1 票',
    'block.votesSoFar_other': '已有 {n} 票',
    'block.majority_one': '需 1 票通过',
    'block.majority_other': '需 {n} 票通过',
    'qr.label': '说书人控制台',
    'button.fullscreen': '进入全屏',
    'button.undo': '↩ 撤销',
    'button.undoTitle': '撤销上一步操作',
    'input.title': '本局标题…',
    'button.beginNight': '进入夜晚',
    'button.beginDay': '进入白天',
    'label.players': '玩家',
    'label.language': '语言',
    'header.majority': '存活 {alive} 人 · 处决需 {needed} 票',
    'nomination.nominator': '提名者…',
    'nomination.nominates': '提名',
    'nomination.nominee': '被提名者…',
    'nomination.submit': '提名',
    'nomination.votesLabel': '票数：',
    'nomination.submitVotes': '提交票数',
    'nomination.executeMarked': '⚰ 处决标记玩家',
    'nomination.marked': '{name} 已被标记处决',
    'button.cancel': '取消',
    'button.putOnBlock': '标记待处决',
    'button.clearSeat': '清空座位',
    'button.execute': '处决',
    'block.showOnTV': '在电视上显示',
    'input.seatPlaceholder': '空位…',
    'confirm.execute': '处决 {name}？',
    'confirm.thisPlayer': '该玩家',
    'state.aliveShort': '活',
    'state.deadVoteShort': '鬼',
    'state.deadNoVoteShort': '死',
    'log.nominationLog': '提名记录',
    'log.gameLog': '游戏记录',
    'button.reset': '重置游戏',
    'reset.keepQuestion': '是否保留现有玩家？',
    'reset.keep': '保留玩家',
    'reset.full': '完全重置',
    'log.dayBegins': '第 {n} 天开始',
    'log.nightBegins': '第 {n} 夜开始',
    'log.playerJoined': '{name} 加入',
    'log.playerRemoved': '{name} 离开',
    'log.playerRenamed': '{old} 改名为 {new}',
    'log.nowAlive': '{name} 现在存活',
    'log.nowDeadVote': '{name} 死亡（仍有幽灵票）',
    'log.nowDeadNoVote': '{name} 死亡',
    'log.onBlock': '{name} 即将被处决',
    'log.executed': '{name} 被处决',
    'log.nominated': '{nominator} 提名了 {nominee}',
    'log.voteResult_one': '{nominee}：{votes} 票（需 {threshold}）— {outcome}',
    'log.voteResult_other': '{nominee}：{votes} 票（需 {threshold}）— {outcome}',
    'outcome.safe': '安全',
    'outcome.marked': '标记处决',
    'outcome.tie': '平票 — 无人被处决',
    'log.gameReset': '游戏已重置',
    'log.gameResetPlayersKept': '游戏已重置（保留玩家）',
    'nomlog.nominated': '第 {n} 天：{nominator} 提名了 {nominee}',
    'nomlog.voteResult': '第 {n} 天：{result}',
  },
};

function isSupportedLanguage(code) {
  return SUPPORTED_LANGUAGES.some(lang => lang.code === code);
}

function interpolate(text, params) {
  if (!params) return text;
  for (const name of Object.keys(params)) {
    text = text.split(`{${name}}`).join(String(params[name]));
  }
  return text;
}

// Looks up a key in `lang`, falling back to English, then to the key itself.
function t(lang, key, params) {
  const dict = MESSAGES[lang] || MESSAGES.en;
  const text = dict[key] !== undefined ? dict[key] : MESSAGES.en[key];
  return text === undefined ? key : interpolate(text, params);
}

// Picks the `_one` / `_other` variant of `keyBase` based on `n`.
function tCount(lang, keyBase, n, params) {
  const key = `${keyBase}_${n === 1 ? 'one' : 'other'}`;
  return t(lang, key, Object.assign({ n }, params));
}

// The full message set for a language, merged over the English fallback.
// Included in every STATE broadcast so clients need no copy of the catalog.
function getMessages(lang) {
  return Object.assign({}, MESSAGES.en, MESSAGES[lang] || {});
}

module.exports = { SUPPORTED_LANGUAGES, MESSAGES, isSupportedLanguage, t, tCount, getMessages };
