# 🌾 SunuAgri IA — Plateforme d'Intelligence Artificielle Agricole pour le Sénégal

> **Vendez au meilleur prix et au bon moment.**
> SunuAgri IA protège le revenu des producteurs agricoles sénégalais contre les pertes post-récolte et la spéculation des intermédiaires (*bana-bana*) en recommandant le marché optimal et le meilleur créneau de vente grâce à l'IA.

---

## 🏛️ Architecture Modulaire du Projet

Le projet respecte une stricte séparation des responsabilités (**HTML / CSS / JavaScript**) sans framework lourd ni dépendance de compilation :

```text
SunuAgri-AI/
│
├── index.html              # Structure HTML sémantique et liens modulaires
│
├── css/
│   ├── style.css           # Styles principaux, design system et composants UI
│   ├── responsive.css      # Mise en page adaptative téléphone, tablette et ordinateur
│   └── themes.css          # Variables CSS Thème Clair / Sombre
│
├── js/
│   ├── app.js              # Point d'entrée, initialisation et coordination
│   ├── navigation.js       # Navigation par onglets et accessibilité
│   ├── vente.js            # Moteur IA : optimisation des ventes, transport, Chart.js & TTS
│   ├── marches.js          # Observatoire des cotations en direct et filtres par filière
│   ├── sunumarche.js       # Place de marché P2P directe & intégration WhatsApp
│   ├── conseiller.js       # SunuCompagnon, conversation et actions contrôlées
│   ├── demo.js             # Thème et déclencheur d’installation PWA
│   ├── account.js          # Profils locaux hors ligne, connexion et inscription
│   └── utils.js            # Données de référence (AGRI_DATA), état global (AppState) et toasts
├── api/assistant.js        # Fonction Node serverless Vercel, clé Gemini côté serveur
├── .env.example            # Noms de variables d'environnement, sans secret
│
├── assets/                 # Ressources graphiques et icônes
├── manifest.webmanifest    # Métadonnées de l'application web installable
├── sw.js                   # Cache de l’application et ressources tierces autorisées
│
├── test_suite.js           # Suite complète de tests unitaires et d'intégration
└── README.md               # Documentation du projet
```

---

## 🚀 Les 4 Piliers Fonctionnels

### 1. 📈 Moteur IA d'Optimisation des Ventes
- **Calcul multicritère en temps réel** : met en balance les prix prévisionnels à 30 jours, les coûts de transport selon la distance kilométrique et le tonnage, ainsi que le taux de perte/périssabilité selon la culture (oignon, arachide, tomate, mangue, niébé, piment, maïs).
- **Courbe prévisionnelle dynamique** : graphique interactif (Chart.js) identifiant le jour optimal de vente.
- **Synthèse vocale multilingue** : écoute du conseil en **Français**, **Wolof** ou **Anglais**.

### 2. 🏪 Observatoire des Marchés
- **Estimations simulées** pour les principaux carrefours commerciaux : Marché Castors (Dakar), Syndicat de Thiaroye, Marché Central de Kaolack, Marché International de Diaobé, Marché Okass de Touba, Marché Ndar (Saint-Louis).
- Recherche instantanée par mot-clé et tri par rentabilité ou prix.

### 3. 🤝 SunuMarché Express (Court-Circuit Bana-Bana)
- Annonces de récoltes publiées directement par les producteurs ou leurs GIE.
- Bouton de contact direct **WhatsApp** en un clic avec message pré-formaté.
- Pré-remplissage automatique depuis les résultats de simulation de l'IA.

### 4. 🌱 SunuCompagnon, assistant agricole
- Conversation en français, wolof ou anglais selon les capacités effectives du modèle.
- Accessible depuis chaque section; peut naviguer, lancer une simulation, rechercher les marchés, expliquer un résultat et préremplir une annonce.
- Les outils sont une liste d’actions autorisées côté application. L’assistant ne peut ni publier une annonce ni envoyer un message.
- La conversation et le contexte restent en mémoire de la page courante. Les coordonnées sont masquées avant envoi à l’API et ne sont pas demandées par l’assistant.
- Sans clé serveur, l’interface indique explicitement **Démo locale · sans modèle IA**; ces réponses proviennent de l’ancienne base de connaissances.

### Modèle et fournisseur

L’API serveur utilise **Gemini 3.8 Flash** (`gemini-3.8-flash`) et son function calling via `POST /api/assistant`. La route est un module Node serverless reconnu automatiquement par Vercel. Le fournisseur est isolé dans la route pour permettre d’ajouter un adaptateur xAI sans modifier l’interface ni les actions.

Comparaison consultée le 27 septembre 2026 :

| Fournisseur | Fonctionnalités et coût texte | Déploiement |
| --- | --- | --- |
| Gemini 3.8 Flash | Function calling; 0,75 $ / million tokens entrants et 3,75 $ / million sortants sur le niveau payant jusqu’au 31 décembre 2026. Quotas gratuits variables selon le compte. | API REST directement accessible depuis la fonction Vercel; choisi pour le coût et la configuration simple. |
| Grok 4.7 (xAI) | Function calling via API; 2 $ / million tokens entrants et 6 $ / million sortants sous 200k tokens. Compte et facturation xAI nécessaires. | Compatible, mais nécessite un adaptateur et un secret xAI séparés. |

Pour une utilisation de production, configurer une clé et le niveau payant Gemini : la documentation indique que le contenu du niveau gratuit peut être utilisé pour améliorer les produits Google, contrairement au niveau payant. Les tarifs et quotas sont susceptibles d’évoluer.

Variables à définir dans les paramètres de projet Vercel :

```text
GEMINI_API_KEY=<clé secrète Google AI Studio>
GEMINI_MODEL=gemini-3.8-flash
AI_PROVIDER=gemini
```

La clé ne doit jamais être ajoutée au dépôt, au HTML ou au JavaScript client. L’API limite les requêtes par instance, borne la taille du fil et applique un délai maximal; les quotas de compte Gemini restent également applicables. Pour un débit public élevé, remplacer la limite mémoire par une limite distribuée (par exemple Vercel KV/Redis).

---

## 🧪 Lancement des Tests

Pour vérifier l'intégrité de l'application, des modules et des calculs :

```bash
node test_suite.js
node test_assistant_api.js
```

### Éléments vérifiés par la suite de tests :
- ✅ Intégrité du fichier `index.html` (zéro script ou style inline).
- ✅ Présence et liaison des 3 feuilles CSS (`themes.css`, `style.css`, `responsive.css`).
- ✅ Présence et liaison des 9 modules JS dans l'ordre strict des dépendances.
- ✅ Validation syntaxique de tous les modules JS.
- ✅ Correspondance à 100% de tous les identifiants DOM (`id="..."`).
- ✅ Algorithme de transport kilométrique (`calcTransport`).
- ✅ Modèle de simulation des ventes pour denrées durables (oignon) et périssables (tomate).
- ✅ Détection et réponses multilingues du conseiller (FR, Wolof, EN, négociation).
- ✅ Cycle d'initialisation complet `initApp()`.
- ✅ Mode sans clé, validation des entrées, réponse d’outil autorisée, rejet d’outil inconnu et gestion du 429 de l’API.

---

## 💻 Guide de Lancement

### Option 1 : Directement dans le navigateur
Double-cliquez sur `index.html` ou ouvrez-le avec votre navigateur favori (Chrome, Edge, Firefox, Safari).

### Option 2 : Avec un serveur local (recommandé pour une démonstration)
```bash
# Avec Python
python -m http.server 3000

# Ou avec Node.js
npx serve .
```
Puis accédez à `http://localhost:3000`.

Ce serveur statique ne fournit pas la fonction IA Vercel : le Conseiller y reste en mode démo local. Pour tester la route localement, installer/configurer Vercel CLI et lancer `vercel dev` avec les variables ci-dessus dans l’environnement.

---

## 🎨 Caractéristiques UX/UI
- **Design System** soigné inspiré de la tech agricole moderne (teintes vertes émeraude, ambre solaire).
- **Thème Sombre / Clair** commutable à tout moment via le bouton en haut à droite.
- **Mise en page adaptative** avec navigation adaptée aux écrans tactiles et larges, sans mode de prévisualisation d’appareil.
- **Assistant agricole SunuCompagnon** disponible depuis les sections, avec Gemini côté serveur ou un mode local signalé sans ambiguïté.
- **Préparation PWA** : manifeste et cache local de l'application. Le service worker fonctionne sur `localhost` ou une origine HTTPS, pas en ouvrant directement le fichier HTML.
- **Utilisation hors connexion** : après une première ouverture en ligne et l’activation du service worker, l’application, ses calculs, l’Observatoire, le profil local, le Conseiller local et les ressources visuelles restent accessibles. Gemini distant et l’ouverture de WhatsApp nécessitent une connexion.
- **Installation PWA** : le bouton Installer n’apparaît que si le navigateur fournit son invite native et disparaît après installation. Sur les navigateurs sans cette invite, utiliser l’installation proposée par le navigateur.
- **Compte local** : inscription, connexion et édition du profil fonctionnent hors ligne sur le même appareil. Le mot de passe est haché avec PBKDF2; ce n’est pas une authentification serveur, il n’y a ni vérification d’e-mail ni synchronisation entre appareils. Effacer les données du navigateur supprime les comptes locaux.
- **Zéro dépendance de compilation** : 100% Vanilla HTML5, CSS3 et JavaScript ES6+.
