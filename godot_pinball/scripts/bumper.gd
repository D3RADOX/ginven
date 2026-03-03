## bumper.gd — Node2D — pop bumper (ring-style neon visual)
## Children expected: Body (StaticBody2D), DetectArea (Area2D)
extends Node2D

@export var points     : int    = 500
@export var label_text : String = "★"
@export var color      : Color  = Color(0.0, 0.87, 1.0)

@onready var _body   : StaticBody2D = $Body
@onready var _detect : Area2D       = $DetectArea

var _flash : float = 0.0

func _ready() -> void:
	var pm := PhysicsMaterial.new()
	pm.bounce   = PhysicsConfig.BUMPER_BOUNCE
	pm.friction = 0.0
	_body.physics_material_override = pm
	_body.collision_layer   = PhysicsConfig.LAYER_BUMPER
	_body.collision_mask    = PhysicsConfig.LAYER_BALL
	_detect.collision_layer = PhysicsConfig.LAYER_SENSOR
	_detect.collision_mask  = PhysicsConfig.LAYER_BALL
	_detect.body_entered.connect(_on_body_entered)

func _process(delta: float) -> void:
	if _flash > 0.0:
		_flash = maxf(0.0, _flash - delta * 7.0)
		queue_redraw()

func _on_body_entered(body: Node) -> void:
	if not body.is_in_group("ball"):
		return
	var dir := (body.global_position - global_position).normalized()
	(body as RigidBody2D).apply_central_impulse(dir * PhysicsConfig.BUMPER_IMPULSE)
	GameState.bumper_hit()
	AudioManager.play("bumper_hit")
	_flash = 1.0
	queue_redraw()

func _draw() -> void:
	var r      := 26.0
	var col    := color
	var glow_a := _flash

	# Outer halo (only when flashing)
	if glow_a > 0.01:
		draw_circle(Vector2.ZERO, r + 14.0, Color(col.r, col.g, col.b, glow_a * 0.28))
		draw_circle(Vector2.ZERO, r +  7.0, Color(col.r, col.g, col.b, glow_a * 0.45))

	# Drop shadow
	draw_arc(Vector2(2, 3), r + 2.0, 0.0, TAU, 32, Color(0, 0, 0, 0.55), 7.0)

	# Outer ring — glow layers
	var ring_a := 0.65 + glow_a * 0.35
	draw_arc(Vector2.ZERO, r, 0.0, TAU, 48,
		Color(col.r, col.g, col.b, ring_a * 0.25), 9.0, true)
	draw_arc(Vector2.ZERO, r, 0.0, TAU, 48,
		Color(col.r, col.g, col.b, ring_a * 0.60), 4.5, true)
	draw_arc(Vector2.ZERO, r, 0.0, TAU, 48,
		Color(col.r, col.g, col.b, ring_a),         2.5, true)
	draw_arc(Vector2.ZERO, r, 0.0, TAU, 48,
		Color(1.0, 1.0, 1.0, 0.22), 0.8, true)

	# Inner ring
	draw_arc(Vector2.ZERO, r - 11.0, 0.0, TAU, 36,
		Color(col.r, col.g, col.b, ring_a * 0.55), 2.5, true)
	draw_arc(Vector2.ZERO, r - 11.0, 0.0, TAU, 36,
		Color(1.0, 1.0, 1.0, 0.14), 0.7, true)

	# Dark fill inside inner ring
	draw_circle(Vector2.ZERO, r - 13.0, Color(0.02, 0.01, 0.06, 0.92))

	# Specular arc on outer ring
	draw_arc(Vector2(-7, -9), r - 1.0, PI * 1.08, PI * 1.48, 14,
		Color(1.0, 1.0, 1.0, 0.30 + glow_a * 0.28), 2.2, true)

	# Label
	draw_string(ThemeDB.fallback_font, Vector2(-7, 6),
		label_text, HORIZONTAL_ALIGNMENT_CENTER, -1, 13,
		Color(col.r, col.g, col.b, 0.88 + glow_a * 0.12))
