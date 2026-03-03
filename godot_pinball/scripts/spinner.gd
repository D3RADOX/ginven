## spinner.gd — Area2D — spinner lane
extends Area2D

const SPIN_DECAY    : float = 4.0   # deceleration in "units/s²"
const TICK_INTERVAL : float = 0.09  # seconds between scoring ticks

var _spin_vel   : float = 0.0
var _tick_accum : float = 0.0
var _angle      : float = 0.0

func _ready() -> void:
	collision_layer = PhysicsConfig.LAYER_SENSOR
	collision_mask  = PhysicsConfig.LAYER_BALL
	body_entered.connect(_on_body_entered)

func _process(delta: float) -> void:
	if _spin_vel <= 0.01:
		_spin_vel = 0.0
		return

	_spin_vel    = maxf(0.0, _spin_vel - SPIN_DECAY * delta)
	_angle      += _spin_vel * delta
	_tick_accum += delta

	while _tick_accum >= TICK_INTERVAL:
		_tick_accum -= TICK_INTERVAL
		GameState.spinner_tick()
		AudioManager.play("spinner_tick")

	queue_redraw()

func _on_body_entered(body: Node) -> void:
	if not body.is_in_group("ball"):
		return
	# Convert ball speed to spin velocity
	var spd := (body as RigidBody2D).linear_velocity.length()
	_spin_vel = maxf(_spin_vel, spd / 120.0)

func _draw() -> void:
	var a := _angle
	# Horizontal blade
	draw_line(
		Vector2(cos(a) * 22.0, sin(a) * 5.0),
		Vector2(-cos(a) * 22.0, -sin(a) * 5.0),
		Color(1.0, 0.84, 0.0, 0.9), 4.5, true)
	# Vertical blade (dimmer)
	draw_line(
		Vector2(cos(a + PI * 0.5) * 5.0, sin(a + PI * 0.5) * 22.0),
		Vector2(-cos(a + PI * 0.5) * 5.0, -sin(a + PI * 0.5) * 22.0),
		Color(1.0, 0.5, 0.0, 0.55), 2.5, true)
	# Centre pin
	draw_circle(Vector2.ZERO, 4.0, Color(0.75, 0.75, 0.82))
	draw_circle(Vector2(-1, -1), 2.0, Color(1.0, 1.0, 1.0, 0.5))
