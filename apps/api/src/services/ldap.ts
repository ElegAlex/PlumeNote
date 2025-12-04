// ===========================================
// Service LDAP (EP-001)
// ===========================================

import ldap from 'ldapjs';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

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

  return new Promise((resolve, reject) => {
    const client = ldap.createClient({
      url: config.ldap.url!,
      timeout: 5000,
      connectTimeout: 5000,
    });

    client.on('error', (err) => {
      logger.error({ err }, 'LDAP client error');
      reject(err);
    });

    // 1. Bind avec le compte de service
    client.bind(config.ldap.bindDn!, config.ldap.bindPassword!, (bindErr) => {
      if (bindErr) {
        client.destroy();
        logger.error({ err: bindErr }, 'LDAP bind failed');
        reject(new Error('LDAP bind failed'));
        return;
      }

      // 2. Rechercher l'utilisateur
      const searchFilter = config.ldap.searchFilter.replace('{{username}}', username);
      const searchOptions: ldap.SearchOptions = {
        scope: 'sub',
        filter: searchFilter,
        attributes: ['uid', 'mail', 'cn', 'displayName', 'givenName', 'sn'],
      };

      client.search(config.ldap.searchBase!, searchOptions, (searchErr, searchRes) => {
        if (searchErr) {
          client.destroy();
          logger.error({ err: searchErr }, 'LDAP search failed');
          reject(new Error('LDAP search failed'));
          return;
        }

        let userEntry: ldap.SearchEntry | null = null;

        searchRes.on('searchEntry', (entry) => {
          userEntry = entry;
        });

        searchRes.on('error', (err) => {
          client.destroy();
          logger.error({ err }, 'LDAP search error');
          reject(err);
        });

        searchRes.on('end', () => {
          if (!userEntry) {
            client.destroy();
            resolve(null);
            return;
          }

          // 3. Bind avec les credentials de l'utilisateur pour vérifier le mot de passe
          const userDn = userEntry.objectName;

          client.bind(userDn!, password, (userBindErr) => {
            client.destroy();

            if (userBindErr) {
              logger.debug({ username }, 'LDAP user bind failed - invalid password');
              resolve(null);
              return;
            }

            // Extraire les attributs
            const getAttribute = (name: string): string => {
              const attr = userEntry!.attributes.find(
                a => a.type.toLowerCase() === name.toLowerCase()
              );
              return attr?.values?.[0]?.toString() || '';
            };

            const ldapUser: LdapUser = {
              username: getAttribute('uid') || username,
              email: getAttribute('mail') || `${username}@collabnotes.local`,
              displayName:
                getAttribute('displayName') ||
                getAttribute('cn') ||
                `${getAttribute('givenName')} ${getAttribute('sn')}`.trim() ||
                username,
            };

            logger.info({ username: ldapUser.username }, 'LDAP authentication successful');
            resolve(ldapUser);
          });
        });
      });
    });
  });
}
