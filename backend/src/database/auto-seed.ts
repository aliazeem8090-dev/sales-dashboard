import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { Rep } from '../reps/rep.entity';
import { UpworkProfile } from '../upwork-profiles/upwork-profile.entity';
import { Benchmark, ProfileType } from '../benchmarks/benchmark.entity';
import { BidderAssignment } from '../bidder-assignments/bidder-assignment.entity';

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
    entities: [User, Rep, UpworkProfile, Benchmark, BidderAssignment],
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

  console.log('[AutoSeed] Done!');
  await ds.destroy();
}
