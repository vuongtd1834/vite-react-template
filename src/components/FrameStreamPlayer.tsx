import React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  lastFrame?: string;
  lastUpdate: number;
  frameCount: number;
}

interface Device {
  id: string;
  name: string;
  status: string;
  cameras: Array<{
    id: string;
    name: string;
    status: string;
    resolution: string;
    fps: number;
  }>;
}

const FrameStreamPlayer: React.FC = () => {
  const [streams, setStreams] = useState(new Map<string, StreamData>());
  const [devices, setDevices] = useState<Array<Device>>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected' | 'connecting'
  >('disconnected');

  const socketRef = useRef<Socket | null>(null);
  const mountedRef = useRef(true);

  // Handle incoming video frames
  const handleVideoFrame = useCallback((data: VideoFrameData) => {
    if (!mountedRef.current || !data?.deviceId || !data?.cameraId || !data?.frameData) {
      return;
    }

    const streamKey = `${data.deviceId}-${data.cameraId}`;

    try {
      // Convert base64 to data URL
      const dataUrl = `data:image/${data.format};base64,${data.frameData}`;

      // Update stream data
      setStreams((prev) => {
        const newStreams = new Map(prev);
        const existingStream = newStreams.get(streamKey);

        newStreams.set(streamKey, {
          deviceId: data.deviceId,
          cameraId: data.cameraId,
          active: true,
          lastFrame: dataUrl,
          lastUpdate: data.timestamp || Date.now(),
          frameCount: (existingStream?.frameCount || 0) + 1,
        });

        return newStreams;
      });
    } catch (error) {
      console.error(`❌ Error processing frame for ${streamKey}:`, error);
    }
  }, []);

  // Handle device disconnect
  const handleDeviceDisconnect = useCallback((data: { deviceId: string; cameraId: string }) => {
    if (!mountedRef.current) return;

    const streamKey = `${data.deviceId}-${data.cameraId}`;
    setStreams((prev) => {
      const newStreams = new Map(prev);
      const stream = newStreams.get(streamKey);
      if (stream) {
        newStreams.set(streamKey, { ...stream, active: false });
      }
      return newStreams;
    });
  }, []);

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    console.log('🔗 Connecting to server...');
    setConnectionStatus('connecting');

    const socket = io('ws://localhost:3000', {
      transports: ['websocket'],
      forceNew: true,
      autoConnect: true,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      if (!mountedRef.current) return;
      console.log('✅ Connected to server');
      setConnectionStatus('connected');

      // Request available devices
      socket.emit('getDevices');
    });

    socket.on('disconnect', () => {
      if (!mountedRef.current) return;
      console.log('❌ Disconnected from server');
      setConnectionStatus('disconnected');
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      if (mountedRef.current) {
        setConnectionStatus('disconnected');
      }
    });

    // Data events
    socket.on('devices', (deviceList: Array<Device>) => {
      if (!mountedRef.current) return;
      console.log('📱 Received devices:', deviceList);
      setDevices(deviceList);
    });

    socket.on('deviceRegistered', () => {
      if (socketRef.current && mountedRef.current) {
        socketRef.current.emit('getDevices');
      }
    });

    socket.on('deviceDisconnected', handleDeviceDisconnect);
    socket.on('videoFrameData', handleVideoFrame);

    return socket;
  }, [handleVideoFrame, handleDeviceDisconnect]);

  // Initialize on mount
  useEffect(() => {
    mountedRef.current = true;
    const socket = initializeSocket();

    return () => {
      mountedRef.current = false;
      // Cleanup socket connection safely
      if (socket) {
        // Remove all listeners first to prevent memory leaks
        socket.removeAllListeners();
        // Only disconnect if connected
        if (socket.connected) {
          socket.disconnect();
        }
      }
      socketRef.current = null;
    };
  }, []); // Empty dependency array - run once

  // Connection status component
  const ConnectionStatus = () => (
    <div
      className={`flex items-center gap-3 px-4 py-2 rounded-full border ${
        connectionStatus === 'connected'
          ? 'bg-green-100 border-green-300 text-green-800'
          : connectionStatus === 'connecting'
            ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
            : 'bg-red-100 border-red-300 text-red-800'
      }`}
    >
      <span className="text-lg">
        {connectionStatus === 'connected' ? '🟢' : connectionStatus === 'connecting' ? '🟡' : '🔴'}
      </span>
      <span className="font-semibold">
        {connectionStatus === 'connected'
          ? 'Connected'
          : connectionStatus === 'connecting'
            ? 'Connecting...'
            : 'Disconnected'}
      </span>
      <span className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded">Frame Stream</span>
    </div>
  );

  // System stats component
  const SystemStats = () => (
    <div className="flex flex-wrap gap-4">
      {[
        { label: 'Active Streams', value: streams.size, icon: '🎥' },
        { label: 'Devices', value: devices.length, icon: '📱' },
        {
          label: 'Total Frames',
          value: Array.from(streams.values()).reduce((sum, s) => sum + s.frameCount, 0),
          icon: '🖼️',
        },
      ].map(({ label, value, icon }) => (
        <div
          key={label}
          className="flex flex-col items-center bg-white bg-opacity-20 backdrop-blur-sm px-4 py-2 rounded-lg min-w-[100px]"
        >
          <span className="text-xs opacity-75 flex items-center gap-1">
            {icon} {label}
          </span>
          <span className="text-lg font-bold text-blue-300">{value}</span>
        </div>
      ))}
    </div>
  );

  // Stream player component
  const StreamPlayer = React.memo(
    ({ streamKey, streamData }: { streamKey: string; streamData: StreamData }) => {
      const device = devices.find((d) => d.id === streamData.deviceId);
      const camera = device?.cameras.find((c) => c.id === streamData.cameraId);

      return (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">{device?.name || 'Unknown Device'}</h3>
                <p className="text-sm opacity-75">{camera?.name || 'Unknown Camera'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                    streamData.active
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-gray-500 text-white'
                  }`}
                >
                  {streamData.active ? '🔴 LIVE' : '⚫ OFFLINE'}
                </span>
                <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                  {streamData.frameCount} frames
                </span>
              </div>
            </div>
          </div>

          {/* Frame display */}
          <div className="relative aspect-video bg-black">
            {streamData.lastFrame ? (
              <img
                alt="Video frame"
                className="w-full h-full object-contain"
                src={streamData.lastFrame}
                onError={(e) => {
                  console.error(`❌ Image load error for ${streamKey}:`, e);
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p>Waiting for frames...</p>
                </div>
              </div>
            )}

            {/* Info overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent p-3">
              <div className="flex justify-between items-center text-white text-sm">
                <span>
                  📹 {camera?.resolution || 'Unknown'} @ {camera?.fps || 'Unknown'}fps
                </span>
                <span>
                  🕒{' '}
                  {streamData.lastUpdate
                    ? new Date(streamData.lastUpdate).toLocaleTimeString()
                    : '--:--'}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
  );

  StreamPlayer.displayName = 'StreamPlayer';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-800 text-white">
      {/* Header */}
      <header className="bg-black bg-opacity-20 backdrop-blur-md border-b border-white border-opacity-10 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">🎥 Frame Stream Player</h1>
              <p className="text-lg opacity-75">Real-time video frame streaming from Socket.IO</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <ConnectionStatus />
              <SystemStats />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          {streams.size > 0 ? (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">📺 Live Frame Streams ({streams.size})</h2>
                <p className="text-lg opacity-75">Displaying frames from videoFrameData events</p>
              </div>

              {/* Stream grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {Array.from(streams.entries()).map(([streamKey, streamData]) => (
                  <StreamPlayer key={streamKey} streamData={streamData} streamKey={streamKey} />
                ))}
              </div>
            </>
          ) : (
            /* No streams placeholder */
            <div className="text-center py-16">
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-8 max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold mb-4">⏳ Waiting for video frames...</h2>
                <p className="text-lg opacity-75 mb-6">
                  Connect devices and start streaming to see live frames
                </p>

                {/* Status details */}
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <span>🔗 Connection:</span>
                    <span
                      className={`font-semibold ${
                        connectionStatus === 'connected' ? 'text-green-300' : 'text-red-300'
                      }`}
                    >
                      {connectionStatus.toUpperCase()}
                    </span>
                  </div>

                  {devices.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-3">📋 Available Devices</h3>
                      <div className="space-y-2">
                        {devices.map((device) => (
                          <div
                            key={device.id}
                            className="flex items-center justify-between bg-white bg-opacity-10 rounded-lg p-3"
                          >
                            <div className="text-left">
                              <span className="block font-medium">{device.name}</span>
                              <span className="text-sm opacity-75">
                                {device.cameras.length} camera(s)
                              </span>
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                device.status === 'online'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-red-500 text-white'
                              }`}
                            >
                              {device.status.toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default FrameStreamPlayer;
