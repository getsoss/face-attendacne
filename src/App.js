import React, { useRef, useEffect, useState } from "react";
import { FaceDetection } from "@mediapipe/face_detection";
import { Camera } from "@mediapipe/camera_utils";
import "./App.css";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [error, setError] = useState(null);
  const faceDetectionRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    const initializeFaceDetection = async () => {
      try {
        const faceDetection = new FaceDetection({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
          },
        });

        faceDetection.setOptions({
          model: "short",
          minDetectionConfidence: 0.5,
        });

        faceDetection.onResults((results) => {
          if (!canvasRef.current) return;

          const canvasCtx = canvasRef.current.getContext("2d");
          canvasCtx.save();
          canvasCtx.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );

          if (results.image) {
            canvasCtx.drawImage(
              results.image,
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            );
          }

          if (results.detections && results.detections.length > 0) {
            setFaceCount(results.detections.length);

            results.detections.forEach((detection) => {
              const bbox = detection.boundingBox;
              const x =
                bbox.xCenter * canvasRef.current.width -
                (bbox.width * canvasRef.current.width) / 2;
              const y =
                bbox.yCenter * canvasRef.current.height -
                (bbox.height * canvasRef.current.height) / 2;
              const width = bbox.width * canvasRef.current.width;
              const height = bbox.height * canvasRef.current.height;

              canvasCtx.strokeStyle = "#00FF00";
              canvasCtx.lineWidth = 3;
              canvasCtx.strokeRect(x, y, width, height);

              let confidenceText = "Face Detected";

              if (Array.isArray(detection.V) && detection.V.length > 0) {
                const vValue = detection.V[0];
                if (typeof vValue === "number" && vValue >= 0 && vValue <= 1) {
                  confidenceText = `Face: ${(vValue * 100).toFixed(1)}%`;
                }
              } else if (
                Array.isArray(detection.score) &&
                detection.score.length > 0
              ) {
                const confidence = Number(detection.score[0]) || 0;
                confidenceText = `Face: ${(confidence * 100).toFixed(1)}%`;
              } else if (typeof detection.score === "number") {
                confidenceText = `Face: ${(detection.score * 100).toFixed(1)}%`;
              } else if (
                detection.categories &&
                Array.isArray(detection.categories) &&
                detection.categories.length > 0
              ) {
                const confidence =
                  detection.categories[0].score !== undefined
                    ? Number(detection.categories[0].score)
                    : 0;
                confidenceText = `Face: ${(confidence * 100).toFixed(1)}%`;
              } else if (detection.confidence !== undefined) {
                const confidence =
                  typeof detection.confidence === "number"
                    ? detection.confidence
                    : 0;
                confidenceText = `Face: ${(confidence * 100).toFixed(1)}%`;
              }

              canvasCtx.fillStyle = "#00FF00";
              canvasCtx.font = "bold 16px Arial";
              canvasCtx.fillText(confidenceText, x, y > 20 ? y - 10 : y + 20);
            });
          } else {
            setFaceCount(0);
          }

          canvasCtx.restore();
        });

        faceDetectionRef.current = faceDetection;
      } catch (err) {
        console.error("Face Detection 초기화 오류:", err);
        setError("Face Detection 초기화에 실패했습니다.");
      }
    };

    initializeFaceDetection();
  }, []);

  const startDetection = async () => {
    try {
      setError(null);

      if (!videoRef.current || !canvasRef.current) {
        setError("비디오 또는 캔버스 요소를 찾을 수 없습니다.");
        return;
      }

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (faceDetectionRef.current && videoRef.current) {
            try {
              await faceDetectionRef.current.send({ image: videoRef.current });
            } catch (err) {
              console.error("Face Detection 처리 오류:", err);
            }
          }
        },
        width: 640,
        height: 480,
      });

      cameraRef.current = camera;
      setIsDetecting(true);
      await camera.start();
    } catch (err) {
      console.error("카메라 시작 오류:", err);
      setError("카메라에 접근할 수 없습니다. 카메라 권한을 확인해주세요.");
      setIsDetecting(false);
    }
  };

  const stopDetection = () => {
    setIsDetecting(false);

    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }

    setFaceCount(0);

    if (canvasRef.current) {
      const canvasCtx = canvasRef.current.getContext("2d");
      canvasCtx.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>MediaPipe 얼굴 인식</h1>

        <div className="camera-container">
          <video
            ref={videoRef}
            className="video-input"
            autoPlay
            playsInline
            muted
            style={{ display: "none" }}
          />
          <canvas
            ref={canvasRef}
            className="canvas-output"
            width={640}
            height={480}
          />
        </div>

        <div className="controls">
          {!isDetecting ? (
            <button className="start-button" onClick={startDetection}>
              얼굴 인식 시작
            </button>
          ) : (
            <button className="stop-button" onClick={stopDetection}>
              얼굴 인식 중지
            </button>
          )}
        </div>

        <div className="info">
          <p>
            감지된 얼굴 수: <strong>{faceCount}</strong>
          </p>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {isDetecting && !error && (
          <div className="status-message">
            <p>카메라가 활성화되었습니다. 얼굴을 카메라 앞에 두세요.</p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
