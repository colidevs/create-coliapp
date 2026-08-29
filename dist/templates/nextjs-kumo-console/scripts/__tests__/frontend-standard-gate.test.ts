import { execFileSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	assertSafeRelativePath,
	computeScopeDigest,
	evaluateFindings,
	FINDINGS_SCHEMA_VERSION,
	GateError,
	isFrontendShaped,
	resolveCommit,
	runGate,
	validateFindingsShape,
} from "../frontend-standard-gate.mjs";

/**
 * @description Phase 4 (`frontend-standard-check`, hefesto SDD change) test
 * suite for the attestation gate ported in Phase 3
 * (`scripts/frontend-standard-gate.mjs`). Mirrors
 * `templates/express-ts/scripts/__tests__/api-standard-gate.test.ts`'s own
 * structure and Vitest conventions (ADR 0007 — Vitest is this stack's unit
 * test runner). Mode: Standard, not Strict TDD Mode — this template is not
 * in that mode's scope (`testing-methodology.md`); tests validate the
 * already-implemented gate.
 *
 * Two test styles, deliberately mixed, exactly as the API side does:
 * - Fast, git-free unit tests against the exported pure functions
 *   (`validateFindingsShape`, `isFrontendShaped`, `assertSafeRelativePath`,
 *   `evaluateFindings`) for the shape/date fail conditions.
 * - Real temp-git-repo tests via `runGate`/the actual CLI binary for every
 *   condition that depends on commit state (digest, uncommitted fixes,
 *   deleted findings.json) — these spawn real `git` and, for the CLI-binary
 *   tests, a real `node` subprocess, proving the actual runtime path rather
 *   than only the imported module.
 *
 * Dry-run scenarios 4.2-4.6 (tasks artifact, hefesto Engram
 * `sdd/frontend-standard-check/tasks`) are implemented as real, runnable
 * `describe` blocks below, not manual one-off commands.
 */

const scriptPath = path.resolve(
	import.meta.dirname,
	"../frontend-standard-gate.mjs",
);
const TODAY = "2026-08-22";

function git(args: string[], cwd: string): string {
	return execFileSync("git", args, { cwd, encoding: "utf8" });
}

const createdRepos: string[] = [];

function initRepo(): string {
	const dir = mkdtempSync(path.join(tmpdir(), "frontend-standard-gate-"));
	git(["init", "-q"], dir);
	git(["config", "user.email", "test@example.com"], dir);
	git(["config", "user.name", "Test"], dir);
	createdRepos.push(dir);
	return dir;
}

function writeRepoFile(repo: string, relPath: string, content: string): void {
	const abs = path.join(repo, relPath);
	mkdirSync(path.dirname(abs), { recursive: true });
	writeFileSync(abs, content);
}

function commitAll(repo: string, message: string): void {
	git(["add", "-A"], repo);
	git(["commit", "-q", "-m", message], repo);
}

function runCli(repo: string): {
	code: number;
	stdout: string;
	stderr: string;
} {
	try {
		const stdout = execFileSync("node", [scriptPath], {
			cwd: repo,
			encoding: "utf8",
		});
		return { code: 0, stdout, stderr: "" };
	} catch (error) {
		const execError = error as {
			status: number | null;
			stdout?: string;
			stderr?: string;
		};
		return {
			code: execError.status ?? 1,
			stdout: execError.stdout ?? "",
			stderr: execError.stderr ?? "",
		};
	}
}

/** Compliant reference fixture — mirrors `src/lib/dal.ts`'s real shape
 * (`import "server-only"` guard, ADR 0022's `server-only-guard` rule). */
const DAL_FIXTURE = `import "server-only";

export async function verifySession() {
	return { userId: "placeholder" };
}
`;

/** Compliant reference fixture — mirrors `src/app/(console)/orders/
 * actions.ts`'s real shape: a Server Action that maps an RFC 9457 Problem
 * through \`problemToActionState\` before returning it, per ADR 0004/0009
 * (\`console-golden-path.md\`). */
const COMPLIANT_ACTION_FIXTURE = `"use server";

import { problemToActionState } from "@colidevs/utils";

export async function createOrder(_prevState: unknown, _formData: FormData) {
	try {
		return { ok: true };
	} catch (problem) {
		return problemToActionState(problem);
	}
}
`;

/** Non-compliant fixture — a Server Action that returns a raw RFC 9457
 * Problem object directly to \`useActionState\`, never routed through
 * \`problemToActionState\` (the ADR 0004/0009 violation, scenario 4.4). */
const NON_COMPLIANT_ACTION_FIXTURE = `"use server";

export async function createOrder(_prevState: unknown, _formData: FormData) {
	const response = await fetch("https://api.example.com/orders", {
		method: "POST",
	});
	if (!response.ok) {
		// Violation (ADR 0004/0009): the raw Problem response is returned
		// as-is, never mapped through the shared conversion helper.
		return await response.json();
	}
	return { ok: true };
}
`;

/** Non-compliant fixture — \`dangerouslySetInnerHTML\` with no DOMPurify
 * sanitization anywhere in the file (the ADR 0022 violation, scenario 4.3). */
const DANGEROUS_HTML_FIXTURE = `export function RichText({ html }: { html: string }) {
	// Violation (ADR 0022): no sanitization pass before the dangerous sink.
	return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
`;

/** Seeds a repo with one frontend-shaped file and a correctly-attested,
 * clean findings.json (empty findings array). Returns the repo path. */
function seedCleanRepo(): string {
	const repo = initRepo();
	writeRepoFile(repo, "src/lib/dal.ts", DAL_FIXTURE);
	writeRepoFile(
		repo,
		"frontend-standard/findings.json",
		JSON.stringify(
			{
				version: 1,
				scope_digest: "sha256:placeholder",
				checked_at: TODAY,
				findings: [],
			},
			null,
			2,
		),
	);
	commitAll(repo, "seed");

	const realDigest = computeScopeDigest(repo, "HEAD");
	writeRepoFile(
		repo,
		"frontend-standard/findings.json",
		JSON.stringify(
			{ version: 1, scope_digest: realDigest, checked_at: TODAY, findings: [] },
			null,
			2,
		),
	);
	commitAll(repo, "seed: correct attestation");
	return repo;
}

/** Same as `seedCleanRepo`, but with the given `findings` array instead of
 * an empty one, and an optional map of extra frontend-shaped files to seed —
 * digest is still recomputed for the current file set. */
function seedRepoWithFindings(
	findings: Array<Record<string, unknown>>,
	extraFiles: Record<string, string> = {},
): string {
	const repo = initRepo();
	writeRepoFile(repo, "src/lib/dal.ts", DAL_FIXTURE);
	for (const [relPath, content] of Object.entries(extraFiles)) {
		writeRepoFile(repo, relPath, content);
	}
	writeRepoFile(
		repo,
		"frontend-standard/findings.json",
		JSON.stringify(
			{
				version: 1,
				scope_digest: "sha256:placeholder",
				checked_at: TODAY,
				findings,
			},
			null,
			2,
		),
	);
	commitAll(repo, "seed");

	const realDigest = computeScopeDigest(repo, "HEAD");
	writeRepoFile(
		repo,
		"frontend-standard/findings.json",
		JSON.stringify(
			{ version: 1, scope_digest: realDigest, checked_at: TODAY, findings },
			null,
			2,
		),
	);
	commitAll(repo, "seed: correct attestation");
	return repo;
}

afterEach(() => {
	for (const repo of createdRepos.splice(0)) {
		rmSync(repo, { recursive: true, force: true });
	}
});

describe("Threat Matrix: Documentation-like paths — malformed/hostile findings.json", () => {
	it("non-JSON content exits 2 with no further execution", () => {
		const repo = initRepo();
		writeRepoFile(repo, "src/lib/dal.ts", DAL_FIXTURE);
		writeRepoFile(
			repo,
			"frontend-standard/findings.json",
			"{ this is not valid json",
		);
		commitAll(repo, "malformed findings.json");

		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("not valid JSON");
	});

	it("a non-version:1 payload exits 2", () => {
		const repo = initRepo();
		writeRepoFile(repo, "src/lib/dal.ts", DAL_FIXTURE);
		writeRepoFile(
			repo,
			"frontend-standard/findings.json",
			JSON.stringify({ version: 2, scope_digest: "sha256:x", findings: [] }),
		);
		commitAll(repo, "wrong version");

		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("unsupported version");
	});

	it("validateFindingsShape rejects a non-object root directly", () => {
		expect(() => validateFindingsShape([])).toThrow(GateError);
		expect(() => validateFindingsShape(null)).toThrow(GateError);
		expect(() => validateFindingsShape("nope")).toThrow(GateError);
	});
});

describe("Threat Matrix: Git repository selection — path traversal in finding.path", () => {
	it("rejects an absolute path", () => {
		expect(() =>
			assertSafeRelativePath("/etc/passwd", "findings[0].path"),
		).toThrow(GateError);
	});

	it("rejects a '..' traversal segment", () => {
		expect(() =>
			assertSafeRelativePath("../../etc/passwd", "findings[0].path"),
		).toThrow(GateError);
	});

	it("accepts an ordinary repo-relative path", () => {
		expect(() =>
			assertSafeRelativePath("src/lib/dal.ts", "findings[0].path"),
		).not.toThrow();
	});

	it("a finding with a path-traversal path fails the full gate with exit 2", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "adr0022.server-only-guard",
				path: "../../etc/passwd",
				tag: "skill",
				track: "security",
				status: "open",
			},
		]);

		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("path");
	});

	it("the CLI never accepts a repo-path argument — it always operates on cwd", () => {
		const repo = seedCleanRepo();
		const stdout = execFileSync("node", [scriptPath, "-C", "/etc"], {
			cwd: repo,
			encoding: "utf8",
		});
		expect(stdout).toContain("PASS");
	});
});

describe("Threat Matrix: Commit state — uncommitted changes never satisfy the gate", () => {
	it("an uncommitted fix to the source file does not change the gate's verdict", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "adr0022.server-only-guard",
				path: "src/lib/dal.ts",
				tag: "skill",
				track: "security",
				status: "open",
			},
		]);

		const before = runGate(repo, { today: TODAY });
		expect(before.code).toBe(1);

		writeRepoFile(repo, "src/lib/dal.ts", `${DAL_FIXTURE}\n// fixed\n`);
		writeRepoFile(
			repo,
			"frontend-standard/findings.json",
			JSON.stringify({
				version: 1,
				scope_digest: "sha256:whatever",
				findings: [],
			}),
		);

		const after = runGate(repo, { today: TODAY });
		expect(after.code).toBe(before.code);
		expect(after.message).toBe(before.message);
	});

	it("an uncommitted findings.json edit alone does not satisfy an already-correct digest", () => {
		const repo = seedCleanRepo();
		expect(runGate(repo, { today: TODAY }).code).toBe(0);

		writeRepoFile(
			repo,
			"frontend-standard/findings.json",
			JSON.stringify({
				version: 1,
				scope_digest: "sha256:whatever-i-want",
				findings: [],
			}),
		);

		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(0);
		expect(result.message).toContain("PASS");
	});
});

describe("resolveCommit ignores process.env.GITHUB_SHA (same real-CI regression the API-side gate found)", () => {
	it("runGate still resolves the correct repo-local HEAD even when GITHUB_SHA is set to an unrelated commit", () => {
		const repo = seedCleanRepo();
		const previousGithubSha = process.env.GITHUB_SHA;
		process.env.GITHUB_SHA = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
		try {
			const result = runGate(repo, { today: TODAY });
			expect(result.code).toBe(0);
			expect(result.message).toContain("PASS");
		} finally {
			if (previousGithubSha === undefined) {
				delete process.env.GITHUB_SHA;
			} else {
				process.env.GITHUB_SHA = previousGithubSha;
			}
		}
	});

	it("resolveCommit always returns cwd's own HEAD, never the unrelated env var", () => {
		const repo = seedCleanRepo();
		const expected = execFileSync("git", ["rev-parse", "HEAD"], {
			cwd: repo,
			encoding: "utf8",
		}).trim();
		const previousGithubSha = process.env.GITHUB_SHA;
		process.env.GITHUB_SHA = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
		try {
			expect(resolveCommit(repo)).toBe(expected);
		} finally {
			if (previousGithubSha === undefined) {
				delete process.env.GITHUB_SHA;
			} else {
				process.env.GITHUB_SHA = previousGithubSha;
			}
		}
	});
});

describe("Threat Matrix: PR commands — the workflow declares the job statically", () => {
	const templateRoot = path.resolve(import.meta.dirname, "../..");

	// Matches an actual YAML trigger key (`pull_request_target:`), not the
	// term appearing inside an explanatory comment.
	const triggerKeyPattern = /^\s*pull_request_target\s*:/m;

	it("frontend-standard.yml has no pull_request_target trigger, no dynamic gh pr composition, and invokes the gate statically after Build", () => {
		const workflow = readFileSync(
			path.join(templateRoot, ".github/workflows/frontend-standard.yml"),
			"utf8",
		);
		expect(workflow).not.toMatch(triggerKeyPattern);
		expect(workflow).not.toMatch(/gh\s+pr\s+/);
		expect(workflow).toContain("node scripts/frontend-standard-gate.mjs");

		// The gate step must be positioned after the Build step, and before
		// the e2e/lighthouse jobs are declared.
		const buildIndex = workflow.indexOf("run: pnpm run build");
		const gateIndex = workflow.indexOf(
			"node scripts/frontend-standard-gate.mjs",
		);
		const e2eJobIndex = workflow.indexOf("\n  e2e:\n");
		expect(buildIndex).toBeGreaterThan(-1);
		expect(gateIndex).toBeGreaterThan(buildIndex);
		expect(gateIndex).toBeLessThan(e2eJobIndex);
	});
});

describe("Threat Matrix: Push state (new vs. the API side) — pre-push hook resolves local HEAD only", () => {
	it(".husky/pre-push exists, invokes the gate, and .husky/pre-commit is left byte-unchanged", () => {
		const templateRoot = path.resolve(import.meta.dirname, "../..");
		const prePush = readFileSync(
			path.join(templateRoot, ".husky/pre-push"),
			"utf8",
		);
		expect(prePush).toContain("node scripts/frontend-standard-gate.mjs");

		const preCommit = readFileSync(
			path.join(templateRoot, ".husky/pre-commit"),
			"utf8",
		);
		expect(preCommit).not.toContain("frontend-standard-gate");
		expect(preCommit).toContain("pnpm exec biome check .");
		expect(preCommit).toContain("pnpm exec tsc --noEmit");
		expect(preCommit).toContain("pnpm test");
	});

	it("a first push on an untracked branch still runs the gate against local HEAD alone (no remote/refspec read)", () => {
		const repo = seedCleanRepo();
		// No remote configured at all — simulates a genuine first push.
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(0);
	});
});

describe("Fail condition: frontend-shaped files changed with no matching scope_digest", () => {
	it("a stale digest (file changed after attestation) fails with exit 2", () => {
		const repo = seedCleanRepo();
		expect(runGate(repo, { today: TODAY }).code).toBe(0);

		writeRepoFile(repo, "src/lib/dal.ts", `${DAL_FIXTURE}\n// changed\n`);
		commitAll(repo, "change dal.ts without re-running the check");

		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("scope_digest mismatch");
	});

	it("computeScopeDigest changes when a frontend-shaped file's content changes", () => {
		const repoA = initRepo();
		writeRepoFile(repoA, "src/lib/dal.ts", DAL_FIXTURE);
		commitAll(repoA, "a");
		const digestA = computeScopeDigest(repoA, "HEAD");

		const repoB = initRepo();
		writeRepoFile(repoB, "src/lib/dal.ts", `${DAL_FIXTURE}\n// different\n`);
		commitAll(repoB, "b");
		const digestB = computeScopeDigest(repoB, "HEAD");

		expect(digestA).not.toBe(digestB);
	});

	it("computeScopeDigest ignores non-frontend-shaped files and excludes src/generated/** always", () => {
		const repo = initRepo();
		writeRepoFile(repo, "src/lib/dal.ts", DAL_FIXTURE);
		commitAll(repo, "a");
		const before = computeScopeDigest(repo, "HEAD");

		writeRepoFile(repo, "README.md", "# unrelated change\n");
		writeRepoFile(
			repo,
			"src/generated/orval-client.ts",
			"export const generated = true;\n",
		);
		commitAll(repo, "unrelated docs change + generated codegen output");
		const after = computeScopeDigest(repo, "HEAD");

		expect(before).toBe(after);
	});
});

describe("Fail condition: any finding status: open", () => {
	it("a single open finding fails with exit 1", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "adr0022.server-only-guard",
				path: "src/lib/dal.ts",
				tag: "skill",
				track: "security",
				status: "open",
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(1);
		expect(result.message).toContain("open finding");
	});

	it("evaluateFindings reports every open finding, not just the first", () => {
		const doc = {
			version: 1,
			scope_digest: "sha256:x",
			findings: [
				{ rule: "A", path: "a.ts", tag: "skill", track: "dx", status: "open" },
				{ rule: "B", path: "b.ts", tag: "skill", track: "dx", status: "open" },
			],
		};
		const blocking = evaluateFindings(doc, TODAY);
		expect(blocking).toHaveLength(2);
	});
});

describe("Fail condition: exception missing nested reason/approver/review_after", () => {
	it("missing 'exception.reason' fails with exit 2", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "adr0022.dompurify-on-dangerous-html",
				path: "src/lib/dal.ts",
				tag: "skill",
				track: "security",
				status: "exception",
				exception: { approver: "thomas", review_after: "2099-01-01" },
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("exception.reason");
	});

	it("missing 'exception.approver' fails with exit 2", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "adr0022.dompurify-on-dangerous-html",
				path: "src/lib/dal.ts",
				tag: "skill",
				track: "security",
				status: "exception",
				exception: {
					reason: "no user-supplied HTML on this path",
					review_after: "2099-01-01",
				},
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("exception.approver");
	});

	it("missing 'exception.review_after' fails with exit 2", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "adr0022.dompurify-on-dangerous-html",
				path: "src/lib/dal.ts",
				tag: "skill",
				track: "security",
				status: "exception",
				exception: {
					reason: "no user-supplied HTML on this path",
					approver: "thomas",
				},
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("exception.review_after");
	});

	it("a finding missing 'rule' entirely fails with exit 2 regardless of status", () => {
		expect(() =>
			validateFindingsShape({
				version: 1,
				scope_digest: "sha256:x",
				findings: [{ path: "a.ts", tag: "skill", track: "dx", status: "open" }],
			}),
		).toThrow(GateError);
	});
});

describe("D1 fail conditions: nested-vs-flat exception shape, three-value status, not_applicable", () => {
	it("exception fields present FLAT on the finding (not nested) fail with exit 2", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "adr0022.dompurify-on-dangerous-html",
				path: "src/lib/dal.ts",
				tag: "skill",
				track: "security",
				status: "exception",
				reason: "no user-supplied HTML on this path",
				approver: "thomas",
				review_after: "2099-01-01",
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("flat on the finding");
	});

	it("validateFindingsShape rejects flat exception fields directly", () => {
		expect(() =>
			validateFindingsShape({
				version: 1,
				scope_digest: "sha256:x",
				findings: [
					{
						rule: "adr0022.dompurify-on-dangerous-html",
						path: "a.tsx",
						tag: "skill",
						track: "security",
						status: "exception",
						reason: "flat, not nested",
						approver: "thomas",
						review_after: "2099-01-01",
					},
				],
			}),
		).toThrow(GateError);
	});

	it("a status outside the three-value domain fails with exit 2", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "adr0022.server-only-guard",
				path: "src/lib/dal.ts",
				tag: "skill",
				track: "security",
				status: "resolved",
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("unrecognized status");
	});

	it("status: not_applicable is non-blocking and requires no exception fields", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "adr0021.aip160-bridge-and-only-v1",
				path: "src/lib/dal.ts",
				tag: "uncovered",
				track: "dx",
				status: "not_applicable",
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(0);
	});

	it("'exception' details present while status is not 'exception' are forbidden", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "adr0021.aip160-bridge-and-only-v1",
				path: "src/lib/dal.ts",
				tag: "uncovered",
				track: "dx",
				status: "not_applicable",
				exception: {
					reason: "not really",
					approver: "thomas",
					review_after: "2099-01-01",
				},
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("forbidden unless status is 'exception'");
	});
});

describe("D1/D2 fail condition: a finding tagged or mapped to runtime/human is out of authority", () => {
	it("a finding directly declaring tag: 'runtime' fails with exit 2", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "adr0020.wcag-21-aa",
				path: "src/lib/dal.ts",
				tag: "runtime",
				track: "security",
				status: "open",
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
	});

	it("a finding declaring tag: 'human' fails with exit 2", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "adr0022.prefer-safe-sink",
				path: "src/lib/dal.ts",
				tag: "human",
				track: "security",
				status: "open",
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
	});

	it("a finding whose rule maps to a known runtime/human coverage-map row is rejected even if its own tag lies about it", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "adr0023.speed-insights-rum",
				path: "src/lib/dal.ts",
				tag: "skill",
				track: "dx",
				status: "open",
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("out of this skill's authority");
	});
});

describe("Fail condition: review_after < today (expired exception)", () => {
	it("an expired exception reactivates as a blocking finding (exit 1)", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "adr0022.dompurify-on-dangerous-html",
				path: "src/lib/dal.ts",
				tag: "skill",
				track: "security",
				status: "exception",
				exception: {
					reason: "no user-supplied HTML on this path",
					approver: "thomas",
					review_after: "2020-01-01",
				},
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(1);
		expect(result.message).toContain("expired exception");
	});

	it("a non-expired exception passes (exit 0)", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "adr0022.dompurify-on-dangerous-html",
				path: "src/lib/dal.ts",
				tag: "skill",
				track: "security",
				status: "exception",
				exception: {
					reason: "no user-supplied HTML on this path",
					approver: "thomas",
					review_after: "2099-01-01",
				},
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(0);
	});
});

describe("Fail condition: findings.json deleted entirely (absent scope_digest attestation)", () => {
	it("a repo with no frontend-standard/findings.json at all fails with exit 2", () => {
		const repo = initRepo();
		writeRepoFile(repo, "src/lib/dal.ts", DAL_FIXTURE);
		commitAll(repo, "no findings.json ever committed");

		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("missing at commit");
	});

	it("a repo where findings.json existed then was deleted in a later commit fails with exit 2", () => {
		const repo = seedCleanRepo();
		expect(runGate(repo, { today: TODAY }).code).toBe(0);

		git(["rm", "-q", "frontend-standard/findings.json"], repo);
		commitAll(repo, "remove findings.json");

		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
	});
});

describe("Gate 1 (isFrontendShaped): Activation Contract glob matching, mirrors hefesto's SKILL.md verbatim", () => {
	it.each([
		"src/lib/dal.ts",
		"src/lib/ability.ts",
		"src/lib/session.ts",
		"src/lib/thumbor.ts",
		"src/proxy.ts",
		"next.config.ts",
		"src/app/(console)/orders/page.tsx",
		"src/app/(console)/orders/actions.ts",
		"src/app/login/actions.ts",
		"src/app/layout.tsx",
		"src/components/orders/delete-order-dialog.client.tsx",
		".storybook/main.ts",
		".storybook/preview.ts",
	])("%s is frontend-shaped", (relPath) => {
		expect(isFrontendShaped(relPath)).toBe(true);
	});

	it.each([
		"README.md",
		"package.json",
		"src/lib/utils.ts",
		"src/lib/api/server-client.ts",
		"src/lib/actions/select-tenant.ts",
		"src/components/app-logo.tsx",
		"src/generated/orval-client.ts",
		"src/generated/orval-client.zod.ts",
	])("%s is NOT frontend-shaped", (relPath) => {
		expect(isFrontendShaped(relPath)).toBe(false);
	});
});

describe("Scenario 4.2 — a fresh nextjs-kumo-console scaffold produces near-zero open findings", () => {
	it("a clean scaffold (compliant server-only-guarded dal.ts, zero findings) passes with exit 0 via the actual CLI binary", () => {
		const repo = seedCleanRepo();
		const { code, stdout } = runCli(repo);
		expect(code).toBe(0);
		expect(stdout).toContain("PASS");
		expect(stdout).toContain("0 blocking findings");
	});

	it("a fresh scaffold seeded with several compliant reference files and zero open findings still passes", () => {
		const repo = seedRepoWithFindings([], {
			"src/lib/dal.ts": DAL_FIXTURE,
			"src/app/(console)/orders/actions.ts": COMPLIANT_ACTION_FIXTURE,
		});
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(0);
	});

	it("this template's own real, checked-out src tree contains the compliant reference files this scenario assumes", () => {
		const templateRoot = path.resolve(import.meta.dirname, "../..");
		const dal = readFileSync(path.join(templateRoot, "src/lib/dal.ts"), "utf8");
		expect(dal).toContain('import "server-only"');

		const actions = readFileSync(
			path.join(templateRoot, "src/app/(console)/orders/actions.ts"),
			"utf8",
		);
		expect(actions).toContain("problemToActionState");
	});
});

describe("Scenario 4.3 — seeded dangerouslySetInnerHTML without DOMPurify produces one open adr0022 finding", () => {
	it("a finding citing adr0022.dompurify-on-dangerous-html as open fails the gate with exit 1, citing that exact rule id", () => {
		const repo = seedRepoWithFindings(
			[
				{
					rule: "adr0022.dompurify-on-dangerous-html",
					path: "src/components/orders/rich-text.client.tsx",
					tag: "skill",
					track: "security",
					status: "open",
				},
			],
			{
				"src/components/orders/rich-text.client.tsx": DANGEROUS_HTML_FIXTURE,
			},
		);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(1);
		expect(result.message).toContain("adr0022.dompurify-on-dangerous-html");
	});

	it("the seeded fixture itself is the violating shape this rule targets (no DOMPurify import anywhere)", () => {
		expect(DANGEROUS_HTML_FIXTURE).toContain("dangerouslySetInnerHTML");
		expect(DANGEROUS_HTML_FIXTURE).not.toMatch(/dompurify/i);
	});
});

describe("Scenario 4.4 — seeded raw-Problem Server Action produces one open adr0004 finding", () => {
	it("a finding citing adr0004.problem-to-action-state as open fails the gate with exit 1, citing that exact rule id", () => {
		const repo = seedRepoWithFindings(
			[
				{
					rule: "adr0004.problem-to-action-state",
					path: "src/app/(console)/orders/actions.ts",
					tag: "skill",
					track: "dx",
					status: "open",
				},
			],
			{
				"src/app/(console)/orders/actions.ts": NON_COMPLIANT_ACTION_FIXTURE,
			},
		);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(1);
		expect(result.message).toContain("adr0004.problem-to-action-state");
	});

	it("the seeded fixture itself is the violating shape this rule targets (returns response.json() directly, never problemToActionState)", () => {
		expect(NON_COMPLIANT_ACTION_FIXTURE).not.toContain("problemToActionState");
		expect(NON_COMPLIANT_ACTION_FIXTURE).toContain(
			"return await response.json()",
		);
	});
});

describe("Scenario 4.5 — a non-matching file produces zero output and zero write (three-gate silent abort, Gate 1)", () => {
	it("isFrontendShaped returns false for a non-matching file — the mechanical precondition for the skill's own silent abort", () => {
		expect(isFrontendShaped("README.md")).toBe(false);
	});

	it("a non-matching file changing alone never affects the scope_digest (nothing to attest, nothing written)", () => {
		const repo = initRepo();
		writeRepoFile(repo, "src/lib/dal.ts", DAL_FIXTURE);
		commitAll(repo, "a");
		const before = computeScopeDigest(repo, "HEAD");

		writeRepoFile(repo, "docs/CHANGELOG.md", "nothing frontend-shaped here\n");
		commitAll(repo, "unrelated non-matching change");
		const after = computeScopeDigest(repo, "HEAD");

		expect(after).toBe(before);
	});

	// Note: the full three-gate silent-abort property (zero output AND zero
	// Engram write) is a property of the `frontend-standard-check` SKILL
	// (agent-time, hefesto), not of this repo's gate script — the gate script
	// only consumes an already-written findings.json. This suite verifies the
	// one piece of that behavior that is mechanically testable from inside
	// create-coliapp: Gate 1's glob predicate. The skill-behavioral property
	// itself is covered by the design's own Testing Strategy table
	// ("Skill-behavioral (hefesto)" row).
});

describe("Scenario 4.6 — fail-closed cases from the gate's own fail-conditions table", () => {
	it("stale/absent scope_digest fails with exit 2", () => {
		const repo = seedCleanRepo();
		expect(runGate(repo, { today: TODAY }).code).toBe(0);

		writeRepoFile(repo, "src/lib/dal.ts", `${DAL_FIXTURE}\n// stale\n`);
		commitAll(repo, "change without updating scope_digest");

		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("scope_digest mismatch");
	});

	it("an exception status missing 'exception.review_after' fails with exit 2", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "adr0022.dompurify-on-dangerous-html",
				path: "src/lib/dal.ts",
				tag: "skill",
				track: "security",
				status: "exception",
				exception: { reason: "no risk here", approver: "thomas" },
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("exception.review_after");
	});

	it("an expired review_after fails with exit 1 (reactivated as blocking, not malformed)", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "adr0022.dompurify-on-dangerous-html",
				path: "src/lib/dal.ts",
				tag: "skill",
				track: "security",
				status: "exception",
				exception: {
					reason: "no risk here",
					approver: "thomas",
					review_after: "2020-01-01",
				},
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(1);
		expect(result.message).toContain("expired exception");
	});

	it("flat (not nested) exception fields fail with exit 2", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "adr0022.dompurify-on-dangerous-html",
				path: "src/lib/dal.ts",
				tag: "skill",
				track: "security",
				status: "exception",
				reason: "no risk here",
				approver: "thomas",
				review_after: "2099-01-01",
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("flat on the finding");
	});
});

describe("CLI binary exit codes (real subprocess, not just the imported module)", () => {
	it("exits 1 via the real binary for an open finding", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "adr0022.server-only-guard",
				path: "src/lib/dal.ts",
				tag: "skill",
				track: "security",
				status: "open",
			},
		]);
		const { code, stderr } = runCli(repo);
		expect(code).toBe(1);
		expect(stderr).toContain("FAIL (exit 1)");
	});

	it("exits 2 via the real binary for malformed JSON", () => {
		const repo = initRepo();
		writeRepoFile(repo, "src/lib/dal.ts", DAL_FIXTURE);
		writeRepoFile(repo, "frontend-standard/findings.json", "not json at all");
		commitAll(repo, "malformed");

		const { code, stderr } = runCli(repo);
		expect(code).toBe(2);
		expect(stderr).toContain("FAIL (exit 2)");
	});
});

describe("FINDINGS_SCHEMA_VERSION contract", () => {
	it("is 1, matching the design's Interfaces/Contracts", () => {
		expect(FINDINGS_SCHEMA_VERSION).toBe(1);
	});
});
