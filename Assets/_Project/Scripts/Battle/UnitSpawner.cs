using UnityEngine;
using UnityEngine.InputSystem;

public class UnitSpawner : MonoBehaviour
{
    [SerializeField] GameObject unitPrefab;
    [SerializeField] UnitStats playerUnitStats;
    [SerializeField] UnitStats enemyUnitStats;
    [SerializeField] float enemySpawnInterval = 4f;

    float enemyTimer;

    void Update()
    {
        if (Keyboard.current != null && Keyboard.current.spaceKey.wasPressedThisFrame)
            Spawn(TeamSide.Left);

        enemyTimer += Time.deltaTime;
        if (enemyTimer >= enemySpawnInterval)
        {
            enemyTimer = 0f;
            Spawn(TeamSide.Right);
        }
    }

    void Spawn(TeamSide team)
    {
        float houseEdge = MapConfig.ToUnity(MapConfig.MainHouseDiam * 0.5f);
        float x = team == TeamSide.Left
            ? -MapConfig.MainHouseX + houseEdge
            :  MapConfig.MainHouseX - houseEdge;

        GameObject go = Instantiate(unitPrefab, new Vector3(x, 0f, 0f), Quaternion.identity);
        Unit unit = go.GetComponent<Unit>();
        UnitStats s = team == TeamSide.Left ? playerUnitStats : enemyUnitStats;
        unit.Init(s, team);
    }
}
