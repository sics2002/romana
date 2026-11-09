// Only timings supplied by Cinemana are used; this is not scene recognition.
export function normalizeSkips(data) {
  if (!data || !Array.isArray(data.start) || !Array.isArray(data.end) || data.start.length !== data.end.length) throw new Error('INVALID_SKIP_DATA');
  const intervals = data.start.map((start, i) => ({ start: Number(start), end: Number(data.end[i]) }));
  if (intervals.some((v, i) => data.start[i] === '' || data.end[i] === '' || data.start[i] == null || data.end[i] == null || !Number.isFinite(v.start) || !Number.isFinite(v.end) || v.start < 0 || v.end <= v.start)) throw new Error('INVALID_SKIP_DATA');
  const merged = [];
  for (const interval of intervals.sort((a, b) => a.start - b.start)) {
    const previous = merged.at(-1);
    if (previous && interval.start <= previous.end + .5) previous.end = Math.max(previous.end, interval.end);
    else merged.push({ ...interval });
  }
  return merged;
}

export function skipTarget(intervals, time) {
  const interval = intervals.find(v => time >= Math.max(0, v.start - .35) && time < v.end);
  return interval ? interval.end + .75 : null;
}
