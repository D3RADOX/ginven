## PhysicsConfig.gd
## Autoload singleton — all tunable physics constants live here.
## Change any value here to immediately affect game feel.
extends Node

# ──────────────────────────────────────────────────────────────────────────
#  BALL
# ──────────────────────────────────────────────────────────────────────────
const BALL_RADIUS         : float = 15.0   # pixels
const BALL_MASS           : float = 0.8    # kg (affects impulse response)
const BALL_BOUNCE         : float = 0.50   # restitution 0–1
const BALL_FRICTION       : float = 0.04   # surface friction 0–1
const GRAVITY_SCALE       : float = 2.8    # multiplied against world gravity (980 px/s²)
const BALL_LINEAR_DAMP    : float = 0.02   # air/surface damping

# ──────────────────────────────────────────────────────────────────────────
#  FLIPPERS
# ──────────────────────────────────────────────────────────────────────────
const FLIPPER_SPEED       : float = 22.0   # rad/s — how fast the flipper snaps
const FLIPPER_REST_ANGLE  : float = 0.48   # radians — rest (down) offset from horizontal
const FLIPPER_ACTIVE_ANGLE: float = -0.48  # radians — active (up) offset
const FLIPPER_RESTITUTION : float = 0.35
const FLIPPER_FRICTION    : float = 0.10
const FLIPPER_LENGTH      : float = 92.0   # pixels, pivot to tip

# ──────────────────────────────────────────────────────────────────────────
#  BUMPERS
# ──────────────────────────────────────────────────────────────────────────
const BUMPER_IMPULSE      : float = 680.0  # outward impulse on ball
const BUMPER_BOUNCE       : float = 1.20   # restitution of bumper body

# ──────────────────────────────────────────────────────────────────────────
#  SLINGSHOTS
# ──────────────────────────────────────────────────────────────────────────
const SLINGSHOT_IMPULSE   : float = 860.0

# ──────────────────────────────────────────────────────────────────────────
#  PLUNGER
# ──────────────────────────────────────────────────────────────────────────
const PLUNGER_MAX_FORCE   : float = 2400.0  # full-pull launch impulse
const PLUNGER_CHARGE_TIME : float = 2.0     # seconds to reach max force

# ──────────────────────────────────────────────────────────────────────────
#  NUDGE / TILT
# ──────────────────────────────────────────────────────────────────────────
const NUDGE_IMPULSE       : float = 380.0   # horizontal impulse per nudge
const NUDGE_UP_IMPULSE    : float = 300.0   # upward impulse
const NUDGE_COOLDOWN      : float = 0.35    # seconds between nudges
const TILT_THRESHOLD      : float = 6.0     # nudge events before tilt
const TILT_DECAY_RATE     : float = 0.93    # tilt meter decay multiplier per second

# ──────────────────────────────────────────────────────────────────────────
#  COLLISION LAYERS  (bit masks — adjust per project)
# ──────────────────────────────────────────────────────────────────────────
const LAYER_BALL          : int = 1   # bit 0
const LAYER_WALLS         : int = 2   # bit 1
const LAYER_FLIPPER       : int = 4   # bit 2
const LAYER_BUMPER        : int = 8   # bit 3
const LAYER_SLING         : int = 16  # bit 4
const LAYER_SENSOR        : int = 32  # bit 5 — targets, scoop, drain, spinner
