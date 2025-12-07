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

  const viewerRole = await prisma.role.upsert({
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

  const guestUser = await prisma.user.upsert({
    where: { username: 'guest' },
    update: {},
    create: {
      username: 'guest',
      email: 'guest@plumenote.local',
      displayName: 'Invité',
      password: hashedPassword,
      roleId: viewerRole.id,
      isActive: true,
      preferences: {},
    },
  });

  console.log('✅ Users created\n');

  // ----- FOLDERS -----
  console.log('Creating folders...');

  const rootFolder = await prisma.folder.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Mes Notes',
      slug: 'mes-notes',
      path: '/mes-notes',
      createdBy: adminUser.id,
      position: 0,
    },
  });

  const projectsFolder = await prisma.folder.create({
    data: {
      name: 'Projets',
      slug: 'projets',
      path: '/mes-notes/projets',
      parentId: rootFolder.id,
      color: '#3B82F6',
      createdBy: adminUser.id,
      position: 0,
    },
  });

  const ideasFolder = await prisma.folder.create({
    data: {
      name: 'Idées',
      slug: 'idees',
      path: '/mes-notes/idees',
      parentId: rootFolder.id,
      color: '#10B981',
      createdBy: adminUser.id,
      position: 1,
    },
  });

  const archiveFolder = await prisma.folder.create({
    data: {
      name: 'Archives',
      slug: 'archives',
      path: '/mes-notes/archives',
      parentId: rootFolder.id,
      color: '#6B7280',
      createdBy: adminUser.id,
      position: 2,
    },
  });

  console.log('✅ Folders created\n');

  // ----- NOTES -----
  console.log('Creating notes...');

  const welcomeNote = await prisma.note.create({
    data: {
      title: 'Bienvenue sur PlumeNote',
      slug: 'bienvenue-sur-plumenote',
      folderId: rootFolder.id,
      content: `
# Bienvenue sur PlumeNote ! 🎉

Votre plateforme de notes collaboratives en Markdown.

## Fonctionnalités principales

- ✏️ **Édition Markdown** : Syntaxe familière et puissante
- 🔗 **Wikilinks** : Liez vos notes avec \`[[nom de la note]]\`
- 👥 **Collaboration temps réel** : Travaillez ensemble
- 🔍 **Recherche full-text** : Retrouvez tout instantanément
- 📁 **Organisation flexible** : Dossiers et tags

## Pour commencer

1. Créez votre première note avec le bouton "+"
2. Organisez vos notes dans des dossiers
3. Utilisez les wikilinks pour créer des connexions
4. Partagez avec vos collègues

Bonne prise de notes ! 📝
      `.trim(),
      authorId: adminUser.id,
      isPinnedGlobal: true,
      position: 0,
    },
  });

  const projectNote = await prisma.note.create({
    data: {
      title: 'Projet Alpha',
      slug: 'projet-alpha',
      folderId: projectsFolder.id,
      content: `
# Projet Alpha

## Objectifs

- [ ] Définir le périmètre
- [ ] Identifier les parties prenantes
- [ ] Planifier les sprints

## Notes

Voir aussi [[Bienvenue sur PlumeNote]] pour les instructions.

## Ressources

- Documentation technique
- Spécifications fonctionnelles
      `.trim(),
      authorId: adminUser.id,
      position: 0,
    },
  });

  const ideaNote = await prisma.note.create({
    data: {
      title: 'Idées pour améliorer le workflow',
      slug: 'idees-workflow',
      folderId: ideasFolder.id,
      content: `
# Idées pour améliorer le workflow

## Automatisation

- Scripts de déploiement
- Tests automatisés
- CI/CD pipeline

## Organisation

- Daily standups plus courts
- Documentation centralisée
- Revue de code systématique

#brainstorming #workflow #amélioration
      `.trim(),
      authorId: demoUser.id,
      position: 0,
    },
  });

  console.log('✅ Notes created\n');

  // ----- TAGS -----
  console.log('Creating tags...');

  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { name: 'brainstorming' },
      update: {},
      create: { name: 'brainstorming', color: '#F59E0B' },
    }),
    prisma.tag.upsert({
      where: { name: 'workflow' },
      update: {},
      create: { name: 'workflow', color: '#8B5CF6' },
    }),
    prisma.tag.upsert({
      where: { name: 'amélioration' },
      update: {},
      create: { name: 'amélioration', color: '#10B981' },
    }),
    prisma.tag.upsert({
      where: { name: 'important' },
      update: {},
      create: { name: 'important', color: '#EF4444' },
    }),
    prisma.tag.upsert({
      where: { name: 'todo' },
      update: {},
      create: { name: 'todo', color: '#3B82F6' },
    }),
  ]);

  // Link tags to notes
  await prisma.noteTag.createMany({
    data: [
      { noteId: ideaNote.id, tagId: tags[0].id },
      { noteId: ideaNote.id, tagId: tags[1].id },
      { noteId: ideaNote.id, tagId: tags[2].id },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Tags created\n');

  // ----- LINKS (Wikilinks) -----
  console.log('Creating links...');

  await prisma.link.create({
    data: {
      sourceNoteId: projectNote.id,
      targetNoteId: welcomeNote.id,
      targetSlug: 'bienvenue-sur-plumenote',
      position: 0,
      context: 'Voir aussi [[Bienvenue sur PlumeNote]] pour les instructions.',
    },
  });

  console.log('✅ Links created\n');

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
      pinnedNotes: [welcomeNote.id],
      importantMessage: 'Bienvenue dans PlumeNote ! Explorez les fonctionnalités.',
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
  Demo users:
  - admin / password123 (Administrateur)
  - demo / password123 (Éditeur)
  - guest / password123 (Lecteur)
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
