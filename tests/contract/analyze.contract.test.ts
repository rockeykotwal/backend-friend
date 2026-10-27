/**
 * Layer B — API Contract Tests for /api/analyze
 *
 * REQUIRES: server running locally  →  npm run dev:api
 *
 * Run manually:  npm run test:contract
 *
 * Asserts shape only — not content. The model's output is not tested here.
 * One representative query per language, 8 tests total.
 */

import { describe, it, expect, beforeAll } from 'vitest'

const BASE = 'http://localhost:3000'

const VALID_SEVERITIES = new Set(['critical', 'high', 'medium', 'low'])
const REQUIRED_FIELDS  = [
  'severity', 'problem', 'explanation',
  'sql_generated', 'fixed_query', 'migration', 'impact_estimate',
]

// ─── helpers ──────────────────────────────────────────────────────────────────

async function analyze(query: string, schema: string) {
  const res = await fetch(`${BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, schema }),
  })

  expect(res.status, 'HTTP status should be 200').toBe(200)

  // collect the SSE stream
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let raw = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    for (const line of decoder.decode(value).split('\n')) {
      if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
      const payload = JSON.parse(line.slice(6))
      if (payload.text) raw += payload.text
    }
  }

  // strip markdown fences if model added them
  const cleaned = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)?.[1] ?? raw.trim()
  const json = JSON.parse(cleaned)
  return json
}

function assertContract(json: Record<string, unknown>, lang: string) {
  // no error field
  expect(json.error, `${lang}: unexpected error field`).toBeUndefined()

  // all required fields present
  for (const field of REQUIRED_FIELDS) {
    expect(json, `${lang}: missing field "${field}"`).toHaveProperty(field)
  }

  // severity is a valid enum value
  expect(
    VALID_SEVERITIES.has(json.severity as string),
    `${lang}: severity "${json.severity}" is not valid`
  ).toBe(true)

  // string fields are non-empty strings
  for (const field of ['problem', 'explanation', 'sql_generated', 'fixed_query', 'impact_estimate']) {
    expect(typeof json[field], `${lang}: ${field} should be a string`).toBe('string')
    expect((json[field] as string).length, `${lang}: ${field} should not be empty`).toBeGreaterThan(0)
  }

  // migration is string or null
  expect(
    json.migration === null || typeof json.migration === 'string',
    `${lang}: migration should be string or null`
  ).toBe(true)
}

// ─── server health check ───────────────────────────────────────────────────────

beforeAll(async () => {
  try {
    await fetch(`${BASE}/api/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  } catch {
    throw new Error('Server not running. Start it with: npm run dev:api')
  }
})

// ─── contract tests ────────────────────────────────────────────────────────────

describe('POST /api/analyze — response contract', () => {

  it('Node.js — Prisma N+1', async () => {
    const json = await analyze(
      `const users = await prisma.user.findMany()
for (const user of users) {
  const posts = await prisma.post.findMany({ where: { authorId: user.id } })
}`,
      `model User { id Int @id; posts Post[] }
model Post { id Int @id; authorId Int; author User @relation(fields: [authorId], references: [id]) }`
    )
    assertContract(json, 'Node.js Prisma')
  })

  it('Python — Django ORM N+1', async () => {
    const json = await analyze(
      `users = User.objects.all()
for user in users:
    print(user.profile.bio)`,
      `class User(models.Model):
    name = models.CharField(max_length=100)
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField()`
    )
    assertContract(json, 'Python Django')
  })

  it('Go — GORM N+1', async () => {
    const json = await analyze(
      `var users []User
db.Find(&users)
for _, user := range users {
    var posts []Post
    db.Where("user_id = ?", user.ID).Find(&posts)
}`,
      `type User struct {
    gorm.Model
    Name  string
    Posts []Post
}
type Post struct {
    gorm.Model
    Title  string
    UserID uint
}`
    )
    assertContract(json, 'Go GORM')
  })

  it('Java — Hibernate lazy N+1', async () => {
    const json = await analyze(
      `List<User> users = userRepository.findAll();
for (User user : users) {
    System.out.println(user.getPosts().size());
}`,
      `@Entity public class User {
    @Id @GeneratedValue Long id;
    @OneToMany(mappedBy = "author", fetch = FetchType.LAZY) List<Post> posts;
}
@Entity public class Post {
    @Id @GeneratedValue Long id;
    @ManyToOne @JoinColumn(name = "author_id") User author;
}`
    )
    assertContract(json, 'Java Hibernate')
  })

  it('Ruby — ActiveRecord N+1', async () => {
    const json = await analyze(
      `users = User.all
users.each do |user|
  puts user.posts.count
end`,
      `class User < ApplicationRecord
  has_many :posts
end
class Post < ApplicationRecord
  belongs_to :user
end`
    )
    assertContract(json, 'Ruby ActiveRecord')
  })

  it('PHP — Eloquent N+1', async () => {
    const json = await analyze(
      `$users = User::all();
foreach ($users as $user) {
    echo $user->posts->count();
}`,
      `class User extends Model {
    public function posts() { return $this->hasMany(Post::class); }
}
class Post extends Model {
    public function user() { return $this->belongsTo(User::class); }
}`
    )
    assertContract(json, 'PHP Eloquent')
  })

  it('C# — EF Core N+1', async () => {
    const json = await analyze(
      `var users = context.Users.ToList();
foreach (var user in users) {
    var count = context.Posts.Where(p => p.UserId == user.Id).Count();
}`,
      `public class User { public int Id { get; set; } public List<Post> Posts { get; set; } }
public class Post { public int Id { get; set; } public int UserId { get; set; } public User User { get; set; } }`
    )
    assertContract(json, 'C# EF Core')
  })

  it('Rust — SQLx query in loop', async () => {
    const json = await analyze(
      `let users = sqlx::query_as!(User, "SELECT id, name FROM users")
    .fetch_all(&pool).await?;
for user in &users {
    let posts = sqlx::query_as!(Post,
        "SELECT id, title FROM posts WHERE user_id = $1", user.id)
        .fetch_all(&pool).await?;
}`,
      `CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE posts (id SERIAL PRIMARY KEY, title TEXT NOT NULL, user_id INTEGER REFERENCES users(id));`
    )
    assertContract(json, 'Rust SQLx')
  })

})
