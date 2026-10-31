const PREMIUM_FIELDS = ['energy', 'rmsDb', 'peakDb', 'crestDb', 'danceability', 'happiness', 'moodMethod', 'moodStatus', 'moodPatches', 'moodSeconds', 'moodBackend'];
export function resultForAccess(result, premium = false) {
  const visible = { ...result };
  if (!premium) for (const field of PREMIUM_FIELDS) delete visible[field];
  return visible;
}
