## GameState.gd  —  Autoload singleton
## Central game-state machine: score, balls, modes, multiball, persistence.
extends Node

# ──────────────────────────────────────────────────────────────────────────
#  SIGNALS
# ──────────────────────────────────────────────────────────────────────────
signal score_changed(new_score: int)
signal multiplier_changed(mult: int)
signal ball_count_changed(remaining: int)
signal state_changed(new_state: State)
signal mode_started(mode_name: String)
signal mode_ended(mode_name: String)
signal tilt_meter_changed(value: float)   # 0–1
signal jackpot_lit_changed(lit: bool)
signal callout_requested(text: String, duration: float)
signal screen_shake_requested(strength: float, duration: float)
signal multiball_started(ball_count: int)
signal multiball_ended

# ──────────────────────────────────────────────────────────────────────────
#  GAME STATE ENUM
# ──────────────────────────────────────────────────────────────────────────
enum State { START_MENU, PLAYING, PAUSED, BALL_DRAINED, GAME_OVER }

# ──────────────────────────────────────────────────────────────────────────
#  SCORE / BALLS
# ──────────────────────────────────────────────────────────────────────────
var current_state : State = State.START_MENU
var score         : int   = 0
var ball_number   : int   = 1
const MAX_BALLS   : int   = 3

var base_multiplier   : int   = 1   # 1–8, earned through gameplay
var combo_hits        : int   = 0   # consecutive bumper hits for combo
var combo_timer       : float = 0.0
const COMBO_TIMEOUT   : float = 2.5  # seconds before combo resets

# ──────────────────────────────────────────────────────────────────────────
#  TILT
# ──────────────────────────────────────────────────────────────────────────
var tilt_meter    : float = 0.0     # 0..TILT_THRESHOLD
var tilt_cooldown : float = 0.0
var tilted        : bool  = false

# ──────────────────────────────────────────────────────────────────────────
#  TARGETS / LOCKS
# ──────────────────────────────────────────────────────────────────────────
var left_targets_hit  : int = 0   # 0–3 left standup bank
var right_targets_hit : int = 0   # 0–3 right standup bank
var locks_held        : int = 0   # balls locked for multiball
var multiball_active  : bool = false
var balls_in_play     : int = 0

# ──────────────────────────────────────────────────────────────────────────
#  JACKPOT
# ──────────────────────────────────────────────────────────────────────────
var jackpot_lit       : bool = false
var jackpot_value     : int  = 25_000
var jackpots_collected: int  = 0

# ──────────────────────────────────────────────────────────────────────────
#  SPINNER
# ──────────────────────────────────────────────────────────────────────────
var spinner_ticks     : int  = 0
var double_down_lit   : bool = false
const SPINNER_DOUBLE_DOWN_THRESHOLD : int = 25

# ──────────────────────────────────────────────────────────────────────────
#  ACTIVE MODE
# ──────────────────────────────────────────────────────────────────────────
var active_mode       : String = ""    # "" | "SHOWTIME" | "DOUBLE_DOWN" | "HIGH_ROLLER"
var mode_timer        : float  = 0.0
var mode_queue        : Array  = []    # modes queued by scoop hits
const MODE_DURATION   : float  = 25.0

func _ready() -> void:
	pass

func _process(delta: float) -> void:
	if current_state != State.PLAYING:
		return

	# Combo timeout
	if combo_hits > 0:
		combo_timer -= delta
		if combo_timer <= 0.0:
			combo_hits = 0

	# Tilt meter decay
	if tilt_meter > 0.0:
		tilt_meter = max(0.0, tilt_meter - delta * (1.0 - PhysicsConfig.TILT_DECAY_RATE) * 3.0)
		emit_signal("tilt_meter_changed", tilt_meter / PhysicsConfig.TILT_THRESHOLD)

	# Tilt cooldown
	if tilt_cooldown > 0.0:
		tilt_cooldown -= delta

	# Mode timer
	if active_mode != "" and mode_timer > 0.0:
		mode_timer -= delta
		if mode_timer <= 0.0:
			_end_mode()

# ──────────────────────────────────────────────────────────────────────────
#  STATE MACHINE
# ──────────────────────────────────────────────────────────────────────────
func start_game() -> void:
	score         = 0
	ball_number   = 1
	base_multiplier = 1
	combo_hits    = 0
	tilt_meter    = 0.0
	tilted        = false
	left_targets_hit  = 0
	right_targets_hit = 0
	locks_held    = 0
	multiball_active = false
	balls_in_play = 1
	jackpot_lit   = false
	jackpot_value = 25_000
	jackpots_collected = 0
	spinner_ticks = 0
	double_down_lit = false
	active_mode   = ""
	mode_timer    = 0.0
	mode_queue    = []
	_set_state(State.PLAYING)
	emit_signal("score_changed", score)
	emit_signal("ball_count_changed", MAX_BALLS - ball_number + 1)

func ball_drained() -> void:
	if multiball_active:
		balls_in_play -= 1
		if balls_in_play > 1:
			return   # still have live balls
		else:
			multiball_active = false
			emit_signal("multiball_ended")

	if active_mode != "":
		_end_mode()

	_set_state(State.BALL_DRAINED)
	combo_hits = 0
	await get_tree().create_timer(1.8).timeout

	if ball_number >= MAX_BALLS:
		_set_state(State.GAME_OVER)
		_save_high_score()
	else:
		ball_number += 1
		tilted = false
		tilt_meter = 0.0
		emit_signal("ball_count_changed", MAX_BALLS - ball_number + 1)
		_set_state(State.PLAYING)

func pause_game() -> void:
	if current_state == State.PLAYING:
		_set_state(State.PAUSED)
		get_tree().paused = true
	elif current_state == State.PAUSED:
		_set_state(State.PLAYING)
		get_tree().paused = false

func _set_state(s: State) -> void:
	current_state = s
	emit_signal("state_changed", s)

# ──────────────────────────────────────────────────────────────────────────
#  SCORING
# ──────────────────────────────────────────────────────────────────────────
func add_score(base_pts: int, source: String = "") -> void:
	if tilted:
		return
	var mult := effective_multiplier()
	var pts   := base_pts * mult
	score += pts
	emit_signal("score_changed", score)
	emit_signal("callout_requested", "+%s" % _fmt(pts), 0.9)

func effective_multiplier() -> int:
	var m := base_multiplier
	if active_mode == "SHOWTIME"     and false:  m *= 3   # bumpers handled separately
		pass
	if active_mode == "DOUBLE_DOWN"  and false:  m *= 5   # spinner handled separately
		pass
	return m

# ──────────────────────────────────────────────────────────────────────────
#  BUMPER HIT
# ──────────────────────────────────────────────────────────────────────────
func bumper_hit() -> void:
	combo_hits += 1
	combo_timer = COMBO_TIMEOUT
	var bumper_mult := 3 if active_mode == "SHOWTIME" else 1
	var pts := 1_000 * bumper_mult * min(combo_hits, 5)
	add_score(pts, "bumper")
	emit_signal("screen_shake_requested", 0.4, 0.12)
	if combo_hits >= 5:
		emit_signal("callout_requested", "COMBO x%d!" % combo_hits, 1.2)

# ──────────────────────────────────────────────────────────────────────────
#  SLINGSHOT HIT
# ──────────────────────────────────────────────────────────────────────────
func slingshot_hit() -> void:
	add_score(500, "slingshot")

# ──────────────────────────────────────────────────────────────────────────
#  STANDUP TARGETS
# ──────────────────────────────────────────────────────────────────────────
func standup_hit(side: String) -> void:
	add_score(2_500, "standup")
	if side == "left":
		left_targets_hit = min(left_targets_hit + 1, 3)
		if left_targets_hit == 3:
			_light_jackpot("left")
	else:
		right_targets_hit = min(right_targets_hit + 1, 3)
		if right_targets_hit == 3:
			_light_jackpot("right")

func _light_jackpot(side: String) -> void:
	jackpot_lit = true
	emit_signal("jackpot_lit_changed", true)
	emit_signal("callout_requested", "JACKPOT LIT!", 1.5)
	# Reset target bank for re-lighting
	if side == "left":  left_targets_hit  = 0
	else:               right_targets_hit = 0

# ──────────────────────────────────────────────────────────────────────────
#  RAMPS
# ──────────────────────────────────────────────────────────────────────────
func ramp_completed() -> void:
	if active_mode == "HIGH_ROLLER":
		score += jackpot_value
		jackpot_value += 5_000
		jackpots_collected += 1
		emit_signal("score_changed", score)
		emit_signal("callout_requested", "JACKPOT! %s" % _fmt(jackpot_value), 2.0)
		emit_signal("screen_shake_requested", 0.8, 0.25)
	elif jackpot_lit:
		score += jackpot_value
		jackpot_lit = false
		emit_signal("score_changed", score)
		emit_signal("jackpot_lit_changed", false)
		emit_signal("callout_requested", "JACKPOT! %s" % _fmt(jackpot_value), 2.0)
		emit_signal("screen_shake_requested", 0.8, 0.25)
	else:
		add_score(5_000, "ramp")

# ──────────────────────────────────────────────────────────────────────────
#  SPINNER
# ──────────────────────────────────────────────────────────────────────────
func spinner_tick() -> void:
	spinner_ticks += 1
	var pts := 500 if active_mode == "DOUBLE_DOWN" else 100
	add_score(pts, "spinner")
	if not double_down_lit and spinner_ticks >= SPINNER_DOUBLE_DOWN_THRESHOLD:
		double_down_lit = true
		emit_signal("callout_requested", "DOUBLE DOWN LIT!", 1.5)

# ──────────────────────────────────────────────────────────────────────────
#  SCOOP / MODE
# ──────────────────────────────────────────────────────────────────────────
func scoop_hit() -> void:
	# Try to lock for multiball first
	if locks_held < 2 and not multiball_active:
		locks_held += 1
		emit_signal("callout_requested", "BALL LOCKED! (%d/2)" % locks_held, 1.5)
		if locks_held == 2:
			start_multiball()
		return

	# Start next mode
	var modes := ["SHOWTIME", "DOUBLE_DOWN", "HIGH_ROLLER"]
	var next   := modes[mode_queue.size() % modes.size()]
	mode_queue.append(next)
	_start_mode(next)

func _start_mode(mode: String) -> void:
	active_mode = mode
	mode_timer  = MODE_DURATION
	emit_signal("mode_started", mode)
	match mode:
		"SHOWTIME":
			emit_signal("callout_requested", "SHOWTIME!", 2.0)
		"DOUBLE_DOWN":
			emit_signal("callout_requested", "DOUBLE DOWN!", 2.0)
		"HIGH_ROLLER":
			jackpot_value = 10_000
			emit_signal("callout_requested", "HIGH ROLLER!", 2.0)

func _end_mode() -> void:
	var ended := active_mode
	active_mode = ""
	mode_timer  = 0.0
	emit_signal("mode_ended", ended)
	emit_signal("callout_requested", "MODE OVER", 1.2)

# ──────────────────────────────────────────────────────────────────────────
#  MULTIBALL
# ──────────────────────────────────────────────────────────────────────────
func start_multiball() -> void:
	locks_held = 0
	multiball_active = true
	balls_in_play = 2
	emit_signal("multiball_started", 2)
	emit_signal("callout_requested", "MULTIBALL!", 2.5)
	emit_signal("screen_shake_requested", 1.0, 0.4)

# ──────────────────────────────────────────────────────────────────────────
#  NUDGE / TILT
# ──────────────────────────────────────────────────────────────────────────
func nudge(direction: Vector2) -> bool:
	if tilted or current_state != State.PLAYING:
		return false
	if tilt_cooldown > 0.0:
		return false

	tilt_meter += 1.0
	tilt_cooldown = PhysicsConfig.NUDGE_COOLDOWN
	emit_signal("tilt_meter_changed", tilt_meter / PhysicsConfig.TILT_THRESHOLD)

	if tilt_meter >= PhysicsConfig.TILT_THRESHOLD:
		_trigger_tilt()
		return false

	return true   # nudge applied

func _trigger_tilt() -> void:
	tilted = true
	emit_signal("callout_requested", "TILT!", 3.0)
	emit_signal("screen_shake_requested", 1.5, 0.5)

# ──────────────────────────────────────────────────────────────────────────
#  HIGH SCORE  (JSON persistence)
# ──────────────────────────────────────────────────────────────────────────
const SCORE_FILE := "user://high_scores.json"
const MAX_ENTRIES := 10
var high_scores : Array = []

func load_high_scores() -> void:
	if not FileAccess.file_exists(SCORE_FILE):
		return
	var f := FileAccess.open(SCORE_FILE, FileAccess.READ)
	var data := JSON.parse_string(f.get_as_text())
	f.close()
	if data is Array:
		high_scores = data

func _save_high_score() -> void:
	load_high_scores()
	high_scores.append({"score": score, "ball": ball_number})
	high_scores.sort_custom(func(a, b): return a["score"] > b["score"])
	if high_scores.size() > MAX_ENTRIES:
		high_scores.resize(MAX_ENTRIES)
	var f := FileAccess.open(SCORE_FILE, FileAccess.WRITE)
	f.store_string(JSON.stringify(high_scores))
	f.close()

# ──────────────────────────────────────────────────────────────────────────
#  HELPERS
# ──────────────────────────────────────────────────────────────────────────
func _fmt(n: int) -> String:
	# e.g. 1234567 → "1,234,567"
	var s := str(n)
	var out := ""
	for i in s.length():
		if i > 0 and (s.length() - i) % 3 == 0:
			out += ","
		out += s[i]
	return out
