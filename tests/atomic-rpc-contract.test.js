import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiPath = new URL('../src/lib/api.js', import.meta.url);
const migrationPath = new URL(
  '../supabase/migrations/202608290001_atomic_write_rpcs.sql',
  import.meta.url,
);

const [api, migration] = await Promise.all([
  readFile(apiPath, 'utf8'),
  readFile(migrationPath, 'utf8'),
]);

const rpcContracts = [
  {
    jsFunction: 'setStudentClasses',
    rpc: 'set_student_classes_atomic',
    sqlSignature: 'set_student_classes_atomic(uuid, uuid[])',
  },
  {
    jsFunction: 'createPerformance',
    rpc: 'create_performance_atomic',
    sqlSignature: 'create_performance_atomic(jsonb, jsonb)',
  },
  {
    jsFunction: 'updatePerformance',
    rpc: 'update_performance_atomic',
    sqlSignature: 'update_performance_atomic(uuid, jsonb, jsonb)',
  },
  {
    jsFunction: 'approveProfile',
    rpc: 'approve_profile_atomic',
    sqlSignature: 'approve_profile_atomic(uuid)',
  },
  {
    jsFunction: 'updateClinicReportRow',
    rpc: 'update_clinic_report_row_atomic',
    sqlSignature: 'update_clinic_report_row_atomic(uuid, text, uuid, boolean, text, boolean, text)',
  },
];

test('every public JS wrapper calls its matching atomic RPC', () => {
  for (const { jsFunction, rpc } of rpcContracts) {
    const start = api.indexOf(`export async function ${jsFunction}`);
    assert.notEqual(start, -1, `${jsFunction} export is missing`);
    const nextExport = api.indexOf('export async function ', start + 1);
    const body = api.slice(start, nextExport === -1 ? undefined : nextExport);
    assert.match(body, new RegExp(`supabase\\.rpc\\('${rpc}'`));
  }
});

test('atomic RPCs are invoker-security PL/pgSQL functions granted only to authenticated users', () => {
  for (const { rpc, sqlSignature } of rpcContracts) {
    const start = migration.indexOf(`function public.${rpc}(`);
    assert.notEqual(start, -1, `${rpc} SQL function is missing`);
    const end = migration.indexOf('$$;', start);
    const definition = migration.slice(start, end);
    assert.match(definition, /language plpgsql/);
    assert.match(definition, /security invoker/);
    assert.match(definition, /set search_path = public/);
    assert.ok(migration.includes(`revoke all on function public.${sqlSignature} from public;`));
    assert.ok(migration.includes(`grant execute on function public.${sqlSignature} to authenticated;`));
  }
});

test('concurrent set synchronization and approval have serialization and uniqueness guards', () => {
  assert.match(migration, /student_classes \(student_id, class_id\)/);
  assert.match(migration, /performance_sessions \(performance_id, session_no\)/);
  assert.match(migration, /teachers \(profile_id\)[\s\S]*where profile_id is not null/);
  assert.match(migration, /students \(profile_id\)[\s\S]*where profile_id is not null/);
  assert.match(migration, /pg_advisory_xact_lock[\s\S]*student-classes:/);
  assert.match(migration, /pg_advisory_xact_lock[\s\S]*teacher-profile-match:/);
  assert.match(migration, /pg_advisory_xact_lock[\s\S]*student-profile-match:/);
  assert.match(migration, /from public\.profiles[\s\S]*for update/);
});

test('partial-write-prone statements remain inside one RPC definition', () => {
  const updateStart = migration.indexOf('function public.update_performance_atomic(');
  const updateEnd = migration.indexOf('$$;', updateStart);
  const updateBody = migration.slice(updateStart, updateEnd);
  assert.match(updateBody, /update public\.performances/);
  assert.match(updateBody, /delete from public\.performance_sessions/);
  assert.match(updateBody, /insert into public\.performance_sessions/);
  assert.match(updateBody, /raise exception 'performance not found/);

  const clinicStart = migration.indexOf('function public.update_clinic_report_row_atomic(');
  const clinicEnd = migration.indexOf('$$;', clinicStart);
  const clinicBody = migration.slice(clinicStart, clinicEnd);
  assert.match(clinicBody, /update public\.clinic_items/);
  assert.match(clinicBody, /update public\.clinic_replies/);
  assert.match(clinicBody, /raise exception 'clinic reply not found/);
});
