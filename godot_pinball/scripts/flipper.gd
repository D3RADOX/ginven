## flipper.gd — AnimatableBody2D — left or right flipper with neon pink visual
extends AnimatableBody2D

@export_enum("left", "right") var side: String = "left"

const _NP := Color(1.0, 0.12, 0.72)   # neon pink (local copy — no autoload needed)

var _rest_angle   : float = 0.0
var _active_angle : float = 0.0
var _active       : bool  = false

func _ready() -> void:
	sync_to_physics = true
	collision_layer = PhysicsConfig.LAYER_FLIPPER
	collision_mask  = PhysicsConfig.LAYER_BALL
	_configure()

func _configure() -> void:
	var ra := PhysicsConfig.FLIPPER_REST_ANGLE    # 0.48 rad
	var aa := PhysicsConfig.FLIPPER_ACTIVE_ANGLE  # -0.48 rad
	if side == "left":
		_rest_angle   = ra
		_active_angle = aa
	else:
		# Right flipper: rotate base by PI, then tilt opposite direction
		_rest_angle   = PI - ra   # tip points lower-left at rest
		_active_angle = PI - aa   # tip points upper-left when active (PI - (-0.48) = PI + 0.48)
	rotation = _rest_angle

func _physics_process(delta: float) -> void:
	if GameState.current_state != GameState.State.PLAYING:
		return
	var action := "flip_left" if side == "left" else "flip_right"
	_active = Input.is_action_pressed(action)
	var target := _active_angle if _active else _rest_angle
	var diff   := target - rotation
	# Wrap diff to [-PI, PI] to avoid spinning the long way around
	while diff >  PI: diff -= TAU
	while diff < -PI: diff += TAU
	var step   := PhysicsConfig.FLIPPER_SPEED * delta
	if absf(diff) <= step:
		rotation = target
	else:
		rotation += signf(diff) * step

# ── Visual ────────────────────────────────────────────────────────────────────
func _draw() -> void:
	var len     := PhysicsConfig.FLIPPER_LENGTH   # 92.0
	var pivot_w := 11.0
	var tip_w   :=  5.0
	var n_seg   := 20

	# Build tapered polygon (pivot at origin, tip at +x direction)
	var upper := PackedVector2Array()
	var lower := PackedVector2Array()
	for i in n_seg + 1:
		var t  := float(i) / float(n_seg)
		var x  := t * len
		var hw := lerp(pivot_w, tip_w, t)
		upper.append(Vector2(x, -hw))
		lower.append(Vector2(x,  hw))

	var poly := PackedVector2Array()
	poly.append_array(upper)
	for i in lower.size():
		poly.append(lower[lower.size() - 1 - i])

	# Drop shadow
	var shadow := PackedVector2Array()
	for pt in poly:
		shadow.append(pt + Vector2(2, 3))
	draw_colored_polygon(shadow, Color(0, 0, 0, 0.45))

	# Fill — hot pink with slight gradient (brighter at pivot)
	draw_colored_polygon(poly, Color(_NP.r, _NP.g, _NP.b, 0.82))

	# Hatch lines (diagonal striping texture)
	for i in 7:
		var xi := 8.0 + float(i) * 12.0
		if xi >= len - 5.0: break
		var t  := xi / len
		var hw := lerp(pivot_w, tip_w, t) - 1.5
		draw_line(Vector2(xi, -hw), Vector2(xi, hw),
			Color(1.0, 0.5, 0.85, 0.22), 1.5)

	# Outer glow edge
	draw_polyline(poly, Color(_NP.r, _NP.g, _NP.b, 0.22), 7.0, true)
	draw_polyline(poly, Color(_NP.r, _NP.g, _NP.b, 0.70), 2.2, true)
	draw_polyline(poly, Color(1.0, 1.0, 1.0, 0.20),        0.8, true)

	# Rounded tip cap
	draw_circle(upper[upper.size() - 1] + Vector2(0, tip_w * 0.5),
		tip_w, Color(_NP.r, _NP.g, _NP.b, 0.80))

	# Pivot pin
	draw_circle(Vector2.ZERO, 9.0, Color(0.65, 0.65, 0.74))
	draw_circle(Vector2.ZERO, 9.0, Color(_NP.r, _NP.g, _NP.b, 0.45), false, 1.8)
	draw_circle(Vector2(-2.5, -2.5), 3.5, Color(1.0, 1.0, 1.0, 0.60))
