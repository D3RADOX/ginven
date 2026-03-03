## AudioManager.gd — Autoload singleton
## Plays one-shot SFX from a small pool of AudioStreamPlayers.
## Sounds are loaded lazily from res://assets/sounds/<name>.ogg (or .wav).
extends Node

const POOL_SIZE := 8

var _players : Array[AudioStreamPlayer] = []
var _cache   : Dictionary = {}   # sound_name → AudioStream or null
var _idx     : int = 0

func _ready() -> void:
	for i in POOL_SIZE:
		var p := AudioStreamPlayer.new()
		p.bus = "SFX"
		add_child(p)
		_players.append(p)

# ──────────────────────────────────────────────────────────────────────────────
func play(sound_name: String, volume_db: float = 0.0) -> void:
	var stream := _get_stream(sound_name)
	if stream == null:
		return
	var p := _players[_idx]
	p.stream    = stream
	p.volume_db = volume_db
	p.play()
	_idx = (_idx + 1) % POOL_SIZE

# ──────────────────────────────────────────────────────────────────────────────
func _get_stream(name: String) -> AudioStream:
	if _cache.has(name):
		return _cache[name]
	for ext in ["ogg", "wav"]:
		var path := "res://assets/sounds/%s.%s" % [name, ext]
		if ResourceLoader.exists(path):
			var s := load(path) as AudioStream
			_cache[name] = s
			return s
	_cache[name] = null   # cache miss — avoid repeated disk checks
	return null
