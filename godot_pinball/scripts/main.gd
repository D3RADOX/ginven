## main.gd — Node2D — root scene coordinator
extends Node2D

@onready var _table : Node2D      = $Table
@onready var _hud   : CanvasLayer = $HUD
@onready var _cam   : Camera2D    = $Camera2D

var _shake_strength  : float = 0.0
var _shake_remaining : float = 0.0

func _ready() -> void:
	GameState.load_high_scores()
	GameState.screen_shake_requested.connect(_on_shake)
	GameState.start_game()

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause_game"):
		GameState.pause_game()
		return

	if GameState.current_state != GameState.State.PLAYING:
		return

	if event.is_action_pressed("nudge_left"):
		_do_nudge(Vector2.LEFT)
	elif event.is_action_pressed("nudge_right"):
		_do_nudge(Vector2.RIGHT)
	elif event.is_action_pressed("nudge_up"):
		_do_nudge(Vector2.UP)

func _do_nudge(dir: Vector2) -> void:
	if not GameState.nudge(dir):
		return
	for b in get_tree().get_nodes_in_group("ball"):
		(b as RigidBody2D).apply_nudge(dir)

# ──────────────────────────────────────────────────────────────────────────────
#  SCREEN SHAKE
# ──────────────────────────────────────────────────────────────────────────────
func _on_shake(strength: float, duration: float) -> void:
	_shake_strength  = strength * 7.0
	_shake_remaining = duration

func _process(delta: float) -> void:
	if _shake_remaining <= 0.0:
		return
	_shake_remaining -= delta
	if _shake_remaining > 0.0:
		_cam.offset = Vector2(
			randf_range(-_shake_strength, _shake_strength),
			randf_range(-_shake_strength, _shake_strength)
		)
	else:
		_cam.offset = Vector2.ZERO
