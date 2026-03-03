## table.gd — Node2D — builds wall geometry and manages ball lifecycle
extends Node2D

const VIEWPORT_W : float = 576.0
const VIEWPORT_H : float = 1024.0

@onready var _walls   : StaticBody2D = $Walls
@onready var _plunger : Node2D       = $Plunger

var _ball_scene := preload("res://scenes/Ball.tscn")
var _ball       : RigidBody2D = null
var _prev_state : GameState.State = GameState.State.START_MENU

const BALL_SPAWN_POS := Vector2(548.0, 820.0)

# ──────────────────────────────────────────────────────────────────────────────
func _ready() -> void:
	_build_walls()
	GameState.state_changed.connect(_on_state_changed)
	GameState.multiball_started.connect(_on_multiball_started)

# ──────────────────────────────────────────────────────────────────────────────
func _on_state_changed(s: GameState.State) -> void:
	if s == GameState.State.PLAYING:
		var from := _prev_state
		_prev_state = s
		var spawns_needed := from in [
			GameState.State.START_MENU,
			GameState.State.BALL_DRAINED,
			GameState.State.GAME_OVER,
		]
		if spawns_needed:
			call_deferred("_do_spawn_ball")
	elif s == GameState.State.GAME_OVER:
		_prev_state = s
		for b in get_tree().get_nodes_in_group("ball"):
			b.queue_free()
		_ball = null
	else:
		_prev_state = s

func _do_spawn_ball() -> void:
	# Remove any frozen/invisible balls from previous round
	for b in get_tree().get_nodes_in_group("ball"):
		b.queue_free()
	_ball = null
	await get_tree().physics_frame
	spawn_ball()

func spawn_ball() -> void:
	_ball = _ball_scene.instantiate() as RigidBody2D
	add_child(_ball)
	_ball.global_position = BALL_SPAWN_POS
	_plunger.arm(_ball)

func _on_multiball_started(_ball_count: int) -> void:
	# Spawn the locked extra ball from the top of the plunger lane
	var extra := _ball_scene.instantiate() as RigidBody2D
	add_child(extra)
	extra.global_position = Vector2(548.0, 500.0)
	extra.apply_central_impulse(Vector2(0.0, -1400.0))

# ──────────────────────────────────────────────────────────────────────────────
#  WALL GEOMETRY  (procedural, pixel-perfect for 576×1024)
# ──────────────────────────────────────────────────────────────────────────────
func _build_walls() -> void:
	var pm := PhysicsMaterial.new()
	pm.bounce   = 0.30
	pm.friction = 0.12
	_walls.physics_material_override = pm
	_walls.collision_layer = PhysicsConfig.LAYER_WALLS
	_walls.collision_mask  = PhysicsConfig.LAYER_BALL

	var segs : Array[Array] = [
		# ── Outer left wall ──────────────────────────────────────────────────
		[Vector2(14, 14),   Vector2(14, 836)],
		# ── Left gutter angle ────────────────────────────────────────────────
		[Vector2(14, 836),  Vector2(144, 926)],
		# ── Outer right wall (stops at plunger lane) ─────────────────────────
		[Vector2(562, 14),  Vector2(562, 836)],
		# ── Right gutter angle ───────────────────────────────────────────────
		[Vector2(530, 836), Vector2(432, 926)],
		# ── Plunger lane left wall ───────────────────────────────────────────
		[Vector2(530, 14),  Vector2(530, 836)],
		# ── Top wall ─────────────────────────────────────────────────────────
		[Vector2(14, 14),   Vector2(530, 14)],
		# ── Post between flippers ────────────────────────────────────────────
		[Vector2(144, 960), Vector2(210, 986)],
		[Vector2(432, 960), Vector2(366, 986)],
		# ── Left ramp guide (entry) ───────────────────────────────────────────
		[Vector2(120, 360), Vector2(60,  280)],
		[Vector2(60,  280), Vector2(14,  200)],
		# ── Right ramp guide (entry) ──────────────────────────────────────────
		[Vector2(456, 360), Vector2(516, 280)],
		[Vector2(516, 280), Vector2(562, 200)],
	]

	for seg in segs:
		_add_wall_segment(seg[0], seg[1])

func _add_wall_segment(a: Vector2, b: Vector2) -> void:
	var shape := SegmentShape2D.new()
	shape.a    = a
	shape.b    = b
	var cs     := CollisionShape2D.new()
	cs.shape   = shape
	_walls.add_child(cs)
