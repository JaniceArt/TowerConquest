public static class MapConfig
{
    public const float UNIT = 100f;

    public static float ToUnity(float docValue) => docValue / UNIT;
    public static float ToDoc(float unityValue) => unityValue * UNIT;

    public const float MainHouseDocX   = 1500f;
    public const float MainHouseDiam   = 400f;

    public const float StepTowerDocX   = 1000f;
    public const float StepTowerDiam   = 200f;

    public const float PlayHalfDoc     = 1700f;
    public const float CameraHalfDoc   = 2000f;

    public const float MainHouseRange  = 650f;
    public const float StepTowerRange  = 700f;

    public const float PlaceZoneDoc    = 1400f;
    public const float NeutralZoneDoc  = 600f;

    public const float CellSizeDoc     = 100f;

    public static float MainHouseX     => ToUnity(MainHouseDocX);
    public static float StepTowerX     => ToUnity(StepTowerDocX);
    public static float PlayHalf       => ToUnity(PlayHalfDoc);
    public static float CameraHalf     => ToUnity(CameraHalfDoc);
    public static float CellSize       => ToUnity(CellSizeDoc);
}
