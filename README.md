# MassBuilder PRO — Guide de Déploiement

## Architecture des fichiers

```
massbuilder/
├── index.html          # Point d'entrée — HTML sémantique pur, zéro inline JS
├── css/
│   ├── tokens.css      # Variables CSS, reset, fond animé
│   ├── layout.css      # Header, hero, footer, navigation
│   └── components.css  # Cards, forms, buttons, metrics, tables
├── js/
│   ├── algorithms.js   # Moteur de calcul pur (ALGO) — pas de DOM
│   ├── renderer.js     # Injection DOM (RENDERER) — pas de calculs
│   └── app.js          # Contrôleur (APP) — orchestre tout
├── .htaccess           # Sécurité + perf Apache
├── nginx.conf          # Config Nginx production
├── robots.txt          # SEO crawlers
└── sitemap.xml         # SEO sitemap
```

## Ordre de chargement des scripts (critique)

```html
<script src="js/algorithms.js" defer></script>  <!-- 1. Pas de dépendance -->
<script src="js/renderer.js" defer></script>     <!-- 2. Dépend de ALGO -->
<script src="js/app.js" defer></script>          <!-- 3. Dépend de ALGO + RENDERER -->
```

Les 3 scripts utilisent `defer` — ils s'exécutent après le parsing HTML,
dans l'ordre de déclaration.

---

## Déploiement sur un VPS (Ubuntu 22.04 LTS)

### 1. Installation Nginx

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Copier les fichiers

```bash
sudo mkdir -p /var/www/massbuilder
sudo cp -r massbuilder/* /var/www/massbuilder/
sudo chown -R www-data:www-data /var/www/massbuilder
sudo chmod -R 755 /var/www/massbuilder
```

### 3. Config Nginx

```bash
sudo cp nginx.conf /etc/nginx/sites-available/massbuilder
sudo ln -s /etc/nginx/sites-available/massbuilder /etc/nginx/sites-enabled/
sudo nginx -t  # Vérification
sudo systemctl reload nginx
```

### 4. SSL Let's Encrypt (HTTPS gratuit)

```bash
sudo certbot --nginx -d massbuilder.pro -d www.massbuilder.pro
# Certbot modifie automatiquement nginx.conf pour SSL
sudo systemctl enable certbot.timer  # Renouvellement auto
```

### 5. Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Déploiement sur hébergement partagé Apache

1. Uploader le contenu du dossier `massbuilder/` à la racine de votre `public_html/`
2. Le fichier `.htaccess` est déjà configuré (sécurité + cache + compression)
3. Activer HTTPS via le panneau cPanel de votre hébergeur (Let's Encrypt intégré)

---

## Déploiement Vercel (gratuit, recommandé pour tester)

```bash
npm install -g vercel
cd massbuilder/
vercel --prod
```

Créer un fichier `vercel.json` à la racine :

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none';" }
      ]
    },
    {
      "source": "/css/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=2592000, immutable" }]
    },
    {
      "source": "/js/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=2592000, immutable" }]
    }
  ]
}
```

---

## Déploiement Netlify

```bash
npm install -g netlify-cli
cd massbuilder/
netlify deploy --prod --dir .
```

Créer `netlify.toml` :

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/css/*"
  [headers.values]
    Cache-Control = "public, max-age=2592000, immutable"

[[headers]]
  for = "/js/*"
  [headers.values]
    Cache-Control = "public, max-age=2592000, immutable"
```

---

## Sécurité — Checklist

- [x] CSP (Content-Security-Policy) sans `unsafe-inline` ni `unsafe-eval`
- [x] `X-Frame-Options: DENY` — anti-clickjacking
- [x] `X-Content-Type-Options: nosniff` — anti-MIME sniffing
- [x] Aucune donnée utilisateur envoyée au serveur (tout côté client)
- [x] Aucun localStorage / sessionStorage utilisé
- [x] Validation et sanitisation de toutes les entrées utilisateur
- [x] Aucun `eval()`, `innerHTML` non sécurisé, `document.write()`
- [x] Attributs `rel="noopener sponsored"` sur liens externes
- [x] HTTPS avec HSTS (activer après SSL confirmé)
- [x] Rate limiting Nginx
- [x] Cache immutable pour les assets versionnés

---

## Monétisation — Intégration AdSense

Remplacer le contenu des `div#adSlot1` et `div#adSlot2` par :

```html
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
     data-ad-slot="XXXXXXXXXX"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
```

⚠️ Si AdSense est utilisé, mettre à jour la CSP pour autoriser :
- `script-src` : ajouter `https://pagead2.googlesyndication.com`
- `frame-src` : ajouter `https://googleads.g.doubleclick.net`

---

## Performance — Score Lighthouse cible

| Métrique       | Objectif |
|----------------|----------|
| Performance    | 95+      |
| Accessibilité  | 95+      |
| Bonnes pratiques | 100    |
| SEO            | 100      |
| LCP            | < 1.5s   |
| FID / INP      | < 100ms  |
| CLS            | < 0.05   |

---

## Versioning des assets (cache-busting)

Pour invalider le cache après une mise à jour CSS/JS, ajouter un paramètre de version :

```html
<link rel="stylesheet" href="css/tokens.css?v=1.0.1">
<script src="js/algorithms.js?v=1.0.1" defer></script>
```

Ou utiliser un build tool (Vite, esbuild) pour le hash automatique.
