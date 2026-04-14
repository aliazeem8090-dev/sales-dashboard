import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { Rep } from '../reps/rep.entity';
import { UpworkProfile } from '../upwork-profiles/upwork-profile.entity';
import { Benchmark, ProfileType } from '../benchmarks/benchmark.entity';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sales_dashboard',
  entities: [User, Rep, UpworkProfile, Benchmark],
  synchronize: false,
});

async function seed() {
  await AppDataSource.initialize();
  console.log('Connected to database');

  const userRepo = AppDataSource.getRepository(User);
  const repRepo = AppDataSource.getRepository(Rep);
  const profileRepo = AppDataSource.getRepository(UpworkProfile);
  const benchmarkRepo = AppDataSource.getRepository(Benchmark);

  // Upwork profiles
  const profiles = await Promise.all([
    profileRepo.save(profileRepo.create({ title: 'MERN Stack Developer', primarySkills: ['React', 'Node.js', 'MongoDB', 'Express'], niche: 'MERN' })),
    profileRepo.save(profileRepo.create({ title: 'Laravel / PHP Developer', primarySkills: ['Laravel', 'PHP', 'MySQL', 'REST API'], niche: 'Laravel' })),
    profileRepo.save(profileRepo.create({ title: 'AI/ML Python Engineer', primarySkills: ['Python', 'TensorFlow', 'PyTorch', 'scikit-learn', 'LLMs'], niche: 'AI_ML' })),
    profileRepo.save(profileRepo.create({ title: 'WordPress Developer', primarySkills: ['WordPress', 'WooCommerce', 'PHP', 'Elementor'], niche: 'WordPress' })),
  ]);

  const [mernProfile, laravelProfile, aimlProfile, wpProfile] = profiles;
  console.log('Created Upwork profiles');

  // Benchmarks with scoring rubric from docs
  const scoringWeights = { hook: 20, personalization: 15, painPoints: 15, technicalCredibility: 15, portfolio: 10, cta: 10, toneBrevity: 10, profileAlignment: 5 };
  const minimumStandards = { overallScore: 70, minimumCategoryScore: 6, profileAlignment: 3 };

  await Promise.all([
    benchmarkRepo.save(benchmarkRepo.create({
      name: 'MERN Stack Benchmark',
      profileType: ProfileType.MERN,
      scoringWeights,
      minimumStandards,
      profileSpecificGuidance: 'Emphasize full-stack JavaScript expertise. Include React/Node.js/MongoDB examples. Frontend-backend integration proof is essential. Penalize if no JS-specific portfolio examples.',
    })),
    benchmarkRepo.save(benchmarkRepo.create({
      name: 'Laravel Benchmark',
      profileType: ProfileType.LARAVEL,
      scoringWeights,
      minimumStandards,
      profileSpecificGuidance: 'Focus on PHP/Laravel backend expertise. API development, database optimization, Eloquent ORM. Penalize generic PHP mentions without Laravel specifics.',
    })),
    benchmarkRepo.save(benchmarkRepo.create({
      name: 'AI/ML Benchmark',
      profileType: ProfileType.AI_ML,
      scoringWeights,
      minimumStandards,
      profileSpecificGuidance: 'Emphasize ML, Python, data science, model deployment. Specific algorithms, datasets, tools (TF/PyTorch/sklearn). Penalize vague "AI experience" without proof.',
    })),
    benchmarkRepo.save(benchmarkRepo.create({
      name: 'WordPress Benchmark',
      profileType: ProfileType.WORDPRESS,
      scoringWeights,
      minimumStandards,
      profileSpecificGuidance: 'CMS expertise, plugin/theme development, WooCommerce, e-commerce integrations. Specific WordPress project examples required.',
    })),
    benchmarkRepo.save(benchmarkRepo.create({
      name: 'General Benchmark',
      profileType: ProfileType.GENERAL,
      scoringWeights,
      minimumStandards,
      profileSpecificGuidance: 'Apply balanced scoring across all criteria.',
    })),
  ]);
  console.log('Created benchmarks');

  const teamMembers = [
    { name: 'Manager', email: 'manager@team.com', password: 'manager098', role: 'MANAGER', targets: {}, currentConnects: 0 },
    { name: 'Fatima', email: 'fatima@team.com', password: 'fatima098', role: 'REP', targets: { dailyProposals: 5, weeklyHires: 2 }, currentConnects: 60 },
    { name: 'Rao Waqar', email: 'waqar@team.com', password: 'waqar098', role: 'REP', targets: { dailyProposals: 5, weeklyHires: 2 }, currentConnects: 60 },
    { name: 'Abdullah', email: 'abdullah@team.com', password: 'abdullah098', role: 'REP', targets: { dailyProposals: 5, weeklyHires: 2 }, currentConnects: 60 },
    { name: 'Maryam', email: 'maryam@team.com', password: 'maryam098', role: 'REP', targets: { dailyProposals: 5, weeklyHires: 2 }, currentConnects: 60 },
    { name: 'Danish', email: 'danish@team.com', password: 'danish098', role: 'REP', targets: { dailyProposals: 5, weeklyHires: 2 }, currentConnects: 60 },
    { name: 'Mutawalkal', email: 'mutawalkal@team.com', password: 'mutawalkal098', role: 'REP', targets: { dailyProposals: 5, weeklyHires: 2 }, currentConnects: 60 },
  ];

  const hashedPassword = null; // each member has their own password below

  for (const member of teamMembers) {
    const existingUser = await userRepo.findOne({ where: { email: member.email } });
    if (existingUser) {
      console.log(`User ${member.name} already exists, skipping`);
      continue;
    }

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

    console.log(`Created user: ${member.name} (${member.email}) · password: ${member.password}`);
  }

  console.log('\nSeed complete!');
  await AppDataSource.destroy();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
