# PassLoyal OS — Middle East Localization Guide

**Scope:** Bilingual (Arabic RTL / English LTR) architecture, typography, regional data, and market localization for PassLoyal OS (oloyal).
**Audience:** Engineering, product, and localization reviewers; also the reference for bilingual content maintenance.

---

## 1. Bilingual architecture

PassLoyal OS is built for the **Middle East market** (Jordan and the wider Middle East) with **dual Arabic (RTL) and English (LTR)** as a first-class standard. The platform must support dual Arabic and English across all customer-facing and merchant-facing surfaces.

### 1.1 Supported languages

| Code | Direction | Language | Notes |
|---|---|---|---|
| `ar` | RTL | Arabic | Default for the Middle East market (`getInitialLanguage`) |
| `en` | LTR | English | Fallback language for any missing key |

- Language type: `SupportedLanguage = 'ar' | 'en'` (`src/utils/i18n.ts`).
- Persisted in `localStorage` under key `passloyal_language`.
- Default when nothing is saved: **`ar`** (Middle East market default).
- Missing translation keys fall back to the English value (`translations[lang]?.[key] || translations['en']?.[key] || key`).
- Direction is applied to the document root:

```ts
document.documentElement.lang = lang;              // 'ar' | 'en'
document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
```

- Language switch dispatches a `passloyal_language_changed` window event so views can react live.

### 1.2 UI text source

- Single source object: `const translations = { en: { ... }, ar: { ... } }` in `src/utils/i18n.ts`.
- Keys are consumed through the `useI18n()` hook (`t(key)`) and returned alongside `lang`, `isRtl`, `toggleLanguage`, `setLanguage`, `currencies`, `countries`.

### 1.3 RTL behavior

- Arabic sets `dir="rtl"` and `lang="ar"` on `<html>`; English sets `dir="ltr"` / `lang="en"`.
- Layout mirrors use explicit logical-property overrides, e.g. `pl-28 lg:pl-32 pr-6 rtl:pl-6 rtl:pr-28 lg:rtl:pr-32`.

---

## 2. Typography

### 2.1 Font families

| Language | Primary font stack |
|---|---|
| English (LTR) | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` |
| Arabic (RTL) | `'Cairo', 'IBM Plex Sans Arabic', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif` |

### 2.2 Font loading

Fonts are loaded via Google Fonts in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
```

| Font | Weights | Usage |
|---|---|---|
| **Inter** | 300, 400, 500, 600, 700, 800 | Latin / English UI text |
| **Cairo** | 400–900 | Arabic display/body text |
| **IBM Plex Sans Arabic** | 400, 500, 600, 700 | Arabic body text fallback |
| **Material Symbols Outlined** | 100–700 | Iconography |

### 2.3 Font-family rules (`src/index.css`)

```css
html, body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

html[dir="rtl"], html[lang="ar"], [dir="rtl"] {
  font-family: 'Cairo', 'IBM Plex Sans Arabic', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

> **Rule for new UI:** never hardcode a single font family for Arabic copy. Arabic surfaces must resolve through the Cairo → IBM Plex Sans Arabic → Inter stack, and Latin surfaces through Inter.

---

## 3. Regional data — countries, dial codes, and currencies

All regional data is centralized in `src/utils/i18n.ts`.

### 3.1 Middle East country dial codes

| Code | Dial code | English name | Arabic name | Flag | Phone placeholder |
|---|---|---|---|---|---|
| SA | `+966` | Saudi Arabia | المملكة العربية السعودية | 🇸🇦 | `50 123 4567` |
| AE | `+971` | United Arab Emirates | الإمارات العربية المتحدة | 🇦🇪 | `50 123 4567` |
| JO | `+962` | Jordan | الأردن | 🇯🇴 | `7 9123 4567` |
| KW | `+965` | Kuwait | الكويت | 🇰🇼 | `9123 4567` |
| QA | `+974` | Qatar | قطر | 🇶🇦 | `3312 3456` |
| BH | `+973` | Bahrain | البحرين | 🇧🇭 | `3612 3456` |
| OM | `+968` | Oman | سلطنة عُمان | 🇴🇲 | `9123 4567` |
| EG | `+20` | Egypt | مصر | 🇪🇬 | `10 1234 5678` |
| INTL | `+` | International | دولي | 🌐 | Country code & number |

### 3.2 Regional currencies

| Currency code | Symbol (EN / AR) | English name | Arabic name |
|---|---|---|---|
| SAR | SAR / ر.س | Saudi Riyal | ريال سعودي |
| AED | AED / د.إ | UAE Dirham | درهم إماراتي |
| KWD | KWD / د.ك | Kuwaiti Dinar | دينار كويتي |
| JOD | JOD / د.أ | Jordanian Dinar | دينار أردني |
| QAR | QAR / ر.ق | Qatari Riyal | ريال قطري |
| BHD | BHD / د.ب | Bahraini Dinar | دينار بحريني |
| OMR | OMR / ر.ع | Omani Rial | ريال عُماني |
| EGP | EGP / ج.م | Egyptian Pound | جنيه مصري |
| USD | $ / $ | US Dollar | دولار أمريكي |

---

## 4. Localization checklist for new features

1. Add the key to both the `en` and `ar` translation objects (same key, different string).
2. Never leave Arabic copy untranslated; the fallback is English, which is acceptable only for developer-facing strings.
3. Use logical layout properties or explicit `rtl:` overrides so layouts mirror correctly.
4. Use font stacks from §2.1 for both scripts; verify Arabic rendering in Cairo / IBM Plex Sans Arabic.
5. Keep dial-code + currency selection in mind for any new market entry (see `MIDDLE_EAST_COUNTRIES` and `REGIONAL_CURRENCIES`).
6. Update both language objects when the wording changes; run a manual visual check in both directions.

---

*Part of the PassLoyal OS documentation set: [api-reference.md](./api-reference.md) · [merchant-guide.md](./merchant-guide.md)*
