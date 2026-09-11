import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { topicWordCount } from '../../src/utils/topicHtml.js'

const ids = { chapter: '00000000-0000-4000-8000-000000000001', student: '00000000-0000-4000-8000-000000000002' }
const summary = `<p>${'Concept '.repeat(350).trim()}</p>`

test('topic migration enforces word limits, publication, entitlement and administrator writes', async () => {
  const db = new PGlite()
  try {
    // Minimal dependencies for running the real migration and PostgreSQL RLS.
    await db.exec(`
      create schema extensions; create schema private; create schema auth;
      create role anon; create role authenticated; create role service_role;
      create type public.content_status as enum ('draft','published','archived');
      create function extensions.gen_random_uuid() returns uuid language sql as 'select gen_random_uuid()';
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.user_id',true),'')::uuid$$;
      create function private.current_profile_role() returns text language sql stable as $$select current_setting('test.app_role',true)$$;
      create function private.is_super_admin() returns boolean language sql stable as $$select private.current_profile_role()='super_admin'$$;
      create function private.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now(); return new; end$$;
      create table profiles(id uuid primary key);
      create table curricula(id int primary key,academic_year_id int,status text);
      create table subjects(id int primary key,curriculum_id int,status text);
      create table chapters(id uuid primary key,subject_id int,status text);
      create table student_entitlements(student_id uuid,academic_year_id int,package_id int,status text,starts_at timestamptz,ends_at timestamptz);
      create table features(id int,code text);
      create table package_features(package_id int,feature_id int,enabled boolean);
      grant usage on schema private,auth to authenticated;
      grant select on all tables in schema public to authenticated;
      insert into curricula values(1,2026,'published');
      insert into subjects values(1,1,'published');
      insert into chapters values('${ids.chapter}',1,'published');
      insert into features values(1,'learning_content');
      insert into package_features values(1,1,true);
      insert into student_entitlements values('${ids.student}',2026,1,'active',now()-interval '1 day',now()+interval '1 day');
    `)
    await db.exec(await readFile(new URL('../../supabase/migrations/202609070009_chapter_topics.sql', import.meta.url), 'utf8'))
    await db.query('insert into chapter_topics(chapter_id,title,slug,status,summary_html) values($1,$2,$3,$4,$5)', [ids.chapter, 'Published topic', 'published', 'published', summary])
    await db.query('insert into chapter_topics(chapter_id,title,slug,status,summary_html) values($1,$2,$3,$4,$5)', [ids.chapter, 'Draft topic', 'draft', 'draft', ''])
    await assert.rejects(db.query('insert into chapter_topics(chapter_id,title,slug,status,summary_html) values($1,$2,$3,$4,$5)', [ids.chapter, 'Short', 'short', 'published', '<p>Too short</p>']), /published_topic_summary_length/)
    await assert.rejects(db.query('insert into chapter_topics(chapter_id,title,slug,summary_html) values($1,$2,$3,$4)', [ids.chapter, 'Unsafe', 'unsafe', '<p onclick="bad()">Unsafe</p>']), /topic_summary_safe_markup/)
    for (const html of ['\n<p>one two</p>\n', '<h2>Heading</h2><p>x<sup>2</sup> &amp; y</p>', '', summary]) {
      const result = await db.query('select topic_summary_word_count($1) as count', [html])
      assert.equal(result.rows[0].count, topicWordCount(html))
    }
    const visible = async role => {
      await db.exec(`set role authenticated; select set_config('test.app_role','${role}',false); select set_config('test.user_id','${ids.student}',false);`)
      const result = await db.query('select slug from chapter_topics order by slug')
      await db.exec('reset role')
      return result.rows.map(row => row.slug)
    }
    assert.deepEqual(await visible('student'), ['published'])
    assert.deepEqual(await visible('account_manager'), [])
    assert.deepEqual(await visible('super_admin'), ['draft', 'published'])
    await db.exec('update package_features set enabled=false')
    assert.deepEqual(await visible('student'), [])
    await db.exec("update package_features set enabled=true; update student_entitlements set ends_at=now()-interval '1 second'")
    assert.deepEqual(await visible('student'), [])
    await db.exec("update student_entitlements set ends_at=now()+interval '1 day',academic_year_id=2025")
    assert.deepEqual(await visible('student'), [])
    await db.exec("update student_entitlements set academic_year_id=2026; update chapters set status='draft'")
    assert.deepEqual(await visible('student'), [])
    await db.exec("update chapters set status='published'; set role authenticated; select set_config('test.app_role','student',false)")
    await assert.rejects(db.query('insert into chapter_topics(chapter_id,title,slug) values($1,$2,$3)', [ids.chapter, 'Student edit', 'student-edit']), /row-level security/)
    assert.equal((await db.query("update chapter_topics set title='Changed' returning id")).rows.length, 0)
    await db.exec('reset role; set role anon')
    await assert.rejects(db.query('select summary_html from chapter_topics'), /permission denied/)
    await db.exec('reset role')
  } finally { await db.close() }
})
