/** Canonical undirected pair key for two identity ids. */
export function friendshipPairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function isSelfFriendRequest(a: string, b: string): boolean {
  return a === b;
}
