using UnityEngine;

[CreateAssetMenu(fileName = "UnitStats", menuName = "TowerConquest/Unit Stats")]
public class UnitStats : ScriptableObject
{
    public string unitName;
    public UnitType unitType;
    public AttackTarget attackTarget;

    public float maxHp;
    public float damage;
    public float moveSpeed;
    public float attackRangeDoc;
    public float attackCooldown;
    public int manaCost;

    public Color placeholderColor = Color.white;
    public Vector2 placeholderSize = Vector2.one;
}
