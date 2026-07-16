// Result codes returned by `verifyDynamicFlag`. Kept in a sibling module so the
// signing/verification scheme in `./index.ts` can return the raw integers while
// callers stay readable.
export enum DynamicFlagResult {
  // The submission is exactly the flag minted for this team + challenge.
  Valid = 0,
  // The base flag is correct, but the embedded team id / signature does not
  // match the submitting team — the fingerprint of a flag shared from another
  // team rather than an ordinary wrong guess.
  ValidBaseWrongTeamOrSig = 1,
  // Not a valid flag for this challenge at all.
  Invalid = 2,
}
