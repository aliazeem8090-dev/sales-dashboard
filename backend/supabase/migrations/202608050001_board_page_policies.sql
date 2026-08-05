-- Reps need to insert status-history rows when they create/move a proposal.
create policy "Managers or owning reps insert proposal status history" on public.proposal_status_history
for insert with check (
  public.is_manager() or exists (
    select 1 from public.proposal p
    where p.id = "proposalId" and public.is_own_rep(p."repId")
  )
);

-- Reps need to create jobs when logging a new proposal (findOrCreate flow).
create policy "Authenticated users create jobs" on public.job
for insert with check (auth.role() = 'authenticated');

-- Cross-company job-lead notification: a company-1 rep creating a proposal
-- notifies company-2 managers. Reps can't read other companies' profiles or
-- insert notifications directly under RLS, so this runs as a definer-rights
-- function instead of relaxing those policies.
create or replace function public.notify_company_managers(
  p_job_url text,
  p_job_title text,
  p_rep_name text,
  p_source_company_id text,
  p_target_company_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.job_notification ("jobUrl", "jobTitle", "repName", "sourceCompanyId", "targetCompanyId", "targetUserId")
  select p_job_url, p_job_title, p_rep_name, lower(p_source_company_id), lower(p_target_company_id), id
  from public.profiles
  where lower(role::text) = 'manager' and lower("companyId") = lower(p_target_company_id);
end;
$$;

grant execute on function public.notify_company_managers(text, text, text, text, text) to authenticated;
