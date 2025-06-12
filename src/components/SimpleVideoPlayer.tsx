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
}

const SimpleVideoPlayer: React.FC = () => {
  const [streams, setStreams] = useState(new Map<string, StreamData>());
  const [connected, setConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const canvasRefs = useRef(new Map<string, HTMLCanvasElement>());
  const videoRefs = useRef(new Map<string, HTMLVideoElement>());
  const streamRefs = useRef(new Map<string, MediaStream>());

  const handleVideoFrame = useCallback((data: VideoFrameData) => {
    if (!data?.deviceId || !data?.cameraId || !data?.frameData) return;

    const streamKey = `${data.deviceId}-${data.cameraId}`;

    try {
      // Get or create canvas for this stream
      let canvas = canvasRefs.current.get(streamKey);
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        canvasRefs.current.set(streamKey, canvas);

        // Create MediaStream from canvas
        const stream = canvas.captureStream(15); // 15fps

        // Create video element for the stream
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;

        videoRefs.current.set(streamKey, video);
        streamRefs.current.set(streamKey, stream);

        console.log(`🎬 Created video stream for ${streamKey}`);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Create image and draw to canvas
      const img = new Image();
      img.onload = () => {
        // Update canvas size if needed
        if (canvas.width !== img.width || canvas.height !== img.height) {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        // Draw frame to canvas
        ctx.drawImage(img, 0, 0);

        // Update stream state
        setStreams((prev) => {
          const newStreams = new Map(prev);
          newStreams.set(streamKey, {
            deviceId: data.deviceId,
            cameraId: data.cameraId,
            active: true,
            url: streamRefs.current.get(streamKey) as unknown as string,
          });
          return newStreams;
        });
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
  }, []);

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
        // Remove all listeners first to prevent memory leaks
        socket.removeAllListeners();
        // Only disconnect if connected
        if (socket.connected) {
          socket.disconnect();
        }
      }
    };
  }, [handleVideoFrame]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">🎥 Video Stream Player</h1>
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
                </div>
                <div className="relative aspect-video bg-black">
                  {streamData.url ? (
                    <ReactPlayer
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
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleVideoPlayer;
