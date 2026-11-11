/**
 * Idempotent demo seed. Safe to run on every deploy: everything is upserted by
 * a stable id, and event dates are anchored to the start of the current week
 * so the demo always shows upcoming events.
 *
 * Demo accounts (all share DEMO_PASSWORD): admin@, faculty@, organizer@,
 * student@ example.edu
 */
import bcrypt from 'bcryptjs';
import { EventStatus, EventType, NotificationType, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const DEMO_PASSWORD = 'Demo@1234';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/** Monday 00:00 UTC of the current week. */
export function weekAnchor(now = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const offset = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - offset * DAY);
}

const img = (id: string) => `https://images.unsplash.com/${id}?q=80&w=1600&auto=format&fit=crop`;

const categories = [
  {
    id: 'cat-tech',
    name: 'Technical',
    description: 'Hackathons, coding contests and tech talks',
    color: '#4F46E5',
    icon: 'cpu',
  },
  {
    id: 'cat-cult',
    name: 'Cultural',
    description: 'Music, dance, theatre and the arts',
    color: '#DB2777',
    icon: 'music',
  },
  {
    id: 'cat-sport',
    name: 'Sports',
    description: 'Tournaments, leagues and fitness',
    color: '#059669',
    icon: 'trophy',
  },
  {
    id: 'cat-acad',
    name: 'Academic',
    description: 'Seminars, guest lectures and research talks',
    color: '#D97706',
    icon: 'book-open',
  },
  {
    id: 'cat-work',
    name: 'Workshops',
    description: 'Hands-on skill-building sessions',
    color: '#0891B2',
    icon: 'wrench',
  },
  {
    id: 'cat-social',
    name: 'Social & Careers',
    description: 'Networking, alumni meetups and career fairs',
    color: '#7C3AED',
    icon: 'users',
  },
];

const staff = [
  {
    id: 'user-admin',
    email: 'admin@example.edu',
    firstName: 'Meera',
    lastName: 'Iyer',
    role: UserRole.ADMIN,
    department: 'Student Affairs',
  },
  {
    id: 'user-faculty',
    email: 'faculty@example.edu',
    firstName: 'Arjun',
    lastName: 'Rao',
    role: UserRole.FACULTY,
    department: 'Computer Science',
  },
  {
    id: 'user-organizer',
    email: 'organizer@example.edu',
    firstName: 'Kabir',
    lastName: 'Shah',
    role: UserRole.ORGANIZER,
    department: 'Tech Club',
  },
  {
    id: 'user-organizer-2',
    email: 'culture@example.edu',
    firstName: 'Ananya',
    lastName: 'Gupta',
    role: UserRole.ORGANIZER,
    department: 'Cultural Society',
  },
  {
    id: 'user-student',
    email: 'student@example.edu',
    firstName: 'Riya',
    lastName: 'Sharma',
    role: UserRole.STUDENT,
    department: 'Computer Science',
    year: 3,
    rollNumber: 'CS21-042',
  },
];

const firstNames = [
  'Aarav',
  'Diya',
  'Vivaan',
  'Isha',
  'Aditya',
  'Sara',
  'Reyansh',
  'Myra',
  'Arnav',
  'Anika',
  'Kian',
  'Tara',
  'Dev',
  'Zara',
  'Rohan',
  'Nisha',
  'Yash',
  'Pooja',
  'Karan',
  'Leah',
  'Omar',
  'Priya',
  'Neel',
  'Fatima',
  'Samar',
  'Ira',
  'Manav',
  'Sneha',
];
const lastNames = [
  'Patel',
  'Nair',
  'Singh',
  'Khan',
  'Mehta',
  'Das',
  'Joshi',
  'Reddy',
  'Kapoor',
  'Bose',
  'Menon',
  'Verma',
  'Pillai',
  'Chopra',
];
const departments = ['Computer Science', 'Electronics', 'Mechanical', 'Business', 'Design', 'Physics', 'Economics'];

const students = firstNames.map((firstName, i) => ({
  id: `user-s${String(i + 1).padStart(2, '0')}`,
  email: `${firstName.toLowerCase()}.${lastNames[i % lastNames.length].toLowerCase()}@example.edu`,
  firstName,
  lastName: lastNames[i % lastNames.length],
  role: UserRole.STUDENT,
  department: departments[i % departments.length],
  year: (i % 4) + 1,
  rollNumber: `${departments[i % departments.length].slice(0, 2).toUpperCase()}2${i % 4}-${100 + i}`,
}));

interface SeedEvent {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  type: EventType;
  categoryId: string;
  organizerId: string;
  day: number; // offset from week anchor
  hour: number; // start hour UTC
  durationHours: number;
  venue: string;
  isOnline?: boolean;
  onlineLink?: string;
  maxParticipants: number | null;
  tags: string[];
  banner: string;
  status?: EventStatus;
  rejectionReason?: string;
}

const events: SeedEvent[] = [
  {
    id: 'evt-hackathon',
    title: 'HackNight 2026: Build for Campus',
    shortDescription: '24 hours, 40 teams, one shared goal: fix campus life.',
    description:
      'Form a team of up to four and build something that makes campus life better: smarter timetables, greener hostels, safer late-night commutes. Mentors from industry and alumni will be on the floor all night, with workshops on rapid prototyping at 8 PM. Food, coffee and swag are on us. Prizes for Best Overall, Best Design and Most Impactful.',
    type: EventType.TECHNICAL,
    categoryId: 'cat-tech',
    organizerId: 'user-organizer',
    day: 9,
    hour: 12,
    durationHours: 24,
    venue: 'Innovation Hub, Block C',
    maxParticipants: 160,
    tags: ['hackathon', 'coding', 'prizes', 'teams'],
    banner: img('photo-1504384308090-c894fdcc538d'),
  },
  {
    id: 'evt-ai-seminar',
    title: 'Generative AI in the Real World',
    shortDescription: 'An industry researcher on what actually ships.',
    description:
      'A guest lecture on how large language models move from demo to production: evaluation, cost, safety and the boring infrastructure that makes it all work. Followed by a 30-minute open Q&A. Ideal for anyone curious about careers in applied AI.',
    type: EventType.SEMINAR,
    categoryId: 'cat-acad',
    organizerId: 'user-faculty',
    day: 3,
    hour: 10,
    durationHours: 2,
    venue: 'Auditorium A',
    maxParticipants: 300,
    tags: ['ai', 'guest lecture', 'careers'],
    banner: img('photo-1540575467063-178a50c2df87'),
  },
  {
    id: 'evt-spring-fest',
    title: 'Resonance: Annual Cultural Fest',
    shortDescription: 'Three days of live bands, dance and street food.',
    description:
      'The biggest weekend of the year. Battle of the bands on the main stage, inter-college dance face-off, an open-air film night and more than twenty food stalls run by student clubs. Day passes are free for students; bring your college ID.',
    type: EventType.CULTURAL,
    categoryId: 'cat-cult',
    organizerId: 'user-organizer-2',
    day: 12,
    hour: 14,
    durationHours: 54,
    venue: 'Central Lawns',
    maxParticipants: 1500,
    tags: ['fest', 'music', 'dance', 'food'],
    banner: img('photo-1533174072545-7a4b6ad7a6c3'),
  },
  {
    id: 'evt-basketball',
    title: 'Inter-College Basketball Cup',
    shortDescription: 'Eight colleges, one trophy. Come cheer.',
    description:
      'Knockout tournament featuring the top eight college teams in the city. Group stage on Saturday, semis and final on Sunday evening under the lights. Spectators welcome; team registrations are through your sports captain.',
    type: EventType.SPORTS,
    categoryId: 'cat-sport',
    organizerId: 'user-organizer',
    day: 5,
    hour: 9,
    durationHours: 34,
    venue: 'Sports Complex Court 1',
    maxParticipants: 400,
    tags: ['basketball', 'tournament'],
    banner: img('photo-1546519638-68e109498ffc'),
  },
  {
    id: 'evt-webdev',
    title: 'Full-Stack Bootcamp: React + Node',
    shortDescription: 'Ship a deployed app by Sunday evening.',
    description:
      'A hands-on, two-day bootcamp. Day one covers React, TypeScript and component design; day two covers REST APIs with Node, Postgres and deployment. Bring a laptop with Node installed. Seats are limited so every attendee gets mentor time.',
    type: EventType.WORKSHOP,
    categoryId: 'cat-work',
    organizerId: 'user-organizer',
    day: 6,
    hour: 4,
    durationHours: 32,
    venue: 'Lab 4, IT Building',
    maxParticipants: 40,
    tags: ['react', 'node', 'web dev', 'hands-on'],
    banner: img('photo-1517694712202-14dd9538aa97'),
  },
  {
    id: 'evt-cyber',
    title: 'Cybersecurity Awareness Session',
    shortDescription: 'Phishing, passwords and staying safe online.',
    description:
      'A practical session on the attacks students actually face: phishing emails, fake internship offers, SIM-swap scams and password reuse. Includes a live phishing demo and a checklist you can apply to your accounts the same evening.',
    type: EventType.SEMINAR,
    categoryId: 'cat-acad',
    organizerId: 'user-faculty',
    day: 2,
    hour: 9,
    durationHours: 2,
    venue: 'Seminar Hall 2',
    maxParticipants: 200,
    tags: ['security', 'privacy'],
    banner: img('photo-1550751827-4bd374c3f58b'),
  },
  {
    id: 'evt-drama',
    title: 'Theatre Night: Three Short Plays',
    shortDescription: 'Original scripts by the dramatics society.',
    description:
      'An evening of three original one-act plays written, directed and performed by students. Doors open 30 minutes before curtain. Seating is first come, first served.',
    type: EventType.CULTURAL,
    categoryId: 'cat-cult',
    organizerId: 'user-organizer-2',
    day: 10,
    hour: 13,
    durationHours: 3,
    venue: 'Open Air Theatre',
    maxParticipants: 350,
    tags: ['drama', 'theatre'],
    banner: img('photo-1507676184212-d03ab07a01bf'),
  },
  {
    id: 'evt-pitch',
    title: 'Startup Pitch Day',
    shortDescription: 'Five minutes, one idea, a panel of investors.',
    description:
      "Pitch your startup idea to a panel of founders, angel investors and alumni. Shortlisted teams get a mentorship session and a spot in the incubation programme. Audience members vote for the People's Choice award.",
    type: EventType.COMPETITION,
    categoryId: 'cat-social',
    organizerId: 'user-organizer',
    day: 16,
    hour: 8,
    durationHours: 5,
    venue: 'Business School Hall',
    maxParticipants: 120,
    tags: ['startup', 'pitch', 'entrepreneurship'],
    banner: img('photo-1559136555-9303baea8ebd'),
  },
  {
    id: 'evt-photo',
    title: 'Frames: Photography Exhibition',
    shortDescription: 'The best of the photography club this year.',
    description:
      "Sixty prints from student photographers covering street, portrait and wildlife work, plus a live portrait booth. Vote for your favourite frame; the winner is printed on next year's college calendar.",
    type: EventType.CULTURAL,
    categoryId: 'cat-cult',
    organizerId: 'user-organizer-2',
    day: 4,
    hour: 5,
    durationHours: 54,
    venue: 'Student Centre Gallery',
    maxParticipants: null,
    tags: ['photography', 'art', 'exhibition'],
    banner: img('photo-1460661419201-fd4cecdf8a8b'),
  },
  {
    id: 'evt-yoga',
    title: 'Mindful Mornings: Yoga & Wellness',
    shortDescription: 'Stress relief before exam season.',
    description:
      'A gentle one-hour yoga and breathing session for students and staff, led by a certified instructor. Mats are provided. Followed by a short talk on sleep and focus during exams.',
    type: EventType.WORKSHOP,
    categoryId: 'cat-work',
    organizerId: 'user-faculty',
    day: 8,
    hour: 1,
    durationHours: 1.5,
    venue: 'Campus Gym Hall',
    maxParticipants: 60,
    tags: ['wellness', 'yoga', 'health'],
    banner: img('photo-1544367567-0f2fcb009e0b'),
  },
  {
    id: 'evt-robotics',
    title: 'RoboWars: Line Follower & Battle Bots',
    shortDescription: 'Build it, race it, break it.',
    description:
      'Two tracks: a line-follower time trial and a 15 kg battle-bot arena. Teams of up to five. Rules, weight limits and the safety checklist are shared after registration. Spectators welcome in the arena stands.',
    type: EventType.COMPETITION,
    categoryId: 'cat-tech',
    organizerId: 'user-organizer',
    day: 18,
    hour: 6,
    durationHours: 8,
    venue: 'Main Hall',
    maxParticipants: 80,
    tags: ['robotics', 'competition', 'hardware'],
    banner: img('photo-1485827404703-89b55fcc595e'),
  },
  {
    id: 'evt-cloud',
    title: 'Cloud Deploy Clinic (Online)',
    shortDescription: 'Take a project from localhost to the internet.',
    description:
      'Bring a project that only runs on your laptop and leave with it deployed. We cover containers, environment variables, managed databases and free-tier hosting. Fully online; the meeting link is shared on registration.',
    type: EventType.WORKSHOP,
    categoryId: 'cat-tech',
    organizerId: 'user-organizer',
    day: 7,
    hour: 13,
    durationHours: 2,
    venue: 'Online',
    isOnline: true,
    onlineLink: 'https://meet.example.com/cloud-clinic',
    maxParticipants: 150,
    tags: ['cloud', 'devops', 'online'],
    banner: img('photo-1451187580459-43490279c0fa'),
  },
  {
    id: 'evt-chess',
    title: 'Rapid Chess Championship',
    shortDescription: '10+5 Swiss, seven rounds, one champion.',
    description:
      'Intra-college rapid chess tournament, seven Swiss rounds at 10+5. Open to all skill levels; rated and unrated sections. Boards and clocks provided.',
    type: EventType.SPORTS,
    categoryId: 'cat-sport',
    organizerId: 'user-organizer',
    day: 11,
    hour: 4,
    durationHours: 6,
    venue: 'Recreation Room',
    maxParticipants: 64,
    tags: ['chess', 'tournament'],
    banner: img('photo-1529699211952-734e80c4d42b'),
  },
  {
    id: 'evt-alumni',
    title: 'Alumni Connect: Careers Evening',
    shortDescription: 'Coffee chats with graduates from 30+ companies.',
    description:
      'Rotating small-group conversations with alumni working in product, research, consulting, design and the public sector. Bring questions, not resumes. Light dinner served afterwards.',
    type: EventType.SOCIAL,
    categoryId: 'cat-social',
    organizerId: 'user-faculty',
    day: 13,
    hour: 12,
    durationHours: 3,
    venue: 'Main Banquet Hall',
    maxParticipants: 250,
    tags: ['alumni', 'networking', 'careers'],
    banner: img('photo-1511578314322-379afb476865'),
  },
  {
    id: 'evt-design',
    title: 'UI/UX Design Sprint',
    shortDescription: 'Redesign a real campus app in 24 hours.',
    description:
      'Teams of two or three get a real brief from the college IT office and 24 hours to research, sketch, prototype and present. Judged by working designers. Figma accounts provided.',
    type: EventType.TECHNICAL,
    categoryId: 'cat-tech',
    organizerId: 'user-organizer',
    day: 20,
    hour: 4,
    durationHours: 24,
    venue: 'Design Studio, Block D',
    maxParticipants: 60,
    tags: ['design', 'figma', 'ux'],
    banner: img('photo-1561070791-2526d30994b5'),
  },
  {
    id: 'evt-debate',
    title: 'Parliamentary Debate Open',
    shortDescription: 'British Parliamentary format, all levels welcome.',
    description:
      'Five preliminary rounds and an open final on current affairs motions. Novice-friendly: a 45-minute primer on the format runs before round one.',
    type: EventType.COMPETITION,
    categoryId: 'cat-acad',
    organizerId: 'user-organizer-2',
    day: 15,
    hour: 5,
    durationHours: 9,
    venue: 'Seminar Room 2',
    maxParticipants: 72,
    tags: ['debate', 'public speaking'],
    banner: img('photo-1475721027785-f74eccf877e2'),
  },
  {
    id: 'evt-sports-meet',
    title: 'Annual Athletics Meet',
    shortDescription: 'Sprints, relays, long jump and more.',
    description:
      'Track and field events across two days, with inter-department standings and a closing ceremony. Participants must register by the deadline; spectators welcome all day.',
    type: EventType.SPORTS,
    categoryId: 'cat-sport',
    organizerId: 'user-faculty',
    day: 22,
    hour: 2,
    durationHours: 32,
    venue: 'Athletics Track',
    maxParticipants: 500,
    tags: ['athletics', 'track'],
    banner: img('photo-1461896836934-ffe607ba8211'),
  },
  {
    id: 'evt-open-mic',
    title: 'Open Mic Night',
    shortDescription: 'Comedy, poetry, music. Five minutes each.',
    description:
      'Sign up for a five-minute slot or just come to listen. Acoustic set-up, mics and a keyboard provided. Hosted by the literary and music clubs together.',
    type: EventType.CULTURAL,
    categoryId: 'cat-cult',
    organizerId: 'user-organizer-2',
    day: 4,
    hour: 13,
    durationHours: 3,
    venue: 'Student Lounge',
    maxParticipants: 120,
    tags: ['open mic', 'music', 'poetry'],
    banner: img('photo-1516280440614-37939bbacd81'),
  },
  // Awaiting approval (visible to faculty/admin on the approvals page)
  {
    id: 'evt-data-hack',
    title: 'Datathon: Predict the Canteen Queue',
    shortDescription: 'A Kaggle-style challenge on real campus data.',
    description:
      'Use six months of anonymised canteen footfall data to predict queue lengths. Leaderboard, notebooks and a final presentation round. Python and R welcome.',
    type: EventType.TECHNICAL,
    categoryId: 'cat-tech',
    organizerId: 'user-organizer',
    day: 25,
    hour: 5,
    durationHours: 30,
    venue: 'Lab 2, IT Building',
    maxParticipants: 100,
    tags: ['data science', 'ml', 'kaggle'],
    banner: img('photo-1551288049-bebda4e38f71'),
    status: EventStatus.PENDING_APPROVAL,
  },
  {
    id: 'evt-esports',
    title: 'Campus E-Sports League: Valorant',
    shortDescription: '5v5 league with weekly match nights.',
    description:
      'A four-week 5v5 league with weekly match nights in the gaming lounge and a LAN final. Teams must register a captain and one substitute.',
    type: EventType.COMPETITION,
    categoryId: 'cat-sport',
    organizerId: 'user-organizer-2',
    day: 19,
    hour: 12,
    durationHours: 6,
    venue: 'Gaming Lounge',
    maxParticipants: 80,
    tags: ['esports', 'gaming'],
    banner: img('photo-1542751371-adc38448a05e'),
    status: EventStatus.PENDING_APPROVAL,
  },
  {
    id: 'evt-rejected',
    title: 'Midnight Bonfire Party',
    shortDescription: 'Music and bonfire on the sports ground.',
    description: 'An informal late-night bonfire with music on the sports ground.',
    type: EventType.SOCIAL,
    categoryId: 'cat-social',
    organizerId: 'user-organizer-2',
    day: 14,
    hour: 17,
    durationHours: 4,
    venue: 'Sports Ground',
    maxParticipants: 200,
    tags: ['social'],
    banner: img('photo-1475483768296-6163e08872a1'),
    status: EventStatus.REJECTED,
    rejectionReason:
      'Open fires are not permitted on the sports ground. Please propose an indoor venue and an earlier finish time.',
  },
  // Past events (with feedback and attendance)
  {
    id: 'evt-past-ml',
    title: 'Intro to Machine Learning Workshop',
    shortDescription: 'From linear regression to your first model.',
    description:
      'A beginner-friendly workshop on the ML workflow: data cleaning, training, evaluation and avoiding common mistakes. Notebooks shared afterwards.',
    type: EventType.WORKSHOP,
    categoryId: 'cat-tech',
    organizerId: 'user-organizer',
    day: -12,
    hour: 5,
    durationHours: 3,
    venue: 'Lab 4, IT Building',
    maxParticipants: 50,
    tags: ['ml', 'python'],
    banner: img('photo-1555949963-aa79dcee981c'),
    status: EventStatus.COMPLETED,
  },
  {
    id: 'evt-past-music',
    title: 'Acoustic Evening on the Lawns',
    shortDescription: 'Unplugged sets under the stars.',
    description: 'Five student bands, unplugged, on the central lawns. Blankets and hot chocolate provided.',
    type: EventType.CULTURAL,
    categoryId: 'cat-cult',
    organizerId: 'user-organizer-2',
    day: -6,
    hour: 13,
    durationHours: 3,
    venue: 'Central Lawns',
    maxParticipants: 300,
    tags: ['music', 'acoustic'],
    banner: img('photo-1501386761578-eac5c94b800a'),
    status: EventStatus.COMPLETED,
  },
  {
    id: 'evt-past-resume',
    title: 'Resume Review Marathon',
    shortDescription: 'One-on-one reviews with recruiters.',
    description: 'Fifteen-minute one-on-one resume reviews with recruiters and senior alumni. Bring a printed copy.',
    type: EventType.SOCIAL,
    categoryId: 'cat-social',
    organizerId: 'user-faculty',
    day: -3,
    hour: 8,
    durationHours: 4,
    venue: 'Placement Cell',
    maxParticipants: 80,
    tags: ['careers', 'resume'],
    banner: img('photo-1521737604893-d14cc237f11d'),
    status: EventStatus.COMPLETED,
  },
];

/** Deterministic pseudo-random generator so the seed is stable across runs. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED_VERSION = 2;

/**
 * Seeds the demo data. Skips work when this week's data is already in place,
 * so running it on every boot costs a single query.
 */
export async function seed({ force = false } = {}): Promise<'seeded' | 'skipped'> {
  const anchor = weekAnchor();
  const marker = { version: SEED_VERSION, anchor: anchor.toISOString() };
  const existing = await prisma.systemConfig.findUnique({ where: { key: 'demo_seed' } });
  const prev = existing?.value as { version?: number; anchor?: string } | undefined;
  if (!force && prev?.version === marker.version && prev?.anchor === marker.anchor) return 'skipped';

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const c of categories) {
    await prisma.eventCategory.upsert({
      where: { name: c.name },
      update: { description: c.description, color: c.color, icon: c.icon },
      create: c,
    });
  }
  const categoryIds = new Map((await prisma.eventCategory.findMany()).map((c) => [c.name, c.id]));
  const catId = (seedId: string) => categoryIds.get(categories.find((c) => c.id === seedId)!.name)!;

  const allUsers = [...staff, ...students];
  await prisma.user.createMany({
    data: allUsers.map((u, i) => ({
      ...u,
      password: passwordHash,
      status: 'ACTIVE' as const,
      createdAt: new Date(anchor.getTime() - ((i * 7) % 28) * DAY),
    })),
    skipDuplicates: true,
  });
  const userIds = new Map(
    (await prisma.user.findMany({ where: { email: { in: allUsers.map((u) => u.email) } }, select: { id: true, email: true } })).map(
      (u) => [u.email, u.id],
    ),
  );
  // Map seed ids to real ids (they differ only if an account with that email pre-existed).
  const uid = (seedId: string) => userIds.get(allUsers.find((u) => u.id === seedId)!.email)!;
  await prisma.userProfile.createMany({ data: allUsers.map((u) => ({ userId: uid(u.id) })), skipDuplicates: true });

  for (const e of events) {
    const startDate = new Date(anchor.getTime() + e.day * DAY + e.hour * HOUR);
    const endDate = new Date(startDate.getTime() + e.durationHours * HOUR);
    const status = e.status ?? EventStatus.APPROVED;
    const approved = status === EventStatus.APPROVED || status === EventStatus.COMPLETED;
    const data = {
      title: e.title,
      shortDescription: e.shortDescription,
      description: e.description,
      type: e.type,
      status,
      startDate,
      endDate,
      registrationDeadline: e.maxParticipants ? new Date(startDate.getTime() - 6 * HOUR) : null,
      venue: e.venue,
      isOnline: e.isOnline ?? false,
      onlineLink: e.onlineLink ?? null,
      bannerImage: e.banner,
      maxParticipants: e.maxParticipants,
      categoryId: catId(e.categoryId),
      organizerId: uid(e.organizerId),
      tags: e.tags,
      approvedBy: approved ? uid('user-faculty') : null,
      approvedAt: approved ? new Date(startDate.getTime() - 10 * DAY) : null,
      rejectionReason: e.rejectionReason ?? null,
    };
    // Dates (and content) are refreshed so the demo never goes stale.
    await prisma.event.upsert({ where: { id: e.id }, update: data, create: { id: e.id, ...data } });
  }

  // Registrations: the demo student has a realistic history; others are random but stable.
  const rand = mulberry32(42);
  const openEvents = events.filter((e) => !e.status || e.status === EventStatus.COMPLETED);
  const registrations: Array<{ userId: string; eventId: string; attended: boolean }> = [
    { userId: 'user-student', eventId: 'evt-hackathon', attended: false },
    { userId: 'user-student', eventId: 'evt-ai-seminar', attended: false },
    { userId: 'user-student', eventId: 'evt-webdev', attended: false },
    { userId: 'user-student', eventId: 'evt-past-ml', attended: true },
    { userId: 'user-student', eventId: 'evt-past-resume', attended: true },
  ];
  for (const s of students) {
    for (const e of openEvents) {
      if (rand() < 0.28) {
        registrations.push({ userId: s.id, eventId: e.id, attended: e.status === EventStatus.COMPLETED && rand() < 0.8 });
      }
    }
  }
  const seats = new Map<string, number>();
  const withinCapacity = registrations.filter((r) => {
    const cap = events.find((e) => e.id === r.eventId)!.maxParticipants;
    const taken = seats.get(r.eventId) ?? 0;
    if (cap && taken >= Math.floor(cap * 0.9)) return false; // leave room for live demo sign-ups
    seats.set(r.eventId, taken + 1);
    return true;
  });
  await prisma.registration.createMany({
    data: withinCapacity.map((r) => ({ ...r, userId: uid(r.userId), status: 'CONFIRMED' as const })),
    skipDuplicates: true,
  });

  await prisma.userInterest.createMany({
    data: ['cat-tech', 'cat-work'].map((c) => ({ userId: uid('user-student'), categoryId: catId(c), weight: 1 })),
    skipDuplicates: true,
  });

  await prisma.feedback.createMany({
    data: [
      { eventId: 'evt-past-ml', rating: 5, comment: 'Clear, practical and the notebooks were great.' },
      { eventId: 'evt-past-resume', rating: 4, comment: 'Useful pointers, wish the slots were longer.' },
    ].map((f) => ({ ...f, userId: uid('user-student'), sentimentLabel: 'positive', sentimentScore: 0.8 })),
    skipDuplicates: true,
  });

  const notifications: Array<{
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    eventId?: string;
    isRead?: boolean;
  }> = [
    { id: 'ntf-1', userId: 'user-student', type: NotificationType.REGISTRATION_CONFIRMATION, title: "You're in!", message: 'Your spot for "HackNight 2026: Build for Campus" is confirmed.', eventId: 'evt-hackathon' },
    { id: 'ntf-2', userId: 'user-student', type: NotificationType.RECOMMENDATION, title: 'Picked for you', message: '"Cloud Deploy Clinic (Online)" matches your interest in Technical events.', eventId: 'evt-cloud' },
    { id: 'ntf-3', userId: 'user-student', type: NotificationType.EVENT_REMINDER, title: 'Coming up this week', message: '"Generative AI in the Real World" is coming up in Auditorium A.', eventId: 'evt-ai-seminar' },
    { id: 'ntf-4', userId: 'user-student', type: NotificationType.SYSTEM, title: 'Welcome to Quad', message: 'Add your interests on your profile to get better recommendations.', isRead: true },
    { id: 'ntf-5', userId: 'user-organizer-2', type: NotificationType.EVENT_REJECTION, title: 'Your event needs changes', message: '"Midnight Bonfire Party" was not approved. See the reviewer note for details.', eventId: 'evt-rejected' },
    { id: 'ntf-6', userId: 'user-faculty', type: NotificationType.SYSTEM, title: '2 events awaiting review', message: 'Datathon and the E-Sports League are waiting for approval.' },
  ];
  await prisma.notification.createMany({
    data: notifications.map((n) => ({
      ...n,
      userId: uid(n.userId),
      priority: 'MEDIUM' as const,
      actionLink: n.eventId ? `/events/${n.eventId}` : null,
    })),
    skipDuplicates: true,
  });

  await prisma.systemConfig.upsert({ where: { key: 'demo_seed' }, update: { value: marker }, create: { key: 'demo_seed', value: marker } });
  return 'seeded';
}

if (require.main === module) {
  seed({ force: process.argv.includes('--force') })
    .then((result) => console.log(`Seed ${result}`))
    .catch((e) => {
      console.error('Seed failed', e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
