# Forteresse des Brumes

Mini tower defense web (HTML/CSS/JS) avec:

- classes heroiques de style rogue-like (mage, guerrier, rodeur)
- monstres (gobelin, squelette, ogre, dragonnet)
- economie d'or + achats d'ameliorations (tour de guet, mitrailleuse, canon arcanique, remparts)
- simulation de micro transactions (gemmes)

## Lancer en local

```bash
python3 -m http.server 8080
```

Puis ouvrir `http://localhost:8080`.

## Deploiement Cloudflare Pages

Option CLI:

```bash
npx wrangler pages deploy .
```

Option dashboard:

1. Creer un projet Pages.
2. Connecter ce dossier ou importer le code.
3. Build command: vide.
4. Build output directory: `.`

## Notes

- Les micro transactions sont 100% fictives (aucun paiement reel).
- Le jeu est une base extensible: tu peux facilement ajouter de nouvelles classes, monstres, reliques et tours dans `app.js`.
