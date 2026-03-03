## hud.gd — CanvasLayer — heads-up display
extends CanvasLayer

@onready var _score_lbl    : Label       = $ScoreLabel
@onready var _balls_lbl    : Label       = $BallsLabel
@onready var _mult_lbl     : Label       = $MultLabel
@onready var _mode_lbl     : Label       = $ModeLabel
@onready var _tilt_bar     : ProgressBar = $TiltBar
@onready var _jackpot_lbl  : Label       = $JackpotLabel
@onready var _callout_lbl  : Label       = $CalloutLabel
@onready var _callout_tmr  : Timer       = $CalloutTimer

func _ready() -> void:
	GameState.score_changed.connect(_on_score)
	GameState.ball_count_changed.connect(_on_balls)
	GameState.multiplier_changed.connect(_on_mult)
	GameState.state_changed.connect(_on_state)
	GameState.mode_started.connect(_on_mode_started)
	GameState.mode_ended.connect(_on_mode_ended)
	GameState.tilt_meter_changed.connect(_on_tilt)
	GameState.jackpot_lit_changed.connect(_on_jackpot)
	GameState.callout_requested.connect(_on_callout)

	_jackpot_lbl.hide()
	_callout_lbl.hide()
	_tilt_bar.value = 0.0

# ──────────────────────────────────────────────────────────────────────────────
func _on_score(v: int) -> void:
	_score_lbl.text = _fmt(v)

func _on_balls(v: int) -> void:
	_balls_lbl.text = "BALL %d" % (GameState.MAX_BALLS - v + 1)

func _on_mult(v: int) -> void:
	_mult_lbl.text = "x%d" % v

func _on_state(s: GameState.State) -> void:
	match s:
		GameState.State.GAME_OVER:
			_show_callout("GAME OVER", 0.0)
			_callout_tmr.stop()
		GameState.State.PLAYING:
			_callout_lbl.hide()

func _on_mode_started(mode: String) -> void:
	_mode_lbl.text     = mode
	_mode_lbl.modulate = Color(1.0, 0.55, 0.0)
	_mode_lbl.show()

func _on_mode_ended(_mode: String) -> void:
	_mode_lbl.text = ""
	_mode_lbl.hide()

func _on_tilt(v: float) -> void:
	_tilt_bar.value = v * 100.0
	_tilt_bar.modulate = Color(1.0, 1.0 - v * 0.8, 0.0)

func _on_jackpot(lit: bool) -> void:
	if lit:
		_jackpot_lbl.text = "♦  JACKPOT  LIT  ♦"
		_jackpot_lbl.show()
	else:
		_jackpot_lbl.hide()

func _on_callout(text: String, duration: float) -> void:
	_show_callout(text, duration)

func _show_callout(text: String, duration: float) -> void:
	_callout_lbl.text = text
	_callout_lbl.show()
	if duration > 0.0:
		_callout_tmr.wait_time = duration
		_callout_tmr.start()

func _on_callout_timer_timeout() -> void:
	_callout_lbl.hide()

# ──────────────────────────────────────────────────────────────────────────────
func _fmt(n: int) -> String:
	var s   := str(n)
	var out := ""
	for i in s.length():
		if i > 0 and (s.length() - i) % 3 == 0:
			out += ","
		out += s[i]
	return out
