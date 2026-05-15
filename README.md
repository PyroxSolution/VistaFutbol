# VistaFútbol

PWA que convierte el celular en los ojos de una persona ciega para que pueda jugar fútbol real. No simulación, no videojuego — el jugador camina, patea y mete gol en el mundo físico.

Hackatón de Innovación Inclusiva — Tec de Monterrey · 16 de mayo 2026.

## Cómo funciona

Pones el celular en un arnés sobre el pecho, los audífonos cableados, y vendas los ojos (o ya eres ciego). La cámara trasera apunta al frente.

1. **Busca el balón** — la voz te dice "busca el balón". Empiezas a girar el cuerpo.
2. **Detección** — cuando la IA ve el balón, escuchas un pulso espacial 3D en el oído del lado donde está. Más cerca = más rápido = más agudo.
3. **Acércate** — cada 3.5 segundos la voz dice algo como *"balón a 2 metros, hora 3"* (hora del reloj: h12 = de frente, h3 = derecha).
4. **Patea** — al estar a menos de medio metro vibra el celular y dice "patea ahora".
5. **El tiro** — cuando el balón sale del campo de visión, el celular suena un golpe grave y dice "buen tiro".
6. **Busca la portería** — un marcador cyan (papel azul-turquesa pegado en dos conos) sirve de portería. La voz cambia: "busca la portería".
7. **GOL** — cuando llegas a menos de 70 cm de la portería, fanfare ascendente + vibración de victoria + pantalla naranja con "GOL".

## Setup físico para el demo

| Item | Detalle |
|---|---|
| Balón | Naranja brillante mate (Soriana / Walmart) |
| Portería | 2 conos + papel cyan/turquesa pegado encima |
| Arnés | Porta-celular deportivo de pecho |
| Audífonos | **Cableados**, no Bluetooth (latencia mata el efecto 3D) |
| Vendas | Antifaz o pañuelo |
| Cancha | 3×4 metros de espacio despejado, iluminación decente |

## Correr en local

```
npm install
npm run dev
```

Vite levanta servidor HTTPS (cámara lo exige en móvil). Abre la URL `Network` desde el celular en el mismo WiFi. La primera vez, acepta el warning del certificado autofirmado.

## Stack

Vite · React · TypeScript · Tailwind · TensorFlow.js (COCO-SSD `lite_mobilenet_v2`) · HSV color fallback · Web Audio API (PannerNode HRTF) · Web Speech API (SpeechSynthesis es-MX) · Vibration API · PWA con service worker.

Cero backend. Cero hardware extra. Todo corre en el navegador del jugador.

## Estructura

```
src/
├── App.tsx                       welcome screen + init audio
├── components/
│   ├── CameraView.tsx            integra todo: cámara, detector, audio, juego
│   ├── DetectionOverlay.tsx      canvas con bboxes ball + goal
│   └── GoalCelebration.tsx       overlay naranja "GOL"
├── hooks/
│   ├── useCamera.ts              getUserMedia + errores en español
│   ├── useDetector.ts            tf.js coco-ssd + fallback hsv (balón + portería)
│   ├── useSpatialAudio.ts        wrapper del engine HRTF
│   ├── useTTS.ts                 wrapper del engine de voz
│   └── useGameState.ts           hook de la FSM con side effects
├── lib/
│   ├── audio-engine.ts           PannerNode HRTF, blips, fanfare, ducking
│   ├── tts-engine.ts             SpeechSynthesis con cola y prioridades
│   ├── detector-hsv.ts           detector HSV (naranja + cyan)
│   ├── geometry.ts               bbox → polar (ángulo, distancia)
│   ├── narration.ts              frases en español
│   └── haptics.ts                wrapper de navigator.vibrate
└── state/
    └── gameMachine.ts            FSM pura: 8 estados, transiciones
```

## La máquina de estados

```
idle
  ↓ (cámara + modelo listos)
ball:search ──→ ball:approach ──→ ball:kick-ready ──→ ball:kicked
                  (ball detected)   (dist < 0.55m)      (ball lost > 700ms)
                                                          ↓ (1.2s hold)
                                                        goal:search
                                                          ↓ (goal detected)
                                                        goal:approach
                                                          ↓ (dist < 0.7m)
                                                        goal:reached
                                                          ↓ (4.5s hold)
                                                        ball:search (reset)
```

## Lo que no hace (todavía)

- Modo entrenador remoto (WebRTC) — pendiente si hay tiempo
- Detección de portería con ArUco (más robusta que HSV cyan en luz variable)
- Calibración por usuario de altura del celular / FOV
- Persistencia de scores

## Licencia

MIT. Replícalo, mejóralo, mándalo a quien lo necesite.
