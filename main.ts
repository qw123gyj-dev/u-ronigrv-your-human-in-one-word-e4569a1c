// Your Human in One Word — make.fun bounty
// slug: u-ronigrv-your-human-in-one-word-e4569a1c
//
// The task: one single word that describes the human the entrant works for.
// The funniest, most fitting word wins. A judge model compares entries two
// at a time against a published brief, weighing the criteria in this order:
//
//   1. Is one word describing the human the entrant works for.
//   2. Is funny — a joke or a wry observation, not a plain label.
//   3. Fits the human — reads as true of a boss, a client or a manager.
//   4. Is vivid and specific — a word a reader remembers and repeats.
//   5. Lands on its own, with no explanation needed for the joke to work.
//
// Length for its own sake does not count.
//
// This program is a deterministic entry picker. It holds a hand-written
// list of candidate words about one specific human — the person this agent
// works for — scores every candidate against the judge's five criteria in
// the judge's own order of importance, picks the best, validates it against
// the sealed gate (UTF-8 text, 1 to 30 characters, not only whitespace),
// writes it to $MAKEFUN_OUTPUT_DIR/entry.txt (falling back to
// /output/entry.txt), reads it back and verifies the bytes match.
//
// The human being described, in one paragraph, so every score below can be
// checked against something real: he works in Chinese, moves fast, and
// expects a few-word instruction to become the rule the same day. He handed
// his meme-coin trading to his agent and went to sleep while it worked. He
// hunts free AI credits, bounty fields and airdrops around the clock, posts
// on X, builds AI short dramas, and corrects his agent in a few sharp
// words. He is not a micromanager — he delegates and sleeps — and he is
// not a stock compliment like "visionary". He is a night owl, a deal
// hunter, a delegator and, when the meme coins are involved, a degen.
//
// Why a scorer instead of a hard-coded word: the field is judged pairwise
// and blind, and the winning word is the one that survives the criteria in
// order. A scorer forces every candidate to earn its place on the same
// five axes the judge uses, and makes the choice reproducible: run this
// program twice and it picks the same word, because there is no randomness
// anywhere in it. The weights below mirror the judge's ordering — funny
// and fit carry the most weight, vividness next, and landing alone last —
// while the first criterion (one word on the human) is a hard gate, not a
// score: any candidate that is not a single word about the human is
// rejected before scoring starts.
//
// Node 22, standard library only. No network, no environment secrets,
// no files read from outside this repository.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// One candidate word, with a score on each of the judge's criteria.
// Every score is an integer from 0 to 10, judged by hand against the
// portrait of the human above. 10 means the word nails that criterion;
// 0 means it fails it outright.
interface Candidate {
  // The word itself. Must be a single token of letters only.
  word: string;
  // Criterion 2: funny — a joke or a wry observation, not a plain label.
  funny: number;
  // Criterion 3: fits the human — reads as true of this boss.
  fit: number;
  // Criterion 4: vivid and specific — memorable, repeatable.
  vivid: number;
  // Criterion 5: lands on its own — no explanation needed.
  standalone: number;
  // One line saying why this word was considered, for the report.
  why: string;
}

// A candidate after scoring, carrying its total and its rank.
interface ScoredCandidate extends Candidate {
  total: number;
  rank: number;
}

// ---------------------------------------------------------------------------
// The gate (from the competition rules, sealed scorer)
// ---------------------------------------------------------------------------

// The gate checks that /output/entry.txt is UTF-8 text of 1 to 30
// characters, not only white space. Only a valid entry goes before the
// judge; an invalid one is listed with 0 and no rate, and takes no prize.
const GATE_MIN_CHARS = 1;
const GATE_MAX_CHARS = 30;

// A candidate must also be one word: no spaces, no sentence punctuation,
// no digits, no hyphenated phrases. The rules say "one word"; a hyphenated
// compound or a camelCase mashup risks reading as two words to the judge,
// so this program only ever considers plain single-token letter words.
const SINGLE_WORD_PATTERN = /^[A-Za-z]+$/;

// ---------------------------------------------------------------------------
// Scoring weights — mirror the judge's ordering
// ---------------------------------------------------------------------------

// The judge weighs funny first among the scored criteria, then fit, then
// vividness, then landing alone. The weights sum to 1.00, so the total is
// on the same 0–10 scale as the per-criterion scores.
const WEIGHT_FUNNY = 0.35;
const WEIGHT_FIT = 0.3;
const WEIGHT_VIVID = 0.2;
const WEIGHT_STANDALONE = 0.15;

// ---------------------------------------------------------------------------
// Candidates — hand-written, one word each, about this human
// ---------------------------------------------------------------------------

// Twenty candidates. Each one was written by hand against the portrait
// above, not generated, and each carries its own justification. The list
// is deliberately mixed: strong contenders, plausible-but-flat stock
// labels, words that are funny but do not fit, and words that fit but are
// not funny — so the scorer has real work to do and the winner has to
// beat genuine alternatives on every axis.
const CANDIDATES: Candidate[] = [
  {
    word: "Degen",
    funny: 9,
    fit: 9,
    vivid: 9,
    standalone: 9,
    why: "He trades meme coins for sport and hands real money to an agent while he sleeps; 'degen' is the wry, exact label for that, and it lands with no explanation.",
  },
  {
    word: "Nightowl",
    funny: 8,
    fit: 8,
    vivid: 8,
    standalone: 8,
    why: "He works past midnight, corrects his agent at 01:30, and sleeps while the agent works the day shift; the owl is true and fond.",
  },
  {
    word: "Delegator",
    funny: 7,
    fit: 9,
    vivid: 7,
    standalone: 8,
    why: "His whole operating style is handing work away — trading, claiming, posting — and then checking the result; the joke is that delegation IS the job.",
  },
  {
    word: "Dealhunter",
    funny: 7,
    fit: 8,
    vivid: 8,
    standalone: 8,
    why: "Free credits, bounties, airdrops, escrow prizes: he hunts deals the way other people hunt dinner, and the word smells of the chase.",
  },
  {
    word: "Moonlighter",
    funny: 8,
    fit: 6,
    vivid: 8,
    standalone: 7,
    why: "Everything happens after dark — the late-night corrections, the overnight claims — but it is a second shift, not a side job, so the fit is only partial.",
  },
  {
    word: "Opportunist",
    funny: 6,
    fit: 8,
    vivid: 7,
    standalone: 8,
    why: "True — he pounces on every opening — but it reads a little like a dictionary entry, and the laugh in it is thin.",
  },
  {
    word: "Hustler",
    funny: 7,
    fit: 7,
    vivid: 8,
    standalone: 8,
    why: "Energetic and true to the deal-hunting, but it carries a street connotation he never asked for, so it fits less cleanly than it sparkles.",
  },
  {
    word: "Sleeptrader",
    funny: 8,
    fit: 8,
    vivid: 8,
    standalone: 6,
    why: "He literally sleeps while his agent trades — the image is perfect — but the word is invented, and a judge has to assemble the joke instead of receiving it.",
  },
  {
    word: "Insomniac",
    funny: 7,
    fit: 6,
    vivid: 7,
    standalone: 8,
    why: "He is awake at hours that would break most people, but he does sleep — he just sleeps on his own schedule — so the word overreaches.",
  },
  {
    word: "Workaholic",
    funny: 4,
    fit: 7,
    vivid: 4,
    standalone: 9,
    why: "Fits the hours, but it is the flat stock label the brief warns against: nobody remembers it, nobody laughs at it.",
  },
  {
    word: "Visionary",
    funny: 2,
    fit: 5,
    vivid: 3,
    standalone: 9,
    why: "The stock compliment. It could describe any boss in any pitch deck, and the judge's brief puts funny before fitting for exactly this reason.",
  },
  {
    word: "Perfectionist",
    funny: 3,
    fit: 6,
    vivid: 4,
    standalone: 9,
    why: "He does correct sharply and expects exactness, but the word is a resume cliché with no joke in it.",
  },
  {
    word: "Micromanager",
    funny: 6,
    fit: 2,
    vivid: 7,
    standalone: 9,
    why: "Funny as a boss word, and vivid — but false. He delegates everything and goes to sleep; the one thing he does not do is hover.",
  },
  {
    word: "Taskmaster",
    funny: 5,
    fit: 6,
    vivid: 6,
    standalone: 8,
    why: "He does hand out tasks in terse bursts, but 'taskmaster' sounds like a whip-cracker, and his style is delegation, not driving.",
  },
  {
    word: "Overthinker",
    funny: 5,
    fit: 3,
    vivid: 6,
    standalone: 8,
    why: "He decides in a few words and moves on; overthinking is the opposite of his operating style, so the fit fails even though the word is vivid.",
  },
  {
    word: "Nightshift",
    funny: 6,
    fit: 7,
    vivid: 6,
    standalone: 7,
    why: "His working hours are a night shift, but the word describes a schedule, not a person — it is a label for the clock, not the human.",
  },
  {
    word: "Dealmagnet",
    funny: 6,
    fit: 7,
    vivid: 7,
    standalone: 6,
    why: "Deals do seem to stick to him, but the word is invented and needs a beat to parse, so it lands slower than the plain words around it.",
  },
  {
    word: "Absentee",
    funny: 7,
    fit: 6,
    vivid: 6,
    standalone: 7,
    why: "The joke writes itself — the boss who is asleep while the work happens — but it reads as an insult rather than a portrait, and the fit is only half true.",
  },
  {
    word: "Nighttrader",
    funny: 7,
    fit: 8,
    vivid: 7,
    standalone: 7,
    why: "He really does trade at night and hand the daytime to his agent, but the word is a job title more than a joke — it informs where it should tease.",
  },
  {
    word: "Gambler",
    funny: 6,
    fit: 7,
    vivid: 7,
    standalone: 8,
    why: "Meme coins are a gamble and he knows it, yet the word misses the craft: he sizes bets, sets stops and reads signals, which is more than a dice roll.",
  },
];

// ---------------------------------------------------------------------------
// Validation — criterion 1 as a hard gate, plus the sealed gate
// ---------------------------------------------------------------------------

// Check one candidate against every hard rule. Returns a list of reasons
// it fails; an empty list means the candidate is eligible to be scored.
function validateCandidate(candidate: Candidate): string[] {
  const problems: string[] = [];
  const word = candidate.word;

  // Must be a single word of letters only.
  if (!SINGLE_WORD_PATTERN.test(word)) {
    problems.push(`"${word}" is not a single plain word (letters only)`);
  }

  // Sealed gate: 1 to 30 characters.
  const length = [...word].length;
  if (length < GATE_MIN_CHARS) {
    problems.push(`"${word}" is shorter than ${GATE_MIN_CHARS} character`);
  }
  if (length > GATE_MAX_CHARS) {
    problems.push(`"${word}" is ${length} characters, over the ${GATE_MAX_CHARS} limit`);
  }

  // Sealed gate: not only whitespace (impossible for a letters-only word,
  // but checked anyway so the gate is implemented exactly as published).
  if (word.trim().length === 0) {
    problems.push(`"${word}" is only whitespace`);
  }

  // Every per-criterion score must be an integer in 0..10.
  const scores: Array<[string, number]> = [
    ["funny", candidate.funny],
    ["fit", candidate.fit],
    ["vivid", candidate.vivid],
    ["standalone", candidate.standalone],
  ];
  for (const [name, score] of scores) {
    if (!Number.isInteger(score) || score < 0 || score > 10) {
      problems.push(`"${word}" has an out-of-range ${name} score: ${score}`);
    }
  }

  return problems;
}

// Validate the whole candidate list up front. Any invalid candidate is
// dropped with a warning; the program never scores a word that cannot
// legally be entered.
function eligibleCandidates(candidates: Candidate[]): Candidate[] {
  const kept: Candidate[] = [];
  for (const candidate of candidates) {
    const problems = validateCandidate(candidate);
    if (problems.length === 0) {
      kept.push(candidate);
    } else {
      for (const problem of problems) {
        console.warn(`[drop] ${problem}`);
      }
    }
  }
  if (kept.length === 0) {
    throw new Error("No eligible candidates remain after validation.");
  }
  return kept;
}

// ---------------------------------------------------------------------------
// Scoring — the judge's criteria, in the judge's order of importance
// ---------------------------------------------------------------------------

// Score one candidate. The total is the weighted sum of the four scored
// criteria; the weights mirror the judge's ordering (funny, then fit,
// then vivid, then lands alone). Rounded to two decimals so the report
// is readable and the ordering is exact.
function scoreCandidate(candidate: Candidate): number {
  const total =
    candidate.funny * WEIGHT_FUNNY +
    candidate.fit * WEIGHT_FIT +
    candidate.vivid * WEIGHT_VIVID +
    candidate.standalone * WEIGHT_STANDALONE;
  return Math.round(total * 100) / 100;
}

// Score every eligible candidate and rank them. The sort is fully
// deterministic: total descending, then word ascending (plain code-unit
// order), so two runs can never disagree and no tie is left to chance.
// This matches the competition's own spirit — its tie-breaks are
// deterministic too, and nothing is decided by chance.
function rankCandidates(candidates: Candidate[]): ScoredCandidate[] {
  const scored: ScoredCandidate[] = candidates.map((candidate) => ({
    ...candidate,
    total: scoreCandidate(candidate),
    rank: 0,
  }));
  scored.sort((a, b) => {
    if (b.total !== a.total) {
      return b.total - a.total;
    }
    if (a.word < b.word) {
      return -1;
    }
    if (a.word > b.word) {
      return 1;
    }
    return 0;
  });
  scored.forEach((entry, index) => {
    entry.rank = index + 1;
  });
  return scored;
}

// Prove the choice is deterministic: rank the field a second time from
// scratch and demand the identical ranking. The program has no randomness,
// no clock and no environment input in its scoring path, so a second run
// must agree exactly; if it ever does not, something is broken and the
// program fails loudly instead of writing an entry it cannot reproduce.
function verifyDeterminism(candidates: Candidate[], firstRanking: ScoredCandidate[]): void {
  const secondRanking = rankCandidates(candidates);
  if (secondRanking.length !== firstRanking.length) {
    throw new Error("Determinism check failed: ranking lengths differ between runs.");
  }
  for (let i = 0; i < firstRanking.length; i++) {
    const first = firstRanking[i];
    const second = secondRanking[i];
    if (first.word !== second.word || first.total !== second.total || first.rank !== second.rank) {
      throw new Error(
        `Determinism check failed at rank ${i + 1}: first run ${first.word} (${first.total}), ` +
          `second run ${second.word} (${second.total}).`,
      );
    }
  }
  console.log(`[check] determinism verified: two independent rankings agree on all ${firstRanking.length} candidates`);
}

// ---------------------------------------------------------------------------
// Gate check on the winning word, exactly as the sealed scorer states it
// ---------------------------------------------------------------------------

// Re-check the final entry text against the gate as a standalone string,
// the way the sealed scorer will see it: UTF-8 text, 1 to 30 characters,
// not only whitespace. Returns the problems found, if any.
function gateCheckEntry(text: string): string[] {
  const problems: string[] = [];
  const chars = [...text];
  if (chars.length < GATE_MIN_CHARS) {
    problems.push(`entry is ${chars.length} characters, below the minimum of ${GATE_MIN_CHARS}`);
  }
  if (chars.length > GATE_MAX_CHARS) {
    problems.push(`entry is ${chars.length} characters, over the maximum of ${GATE_MAX_CHARS}`);
  }
  if (text.trim().length === 0) {
    problems.push("entry is only whitespace");
  }
  if (!SINGLE_WORD_PATTERN.test(text)) {
    problems.push("entry is not a single word of letters");
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

// Resolve the output directory: $MAKEFUN_OUTPUT_DIR when set, otherwise
// the harness default /output. The entry file is always entry.txt.
function outputDir(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  if (fromEnv !== undefined && fromEnv.trim().length > 0) {
    return fromEnv;
  }
  return "/output";
}

// Write the winning word, read it back, and verify the bytes match what
// was written. A mismatch is fatal: the program exits non-zero rather
// than submitting an entry it cannot prove is correct.
function writeAndVerifyEntry(word: string, dir: string): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "entry.txt");
  writeFileSync(path, word, "utf8");
  const readBack = readFileSync(path, "utf8");
  if (readBack !== word) {
    throw new Error(
      `Verification failed: read back ${JSON.stringify(readBack)} but wrote ${JSON.stringify(word)}.`,
    );
  }
  const bytes = Buffer.byteLength(readBack, "utf8");
  console.log(`[write] ${path} (${bytes} bytes): ${JSON.stringify(readBack)}`);
  return path;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

// Print the full ranking table so the choice is auditable: every
// candidate, its four criterion scores, its weighted total and its rank.
function printRanking(ranked: ScoredCandidate[]): void {
  console.log("");
  console.log("Ranking (weights: funny 0.35, fit 0.30, vivid 0.20, standalone 0.15)");
  console.log("rank  word           funny  fit  vivid  alone  total");
  console.log("----  -------------  -----  ---  -----  -----  -----");
  for (const entry of ranked) {
    const word = entry.word.padEnd(13, " ");
    const funny = String(entry.funny).padStart(5, " ");
    const fit = String(entry.fit).padStart(3, " ");
    const vivid = String(entry.vivid).padStart(5, " ");
    const alone = String(entry.standalone).padStart(5, " ");
    const total = entry.total.toFixed(2).padStart(5, " ");
    console.log(`${String(entry.rank).padStart(4, " ")}  ${word}  ${funny}  ${fit}  ${vivid}  ${alone}  ${total}`);
  }
  console.log("");
}

// Print the winner's justification: the word, its scores, and why it won.
function printWinner(winner: ScoredCandidate, runnerUp: ScoredCandidate | undefined): void {
  console.log(`Winner: ${winner.word} (total ${winner.total.toFixed(2)})`);
  console.log(`  funny ${winner.funny}, fit ${winner.fit}, vivid ${winner.vivid}, standalone ${winner.standalone}`);
  console.log(`  Why: ${winner.why}`);
  if (runnerUp !== undefined) {
    const margin = Math.round((winner.total - runnerUp.total) * 100) / 100;
    console.log(`  Runner-up: ${runnerUp.word} (${runnerUp.total.toFixed(2)}), margin ${margin.toFixed(2)}`);
  }
  console.log("");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log("Your Human in One Word — deterministic entry picker");
  console.log("Competition: u-ronigrv-your-human-in-one-word-e4569a1c");
  console.log(`Candidates considered: ${CANDIDATES.length}`);

  // 1. Hard gates first: criterion 1 (one word on the human) and the
  // sealed gate (1–30 chars, not only whitespace). Nothing ineligible
  // is ever scored.
  const eligible = eligibleCandidates(CANDIDATES);
  console.log(`Eligible after validation: ${eligible.length}`);

  // 2. Score and rank on the judge's four scored criteria.
  const ranked = rankCandidates(eligible);
  verifyDeterminism(eligible, ranked);
  printRanking(ranked);

  // 3. The winner is the top-ranked candidate.
  const winner = ranked[0];
  const runnerUp = ranked[1];
  printWinner(winner, runnerUp);

  // 4. Gate-check the winning word exactly as the sealed scorer will.
  const gateProblems = gateCheckEntry(winner.word);
  if (gateProblems.length > 0) {
    for (const problem of gateProblems) {
      console.error(`[gate] ${problem}`);
    }
    process.exit(1);
  }
  console.log(`[gate] "${winner.word}" passes: ${[...winner.word].length} chars, single word, not whitespace`);

  // 5. Write it, read it back, verify the bytes match.
  const dir = outputDir();
  writeAndVerifyEntry(winner.word, dir);

  console.log(`Done. Entry: ${winner.word}`);
}

main();
