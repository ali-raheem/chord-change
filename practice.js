export const CHORDS = [
  { name: 'C', label: 'C major', group: 'Major', frets: [-1,3,2,0,1,0], fingers: [0,3,2,0,1,0] },
  { name: 'D', label: 'D major', group: 'Major', frets: [-1,-1,0,2,3,2], fingers: [0,0,0,1,3,2] },
  { name: 'E', label: 'E major', group: 'Major', frets: [0,2,2,1,0,0], fingers: [0,2,3,1,0,0] },
  { name: 'F', label: 'F major', group: 'Major', frets: [1,3,3,2,1,1], fingers: [1,3,4,2,1,1], barre: 1 },
  { name: 'G', label: 'G major', group: 'Major', frets: [3,2,0,0,0,3], fingers: [2,1,0,0,0,3] },
  { name: 'A', label: 'A major', group: 'Major', frets: [-1,0,2,2,2,0], fingers: [0,0,1,2,3,0] },
  { name: 'B', label: 'B major', group: 'Major', frets: [-1,2,4,4,4,2], fingers: [0,1,2,3,4,1], barre: 2 },
  { name: 'Am', label: 'A minor', group: 'Minor', frets: [-1,0,2,2,1,0], fingers: [0,0,2,3,1,0] },
  { name: 'Bm', label: 'B minor', group: 'Minor', frets: [-1,2,4,4,3,2], fingers: [0,1,3,4,2,1], barre: 2 },
  { name: 'Dm', label: 'D minor', group: 'Minor', frets: [-1,-1,0,2,3,1], fingers: [0,0,0,2,3,1] },
  { name: 'Em', label: 'E minor', group: 'Minor', frets: [0,2,2,0,0,0], fingers: [0,2,3,0,0,0] },
  { name: 'A7', label: 'A dominant 7', group: 'Seventh', frets: [-1,0,2,0,2,0], fingers: [0,0,1,0,2,0] },
  { name: 'B7', label: 'B dominant 7', group: 'Seventh', frets: [-1,2,1,2,0,2], fingers: [0,2,1,3,0,4] },
  { name: 'C7', label: 'C dominant 7', group: 'Seventh', frets: [-1,3,2,3,1,0], fingers: [0,3,2,4,1,0] },
  { name: 'D7', label: 'D dominant 7', group: 'Seventh', frets: [-1,-1,0,2,1,2], fingers: [0,0,0,2,1,3] },
  { name: 'E7', label: 'E dominant 7', group: 'Seventh', frets: [0,2,0,1,0,0], fingers: [0,2,0,1,0,0] },
  { name: 'G7', label: 'G dominant 7', group: 'Seventh', frets: [3,2,0,0,0,1], fingers: [3,2,0,0,0,1] },
];

export function makePairs(names, random = Math.random) {
  const unique = [...new Set(names)];
  const pairs = unique.flatMap((a, i) => unique.slice(i + 1).map(b => [a, b]));
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs;
}

export function formatTime(seconds) {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

// Compute from elapsed time so late/background callbacks do not slow the session.
export function sessionPosition(elapsedMs, durationSeconds, pairCount) {
  const durationMs = durationSeconds * 1000;
  const elapsed = Math.max(0, elapsedMs);
  const index = Math.min(Math.floor(elapsed / durationMs), pairCount);
  return {
    index,
    complete: index >= pairCount,
    remaining: index >= pairCount ? 0 : (durationMs - elapsed % durationMs) / 1000,
    progress: pairCount ? Math.min(elapsed / (durationMs * pairCount), 1) : 0,
  };
}
