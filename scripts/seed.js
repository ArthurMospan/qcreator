'use strict';
const { db } = require('../db');
const crypto = require('crypto');

function hashPass(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(pw, salt, 32).toString('hex');
  return salt + ':' + h;
}

async function seedIfEmpty() {
  const count = await db().count('users');
  if (count > 0) {
    console.log('[seed] DB not empty, skipping.');
    return;
  }

  const org = await db().createOrg({ name: 'AURA' });

  const designer = await db().createUser({
    orgId: org.id,
    email: 'designer@aura.co',
    pass: hashPass('demo1234'),
    name: 'AURA Designer',
    role: 'designer',
  });

  await db().createUser({
    orgId: org.id,
    email: 'smm@aura.co',
    pass: hashPass('demo1234'),
    name: 'AURA SMM',
    role: 'smm',
  });

  const project = await db().createProject({
    orgId: org.id,
    name: 'Соцмережі',
    hue: '270',
    createdBy: designer.id,
  });

  await db().createTemplate({
    projectId: project.id,
    name: 'Промо-пост',
    formats: ['ig_portrait', 'ig_square', 'ig_story', 'carousel'],
    brand: {
      bg: '#0f0f0f',
      primary: '#ffffff',
      accent: '#a78bfa',
      logoText: 'AURA',
      tagline: 'Бренд що надихає',
      palette: ['#a78bfa', '#34d399', '#fb923c', '#f472b6', '#60a5fa'],
    },
    slots: {
      headline: { max: 80 },
      body: { enabled: true, max: 200, removable: true },
      photo: { enabled: true },
      cta: { enabled: true },
    },
    createdBy: designer.id,
  });

  console.log('[seed] Created: org AURA, designer@aura.co / demo1234, smm@aura.co / demo1234, template Промо-пост');
}

module.exports = { seedIfEmpty };

if (require.main === module) {
  seedIfEmpty()
    .then(() => process.exit(0))
    .catch(e => { console.error('[seed] Error:', e); process.exit(1); });
}
