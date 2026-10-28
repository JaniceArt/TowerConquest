using UnityEngine;

public enum TeamSide { Left, Right }
public enum TowerType { MainHouse, StepTower }

public class Tower : MonoBehaviour, IDamageable
{
    public TeamSide team;
    public TowerType towerType;
    public float maxHp = 1000f;
    public float currentHp;

    public TeamSide Team => team;
    public Vector3 Position => transform.position;
    public float Radius => towerType == TowerType.MainHouse
        ? MapConfig.ToUnity(MapConfig.MainHouseDiam * 0.5f)
        : MapConfig.ToUnity(MapConfig.StepTowerDiam * 0.5f);

    float range => towerType == TowerType.MainHouse
        ? MapConfig.ToUnity(MapConfig.MainHouseRange)
        : MapConfig.ToUnity(MapConfig.StepTowerRange);

    void Awake()
    {
        if (currentHp <= 0f)
            currentHp = maxHp > 0f ? maxHp : 1000f;
    }

    public bool InRange(float targetX)
    {
        return Mathf.Abs(transform.position.x - targetX) <= range;
    }

    public bool IsAlive => this != null && currentHp > 0f && gameObject.activeInHierarchy;

    public void TakeDamage(float amount)
    {
        currentHp = Mathf.Max(0f, currentHp - amount);
        if (currentHp <= 0f)
        {
            GameEvents.TriggerTowerDestroyed(this);
            gameObject.SetActive(false);
        }
    }
}
