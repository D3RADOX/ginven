## ball.gd — RigidBody2D — the pinball
extends RigidBody2D

const MAX_SPEED : float = 2200.0
const TRAIL_LEN : int   = 20

var _trail : Array = []   # Array[Vector2]

func _ready() -> void:
	add_to_group("ball")
	gravity_scale    = PhysicsConfig.GRAVITY_SCALE
	linear_damp      = PhysicsConfig.BALL_LINEAR_DAMP
	mass             = PhysicsConfig.BALL_MASS
	continuous_cd    = RigidBody2D.CCD_MODE_CAST_SHAPE  # tunnelling prevention
	var pm := PhysicsMaterial.new()
	pm.bounce   = PhysicsConfig.BALL_BOUNCE
	pm.friction = PhysicsConfig.BALL_FRICTION
	physics_material_override = pm

func _physics_process(_delta: float) -> void:
	# Speed cap
	var spd := linear_velocity.length()
	if spd > MAX_SPEED:
		linear_velocity = linear_velocity * (MAX_SPEED / spd)

	# Motion trail
	_trail.append(global_position)
	if _trail.size() > TRAIL_LEN:
		_trail.pop_front()

# ──────────────────────────────────────────────────────────────────────────────
func launch(impulse: Vector2) -> void:
	linear_velocity  = Vector2.ZERO
	angular_velocity = 0.0
	apply_central_impulse(impulse)

func apply_nudge(dir: Vector2) -> void:
	apply_central_impulse(Vector2(
		dir.x * PhysicsConfig.NUDGE_IMPULSE,
		-PhysicsConfig.NUDGE_UP_IMPULSE * 0.6
	))

func reset(pos: Vector2) -> void:
	freeze           = true
	global_position  = pos
	linear_velocity  = Vector2.ZERO
	angular_velocity = 0.0
	_trail.clear()
	await get_tree().physics_frame
	freeze = false

func get_trail() -> Array:
	return _trail
