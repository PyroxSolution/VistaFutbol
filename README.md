# 🦯⚽ VistaFútbol

> El primer entrenador-IA que permite a personas con discapacidad visual **jugar fútbol real** (no virtual) usando únicamente su celular como ojos.

**Hackatón de Innovación Inclusiva — Tec de Monterrey · 16 mayo 2026**

---

## ¿Qué es?

Una **PWA** que el jugador ciego lleva en el pecho (arnés de celular). La cámara del teléfono detecta el balón y la portería con IA, y traduce esa información a **audio espacial 3D** + **vibración háptica** que el jugador escucha por audífonos. El jugador camina, patea y mete gol en el mundo real, guiado por la IA.

```
🧑‍🦯 Persona ciega   →   📱 Celular en pecho   →   ⚽ Balón REAL
   (camina y patea)        (cámara + IA + audio)      (de hule, en parque)
```

## Stack

- Vite + React + TypeScript + Tailwind
- TensorFlow.js + COCO-SSD (detección de balón)
- Filtro HSV (fallback de detección por color)
- ArUco markers (detección de portería)
- Web Audio API + PannerNode (audio espacial 3D HRTF)
- Web Speech API (TTS en español)
- Navigator.vibrate (háptica)
- PWA deployable en Vercel

## Correr en local

```powershell
npm install
npm run dev
```

Vite expone la URL en tu red local (ej. `https://192.168.x.x:5173`). Abre esa URL en tu celular (mismo wifi) para probar la cámara. **Requiere HTTPS** — el certificado autofirmado lo genera `@vitejs/plugin-basic-ssl` (acepta el warning del navegador la primera vez).

## Equipo

- 3 personas
- Roles: Visión & Detección · Audio & Voz · Gameplay & UI

## Licencia

MIT — open source para que cualquiera lo replique y mejore.
