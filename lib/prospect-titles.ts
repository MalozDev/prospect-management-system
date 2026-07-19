/** Available salutations/titles for prospects. */
export const PROSPECT_TITLES = ["Mr", "Mrs", "Miss", "Madam", "Sir"] as const;
export type ProspectTitle = (typeof PROSPECT_TITLES)[number];
