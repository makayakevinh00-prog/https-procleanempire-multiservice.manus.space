# Application ProClean Nettoyeur — Android et iPhone

Ce dossier emballe le site `/nettoyeur` dans une application, avec Capacitor. Il n'est pas compilé par le site (le site est sur Vercel).

## Ce que Kevinh doit faire lui-même
1. Compte Google Play Console (environ 25 €, une fois) : https://play.google.com/console
2. Compte Apple Developer (environ 99 €/an) : https://developer.apple.com/programs
3. Un Mac avec Xcode pour la version iPhone (ou un service de compilation en ligne).
4. Créer un compte nettoyeur de démonstration pour les relecteurs.

## Étapes techniques
```
cd mobile
npm install
npm run add:android      # puis npm run open:android, Android Studio
npm run add:ios          # puis npm run open:ios, Xcode (Mac)
```
- Icône et écran de démarrage : à générer depuis `public/icons/icon-512.png` (`npx @capacitor/assets generate`).
- Android : générer un bundle signé (.aab) et l'envoyer dans la Play Console.
- iPhone : archiver dans Xcode et envoyer vers App Store Connect.

## Points d'attention
- Apple refuse les simples sites emballés : l'application doit s'appuyer sur de vraies fonctions du téléphone (caméra pour le film, position, notifications push). Prévoir un passage par les plugins Capacitor (caméra, notifications) avant l'envoi à Apple.
- Suppression de compte dans l'application : faite (Profil › Supprimer mon compte).
- Textes et déclarations des stores : `store/fiche-stores.md`.
