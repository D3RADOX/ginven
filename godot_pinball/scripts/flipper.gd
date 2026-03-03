## flipper.gd — AnimatableBody2D — left or right flipper
extends AnimatableBody2D

@export_enum("left", "right") var side: String = "left"

var _rest_angle   : float = 0.0
var _active_angle : float = 0.0
var _active       : bool  = false

func _ready() -> void:
	sync_to_physics = true
	collision_layer = PhysicsConfig.LAYER_FLIPPER
	collision_mask  = PhysicsConfig.LAYER_BALL
	_configure()

func _configure() -> void:
	var sign_mult := 1.0 if side == "left" else -1.0
	_rest_angle   = PhysicsConfig.FLIPPER_REST_ANGLE   * sign_mult
	_active_angle = PhysicsConfig.FLIPPER_ACTIVE_ANGLE * sign_mult
	rotation = _rest_angle

func _physics_process(delta: float) -> void:
	if GameState.current_state != GameState.State.PLAYING:
		return
	var action := "flip_left" if side == "left" else "flip_right"
	_active = Input.is_action_pressed(action)
	var target := _active_angle if _active else _rest_angle
	var diff   := target - rotation
	var step   := PhysicsConfig.FLIPPER_SPEED * delta
	if absf(diff) <= step:
		rotation = target
	else:
		rotation += signf(diff) * step
