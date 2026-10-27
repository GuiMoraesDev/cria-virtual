const QUOTA_LABELS: Record<string, string> = { five_hour: 'session', seven_day: 'weekly' }

export function quotaLabel(kind: string): string {
  return QUOTA_LABELS[kind] ?? kind
}

export function shortModel(id: string): string {
  const s = id.replace(/^claude-/, '').replace(/-\d{8}$/, '')
  const m = s.match(/^([a-z]+)-(\d+)-(\d+)$/)

  return m ? `${m[1]}-${m[2]}.${m[3]}` : s
}

export function humanDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`

  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`
}

export function meterColor(percent: number): string {
  return percent >= 80 ? '#F36353' : percent >= 65 ? '#FF8700' : percent >= 50 ? '#FFBF36' : '#00BD74'
}
