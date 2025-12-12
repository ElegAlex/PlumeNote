# API Reference PlumeNote

## Vue d'ensemble

- **Base URL** : `https://votre-domaine.fr/api/v1`
- **Authentification** : JWT via cookie `token`
- **Format** : JSON

## Authentification

### POST /auth/login

Connexion utilisateur.

**Body** :
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Reponse** (200) :
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "user",
    "role": "EDITOR"
  },
  "token": "jwt_token"
}
```

### POST /auth/logout

Deconnexion.

### GET /auth/me

Utilisateur courant.

## Notes

### GET /notes

Liste des notes.

**Query params** :
- `folderId` : Filtrer par dossier
- `search` : Recherche full-text
- `limit` : Nombre de resultats (defaut: 20)
- `offset` : Pagination

**Reponse** :
```json
{
  "notes": [
    {
      "id": "uuid",
      "title": "Ma note",
      "content": "...",
      "folderId": "uuid",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 42
}
```

### GET /notes/:id

Detail d'une note.

### POST /notes

Creer une note.

**Body** :
```json
{
  "title": "Nouvelle note",
  "content": "# Contenu Markdown",
  "folderId": "uuid (optionnel)"
}
```

### PUT /notes/:id

Modifier une note.

### DELETE /notes/:id

Supprimer une note.

## Dossiers

### GET /folders

Liste des dossiers.

### POST /folders

Creer un dossier.

### PUT /folders/:id

Modifier un dossier.

### DELETE /folders/:id

Supprimer un dossier.

## Recherche

### GET /search

Recherche full-text.

**Query params** :
- `q` : Terme de recherche
- `type` : `notes` | `folders` | `all`

## WebSocket

### /ws

Connexion Yjs pour la collaboration temps reel.

### /ws/sync

Synchronisation des evenements applicatifs.

## Codes d'erreur

| Code | Description |
|------|-------------|
| 400 | Requete invalide |
| 401 | Non authentifie |
| 403 | Non autorise |
| 404 | Ressource non trouvee |
| 422 | Erreur de validation |
| 500 | Erreur serveur |

## Rate limiting

- API standard : 10 requetes/seconde
- Login : 5 tentatives/minute
