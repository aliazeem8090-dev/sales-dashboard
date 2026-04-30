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
import { FreelancerLead, LeadStatus } from '../freelancer-leads/freelancer-lead.entity';
import { FreelancerAppliedJob } from '../freelancer-applied-jobs/freelancer-applied-job.entity';

const COMPANY_1 = 'company-1';
const COMPANY_2 = 'company-2';

const CANONICAL_PROFILES = [
  { title: 'Shayan Abbasi', primarySkills: ['AI/ML', 'Python', 'TensorFlow', 'PyTorch', 'LLMs'],          niche: 'AI_ML'   },
  { title: 'Zainab',        primarySkills: ['MERN', 'React', 'Node.js', 'MongoDB', 'Express'],            niche: 'MERN'    },
  { title: 'Aleem',         primarySkills: ['PHP', 'Laravel', 'MySQL', 'REST API'],                       niche: 'Laravel' },
  { title: 'Nammrah',       primarySkills: ['AI/ML', 'Python', 'scikit-learn', 'LLMs', 'TensorFlow'],     niche: 'AI_ML'   },
  { title: 'Waqas',         primarySkills: ['PHP', 'Laravel', 'MERN', 'React', 'Node.js'],                niche: 'GENERAL' },
  { title: 'Abdullah',      primarySkills: ['MERN', 'React', 'Node.js', 'MongoDB', 'Express'],            niche: 'MERN'    },
];

async function syncProfiles(ds: DataSource): Promise<void> {
  const profileRepo    = ds.getRepository(UpworkProfile);
  const assignmentRepo = ds.getRepository(BidderAssignment);

  const existing = await profileRepo.find();
  const canonicalTitles = CANONICAL_PROFILES.map(p => p.title);

  const toDelete = existing.filter(p => !canonicalTitles.includes(p.title));
  if (toDelete.length > 0) {
    const deleteIds = toDelete.map(p => p.id);
    await assignmentRepo
      .createQueryBuilder()
      .delete()
      .where('profileId IN (:...ids)', { ids: deleteIds })
      .execute();
    await ds.query(
      `UPDATE proposal SET profileUsedId = NULL WHERE profileUsedId IN (${deleteIds.map(() => '?').join(',')})`,
      deleteIds,
    );
    await profileRepo.delete(deleteIds);
    console.log(`[AutoSeed] Removed ${toDelete.length} stale profile(s): ${toDelete.map(p => p.title).join(', ')}`);
  }

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

async function seedCompany2(ds: DataSource): Promise<void> {
  const userRepo = ds.getRepository(User);
  const repRepo  = ds.getRepository(Rep);

  const already = await userRepo.findOne({ where: { email: 'Manager@gsd.com' } });
  if (already) {
    console.log('[AutoSeed] Company 2 (GSD) users already exist — skipping');
    return;
  }

  const company2Members = [
    { name: 'Manager',      email: 'Manager@gsd.com',      password: 'managergsd098', role: 'MANAGER' },
    { name: 'Hadia Hassan', email: 'hadiahassan@gsd.com',   password: 'hadiagsd098',   role: 'REP'     },
    { name: 'Husain',       email: 'Husain@gsd.com',        password: 'husaingsd098',  role: 'REP'     },
  ];

  for (const member of company2Members) {
    const hashed = await bcrypt.hash(member.password, 10);
    const user = await userRepo.save(userRepo.create({
      name:      member.name,
      email:     member.email,
      password:  hashed,
      role:      member.role as any,
      companyId: COMPANY_2,
    }));
    if (member.role === 'REP') {
      await repRepo.save(repRepo.create({
        userId:          user.id,
        targets:         { dailyProposals: 5, weeklyHires: 2 },
        currentConnects: 60,
        weeklyGoals:     { proposals: 25, hires: 2 },
      }));
    }
    console.log(`[AutoSeed] Created Company 2 (GSD): ${member.name} (${member.email})`);
  }
}

export async function autoSeedIfEmpty(): Promise<void> {
  const ds = new DataSource({
    type: 'mysql',
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'sales_dashboard',
    entities: [User, Rep, UpworkProfile, Benchmark, BidderAssignment, LinkedInAgent, LinkedInDailyLog, LinkedInLead, FreelancerAgent, FreelancerLead, FreelancerAppliedJob],
    synchronize: false,
  });

  await ds.initialize();

  // Always sync profiles to canonical list
  await syncProfiles(ds);

  const userRepo = ds.getRepository(User);

  // Migration: assign any users without a companyId to Company 1
  const migrated = await ds.createQueryBuilder()
    .update(User)
    .set({ companyId: COMPANY_1 })
    .where('companyId IS NULL')
    .execute();
  if (migrated.affected && migrated.affected > 0) {
    console.log(`[AutoSeed] Migrated ${migrated.affected} user(s) to ${COMPANY_1}`);
  }

  const existingCount = await userRepo.count();

  if (existingCount > 0) {
    console.log(`[AutoSeed] ${existingCount} users already exist — skipping Company 1 seed`);
    await seedCompany2(ds);
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
    { name: 'Manager',    email: 'manager@team.com',    password: 'manager098',    role: 'MANAGER', targets: {},                                   currentConnects: 0  },
    { name: 'Fatima',     email: 'fatima@team.com',     password: 'fatima098',     role: 'REP',     targets: { dailyProposals: 5, weeklyHires: 2 }, currentConnects: 60 },
    { name: 'Rao Waqar',  email: 'waqar@team.com',      password: 'waqar098',      role: 'REP',     targets: { dailyProposals: 5, weeklyHires: 2 }, currentConnects: 60 },
    { name: 'Abdullah',   email: 'abdullah@team.com',   password: 'abdullah098',   role: 'REP',     targets: { dailyProposals: 5, weeklyHires: 2 }, currentConnects: 60 },
    { name: 'Maryam',     email: 'maryam@team.com',     password: 'maryam098',     role: 'REP',     targets: { dailyProposals: 5, weeklyHires: 2 }, currentConnects: 60 },
    { name: 'Danish',     email: 'danish@team.com',     password: 'danish098',     role: 'REP',     targets: { dailyProposals: 5, weeklyHires: 2 }, currentConnects: 60 },
    { name: 'Mutawalkal', email: 'mutawalkal@team.com', password: 'mutawalkal098', role: 'REP',     targets: { dailyProposals: 5, weeklyHires: 2 }, currentConnects: 60 },
  ];

  for (const member of teamMembers) {
    const hashed = await bcrypt.hash(member.password, 10);
    const user = await userRepo.save(userRepo.create({
      name:      member.name,
      email:     member.email,
      password:  hashed,
      role:      member.role as any,
      companyId: COMPANY_1,
    }));

    if (member.role === 'REP') {
      await repRepo.save(repRepo.create({
        userId:          user.id,
        targets:         member.targets,
        currentConnects: member.currentConnects,
        weeklyGoals:     { proposals: (member.targets.dailyProposals ?? 5) * 5, hires: member.targets.weeklyHires ?? 1 },
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
    name: 'Sara Ahmed', email: 'sara@team.com', password: agentHashedPw,
    role: 'LINKEDIN_AGENT' as any, companyId: COMPANY_1,
  }));
  const agent = await agentRepo.save(agentRepo.create({
    userId: agentUser.id,
    targets: { dailyConnectionTarget: 35, monthlyInMailLimit: 50, minReplyRate: 12, minConversionRate: 5, leadProcessingRate: 50 },
  }));
  console.log(`[AutoSeed] Created LinkedIn Agent: Sara Ahmed (sara@team.com)`);

  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const conns   = 28 + Math.floor(Math.random() * 12);
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

  const sampleLeads = [
    { name: 'James Carter',    company: 'TechNova Inc',     status: 'CONVERTED',   source: 'LinkedIn Search', message: 'Hi James, saw your post on AI adoption — would love to connect and share how we helped similar teams scale.', daysAgo: 12, replied: true,  converted: true  },
    { name: 'Priya Sharma',    company: 'DataFlow Ltd',     status: 'REPLIED',     source: 'Sales Navigator', message: 'Hi Priya, noticed DataFlow is expanding their ML team. Happy to share some resources that might help.', daysAgo: 7,  replied: true,  converted: false },
    { name: 'Michael Torres',  company: 'ScaleOps',         status: 'FOLLOWED_UP', source: 'LinkedIn Search', message: 'Hey Michael, reached out last week about your DevOps challenges — wanted to follow up.', daysAgo: 5,  replied: false, converted: false },
    { name: 'Aisha Rahman',    company: 'FinanceAI',        status: 'CONTACTED',   source: 'Sales Navigator', message: 'Hi Aisha, your work on fintech automation caught my eye. Would love a quick chat this week.', daysAgo: 5,  replied: false, converted: false },
    { name: 'Lucas Fernandez', company: 'CloudSphere',      status: 'CONTACTED',   source: 'LinkedIn Search', message: "Hi Lucas, CloudSphere's recent funding round is impressive — congrats! Curious if you're scaling the team?", daysAgo: 6,  replied: false, converted: false },
    { name: 'Emma Wilson',     company: 'Nexus Solutions',  status: 'SEARCHED',    source: 'LinkedIn Search', message: null, daysAgo: 1, replied: false, converted: false },
    { name: 'Omar Hassan',     company: 'GreenTech',        status: 'SEARCHED',    source: 'Sales Navigator', message: null, daysAgo: 0, replied: false, converted: false },
    { name: 'Sarah Kim',       company: 'ByteWave',         status: 'REJECTED',    source: 'LinkedIn Search', message: "Hi Sarah, reaching out about ByteWave's latest engineering posts — keen to connect!", daysAgo: 10, replied: false, converted: false },
  ];

  for (const l of sampleLeads) {
    const contactedAt    = l.status !== 'SEARCHED' ? new Date(Date.now() - l.daysAgo * 86400000) : null;
    const repliedAt      = l.replied    ? new Date(Date.now() - (l.daysAgo - 2) * 86400000) : null;
    const convertedAt    = l.converted  ? new Date(Date.now() - (l.daysAgo - 4) * 86400000) : null;
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
  const flAgentRepo   = ds.getRepository(FreelancerAgent);
  const flLeadRepo    = ds.getRepository(FreelancerLead);
  const flAppliedRepo = ds.getRepository(FreelancerAppliedJob);

  const flHashedPw = await bcrypt.hash('hassan098', 10);
  const flUser     = await userRepo.save(userRepo.create({
    name: 'Hassan Ali', email: 'hassan@team.com', password: flHashedPw,
    role: 'FREELANCER_AGENT' as any, companyId: COMPANY_1,
  }));
  const flAgent = await flAgentRepo.save(flAgentRepo.create({ userId: flUser.id }));
  console.log('[AutoSeed] Created Freelancer Agent: Hassan Ali (hassan@team.com)');

  const sampleLeads2 = [
    { clientName: 'Ahmed Raza',      jobDescription: 'Need a full-stack developer for a SaaS CRM project', proposal: 'Hi Ahmed, I have 4+ years building SaaS apps with React/Node.js. Here is a similar project I delivered last month.', contactEmail: 'ahmed.raza@email.com', contactMobile: null, status: LeadStatus.HIRED, notes: 'Project kicked off — milestone 1 delivered' },
    { clientName: 'Sarah Mitchell',  jobDescription: 'Looking for React developer for e-commerce dashboard', proposal: 'Hi Sarah, specialising in React dashboards. I built a very similar project for a retail client — happy to share.', contactEmail: 'sarah.m@company.com', contactMobile: '+1 555 0192', status: LeadStatus.INTERVIEW, notes: 'Call scheduled for Friday 3pm' },
    { clientName: 'James Okafor',    jobDescription: 'Laravel REST API for mobile application', proposal: 'Hi James, I have delivered 12+ Laravel APIs for mobile apps. Can start immediately after a brief call.', contactEmail: null, contactMobile: '+44 7700 900123', status: LeadStatus.REPLIED, notes: 'Client asked for portfolio — sent 3 examples' },
    { clientName: 'Fatima Al-Zahra', jobDescription: 'WordPress e-commerce store with WooCommerce', proposal: 'Hi Fatima, WooCommerce expert here. I can build your store with all payment gateways integrated in 10 days.', contactEmail: 'fatima@store.ae', contactMobile: null, status: LeadStatus.PROPOSAL_SENT, notes: '' },
    { clientName: 'David Chen',      jobDescription: 'Python data scraping script for Amazon listings', proposal: 'Hi David, built many Scrapy/Python scrapers with anti-detection. Can have a working demo in 48 hours.', contactEmail: 'david@analytics.co', contactMobile: null, status: LeadStatus.PROPOSAL_SENT, notes: '' },
    { clientName: 'Priya Nair',      jobDescription: 'Node.js microservices refactor for fintech app', proposal: null, contactEmail: 'priya.nair@fintech.in', contactMobile: '+91 98765 43210', status: LeadStatus.NEW, notes: 'Found via freelancer search — strong budget client' },
    { clientName: 'Lucas Müller',    jobDescription: 'AI chatbot integration for customer support', proposal: null, contactEmail: null, contactMobile: '+49 151 12345678', status: LeadStatus.NEW, notes: '' },
    { clientName: 'Nina Petrov',     jobDescription: 'Vue.js admin panel for logistics platform', proposal: 'Hi Nina, built Vue 3 admin panels for 3 logistics companies. Would love to show you one live.', contactEmail: 'nina@logistix.eu', contactMobile: null, status: LeadStatus.LOST, notes: 'Client went with a cheaper option' },
  ];

  for (const l of sampleLeads2) {
    await flLeadRepo.save(flLeadRepo.create({
      agentId:        flAgent.id,
      clientName:     l.clientName,
      jobDescription: l.jobDescription,
      proposal:       l.proposal ?? undefined,
      contactEmail:   l.contactEmail ?? undefined,
      contactMobile:  l.contactMobile ?? undefined,
      status:         l.status,
      notes:          l.notes || undefined,
    }));
  }
  console.log(`[AutoSeed] Seeded ${sampleLeads2.length} sample leads for Hassan Ali`);

  const sampleApplied = [
    { url: 'https://www.freelancer.com/projects/php/build-rest-api-laravel', title: 'Build REST API – Laravel' },
    { url: 'https://www.freelancer.com/projects/javascript/react-dashboard-analytics', title: 'React Dashboard – Analytics' },
    { url: 'https://www.freelancer.com/projects/python/web-scraping-amazon', title: 'Web Scraping – Amazon' },
    { url: 'https://www.freelancer.com/projects/wordpress/ecommerce-store-woocommerce', title: 'WooCommerce Store' },
    { url: 'https://www.freelancer.com/projects/nodejs/microservices-docker-k8s', title: 'Microservices – Docker/K8s' },
  ];

  for (const a of sampleApplied) {
    await flAppliedRepo.save(flAppliedRepo.create({ agentId: flAgent.id, url: a.url, title: a.title }));
  }
  console.log(`[AutoSeed] Seeded ${sampleApplied.length} applied job URLs for Hassan Ali`);

  // Seed Company 2 users
  await seedCompany2(ds);

  console.log('[AutoSeed] Done!');
  await ds.destroy();
}
