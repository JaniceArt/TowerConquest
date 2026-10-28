using System;
using UnityEngine;

[RequireComponent(typeof(SpriteRenderer))]
public class Unit : MonoBehaviour, IDamageable
{
    public UnitStats stats;
    public TeamSide team;

    public enum State { Moving, Attacking }

    float currentHp;
    SpriteRenderer sr;
    State state = State.Moving;
    IDamageable target;
    float attackTimer;

    public TeamSide Team => team;
    public Vector3 Position => transform.position;
    public float Radius => stats != null ? stats.placeholderSize.x * 0.5f : 0.5f;
    public bool IsAlive => this != null && currentHp > 0f;
    public float CurrentHp => currentHp;
    public State CurrentState => state;

    float AttackRange => stats == null ? 0.5f : (stats.attackRangeDoc >= 10f ? MapConfig.ToUnity(stats.attackRangeDoc) : stats.attackRangeDoc);
    float AttackCooldown => (stats != null && stats.attackCooldown > 0f) ? stats.attackCooldown : 1f;

    void Awake()
    {
        sr = GetComponent<SpriteRenderer>();
    }

    public void Init(UnitStats unitStats, TeamSide unitTeam)
    {
        stats = unitStats;
        team = unitTeam;
        currentHp = stats.maxHp;

        sr.color = stats.placeholderColor;
        float sx = stats.placeholderSize.x;
        float sy = stats.placeholderSize.y;
        transform.localScale = new Vector3(team == TeamSide.Right ? -sx : sx, sy, 1f);

        gameObject.layer = LayerMask.NameToLayer(team == TeamSide.Left ? "TeamLeft" : "TeamRight");

        GameEvents.TriggerUnitSpawned(this);
    }

    void Update()
    {
        switch (state)
        {
            case State.Moving:
                target = UnitManager.Instance?.FindNearestTarget(this);
                if (IsTargetValid(target) && InAttackRange(target))
                    SetState(State.Attacking);
                else
                    Move();
                break;

            case State.Attacking:
                if (!IsTargetValid(target))
                {
                    target = null;
                    SetState(State.Moving);
                    break;
                }
                if (!InAttackRange(target))
                {
                    SetState(State.Moving);
                    break;
                }
                attackTimer += Time.deltaTime;
                if (attackTimer >= AttackCooldown)
                {
                    attackTimer = 0f;
                    target.TakeDamage(stats.damage);
                }
                break;
        }
    }

    void Move()
    {
        float dir = team == TeamSide.Left ? 1f : -1f;
        transform.position += Vector3.right * dir * stats.moveSpeed * Time.deltaTime;
    }

    bool IsTargetValid(IDamageable t)
    {
        return t is MonoBehaviour mb && mb != null && t.IsAlive;
    }

    bool InAttackRange(IDamageable t)
    {
        if (!IsTargetValid(t)) return false;
        float dist = Mathf.Abs(transform.position.x - t.Position.x) - (Radius + t.Radius);
        return dist <= AttackRange;
    }

    void SetState(State next)
    {
        if (state == next) return;
        state = next;
        if (state == State.Attacking)
            attackTimer = AttackCooldown;
    }

    public void TakeDamage(float amount)
    {
        currentHp = Mathf.Max(0f, currentHp - amount);
        GameEvents.TriggerUnitDamageTaken(this, currentHp, stats.maxHp);
        StartCoroutine(DamageFlash());
        if (currentHp <= 0f) Die();
    }

    System.Collections.IEnumerator DamageFlash()
    {
        if (sr != null)
        {
            sr.color = Color.red;
            yield return new WaitForSeconds(0.1f);
            if (sr != null && stats != null)
                sr.color = stats.placeholderColor;
        }
    }

    void Die()
    {
        GameEvents.TriggerUnitDied(this);
        Destroy(gameObject);
    }
}

