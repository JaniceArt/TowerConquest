using System;

public static class GameEvents
{
    public static event Action<Unit> OnUnitSpawned;
    public static event Action<Unit> OnUnitDied;
    public static event Action<Unit, float, float> OnUnitDamageTaken;
    public static event Action<Tower> OnTowerDestroyed;

    public static void TriggerUnitSpawned(Unit unit)
    {
        OnUnitSpawned?.Invoke(unit);
    }

    public static void TriggerUnitDied(Unit unit)
    {
        OnUnitDied?.Invoke(unit);
    }

    public static void TriggerUnitDamageTaken(Unit unit, float currentHp, float maxHp)
    {
        OnUnitDamageTaken?.Invoke(unit, currentHp, maxHp);
    }

    public static void TriggerTowerDestroyed(Tower tower)
    {
        OnTowerDestroyed?.Invoke(tower);
    }
}
