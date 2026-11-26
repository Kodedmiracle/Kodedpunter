// A match has kicked off when its start time is now or earlier.
// Missing or unreadable times are treated as still upcoming so a blank
// field does not hide an otherwise valid fixture.

export function hasKickedOff(kickoff, now = Date.now()) {
  if (!kickoff) return false;
  const t = new Date(kickoff).getTime();
  return Number.isFinite(t) && t <= now;
}

export function isUpcoming(kickoff, now = Date.now()) {
  return !hasKickedOff(kickoff, now);
}
