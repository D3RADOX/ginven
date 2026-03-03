## scoop.gd — Area2D — ball lock / mode trigger
extends Area2D

const HOLD_TIME      : float   = 1.2
const EJECT_IMPULSE  : float   = 680.0
@export var eject_dir : Vector2 = Vector2(0.35, -1.0)

var _held_ball  : RigidBody2D = null
var _eject_timer: float       = 0.0

func _ready() -> void:
	collision_layer = PhysicsConfig.LAYER_SENSOR
	collision_mask  = PhysicsConfig.LAYER_BALL
	body_entered.connect(_on_body_entered)
	eject_dir = eject_dir.normalized()

func _process(delta: float) -> void:
	if _eject_timer > 0.0:
		_eject_timer -= delta
		if _eject_timer <= 0.0:
			_eject()

func _on_body_entered(body: Node) -> void:
	if not body.is_in_group("ball") or _held_ball != null:
		return
	_held_ball = body as RigidBody2D
	_held_ball.freeze          = true
	_held_ball.global_position = global_position
	GameState.scoop_hit()
	AudioManager.play("scoop")
	_eject_timer = HOLD_TIME

func _eject() -> void:
	if not is_instance_valid(_held_ball):
		_held_ball = null
		return
	var ball      := _held_ball
	_held_ball     = null
	ball.freeze    = false
	ball.linear_velocity = Vector2.ZERO
	ball.apply_central_impulse(eject_dir * EJECT_IMPULSE)

func _draw() -> void:
	# Scoop cup visual
	draw_arc(Vector2.ZERO, 18.0, PI * 0.1, PI * 0.9, 24, Color(0.6, 0.6, 0.7, 0.9), 4.0)
	draw_circle(Vector2.ZERO, 10.0, Color(0.1, 0.0, 0.15))
	var lit := _eject_timer > 0.0
	draw_circle(Vector2.ZERO, 7.0,
		Color(1.0, 0.84, 0.0, 0.7 if lit else 0.25))
