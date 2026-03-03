## slingshot.gd — Node2D — slingshot / kicker
## Children expected: Body (StaticBody2D), DetectArea (Area2D)
extends Node2D

@export var kick_normal : Vector2 = Vector2(1.0, -0.8)  # normalised kick direction
@export var color       : Color   = Color(0.9, 0.3, 1.0)

@onready var _body   : StaticBody2D = $Body
@onready var _detect : Area2D       = $DetectArea

var _flash : float = 0.0

func _ready() -> void:
	kick_normal = kick_normal.normalized()
	var pm := PhysicsMaterial.new()
	pm.bounce   = 0.45
	pm.friction = 0.05
	_body.physics_material_override = pm
	_body.collision_layer = PhysicsConfig.LAYER_SLING
	_body.collision_mask  = PhysicsConfig.LAYER_BALL
	_detect.collision_layer = PhysicsConfig.LAYER_SENSOR
	_detect.collision_mask  = PhysicsConfig.LAYER_BALL
	_detect.body_entered.connect(_on_body_entered)

func _process(delta: float) -> void:
	if _flash > 0.0:
		_flash = maxf(0.0, _flash - delta * 12.0)
		queue_redraw()

func _on_body_entered(body: Node) -> void:
	if not body.is_in_group("ball"):
		return
	(body as RigidBody2D).apply_central_impulse(kick_normal * PhysicsConfig.SLINGSHOT_IMPULSE)
	GameState.slingshot_hit()
	AudioManager.play("slingshot")
	_flash = 1.0
	queue_redraw()

func _draw() -> void:
	# Slingshot visual: rubber band line with neon glow
	var half : float = 52.0
	var a := Vector2(-half, 0.0)
	var b := Vector2( half, 0.0)

	if _flash > 0.01:
		draw_line(a, b, Color(color.r, color.g, color.b, _flash * 0.6), 10.0, true)

	draw_line(a, b, Color(0.15, 0.0, 0.2),                  6.0, true)
	draw_line(a, b, Color(color.r, color.g, color.b, 0.85), 3.0, true)
	draw_line(a, b, Color(1.0, 1.0, 1.0, 0.25),             1.0, true)

	# End caps
	for pt in [a, b]:
		draw_circle(pt, 5.0, Color(0.7, 0.7, 0.8))
		draw_circle(pt, 3.0, Color(1.0, 1.0, 1.0, 0.5))
