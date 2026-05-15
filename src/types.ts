export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface Detection {
  bbox: BoundingBox
  score: number
  class: string
}

export interface PolarCoord {
  angle: number
  distance: number
}

export type GameState =
  | 'IDLE'
  | 'CALIBRATING'
  | 'SEARCHING_BALL'
  | 'APPROACHING_BALL'
  | 'KICK_READY'
  | 'KICK'
  | 'SEARCHING_GOAL'
  | 'APPROACHING_GOAL'
  | 'GOAL'

export interface PlatformCapabilities {
  hasVibration: boolean
  hasSpatialAudio: boolean
  hasDeviceOrientation: boolean
  isIOS: boolean
  isAndroid: boolean
}
