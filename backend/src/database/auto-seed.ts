import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { Rep } from '../reps/rep.entity';
import { UpworkProfile } from '../upwork-profiles/upwork-profile.entity';
import { Benchmark, ProfileType } from '../benchmarks/benchmark.entity';

export async function autoSeedIfEmpty(): Promise<void> {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sales_dashboard',
    entities: [User, Rep, UpworkProfile, Benchmark],
    synchronize: false,
  });

  await ds.initialize();

  const userRepo = ds.getRepository(User);
  const existingCount = await userRepo.count();

  if (existingCount > 0) {
    console.log(`[AutoSeed] ${existingCount} users already exist — skipping seed`);
    await ds.destroy();
    return;
  }

  console.log('[AutoSeed] No users found — seeding database...');

  const repRepo = ds.getRepository(Rep);
  const profileRepo = ds.getRepository(UpworkProfile);
  const benchmarkRepo = ds.getRepository(Benchmark);

  // Upwork profiles — named accounts
  await Promise.all([
    profileRepo.save(profileRepo.create({ title: 'Shayan Abbasi', primarySkills: ['AI/ML', 'Python', 'TensorFlow', 'PyTorch', 'LLMs'], niche: 'AI_ML' })),
    profileRepo.save(profileRepo.create({ title: 'Zainab',        primarySkills: ['MERN', 'React', 'Node.js', 'MongoDB', 'Express'], niche: 'MERN' })),
    profileRepo.save(profileRepo.create({ title: 'Aleem',         primarySkills: ['PHP', 'Laravel', 'MySQL', 'REST API'], niche: 'Laravel' })),
    profileRepo.save(profileRepo.create({ title: 'Nammrah',       primarySkills: ['AI/ML', 'Python', 'scikit-learn', 'LLMs', 'TensorFlow'], niche: 'AI_ML' })),
    profileRepo.save(profileRepo.create({ title: 'Waqas',         primarySkills: ['PHP', 'Laravel', 'MERN', 'React', 'Node.js'], niche: 'GENERAL' })),
    profileRepo.save(profileRepo.create({ title: 'Abdullah',      primarySkills: ['MERN', 'React', 'Node.js', 'MongoDB', 'Express'], niche: 'MERN' })),
  ]);

  const scoringWeights = { hook: 20, personalization: 15, painPoints: 15, technicalCredibility: 15, portfolio: 10, cta: 10, toneBrevity: 10, profileAlignment: 5 };
  const minimumStandards = { overallScore: 70, minimumCategoryScore: 6, profileAlignment: 3 };

  await Promise.all([
    benchmarkRepo.save(benchmarkRepo.create({ name: 'MERN Stack Benchmark', profileType: ProfileType.MERN, scoringWeights, minimumStandards, profileSpecificGuidance: 'Emphasize full-stack JavaScript expertise.' })),
    benchmarkRepo.save(benchmarkRepo.create({ name: 'Laravel Benchmark', profileType: ProfileType.LARAVEL, scoringWeights, minimumStandards, profileSpecificGuidance: 'Focus on PHP/Laravel backend expertise.' })),
    benchmarkRepo.save(benchmarkRepo.create({ name: 'AI/ML Benchmark', profileType: ProfileType.AI_ML, scoringWeights, minimumStandards, profileSpecificGuidance: 'Emphasize ML, Python, data science, model deployment.' })),
    benchmarkRepo.save(benchmarkRepo.create({ name: 'WordPress Benchmark', profileType: ProfileType.WORDPRESS, scoringWeights, minimumStandards, profileSpecificGuidance: 'CMS expertise, plugin/theme development, WooCommerce.' })),
    benchmarkRepo.save(benchmarkRepo.create({ name: 'General Benchmark', profileType: ProfileType.GENERAL, scoringWeights, minimumStandards, profileSpecificGuidance: 'Apply balanced scoring across all criteria.' })),
  ]);

  const teamMembers = [
    { name: 'Manager', email: 'manager@team.com', password: 'manager098', role: 'MANAGER', targets: {}, currentConnects: 0 },
    { name: 'Fatima', email: 'fatima@team.com', password: 'fatima098', role: 'REP', targets: { dailyProposals: 5, weeklyHires: 2 }, currentConnects: 60 },
    { name: 'Rao Waqar', email: 'waqar@team.com', password: 'waqar098', role: 'REP', targets: { dailyProposals: 5, weeklyHires: 2 }, currentConnects: 60 },
    { name: 'Abdullah', email: 'abdullah@team.com', password: 'abdullah098', role: 'REP', targets: { dailyProposals: 5, weeklyHires: 2 }, currentConnects: 60 },
    { name: 'Maryam', email: 'maryam@team.com', password: 'maryam098', role: 'REP', targets: { dailyProposals: 5, weeklyHires: 2 }, currentConnects: 60 },
    { name: 'Danish', email: 'danish@team.com', password: 'danish098', role: 'REP', targets: { dailyProposals: 5, weeklyHires: 2 }, currentConnects: 60 },
    { name: 'Mutawalkal', email: 'mutawalkal@team.com', password: 'mutawalkal098', role: 'REP', targets: { dailyProposals: 5, weeklyHires: 2 }, currentConnects: 60 },
  ];

  for (const member of teamMembers) {
    const hashed = await bcrypt.hash(member.password, 10);
    const user = await userRepo.save(userRepo.create({
      name: member.name,
      email: member.email,
      password: hashed,
      role: member.role as any,
    }));

    if (member.role === 'REP') {
      await repRepo.save(repRepo.create({
        userId: user.id,
        targets: member.targets,
        currentConnects: member.currentConnects,
        weeklyGoals: { proposals: (member.targets.dailyProposals ?? 5) * 5, hires: member.targets.weeklyHires ?? 1 },
      }));
    }

    console.log(`[AutoSeed] Created: ${member.name} (${member.email})`);
  }

  console.log('[AutoSeed] Done!');
  await ds.destroy();
}
