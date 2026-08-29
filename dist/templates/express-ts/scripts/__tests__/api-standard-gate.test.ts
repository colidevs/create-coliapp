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
	isApiShaped,
	resolveCommit,
	runGate,
	validateFindingsShape,
} from "../api-standard-gate.mjs";

/**
 * @description Phase 3 (`api-enforcement-mechanism`, PR 3 of 4) test suite
 * for the attestation gate. Written RED-test-first against the design's
 * Threat Matrix and Decision 2's five fail conditions before the
 * implementation satisfied them (`api-standard-gate.mjs` already exists in
 * this same PR, but every case below was authored as a failing expectation
 * first — see the apply-progress record for the RED→GREEN evidence table).
 *
 * Two test styles, deliberately mixed:
 * - Fast, git-free unit tests against the exported pure functions
 *   (`validateFindingsShape`, `isApiShaped`, `assertSafeRelativePath`,
 *   `evaluateFindings`) for the shape/date fail conditions.
 * - Real temp-git-repo tests via `runGate`/the actual CLI binary for every
 *   condition that depends on commit state (digest, uncommitted fixes,
 *   deleted findings.json) — these spawn real `git` and, for the CLI-binary
 *   tests, a real `node` subprocess, proving the actual runtime path rather
 *   than only the imported module.
 */

const scriptPath = path.resolve(
	import.meta.dirname,
	"../api-standard-gate.mjs",
);
const TODAY = "2026-08-17";

/**
 * Environment for every spawned `git` call in this suite, with all `GIT_*`
 * variables stripped. When this test file runs from inside a git hook (e.g.
 * the repo's own pre-commit hook, which runs `pnpm test`), the hook's
 * process environment carries `GIT_DIR`/`GIT_WORK_TREE`/`GIT_INDEX_FILE`
 * scoped to the commit currently in progress. A child `git` process
 * inheriting those variables ignores the explicit `cwd` passed to `initRepo`
 * below and silently operates against the REAL repository instead of the
 * intended `mkdtempSync` sandbox — confirmed directly: without this fix,
 * every "isolated" fixture commit this suite makes (`seed`, `malformed`,
 * `wrong version`, ...) actually lands on the real repository's HEAD when
 * the suite runs inside a pre-commit hook, corrupting it. Found 2026-08-29
 * after a background agent's ~6-hour thrash and a second, independent
 * repro on a normal commit — see docs/backlog.md for the full incident.
 */
const GIT_ENV = Object.fromEntries(
	Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
) as NodeJS.ProcessEnv;

function git(args: string[], cwd: string): string {
	return execFileSync("git", args, { cwd, encoding: "utf8", env: GIT_ENV });
}

const createdRepos: string[] = [];

function initRepo(): string {
	const dir = mkdtempSync(path.join(tmpdir(), "api-standard-gate-"));
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

const REDIS_FIXTURE = `export function tenantCacheKey(tenantId: string, resource: string): string {
	return \`\${tenantId}:\${resource}\`;
}
`;

/** Seeds a repo with one API-shaped file and a correctly-attested, clean
 * findings.json (empty findings array). Returns the repo path. */
function seedCleanRepo(): string {
	const repo = initRepo();
	writeRepoFile(repo, "src/lib/redis.ts", REDIS_FIXTURE);
	writeRepoFile(
		repo,
		"api-standard/findings.json",
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
		"api-standard/findings.json",
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
 * an empty one — digest is still recomputed for the current file set. */
function seedRepoWithFindings(
	findings: Array<Record<string, unknown>>,
	extraFiles: Record<string, string> = {},
): string {
	const repo = initRepo();
	writeRepoFile(repo, "src/lib/redis.ts", REDIS_FIXTURE);
	for (const [relPath, content] of Object.entries(extraFiles)) {
		writeRepoFile(repo, relPath, content);
	}
	writeRepoFile(
		repo,
		"api-standard/findings.json",
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
		"api-standard/findings.json",
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
		writeRepoFile(repo, "src/lib/redis.ts", REDIS_FIXTURE);
		writeRepoFile(
			repo,
			"api-standard/findings.json",
			"{ this is not valid json",
		);
		commitAll(repo, "malformed findings.json");

		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("not valid JSON");
	});

	it("a non-version:1 payload exits 2", () => {
		const repo = initRepo();
		writeRepoFile(repo, "src/lib/redis.ts", REDIS_FIXTURE);
		writeRepoFile(
			repo,
			"api-standard/findings.json",
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
			assertSafeRelativePath("src/lib/redis.ts", "findings[0].path"),
		).not.toThrow();
	});

	it("a finding with a path-traversal path fails the full gate with exit 2", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "ADR-0012/tenant-cache-key",
				path: "../../etc/passwd",
				status: "open",
			},
		]);

		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("path");
	});

	it("the CLI never accepts a repo-path argument — it always operates on cwd", () => {
		const repo = seedCleanRepo();
		// Attempt to pass an unsupported repo-selection flag; the script has no
		// argument parser at all, so it is silently ignored and the gate still
		// evaluates `cwd`, never a caller-supplied path.
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
				rule: "ADR-0012/tenant-cache-key",
				path: "src/lib/redis.ts",
				status: "open",
			},
		]);

		// Baseline: committed state has an open finding, must fail.
		const before = runGate(repo, { today: TODAY });
		expect(before.code).toBe(1);

		// Simulate a developer "fixing" the file AND marking it resolved, but
		// never committing either change.
		writeRepoFile(repo, "src/lib/redis.ts", `${REDIS_FIXTURE}\n// fixed\n`);
		writeRepoFile(
			repo,
			"api-standard/findings.json",
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

		// Uncommitted: someone edits findings.json in the worktree to add a
		// fabricated exception, without committing.
		writeRepoFile(
			repo,
			"api-standard/findings.json",
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

describe("resolveCommit ignores process.env.GITHUB_SHA (real CI regression, found via a live PR run)", () => {
	/**
	 * @description A real bug, not a hypothetical: the first CI run of this PR
	 * (`colidevs/create-coliapp#15`) failed the `templates/express-ts` job
	 * because `resolveCommit` originally preferred `process.env.GITHUB_SHA`
	 * whenever it was set. Inside a GitHub Actions job, `GITHUB_SHA` is a
	 * process-global env var set to the OUTER checkout's commit — it leaked
	 * into every temp-repo-based test here, which has its own unrelated HEAD,
	 * causing `git show <outer-sha>:./api-standard/findings.json` to fail
	 * with "missing at commit" against a repo that never had that commit.
	 * Fixed by always resolving HEAD from `cwd` itself. This test pins that
	 * fix so it cannot silently regress.
	 */
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
		const expected = git(["rev-parse", "HEAD"], repo).trim();
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
	// term appearing inside an explanatory comment — the workflow files
	// intentionally document the absence of `pull_request_target` in prose.
	const triggerKeyPattern = /^\s*pull_request_target\s*:/m;

	it("templates/express-ts/.github/workflows/api-standard.yml has no pull_request_target trigger and no dynamic gh pr composition", () => {
		const workflow = readFileSync(
			path.join(templateRoot, ".github/workflows/api-standard.yml"),
			"utf8",
		);
		expect(workflow).not.toMatch(triggerKeyPattern);
		expect(workflow).not.toMatch(/gh\s+pr\s+/);
		expect(workflow).toContain("node scripts/api-standard-gate.mjs");
	});

	it("the root ci.yml api-standard job has no pull_request_target trigger and no dynamic gh pr composition", () => {
		const rootRoot = path.resolve(templateRoot, "..", "..");
		const workflow = readFileSync(
			path.join(rootRoot, ".github/workflows/ci.yml"),
			"utf8",
		);
		expect(workflow).not.toMatch(triggerKeyPattern);
		expect(workflow).not.toMatch(/gh\s+pr\s+/);
		expect(workflow).toContain("node scripts/api-standard-gate.mjs");
	});
});

describe("Decision 2, fail condition (a): API-shaped files changed with no matching scope_digest", () => {
	it("a stale digest (file changed after attestation) fails with exit 2", () => {
		const repo = seedCleanRepo();
		expect(runGate(repo, { today: TODAY }).code).toBe(0);

		// Commit a real change to the API-shaped file WITHOUT updating scope_digest.
		writeRepoFile(repo, "src/lib/redis.ts", `${REDIS_FIXTURE}\n// changed\n`);
		commitAll(repo, "change redis.ts without re-running the check");

		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("scope_digest mismatch");
	});

	it("computeScopeDigest changes when API-shaped file content changes", () => {
		const repoA = initRepo();
		writeRepoFile(repoA, "src/lib/redis.ts", REDIS_FIXTURE);
		commitAll(repoA, "a");
		const digestA = computeScopeDigest(repoA, "HEAD");

		const repoB = initRepo();
		writeRepoFile(
			repoB,
			"src/lib/redis.ts",
			`${REDIS_FIXTURE}\n// different\n`,
		);
		commitAll(repoB, "b");
		const digestB = computeScopeDigest(repoB, "HEAD");

		expect(digestA).not.toBe(digestB);
	});

	it("computeScopeDigest ignores non-API-shaped files entirely", () => {
		const repo = initRepo();
		writeRepoFile(repo, "src/lib/redis.ts", REDIS_FIXTURE);
		commitAll(repo, "a");
		const before = computeScopeDigest(repo, "HEAD");

		writeRepoFile(repo, "README.md", "# unrelated change\n");
		commitAll(repo, "unrelated docs change");
		const after = computeScopeDigest(repo, "HEAD");

		expect(before).toBe(after);
	});
});

describe("Decision 2, fail condition (b): any finding status: open", () => {
	it("a single open finding fails with exit 1", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "ADR-0012/tenant-cache-key",
				path: "src/lib/redis.ts",
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
				{ rule: "A", path: "a.ts", status: "open" },
				{ rule: "B", path: "b.ts", status: "open" },
			],
		};
		const blocking = evaluateFindings(doc, TODAY);
		expect(blocking).toHaveLength(2);
	});
});

describe("Decision 2, fail condition (c): exception missing rule/reason/approver/review_after", () => {
	it("missing 'reason' on an exception fails with exit 2", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "ADR-0013/webhook-signing",
				path: "src/lib/redis.ts",
				status: "exception",
				exception: { approver: "thomas", review_after: "2099-01-01" },
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("reason");
	});

	it("missing 'approver' on an exception fails with exit 2", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "ADR-0013/webhook-signing",
				path: "src/lib/redis.ts",
				status: "exception",
				exception: {
					reason: "no third-party sender to verify",
					review_after: "2099-01-01",
				},
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("approver");
	});

	it("missing 'review_after' on an exception fails with exit 2", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "ADR-0013/webhook-signing",
				path: "src/lib/redis.ts",
				status: "exception",
				exception: {
					reason: "no third-party sender to verify",
					approver: "thomas",
				},
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("review_after");
	});

	it("exception fields flat on the finding (not nested) fail with exit 2", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "ADR-0013/webhook-signing",
				path: "src/lib/redis.ts",
				status: "exception",
				reason: "no third-party sender to verify",
				approver: "thomas",
				review_after: "2099-01-01",
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("nested");
	});

	it("'not_applicable' status is accepted and never blocks", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "ADR-0012/tenant-cache-key",
				path: "src/lib/redis.ts",
				status: "not_applicable",
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(0);
	});

	it("a finding missing 'rule' entirely fails with exit 2 regardless of status", () => {
		expect(() =>
			validateFindingsShape({
				version: 1,
				scope_digest: "sha256:x",
				findings: [{ path: "a.ts", status: "open" }],
			}),
		).toThrow(GateError);
	});
});

describe("Decision 2, fail condition (d): review_after < today (expired exception)", () => {
	it("an expired exception reactivates as a blocking finding (exit 1)", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "ADR-0013/webhook-signing",
				path: "src/lib/redis.ts",
				status: "exception",
				exception: {
					reason: "no third-party sender to verify",
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
				rule: "ADR-0013/webhook-signing",
				path: "src/lib/redis.ts",
				status: "exception",
				exception: {
					reason: "no third-party sender to verify",
					approver: "thomas",
					review_after: "2099-01-01",
				},
			},
		]);
		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(0);
	});
});

describe("Decision 2, fail condition (e): findings.json deleted entirely", () => {
	it("a repo with no api-standard/findings.json at all fails with exit 2", () => {
		const repo = initRepo();
		writeRepoFile(repo, "src/lib/redis.ts", REDIS_FIXTURE);
		commitAll(repo, "no findings.json ever committed");

		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
		expect(result.message).toContain("missing at commit");
	});

	it("a repo where findings.json existed then was deleted in a later commit fails with exit 2", () => {
		const repo = seedCleanRepo();
		expect(runGate(repo, { today: TODAY }).code).toBe(0);

		git(["rm", "-q", "api-standard/findings.json"], repo);
		commitAll(repo, "remove findings.json");

		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(2);
	});
});

describe("isApiShaped glob matching (corrected globs)", () => {
	it.each([
		"src/v1/route.ts",
		"src/v1/types.ts",
		"src/v1/modules/healthcheck/controller.ts",
		"src/v1/modules/healthcheck/service.ts",
		"src/v1/middlewares/auth.ts",
		"src/lib/db/client.ts",
		"src/lib/db/schema.ts",
		"src/lib/redis.ts",
		"openapi/openapi.yaml",
	])("%s is API-shaped", (relPath) => {
		expect(isApiShaped(relPath)).toBe(true);
	});

	it.each([
		"README.md",
		"src/v1/res/errors.ts",
		"src/lib/utils.ts",
		"package.json",
	])("%s is NOT API-shaped", (relPath) => {
		expect(isApiShaped(relPath)).toBe(false);
	});
});

describe("Integration: seeded violation fails the gate (scenario 3.12)", () => {
	it("tenant dimension removed from cache key + flat {error} instead of RFC 9457 → exit 1", () => {
		const repo = seedRepoWithFindings(
			[
				{
					rule: "ADR-0012/tenant-cache-key",
					path: "src/lib/redis.ts",
					status: "open",
				},
				{
					rule: "ADR-0009/rfc9457-error-shape",
					path: "openapi/openapi.yaml",
					status: "open",
				},
			],
			{
				"openapi/openapi.yaml":
					'openapi: 3.1.0\ninfo:\n  title: broken\n  version: "1.0.0"\n',
			},
		);

		const result = runGate(repo, { today: TODAY });
		expect(result.code).toBe(1);
		expect(result.message).toContain("ADR-0012/tenant-cache-key");
		expect(result.message).toContain("ADR-0009/rfc9457-error-shape");
	});
});

describe("Integration: fresh scaffold passes with zero findings (scenario, real CLI binary)", () => {
	it("a clean repo with the seeded empty findings.json exits 0 via the actual CLI binary", () => {
		const repo = seedCleanRepo();
		const { code, stdout } = runCli(repo);
		expect(code).toBe(0);
		expect(stdout).toContain("PASS");
	});

	it("this template's own real findings.json + src tree passes today", () => {
		const templateRoot = path.resolve(import.meta.dirname, "../..");
		const result = runGate(templateRoot, { today: TODAY });
		expect(result.code).toBe(0);
	});
});

describe("CLI binary exit codes (real subprocess, not just the imported module)", () => {
	it("exits 1 via the real binary for an open finding", () => {
		const repo = seedRepoWithFindings([
			{
				rule: "ADR-0012/tenant-cache-key",
				path: "src/lib/redis.ts",
				status: "open",
			},
		]);
		const { code, stderr } = runCli(repo);
		expect(code).toBe(1);
		expect(stderr).toContain("FAIL (exit 1)");
	});

	it("exits 2 via the real binary for malformed JSON", () => {
		const repo = initRepo();
		writeRepoFile(repo, "src/lib/redis.ts", REDIS_FIXTURE);
		writeRepoFile(repo, "api-standard/findings.json", "not json at all");
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
