using UnityEngine;

public class GameBootstrap : MonoBehaviour
{
    void Awake()
    {
        Application.targetFrameRate = 60;
        Screen.sleepTimeout = SleepTimeout.NeverSleep;
        DontDestroyOnLoad(gameObject);
    }
}
