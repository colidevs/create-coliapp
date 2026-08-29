import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @description Phase 2 (`api-enforcement-mechanism`, PR 2 of 4) scenario
 * tests for the schema-shape CI slice: `.spectral.yaml` running against the
 * seed `openapi/openapi.yaml`. Spawns the real `spectral` CLI binary
 * (`node_modules/.bin/spectral`) rather than re-implementing its behavior —
 * this is the same command `pnpm run api-standard:lint` and the
 * `api-standard.yml` / root `ci.yml` CI jobs invoke, so a pass here is a
 * direct proxy for "CI would pass/fail this".
 *
 * Note on scope (per this PR's own task list): a tenant-cache-key violation
 * (ADR 0012, `src/lib/redis.ts`) is NOT asserted here — that rule is
 * behavioral, not derivable from an OpenAPI document, and stays `skill`-layer
 * only (see `hefesto/.claude/skills/api-standard-check/references/
 * coverage-map.md`). The RFC 9457 shape violation below is the
 * lint-tool-checkable equivalent this CI slice actually owns.
 */
const templateRoot = path.resolve(import.meta.dirname, "../..");
const spectralBin = path.resolve(templateRoot, "node_modules/.bin/spectral");
const rulesetPath = path.resolve(templateRoot, ".spectral.yaml");

function lint(specPath: string): { exitCode: number; output: string } {
	try {
		const output = execFileSync(
			spectralBin,
			["lint", specPath, "--ruleset", rulesetPath],
			{ encoding: "utf8" },
		);
		return { exitCode: 0, output };
	} catch (error) {
		const execError = error as { status: number | null; stdout?: string };
		return { exitCode: execError.status ?? 1, output: execError.stdout ?? "" };
	}
}

describe("api-standard-check: Spectral schema-shape ruleset (ADR 0009)", () => {
	it("fresh scaffold's seed openapi.yaml passes clean (scenario 2.5)", () => {
		const specPath = path.resolve(templateRoot, "openapi/openapi.yaml");
		const { exitCode } = lint(specPath);
		expect(exitCode).toBe(0);
	});

	it("a seeded RFC 9457 shape violation fails the gate (scenario 2.6, lint-tool-checkable equivalent)", () => {
		const fixtureDir = mkdtempSync(
			path.join(tmpdir(), "api-standard-fixture-"),
		);
		const fixturePath = path.join(fixtureDir, "broken-openapi.yaml");

		try {
			// Same seed spec, but the one existing operation neither declares
			// `security` (opts out of adr0009-operation-declares-security) nor
			// wraps its default response in application/problem+json (opts out
			// of adr0009-error-responses-are-problem-details).
			writeFileSync(
				fixturePath,
				`openapi: 3.1.0
info:
  title: broken
  version: "1.0.0"
servers:
  - url: /api/v1
paths:
  /healthcheck/status:
    get:
      operationId: getHealthcheckStatus
      summary: Application-level healthcheck status
      responses:
        "200":
          description: Healthcheck status message
          content:
            application/json:
              schema:
                type: object
                properties:
                  msg:
                    type: string
                    example: "ok"
        default:
          description: Unexpected error
          content:
            application/json:
              schema:
                type: object
                properties:
                  error:
                    type: string
`,
			);

			const { exitCode, output } = lint(fixturePath);
			expect(exitCode).toBe(1);
			expect(output).toContain("adr0009-operation-declares-security");
			expect(output).toContain("adr0009-error-responses-are-problem-details");
		} finally {
			rmSync(fixtureDir, { recursive: true, force: true });
		}
	});
});
