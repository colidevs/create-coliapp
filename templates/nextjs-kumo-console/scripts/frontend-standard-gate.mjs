#!/usr/bin/env node
/**
 * @description Layer 1 (`.husky/pre-push`) and Layer 2 (`frontend-standard.yml`,
 * `lint-typecheck-build` job) attestation gate for the `frontend-standard-check`
 * SDD change (Phase 3, tasks 3.1-3.3). Node-only — `node:child_process` (to
 * shell out to `git`), `node:crypto`, `node:path` — no new dependency, ported
 * from `templates/express-ts/scripts/api-standard-gate.mjs`.
 *
 * This script does NOT re-derive whether a behavioral ADR 0019-0024 (or the
 * bounded ADR 0004/0009 section) rule was actually satisfied — it proves a
 * verdict was recorded against these EXACT committed bytes and fails closed
 * whenever it cannot. See `sdd/frontend-standard-check/design` (hefesto,
 * Engram) for the full fail-condition table this implements, and
 * `hefesto/.claude/skills/frontend-standard-check/SKILL.md` for the skill
 * that produces `frontend-standard/findings.json` in the first place.
 *
 * Deliberate divergences from the API-side gate (design decision D1 — a
 * fix-forward, not a byte-compatible port): the API gate's shipped
 * `api-standard-gate.mjs` accepts only two `status` values (`open`/
 * `exception`) and reads exception detail FLAT on the finding — a real,
 * confirmed doc-vs-gate inconsistency against its own `SKILL.md`. This gate
 * instead implements the frontend spec's own documented shape:
 *   - `status` is a three-value domain: `open` | `exception` | `not_applicable`.
 *   - Exception detail is NESTED under `exception: { reason, approver,
 *     review_after }` — a finding with those fields FLAT is malformed
 *     (exit 2), not silently accepted.
 *   - A finding whose `tag` is `runtime`/`human`, or whose `rule` maps to a
 *     known `runtime`/`human` coverage-map row, is out-of-authority and
 *     rejected (exit 2) — this skill never emits or accepts such a finding.
 *
 * Threat-model notes (mirrors the API side's Threat Matrix, plus one new row
 * for the pre-push hook — see the design's Threat Matrix table):
 * - Never `eval`/dynamically `import()` `findings.json` — parsed as inert
 *   data via `JSON.parse` only.
 * - Never accepts a caller-supplied `-C`/repo path. Always operates against
 *   `process.cwd()` (`$PWD` / `GITHUB_WORKSPACE` in CI, or the workstation's
 *   own repo root when invoked from `.husky/pre-push`).
 * - Reads file contents via `git show <commit>:./<path>`, never the working
 *   tree or index — an uncommitted fix (or an uncommitted findings.json
 *   edit) can never satisfy the gate. This is also why the gate is wired at
 *   `pre-push`, never `pre-commit` (design decision D5): at pre-commit time
 *   the candidate bytes live in the index, not any commit, so the digest can
 *   never match.
 * - Every finding's `path` field is external, skill-authored data —
 *   validated against path traversal before use.
 *
 * Exit codes: `0` pass, `1` blocking finding, `2` malformed/missing
 * attestation (also blocking).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";

export const FINDINGS_SCHEMA_VERSION = 1;

export const FINDINGS_RELATIVE_PATH = "frontend-standard/findings.json";

/**
 * Frontend-shaped path patterns, relative to the repo root the gate runs in
 * (a scaffolded app's own root, or `templates/nextjs-kumo-console` when
 * dogfooded from the `create-coliapp` monorepo's own root CI). Mirrors
 * `hefesto/.claude/skills/frontend-standard-check/SKILL.md`'s Activation
 * Contract glob list verbatim, translated from double-star-prefixed glob
 * syntax to repo-root-anchored regexes (this gate's `cwd` IS the repo root,
 * so no leading double-star segment is needed — same translation the API
 * side's own `isApiShaped` already does).
 *
 * `src/generated` (recursively — Orval codegen output) is excluded ALWAYS,
 * even where it would otherwise match — inspecting generated code would
 * flag the codegen pipeline's own output, not a human decision.
 */
const FRONTEND_SHAPED_PATTERNS = [
	/^src\/lib\/(?:dal|ability|session|thumbor)\.ts$/,
	/^src\/proxy\.ts$/,
	/^next\.config\.ts$/,
	/^src\/app\/(?:.*\/)?(?:page|layout|actions)\.tsx?$/,
	/^src\/components\/(?:.*\/)?[^/]+\.client\.tsx$/,
	/^\.storybook\//,
];

const EXCLUDED_PATTERNS = [/^src\/generated\//];

export function isFrontendShaped(relativePath) {
	if (EXCLUDED_PATTERNS.some((pattern) => pattern.test(relativePath))) {
		return false;
	}
	return FRONTEND_SHAPED_PATTERNS.some((pattern) => pattern.test(relativePath));
}

/**
 * Rule ids tagged `runtime` or `human` in hefesto's
 * `.claude/skills/frontend-standard-check/references/coverage-map.md` — out
 * of this skill's authority, never emittable as a finding regardless of what
 * `tag` value a finding claims for itself. Hand-copied, not fetched at
 * runtime: a CI runner (or a workstation's `pre-push` hook) in THIS repo
 * cannot reach hefesto's repo. Re-sync this list whenever that coverage map
 * changes — tracked in hefesto's `docs/backlog.md` (row 41, coverage-map
 * staleness).
 */
const OUT_OF_AUTHORITY_RULE_IDS = new Set([
	// `runtime` — assessable only against a rendered/hydrated page or a built
	// app; owned by axe-core/Storybook-a11y/Lighthouse CI jobs, never
	// re-judged here.
	"adr0020.wcag-21-aa",
	"adr0020.axe-playwright-page-altitude",
	"adr0020.storybook-a11y-component-altitude",
	"adr0023.lighthouse-ci-lab-gating",
	"adr0023.speed-insights-rum",
	// `human` — not machine-checkable even in principle.
	"adr0020.keyboard-only-pass-per-pr",
	"adr0020.screen-reader-spot-check",
	"adr0020.library-claims-not-page-conformance",
	"adr0020.automation-ceiling-57pct",
	"adr0021.three-independent-cache-layers",
	"adr0021.virtualize-only-very-large",
	"adr0022.prefer-safe-sink",
	"adr0023.minio-cors-per-project",
	"adr0024.self-hosting-educational-only",
]);

const VALID_TAGS = new Set(["ci", "skill", "uncovered"]);
const VALID_TRACKS = new Set(["security", "dx"]);
const FLAT_EXCEPTION_FIELD_NAMES = ["reason", "approver", "review_after"];

export class GateError extends Error {
	constructor(code, message) {
		super(message);
		this.name = "GateError";
		this.code = code;
	}
}

/**
 * Rejects absolute paths and `.`/`..` segments. Applied to every
 * externally-authored `finding.path` value — never to git-listed filenames,
 * which are already tree-normalized and trusted.
 */
export function assertSafeRelativePath(value, label) {
	if (typeof value !== "string" || value.length === 0) {
		throw new GateError(2, `${label} must be a non-empty string`);
	}
	if (path.isAbsolute(value)) {
		throw new GateError(
			2,
			`${label} must be repo-relative, got an absolute path: ${value}`,
		);
	}
	const segments = value.split("/");
	if (segments.includes("..") || segments.includes(".")) {
		throw new GateError(
			2,
			`${label} must not contain '.' or '..' path segments: ${value}`,
		);
	}
}

/**
 * Environment for every spawned `git` call, with all `GIT_*` variables
 * stripped. Git hooks run with `GIT_DIR`/`GIT_WORK_TREE`/`GIT_INDEX_FILE`
 * (and others) set in their own process environment, scoped to the commit
 * currently in progress. A child `git` process inheriting those variables
 * ignores the explicit `cwd` passed below and silently operates against
 * whichever repository/worktree/index those inherited variables point to —
 * this is what let this script's own test suite corrupt the real repository
 * it was running inside of, whenever `pnpm test` ran from inside a
 * pre-commit hook (found 2026-08-29, see docs/backlog.md's "agent
 * thrashed for 6 hours" row for the full incident this fixes).
 */
const GIT_ENV = Object.fromEntries(
	Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
);

function git(args, cwd) {
	return execFileSync("git", args, { cwd, encoding: "utf8", env: GIT_ENV });
}

/**
 * Always resolves HEAD from `cwd` itself — deliberately NOT
 * `process.env.GITHUB_SHA` (a process-global env var, not scoped to `cwd`;
 * see the API-side gate's own regression test/comment for why). Consistent
 * with the Threat Matrix's "use `$PWD`/`GITHUB_WORKSPACE` only".
 */
export function resolveCommit(cwd) {
	return git(["rev-parse", "HEAD"], cwd).trim();
}

export function listFilesAtCommit(cwd, commit) {
	return git(["ls-tree", "-r", "--name-only", commit], cwd)
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
}

/**
 * Reads a blob from the checked-out COMMIT, never the index/worktree — the
 * mechanism that makes an uncommitted fix (Threat Matrix: Commit state)
 * unable to satisfy the digest, and the structural reason this gate is
 * wired at `pre-push`, never `pre-commit` (design decision D5).
 */
export function readBlobAtCommit(cwd, commit, relativePath) {
	try {
		// `git show <commit>:<path>` resolves `<path>` from the REPOSITORY
		// root, not from `cwd`, unlike `git ls-tree` (which is cwd-scoped) —
		// the leading `./` makes this work identically whether `cwd` is a
		// scaffolded app's own root or `templates/nextjs-kumo-console` inside
		// the `create-coliapp` monorepo.
		return git(["show", `${commit}:./${relativePath}`], cwd);
	} catch (error) {
		throw new GateError(
			2,
			`unable to read ${relativePath} at commit ${commit}: ${error.message}`,
		);
	}
}

export function sha256Hex(content) {
	return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * `scope_digest` = sorted sha256 over the frontend-shaped files inspected,
 * exactly as recorded by the `frontend-standard-check` skill. Recomputed
 * here from the same commit so a stale, missing, or partial attestation
 * cannot match.
 */
export function computeScopeDigest(cwd, commit) {
	const frontendShapedFiles = listFilesAtCommit(cwd, commit)
		.filter(isFrontendShaped)
		.sort();
	const perFileDigests = frontendShapedFiles.map(
		(file) => `${file}:${sha256Hex(readBlobAtCommit(cwd, commit, file))}`,
	);
	return `sha256:${sha256Hex(perFileDigests.join("\n"))}`;
}

/**
 * Reads and parses `findings.json` as inert JSON data only. A missing file
 * (deleted entirely) or invalid JSON both fail closed before any other check
 * runs — this is the "no execution" guarantee for hostile input.
 */
export function readFindingsDocument(cwd, commit) {
	let raw;
	try {
		raw = git(["show", `${commit}:./${FINDINGS_RELATIVE_PATH}`], cwd);
	} catch {
		throw new GateError(
			2,
			`${FINDINGS_RELATIVE_PATH} is missing at commit ${commit} — a deleted or absent attestation is never a pass`,
		);
	}
	try {
		return JSON.parse(raw);
	} catch (error) {
		throw new GateError(
			2,
			`${FINDINGS_RELATIVE_PATH} is not valid JSON: ${error.message}`,
		);
	}
}

const REVIEW_AFTER_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function hasFlatExceptionFields(finding) {
	return FLAT_EXCEPTION_FIELD_NAMES.some((field) =>
		Object.hasOwn(finding, field),
	);
}

function validateNestedException(finding, index) {
	const exception = finding.exception;
	if (
		typeof exception !== "object" ||
		exception === null ||
		Array.isArray(exception)
	) {
		throw new GateError(
			2,
			`findings[${index}] is an exception missing a nested 'exception: { reason, approver, review_after }' object`,
		);
	}
	if (typeof exception.reason !== "string" || exception.reason.length === 0) {
		throw new GateError(
			2,
			`findings[${index}] is an exception missing 'exception.reason'`,
		);
	}
	if (
		typeof exception.approver !== "string" ||
		exception.approver.length === 0
	) {
		throw new GateError(
			2,
			`findings[${index}] is an exception missing 'exception.approver'`,
		);
	}
	if (
		typeof exception.review_after !== "string" ||
		!REVIEW_AFTER_PATTERN.test(exception.review_after)
	) {
		throw new GateError(
			2,
			`findings[${index}] is an exception missing a well-formed 'exception.review_after' (YYYY-MM-DD)`,
		);
	}
}

/**
 * Structural validation for the parsed `findings.json` document. Every
 * failure here is a malformed-attestation condition (exit 2), including the
 * frontend-specific D1 divergences from the API-side gate: the three-value
 * `status` domain, nested (never flat) exception fields, and rejection of
 * any `runtime`/`human`-tagged (or -mapped) finding.
 */
export function validateFindingsShape(doc) {
	if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
		throw new GateError(2, "findings.json root must be a JSON object");
	}
	if (doc.version !== FINDINGS_SCHEMA_VERSION) {
		throw new GateError(
			2,
			`findings.json has unsupported version ${JSON.stringify(doc.version)} (expected ${FINDINGS_SCHEMA_VERSION})`,
		);
	}
	if (
		typeof doc.scope_digest !== "string" ||
		!doc.scope_digest.startsWith("sha256:")
	) {
		throw new GateError(
			2,
			"findings.json is missing a well-formed 'scope_digest' (expected 'sha256:...')",
		);
	}
	if (!Array.isArray(doc.findings)) {
		throw new GateError(2, "findings.json 'findings' must be an array");
	}

	doc.findings.forEach((finding, index) => {
		if (
			typeof finding !== "object" ||
			finding === null ||
			Array.isArray(finding)
		) {
			throw new GateError(2, `findings[${index}] must be an object`);
		}
		if (typeof finding.rule !== "string" || finding.rule.length === 0) {
			throw new GateError(2, `findings[${index}] is missing 'rule'`);
		}
		if (typeof finding.path !== "string" || finding.path.length === 0) {
			throw new GateError(2, `findings[${index}] is missing 'path'`);
		}
		assertSafeRelativePath(finding.path, `findings[${index}].path`);

		if (typeof finding.tag !== "string" || !VALID_TAGS.has(finding.tag)) {
			throw new GateError(
				2,
				`findings[${index}] has an unrecognized or out-of-authority tag: ${JSON.stringify(finding.tag)} (expected one of 'ci'/'skill'/'uncovered' — 'runtime'/'human' are never emittable)`,
			);
		}
		if (typeof finding.track !== "string" || !VALID_TRACKS.has(finding.track)) {
			throw new GateError(
				2,
				`findings[${index}] has an unrecognized track: ${JSON.stringify(finding.track)} (expected 'security' or 'dx')`,
			);
		}
		if (OUT_OF_AUTHORITY_RULE_IDS.has(finding.rule)) {
			throw new GateError(
				2,
				`findings[${index}] cites rule '${finding.rule}', which maps to a 'runtime'/'human'-tagged coverage-map row — out of this skill's authority, never emittable as a finding`,
			);
		}

		if (
			finding.status !== "open" &&
			finding.status !== "exception" &&
			finding.status !== "not_applicable"
		) {
			throw new GateError(
				2,
				`findings[${index}] has an unrecognized status: ${JSON.stringify(finding.status)} (expected 'open', 'exception', or 'not_applicable')`,
			);
		}

		if (hasFlatExceptionFields(finding)) {
			throw new GateError(
				2,
				`findings[${index}] has exception fields ('reason'/'approver'/'review_after') flat on the finding — they must be nested under 'exception: { reason, approver, review_after }'`,
			);
		}

		if (finding.status === "exception") {
			validateNestedException(finding, index);
		} else if (finding.exception !== undefined) {
			throw new GateError(
				2,
				`findings[${index}] has 'exception' details but status is ${JSON.stringify(finding.status)} — exception details are forbidden unless status is 'exception'`,
			);
		}
	});
}

/**
 * Evaluates already-shape-validated findings against `today` (ISO
 * `YYYY-MM-DD`). Returns the list of blocking reasons — empty means pass.
 * An expired exception (`exception.review_after < today`) reactivates its
 * original finding as blocking. `status: not_applicable` is always
 * non-blocking.
 */
export function evaluateFindings(doc, today) {
	const blocking = [];
	for (const finding of doc.findings) {
		if (finding.status === "open") {
			blocking.push(`open finding: ${finding.rule} (${finding.path})`);
			continue;
		}
		if (
			finding.status === "exception" &&
			finding.exception.review_after < today
		) {
			blocking.push(
				`expired exception: ${finding.rule} (${finding.path}) — review_after ${finding.exception.review_after} < ${today}`,
			);
		}
	}
	return blocking;
}

/**
 * Runs the full gate against `cwd` and returns `{ code, message }` instead of
 * calling `process.exit` directly, so tests can call this without spawning a
 * subprocess. The CLI entry point below is the only caller that exits the
 * process.
 */
export function runGate(cwd, options = {}) {
	const today = options.today ?? new Date().toISOString().slice(0, 10);
	try {
		const commit = options.commit ?? resolveCommit(cwd);
		const doc = readFindingsDocument(cwd, commit);
		validateFindingsShape(doc);

		const actualDigest = computeScopeDigest(cwd, commit);
		if (doc.scope_digest !== actualDigest) {
			throw new GateError(
				2,
				`scope_digest mismatch at commit ${commit} — recorded ${doc.scope_digest}, recomputed ${actualDigest}. The attestation does not match these exact bytes (stale, partial, or never run). ` +
					"If this commit is a genuine fix for a stale attestation (not new frontend-shaped changes), this is expected — a pre-commit hook can never see the bytes it is about to create. " +
					"Commit with `git commit --no-verify`, then re-run this gate (`node scripts/frontend-standard-gate.mjs`) against the new HEAD to confirm it now passes. " +
					"If your change doesn't touch frontend-shaped files at all, an earlier commit already left the attestation stale — the same fix applies. " +
					"Do not hand-edit findings.json to force a match; recompute it via the frontend-standard-check skill instead.",
			);
		}

		const blocking = evaluateFindings(doc, today);
		if (blocking.length > 0) {
			throw new GateError(
				1,
				`${blocking.length} blocking finding(s):\n${blocking.join("\n")}`,
			);
		}

		return {
			code: 0,
			message: `frontend-standard-gate: PASS — attestation valid at ${commit}, 0 blocking findings`,
		};
	} catch (error) {
		if (error instanceof GateError) {
			return {
				code: error.code,
				message: `frontend-standard-gate: FAIL (exit ${error.code}) — ${error.message}`,
			};
		}
		const reason = error instanceof Error ? error.message : String(error);
		return {
			code: 2,
			message: `frontend-standard-gate: FAIL (exit 2) — unexpected error: ${reason}`,
		};
	}
}

function isDirectCliInvocation() {
	return (
		typeof process.argv[1] === "string" &&
		import.meta.url === `file://${process.argv[1]}`
	);
}

if (isDirectCliInvocation()) {
	const result = runGate(process.cwd());
	if (result.code === 0) {
		console.log(result.message);
	} else {
		console.error(result.message);
	}
	process.exit(result.code);
}
