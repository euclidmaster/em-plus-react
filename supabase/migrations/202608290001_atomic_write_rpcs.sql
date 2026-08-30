-- Multi-step writes used by the web client must succeed or fail as one transaction.
-- PostgreSQL executes each function call in the caller's transaction, so an exception
-- raised by any statement rolls the entire RPC back.

create unique index if not exists student_classes_student_class_uidx
  on public.student_classes (student_id, class_id);

create unique index if not exists performance_sessions_performance_session_uidx
  on public.performance_sessions (performance_id, session_no);

create unique index if not exists teachers_profile_id_uidx
  on public.teachers (profile_id)
  where profile_id is not null;

create unique index if not exists students_profile_id_uidx
  on public.students (profile_id)
  where profile_id is not null;

create or replace function public.set_student_classes_atomic(
  p_student_id uuid,
  p_class_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- There may be no junction row to lock, so serialize writes per student explicitly.
  perform pg_advisory_xact_lock(hashtextextended('student-classes:' || p_student_id::text, 0));

  insert into public.student_classes (student_id, class_id)
  select p_student_id, class_id
  from unnest(coalesce(p_class_ids, array[]::uuid[])) as class_id
  on conflict (student_id, class_id) do nothing;

  delete from public.student_classes
  where student_id = p_student_id
    and not (class_id = any(coalesce(p_class_ids, array[]::uuid[])));
end;
$$;

create or replace function public.create_performance_atomic(
  p_performance jsonb,
  p_sessions jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_performance public.performances;
begin
  insert into public.performances (
    student_id,
    subject,
    description,
    attachment_url,
    final_done
  ) values (
    (p_performance->>'student_id')::uuid,
    p_performance->>'subject',
    p_performance->>'description',
    p_performance->>'attachment_url',
    coalesce((p_performance->>'final_done')::boolean, false)
  )
  returning * into v_performance;

  insert into public.performance_sessions (
    performance_id,
    session_no,
    eval_date,
    eval_types,
    is_done
  )
  select
    v_performance.id,
    (session->>'session_no')::integer,
    nullif(session->>'eval_date', '')::date,
    array(select jsonb_array_elements_text(coalesce(session->'eval_types', '[]'::jsonb))),
    coalesce((session->>'is_done')::boolean, false)
  from jsonb_array_elements(coalesce(p_sessions, '[]'::jsonb)) as session
  where nullif(session->>'eval_date', '') is not null
     or jsonb_array_length(coalesce(session->'eval_types', '[]'::jsonb)) > 0
     or coalesce((session->>'is_done')::boolean, false);

  return to_jsonb(v_performance);
end;
$$;

create or replace function public.update_performance_atomic(
  p_performance_id uuid,
  p_performance jsonb,
  p_sessions jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_performance public.performances;
begin
  update public.performances
  set subject = p_performance->>'subject',
      description = p_performance->>'description',
      attachment_url = p_performance->>'attachment_url',
      final_done = coalesce((p_performance->>'final_done')::boolean, false)
  where id = p_performance_id
  returning * into v_performance;

  if not found then
    raise exception 'performance not found: %', p_performance_id using errcode = 'P0002';
  end if;

  delete from public.performance_sessions
  where performance_id = p_performance_id;

  insert into public.performance_sessions (
    performance_id,
    session_no,
    eval_date,
    eval_types,
    is_done
  )
  select
    p_performance_id,
    (session->>'session_no')::integer,
    nullif(session->>'eval_date', '')::date,
    array(select jsonb_array_elements_text(coalesce(session->'eval_types', '[]'::jsonb))),
    coalesce((session->>'is_done')::boolean, false)
  from jsonb_array_elements(coalesce(p_sessions, '[]'::jsonb)) as session
  where nullif(session->>'eval_date', '') is not null
     or jsonb_array_length(coalesce(session->'eval_types', '[]'::jsonb)) > 0
     or coalesce((session->>'is_done')::boolean, false);

  return to_jsonb(v_performance);
end;
$$;

create or replace function public.approve_profile_atomic(p_profile_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_match_id uuid;
  v_match_count integer;
begin
  select * into v_profile
  from public.profiles
  where id = p_profile_id
  for update;

  if not found then
    raise exception 'profile not found: %', p_profile_id using errcode = 'P0002';
  end if;

  update public.profiles set approved = true where id = p_profile_id;

  if v_profile.role in ('teacher', 'assistant') then
    perform pg_advisory_xact_lock(
      hashtextextended('teacher-profile-match:' || coalesce(v_profile.name, ''), 0)
    );

    if not exists (select 1 from public.teachers where profile_id = p_profile_id) then
      select count(*) into v_match_count
      from public.teachers
      where name = v_profile.name and profile_id is null;

      if v_match_count = 1 then
        select id into v_match_id
        from public.teachers
        where name = v_profile.name and profile_id is null
        for update;

        update public.teachers
        set profile_id = p_profile_id, role = v_profile.role
        where id = v_match_id;
      else
        insert into public.teachers (name, role, profile_id)
        values (v_profile.name, v_profile.role, p_profile_id);
      end if;
    end if;
  elsif v_profile.role = 'student' then
    perform pg_advisory_xact_lock(
      hashtextextended(
        'student-profile-match:' || coalesce(v_profile.name, '') || ':' || coalesce(v_profile.grade::text, ''),
        0
      )
    );

    if not exists (select 1 from public.students where profile_id = p_profile_id) then
      select count(*) into v_match_count
      from public.students
      where name = v_profile.name
        and profile_id is null
        and (v_profile.grade is null or grade = v_profile.grade);

      if v_match_count = 1 then
        select id into v_match_id
        from public.students
        where name = v_profile.name
          and profile_id is null
          and (v_profile.grade is null or grade = v_profile.grade)
        for update;

        update public.students set profile_id = p_profile_id where id = v_match_id;
      elsif v_match_count = 0 then
        insert into public.students (
          name, grade, class_name, school_name, phone, profile_id, status
        ) values (
          v_profile.name,
          v_profile.grade,
          v_profile.class_name,
          v_profile.school_name,
          v_profile.phone,
          p_profile_id,
          '재원중'
        );
      else
        raise warning '동명 학생 다수 존재, 수동 연결 필요: %, %', v_profile.name, v_profile.grade;
      end if;
    end if;
  end if;
end;
$$;

create or replace function public.update_clinic_report_row_atomic(
  p_item_id uuid,
  p_kind text,
  p_reply_id uuid,
  p_update_instructions boolean,
  p_instructions text,
  p_update_result boolean,
  p_result text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_update_instructions then
    update public.clinic_items
    set instructions = p_instructions
    where id = p_item_id;

    if not found then
      raise exception 'clinic item not found: %', p_item_id using errcode = 'P0002';
    end if;
  end if;

  if p_update_result and p_kind = 'reply' then
    update public.clinic_replies
    set content = p_result
    where id = p_reply_id and item_id = p_item_id;

    if not found then
      raise exception 'clinic reply not found: %', p_reply_id using errcode = 'P0002';
    end if;
  elsif p_update_result then
    update public.clinic_items
    set result = p_result
    where id = p_item_id;

    if not found then
      raise exception 'clinic item not found: %', p_item_id using errcode = 'P0002';
    end if;
  end if;
end;
$$;

revoke all on function public.set_student_classes_atomic(uuid, uuid[]) from public;
revoke all on function public.create_performance_atomic(jsonb, jsonb) from public;
revoke all on function public.update_performance_atomic(uuid, jsonb, jsonb) from public;
revoke all on function public.approve_profile_atomic(uuid) from public;
revoke all on function public.update_clinic_report_row_atomic(uuid, text, uuid, boolean, text, boolean, text) from public;

grant execute on function public.set_student_classes_atomic(uuid, uuid[]) to authenticated;
grant execute on function public.create_performance_atomic(jsonb, jsonb) to authenticated;
grant execute on function public.update_performance_atomic(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.approve_profile_atomic(uuid) to authenticated;
grant execute on function public.update_clinic_report_row_atomic(uuid, text, uuid, boolean, text, boolean, text) to authenticated;
