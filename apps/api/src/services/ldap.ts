// ===========================================
// Service LDAP (EP-001)
// Migré de ldapjs vers ldapts (2025-12-25)
// ===========================================

import { Client } from 'ldapts';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';
import { escapeLdapFilter, isValidLdapUsername } from '../utils/ldap-sanitize.js';

export interface LdapUser {
  username: string;
  email: string;
  displayName: string;
}

/**
 * Authentifie un utilisateur via LDAP
 */
export async function authenticateLdap(
  username: string,
  password: string
): Promise<LdapUser | null> {
  if (!config.ldap.enabled || !config.ldap.url) {
    return null;
  }

  // Security: Validate username format before LDAP operations
  if (!isValidLdapUsername(username)) {
    logger.warn({ username }, 'LDAP authentication rejected - invalid username format');
    return null;
  }

  const client = new Client({
    url: config.ldap.url,
    timeout: 5000,
    connectTimeout: 5000,
  });

  try {
    // 1. Bind avec le compte de service
    await client.bind(config.ldap.bindDn!, config.ldap.bindPassword!);

    // 2. Rechercher l'utilisateur
    // Security: Escape username to prevent LDAP injection (RFC 4515)
    const safeUsername = escapeLdapFilter(username);
    const searchFilter = config.ldap.searchFilter.replace('{{username}}', safeUsername);

    const { searchEntries } = await client.search(config.ldap.searchBase!, {
      scope: 'sub',
      filter: searchFilter,
      attributes: ['uid', 'mail', 'cn', 'displayName', 'givenName', 'sn'],
    });

    if (searchEntries.length === 0) {
      return null;
    }

    const userEntry = searchEntries[0];
    const userDn = userEntry.dn;

    // 3. Bind avec les credentials de l'utilisateur pour vérifier le mot de passe
    // Créer un nouveau client pour le bind utilisateur
    const userClient = new Client({
      url: config.ldap.url,
      timeout: 5000,
      connectTimeout: 5000,
    });

    try {
      await userClient.bind(userDn, password);
    } catch {
      logger.debug({ username }, 'LDAP user bind failed - invalid password');
      return null;
    } finally {
      await userClient.unbind();
    }

    // Extraire les attributs
    const getAttribute = (name: string): string => {
      const value = userEntry[name];
      if (Array.isArray(value)) {
        return value[0]?.toString() || '';
      }
      return value?.toString() || '';
    };

    const ldapUser: LdapUser = {
      username: getAttribute('uid') || username,
      email: getAttribute('mail') || `${username}@plumenote.local`,
      displayName:
        getAttribute('displayName') ||
        getAttribute('cn') ||
        `${getAttribute('givenName')} ${getAttribute('sn')}`.trim() ||
        username,
    };

    logger.info({ username: ldapUser.username }, 'LDAP authentication successful');
    return ldapUser;
  } catch (err) {
    logger.error({ err }, 'LDAP authentication error');
    throw err;
  } finally {
    await client.unbind();
  }
}
