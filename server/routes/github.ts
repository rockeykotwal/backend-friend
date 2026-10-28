import type { Request, Response } from 'express'
import { metaClient, MODELS } from '../_client.js'
import { AGENT_SYSTEM_PROMPT } from '../_prompt.js'

const BACKEND_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|java|kt|rb|php|cs|rs)$/
const SKIP_PATHS = /node_modules|\/vendor\/|\/target\/|\.git\/|__pycache__|\/dist\/|\/build\/|\.next\/|\.nuxt\/|\/coverage\//
const MAX_FILES = 150
const MAX_FILE_BYTES = 100_000  // skip files > 100KB
const CONTEXT_LINES = 8
const BATCH_SIZE = 10

const ORM_PATTERNS = /prisma|typeorm|sequelize|drizzle|mikroorm|mongoose|knex|kysely|objection|waterline|bookshelf|findMany|findFirst|findUnique|findAll|findOne|findById|findByPk|findOrCreate|createQueryBuilder|\$queryRaw|\$executeRaw|session\.(query|execute)|db\.session|\.objects\.(filter|get|all|create|update|delete)|joinedload|subqueryload|selectinload|select_related|prefetch_related|cursor\.execute|db\.(Find|First|Where|Preload|Joins|Create|Save|Delete|Count|Query|QueryRow|Get|Select|NamedExec)\(|NewSelect\(|@Query|@Select|@Insert|@Update|@Delete|ActiveRecord|\$em->|\$qb->|DbContext|ToListAsync|FromSqlRaw|diesel::|sqlx::query|SeaORM|Entity::find|collection\.(find|find_one|insert_one|update_one|delete_one|aggregate|Find|FindOne|InsertOne|UpdateOne|DeleteOne|Aggregate)\(/i

function parseGithubUrl(url: string): { owner: string; repo: string; branch: string } | null {
  const m = url.trim().match(/github\.com\/([^/\s]+)\/([^/\s?#]+?)(?:\.git)?(?:\/tree\/([^/\s?#]+))?(?:[/?#].*)?$/)
  if (!m) return null
  return { owner: m[1], repo: m[2], branch: m[3] || 'HEAD' }
}

// Compact ORM block extraction — same logic as client-side extractOrmBlocks
function extractBlocks(filePath: string, content: string): { path: string; content: string } | null {
  const lines = content.split('\n')
  const ranges: [number, number][] = []

  lines.forEach((line, i) => {
    if (ORM_PATTERNS.test(line)) {
      ranges.push([Math.max(0, i - CONTEXT_LINES), Math.min(lines.length - 1, i + CONTEXT_LINES)])
    }
  })

  if (!ranges.length) return null

  const merged: [number, number][] = []
  for (const [s, e] of ranges.sort((a, b) => a[0] - b[0])) {
    const last = merged[merged.length - 1]
    if (last && s <= last[1] + 1) last[1] = Math.max(last[1], e)
    else merged.push([s, e])
  }

  const blocks = merged.map(([s, e]) => `// lines ${s + 1}–${e + 1}\n${lines.slice(s, e + 1).join('\n')}`)
  return { path: filePath, content: blocks.join('\n\n// ---\n\n') }
}

export async function githubHandler(req: Request, res: Response) {
  const { url } = req.body as { url: string }
  if (!url) return res.status(400).json({ error: 'url is required' })

  const parsed = parseGithubUrl(url)
  if (!parsed) return res.status(400).json({ error: 'Invalid GitHub URL. Expected: https://github.com/owner/repo' })

  const { owner, repo, branch } = parsed

  const ghHeaders: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'backend-friend',
  }
  if (process.env.GITHUB_TOKEN) ghHeaders['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const emit = (payload: object) => res.write(`data: ${JSON.stringify(payload)}\n\n`)

  try {
    emit({ progress: `Connecting to ${owner}/${repo}...` })

    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers: ghHeaders }
    )

    if (treeRes.status === 404) throw new Error(`Repo not found: github.com/${owner}/${repo}`)
    if (treeRes.status === 403) {
      const remaining = treeRes.headers.get('X-RateLimit-Remaining')
      if (remaining === '0') throw new Error('GitHub rate limit hit. Add a GITHUB_TOKEN env var for higher limits.')
      throw new Error('GitHub access denied. Make sure the repo is public.')
    }
    if (!treeRes.ok) throw new Error(`GitHub API error ${treeRes.status}`)

    const { tree, truncated } = await treeRes.json() as {
      tree: Array<{ path: string; type: string; size?: number }>
      truncated: boolean
    }

    const sourceFiles = tree.filter(f =>
      f.type === 'blob' &&
      BACKEND_EXTENSIONS.test(f.path) &&
      !SKIP_PATHS.test(f.path) &&
      (f.size ?? 0) < MAX_FILE_BYTES
    ).slice(0, MAX_FILES)

    if (!sourceFiles.length) throw new Error('No backend source files found in this repository.')

    emit({
      progress: `Found ${sourceFiles.length} source files${truncated ? ' (large repo — scanning top files)' : ''} — downloading...`
    })

    // Fetch file contents in batches
    const rawFiles: Array<{ path: string; content: string }> = []

    for (let i = 0; i < sourceFiles.length; i += BATCH_SIZE) {
      const batch = sourceFiles.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(async f => {
          const r = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(f.path)}`,
            { headers: ghHeaders }
          )
          if (!r.ok) return null
          const data = await r.json() as { content?: string; encoding?: string }
          if (!data.content || data.encoding !== 'base64') return null
          return { path: f.path, content: Buffer.from(data.content, 'base64').toString('utf-8') }
        })
      )
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) rawFiles.push(r.value)
      }

      const fetched = Math.min(i + BATCH_SIZE, sourceFiles.length)
      if (fetched < sourceFiles.length) emit({ progress: `Downloading files (${fetched}/${sourceFiles.length})...` })
    }

    // Extract ORM blocks
    const extracted = rawFiles
      .map(f => extractBlocks(f.path, f.content))
      .filter(Boolean) as Array<{ path: string; content: string }>

    if (!extracted.length) throw new Error('No ORM queries detected in this repository.')

    const totalLines = rawFiles.reduce((s, f) => s + f.content.split('\n').length, 0)
    const extractedLines = extracted.reduce((s, f) => s + f.content.split('\n').length, 0)

    emit({
      progress: `Found ORM queries in ${extracted.length} files (${extractedLines} relevant lines from ${totalLines.toLocaleString()} total) — analysing...`
    })

    const fileBundle = extracted.map(f => `// FILE: ${f.path}\n${f.content}`).join('\n\n---\n\n')
    const inputTokenEstimate = (fileBundle.length + AGENT_SYSTEM_PROMPT.length) / 4
    const model = inputTokenEstimate > 80_000 ? MODELS.wonder : MODELS.spark

    emit({ model })

    const stream = await metaClient.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: AGENT_SYSTEM_PROMPT },
        { role: 'user', content: fileBundle }
      ],
      stream: true
    })

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? ''
      if (text) emit({ text })
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'GitHub scan failed'
    if (res.headersSent) {
      emit({ error: message })
      res.end()
    } else {
      res.status(500).json({ error: message })
    }
  }
}
