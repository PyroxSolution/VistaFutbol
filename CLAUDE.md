# VistaFútbol — Contexto del Proyecto

> Documento vivo. Actualizar cada vez que se tomen decisiones importantes o se completen milestones. Léelo PRIMERO al retomar el proyecto en cualquier sesión.

---

## 🎯 ¿Qué es esto?

**VistaFútbol** es una PWA que permite a personas con discapacidad visual **jugar fútbol real** (no virtual) usando únicamente su celular como "ojos". El celular en el pecho del jugador usa visión por computadora para detectar el balón y la portería, y traduce esa información a **audio espacial 3D + vibración háptica** que el jugador escucha por audífonos, permitiéndole caminar, patear y meter gol guiado por IA.

**Frase de venta:** *"Pon tu celular en el pecho, ponte los audífonos. La IA es tus ojos. Tú juegas fútbol de verdad."*

---

## 🏆 Contexto del hackatón

- **Evento:** Hackatón de Innovación Inclusiva — "Ideas que abren la cancha"
- **Organizadores:** Secretaría de Participación Ciudadana + FACULTY OF EXCELLENCE (Tec de Monterrey) + equipo BLINDados
- **Fecha:** Sábado 16 de mayo de 2026
- **Reto:** Diseñar soluciones tecnológicas de bajo costo que transformen el fútbol en un deporte sin barreras para personas con discapacidad visual.
- **Objetivo personal:** GANAR el hackatón.

---

## 👥 Equipo

- **3 personas** en total (incluido el usuario, dueño del repo)
- División de roles propuesta:
  - **Persona A — Visión & Detección:** TF.js + COCO-SSD, fallback HSV, ArUco, geometría bbox→polar
  - **Persona B — Audio & Voz:** Web Audio HRTF, TTS español, sonidos, háptica
  - **Persona C — Gameplay & UI:** Máquina de estados, integración, UI, pitch, demo

---

## 📱 Target de dispositivos

- **Primario:** Android (Chrome) — soporte completo: cámara, audio espacial, vibración háptica
- **Backup:** iPhone (Safari) — sin vibración, audio espacial requiere workaround (`AudioContext` user-gesture init)
- Detectar plataforma con `usePlatformCapabilities()` y degradar features con fallback de audio click cuando no hay vibración.

---

## 🛠️ Stack tecnológico (decisiones finales)

| Capa | Tecnología | Razón |
|---|---|---|
| Framework | Vite + React + TypeScript | Más ligero que Next.js, hot reload instantáneo, PWA fácil |
| Estilos | Tailwind CSS | UI mínima decente en minutos |
| Visión IA | TensorFlow.js + `@tensorflow-models/coco-ssd` | Pre-entrenado, clase `sports ball` lista |
| Detección plan B | OpenCV.js + filtro HSV (rango naranja) | 100% confiable si TF.js falla |
| Portería | `js-aruco2` (marcador ArUco impreso) | Detección perfecta en cualquier luz |
| Audio espacial | Web Audio API → `PannerNode` con HRTF | Audio 3D real, cross-platform |
| Voz (TTS) | Web Speech API (`SpeechSynthesis`, voz `es-MX`) | Cero costo, cero latencia |
| Háptica | `navigator.vibrate()` | Solo Android — fallback audio click en iOS |
| Orientación | `DeviceOrientation` API | Compensar movimiento del cuerpo |
| Estado de juego | XState + `@xstate/react` | Máquina de estados clara para gameplay loop |
| Deploy | Vercel (free tier) | HTTPS automático (cámara lo requiere) |
| Repo | GitHub (cuenta: `PyroxSolution`) | Open-source para mostrar al jurado |

**Lo que NO usamos y por qué:**
- ❌ Next.js → overhead innecesario para PWA simple
- ❌ Backend propio → todo corre en cliente
- ❌ Modelo CV custom entrenado → no hay tiempo
- ❌ Bluetooth audio → latencia mata el demo (audífonos cableados obligatorios)
- ❌ React Native → PWA es más rápida de desplegar y permite demo con QR

---

## 🏗️ Arquitectura

```
PWA (celular jugador)
├─ useCamera()      → stream getUserMedia
├─ useDetector()    → TF.js COCO-SSD (ball) + HSV fallback + ArUco (portería)
├─ bboxToPolar()    → bbox → (θ ángulo, r distancia)
├─ GameStateMachine → SEARCHING_BALL → APPROACHING → KICK → SEARCHING_GOAL → GOAL!
└─ Outputs:
   ├─ SpatialAudio (PannerNode HRTF)
   ├─ TTS español ("balón a 2 metros, dirección 3")
   └─ Vibration (intensidad por proximidad)

Modo Entrenador (bonus, solo si M1-M10 ya están listos)
└─ Dashboard web /coach → WebRTC peer-to-peer → ve cámara jugador + manda voz
```

---

## 📁 Estructura de carpetas (objetivo)

```
HACKMTYVISTAFUTBOL/
├── CLAUDE.md                    # este archivo
├── README.md                    # pitch + cómo correr
├── public/
│   ├── aruco-marker.pdf
│   ├── icons/
│   └── sounds/
│       ├── goal-celebration.mp3
│       ├── kick.mp3
│       └── proximity-beep.mp3
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── CameraView.tsx
│   │   ├── GameHUD.tsx
│   │   └── CalibrationScreen.tsx
│   ├── hooks/
│   │   ├── useCamera.ts
│   │   ├── useDetector.ts
│   │   ├── useArUco.ts
│   │   ├── useSpatialAudio.ts
│   │   ├── useTTS.ts
│   │   ├── useGameState.ts
│   │   └── usePlatformCapabilities.ts
│   ├── lib/
│   │   ├── geometry.ts          # bbox → polar
│   │   ├── detector-tfjs.ts
│   │   ├── detector-hsv.ts
│   │   └── narration.ts
│   ├── state/
│   │   └── gameMachine.ts
│   └── types.ts
├── vite.config.ts               # PWA plugin + HTTPS
├── tailwind.config.js
└── package.json
```

---

## 📅 Milestones

| # | Milestone | Tiempo | Owner sugerido | Status |
|---|---|---|---|---|
| M0 | Setup repo + Vite + Vercel + dev server | 30 min | Todos | 🔄 EN PROGRESO |
| M1 | Cámara funcionando en celular real (HTTPS) | 45 min | C | Pendiente |
| M2 | TF.js detecta `sports ball` en vivo | 2 h | A | Pendiente |
| M3 | bbox → coordenadas polares (θ, r) | 30 min | A | Pendiente |
| M4 | Audio espacial 3D con PannerNode | 1.5 h | B | Pendiente |
| M5 | TTS español funcional | 45 min | B | Pendiente |
| M6 | Detección de portería con ArUco | 1 h | A | Pendiente |
| M7 | Máquina de estados (gameplay loop) | 1.5 h | C | Pendiente |
| M8 | Háptica + sonidos celebración | 45 min | B | Pendiente |
| M9 | UI mínima + landing + QR | 1 h | C | Pendiente |
| M10 | Ensayar demo + video respaldo | 1 h | Todos | Pendiente |

**MVP mínimo demoable:** M0 + M1 + M2 + M3 + M4 + M5 (~6h).

---

## 🎒 Checklist físico para el sábado

- [ ] ⚽ Balón naranja brillante mate (NO reflectante)
- [ ] 📱 Porta-celular deportivo (arnés de pecho)
- [ ] 🔺 2 conos pequeños O caja con ArUco impreso
- [ ] 🎧 Audífonos **cableados** (NO Bluetooth)
- [ ] 📄 Marcador ArUco impreso en hoja blanca
- [ ] 🧣 Antifaz/vendas para vendar al juez
- [ ] 🔌 Cargador + powerbank
- [ ] 💡 Lámpara LED (opcional, por si la sala está oscura)

---

## 🎤 Estructura del pitch (3 min)

1. **Problema (15s):** 2.2M mexicanos con discapacidad visual. Fútbol B1 cuesta ~$2,000 USD. 99% nunca jugará.
2. **Pregunta (20s):** ¿Y si el celular que ya tiene fuera sus ojos?
3. **DEMO EN VIVO (90s):** Juez vendado, mete gol guiado por IA.
4. **Cómo (30s):** CV + audio espacial 3D + IA. Todo en navegador. $0 hardware extra.
5. **Cierre (25s):** Open source desde hoy. "La cancha cabe en un bolsillo."

---

## ⚠️ Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| TF.js no detecta balón en cancha | Fallback HSV automático (color naranja siempre detectable) |
| Wifi del hackatón muere | PWA con todo cached, modelo descargado al cargar, funciona offline |
| Audio espacial no se percibe | Audífonos propios cableados, no Bluetooth |
| Demo no funciona en vivo | Video de 60s pre-grabado como respaldo |
| Falta tiempo | MVP mínimo de M0-M5 ya es demoable y ganador |

---

## 🎯 Reglas de oro (no las rompas)

1. **Scope tight.** No agregar features. Lo que está aquí es lo que hay.
2. **MVP funcional > features lindos.** Si M2-M5 funcionan, ya ganamos.
3. **Demo a prueba de balas.** Video respaldo, balón propio, audífonos propios, marker propio.
4. **Validar lo más arriesgado primero.** M2 (CV) y M4 (audio espacial) son los riesgos. Atacarlos antes.
5. **Cero código antes del sábado** del producto en sí. Solo setup, prep y research.

---

## 📌 Decisiones tomadas (log)

- **2026-05-14:** Plan inicial aprobado. Stack: Vite + React + TS + Tailwind + TF.js + Web Audio. PWA, no nativa.
- **2026-05-14:** Equipo de 3. Target Android primario, iPhone backup.
- **2026-05-14:** Nombre oficial: **VistaFútbol**.
- **2026-05-14:** Repo se crea desde cero con `gh` CLI (cuenta `PyroxSolution`).

---

## 🔗 Enlaces importantes

- Repo GitHub: _(pendiente — se crea en M0)_
- Deploy Vercel: _(pendiente — link después de M0)_
- Devpost / submission: _(pendiente)_

---

## 💡 Notas para Claude (instrucciones de trabajo)

- El usuario es no-técnico-pesado; explica decisiones técnicas brevemente cuando importen.
- El usuario dio acceso total: **no pidas permisos absurdos** para operaciones seguras (npm install, crear archivos, scaffolding, commits).
- Prefiere acciones concretas sobre teorización. Ejecuta primero, explica después.
- Idioma del producto y comentarios de pitch: **español mexicano**.
- Idioma del código y commits: inglés (estándar dev).
- Mantén CLAUDE.md actualizado al cerrar cada milestone.

### ⚠️ Regla cero: que NO se vea hecho con IA

Esto se va a presentar en hackatón. Si los jueces o el equipo huelen "esto lo escribió un LLM", se pierde credibilidad.

- **Diseño UI:** Nada de "card centrada en fondo negro" genérico de Tailwind. Layouts asimétricos, jerarquía tipográfica agresiva (contraste de pesos/tamaños), alineación a bordes, espacio negativo intencional. Tomar postura, no el default seguro.
- **Commits:** Cortos, lowercase, casuales. Sin prefijos `feat:`/`chore:`/`fix:` salvo que ya se usen. Sin cuerpos con bullets largos. **Sin `Co-Authored-By: Claude` footer** — es el indicador #1. Ejemplo bueno: `add camera + permission flow`. Ejemplo malo: `feat: implement camera access via getUserMedia API with comprehensive error handling`.
- **Comentarios en código:** Mínimos. No expliques lo que un nombre de variable ya dice. Cero banners de sección.
- **READMEs:** Concisos. Cero tablas exhaustivas, cero secciones con emojis-header en proyectos chicos.

Antes de escribir cualquier UI o commit, pregúntate: *"¿un dev cansado a las 2am escribiría esto, o huele a plantilla?"*
