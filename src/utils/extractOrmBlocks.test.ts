import { describe, it, expect } from 'vitest'
import { extractOrmBlocks } from './extractOrmBlocks'

// ─── helpers ──────────────────────────────────────────────────────────────────

function extracted(path: string, code: string) {
  return extractOrmBlocks(path, code)
}

function shouldExtract(path: string, code: string) {
  const result = extracted(path, code)
  expect(result, `expected extraction from ${path}`).not.toBeNull()
  return result!
}

function shouldSkip(path: string, code: string) {
  expect(extracted(path, code), `expected ${path} to be skipped`).toBeNull()
}

// ─── Node.js ──────────────────────────────────────────────────────────────────

describe('Node.js — Prisma', () => {
  it('extracts findMany', () => {
    shouldExtract('src/users.ts', `
      const users = await prisma.user.findMany({
        include: { posts: true }
      })
    `)
  })

  it('extracts $queryRaw', () => {
    shouldExtract('src/raw.ts', `
      const result = await prisma.$queryRaw\`SELECT * FROM users\`
    `)
  })

  it('skips spec files', () => {
    shouldSkip('src/users.spec.ts', `
      const users = await prisma.user.findMany()
    `)
  })

  it('skips .d.ts files', () => {
    shouldSkip('src/types.d.ts', `
      const users = await prisma.user.findMany()
    `)
  })
})

describe('Node.js — TypeORM', () => {
  it('extracts createQueryBuilder', () => {
    shouldExtract('src/repo.ts', `
      const users = await userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.posts', 'post')
        .getMany()
    `)
  })

  it('extracts findOne', () => {
    shouldExtract('src/service.ts', `
      const user = await userRepository.findOne({ where: { id } })
    `)
  })

  it('skips migration files', () => {
    shouldSkip('src/migrations/1234_add_users.ts', `
      await queryRunner.createTable(new Table({ name: 'users' }))
    `)
  })
})

describe('Node.js — Mongoose', () => {
  it('extracts find with populate', () => {
    shouldExtract('src/users.js', `
      const users = await User.find({ active: true }).populate('posts')
    `)
  })

  it('extracts aggregate', () => {
    shouldExtract('src/stats.mjs', `
      const result = await Order.aggregate([{ $group: { _id: '$status' } }])
    `)
  })
})

describe('Node.js — Knex / Drizzle / Kysely', () => {
  it('extracts knex query', () => {
    shouldExtract('src/db.ts', `
      const rows = await knex('users').where({ active: true }).select('*')
    `)
  })

  it('extracts drizzle select', () => {
    shouldExtract('src/queries.ts', `
      const result = await db.select().from(users).where(eq(users.active, true))
    `)
  })

  it('extracts kysely selectFrom', () => {
    shouldExtract('src/kysely.ts', `
      const result = await db.selectFrom('users').selectAll().execute()
    `)
  })
})

// ─── Python ───────────────────────────────────────────────────────────────────

describe('Python — SQLAlchemy', () => {
  it('extracts session.query', () => {
    shouldExtract('app/models.py', `
      users = session.query(User).filter(User.active == True).all()
    `)
  })

  it('extracts joinedload', () => {
    shouldExtract('app/users.py', `
      users = session.query(User).options(joinedload(User.posts)).all()
    `)
  })

  it('extracts SQLAlchemy 2.0 select', () => {
    shouldExtract('app/queries.py', `
      result = session.exec(select(User).where(User.active == True))
    `)
  })

  it('skips alembic migrations', () => {
    shouldSkip('alembic/versions/001_add_users.py', `
      op.create_table('users', sa.Column('id', sa.Integer))
    `)
  })

  it('skips test files', () => {
    shouldSkip('tests/test_users.py', `
      users = session.query(User).all()
    `)
  })
})

describe('Python — Django ORM', () => {
  it('extracts objects.filter', () => {
    shouldExtract('views/users.py', `
      users = User.objects.filter(active=True).select_related('profile')
    `)
  })

  it('extracts prefetch_related', () => {
    shouldExtract('views/posts.py', `
      posts = Post.objects.all().prefetch_related('comments')
    `)
  })

  it('extracts bulk_create', () => {
    shouldExtract('services/import.py', `
      User.objects.bulk_create([User(name=n) for n in names])
    `)
  })
})

describe('Python — PyMongo / Motor', () => {
  it('extracts collection.find', () => {
    shouldExtract('db/users.py', `
      users = collection.find({ 'active': True })
    `)
  })

  it('extracts aggregate', () => {
    shouldExtract('db/stats.py', `
      result = collection.aggregate([{ '$group': { '_id': '$status' } }])
    `)
  })
})

// ─── Go ───────────────────────────────────────────────────────────────────────

describe('Go — GORM', () => {
  it('extracts db.Find', () => {
    shouldExtract('repository/users.go', `
      var users []User
      db.Find(&users)
    `)
  })

  it('extracts Preload (N+1 signal)', () => {
    shouldExtract('repository/users.go', `
      db.Preload("Posts").Find(&users)
    `)
  })

  it('extracts db.Where chain', () => {
    shouldExtract('service/orders.go', `
      db.Where("status = ?", "active").Order("created_at desc").Limit(10).Find(&orders)
    `)
  })

  it('skips test files', () => {
    shouldSkip('repository/users_test.go', `
      db.Find(&users)
    `)
  })
})

describe('Go — sqlx / database/sql', () => {
  it('extracts db.Select', () => {
    shouldExtract('store/users.go', `
      err := db.Select(&users, "SELECT * FROM users WHERE active = $1", true)
    `)
  })

  it('extracts db.QueryRow', () => {
    shouldExtract('store/orders.go', `
      row := db.QueryRow("SELECT id, name FROM users WHERE id = $1", id)
      row.Scan(&user.ID, &user.Name)
    `)
  })
})

describe('Go — mongo-go-driver', () => {
  it('extracts collection.Find', () => {
    shouldExtract('db/mongo.go', `
      cursor, err := collection.Find(ctx, bson.M{"active": true})
    `)
  })
})

// ─── Java ─────────────────────────────────────────────────────────────────────

describe('Java — Spring Data JPA', () => {
  it('extracts findAll', () => {
    shouldExtract('repository/UserRepository.java', `
      List<User> users = userRepository.findAll();
    `)
  })

  it('extracts findByActiveTrue', () => {
    shouldExtract('service/UserService.java', `
      List<User> users = userRepository.findByActiveTrue();
    `)
  })

  it('skips test classes', () => {
    shouldSkip('repository/UserRepositoryTest.java', `
      List<User> users = userRepository.findAll();
    `)
  })

  it('skips test source directory', () => {
    shouldSkip('src/test/java/UserService.java', `
      userRepository.findAll();
    `)
  })
})

describe('Java — Hibernate EntityManager', () => {
  it('extracts em.createQuery', () => {
    shouldExtract('dao/UserDao.java', `
      List<User> users = em.createQuery("FROM User WHERE active = true", User.class)
        .setMaxResults(100)
        .getResultList();
    `)
  })

  it('extracts em.persist', () => {
    shouldExtract('dao/UserDao.java', `
      em.persist(user);
      em.flush();
    `)
  })
})

describe('Java — jOOQ', () => {
  it('extracts dsl.selectFrom', () => {
    shouldExtract('db/Queries.java', `
      Result<UserRecord> result = dsl.selectFrom(USER).where(USER.ACTIVE.eq(true)).fetch();
    `)
  })
})

// ─── Ruby ─────────────────────────────────────────────────────────────────────

describe('Ruby — ActiveRecord', () => {
  it('extracts where + includes', () => {
    shouldExtract('app/models/user.rb', `
      users = User.where(active: true).includes(:posts).order(:name)
    `)
  })

  it('extracts find_each (batching)', () => {
    shouldExtract('app/jobs/export_job.rb', `
      User.find_each(batch_size: 500) do |user|
        process(user)
      end
    `)
  })

  it('extracts transaction', () => {
    shouldExtract('app/services/transfer.rb', `
      User.transaction do
        sender.update!(balance: sender.balance - amount)
        receiver.update!(balance: receiver.balance + amount)
      end
    `)
  })

  it('skips spec files', () => {
    shouldSkip('spec/models/user_spec.rb', `
      User.where(active: true).all
    `)
  })

  it('skips db/migrate', () => {
    shouldSkip('db/migrate/001_create_users.rb', `
      create_table :users do |t|
        t.string :name
      end
    `)
  })
})

describe('Ruby — Sequel', () => {
  it('extracts DB dataset', () => {
    shouldExtract('lib/db.rb', `
      users = DB[:users].where(active: true).all
    `)
  })
})

// ─── PHP ──────────────────────────────────────────────────────────────────────

describe('PHP — Eloquent', () => {
  it('extracts User::with (N+1 fix signal)', () => {
    shouldExtract('app/Http/Controllers/UserController.php', `
      $users = User::with('posts')->where('active', true)->get();
    `)
  })

  it('extracts all()', () => {
    shouldExtract('app/Http/Controllers/UserController.php', `
      $users = User::all();
    `)
  })

  it('extracts paginate', () => {
    shouldExtract('app/Http/Controllers/PostController.php', `
      $posts = Post::where('published', true)->paginate(20);
    `)
  })

  it('skips test files', () => {
    shouldSkip('tests/UserTest.php', `
      $users = User::all();
    `)
  })

  it('skips Laravel migrations', () => {
    shouldSkip('database/migrations/2024_01_01_create_users.php', `
      Schema::create('users', function (Blueprint $table) {});
    `)
  })
})

describe('PHP — Doctrine', () => {
  it('extracts em->findBy', () => {
    shouldExtract('src/Repository/UserRepository.php', `
      $users = $em->findBy(['active' => true]);
    `)
  })

  it('extracts QueryBuilder', () => {
    shouldExtract('src/Repository/PostRepository.php', `
      $posts = $qb->select('p')->from('Post', 'p')
        ->where('p.published = :pub')
        ->setParameter('pub', true)
        ->getQuery()->getResult();
    `)
  })
})

// ─── C# ───────────────────────────────────────────────────────────────────────

describe('C# — Entity Framework Core', () => {
  it('extracts Include (eager load signal)', () => {
    shouldExtract('Repositories/UserRepository.cs', `
      var users = context.Users
        .Include(u => u.Posts)
        .Where(u => u.Active)
        .ToListAsync();
    `)
  })

  it('extracts AsNoTracking', () => {
    shouldExtract('Repositories/UserRepository.cs', `
      var users = context.Users.AsNoTracking().Where(u => u.Active).ToList();
    `)
  })

  it('extracts FromSqlRaw', () => {
    shouldExtract('Data/UserContext.cs', `
      var users = context.Users.FromSqlRaw("SELECT * FROM Users WHERE Active = 1").ToList();
    `)
  })

  it('extracts LINQ query syntax', () => {
    shouldExtract('Services/UserService.cs', `
      var users = from u in context.Users
                  where u.Active
                  select u;
    `)
  })

  it('skips test files', () => {
    shouldSkip('Tests/UserRepositoryTests.cs', `
      var users = context.Users.ToList();
    `)
  })
})

describe('C# — Dapper', () => {
  it('extracts connection.Query', () => {
    shouldExtract('Data/UserStore.cs', `
      var users = connection.Query<User>("SELECT * FROM Users WHERE Active = @active", new { active = true });
    `)
  })

  it('extracts QueryAsync', () => {
    shouldExtract('Data/PostStore.cs', `
      var posts = await connection.QueryAsync<Post>("SELECT * FROM Posts");
    `)
  })
})

// ─── Rust ─────────────────────────────────────────────────────────────────────

describe('Rust — SQLx', () => {
  it('extracts query! macro', () => {
    shouldExtract('src/db/users.rs', `
      let users = sqlx::query!("SELECT id, name FROM users WHERE active = $1", true)
        .fetch_all(&pool)
        .await?;
    `)
  })

  it('extracts query_as! macro', () => {
    shouldExtract('src/db/posts.rs', `
      let posts = sqlx::query_as!(Post, "SELECT * FROM posts WHERE user_id = $1", user_id)
        .fetch_all(&pool)
        .await?;
    `)
  })

  it('extracts fetch_one', () => {
    shouldExtract('src/db/users.rs', `
      let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
        .fetch_one(&pool)
        .await?;
    `)
  })
})

describe('Rust — Diesel', () => {
  it('extracts schema DSL', () => {
    shouldExtract('src/db/users.rs', `
      use crate::schema::users::dsl::*;
      let results = users.filter(active.eq(true)).load::<User>(&mut conn)?;
    `)
  })

  it('extracts insert_into', () => {
    shouldExtract('src/db/users.rs', `
      diesel::insert_into(users::table)
        .values(&new_user)
        .get_result::<User>(&mut conn)?;
    `)
  })
})

describe('Rust — SeaORM', () => {
  it('extracts Entity::find', () => {
    shouldExtract('src/db/users.rs', `
      let users = User::Entity::find()
        .filter(user::Column::Active.eq(true))
        .all(db)
        .await?;
    `)
  })
})

// ─── Cross-cutting ─────────────────────────────────────────────────────────────

describe('Non-ORM files', () => {
  it('returns null for a plain TypeScript file with no queries', () => {
    shouldSkip('src/utils/format.ts', `
      export function formatDate(d: Date): string {
        return d.toISOString()
      }
    `)
  })

  it('returns null for a Go file with no queries', () => {
    shouldSkip('pkg/utils/string.go', `
      func ToUpper(s string) string {
        return strings.ToUpper(s)
      }
    `)
  })

  it('returns null for unknown file extension', () => {
    shouldSkip('data/seed.sql', `SELECT * FROM users`)
  })
})

describe('Context window and block merging', () => {
  it('includes surrounding lines as context', () => {
    const code = [
      'func getUser(db *gorm.DB, id uint) {',
      '  // setup',
      '  var user User',
      '  db.First(&user, id)',
      '  return user',
      '}',
    ].join('\n')

    const result = shouldExtract('repo/user.go', code)
    expect(result.content).toContain('func getUser')
    expect(result.content).toContain('db.First')
  })

  it('merges overlapping ranges into a single block', () => {
    const lines = Array.from({ length: 30 }, (_, i) => {
      if (i === 5)  return '  db.Find(&users)'
      if (i === 10) return '  db.Find(&posts)'
      return `  // line ${i}`
    })

    const result = shouldExtract('repo/data.go', lines.join('\n'))
    // Two nearby matches should merge into one block, not two
    expect(result.content.split('// ---').length).toBe(1)
  })

  it('keeps separate blocks for distant matches', () => {
    const lines = Array.from({ length: 60 }, (_, i) => {
      if (i === 0)  return '  db.Find(&users)'
      if (i === 59) return '  db.Find(&posts)'
      return `  // line ${i}`
    })

    const result = shouldExtract('repo/data.go', lines.join('\n'))
    // Two far-apart matches should produce two separate blocks
    expect(result.content.split('// ---').length).toBe(2)
  })
})
