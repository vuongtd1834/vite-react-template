import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

// React Multi-Stream Client
// Demonstrates consuming multiple video streams from Jetson devices simultaneously

// Type definitions
interface Camera {
  id: string;
  name: string;
  status: string;
  resolution: string;
  fps: number;
}

interface Device {
  id: string;
  name: string;
  status: string;
  cameras: Array<Camera>;
}

interface StreamData {
  deviceId: string;
  cameraId: string;
  timestamp: number;
  active: boolean;
}

interface VideoData {
  deviceId: string;
  cameraId: string;
  timestamp: number;
  data?: ArrayBuffer | string;
}

interface StreamStats {
  lastUpdate: number;
  chunksReceived: number;
  dataSize: number;
}

interface VideoFeedResponse {
  success: boolean;
  room: string;
}

interface DeviceConnectionData {
  deviceId: string;
  cameraId: string;
}

const MultiStreamViewer = () => {
  const [devices, setDevices] = useState<Array<Device>>([]);
  const [activeStreams, setActiveStreams] = useState(new Map<string, StreamData>());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>(
    'disconnected'
  );
  const [streamStats, setStreamStats] = useState<Record<string, StreamStats>>({});

  const socketRef = useRef<Socket | null>(null);
  const videoRefs = useRef(new Map<string, HTMLVideoElement>());

  useEffect(() => {
    initializeConnection();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []); // Empty dependency array - only run once on mount

  const initializeConnection = () => {
    console.log('🔗 Connecting to SFU Service...');

    const newSocket = io('ws://localhost:3000', {
      transports: ['websocket'],
      forceNew: true,
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to SFU Service');
      setConnectionStatus('connected');

      // Request available devices
      newSocket.emit('getDevices');
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from SFU Service');
      setConnectionStatus('disconnected');
    });

    newSocket.on('devices', (deviceList: Array<Device>) => {
      console.log('📱 Received device list:', deviceList);
      setDevices(deviceList);

      // Auto-request all video feeds
      requestAllVideoFeeds(newSocket, deviceList);
    });

    newSocket.on('videoData', (data: VideoData) => {
      handleVideoData(data);
    });

    newSocket.on('videoFeedRequested', (response: VideoFeedResponse) => {
      if (response.success) {
        console.log(`🎥 Video feed requested: ${response.room}`);
      }
    });

    newSocket.on('deviceRegistered', (data: Device) => {
      console.log('📋 New device registered:', data);
      // Refresh device list
      newSocket.emit('getDevices');
    });

    newSocket.on('deviceDisconnected', (data: DeviceConnectionData) => {
      console.log('📴 Device disconnected:', data);
      removeStreamFromDevice(data.deviceId, data.cameraId);
    });

    socketRef.current = newSocket;
  };

  const requestAllVideoFeeds = (socketInstance: Socket, deviceList: Array<Device>) => {
    console.log('🎥 Requesting video feeds from all devices...');

    deviceList.forEach((device) => {
      device.cameras.forEach((camera) => {
        if (camera.status === 'active') {
          console.log(`📹 Requesting feed: ${device.name} → ${camera.name}`);

          socketInstance.emit('requestVideoFeed', {
            deviceId: device.id,
            cameraId: camera.id,
            quality: getOptimalQuality(camera),
          });
        }
      });
    });
  };

  const getOptimalQuality = (camera: Camera): string => {
    // Determine optimal quality based on camera resolution
    if (camera.resolution === '1920x1080') {
      return 'high';
    } else if (camera.resolution === '1280x720') {
      return 'medium';
    } else {
      return 'low';
    }
  };

  const handleVideoData = (data: VideoData) => {
    const streamKey = `${data.deviceId}-${data.cameraId}`;

    // Update stream statistics
    setStreamStats((prev) => ({
      ...prev,
      [streamKey]: {
        ...prev[streamKey],
        lastUpdate: Date.now(),
        chunksReceived: (prev[streamKey]?.chunksReceived || 0) + 1,
        dataSize: data.data
          ? typeof data.data === 'string'
            ? data.data.length
            : data.data.byteLength
          : 0,
      },
    }));

    // Update active streams
    setActiveStreams((prev) => {
      const newStreams = new Map(prev);
      newStreams.set(streamKey, {
        deviceId: data.deviceId,
        cameraId: data.cameraId,
        timestamp: data.timestamp,
        active: true,
      });
      return newStreams;
    });

    // Process video data for display
    processVideoDataForDisplay(streamKey, data);
  };

  const processVideoDataForDisplay = (streamKey: string, _data: VideoData) => {
    // In a real implementation, you would:
    // 1. Decode the video data
    // 2. Create video frame from buffer
    // 3. Display in video element or canvas

    const videoElement = videoRefs.current.get(streamKey);
    if (videoElement) {
      // Simulate video frame update
      videoElement.dataset['lastUpdate'] = Date.now().toString();
      videoElement.dataset['streamActive'] = 'true';
    }
  };

  const removeStreamFromDevice = (deviceId: string, cameraId: string) => {
    const streamKey = `${deviceId}-${cameraId}`;

    setActiveStreams((prev) => {
      const newStreams = new Map(prev);
      newStreams.delete(streamKey);
      return newStreams;
    });

    setStreamStats((prev) => {
      const newStats = { ...prev };
      delete newStats[streamKey];
      return newStats;
    });
  };

  const getDeviceByStream = (
    streamKey: string
  ): { device: Device | undefined; camera: Camera | undefined } => {
    const [deviceId, cameraId] = streamKey.split('-');
    const device = devices.find((d) => d.id === deviceId);
    const camera = device?.cameras.find((c) => c.id === cameraId);
    return { device, camera };
  };

  const renderVideoStream = (streamKey: string, streamData: StreamData) => {
    const { device, camera } = getDeviceByStream(streamKey);
    const stats = streamStats[streamKey] || { chunksReceived: 0, dataSize: 0, lastUpdate: 0 };

    if (!device || !camera) return null;

    return (
      <div key={streamKey} className="video-stream-container">
        <div className="stream-header">
          <h3>{device.name}</h3>
          <span className="camera-name">{camera.name}</span>
          <span className={`status ${streamData.active ? 'active' : 'inactive'}`}>
            {streamData.active ? '🔴 LIVE' : '⚫ OFFLINE'}
          </span>
        </div>

        <div className="video-wrapper">
          <video
            ref={(el) => {
              if (el) videoRefs.current.set(streamKey, el);
            }}
            autoPlay
            muted
            playsInline
            className="video-element"
          />

          <div className="stream-overlay">
            <div className="stream-info">
              <span>
                📹 {camera.resolution} @ {camera.fps}fps
              </span>
              <span>📊 {stats.chunksReceived || 0} chunks</span>
              <span>📦 {Math.round((stats.dataSize || 0) / 1024)}KB</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDeviceGrid = () => {
    const streamEntries = Array.from(activeStreams.entries());

    return (
      <div className="video-grid">
        {streamEntries.map(([streamKey, streamData]) => renderVideoStream(streamKey, streamData))}
      </div>
    );
  };

  const renderConnectionStatus = () => (
    <div className={`connection-status ${connectionStatus}`}>
      <span className="status-indicator">{connectionStatus === 'connected' ? '🟢' : '🔴'}</span>
      <span>SFU Service: {connectionStatus.toUpperCase()}</span>
    </div>
  );

  const renderSystemStats = () => (
    <div className="system-stats">
      <div className="stat-item">
        <span className="label">🎥 Active Streams:</span>
        <span className="value">{activeStreams.size}</span>
      </div>
      <div className="stat-item">
        <span className="label">📱 Connected Devices:</span>
        <span className="value">{devices.length}</span>
      </div>
      <div className="stat-item">
        <span className="label">📹 Total Cameras:</span>
        <span className="value">
          {devices.reduce((total, device) => total + device.cameras.length, 0)}
        </span>
      </div>
    </div>
  );

  return (
    <div className="multi-stream-viewer">
      <header className="viewer-header">
        <h1>🎥 Multi-Stream Video Viewer</h1>
        {renderConnectionStatus()}
        {renderSystemStats()}
      </header>

      <main className="viewer-content">
        {activeStreams.size > 0 ? (
          <>
            <div className="content-header">
              <h2>📺 Live Video Streams ({activeStreams.size})</h2>
              <p>🔄 Parallel recording to .NET service via RabbitMQ</p>
            </div>
            {renderDeviceGrid()}
          </>
        ) : (
          <div className="no-streams">
            <h2>⏳ Waiting for video streams...</h2>
            <p>Ensure Jetson devices are connected and configured</p>
            {devices.length > 0 && (
              <div className="device-list">
                <h3>📋 Available Devices:</h3>
                {devices.map((device) => (
                  <div key={device.id} className="device-item">
                    <span>{device.name}</span>
                    <span className={`device-status ${device.status}`}>
                      {device.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

// CSS Styles (would normally be in a separate file)
const styles = `
.multi-stream-viewer {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #f5f5f5;
  min-height: 100vh;
}

.viewer-header {
  background: #2c3e50;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background: rgba(255,255,255,0.1);
}

.connection-status.connected {
  background: rgba(39, 174, 96, 0.2);
}

.connection-status.disconnected {
  background: rgba(231, 76, 60, 0.2);
}

.system-stats {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.9rem;
}

.stat-item .value {
  font-weight: bold;
  font-size: 1.1rem;
  color: #3498db;
}

.viewer-content {
  padding: 2rem;
}

.content-header {
  text-align: center;
  margin-bottom: 2rem;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.video-stream-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  overflow: hidden;
  transition: transform 0.2s;
}

.video-stream-container:hover {
  transform: translateY(-5px);
}

.stream-header {
  background: #34495e;
  color: white;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stream-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.camera-name {
  font-size: 0.9rem;
  opacity: 0.8;
}

.status.active {
  color: #e74c3c;
  font-weight: bold;
}

.status.inactive {
  color: #95a5a6;
}

.video-wrapper {
  position: relative;
  aspect-ratio: 16/9;
  background: #000;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.stream-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  padding: 1rem;
}

.stream-info {
  display: flex;
  justify-content: space-between;
  color: white;
  font-size: 0.8rem;
}

.no-streams {
  text-align: center;
  padding: 4rem 2rem;
}

.device-list {
  margin-top: 2rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.device-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  margin: 0.5rem 0;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.device-status.online {
  color: #27ae60;
  font-weight: bold;
}

.device-status.offline {
  color: #e74c3c;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default MultiStreamViewer;
