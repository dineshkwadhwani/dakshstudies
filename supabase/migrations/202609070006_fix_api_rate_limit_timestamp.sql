create or replace function public.consume_api_rate_limit(
  action_input text,
  key_hash_input text,
  maximum_input integer,
  window_seconds_input integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  resulting_count integer;
  observed_at timestamptz := pg_catalog.clock_timestamp();
begin
  if action_input is null or char_length(action_input) not between 1 and 80
    or key_hash_input !~ '^[a-f0-9]{64}$'
    or maximum_input not between 1 and 10000
    or window_seconds_input not between 1 and 86400 then
    raise exception 'Invalid rate-limit request';
  end if;

  insert into private.api_rate_limits as existing (
    action, key_hash, window_started_at, request_count, updated_at
  ) values (
    action_input, key_hash_input, observed_at, 1, observed_at
  )
  on conflict (action, key_hash) do update set
    window_started_at = case
      when existing.window_started_at <= observed_at - make_interval(secs => window_seconds_input)
        then observed_at
      else existing.window_started_at
    end,
    request_count = case
      when existing.window_started_at <= observed_at - make_interval(secs => window_seconds_input)
        then 1
      else existing.request_count + 1
    end,
    updated_at = observed_at
  returning request_count into resulting_count;

  if random() < 0.01 then
    delete from private.api_rate_limits
    where updated_at < observed_at - interval '2 days';
  end if;

  return resulting_count <= maximum_input;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer) from public;
revoke all on function public.consume_api_rate_limit(text, text, integer, integer) from anon;
revoke all on function public.consume_api_rate_limit(text, text, integer, integer) from authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer) to service_role;
