import { useState, useRef, useEffect } from 'react'
import AnalysisResult from './AnalysisResult'
import VoiceInput from './VoiceInput'
import MetaLoader from './MetaLoader'
import { analytics } from '../utils/analytics'
import './QueryAnalyzer.css'
import './MetaLoader.css'

export interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low'
  problem: string
  explanation: string
  sql_generated: string
  fixed_query: string
  migration: string | null
  impact_estimate: string
}

interface Example {
  label: string
  lang: string
  query: string
  schema: string
}

const EXAMPLES: Example[] = [
  {
    label: 'Prisma N+1',
    lang: 'Node.js',
    query: `const users = await prisma.user.findMany()
for (const user of users) {
  const posts = await prisma.post.findMany({ where: { authorId: user.id } })
  console.log(user.name, posts.length)
}`,
    schema: `model User {
  id    Int    @id @default(autoincrement())
  name  String
  email String @unique
  posts Post[]
}

model Post {
  id        Int    @id @default(autoincrement())
  title     String
  body      String
  authorId  Int
  author    User   @relation(fields: [authorId], references: [id])
}`,
  },
  {
    label: 'Unbounded query',
    lang: 'Python',
    query: `def admin_export():
    orders = Order.objects.all().order_by('-created_at')
    return [
        {
            'id': o.id,
            'user': o.user_id,
            'total': str(o.total),
            'status': o.status,
        }
        for o in orders
    ]`,
    schema: `class Order(models.Model):
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'orders'`,
  },
  {
    label: 'Missing transaction',
    lang: 'Go',
    query: `func TransferBalance(db *gorm.DB, fromID, toID uint, amount float64) error {
    var from Account
    db.First(&from, fromID)

    var to Account
    db.First(&to, toID)

    db.Model(&from).Update("balance", from.Balance-amount)
    db.Model(&to).Update("balance", to.Balance+amount)

    return nil
}`,
    schema: `type Account struct {
    gorm.Model
    UserID   uint
    Balance  float64
    Currency string
}`,
  },
  {
    label: 'SQLAlchemy index',
    lang: 'Python',
    query: `def get_user_dashboard(email: str):
    user = session.query(User).filter(User.email == email).first()

    transactions = session.query(Transaction)\\
        .filter(Transaction.user_id == user.id)\\
        .order_by(Transaction.created_at.desc())\\
        .all()

    return {'user': user, 'transactions': transactions}`,
    schema: `class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    email = Column(String(255), nullable=False)
    name = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

class Transaction(Base):
    __tablename__ = 'transactions'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    amount = Column(Numeric(10, 2))
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20))`,
  },
]

function cleanJson(raw: string): string {
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  return m ? m[1] : raw.trim()
}

export default function QueryAnalyzer() {
  const [query, setQuery] = useState(EXAMPLES[0].query)
  const [schema, setSchema] = useState(EXAMPLES[0].schema)
  const [activeExample, setActiveExample] = useState<number | null>(0)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Finding | null>(null)
  const [error, setError] = useState('')
  const [visualUrl, setVisualUrl] = useState('')
  const [visualLoading, setVisualLoading] = useState(false)
  const [modelUsed, setModelUsed] = useState('')
  const rawRef = useRef('')
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [result])

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') analyze()
  }

  async function analyze() {
    if (!query.trim() || !schema.trim()) return
    setLoading(true)
    setResult(null)
    setError('')
    setVisualUrl('')
    setVisualLoading(false)
    setModelUsed('')
    analytics.analyzeQuery(!!schema.trim())
    rawRef.current = ''

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, schema })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Something went wrong — please try again.')
      }

      setModelUsed(res.headers.get('x-model-used') ?? '')
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
          const payload = JSON.parse(line.slice(6))
          if (payload.error) throw new Error(payload.error)
          rawRef.current += payload.text
        }
      }

      let finding: Finding
      try {
        finding = JSON.parse(cleanJson(rawRef.current))
      } catch {
        setError("Couldn't analyse this input — please paste an ORM query, raw SQL, or a schema definition.")
        return
      }
      setResult(finding)
      analytics.analyzeResult(finding.severity)
      if (finding.fixed_query !== 'N/A') {
        setVisualLoading(true)
        generateVisual(finding)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  async function generateVisual(finding: Finding) {
    try {
      const res = await fetch('/api/visualize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: finding.problem,
          fix: finding.fixed_query,
          impact: finding.impact_estimate
        })
      })
      const { url } = await res.json()
      if (url) setVisualUrl(url)
    } catch {
      // visual is optional — fail silently
    } finally {
      setVisualLoading(false)
    }
  }

  const LANGS = ['Node.js', 'Python', 'Go', 'Java', 'Ruby', 'PHP', 'C#', 'Rust']

  function loadExample(index: number) {
    const ex = EXAMPLES[index]
    setQuery(ex.query)
    setSchema(ex.schema)
    setActiveExample(index)
    setResult(null)
    setError('')
    setVisualUrl('')
  }

  return (
    <div className="analyzer">
      <div className="lang-pills-row">
        <div className="lang-pills">
          {LANGS.map(l => <span key={l} className="lang-pill">{l}</span>)}
        </div>
      </div>
      <div className="inputs">
        <div className="input-group">
          <div className="input-label-row">
            <label>Your Query</label>
          </div>
          <textarea
            className={`code-input${loading ? ' input-locked' : ''}`}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={loading}
            placeholder={`// e.g. TypeORM, Prisma, Django ORM, GORM, raw SQL...\nconst users = await userRepository.find({\n  relations: ['posts'],\n  where: { active: true },\n});`}
            rows={12}
          />
        </div>

        <div className="input-group">
          <div className="input-label-row">
            <label>Your Schema</label>
          </div>
          <textarea
            className={`code-input${loading ? ' input-locked' : ''}`}
            value={schema}
            onChange={e => setSchema(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={loading}
            placeholder={`// e.g. Prisma schema, TypeORM entity, Django model, SQL DDL...\n@Entity()\nexport class User {\n  @PrimaryGeneratedColumn() id: number;\n  @Column() active: boolean;\n  @OneToMany(() => Post, p => p.user) posts: Post[];\n}`}
            rows={12}
          />
        </div>
      </div>

      <div className="examples-row">
        <span className="examples-label">Try an example:</span>
        {EXAMPLES.map((ex, i) => (
          <button
            key={i}
            className={`example-btn${activeExample === i ? ' active' : ''}`}
            onClick={() => loadExample(i)}
            disabled={loading}
          >
            <span className="example-lang">{ex.lang}</span>
            <span className="example-name">{ex.label}</span>
          </button>
        ))}
      </div>

      <div className="analyze-row">
        <button
          className="btn-analyze"
          onClick={analyze}
          disabled={loading || !query.trim() || !schema.trim()}
        >
          {loading ? 'Analyzing...' : 'Analyze Query'}
        </button>
        <span className="analyze-hint">🎤 Ask follow-up questions by voice after analysis</span>
      </div>

      {loading && <MetaLoader />}
      {error && <div className="error">{error}</div>}
      <div ref={resultRef}>
        {result && <AnalysisResult finding={result} visualUrl={visualUrl} visualLoading={visualLoading} modelUsed={modelUsed} />}
      </div>
    </div>
  )
}
