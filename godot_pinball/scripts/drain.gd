## drain.gd — Area2D — ball drain detector (bottom of table)
extends Area2D

func _ready() -> void:
	collision_layer = PhysicsConfig.LAYER_SENSOR
	collision_mask  = PhysicsConfig.LAYER_BALL
	body_entered.connect(_on_body_entered)

func _on_body_entered(body: Node) -> void:
	if not body.is_in_group("ball"):
		return
	# Park the ball off-screen and notify GameState
	var rb := body as RigidBody2D
	rb.freeze           = true
	rb.linear_velocity  = Vector2.ZERO
	rb.angular_velocity = 0.0
	rb.visible          = false
	rb.global_position  = Vector2(-3000.0, -3000.0)
	AudioManager.play("drain")
	GameState.ball_drained()
