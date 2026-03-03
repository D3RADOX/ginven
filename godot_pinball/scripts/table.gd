## table.gd — neon playfield visual + wall geometry + ball lifecycle
extends Node2D

# ── Layout constants (576 × 1024 viewport, y-down) ───────────────────────────
const VW    := 576.0;  const VH    := 1024.0;  const CX := VW * 0.5
const LW    := 28.0;   const RW    := 548.0;   const PLW := 530.0
const LI    := 176.0;  const RI    := VW - LI   # 400  inner rails
const LO    := 90.0;   const RO    := VW - LO   # 486  outlane walls
const LF    := 160.0;  const RF    := VW - LF   # 416  flipper pivots
const HDR_B := 108.0;  const ARCH_Y := 132.0
const BMP_Y := 246.0;  const RAMP_Y := 440.0
const OUTL_Y:= 656.0;  const FLIP_Y := 940.0

# ── Colour palette ────────────────────────────────────────────────────────────
const NC := Color(0.0,  0.87, 1.0)    # neon cyan
const NP := Color(1.0,  0.12, 0.72)   # neon pink
const NG := Color(0.12, 0.95, 0.45)   # neon green
const DB := Color(0.02, 0.01, 0.06)   # dark background

# ── Node refs ─────────────────────────────────────────────────────────────────
@onready var _walls   : StaticBody2D = $Walls
@onready var _plunger : Node2D       = $Plunger

var _ball_scene  := preload("res://scenes/Ball.tscn")
var _ball        : RigidBody2D = null
var _prev_state  : GameState.State = GameState.State.START_MENU
var _time        : float = 0.0

const BALL_SPAWN := Vector2(PLW - 9.0, 820.0)

# ═════════════════════════════════════════════════════════════════════════════
#  GAME LOGIC
# ═════════════════════════════════════════════════════════════════════════════
func _ready() -> void:
	_build_walls()
	GameState.state_changed.connect(_on_state_changed)
	GameState.multiball_started.connect(_on_multiball_started)
	set_process(true)

func _process(delta: float) -> void:
	_time += delta
	queue_redraw()

func _on_state_changed(s: GameState.State) -> void:
	if s == GameState.State.PLAYING:
		var from := _prev_state
		_prev_state = s
		if from in [GameState.State.START_MENU,
					GameState.State.BALL_DRAINED,
					GameState.State.GAME_OVER]:
			call_deferred("_do_spawn")
	elif s == GameState.State.GAME_OVER:
		_prev_state = s
		for b in get_tree().get_nodes_in_group("ball"):
			b.queue_free()
		_ball = null
	else:
		_prev_state = s

func _do_spawn() -> void:
	for b in get_tree().get_nodes_in_group("ball"):
		b.queue_free()
	_ball = null
	await get_tree().physics_frame
	spawn_ball()

func spawn_ball() -> void:
	_ball = _ball_scene.instantiate() as RigidBody2D
	add_child(_ball)
	_ball.global_position = BALL_SPAWN
	_plunger.arm(_ball)

func _on_multiball_started(_n: int) -> void:
	var extra := _ball_scene.instantiate() as RigidBody2D
	add_child(extra)
	extra.global_position = Vector2(PLW - 9.0, 380.0)
	extra.apply_central_impulse(Vector2(0.0, -1400.0))

# ═════════════════════════════════════════════════════════════════════════════
#  WALL GEOMETRY
# ═════════════════════════════════════════════════════════════════════════════
func _build_walls() -> void:
	var pm := PhysicsMaterial.new()
	pm.bounce = 0.3;  pm.friction = 0.12
	_walls.physics_material_override = pm
	_walls.collision_layer = PhysicsConfig.LAYER_WALLS
	_walls.collision_mask  = PhysicsConfig.LAYER_BALL

	var segs : Array[Array] = [
		[Vector2(LW,    ARCH_Y), Vector2(144.0,  42.0)],
		[Vector2(144.0, 42.0),   Vector2(CX,     22.0)],
		[Vector2(CX,    22.0),   Vector2(432.0,  42.0)],
		[Vector2(432.0, 42.0),   Vector2(PLW,    ARCH_Y)],
		[Vector2(LW,    ARCH_Y), Vector2(LW,     OUTL_Y)],
		[Vector2(LW,    OUTL_Y), Vector2(LO,     700.0)],
		[Vector2(LO,    700.0),  Vector2(LO,     916.0)],
		[Vector2(LO,    916.0),  Vector2(LF,     FLIP_Y)],
		[Vector2(LO,    700.0),  Vector2(148.0,  700.0)],
		[Vector2(148.0, 700.0),  Vector2(148.0,  916.0)],
		[Vector2(148.0, 916.0),  Vector2(LF,     FLIP_Y)],
		[Vector2(RW,    ARCH_Y), Vector2(RW,     OUTL_Y)],
		[Vector2(RW,    OUTL_Y), Vector2(RO,     700.0)],
		[Vector2(RO,    700.0),  Vector2(RO,     916.0)],
		[Vector2(RO,    916.0),  Vector2(RF,     FLIP_Y)],
		[Vector2(RO,    700.0),  Vector2(428.0,  700.0)],
		[Vector2(428.0, 700.0),  Vector2(428.0,  916.0)],
		[Vector2(428.0, 916.0),  Vector2(RF,     FLIP_Y)],
		[Vector2(LF,    FLIP_Y), Vector2(224.0,  974.0)],
		[Vector2(RF,    FLIP_Y), Vector2(352.0,  974.0)],
		[Vector2(PLW,   ARCH_Y), Vector2(PLW,    FLIP_Y + 20.0)],
		[Vector2(LI,    ARCH_Y), Vector2(LI,     RAMP_Y)],
		[Vector2(LI,    RAMP_Y), Vector2(LW,     240.0)],
		[Vector2(RI,    ARCH_Y), Vector2(RI,     RAMP_Y)],
		[Vector2(RI,    RAMP_Y), Vector2(RW,     240.0)],
	]
	for seg in segs:
		_add_seg(seg[0], seg[1])

func _add_seg(a: Vector2, b: Vector2) -> void:
	var sh := SegmentShape2D.new();  sh.a = a;  sh.b = b
	var cs := CollisionShape2D.new();  cs.shape = sh
	_walls.add_child(cs)

# ═════════════════════════════════════════════════════════════════════════════
#  DRAW HELPERS
# ═════════════════════════════════════════════════════════════════════════════
func _nl(a: Vector2, b: Vector2, col: Color, w: float = 2.5) -> void:
	draw_line(a, b, Color(col.r, col.g, col.b, 0.18), w * 6.0, true)
	draw_line(a, b, Color(col.r, col.g, col.b, 0.52), w * 2.5, true)
	draw_line(a, b, col,                               w,        true)
	draw_line(a, b, Color(1.0, 1.0, 1.0, 0.22),       w * 0.3,  true)

func _na(c: Vector2, r: float, a1: float, a2: float, col: Color, w: float = 2.5, n: int = 48) -> void:
	draw_arc(c, r, a1, a2, n, Color(col.r, col.g, col.b, 0.18), w * 6.0, true)
	draw_arc(c, r, a1, a2, n, Color(col.r, col.g, col.b, 0.52), w * 2.5, true)
	draw_arc(c, r, a1, a2, n, col,                               w,        true)
	draw_arc(c, r, a1, a2, n, Color(1.0, 1.0, 1.0, 0.22),       w * 0.3,  true)

func _np(pts: PackedVector2Array, col: Color, w: float = 2.5) -> void:
	if pts.size() < 2: return
	draw_polyline(pts, Color(col.r, col.g, col.b, 0.18), w * 6.0, true)
	draw_polyline(pts, Color(col.r, col.g, col.b, 0.52), w * 2.5, true)
	draw_polyline(pts, col,                               w,        true)
	draw_polyline(pts, Color(1.0, 1.0, 1.0, 0.22),       w * 0.3,  true)

func _nr(r: Rect2, col: Color, w: float = 2.5) -> void:
	var tl := r.position;  var br := r.end
	var tr := Vector2(br.x, tl.y);  var bl := Vector2(tl.x, br.y)
	_nl(tl, tr, col, w);  _nl(tr, br, col, w)
	_nl(br, bl, col, w);  _nl(bl, tl, col, w)

func _bez(p0: Vector2, p1: Vector2, p2: Vector2, p3: Vector2, n: int = 32) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in n + 1:
		var t := float(i) / float(n);  var u := 1.0 - t
		pts.append(p0*(u*u*u) + p1*(3.0*u*u*t) + p2*(3.0*u*t*t) + p3*(t*t*t))
	return pts

func _gstr(font: Font, pos: Vector2, txt: String, col: Color, sz: int) -> void:
	draw_string(font, pos + Vector2(1.5, 1.5), txt,
		HORIZONTAL_ALIGNMENT_LEFT, -1, sz, Color(col.r, col.g, col.b, 0.35))
	draw_string(font, pos, txt, HORIZONTAL_ALIGNMENT_LEFT, -1, sz, col)

# ═════════════════════════════════════════════════════════════════════════════
#  MAIN DRAW
# ═════════════════════════════════════════════════════════════════════════════
func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, Vector2(VW, VH)), DB)
	_d_outer_border()
	_d_header()
	_d_top_arch()
	_d_inner_rails()
	_d_bumper_guides()
	_d_target_banks()
	_d_center_target_scoop()
	_d_ramps()
	_d_spinner_lane()
	_d_bracket_channels()
	_d_inlane_outlane_rails()
	_d_flipper_guides()
	_d_plunger_trapezoid()
	_d_wall_inserts()

func _d_outer_border() -> void:
	_nr(Rect2(10.0, 10.0, VW - 20.0, VH - 20.0), NC, 2.0)

func _d_header() -> void:
	var r := Rect2(100.0, 16.0, 376.0, 88.0)
	draw_rect(r, Color(0.06, 0.0, 0.14, 0.95))
	_nr(r, NP, 3.0)
	for i in 16:
		var t   := float(i) / 15.0
		var lx  := r.position.x + 10.0 + t * (r.size.x - 20.0)
		var ph  := fmod(_time * 4.0 + float(i) * 0.45, TAU)
		var br  := (sin(ph) + 1.0) * 0.5
		var col := Color(NP.r, NP.g, NP.b, 0.45 + br * 0.55)
		draw_circle(Vector2(lx, r.position.y + 9.0), 4.5, col)
		draw_circle(Vector2(lx, r.end.y      - 9.0), 4.5, col)
		if br > 0.65:
			draw_circle(Vector2(lx, r.position.y + 9.0), 9.0,
				Color(NP.r, NP.g, NP.b, (br - 0.65) * 0.35))
	var font := ThemeDB.fallback_font
	var fs   := 42;  var txt := "JACKPOT"
	var tw   := font.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
	var tx   := CX - tw * 0.5;  var ty := r.position.y + r.size.y * 0.72
	draw_string(font, Vector2(tx + 2.0, ty + 2.0), txt,
		HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(NP.r, NP.g, NP.b, 0.4))
	draw_string(font, Vector2(tx, ty), txt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, NP)

func _d_top_arch() -> void:
	var ol := _bez(Vector2(LW, ARCH_Y), Vector2(LW, 52.0),
				   Vector2(82.0, 22.0),  Vector2(CX, 22.0), 32)
	var or2 := _bez(Vector2(RW, ARCH_Y), Vector2(RW, 52.0),
				    Vector2(VW - 82.0, 22.0), Vector2(CX, 22.0), 32)
	_np(ol, NC, 3.0);  _np(or2, NC, 3.0)
	var il := _bez(Vector2(LI, ARCH_Y), Vector2(LI, 90.0),
				   Vector2(110.0, 44.0), Vector2(CX, 46.0), 24)
	var ir := _bez(Vector2(RI, ARCH_Y), Vector2(RI, 90.0),
				   Vector2(VW - 110.0, 44.0), Vector2(CX, 46.0), 24)
	_np(il, NC, 2.0);  _np(ir, NC, 2.0)

func _d_inner_rails() -> void:
	_nl(Vector2(LI, HDR_B), Vector2(LI, RAMP_Y), NC, 2.5)
	_nl(Vector2(RI, HDR_B), Vector2(RI, RAMP_Y), NC, 2.5)
	_nl(Vector2(LI, HDR_B + 2.0), Vector2(LI - 16.0, HDR_B + 2.0), NC, 1.5)
	_nl(Vector2(RI, HDR_B + 2.0), Vector2(RI + 16.0, HDR_B + 2.0), NC, 1.5)

func _d_bumper_guides() -> void:
	for bx in [216.0, 288.0, 360.0]:
		_nl(Vector2(bx, BMP_Y + 28.0), Vector2(bx, BMP_Y + 50.0), NC, 1.5)

func _d_target_banks() -> void:
	var font := ThemeDB.fallback_font
	var lr   := Rect2(54.0, 208.0, 108.0, 124.0)
	draw_rect(lr, Color(0.04, 0.0, 0.12, 0.88))
	_nr(lr, NC, 2.0)
	_gstr(font, Vector2(lr.position.x + 6.0, lr.position.y + 20.0), "LEFT",   NC, 10)
	_gstr(font, Vector2(lr.position.x + 6.0, lr.position.y + 34.0), "TARGET", NC, 10)
	_gstr(font, Vector2(lr.position.x + 6.0, lr.position.y + 48.0), "BANK",   NC, 10)
	var rr := Rect2(VW - lr.end.x, lr.position.y, lr.size.x, lr.size.y)
	draw_rect(rr, Color(0.04, 0.0, 0.12, 0.88))
	_nr(rr, NC, 2.0)
	_gstr(font, Vector2(rr.position.x + 6.0, rr.position.y + 20.0), "RIGHT",  NC, 10)
	_gstr(font, Vector2(rr.position.x + 6.0, rr.position.y + 34.0), "TARGET", NC, 10)
	_gstr(font, Vector2(rr.position.x + 6.0, rr.position.y + 48.0), "BANK",   NC, 10)

func _d_center_target_scoop() -> void:
	var font := ThemeDB.fallback_font
	var sq   := Rect2(262.0, 314.0, 64.0, 50.0)
	draw_rect(sq, Color(0.06, 0.0, 0.16, 0.92))
	_nr(sq, NC, 2.0)
	_gstr(font, Vector2(CX - 22.0, sq.position.y - 4.0), "TARGET", NC, 10)
	var dc := Vector2(CX, 414.0);  var dw := 38.0;  var dh := 42.0
	var dp := PackedVector2Array([
		dc + Vector2(0.0,      -dh * 0.9),
		dc + Vector2( dw,      -dh * 0.2),
		dc + Vector2( dw*0.55,  dh * 0.9),
		dc + Vector2(-dw*0.55,  dh * 0.9),
		dc + Vector2(-dw,      -dh * 0.2),
	])
	draw_colored_polygon(dp, Color(0.06, 0.0, 0.16, 0.92))
	for i in dp.size():
		_np(PackedVector2Array([dp[i], dp[(i + 1) % dp.size()]]), NC, 2.0)
	_gstr(font, Vector2(CX - 24.0, dc.y + 4.0),  "MODE",  NC, 9)
	_gstr(font, Vector2(CX - 24.0, dc.y + 16.0), "SCOOP", NC, 9)

func _d_ramps() -> void:
	var font := ThemeDB.fallback_font
	# Left outer ramp curve (pink) with rollover dots
	var lo := _bez(Vector2(LI - 6.0, RAMP_Y),
				   Vector2(86.0, 492.0), Vector2(42.0, 566.0),
				   Vector2(LW + 22.0, 638.0), 40)
	_np(lo, NP, 2.5)
	for i in range(0, lo.size(), 5):
		draw_circle(lo[i], 4.5, NP)
		draw_circle(lo[i], 8.0, Color(NP.r, NP.g, NP.b, 0.22))
	# Left inner ramp guide (cyan)
	var li2 := _bez(Vector2(LI - 22.0, RAMP_Y + 10.0),
					Vector2(108.0, 500.0), Vector2(60.0, 570.0),
					Vector2(LW + 36.0, 632.0), 40)
	_np(li2, NC, 1.8)
	_draw_arrow(Vector2(LI - 14.0, RAMP_Y + 20.0), Vector2(-0.85, 0.53).normalized(), NP, 11.0)
	# Rotated "LEFT RAMP" label
	draw_set_transform(Vector2(136.0, 526.0), -0.50, Vector2.ONE)
	_gstr(font, Vector2.ZERO, "LEFT RAMP", NP, 11)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	_gstr(font, Vector2(172.0, 878.0), "LEFT RAMP", NC, 9)

	# Right outer ramp curve (mirror)
	var ro := _bez(Vector2(RI + 6.0, RAMP_Y),
				   Vector2(VW - 86.0, 492.0), Vector2(VW - 42.0, 566.0),
				   Vector2(RW - 22.0, 638.0), 40)
	_np(ro, NP, 2.5)
	for i in range(0, ro.size(), 5):
		draw_circle(ro[i], 4.5, NP)
		draw_circle(ro[i], 8.0, Color(NP.r, NP.g, NP.b, 0.22))
	var ri2 := _bez(Vector2(RI + 22.0, RAMP_Y + 10.0),
					Vector2(VW - 108.0, 500.0), Vector2(VW - 60.0, 570.0),
					Vector2(RW - 36.0, 632.0), 40)
	_np(ri2, NC, 1.8)
	_draw_arrow(Vector2(RI + 14.0, RAMP_Y + 20.0), Vector2(0.85, 0.53).normalized(), NP, 11.0)
	draw_set_transform(Vector2(VW - 136.0, 526.0), 0.50, Vector2.ONE)
	_gstr(font, Vector2.ZERO, "RIGHT RAMP", NP, 11)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	_gstr(font, Vector2(VW - 270.0, 878.0), "RIGHT RAMP", NC, 9)

func _draw_arrow(pos: Vector2, dir: Vector2, col: Color, sz: float) -> void:
	var perp := Vector2(-dir.y, dir.x)
	var pts  := PackedVector2Array([
		pos + dir * sz, pos - perp * sz * 0.5, pos + perp * sz * 0.5
	])
	draw_colored_polygon(pts, col)
	draw_polyline(PackedVector2Array([pts[0], pts[1], pts[2], pts[0]]),
		Color(1, 1, 1, 0.3), 1.0, true)

func _d_spinner_lane() -> void:
	var lx := CX - 46.0;  var rx := CX + 46.0
	var ty := 460.0;       var by := 658.0
	_nl(Vector2(lx, ty), Vector2(lx, by), NC, 2.0)
	_nl(Vector2(rx, ty), Vector2(rx, by), NC, 2.0)
	_nl(Vector2(lx, ty - 2.0), Vector2(lx + 8.0, ty - 20.0), NC, 1.5)
	_nl(Vector2(rx, ty - 2.0), Vector2(rx - 8.0, ty - 20.0), NC, 1.5)
	for i in 8:
		if i % 2 == 0:
			var frac := float(i) / 8.0
			var y1   := ty + 12.0 + frac * (by - ty - 24.0)
			var y2   := y1 + (by - ty - 24.0) / 8.0 * 0.55
			_nl(Vector2(CX, y1), Vector2(CX, y2), Color(NC.r, NC.g, NC.b, 0.40), 1.2)
	var br  := Rect2(CX - 58.0, 618.0, 116.0, 46.0)
	draw_rect(br, Color(0.04, 0.0, 0.12, 0.92))
	_nr(br, NC, 2.0)
	var font := ThemeDB.fallback_font
	_gstr(font, Vector2(br.position.x + 14.0, br.position.y + 16.0), "SPINNER", NC, 11)
	_gstr(font, Vector2(br.position.x + 22.0, br.position.y + 30.0), "LANE",    NC, 11)

func _d_bracket_channels() -> void:
	_nl(Vector2(LI, RAMP_Y + 2.0),  Vector2(LO + 4.0, 644.0), NC, 1.8)
	_nl(Vector2(LO + 4.0, 644.0),   Vector2(LO + 4.0, OUTL_Y), NC, 1.8)
	_nl(Vector2(LW + 2.0, 638.0),   Vector2(LW + 2.0, OUTL_Y), NC, 2.0)
	_nl(Vector2(RI, RAMP_Y + 2.0),  Vector2(RO - 4.0, 644.0), NC, 1.8)
	_nl(Vector2(RO - 4.0, 644.0),   Vector2(RO - 4.0, OUTL_Y), NC, 1.8)
	_nl(Vector2(RW - 2.0, 638.0),   Vector2(RW - 2.0, OUTL_Y), NC, 2.0)

func _d_inlane_outlane_rails() -> void:
	var font := ThemeDB.fallback_font
	_nl(Vector2(LW, OUTL_Y),    Vector2(LO, 700.0),  NC, 2.5)
	_nl(Vector2(LO, 700.0),     Vector2(LO, 916.0),  NC, 2.5)
	_nl(Vector2(LO, 916.0),     Vector2(LF, FLIP_Y), NC, 2.5)
	_nl(Vector2(LO, 700.0),     Vector2(148.0, 700.0), NC, 2.5)
	_nl(Vector2(148.0, 700.0),  Vector2(148.0, 916.0), NC, 2.5)
	_nl(Vector2(148.0, 916.0),  Vector2(LF, FLIP_Y),   NC, 2.5)
	var il := Rect2(92.0, 766.0, 52.0, 90.0)
	draw_rect(il, Color(0.0, 0.1, 0.05, 0.72))
	for hy in range(int(il.position.y) + 6, int(il.end.y), 9):
		_nl(Vector2(il.position.x + 3.0, float(hy)),
			Vector2(il.end.x - 3.0,      float(hy)),
			Color(NG.r, NG.g, NG.b, 0.55), 1.5)
	_nr(il, NG, 1.5)
	_gstr(font, Vector2(22.0, 956.0), "INLLANES", NC, 8)
	_gstr(font, Vector2(22.0, 968.0), "OUTLANES", NC, 8)

	_nl(Vector2(RW, OUTL_Y),    Vector2(RO, 700.0),  NC, 2.5)
	_nl(Vector2(RO, 700.0),     Vector2(RO, 916.0),  NC, 2.5)
	_nl(Vector2(RO, 916.0),     Vector2(RF, FLIP_Y), NC, 2.5)
	_nl(Vector2(RO, 700.0),     Vector2(428.0, 700.0), NC, 2.5)
	_nl(Vector2(428.0, 700.0),  Vector2(428.0, 916.0), NC, 2.5)
	_nl(Vector2(428.0, 916.0),  Vector2(RF, FLIP_Y),   NC, 2.5)
	var ir := Rect2(VW - il.end.x, il.position.y, il.size.x, il.size.y)
	draw_rect(ir, Color(0.0, 0.1, 0.05, 0.72))
	for hy in range(int(ir.position.y) + 6, int(ir.end.y), 9):
		_nl(Vector2(ir.position.x + 3.0, float(hy)),
			Vector2(ir.end.x - 3.0,      float(hy)),
			Color(NG.r, NG.g, NG.b, 0.55), 1.5)
	_nr(ir, NG, 1.5)
	_gstr(font, Vector2(VW - 100.0, 956.0), "INANES",  NC, 8)
	_gstr(font, Vector2(VW - 100.0, 968.0), "OUTLANES", NC, 8)
	_gstr(font, Vector2(CX - 82.0, 922.0), "INADLE", NC, 9)
	_gstr(font, Vector2(CX + 6.0,  922.0), "INANES",  NC, 9)

func _d_flipper_guides() -> void:
	_nl(Vector2(LF, FLIP_Y), Vector2(224.0, 974.0), NC, 2.5)
	_nl(Vector2(RF, FLIP_Y), Vector2(352.0, 974.0), NC, 2.5)
	for i in 5:
		if i % 2 == 0:
			var x1 := 224.0 + float(i) * (352.0 - 224.0) / 4.0
			var x2 := x1 + (352.0 - 224.0) / 8.0
			_nl(Vector2(x1, 978.0), Vector2(x2, 978.0),
				Color(NC.r, NC.g, NC.b, 0.35), 1.0)
	var font := ThemeDB.fallback_font
	_gstr(font, Vector2(CX - 36.0, 962.0), "FLIPPERS", NP, 12)

func _d_plunger_trapezoid() -> void:
	var tw := 74.0;  var bw := 42.0;  var py := 982.0;  var ph := 26.0
	var pts := PackedVector2Array([
		Vector2(CX - tw * 0.5, py),       Vector2(CX + tw * 0.5, py),
		Vector2(CX + bw * 0.5, py + ph),  Vector2(CX - bw * 0.5, py + ph),
	])
	draw_colored_polygon(pts, Color(0.04, 0.0, 0.12, 0.82))
	for i in pts.size():
		_np(PackedVector2Array([pts[i], pts[(i + 1) % pts.size()]]), NC, 2.0)

func _d_wall_inserts() -> void:
	var ys := [264.0, 348.0, 430.0, 514.0, 594.0]
	for i in ys.size():
		for side in [-1.0, 1.0]:
			var px  := (LW + 9.0) if side < 0.0 else (RW - 9.0)
			var ph  := fmod(_time * 2.4 + float(i) * 0.72 + (0.0 if side < 0.0 else PI), TAU)
			var br  := (sin(ph) + 1.0) * 0.5
			var col := Color(NP.r, NP.g, NP.b, 0.45 + br * 0.55)
			draw_circle(Vector2(px, ys[i]), 8.0, Color(col.r, col.g, col.b, 0.16 + br * 0.14))
			draw_circle(Vector2(px, ys[i]), 5.0, col)
			draw_circle(Vector2(px, ys[i]), 2.5, Color(1.0, 1.0, 1.0, 0.28 + br * 0.42))
	for i in 3:
		var y   := 394.0 + float(i) * 90.0
		var ph  := fmod(_time * 1.6 + float(i) * 1.2, TAU)
		var br  := (sin(ph) + 1.0) * 0.45
		var col := Color(NP.r, NP.g, NP.b, 0.30 + br * 0.50)
		_draw_diamond(Vector2(LW + 22.0, y), col, 5.0)
		_draw_diamond(Vector2(RW - 22.0, y), col, 5.0)

func _draw_diamond(pos: Vector2, col: Color, r: float) -> void:
	var pts := PackedVector2Array([
		pos + Vector2(0, -r * 1.5), pos + Vector2(r, 0),
		pos + Vector2(0,  r * 1.5), pos + Vector2(-r, 0),
	])
	draw_colored_polygon(pts, col)
	draw_polyline(PackedVector2Array([pts[3], pts[0], pts[1], pts[2], pts[3]]),
		Color(1, 1, 1, 0.28), 1.0, true)
