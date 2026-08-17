#!/usr/bin/env node
/**
 * @description Phase 3 (`api-enforcement-mechanism`, PR 3 of 4) attestation
 * gate. Node-only — `node:child_process` (to shell out to `git`), `node:crypto`,
 * `node:fs` (path helpers only) — no new dependency, per the design's File
 * Changes table.
 *
 * This script does NOT re-derive whether a behavioral ADR 0010/0012/0013 rule
 * was actually satisfied (CI cannot decide "is there a tenant-ownership check
 * here"). It proves a verdict was recorded against these EXACT committed
 * bytes and fails closed whenever it cannot — see
 * `sdd/api-enforcement-mechanism/design`, Decision 2, for the full
 * fail-condition table this implements.
 *
 * Threat-model notes (see design's Threat Matrix):
 * - Never `eval`/dynamically `import()` `findings.json` — parsed as inert
 *   data via `JSON.parse` only.
 * - Never accepts a caller-supplied `-C`/repo path. Always operates against
 *   `process.cwd()` (`$PWD` / `GITHUB_WORKSPACE` in CI).
 * - Reads file contents via `git show <commit>:<path>`, never the working
 *   tree or index — an uncommitted fix (or an uncommitted findings.json edit)
 *   can never satisfy the gate.
 * - Every finding's `path` field is external, skill-authored data — validated
 *   against path traversal before use, even though the gate never opens that
 *   path itself (defense in depth against future consumers of the same
 *   field).
 *
 * Exit codes: `0` pass, `1` blocking finding, `2` malformed/missing
 * attestation (also blocking).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";

export const FINDINGS_SCHEMA_VERSION = 1;

export const FINDINGS_RELATIVE_PATH = "api-standard/findings.json";

/**
 * API-shaped path patterns, relative to the repo root the gate runs in
 * (a scaffolded app's own root, or `templates/express-ts` when dogfooded from
 * the `create-coliapp` monorepo's root `ci.yml`).
 *
 * Corrected against live repo layout (same correction already published in
 * `hefesto`'s `api-standard-check` skill and carried into this template):
 * - `src/lib/db` is a directory, not a flat file — matched via `src/lib/db/`
 *   prefix, not a bare `src/lib/{db,redis}*` glob.
 * - The seed spec lives at `openapi/openapi.yaml` (already existed from the
 *   `express-ts-backend-stack` change), not a root-level `openapi.yaml` as
 *   the original design's glob wording assumed.
 */
const API_SHAPED_PATTERNS = [
	/^src\/v1\/(?:.*\/)?(?:route|controller|service|types)\.ts$/,
	/^src\/v1\/middlewares\//,
	/^src\/lib\/db\//,
	/^src\/lib\/redis\.ts$/,
	/^openapi\/openapi\.(?:yaml|yml|json)$/,
	/^packages\/api-kit\/src\//,
];

export function isApiShaped(relativePath) {
	return API_SHAPED_PATTERNS.some((pattern) => pattern.test(relativePath));
}

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

function git(args, cwd) {
	return execFileSync("git", args, { cwd, encoding: "utf8" });
}

export function resolveCommit(cwd) {
	if (process.env.GITHUB_SHA) {
		return process.env.GITHUB_SHA;
	}
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
 * unable to satisfy the digest.
 */
export function readBlobAtCommit(cwd, commit, relativePath) {
	try {
		// `git show <commit>:<path>` resolves `<path>` from the REPOSITORY
		// root, not from `cwd`, unlike `git ls-tree` (which is cwd-scoped) —
		// verified directly (`git show HEAD:src/x.ts` fails with "exists, but
		// not..." when run from a subdirectory; `HEAD:./src/x.ts` is the
		// documented cwd-relative form). The leading `./` is required so this
		// works identically whether `cwd` is a scaffolded app's own root or
		// `templates/express-ts` inside the `create-coliapp` monorepo.
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
 * `scope_digest` = sorted sha256 over the API-shaped files inspected, exactly
 * as recorded by the `api-standard-check` skill. Recomputed here from the
 * same commit so a stale, missing, or partial attestation cannot match.
 */
export function computeScopeDigest(cwd, commit) {
	const apiShapedFiles = listFilesAtCommit(cwd, commit)
		.filter(isApiShaped)
		.sort();
	const perFileDigests = apiShapedFiles.map(
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

/**
 * Structural validation for the parsed `findings.json` document. Every
 * failure here is a malformed-attestation condition (exit 2).
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
	if (typeof doc.scope_digest !== "string" || !doc.scope_digest.startsWith("sha256:")) {
		throw new GateError(
			2,
			"findings.json is missing a well-formed 'scope_digest' (expected 'sha256:...')",
		);
	}
	if (!Array.isArray(doc.findings)) {
		throw new GateError(2, "findings.json 'findings' must be an array");
	}

	doc.findings.forEach((finding, index) => {
		if (typeof finding !== "object" || finding === null || Array.isArray(finding)) {
			throw new GateError(2, `findings[${index}] must be an object`);
		}
		if (typeof finding.rule !== "string" || finding.rule.length === 0) {
			throw new GateError(2, `findings[${index}] is missing 'rule'`);
		}
		if (typeof finding.path !== "string" || finding.path.length === 0) {
			throw new GateError(2, `findings[${index}] is missing 'path'`);
		}
		assertSafeRelativePath(finding.path, `findings[${index}].path`);

		if (finding.status !== "open" && finding.status !== "exception") {
			throw new GateError(
				2,
				`findings[${index}] has an unrecognized status: ${JSON.stringify(finding.status)} (expected 'open' or 'exception')`,
			);
		}

		if (finding.status === "exception") {
			if (typeof finding.reason !== "string" || finding.reason.length === 0) {
				throw new GateError(
					2,
					`findings[${index}] is an exception missing 'reason'`,
				);
			}
			if (typeof finding.approver !== "string" || finding.approver.length === 0) {
				throw new GateError(
					2,
					`findings[${index}] is an exception missing 'approver'`,
				);
			}
			if (
				typeof finding.review_after !== "string" ||
				!REVIEW_AFTER_PATTERN.test(finding.review_after)
			) {
				throw new GateError(
					2,
					`findings[${index}] is an exception missing a well-formed 'review_after' (YYYY-MM-DD)`,
				);
			}
		}
	});
}

/**
 * Evaluates already-shape-validated findings against `today` (ISO
 * `YYYY-MM-DD`). Returns the list of blocking reasons — empty means pass.
 * An expired exception (`review_after < today`) reactivates its original
 * finding as blocking, per Decision 2.
 */
export function evaluateFindings(doc, today) {
	const blocking = [];
	for (const finding of doc.findings) {
		if (finding.status === "open") {
			blocking.push(`open finding: ${finding.rule} (${finding.path})`);
			continue;
		}
		if (finding.review_after < today) {
			blocking.push(
				`expired exception: ${finding.rule} (${finding.path}) — review_after ${finding.review_after} < ${today}`,
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
				`scope_digest mismatch at commit ${commit} — recorded ${doc.scope_digest}, recomputed ${actualDigest}. The attestation does not match these exact bytes (stale, partial, or never run).`,
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
			message: `api-standard-gate: PASS — attestation valid at ${commit}, 0 blocking findings`,
		};
	} catch (error) {
		if (error instanceof GateError) {
			return {
				code: error.code,
				message: `api-standard-gate: FAIL (exit ${error.code}) — ${error.message}`,
			};
		}
		const reason = error instanceof Error ? error.message : String(error);
		return {
			code: 2,
			message: `api-standard-gate: FAIL (exit 2) — unexpected error: ${reason}`,
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
