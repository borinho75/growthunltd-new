# Growth Unltd. — Netlify Deploy

Statisches Multi-Page-Setup, keine Build-Step nötig. Einfach Ordner hochladen.

## Was drin ist

```
gu-netlify/
├── index.html              Homepage (Hero, Reboot, Wie wir arbeiten, Cases, Content, Team, CTA)
├── how-we-work.html        Arbeitsmodell (3 Bewegungen, Haltung, Für wen)
├── cases.html              Kemaro, EBP, Soeder
├── team.html               Boris + Marc, volle Bios
├── pricing.html            Diagnose / Transformation / Operating Rhythm
├── blog.html               Content-Hub, 12 Musterposts
├── styles.css              Shared styles
├── app.js                  Canvas-Animation + Signal-Check-Interaktion
├── images/
│   ├── boris-manhart.jpg
│   └── marc-pittner.jpg
├── llms.txt                LLM-Manifest
├── context.md              Langer Kontext-Pack für Agents
├── robots.txt              Crawler-Konfig
├── sitemap.xml             Alle 6 Seiten
├── _redirects              .html → clean URLs (301)
└── netlify.toml            Netlify-Config (Headers, Caching, Clean URLs)
```

## Deploy: Drei Wege

**1. Drag & Drop (schnellste Variante)**
- [app.netlify.com/drop](https://app.netlify.com/drop) öffnen
- Diesen Ordner (`gu-netlify`) reinziehen
- Fertig. Preview-URL kommt in 10 Sekunden.

**2. Netlify CLI**
```bash
cd gu-netlify
npx netlify-cli deploy --prod --dir .
```

**3. Git-Integration (empfohlen für laufenden Betrieb)**
- Ordnerinhalt in ein GitHub-Repo pushen
- In Netlify: *Add new site* → *Import from Git* → Repo wählen
- Build command: *(leer lassen)*
- Publish directory: `.`
- Deploy starten

## Custom Domain

Nach dem Deploy:
- *Domain settings* → *Add custom domain* → `growthunltd.com`
- DNS-Einträge bei Registrar anpassen (A/AAAA/CNAME, je nach Setup)
- Netlify stellt SSL automatisch (Let's Encrypt)

## URL-Muster nach Deploy

- `/` → Homepage
- `/how-we-work`, `/cases`, `/team`, `/pricing`, `/blog`
- `/llms.txt`, `/context.md` → LLM-Einstieg
- `/robots.txt`, `/sitemap.xml` → SEO

Die `.html`-Varianten redirecten automatisch auf die clean URLs.

## Änderungen

Alle Inhalte sind hardcoded in den HTML-Dateien. Für Text-Updates direkt im File editieren. Keine Datenbank, kein CMS, kein Build-Step.

## Content-Cadence (geplant)

Alle zwei Wochen ein neuer Post auf `/blog` — alternierend:
- **Human Signal / PMF** (Boris) — Buch-Kapitel in Kurzform
- **AI Tech** (Marc) — konkrete Werkzeug- und Workflow-Berichte

Für neuen Post: neuen `<a class="post">`-Block oben in `blog.html` einfügen, Copy im `index.html`-Teaser aktualisieren.
