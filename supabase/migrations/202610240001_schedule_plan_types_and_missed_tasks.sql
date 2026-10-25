begin;

alter table public.study_plans
  add column if not exists plan_type text not null default 'daily';

alter table public.study_plans
  drop constraint if exists study_plans_plan_type_check;

alter table public.study_plans
  add constraint study_plans_plan_type_check
  check (plan_type in ('daily', 'weekly', 'multi_week'));

create or replace function public.mark_my_schedule_missed()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  cutoff time := '22:00';
  local_now timestamp := now() at time zone 'Asia/Kolkata';
  updated_count integer := 0;
  configured_cutoff text;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select v.value #>> '{}'
    into configured_cutoff
  from public.config_values v
  join public.config_definitions d on d.id = v.config_definition_id
  where d.key = 'daily_schedule_cutoff_ist';

  begin
    if configured_cutoff is not null then cutoff := configured_cutoff::time; end if;
  exception when others then
    cutoff := '22:00';
  end;

  update public.schedule_tasks task
  set status = 'missed', missed_at = now(), updated_at = now()
  where task.status = 'scheduled'
    and (task.due_on < local_now::date or (task.due_on = local_now::date and local_now::time >= cutoff))
    and exists (
      select 1 from public.study_plans plan
      where plan.id = task.study_plan_id
        and plan.student_id = current_user_id
        and plan.status = 'active'
    );

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.mark_my_schedule_missed() from public, anon;
grant execute on function public.mark_my_schedule_missed() to authenticated;

create or replace function private.enforce_schedule_plan_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  plan_row public.study_plans%rowtype;
  package_code text;
  active_task_count integer;
begin
  if tg_table_name = 'study_plans' then
    if new.plan_type = 'multi_week' then
      select p.code into package_code
      from public.student_entitlements e
      join public.packages p on p.id = e.package_id
      where e.student_id = new.student_id and e.status = 'active'
        and now() >= e.starts_at and now() < e.ends_at
      order by p.rank desc, e.created_at desc limit 1;
      if coalesce(package_code, '') not in ('BASIC', 'PRO') then
        raise exception 'MULTI_WEEK_PLAN_REQUIRES_BASIC_OR_PRO';
      end if;
    end if;
    return new;
  end if;

  select * into plan_row from public.study_plans where id = new.study_plan_id;
  if plan_row.id is null then raise exception 'Study plan not found'; end if;
  if new.due_on < plan_row.starts_on or new.due_on > plan_row.ends_on then
    raise exception 'Schedule task date must be inside the study plan';
  end if;

  if plan_row.plan_type = 'daily' and new.status <> 'cancelled' then
    select p.code into package_code
    from public.student_entitlements e
    join public.packages p on p.id = e.package_id
    where e.student_id = plan_row.student_id and e.status = 'active'
      and now() >= e.starts_at and now() < e.ends_at
    order by p.rank desc, e.created_at desc limit 1;
    if package_code = 'FREE' then
      select count(*) into active_task_count from public.schedule_tasks
      where study_plan_id = new.study_plan_id and status <> 'cancelled'
        and (tg_op = 'INSERT' or id <> new.id);
      if active_task_count >= 7 then
        raise exception 'FREE_DAILY_TASK_LIMIT_REACHED';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_schedule_plan_rules_on_plans on public.study_plans;
create trigger enforce_schedule_plan_rules_on_plans
before insert or update of plan_type, student_id on public.study_plans
for each row execute function private.enforce_schedule_plan_rules();

drop trigger if exists enforce_schedule_plan_rules_on_tasks on public.schedule_tasks;
create trigger enforce_schedule_plan_rules_on_tasks
before insert or update of study_plan_id, due_on, status on public.schedule_tasks
for each row execute function private.enforce_schedule_plan_rules();

commit;
