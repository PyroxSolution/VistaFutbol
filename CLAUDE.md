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

## 📁 Estructura real (la que existe hoy)

```
HACKMTYVISTAFUTBOL/
├── CLAUDE.md
├── README.md
├── public/icons/ + favicon.svg
├── src/
│   ├── main.tsx · App.tsx · types.ts
│   ├── components/
│   │   ├── CameraView.tsx         integra cámara + detector + audio + FSM + HUD
│   │   ├── DetectionOverlay.tsx   canvas con bboxes (ball naranja, goal cyan)
│   │   └── GoalCelebration.tsx    overlay "GOL" pop-in
│   ├── hooks/
│   │   ├── useCamera.ts           getUserMedia con resolución elegible
│   │   ├── useDetector.ts         fusión COCO + HSV, tracking, EMA smoothing
│   │   ├── useSpatialAudio.ts     wrapper del engine HRTF
│   │   ├── useTTS.ts              wrapper (no se usa directamente, expone API)
│   │   ├── useGameState.ts        FSM hook con histéresis + narración
│   │   └── usePlatformCapabilities.ts
│   ├── lib/
│   │   ├── geometry.ts            bbox→polar, directionLabel
│   │   ├── detector-hsv.ts        HSV 240×180, BFS componentes conexas, scoring circular
│   │   ├── audio-engine.ts        PannerNode HRTF, blip, kick SFX, goal fanfare
│   │   ├── tts-engine.ts          SpeechSynthesis con prime + watchdog + blip mute
│   │   ├── haptics.ts             navigator.vibrate
│   │   └── narration.ts           frases reusables (poco usado actualmente)
│   └── state/
│       └── gameMachine.ts         FSM pura, 8 estados, hysteresis frames
├── vite.config.ts                 PWA + basic-ssl + workbox 50MB cache
├── tailwind.config.js             color cancha-500, animaciones fade-up / pop-in
└── package.json
```

Lo que el plan inicial mencionaba y NO existe: `useArUco`, `GameHUD`, `CalibrationScreen`, `detector-tfjs.ts` (la detección TF.js vive directo en `useDetector.ts`).

---

## 📅 Milestones

| # | Milestone | Status |
|---|---|---|
| M0 | Setup repo + Vite + Vercel + dev server | ✅ |
| M1 | Cámara funcionando en celular real (HTTPS) | ✅ |
| M2 | TF.js detecta `sports ball` + HSV fallback | ✅ |
| M3 | bbox → coordenadas polares (θ, r) | ✅ |
| M4 | Audio espacial 3D con PannerNode HRTF | ✅ |
| M5 | TTS español con cola y ducking | ✅ |
| M6 | Detección de portería (HSV cyan, ArUco descartado) | ✅ |
| M7 | Máquina de estados (8 estados, FSM pura) | ✅ |
| M8 | Háptica (`navigator.vibrate`) + SFX (kick + goal fanfare) | ✅ |
| M9 | UI: state badge, goal celebration overlay, dual bbox | ✅ |
| M10 | README final con guía de demo | ✅ |
| M11 | Hardening detector: BFS componentes conexas + circularidad + texture variance | ✅ |
| M12 | Fix TTS iOS Safari: prime + watchdog + mute blip durante voz | ✅ |
| M13 | FSM con histéresis (closeFrames, dwell, grace) — elimina falsos kicked | ✅ |
| M14 | Narración con direction labels (izq/frente/der) en lugar de hora reloj | ✅ |
| M15 | Selector de calidad de cámara (rendimiento/balance/calidad) | ✅ |
| M16 | Botón reset + subtítulos del jurado en HUD | ✅ |

**Decisión M6:** Se descartó ArUco (js-aruco2) por simplicidad. La portería se detecta con un papel/cartón cyan/turquesa (hue 160-210°). Misma pipeline HSV que el balón, sin nuevas dependencias.

**Pendiente / no atacado para MVP:**
- Modo entrenador WebRTC
- ArUco para portería en luz variable
- Calibración FOV por usuario (hoy fijo en 65°)
- Acelerómetro para detectar patada real (hoy usa heurística de "balón desapareció")

---

## 🔬 Estado actual del pipeline (resumen técnico para retomar)

### Detector ([useDetector.ts](src/hooks/useDetector.ts) + [detector-hsv.ts](src/lib/detector-hsv.ts))

- **COCO-SSD** corre con base `mobilenet_v2` (no la lite — más accuracy, ~13MB).
- **Solo acepta clase `sports ball`**. Las clases extra (`frisbee`, `apple`, `orange`, `donut`) se quitaron porque generaban falsos positivos sobre plantas y muebles.
- **Threshold COCO**: `COCO_MIN_SCORE = 0.32`. Si score ∈ [0.32, 0.55] requiere overlap (IoU ≥ 0.18) con un blob HSV en el mismo lugar. Si score ≥ 0.55, COCO solo basta.
- **HSV** trabaja sobre downsample 240×180 con dos máscaras separadas:
  - `COLORFUL` (saturación ≥ 0.35, valor ≥ 0.3) — captura parches rojo/azul del balón Voit.
  - `BRIGHT` (saturación ≤ 0.3, valor ≥ 0.7) — fallback estricto para balones blancos.
  - Cada máscara: dilatación 1 píxel → **BFS de componentes conexas** → scoring por **circularidad** `count/(π/4·bw·bh)` ≥ 0.55, **aspect ratio** 0.62–1.62, **centroide** dentro del 18% del centro del bbox.
  - **Texture variance check**: rechaza blobs con luminance variance < 120 (paredes lisas).
- Cuando COCO y HSV coinciden (IoU ≥ 0.18) los bboxes se **fusionan** (65% COCO + 35% HSV).
- **Tracking con hold + EMA**: si un tick falla detectar, mantiene el último bbox (suavizado α=0.5) por 320 ms antes de soltar el track. Decay del score con la edad.
- Cámara configurable (854×480 / 1280×720 / 1920×1080) desde el splash.

### Geometría ([geometry.ts](src/lib/geometry.ts))

- `FOV_HORIZONTAL_DEG = 65` (asunción genérica, no calibrado por dispositivo).
- Distancia: `(0.22 m × focal_px) / min(bbox.width, bbox.height)`. Usa el lado **menor** para evitar inflación por sombras.
- `directionLabel(angle)`: devuelve "al frente" / "media izquierda" / "a la izquierda" / "media derecha" / "a la derecha" según el ángulo en grados.

### FSM ([gameMachine.ts](src/state/gameMachine.ts))

8 estados puros con histéresis basada en contadores de frames consecutivos (no en single-frame triggers):

- `ball:search → ball:approach`: requiere **3 frames** con ballPolar visible.
- `ball:approach → ball:kick-ready`: requiere **5 frames** consecutivos con distance < 0.5 m **y** dwell de 900 ms en approach.
- `ball:kick-ready → ball:kicked`: requiere **mínimo 1400 ms** en kick-ready **más** distancia > 1.8 m o ball perdido por > 2200 ms.
- `goal:approach → goal:reached`: requiere **4 frames** consecutivos con distance < 0.7 m.

Esto elimina los falsos "patea ahora" y los falsos "buen tiro" que aparecían con bbox inestables.

### TTS ([tts-engine.ts](src/lib/tts-engine.ts))

- `primeTTS()` se llama en el click "Empezar" — desbloquea SpeechSynthesis en iOS Safari con un utterance volumen 0.01.
- Durante TTS se llama `setBlipsMuted(true)` y `duckMaster(0.05)` — el blip se silencia totalmente para que la voz se oiga.
- **Watchdog**: si una frase debería haber terminado y `onend` no disparó (bug conocido de iOS), forzamos reset.
- Voz preferida: `es-MX` → `es-US` → `es-419` → `es-ES` → cualquier `es-*`.
- Rate 1.0, pitch 1.0, volume 1.0.

### Audio espacial ([audio-engine.ts](src/lib/audio-engine.ts))

- `AudioContext` + `PannerNode` HRTF + `GainNode` master.
- Loop de blips: intervalo 100 ms (cerca) → 800 ms (lejos), frecuencia 880 Hz → 330 Hz por distancia.
- Sin audífonos sigue funcionando (sale por altavoz / bluetooth) pero el efecto 3D se pierde — solo el volumen y la frecuencia comunican distancia.

### Sonidos de juego

Sintetizados con osciladores Web Audio, no archivos:
- **Kick**: square 120 Hz → 40 Hz, envelope 0.22 s.
- **Goal**: arpegio C-E-G-C ascendente, triangle wave, ~0.5 s.

---

## 🎒 Checklist físico para el sábado

- [ ] ⚽ Balón (Voit MS-5 blanco/rojo/azul confirmado funciona; cualquier balón con color saturado en parches sirve)
- [ ] 📱 Porta-celular deportivo (arnés de pecho)
- [ ] 📄 **Papel/fomi/cartulina cyan-turquesa** para portería (hue 160-210°, mínimo carta tamaño)
- [ ] 🎧 Audífonos **cableados** (sin ellos se pierde efecto 3D pero la voz funciona)
- [ ] 🧣 Antifaz/vendas para vendar al juez
- [ ] 🔌 Cargador + powerbank
- [ ] 💡 Lámpara LED (opcional, por si la sala está oscura)
- [ ] 📹 Video respaldo de 60s (NO grabado aún — pendiente)

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
| TF.js no detecta balón en cancha | Fusión con HSV (BFS + circularidad + texture variance). HSV agarra balones con parches saturados |
| Cancha tiene fondo blanco/gris similar al balón | Texture variance check rechaza áreas planas (varianza < 120). El COLORFUL mask agarra parches saturados aún sin BRIGHT |
| Luz cambia durante el demo (sombras del jurado, etc.) | Dos máscaras HSV separadas (COLORFUL + BRIGHT). Tracking con hold de 320ms suaviza pérdidas momentáneas |
| FSM se atasca o llega a un estado falso en vivo | Botón **reset** visible en HUD vuelve a `idle` → `ball:search` con voz nueva |
| TTS no se oye en iOS / bluetooth | Prime desde el gesto del usuario + mute total del blip durante voz + watchdog si `onend` no dispara |
| Wifi del hackatón muere | PWA cached (workbox 50MB). Modelo `mobilenet_v2` se descarga al cargar y queda en cache. Funciona offline tras primer load |
| Audio espacial no se percibe sin audífonos | La voz, el volumen y la frecuencia del blip siguen comunicando distancia. El splash advierte que "audífonos cableados > bluetooth > altavoz" |
| Demo no funciona en vivo | Video de 60s pre-grabado como respaldo (pendiente grabar) |
| FOV del celular distinto a 65° | Distancia estimada estará off-by-factor. Calibrar con cinta métrica a 1m, ajustar `FOV_HORIZONTAL_DEG` si dice ±20% |
| Falta tiempo | MVP funcional al cierre del 2026-05-15. M11–M16 (hardening) ya completos |

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
- **2026-05-15:** Detector reescrito tras pruebas con Voit MS-5 blanco/rojo/azul en luz mediocre. HSV ahora hace BFS de componentes conexas + circularidad + texture variance. COCO subido a `mobilenet_v2` completo (no lite). Solo acepta `sports ball`; las clases extras daban falsos positivos sobre plantas.
- **2026-05-15:** FSM rota → reescrita con **histéresis**. El bug era distancia mal estimada (bbox inflado por sombras) que disparaba kick-ready falso → kicked automático. Fix: `min(width, height)` en distancia + contadores de frames consecutivos + dwell mínimo de 1.4 s en kick-ready + grace de 2.2 s.
- **2026-05-15:** TTS no se oía en iOS Safari mientras el blip sonaba. Fix: `primeTTS()` desde el gesto del usuario + `setBlipsMuted(true)` durante TTS (silencio total, no solo ducking) + watchdog para `onend` que no dispara.
- **2026-05-15:** Narración cambiada de "hora 12" (estilo reloj) a "izquierda / al frente / derecha" — más natural y comprensible para un usuario ciego.
- **2026-05-15:** Selector de calidad de cámara (854/720p/1080p) en el splash, persistido en `localStorage`. Auto-sugiere 1080p para iPhone 14+.
- **2026-05-15:** Botón reset accesible en HUD para escape de estados atascados en el demo. Subtítulos grandes con la última frase TTS para que el jurado vidente pueda leer lo que oye el ciego.

---

## 🔗 Enlaces importantes

- Repo GitHub: https://github.com/PyroxSolution/VistaFutbol
- Deploy Vercel: https://vistafutbol.vercel.app (auto-deploy en push a main)
- Vercel project: pyroxsoftwares-6052s-projects/vistafutbol
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

### 🎨 Dirección visual actual

Negro · blanco · `cancha-500` (`#ff6b1a`) · `font-system` con pesos agresivos · mono para labels técnicos · viewfinder con brackets en cámara · brand mark = círculo outline + dot naranja centrado. El usuario explícitamente rechazó pivotear a paper/serif/editorial — quedarse en este lenguaje a menos que se pida cambio.
