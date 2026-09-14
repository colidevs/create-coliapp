/**
 * In-memory `categories` MSW fixture — mirrors `nextjs-kumo-console`'s own
 * `src/mocks/data/orders.ts` shape/posture (framework-free, directly
 * unit-testable, seeded once). New for this batch: Phase 5 shipped no
 * hand-written fixture yet (`src/mocks/handlers.ts`'s own doc comment).
 */
export interface CategoryRecord {
	id: string;
	name: string;
	slug: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export function defaultCategorySeed(): CategoryRecord[] {
	const now = "2026-09-01T00:00:00.000Z";

	return [
		{
			id: "cat-seating",
			name: "Seating",
			slug: "seating",
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "cat-lighting",
			name: "Lighting",
			slug: "lighting",
			isActive: true,
			createdAt: now,
			updatedAt: now,
		},
	];
}

export const categoriesFixture: CategoryRecord[] = defaultCategorySeed();
