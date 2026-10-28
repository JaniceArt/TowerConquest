using UnityEngine;

public interface IDamageable
{
    TeamSide Team { get; }
    Vector3 Position { get; }
    float Radius { get; }
    bool IsAlive { get; }
    void TakeDamage(float amount);
}
