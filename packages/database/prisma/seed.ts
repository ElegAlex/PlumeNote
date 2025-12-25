// ===========================================
// Script de Seed - Données Initiales
// ===========================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

  const demoUser = await prisma.user.upsert({
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

  // ----- PERSONAL FOLDERS -----
  console.log('Creating personal folders...');

  // Dossier personnel admin
  const adminFolder = await prisma.folder.upsert({
    where: {
      parentId_slug: {
        parentId: null as unknown as string,
        slug: 'admin-space',
      },
    },
    update: {},
    create: {
      name: 'Mon espace',
      slug: 'admin-space',
      path: '/admin-space',
      isPersonal: true,
      ownerId: adminUser.id,
      createdById: adminUser.id,
    },
  });

  // Acces ecriture pour admin
  await prisma.folderAccess.upsert({
    where: {
      folderId_userId: {
        folderId: adminFolder.id,
        userId: adminUser.id,
      },
    },
    update: { canWrite: true },
    create: {
      folderId: adminFolder.id,
      userId: adminUser.id,
      canRead: true,
      canWrite: true,
    },
  });

  // Dossier personnel demo
  const demoFolder = await prisma.folder.upsert({
    where: {
      parentId_slug: {
        parentId: null as unknown as string,
        slug: 'demo-space',
      },
    },
    update: {},
    create: {
      name: 'Mon espace',
      slug: 'demo-space',
      path: '/demo-space',
      isPersonal: true,
      ownerId: demoUser.id,
      createdById: demoUser.id,
    },
  });

  // Acces ecriture pour demo
  await prisma.folderAccess.upsert({
    where: {
      folderId_userId: {
        folderId: demoFolder.id,
        userId: demoUser.id,
      },
    },
    update: { canWrite: true },
    create: {
      folderId: demoFolder.id,
      userId: demoUser.id,
      canRead: true,
      canWrite: true,
    },
  });

  console.log('✅ Personal folders created\n');

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
  - admin / password123 (Administrateur)
  - demo / password123 (Éditeur)
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
