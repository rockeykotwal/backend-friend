declare function gtag(...args: unknown[]): void

function track(event: string, params?: Record<string, string | number>) {
  if (typeof gtag === 'undefined') return
  gtag('event', event, params)
}

export const analytics = {
  analyzeQuery: (hasSchema: boolean) =>
    track('analyze_query', { has_schema: hasSchema ? 1 : 0 }),

  analyzeResult: (severity: string) =>
    track('analyze_result', { severity }),

  scanGithub: () =>
    track('scan_github'),

  scanFolder: () =>
    track('scan_folder'),

  scanResult: (findingCount: number) =>
    track('scan_result', { finding_count: findingCount }),

  voiceStart: () =>
    track('voice_start'),

  voiceTranscribed: () =>
    track('voice_transcribed'),

  toggleTheme: (theme: string) =>
    track('toggle_theme', { theme }),

  copyCode: (section: string) =>
    track('copy_code', { section }),
}
