create extension if not exists "pgcrypto";

create type public.app_role as enum (
  'ADMIN',
  'MANAGER',
  'REP',
  'LEAD',
  'LINKEDIN_AGENT',
  'FREELANCER_AGENT'
);

create type public.profile_type as enum ('MERN', 'LARAVEL', 'AI_ML', 'WORDPRESS', 'GENERAL');
create type public.insight_type as enum ('PERFORMANCE', 'PROPOSAL_QUALITY', 'ACTIVITY', 'PROFILE_FIT', 'MANAGER_NOTE');
create type public.insight_severity as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
create type public.proposal_status as enum ('SENT', 'VIEWED', 'REPLIED', 'INTERVIEW', 'HIRED', 'REJECTED', 'LOST');
create type public.freelancer_job_status as enum ('FOUND', 'APPLIED', 'VIEWED', 'REPLIED', 'INTERVIEW', 'HIRED', 'LOST');
create type public.freelancer_lead_status as enum ('NEW', 'PROPOSAL_SENT', 'REPLIED', 'INTERVIEW', 'HIRED', 'LOST');
create type public.linkedin_lead_status as enum ('SEARCHED', 'CONTACTED', 'REPLIED', 'FOLLOWED_UP', 'CONVERTED', 'REJECTED');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text unique,
  role public.app_role not null default 'REP',
  "companyId" text,
  "assignedProfileId" uuid,
  "activeStatus" boolean not null default true,
  "repId" uuid,
  "agentId" uuid,
  "freelancerAgentId" uuid,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.upwork_profile (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  "primarySkills" text[],
  niche text,
  "companyId" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.rep (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.profiles(id) on delete cascade,
  "managerId" uuid references public.profiles(id) on delete set null,
  targets jsonb,
  "currentConnects" integer not null default 0,
  "weeklyGoals" jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_rep_id_fkey foreign key ("repId") references public.rep(id) on delete set null,
  add constraint profiles_assigned_profile_id_fkey foreign key ("assignedProfileId") references public.upwork_profile(id) on delete set null;

create table public.job (
  id uuid primary key default gen_random_uuid(),
  "upworkJobUrl" text not null unique,
  title text not null,
  "clientBudget" text,
  category text,
  skills text[],
  "postedDate" date,
  description text,
  "fitTags" text[],
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.proposal (
  id uuid primary key default gen_random_uuid(),
  "repId" uuid not null references public.rep(id) on delete cascade,
  "jobId" uuid not null references public.job(id) on delete cascade,
  "fullProposalText" text not null,
  "submittedAt" timestamptz not null,
  "viewedAt" timestamptz,
  "repliedAt" timestamptz,
  "interviewAt" timestamptz,
  "hiredAt" timestamptz,
  status public.proposal_status not null default 'SENT',
  "connectsUsed" integer not null default 0,
  "profileUsedId" uuid references public.upwork_profile(id) on delete set null,
  "contractValue" double precision,
  "aiScore" double precision,
  "manualScore" double precision,
  "improvementNotes" text,
  "lostReason" text,
  "boardOrder" integer not null default 0,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.proposal_review (
  id uuid primary key default gen_random_uuid(),
  "proposalId" uuid not null references public.proposal(id) on delete cascade,
  "overallScore" double precision,
  "parameterScores" jsonb,
  "missingElements" text[],
  "rewrittenVersion" text,
  suggestions text[],
  "improvedHook" text,
  "modelOutputSnapshot" jsonb,
  "createdAt" timestamptz not null default now()
);

create table public.proposal_status_history (
  id uuid primary key default gen_random_uuid(),
  "proposalId" uuid not null references public.proposal(id) on delete cascade,
  "fromStatus" public.proposal_status,
  "toStatus" public.proposal_status not null,
  "changedBy" uuid references public.profiles(id) on delete set null,
  notes text,
  "changedAt" timestamptz not null default now()
);

create table public.lead (
  id uuid primary key default gen_random_uuid(),
  "repId" uuid not null references public.rep(id) on delete cascade,
  "proposalId" uuid references public.proposal(id) on delete set null,
  "companyId" text,
  "clientName" text not null,
  "companyName" text,
  "clientMessage" text,
  persona text,
  rate text,
  "clientContactInfo" text,
  "createdAt" timestamptz not null default now()
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  "repId" uuid not null references public.rep(id) on delete cascade,
  date date not null,
  "proposalsSent" integer not null default 0,
  "leadsGenerated" integer not null default 0,
  "dealsClosed" integer not null default 0,
  "connectsUsed" integer not null default 0,
  "remainingConnects" integer not null default 0,
  "challengesFaced" text,
  justification text,
  notes text,
  "createdAt" timestamptz not null default now(),
  unique ("repId", date)
);

create table public.benchmark (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  "profileType" public.profile_type not null default 'GENERAL',
  "scoringWeights" jsonb,
  "minimumStandards" jsonb,
  "profileSpecificGuidance" text,
  "proposalTemplates" text[],
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.coaching_insight (
  id uuid primary key default gen_random_uuid(),
  "repId" uuid not null references public.rep(id) on delete cascade,
  "insightType" public.insight_type not null,
  "generatedInsight" text not null,
  severity public.insight_severity not null default 'MEDIUM',
  "isRead" boolean not null default false,
  "createdAt" timestamptz not null default now()
);

create table public.bidder_assignment (
  id uuid primary key default gen_random_uuid(),
  "bidderId" uuid not null references public.profiles(id) on delete cascade,
  "profileId" uuid not null references public.upwork_profile(id) on delete cascade,
  "assignedBy" uuid references public.profiles(id) on delete set null,
  "isActive" boolean not null default true,
  "assignedAt" timestamptz not null default now(),
  unique ("bidderId", "profileId")
);

create table public.linkedin_agent (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null unique references public.profiles(id) on delete cascade,
  targets jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_agent_id_fkey foreign key ("agentId") references public.linkedin_agent(id) on delete set null;

create table public.linkedin_daily_log (
  id uuid primary key default gen_random_uuid(),
  "agentId" uuid not null references public.linkedin_agent(id) on delete cascade,
  date date not null,
  "leadsSearched" integer not null default 0,
  "leadsFiltered" integer not null default 0,
  "leadsAnalyzed" integer not null default 0,
  "inMailsSent" integer not null default 0,
  "connectionsSent" integer not null default 0,
  "jobsApplied" integer not null default 0,
  "repliesReceived" integer not null default 0,
  "followUpsSent" integer not null default 0,
  "emailsChecked" integer not null default 0,
  notes text,
  "createdAt" timestamptz not null default now(),
  unique ("agentId", date)
);

create table public.linkedin_lead (
  id uuid primary key default gen_random_uuid(),
  "agentId" uuid not null references public.linkedin_agent(id) on delete cascade,
  name text not null,
  company text,
  status public.linkedin_lead_status not null default 'SEARCHED',
  source text,
  "contactedAt" timestamptz,
  "repliedAt" timestamptz,
  "lastFollowUpAt" timestamptz,
  "convertedAt" timestamptz,
  message text,
  notes text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.freelancer_agent (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null unique references public.profiles(id) on delete cascade,
  targets jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_freelancer_agent_id_fkey foreign key ("freelancerAgentId") references public.freelancer_agent(id) on delete set null;

create table public.freelancer_daily_log (
  id uuid primary key default gen_random_uuid(),
  "agentId" uuid not null references public.freelancer_agent(id) on delete cascade,
  date date not null,
  "jobsFound" integer not null default 0,
  "jobsFiltered" integer not null default 0,
  "proposalsSent" integer not null default 0,
  "clientReplies" integer not null default 0,
  "followUpsSent" integer not null default 0,
  "interviewsBooked" integer not null default 0,
  "dealsClosed" integer not null default 0,
  notes text,
  "managerComment" text,
  "createdAt" timestamptz not null default now(),
  unique ("agentId", date)
);

create table public.freelancer_job (
  id uuid primary key default gen_random_uuid(),
  "agentId" uuid not null references public.freelancer_agent(id) on delete cascade,
  "jobTitle" text,
  "clientName" text,
  "jobUrl" text,
  "proposalText" text,
  status public.freelancer_job_status not null default 'FOUND',
  notes text,
  "appliedAt" timestamptz,
  "viewedAt" timestamptz,
  "repliedAt" timestamptz,
  "interviewAt" timestamptz,
  "hiredAt" timestamptz,
  "lostAt" timestamptz,
  "lastFollowUpAt" timestamptz,
  "followUpCount" integer not null default 0,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.freelancer_lead (
  id uuid primary key default gen_random_uuid(),
  "agentId" uuid not null references public.freelancer_agent(id) on delete cascade,
  "clientName" text not null,
  "jobDescription" text,
  proposal text,
  "contactMobile" text,
  "contactEmail" text,
  status public.freelancer_lead_status not null default 'NEW',
  notes text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table public.freelancer_applied_job (
  id uuid primary key default gen_random_uuid(),
  "agentId" uuid not null references public.freelancer_agent(id) on delete cascade,
  url text not null,
  title text,
  "appliedAt" timestamptz not null default now()
);

create table public.job_notification (
  id uuid primary key default gen_random_uuid(),
  "jobUrl" text not null,
  "jobTitle" text,
  "repName" text,
  "sourceCompanyId" text,
  "targetCompanyId" text not null,
  "targetUserId" uuid references public.profiles(id) on delete cascade,
  "isRead" boolean not null default false,
  "createdAt" timestamptz not null default now()
);

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('ADMIN', 'MANAGER'), false)
$$;

create or replace function public.is_own_rep(rep_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rep
    where rep.id = rep_id and rep."userId" = auth.uid()
  )
$$;

create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_upwork_profile_updated_at before update on public.upwork_profile for each row execute function public.set_updated_at();
create trigger set_rep_updated_at before update on public.rep for each row execute function public.set_updated_at();
create trigger set_job_updated_at before update on public.job for each row execute function public.set_updated_at();
create trigger set_proposal_updated_at before update on public.proposal for each row execute function public.set_updated_at();
create trigger set_benchmark_updated_at before update on public.benchmark for each row execute function public.set_updated_at();
create trigger set_linkedin_agent_updated_at before update on public.linkedin_agent for each row execute function public.set_updated_at();
create trigger set_linkedin_lead_updated_at before update on public.linkedin_lead for each row execute function public.set_updated_at();
create trigger set_freelancer_agent_updated_at before update on public.freelancer_agent for each row execute function public.set_updated_at();
create trigger set_freelancer_job_updated_at before update on public.freelancer_job for each row execute function public.set_updated_at();
create trigger set_freelancer_lead_updated_at before update on public.freelancer_lead for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.upwork_profile enable row level security;
alter table public.rep enable row level security;
alter table public.job enable row level security;
alter table public.proposal enable row level security;
alter table public.proposal_review enable row level security;
alter table public.proposal_status_history enable row level security;
alter table public.lead enable row level security;
alter table public.activity_log enable row level security;
alter table public.benchmark enable row level security;
alter table public.coaching_insight enable row level security;
alter table public.bidder_assignment enable row level security;
alter table public.linkedin_agent enable row level security;
alter table public.linkedin_daily_log enable row level security;
alter table public.linkedin_lead enable row level security;
alter table public.freelancer_agent enable row level security;
alter table public.freelancer_daily_log enable row level security;
alter table public.freelancer_job enable row level security;
alter table public.freelancer_lead enable row level security;
alter table public.freelancer_applied_job enable row level security;
alter table public.job_notification enable row level security;

create policy "Profiles can read self or managers read all" on public.profiles
for select using (id = auth.uid() or public.is_manager());

create policy "Profiles can update self or managers update all" on public.profiles
for update using (id = auth.uid() or public.is_manager()) with check (id = auth.uid() or public.is_manager());

create policy "Managers manage shared lookup tables" on public.upwork_profile
for all using (public.is_manager()) with check (public.is_manager());

create policy "Authenticated users read upwork profiles" on public.upwork_profile
for select using (auth.role() = 'authenticated');

create policy "Managers manage reps" on public.rep
for all using (public.is_manager()) with check (public.is_manager());

create policy "Reps read own rep row" on public.rep
for select using ("userId" = auth.uid() or public.is_manager());

create policy "Authenticated users read jobs" on public.job
for select using (auth.role() = 'authenticated');

create policy "Managers create and update jobs" on public.job
for all using (public.is_manager()) with check (public.is_manager());

create policy "Managers or owning reps read proposals" on public.proposal
for select using (public.is_manager() or public.is_own_rep("repId"));

create policy "Managers or owning reps manage proposals" on public.proposal
for all using (public.is_manager() or public.is_own_rep("repId")) with check (public.is_manager() or public.is_own_rep("repId"));

create policy "Managers or owning reps read proposal reviews" on public.proposal_review
for select using (
  public.is_manager() or exists (
    select 1 from public.proposal p
    where p.id = "proposalId" and public.is_own_rep(p."repId")
  )
);

create policy "Managers or owning reps manage proposal reviews" on public.proposal_review
for all using (
  public.is_manager() or exists (
    select 1 from public.proposal p
    where p.id = "proposalId" and public.is_own_rep(p."repId")
  )
) with check (
  public.is_manager() or exists (
    select 1 from public.proposal p
    where p.id = "proposalId" and public.is_own_rep(p."repId")
  )
);

create policy "Managers or owning reps read proposal status history" on public.proposal_status_history
for select using (
  public.is_manager() or exists (
    select 1 from public.proposal p
    where p.id = "proposalId" and public.is_own_rep(p."repId")
  )
);

create policy "Managers or owning reps manage leads" on public.lead
for all using (public.is_manager() or public.is_own_rep("repId")) with check (public.is_manager() or public.is_own_rep("repId"));

create policy "Managers or owning reps manage activity logs" on public.activity_log
for all using (public.is_manager() or public.is_own_rep("repId")) with check (public.is_manager() or public.is_own_rep("repId"));

create policy "Authenticated users read benchmarks" on public.benchmark
for select using (auth.role() = 'authenticated');

create policy "Managers manage benchmarks" on public.benchmark
for all using (public.is_manager()) with check (public.is_manager());

create policy "Managers or owning reps manage coaching insights" on public.coaching_insight
for all using (public.is_manager() or public.is_own_rep("repId")) with check (public.is_manager() or public.is_own_rep("repId"));

create policy "Managers manage bidder assignments" on public.bidder_assignment
for all using (public.is_manager()) with check (public.is_manager());

create policy "Users read own bidder assignments" on public.bidder_assignment
for select using ("bidderId" = auth.uid() or public.is_manager());

create policy "Managers or owning linkedin agents manage linkedin data" on public.linkedin_agent
for all using (public.is_manager() or "userId" = auth.uid()) with check (public.is_manager() or "userId" = auth.uid());

create policy "Linkedin logs visible to owner or managers" on public.linkedin_daily_log
for all using (
  public.is_manager() or exists (select 1 from public.linkedin_agent a where a.id = "agentId" and a."userId" = auth.uid())
) with check (
  public.is_manager() or exists (select 1 from public.linkedin_agent a where a.id = "agentId" and a."userId" = auth.uid())
);

create policy "Linkedin leads visible to owner or managers" on public.linkedin_lead
for all using (
  public.is_manager() or exists (select 1 from public.linkedin_agent a where a.id = "agentId" and a."userId" = auth.uid())
) with check (
  public.is_manager() or exists (select 1 from public.linkedin_agent a where a.id = "agentId" and a."userId" = auth.uid())
);

create policy "Managers or owning freelancer agents manage freelancer data" on public.freelancer_agent
for all using (public.is_manager() or "userId" = auth.uid()) with check (public.is_manager() or "userId" = auth.uid());

create policy "Freelancer logs visible to owner or managers" on public.freelancer_daily_log
for all using (
  public.is_manager() or exists (select 1 from public.freelancer_agent a where a.id = "agentId" and a."userId" = auth.uid())
) with check (
  public.is_manager() or exists (select 1 from public.freelancer_agent a where a.id = "agentId" and a."userId" = auth.uid())
);

create policy "Freelancer jobs visible to owner or managers" on public.freelancer_job
for all using (
  public.is_manager() or exists (select 1 from public.freelancer_agent a where a.id = "agentId" and a."userId" = auth.uid())
) with check (
  public.is_manager() or exists (select 1 from public.freelancer_agent a where a.id = "agentId" and a."userId" = auth.uid())
);

create policy "Freelancer leads visible to owner or managers" on public.freelancer_lead
for all using (
  public.is_manager() or exists (select 1 from public.freelancer_agent a where a.id = "agentId" and a."userId" = auth.uid())
) with check (
  public.is_manager() or exists (select 1 from public.freelancer_agent a where a.id = "agentId" and a."userId" = auth.uid())
);

create policy "Freelancer applied jobs visible to owner or managers" on public.freelancer_applied_job
for all using (
  public.is_manager() or exists (select 1 from public.freelancer_agent a where a.id = "agentId" and a."userId" = auth.uid())
) with check (
  public.is_manager() or exists (select 1 from public.freelancer_agent a where a.id = "agentId" and a."userId" = auth.uid())
);

create policy "Users read own notifications or managers read all" on public.job_notification
for select using ("targetUserId" = auth.uid() or public.is_manager());

create policy "Users update own notifications or managers update all" on public.job_notification
for update using ("targetUserId" = auth.uid() or public.is_manager()) with check ("targetUserId" = auth.uid() or public.is_manager());

create policy "Managers insert notifications" on public.job_notification
for insert with check (public.is_manager());

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on
  public.profiles,
  public.upwork_profile,
  public.rep,
  public.job,
  public.proposal,
  public.proposal_review,
  public.proposal_status_history,
  public.lead,
  public.activity_log,
  public.benchmark,
  public.coaching_insight,
  public.bidder_assignment,
  public.linkedin_agent,
  public.linkedin_daily_log,
  public.linkedin_lead,
  public.freelancer_agent,
  public.freelancer_daily_log,
  public.freelancer_job,
  public.freelancer_lead,
  public.freelancer_applied_job,
  public.job_notification
to authenticated;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_manager() to authenticated;
grant execute on function public.is_own_rep(uuid) to authenticated;
