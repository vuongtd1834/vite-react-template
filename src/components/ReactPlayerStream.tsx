import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import type { Socket } from 'socket.io-client';
import io from 'socket.io-client';

interface VideoFrameData {
  deviceId: string;
  cameraId: string;
  format: string;
  timestamp: number;
  frameData: string;
}

interface StreamData {
  deviceId: string;
  cameraId: string;
  active: boolean;
  url?: string;
  lastUpdate: number;
}

const ReactPlayerStream: React.FC = () => {
  const [streams, setStreams] = useState(new Map<string, StreamData>());
  const [connected, setConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRefs = useRef(new Map<string, MediaRecorder>());
  const chunksRefs = useRef(new Map<string, Array<Blob>>());
  const canvasRefs = useRef(new Map<string, HTMLCanvasElement>());
  const intervalRefs = useRef(new Map<string, NodeJS.Timeout>());

  const createVideoBlob = useCallback((streamKey: string) => {
    const chunks = chunksRefs.current.get(streamKey);
    if (!chunks || chunks.length === 0) return;

    const videoBlob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(videoBlob);

    // Update stream with new video URL
    setStreams((prev) => {
      const newStreams = new Map(prev);
      const existingStream = newStreams.get(streamKey);
      if (existingStream) {
        // Clean up old URL
        if (existingStream.url) {
          URL.revokeObjectURL(existingStream.url);
        }

        newStreams.set(streamKey, {
          ...existingStream,
          url: url,
          lastUpdate: Date.now(),
        });
      }
      return newStreams;
    });

    // Clear chunks for next video
    chunksRefs.current.set(streamKey, []);
  }, []);

  const setupMediaRecorder = useCallback(
    (streamKey: string, canvas: HTMLCanvasElement) => {
      try {
        const stream = canvas.captureStream(10); // 10fps for smaller file size
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8',
        });

        const chunks: Array<Blob> = [];
        chunksRefs.current.set(streamKey, chunks);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          createVideoBlob(streamKey);
        };

        mediaRecorder.start();
        mediaRecorderRefs.current.set(streamKey, mediaRecorder);

        // Stop and restart recording every 3 seconds to create video chunks
        const interval = setInterval(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            setTimeout(() => {
              if (mediaRecorder.state === 'inactive') {
                mediaRecorder.start();
              }
            }, 100);
          }
        }, 3000);

        intervalRefs.current.set(streamKey, interval);

        console.log(`🎬 MediaRecorder setup for ${streamKey}`);
      } catch (error) {
        console.error(`❌ Failed to setup MediaRecorder for ${streamKey}:`, error);
      }
    },
    [createVideoBlob]
  );

  const handleVideoFrame = useCallback(
    (data: VideoFrameData) => {
      if (!data?.deviceId || !data?.cameraId || !data?.frameData) return;

      const streamKey = `${data.deviceId}-${data.cameraId}`;

      try {
        // Get or create canvas
        let canvas = canvasRefs.current.get(streamKey);
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          canvasRefs.current.set(streamKey, canvas);

          // Setup MediaRecorder for this canvas
          setupMediaRecorder(streamKey, canvas);

          // Create initial stream entry
          setStreams((prev) => {
            const newStreams = new Map(prev);
            newStreams.set(streamKey, {
              deviceId: data.deviceId,
              cameraId: data.cameraId,
              active: true,
              lastUpdate: Date.now(),
            });
            return newStreams;
          });
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw frame to canvas
        const img = new Image();
        img.onload = () => {
          // Update canvas size if needed
          if (canvas.width !== img.width || canvas.height !== img.height) {
            canvas.width = img.width;
            canvas.height = img.height;
          }

          // Draw frame to canvas
          ctx.drawImage(img, 0, 0);
        };

        img.onerror = () => {
          console.error(`❌ Failed to load image for ${streamKey}`);
        };

        // Convert base64 to blob URL
        const byteCharacters = atob(data.frameData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: `image/${data.format}` });
        img.src = URL.createObjectURL(blob);
      } catch (error) {
        console.error(`Error processing frame for ${streamKey}:`, error);
      }
    },
    [setupMediaRecorder]
  );

  useEffect(() => {
    // Initialize socket once
    if (socketRef.current) return;

    const socket = io('ws://localhost:3000', {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    socket.on('videoFrameData', handleVideoFrame);

    return () => {
      // Cleanup socket connection safely
      if (socket) {
        socket.removeAllListeners();
        if (socket.connected) {
          socket.disconnect();
        }
      }

      // Cleanup media recorders and intervals
      mediaRecorderRefs.current.forEach((recorder) => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      });

      intervalRefs.current.forEach((interval) => {
        clearInterval(interval);
      });

      // Cleanup URLs
      streams.forEach((streamData) => {
        if (streamData.url) {
          URL.revokeObjectURL(streamData.url);
        }
      });
    };
  }, [handleVideoFrame]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-700 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">🎥 React Player Stream</h1>
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
              connected ? 'bg-green-500' : 'bg-red-500'
            } text-white`}
          >
            <span>{connected ? '🟢' : '🔴'}</span>
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        {/* Video Grid */}
        {streams.size > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from(streams.entries()).map(([streamKey, streamData]) => (
              <div key={streamKey} className="bg-white rounded-lg overflow-hidden shadow-lg">
                <div className="bg-gray-800 text-white p-3">
                  <h3 className="font-semibold">Device: {streamData.deviceId}</h3>
                  <p className="text-sm opacity-75">Camera: {streamData.cameraId}</p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      streamData.active
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-gray-500 text-white'
                    }`}
                  >
                    {streamData.active ? '🔴 LIVE' : '⚫ OFFLINE'}
                  </span>
                  <span className="ml-2 text-xs opacity-75">
                    {streamData.lastUpdate
                      ? new Date(streamData.lastUpdate).toLocaleTimeString()
                      : 'No data'}
                  </span>
                </div>
                <div className="relative aspect-video bg-black">
                  {streamData.url ? (
                    <ReactPlayer
                      loop
                      muted
                      playing
                      height="100%"
                      url={streamData.url}
                      width="100%"
                      config={{
                        file: {
                          attributes: {
                            autoPlay: true,
                            muted: true,
                            playsInline: true,
                          },
                        },
                      }}
                      onError={(error) => {
                        console.error(`❌ ReactPlayer error for ${streamKey}:`, error);
                      }}
                      onReady={() => {
                        console.log(`✅ ReactPlayer ready for ${streamKey}`);
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <div className="text-center">
                        <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p>Processing frames...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Waiting for video streams...</h2>
            <p className="text-lg opacity-75">Make sure devices are connected and streaming</p>
            <div className="mt-4 p-4 bg-white bg-opacity-10 rounded-lg max-w-md mx-auto">
              <h3 className="font-semibold mb-2">🔧 How this works:</h3>
              <ul className="text-sm text-left space-y-1">
                <li>• Creates canvas from video frames</li>
                <li>• Uses MediaRecorder to create video chunks</li>
                <li>• React Player displays the video blobs</li>
                <li>• Updates every 3 seconds with new video</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReactPlayerStream;
