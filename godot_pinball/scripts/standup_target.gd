## standup_target.gd — Node2D — single standup target
## Children expected: Body (StaticBody2D), DetectArea (Area2D)
extends Node2D

@export_enum("left", "right") var side  : String = "left"
@export                       var index : int    = 0   # 0‥2 within the bank

@onready var _body   : StaticBody2D = $Body
@onready var _detect : Area2D       = $DetectArea

var _lit   : bool  = false
var _flash : float = 0.0

func _ready() -> void:
	_body.collision_layer = PhysicsConfig.LAYER_WALLS
	_body.collision_mask  = PhysicsConfig.LAYER_BALL
	_detect.collision_layer = PhysicsConfig.LAYER_SENSOR
	_detect.collision_mask  = PhysicsConfig.LAYER_BALL
	_detect.body_entered.connect(_on_body_entered)

func _process(delta: float) -> void:
	if _flash > 0.0:
		_flash = maxf(0.0, _flash - delta * 5.0)
		queue_redraw()

func set_lit(v: bool) -> void:
	_lit = v
	queue_redraw()

func _on_body_entered(body: Node) -> void:
	if not body.is_in_group("ball"):
		return
	GameState.standup_hit(side)
	AudioManager.play("target_hit")
	_flash = 1.0
	queue_redraw()

func _draw() -> void:
	var w   := 7.0
	var h   := 30.0
	var lit := _lit or _flash > 0.3
	var base_col := Color(0.8, 0.2, 0.95) if lit else Color(0.28, 0.08, 0.38)

	# Glow
	if _flash > 0.01:
		draw_rect(Rect2(-w - 5.0, -h * 0.5 - 5.0, (w + 5.0) * 2.0, h + 10.0),
			Color(0.9, 0.3, 1.0, _flash * 0.5))

	# Body
	draw_rect(Rect2(-w, -h * 0.5, w * 2.0, h), base_col)
	# Highlight edge
	draw_rect(Rect2(-w, -h * 0.5, w * 2.0, h),
		Color(1.0, 1.0, 1.0, 0.12 + _flash * 0.35), false, 1.5)
