## bumper.gd — Node2D — pop bumper
## Children expected: Body (StaticBody2D), DetectArea (Area2D)
extends Node2D

@export var points     : int    = 500
@export var label_text : String = "★"
@export var color      : Color  = Color(1.0, 0.84, 0.0)

@onready var _body   : StaticBody2D = $Body
@onready var _detect : Area2D       = $DetectArea

var _flash : float = 0.0

func _ready() -> void:
	# High-restitution physics material gives the ball extra energy on contact
	var pm := PhysicsMaterial.new()
	pm.bounce   = PhysicsConfig.BUMPER_BOUNCE   # 1.20 — over 1 adds energy
	pm.friction = 0.0
	_body.physics_material_override = pm
	_body.collision_layer = PhysicsConfig.LAYER_BUMPER
	_body.collision_mask  = PhysicsConfig.LAYER_BALL
	_detect.collision_layer = PhysicsConfig.LAYER_SENSOR
	_detect.collision_mask  = PhysicsConfig.LAYER_BALL
	_detect.body_entered.connect(_on_body_entered)

func _process(delta: float) -> void:
	if _flash > 0.0:
		_flash = maxf(0.0, _flash - delta * 8.0)
		queue_redraw()

func _on_body_entered(body: Node) -> void:
	if not body.is_in_group("ball"):
		return
	# Extra outward impulse (Area2D detects; StaticBody handles main bounce)
	var dir := (body.global_position - global_position).normalized()
	(body as RigidBody2D).apply_central_impulse(dir * PhysicsConfig.BUMPER_IMPULSE)
	GameState.bumper_hit()
	AudioManager.play("bumper_hit")
	_flash = 1.0
	queue_redraw()

func _draw() -> void:
	var r      := 26.0
	var glow_a := _flash

	# Extended halo
	if glow_a > 0.01:
		draw_circle(Vector2.ZERO, r + 10.0, Color(color.r, color.g, color.b, glow_a * 0.35))

	# Drop shadow
	draw_circle(Vector2(2, 3), r + 1.0, Color(0, 0, 0, 0.55))

	# Metallic collar ring
	draw_arc(Vector2.ZERO, r + 1.0, 0.0, TAU, 48, Color(0, 0, 0, 0.6), 5.0)
	draw_arc(Vector2.ZERO, r,       0.0, TAU, 48, Color(0.82, 0.82, 0.88, 0.9), 3.0)

	# Dome body (dark base)
	draw_circle(Vector2.ZERO, r - 3.0, Color(color.r * 0.25, color.g * 0.25, color.b * 0.25))

	# Neon ring on dome edge
	var neon_a := 0.45 + glow_a * 0.55
	draw_arc(Vector2.ZERO, r - 3.0, 0.0, TAU, 48, Color(color.r, color.g, color.b, neon_a), 5.0)

	# Specular highlight
	var spec_a := 0.35 + glow_a * 0.45
	draw_circle(Vector2(-7, -8), 6.0, Color(1.0, 1.0, 1.0, spec_a))

	# Label
	draw_string(ThemeDB.fallback_font, Vector2(-7, 5),
		label_text, HORIZONTAL_ALIGNMENT_CENTER, -1, 13, Color.WHITE)
