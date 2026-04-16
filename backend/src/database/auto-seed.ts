import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { Rep } from '../reps/rep.entity';
import { UpworkProfile } from '../upwork-profiles/upwork-profile.entity';
import { Benchmark, ProfileType } from '../benchmarks/benchmark.entity';
import { BidderAssignment } from '../bidder-assignments/bidder-assignment.entity';
import { LinkedInAgent } from '../linkedin-agents/linkedin-agent.entity';
import { LinkedInDailyLog } from '../linkedin-daily-logs/linkedin-daily-log.entity';
import { LinkedInLead } from '../linkedin-leads/linkedin-lead.entity';
import { FreelancerAgent } from '../freelancer-agents/freelancer-agent.entity';
import { FreelancerDailyLog } from '../freelancer-daily-logs/freelancer-daily-log.entity';
import { FreelancerJob } from '../freelancer-jobs/freelancer-job.entity';

const CANONICAL_PROFILES = [
  { title: 'Shayan Abbasi', primarySkills: ['AI/ML', 'Python', 'TensorFlow', 'PyTorch', 'LLMs'],          niche: 'AI_ML'   },
  { title: 'Zainab',        primarySkills: ['MERN', 'React', 'Node.js', 'MongoDB', 'Express'],            niche: 'MERN'    },
  { title: 'Aleem',         primarySkills: ['PHP', 'Laravel', 'MySQL', 'REST API'],                       niche: 'Laravel' },
  { title: 'Nammrah',       primarySkills: ['AI/ML', 'Python', 'scikit-learn', 'LLMs', 'TensorFlow'],     niche: 'AI_ML'   },
  { title: 'Waqas',         primarySkills: ['PHP', 'Laravel', 'MERN', 'React', 'Node.js'],                niche: 'GENERAL' },
  { title: 'Abdullah',      primarySkills: ['MERN', 'React', 'Node.js', 'MongoDB', 'Express'],            niche: 'MERN'    },
];

/**
 * Sync profiles to the canonical list every startup.
 * - Creates any missing profile.
 * - Updates title/skills/niche for any profile that doesn't match.
 * - Removes extra profiles (clearing FK references first).
 */
async function syncProfiles(ds: DataSource): Promise<void> {
  const profileRepo    = ds.getRepository(UpworkProfile);
  const assignmentRepo = ds.getRepository(BidderAssignment);

  const existing = await profileRepo.find();
  const canonicalTitles = CANONICAL_PROFILES.map(p => p.title);

  // 1. Remove profiles that are not in the canonical list
  const toDelete = existing.filter(p => !canonicalTitles.includes(p.title));
  if (toDelete.length > 0) {
    const deleteIds = toDelete.map(p => p.id);
    // Clear assignments that reference these profiles
    await assignmentRepo
      .createQueryBuilder()
      .delete()
      .where('profileId IN (:...ids)', { ids: deleteIds })
      .execute();
    // Null out proposal profileUsedId (raw query — avoids importing Proposal entity here)
    await ds.query(
      `UPDATE proposal SET profileUsedId = NULL WHERE profileUsedId IN (${deleteIds.map(() => '?').join(',')})`,
      deleteIds,
    );
    await profileRepo.delete(deleteIds);
    console.log(`[AutoSeed] Removed ${toDelete.length} stale profile(s): ${toDelete.map(p => p.title).join(', ')}`);
  }

  // 2. Upsert canonical profiles
  for (const canon of CANONICAL_PROFILES) {
    const match = existing.find(p => p.title === canon.title);
    if (!match) {
      await profileRepo.save(profileRepo.create(canon));
      console.log(`[AutoSeed] Created profile: ${canon.title}`);
    } else if (
      JSON.stringify(match.primarySkills) !== JSON.stringify(canon.primarySkills) ||
      match.niche !== canon.niche
    ) {
      await profileRepo.update(match.id, { primarySkills: canon.primarySkills, niche: canon.niche });
      console.log(`[AutoSeed] Updated profile: ${canon.title}`);
    }
  }
}

export async function autoSeedIfEmpty(): Promise<void> {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sales_dashboard',
    entities: [User, Rep, UpworkProfile, Benchmark, BidderAssignment, LinkedInAgent, LinkedInDailyLog, LinkedInLead, FreelancerAgent, FreelancerDailyLog, FreelancerJob],
    synchronize: false,
  });

  await ds.initialize();

  // Always sync profiles to canonical list
  await syncProfiles(ds);

  const userRepo = ds.getRepository(User);
  const existingCount = await userRepo.count();

  if (existingCount > 0) {
    console.log(`[AutoSeed] ${existingCount} users already exist — skipping user/benchmark seed`);
    await ds.destroy();
    return;
  }

  console.log('[AutoSeed] No users found — seeding database...');

  const repRepo       = ds.getRepository(Rep);
  const benchmarkRepo = ds.getRepository(Benchmark);

  const scoringWeights   = { hook: 20, personalization: 15, painPoints: 15, technicalCredibility: 15, portfolio: 10, cta: 10, toneBrevity: 10, profileAlignment: 5 };
  const minimumStandards = { overallScore: 70, minimumCategoryScore: 6, profileAlignment: 3 };

  await Promise.all([
    benchmarkRepo.save(benchmarkRepo.create({ name: 'MERN Stack Benchmark',  profileType: ProfileType.MERN,      scoringWeights, minimumStandards, profileSpecificGuidance: 'Emphasize full-stack JavaScript expertise.' })),
    benchmarkRepo.save(benchmarkRepo.create({ name: 'Laravel Benchmark',     profileType: ProfileType.LARAVEL,   scoringWeights, minimumStandards, profileSpecificGuidance: 'Focus on PHP/Laravel backend expertise.' })),
    benchmarkRepo.save(benchmarkRepo.create({ name: 'AI/ML Benchmark',       profileType: ProfileType.AI_ML,     scoringWeights, minimumStandards, profileSpecificGuidance: 'Emphasize ML, Python, data science, model deployment.' })),
    benchmarkRepo.save(benchmarkRepo.create({ name: 'WordPress Benchmark',   profileType: ProfileType.WORDPRESS, scoringWeights, minimumStandards, profileSpecificGuidance: 'CMS expertise, plugin/theme development, WooCommerce.' })),
    benchmarkRepo.save(benchmarkRepo.create({ name: 'General Benchmark',     profileType: ProfileType.GENERAL,   scoringWeights, minimumStandards, profileSpecificGuidance: 'Apply balanced scoring across all criteria.' })),
  ]);

  const teamMembers = [
    { name: 'Manager',    email: 'manager@team.com',    password: 'manager098',    role: 'MANAGER', targets: {},                                             currentConnects: 0  },
    { name: 'Fatima',     email: 'fatima@team.com',     password: 'fatima098',     role: 'REP',     targets: { dailyProposals: 5, weeklyHires: 2 },           currentConnects: 60 },
    { name: 'Rao Waqar',  email: 'waqar@team.com',      password: 'waqar098',      role: 'REP',     targets: { dailyProposals: 5, weeklyHires: 2 },           currentConnects: 60 },
    { name: 'Abdullah',   email: 'abdullah@team.com',   password: 'abdullah098',   role: 'REP',     targets: { dailyProposals: 5, weeklyHires: 2 },           currentConnects: 60 },
    { name: 'Maryam',     email: 'maryam@team.com',     password: 'maryam098',     role: 'REP',     targets: { dailyProposals: 5, weeklyHires: 2 },           currentConnects: 60 },
    { name: 'Danish',     email: 'danish@team.com',     password: 'danish098',     role: 'REP',     targets: { dailyProposals: 5, weeklyHires: 2 },           currentConnects: 60 },
    { name: 'Mutawalkal', email: 'mutawalkal@team.com', password: 'mutawalkal098', role: 'REP',     targets: { dailyProposals: 5, weeklyHires: 2 },           currentConnects: 60 },
  ];

  for (const member of teamMembers) {
    const hashed = await bcrypt.hash(member.password, 10);
    const user = await userRepo.save(userRepo.create({
      name:     member.name,
      email:    member.email,
      password: hashed,
      role:     member.role as any,
    }));

    if (member.role === 'REP') {
      await repRepo.save(repRepo.create({
        userId:         user.id,
        targets:        member.targets,
        currentConnects: member.currentConnects,
        weeklyGoals:    { proposals: (member.targets.dailyProposals ?? 5) * 5, hires: member.targets.weeklyHires ?? 1 },
      }));
    }

    console.log(`[AutoSeed] Created: ${member.name} (${member.email})`);
  }

  // ── LinkedIn Agent demo user ────────────────────────────────────────────────
  const agentRepo   = ds.getRepository(LinkedInAgent);
  const logRepo     = ds.getRepository(LinkedInDailyLog);
  const leadRepo    = ds.getRepository(LinkedInLead);

  const agentHashedPw = await bcrypt.hash('agent098', 10);
  const agentUser = await userRepo.save(userRepo.create({
    name: 'Sara Ahmed', email: 'sara@team.com', password: agentHashedPw, role: 'LINKEDIN_AGENT' as any,
  }));
  const agent = await agentRepo.save(agentRepo.create({
    userId: agentUser.id,
    targets: { dailyConnectionTarget: 35, monthlyInMailLimit: 50, minReplyRate: 12, minConversionRate: 5, leadProcessingRate: 50 },
  }));
  console.log(`[AutoSeed] Created LinkedIn Agent: Sara Ahmed (sara@team.com)`);

  // Seed 14 days of daily logs
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const conns = 28 + Math.floor(Math.random() * 12);  // 28–39
    const inmails = i < 7 ? Math.floor(Math.random() * 3) : 0;
    const replies = Math.floor(conns * (0.08 + Math.random() * 0.07));
    await logRepo.save(logRepo.create({
      agentId: agent.id, date: dateStr as any,
      leadsSearched:   80 + Math.floor(Math.random() * 40),
      leadsFiltered:   30 + Math.floor(Math.random() * 20),
      leadsAnalyzed:   15 + Math.floor(Math.random() * 10),
      connectionsSent: conns,
      inMailsSent:     inmails,
      repliesReceived: replies,
      followUpsSent:   Math.floor(Math.random() * 5),
      jobsApplied:     Math.floor(Math.random() * 3),
      emailsChecked:   1 + Math.floor(Math.random() * 3),
      notes: i === 0 ? 'Strong day — 3 warm replies, 2 calls booked.' : (null as any),
    }));
  }
  console.log(`[AutoSeed] Seeded 14 days of activity logs for Sara Ahmed`);

  // Seed sample leads across different lifecycle stages
  const sampleLeads = [
    { name: 'James Carter',    company: 'TechNova Inc',     status: 'CONVERTED',   source: 'LinkedIn Search', message: 'Hi James, saw your post on AI adoption — would love to connect and share how we helped similar teams scale.', daysAgo: 12, replied: true, converted: true },
    { name: 'Priya Sharma',    company: 'DataFlow Ltd',     status: 'REPLIED',     source: 'Sales Navigator', message: 'Hi Priya, noticed DataFlow is expanding their ML team. Happy to share some resources that might help.', daysAgo: 7,  replied: true, converted: false },
    { name: 'Michael Torres',  company: 'ScaleOps',         status: 'FOLLOWED_UP', source: 'LinkedIn Search', message: 'Hey Michael, reached out last week about your DevOps challenges — wanted to follow up.', daysAgo: 5,  replied: false, converted: false },
    { name: 'Aisha Rahman',    company: 'FinanceAI',        status: 'CONTACTED',   source: 'Sales Navigator', message: 'Hi Aisha, your work on fintech automation caught my eye. Would love a quick chat this week.', daysAgo: 5,  replied: false, converted: false },
    { name: 'Lucas Fernandez', company: 'CloudSphere',      status: 'CONTACTED',   source: 'LinkedIn Search', message: "Hi Lucas, CloudSphere's recent funding round is impressive — congrats! Curious if you're scaling the team?", daysAgo: 6,  replied: false, converted: false },
    { name: 'Emma Wilson',     company: 'Nexus Solutions',  status: 'SEARCHED',    source: 'LinkedIn Search', message: null, daysAgo: 1, replied: false, converted: false },
    { name: 'Omar Hassan',     company: 'GreenTech',        status: 'SEARCHED',    source: 'Sales Navigator', message: null, daysAgo: 0, replied: false, converted: false },
    { name: 'Sarah Kim',       company: 'ByteWave',         status: 'REJECTED',    source: 'LinkedIn Search', message: "Hi Sarah, reaching out about ByteWave's latest engineering posts — keen to connect!", daysAgo: 10, replied: false, converted: false },
  ];

  for (const l of sampleLeads) {
    const contactedAt  = l.status !== 'SEARCHED' ? new Date(Date.now() - l.daysAgo * 86400000) : null;
    const repliedAt    = l.replied    ? new Date(Date.now() - (l.daysAgo - 2) * 86400000) : null;
    const convertedAt  = l.converted  ? new Date(Date.now() - (l.daysAgo - 4) * 86400000) : null;
    const lastFollowUpAt = l.status === 'FOLLOWED_UP' ? new Date(Date.now() - 1 * 86400000) : null;
    await leadRepo.save(leadRepo.create({
      agentId: agent.id,
      name: l.name, company: l.company, status: l.status as any,
      source: l.source, message: l.message ?? undefined,
      contactedAt: contactedAt ?? undefined, repliedAt: repliedAt ?? undefined,
      lastFollowUpAt: lastFollowUpAt ?? undefined, convertedAt: convertedAt ?? undefined,
    }));
  }
  console.log(`[AutoSeed] Seeded ${sampleLeads.length} sample leads for Sara Ahmed`);

  // ── Freelancer Agent demo user ───────────────────────────────────────────────
  const flAgentRepo = ds.getRepository(FreelancerAgent);
  const flLogRepo   = ds.getRepository(FreelancerDailyLog);
  const flJobRepo   = ds.getRepository(FreelancerJob);

  const flHashedPw  = await bcrypt.hash('hassan098', 10);
  const flUser      = await userRepo.save(userRepo.create({
    name: 'Hassan Ali', email: 'hassan@team.com', password: flHashedPw, role: 'FREELANCER_AGENT' as any,
  }));
  const flAgent = await flAgentRepo.save(flAgentRepo.create({
    userId: flUser.id,
    targets: { dailyProposalTarget: 5, minResponseRate: 20, minInterviewRate: 30, minHireRate: 25, followUpCompliance: 80 },
  }));
  console.log('[AutoSeed] Created Freelancer Agent: Hassan Ali (hassan@team.com)');

  // 14 days of daily logs
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds2  = d.toISOString().split('T')[0];
    const sent = 3 + Math.floor(Math.random() * 5);
    await flLogRepo.save(flLogRepo.create({
      agentId: flAgent.id, date: ds2 as any,
      jobsFound:       15 + Math.floor(Math.random() * 20),
      jobsFiltered:    8  + Math.floor(Math.random() * 10),
      proposalsSent:   sent,
      clientReplies:   Math.floor(sent * (0.15 + Math.random() * 0.15)),
      followUpsSent:   Math.floor(Math.random() * 4),
      interviewsBooked:i < 5 ? Math.floor(Math.random() * 2) : 0,
      dealsClosed:     i < 3 ? (Math.random() > 0.7 ? 1 : 0) : 0,
      notes: i === 0 ? 'Good day — 2 strong replies, following up tomorrow.' : (null as any),
    }));
  }
  console.log('[AutoSeed] Seeded 14 days of activity logs for Hassan Ali');

  // Sample jobs across all lifecycle stages
  const sampleJobs = [
    { jobTitle: 'Full Stack Developer for SaaS App',   clientName: 'TechCorp Ltd',    status: 'HIRED',     daysAgo: 10, proposalText: "Hi, I've built several SaaS apps with React/Node.js. Happy to share relevant examples.", appliedDaysAgo: 14 },
    { jobTitle: 'React Developer – Dashboard Project',  clientName: 'DataViz Inc',     status: 'INTERVIEW', daysAgo: 4,  proposalText: "Great project brief. I specialize in data visualization dashboards using React + Recharts.", appliedDaysAgo: 7 },
    { jobTitle: 'Laravel API Backend for Mobile App',   clientName: 'StartupXYZ',      status: 'REPLIED',   daysAgo: 2,  proposalText: "I've built REST APIs in Laravel for multiple mobile apps. Can deliver this in 2 weeks.", appliedDaysAgo: 5 },
    { jobTitle: 'WordPress Site for E-commerce Store',  clientName: 'ShopEasy',        status: 'VIEWED',    daysAgo: 5,  proposalText: "Experienced with WooCommerce + custom themes. Can have a demo ready in 3 days.", appliedDaysAgo: 5 },
    { jobTitle: 'Python Script for Data Scraping',      clientName: 'Analytics Co',    status: 'APPLIED',   daysAgo: 5,  proposalText: "Python/Scrapy expert. Can build the scraper with proper rate limiting and error handling.", appliedDaysAgo: 5 },
    { jobTitle: 'Node.js Microservices Architecture',   clientName: 'CloudSys',        status: 'APPLIED',   daysAgo: 6,  proposalText: "Have designed microservices with Docker/K8s. Let me share the architecture I'd propose.", appliedDaysAgo: 6 },
    { jobTitle: 'Mobile App UI/UX Redesign',            clientName: 'AppWorks',        status: 'FOUND',     daysAgo: 0,  proposalText: null,                                                                                     appliedDaysAgo: 0 },
    { jobTitle: 'AI Chatbot Integration',               clientName: 'RetailBot',       status: 'FOUND',     daysAgo: 0,  proposalText: null,                                                                                     appliedDaysAgo: 0 },
    { jobTitle: 'PostgreSQL Database Optimization',     clientName: 'FinTech Pro',     status: 'LOST',      daysAgo: 8,  proposalText: "DBA with 5 years PostgreSQL. Can audit and optimize query performance significantly.", appliedDaysAgo: 12 },
    { jobTitle: 'Vue.js Frontend for Admin Panel',      clientName: 'AdminFlow',       status: 'LOST',      daysAgo: 6,  proposalText: "Built admin panels in Vue 3 + Composition API. Portfolio link attached.", appliedDaysAgo: 9 },
  ];

  for (const j of sampleJobs) {
    const appliedAt   = j.appliedDaysAgo > 0 ? new Date(Date.now() - j.appliedDaysAgo * 86400000) : undefined;
    const viewedAt    = ['VIEWED','REPLIED','INTERVIEW','HIRED','LOST'].includes(j.status) ? new Date(Date.now() - (j.appliedDaysAgo - 1) * 86400000) : undefined;
    const repliedAt   = ['REPLIED','INTERVIEW','HIRED'].includes(j.status) ? new Date(Date.now() - j.daysAgo * 86400000) : undefined;
    const interviewAt = ['INTERVIEW','HIRED'].includes(j.status) ? new Date(Date.now() - (j.daysAgo - 1) * 86400000) : undefined;
    const hiredAt     = j.status === 'HIRED' ? new Date(Date.now() - (j.daysAgo - 2) * 86400000) : undefined;
    const lostAt      = j.status === 'LOST'  ? new Date(Date.now() - j.daysAgo * 86400000) : undefined;
    const lastFollowUpAt = ['APPLIED','VIEWED'].includes(j.status) && j.appliedDaysAgo >= 3
      ? new Date(Date.now() - 2 * 86400000) : undefined;

    await flJobRepo.save(flJobRepo.create({
      agentId: flAgent.id,
      jobTitle: j.jobTitle, clientName: j.clientName,
      status: j.status as any, proposalText: j.proposalText ?? undefined,
      appliedAt, viewedAt, repliedAt, interviewAt, hiredAt, lostAt, lastFollowUpAt,
      followUpCount: lastFollowUpAt ? 1 : 0,
    }));
  }
  console.log(`[AutoSeed] Seeded ${sampleJobs.length} sample jobs for Hassan Ali`);
  // ────────────────────────────────────────────────────────────────────────────

  console.log('[AutoSeed] Done!');
  await ds.destroy();
}
