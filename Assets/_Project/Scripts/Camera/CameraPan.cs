using UnityEngine;
using UnityEngine.InputSystem;

[RequireComponent(typeof(Camera))]
public class CameraPan : MonoBehaviour
{
    [SerializeField] float panSpeed = 10f;

    Camera cam;
    float clampX;

    void Start()
    {
        cam = GetComponent<Camera>();
        UpdateClamp();
    }

    void Update()
    {
        UpdateClamp();

        float input = 0f;
        if (Keyboard.current != null)
        {
            bool left  = Keyboard.current.aKey.isPressed || Keyboard.current.leftArrowKey.isPressed;
            bool right = Keyboard.current.dKey.isPressed || Keyboard.current.rightArrowKey.isPressed;
            if (left)  input = -1f;
            if (right) input =  1f;
        }

        Vector3 pos = transform.position;
        pos.x += input * panSpeed * Time.deltaTime;
        pos.x = Mathf.Clamp(pos.x, -clampX, clampX);
        transform.position = pos;
    }

    void UpdateClamp()
    {
        if (cam == null) return;
        float halfViewWidth = cam.orthographicSize * cam.aspect;
        clampX = Mathf.Max(0f, MapConfig.CameraHalf - halfViewWidth);
    }
}
