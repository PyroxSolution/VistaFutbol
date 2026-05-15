# VistaFútbol

Una PWA que convierte el celular en los ojos de una persona ciega para que pueda jugar fútbol real, no virtual.

El jugador se pone el celular en el pecho con un arnés y los audífonos. La cámara detecta el balón y la portería con IA, y traduce esa info a audio espacial 3D y vibración. Camina, patea, mete gol. Cero hardware extra.

Hecho para el Hackatón de Innovación Inclusiva — Tec de Monterrey, 16 de mayo 2026.

## Correr en local

```
npm install
npm run dev
```

Vite levanta un servidor HTTPS (necesario para cámara en móvil). Abre la URL `Network` que sale en consola desde tu celular, en el mismo wifi. Acepta el warning del certificado autofirmado la primera vez.

## Stack

Vite · React · TypeScript · Tailwind · TensorFlow.js (COCO-SSD) · Web Audio API (PannerNode HRTF) · Web Speech API · PWA.

## Roadmap

- [x] M0 — setup
- [ ] M1 — cámara
- [ ] M2 — detección de balón (TF.js + fallback HSV)
- [ ] M3 — geometría bbox→polar
- [ ] M4 — audio espacial 3D
- [ ] M5 — TTS español
- [ ] M6 — detección de portería (ArUco)
- [ ] M7 — máquina de estados del juego
- [ ] M8 — háptica + sfx
- [ ] M9 — UI final
- [ ] M10 — ensayo demo
