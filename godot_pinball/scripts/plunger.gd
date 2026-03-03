## plunger.gd — Node2D — spring plunger launcher
extends Node2D

var _ball          : RigidBody2D = null
var _charge        : float       = 0.0
var _charging      : bool        = false
var _ready_to_fire : bool        = false

func arm(ball: RigidBody2D) -> void:
	_ball          = ball
	_charge        = 0.0
	_charging      = false
	_ready_to_fire = true
	queue_redraw()

func _physics_process(delta: float) -> void:
	if not _ready_to_fire:
		return
	if GameState.current_state != GameState.State.PLAYING:
		return

	if Input.is_action_pressed("plunger"):
		_charging = true
		_charge   = minf(_charge + delta / PhysicsConfig.PLUNGER_CHARGE_TIME, 1.0)
		queue_redraw()
	elif _charging:
		_charging = false
		_fire()

func _fire() -> void:
	if not is_instance_valid(_ball):
		_ready_to_fire = false
		return
	_ready_to_fire = false
	var force := _charge * PhysicsConfig.PLUNGER_MAX_FORCE
	_ball.launch(Vector2(0.0, -force))
	AudioManager.play("plunger_launch")
	_ball   = null
	_charge = 0.0
	queue_redraw()

func _draw() -> void:
	# Charge bar (rises upward from plunger base)
	var bar_h := _charge * 56.0
	if bar_h > 0.5:
		draw_rect(Rect2(-6.0, -bar_h, 12.0, bar_h),
			Color(1.0, 0.84 * _charge, 0.0, 0.7 + _charge * 0.3))

	# Plunger body
	draw_rect(Rect2(-7.0, 0.0, 14.0, 12.0), Color(0.55, 0.55, 0.65))
	draw_rect(Rect2(-9.0, 10.0, 18.0,  6.0), Color(0.68, 0.68, 0.76))
	draw_rect(Rect2(-9.0, 10.0, 18.0,  6.0), Color(1.0, 1.0, 1.0, 0.18), false, 1.0)
