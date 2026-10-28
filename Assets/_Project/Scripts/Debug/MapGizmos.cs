using UnityEngine;

[ExecuteAlways]
public class MapGizmos : MonoBehaviour
{
#if UNITY_EDITOR
    void OnDrawGizmos()
    {
        float y = 0f;

        DrawHLine(y, -MapConfig.CameraHalf, MapConfig.CameraHalf, Color.gray, "Camera");

        DrawHLine(y, -MapConfig.PlayHalf, MapConfig.PlayHalf, Color.yellow, "Play");

        float mhLeft  = -MapConfig.MainHouseX;
        float mhRight =  MapConfig.MainHouseX;
        DrawHLine(y - 0.3f, mhLeft - MapConfig.ToUnity(MapConfig.MainHouseRange), mhLeft, Color.cyan);
        DrawHLine(y - 0.3f, mhRight, mhRight + MapConfig.ToUnity(MapConfig.MainHouseRange), Color.cyan);

        float stLeft  = -MapConfig.StepTowerX;
        float stRight =  MapConfig.StepTowerX;
        DrawHLine(y - 0.6f, stLeft - MapConfig.ToUnity(MapConfig.StepTowerRange), stLeft, Color.green);
        DrawHLine(y - 0.6f, stRight, stRight + MapConfig.ToUnity(MapConfig.StepTowerRange), Color.green);

        float neutralHalf = MapConfig.ToUnity(MapConfig.NeutralZoneDoc * 0.5f);
        Gizmos.color = new Color(1f, 0.5f, 0f, 0.3f);
        Gizmos.DrawCube(new Vector3(0f, y, 0f), new Vector3(neutralHalf * 2f, 0.1f, 0f));

        DrawLabel(new Vector3(0f, y + 1f, 0f), "Neutral 10u");
        DrawLabel(new Vector3(-MapConfig.PlayHalf, y + 1f, 0f), "Play -28");
        DrawLabel(new Vector3(MapConfig.PlayHalf, y + 1f, 0f), "Play +28");
    }

    void DrawHLine(float y, float xFrom, float xTo, Color color, string label = null)
    {
        Gizmos.color = color;
        Gizmos.DrawLine(new Vector3(xFrom, y, 0f), new Vector3(xTo, y, 0f));
        if (label != null)
            DrawLabel(new Vector3((xFrom + xTo) * 0.5f, y + 0.5f, 0f), label);
    }

    void DrawLabel(Vector3 pos, string text)
    {
#if UNITY_EDITOR
        UnityEditor.Handles.Label(pos, text);
#endif
    }
#endif
}
