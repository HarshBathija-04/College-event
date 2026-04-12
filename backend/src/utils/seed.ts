import { PrismaClient, UserRole, EventStatus, EventType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Create Categories
  const categories = [
    { name: 'Academic', description: 'Academic seminars, lectures, and workshops', color: '#3B82F6', icon: 'book-open' },
    { name: 'Cultural', description: 'Music, dance, and arts festivals', color: '#EC4899', icon: 'music' },
    { name: 'Sports', description: 'Athletic competitions and tournaments', color: '#10B981', icon: 'trophy' },
    { name: 'Technical', description: 'Hackathons, coding contests, and tech talks', color: '#8B5CF6', icon: 'cpu' },
    { name: 'Workshops', description: 'Hands-on learning sessions', color: '#F59E0B', icon: 'tool' },
  ];

  const createdCategories = [];
  for (const cat of categories) {
    const created = await prisma.eventCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    createdCategories.push(created);
    console.log(`Created category: ${created.name}`);
  }

  // 2. Create Admin/Organizer User
  const hashedPassword = await bcrypt.hash('password123', 10);
  const organizer = await prisma.user.upsert({
    where: { email: 'admin@college.edu' },
    update: {},
    create: {
      email: 'admin@college.edu',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      status: 'ACTIVE',
      department: 'Computer Science',
    },
  });
  console.log(`Created admin user: ${organizer.email}`);

  // 3. Create Sample Events
  const now = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(now.getMonth() + 1);

  const sampleEvents = [
    {
      title: 'Global Tech Summit 2024',
      description: 'A deep dive into the future of AI and Cloud Computing featuring industry experts.',
      shortDescription: 'The biggest tech event of the year!',
      type: EventType.TECHNICAL,
      status: EventStatus.APPROVED,
      startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // In 1 week
      endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), // 8 hours later
      venue: 'Main Auditorium',
      maxParticipants: 500,
      categoryId: createdCategories.find(c => c.name === 'Technical')?.id!,
      tags: ['AI', 'Cloud', 'Future'],
      bannerImage: 'https://images.unsplash.com/photo-1540575861501-7ad060e39fe1?q=80&w=2070&auto=format&fit=crop',
    },
    {
      title: 'Spring Music Festival',
      description: 'Annual cultural celebration featuring local student bands and guest artists.',
      shortDescription: 'Music, Food, and Fun!',
      type: EventType.CULTURAL,
      status: EventStatus.APPROVED,
      startDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // In 2 weeks
      endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
      venue: 'Campus Grounds',
      maxParticipants: 1000,
      categoryId: createdCategories.find(c => c.name === 'Cultural')?.id!,
      tags: ['Music', 'Art', 'Campus'],
      bannerImage: 'https://images.unsplash.com/photo-1459749411177-042180ce673c?q=80&w=2070&auto=format&fit=crop',
    },
    {
      title: 'Inter-College Basketball Championship',
      description: 'Final tournament between the top 8 college teams in the region.',
      shortDescription: 'Witness the ultimate showdown!',
      type: EventType.SPORTS,
      status: EventStatus.APPROVED,
      startDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // In 3 days
      endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 2 day event
      venue: 'Sports Complex',
      maxParticipants: 300,
      categoryId: createdCategories.find(c => c.name === 'Sports')?.id!,
      tags: ['Sports', 'Basketball', 'Teams'],
      bannerImage: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=2090&auto=format&fit=crop',
    },
    {
      title: 'Advanced Web Dev Workshop',
      description: 'Hands-on workshop on Next.js, Prisma, and Tailwind CSS.',
      shortDescription: 'Build modern apps in a weekend.',
      type: EventType.WORKSHOP,
      status: EventStatus.APPROVED,
      startDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // In 10 days
      endDate: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000), // 1 day event
      venue: 'Lab 4, IT Building',
      maxParticipants: 50,
      categoryId: createdCategories.find(c => c.name === 'Workshops')?.id!,
      tags: ['Web Dev', 'Coding', 'React'],
      bannerImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop',
    },
    {
      title: 'Cyber Security Seminar',
      description: 'Learn about the latest threats and how to protect yourself on the internet.',
      shortDescription: 'Stay safe in the digital world.',
      type: EventType.SEMINAR,
      status: EventStatus.APPROVED,
      startDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // In 2 days
      endDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      venue: 'Seminar Hall 2',
      maxParticipants: 200,
      categoryId: createdCategories.find(c => c.name === 'Academic')?.id!,
      tags: ['Security', 'Learning', 'Digital'],
      bannerImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop',
    },
    {
      title: 'Annual Drama Night',
      description: 'Theatrical performances showcasing student talent and storytelling.',
      shortDescription: 'An evening of dramatic arts.',
      type: EventType.CULTURAL,
      status: EventStatus.APPROVED,
      startDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000), // In 20 days
      endDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      venue: 'Auditorium B',
      maxParticipants: 300,
      categoryId: createdCategories.find(c => c.name === 'Cultural')?.id!,
      tags: ['Drama', 'Acting', 'Culture'],
      bannerImage: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=2070&auto=format&fit=crop',
    },
    {
      title: 'Hackathon 2024: Sustainable Future',
      description: '48-hour coding challenge to build solutions for environmental sustainability.',
      shortDescription: 'Code for a greener planet.',
      type: EventType.TECHNICAL,
      status: EventStatus.APPROVED,
      startDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000), // In 25 days
      endDate: new Date(now.getTime() + 27 * 24 * 60 * 60 * 1000), // 2 day event
      venue: 'Innovation Hub',
      maxParticipants: 200,
      categoryId: createdCategories.find(c => c.name === 'Technical')?.id!,
      tags: ['Hackathon', 'GreenTech', 'Coding'],
      bannerImage: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=2070&auto=format&fit=crop',
    },
    {
      title: 'Startup Pitch Competition',
      description: 'Present your business ideas to a panel of entrepreneurs and investors.',
      shortDescription: 'Turn your idea into reality.',
      type: EventType.COMPETITION,
      status: EventStatus.APPROVED,
      startDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // In 30 days
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
      venue: 'Business School Hall',
      maxParticipants: 100,
      categoryId: createdCategories.find(c => c.name === 'Academic')?.id!,
      tags: ['Startup', 'Business', 'Pitch'],
      bannerImage: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?q=80&w=2070&auto=format&fit=crop',
    },
    {
      title: 'Art & Photography Exhibition',
      description: 'Showcasing visual arts and photography from students across campus.',
      shortDescription: 'Visual storytelling at its best.',
      type: EventType.CULTURAL,
      status: EventStatus.APPROVED,
      startDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // In 5 days
      endDate: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000), // 3 day exhibition
      venue: 'Student Center Gallery',
      maxParticipants: 500,
      categoryId: createdCategories.find(c => c.name === 'Cultural')?.id!,
      tags: ['Art', 'Photography', 'Exhibition'],
      bannerImage: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=2070&auto=format&fit=crop',
    },
    {
      title: 'Yoga & Wellness Workshop',
      description: 'Stress management and mindfulness session for students and faculty.',
      shortDescription: 'Mind and body wellness.',
      type: EventType.WORKSHOP,
      status: EventStatus.APPROVED,
      startDate: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000), // In 12 days
      endDate: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      venue: 'Campus Gym Hall',
      maxParticipants: 80,
      categoryId: createdCategories.find(c => c.name === 'Workshops')?.id!,
      tags: ['Wellness', 'Yoga', 'Health'],
      bannerImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=2020&auto=format&fit=crop',
    },
  ];

  for (const event of sampleEvents) {
    await prisma.event.upsert({
      where: { id: `seed-event-${event.title.toLowerCase().replace(/\s+/g, '-')}` }, // deterministic ID for upsert
      update: {},
      create: {
        id: `seed-event-${event.title.toLowerCase().replace(/\s+/g, '-')}`,
        ...event,
        organizerId: organizer.id,
      },
    });
    console.log(`Upserted event: ${event.title}`);
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
