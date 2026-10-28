using System.Collections.Generic;
using UnityEngine;

public class UnitManager : MonoBehaviour
{
    public static UnitManager Instance { get; private set; }

    readonly List<Unit> leftUnits  = new();
    readonly List<Unit> rightUnits = new();

    readonly List<Tower> leftTowers = new();
    readonly List<Tower> rightTowers = new();

    void Awake()
    {
        Instance = this;
        InitTowers();
    }

    void InitTowers()
    {
        leftTowers.Clear();
        rightTowers.Clear();
        Tower[] towers = FindObjectsByType<Tower>(FindObjectsSortMode.None);
        foreach (Tower t in towers)
        {
            if (t.team == TeamSide.Left) leftTowers.Add(t);
            else rightTowers.Add(t);
        }
    }

    void OnEnable()
    {
        GameEvents.OnUnitSpawned += Register;
        GameEvents.OnUnitDied += Unregister;
        GameEvents.OnTowerDestroyed += HandleTowerDestroyed;
    }

    void OnDisable()
    {
        GameEvents.OnUnitSpawned -= Register;
        GameEvents.OnUnitDied -= Unregister;
        GameEvents.OnTowerDestroyed -= HandleTowerDestroyed;
    }

    public void Register(Unit u)
    {
        if (u.team == TeamSide.Left) leftUnits.Add(u);
        else rightUnits.Add(u);
    }

    public void Unregister(Unit u)
    {
        if (u.team == TeamSide.Left) leftUnits.Remove(u);
        else rightUnits.Remove(u);
    }

    void HandleTowerDestroyed(Tower t)
    {
        if (t.team == TeamSide.Left) leftTowers.Remove(t);
        else rightTowers.Remove(t);
    }

    public IDamageable FindNearestTarget(Unit self)
    {
        bool isLeft = self.team == TeamSide.Left;
        List<Unit> enemies = isLeft ? rightUnits : leftUnits;
        List<Tower> enemyTowers = isLeft ? rightTowers : leftTowers;

        Unit nearestEnemy = null;
        float minUnitDist = float.MaxValue;

        foreach (Unit e in enemies)
        {
            if (e == null || !e.IsAlive) continue;
            bool inFront = isLeft ? (e.transform.position.x >= self.transform.position.x - 0.2f)
                                  : (e.transform.position.x <= self.transform.position.x + 0.2f);
            if (!inFront) continue;

            float d = Mathf.Abs(self.transform.position.x - e.transform.position.x);
            if (d < minUnitDist)
            {
                minUnitDist = d;
                nearestEnemy = e;
            }
        }

        if (nearestEnemy != null)
            return nearestEnemy;

        Tower nearestTower = null;
        float minTowerDist = float.MaxValue;

        foreach (Tower t in enemyTowers)
        {
            if (t == null || !t.IsAlive) continue;
            bool inFront = isLeft ? (t.transform.position.x >= self.transform.position.x - 0.2f)
                                  : (t.transform.position.x <= self.transform.position.x + 0.2f);
            if (!inFront) continue;

            float d = Mathf.Abs(self.transform.position.x - t.transform.position.x);
            if (d < minTowerDist)
            {
                minTowerDist = d;
                nearestTower = t;
            }
        }

        return nearestTower;
    }
}
