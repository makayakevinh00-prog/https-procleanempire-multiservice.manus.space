#!/usr/bin/env bash
# Sauvegarde complète (schéma + données) de la base ProClean, à lancer AVANT toute migration.
#
#   DATABASE_URL='postgresql://postgres:MOT_DE_PASSE@db.xxxx.supabase.co:5432/postgres' ./scripts/backup-db.sh
#
# - Le mot de passe de la base se trouve dans Supabase → Project Settings → Database (jamais dans le chat, jamais dans le dépôt).
# - pg_dump doit être de version >= à celle du serveur (votre base : PostgreSQL 17). Sinon : « server version mismatch ».
# - Le fichier produit contient TOUTES vos données (clients, factures...) : conservez-le en lieu sûr, ne le partagez pas.
# - Pour tester la restauration : utilisez un projet Supabase de test (le schéma `auth` doit exister).
# - Ne sauvegarde pas le schéma `auth` (comptes) : Supabase le gère ; seul le schéma `public` (le CRM) l'est.
set -euo pipefail
: "${DATABASE_URL:?Définissez DATABASE_URL, voir la première ligne de ce script}"
command -v pg_dump >/dev/null || { echo "pg_dump introuvable (installez postgresql-client >= 17)"; exit 1; }

dir="${BACKUP_DIR:-.}"
stamp="$(date +%Y%m%d-%H%M%S)"
dump="$dir/proclean-$stamp.dump"

pg_dump "$DATABASE_URL" --schema=public --no-owner --no-privileges --format=custom --file="$dump"

# Vérifications : le fichier est lisible et contient bien les tables du CRM.
pg_restore --list "$dump" > "$dump.contenu.txt"
tables=$(grep -c " TABLE DATA " "$dump.contenu.txt" || true)
size=$(wc -c < "$dump")
[ "$tables" -ge 20 ] || { echo "ERREUR : seulement $tables tables dans la sauvegarde (attendu : au moins 25). Ne PAS migrer."; exit 2; }
sha256sum "$dump" > "$dump.sha256"
echo "Sauvegarde OK : $dump ($size octets, $tables tables). Empreinte : $(cut -d' ' -f1 "$dump.sha256")"
echo "Pour restaurer (dans une base VIDE de test d'abord) : pg_restore --no-owner --clean --if-exists --dbname=\"\$URL_BASE_DE_TEST\" \"$dump\""
