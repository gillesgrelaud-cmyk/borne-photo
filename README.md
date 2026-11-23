# Borne Photo 📷

Application web de cabine à photos (photobooth) : la caméra capture une bande de
3 photos avec décompte, filtres en direct et téléchargement de la bande finale.

Fonctionne avec Chrome, Edge ou Firefox. L'accès à la caméra nécessite un contexte
sécurisé (HTTPS ou `localhost`).

## Lancer

Aucune dépendance ni build : ouvrez `index.html` via un petit serveur statique.

```bash
python3 -m http.server 8000
```

Puis ouvrez [http://localhost:8000](http://localhost:8000).

## Fonctionnalités

- Capture depuis la webcam (`getUserMedia`), en mode mitraillette : 3 photos espacées de ~1,2 s
- Décompte visuel 3-2-1 avant chaque photo
- 6 filtres en direct (noir & blanc, sépia, vintage, froid, pop) avec effet miroir
- Bande « Borne Photo » composée côté client et téléchargeable en JPEG
- Galerie en direct pendant la séance, boutons refaire / réinitialiser

## Structure

```
index.html      page unique
css/style.css   styles (thème sombre, décompte animé, galerie)
js/app.js       logique : caméra, décompte, filtres, capture, bande, téléchargement
```
