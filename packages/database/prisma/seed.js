// ===========================================
// Script de Seed - Donnees Initiales (JavaScript)
// ===========================================
// Version JavaScript du seed pour environnement de production
// (le conteneur de prod n'a pas ts-node)

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ----- ROLES -----
  console.log('Creating roles...');

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrateur système',
      isSystem: true,
      permissions: {
        manageUsers: true,
        manageRoles: true,
        manageSystem: true,
        viewAuditLogs: true,
        manageAllContent: true,
      },
    },
  });

  const editorRole = await prisma.role.upsert({
    where: { name: 'editor' },
    update: {},
    create: {
      name: 'editor',
      description: 'Éditeur de contenu',
      isSystem: true,
      permissions: {
        createContent: true,
        editOwnContent: true,
        shareContent: true,
      },
    },
  });

  await prisma.role.upsert({
    where: { name: 'viewer' },
    update: {},
    create: {
      name: 'viewer',
      description: 'Lecteur uniquement',
      isSystem: true,
      permissions: {
        viewSharedContent: true,
      },
    },
  });

  console.log('✅ Roles created\n');

  // ----- USERS -----
  console.log('Creating users...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@plumenote.local',
      displayName: 'Administrateur',
      password: hashedPassword,
      roleId: adminRole.id,
      isActive: true,
      preferences: {
        theme: 'system',
        language: 'fr',
        sidebarCollapsed: false,
      },
    },
  });

  await prisma.user.upsert({
    where: { username: 'demo' },
    update: {},
    create: {
      username: 'demo',
      email: 'demo@plumenote.local',
      displayName: 'Utilisateur Demo',
      password: hashedPassword,
      roleId: editorRole.id,
      isActive: true,
      preferences: {
        theme: 'light',
        language: 'fr',
      },
    },
  });

  console.log('✅ Users created\n');

  // ----- HOMEPAGE CONFIG -----
  console.log('Creating homepage config...');

  await prisma.homepageConfig.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      widgets: [
        { type: 'recent_notes', position: 0 },
        { type: 'pinned_notes', position: 1 },
        { type: 'quick_search', position: 2 },
      ],
      pinnedNotes: [],
      importantMessage: null,
      updatedBy: adminUser.id,
    },
  });

  console.log('✅ Homepage config created\n');

  // ----- SYSTEM CONFIG -----
  console.log('Creating system config...');

  await prisma.systemConfig.upsert({
    where: { key: 'app.name' },
    update: {},
    create: {
      key: 'app.name',
      value: 'PlumeNote',
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'app.version' },
    update: {},
    create: {
      key: 'app.version',
      value: '0.1.0',
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'features.collaboration' },
    update: {},
    create: {
      key: 'features.collaboration',
      value: { enabled: true, maxUsers: 10 },
    },
  });

  console.log('✅ System config created\n');

  console.log('🎉 Seeding completed successfully!');
  console.log(`
  Default users:
  - admin@plumenote.local / password123 (Administrateur)
  - demo@plumenote.local / password123 (Éditeur)
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
