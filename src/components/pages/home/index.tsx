import * as mediasoup from 'mediasoup-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

// Real WebRTC Multi-Stream Client using mediasoup
// Receives actual video streams from remote producers via WebRTC

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
  consumer?: mediasoup.types.Consumer;
}

interface StreamStats {
  lastUpdate: number;
  consumerId?: string;
  kind?: string;
  rtpParameters?: unknown;
}

interface ConsumerData {
  deviceId: string;
  cameraId: string;
  consumerId: string;
  producerId?: string;
  kind: string;
  rtpParameters: mediasoup.types.RtpParameters;
  transportId: string;
}

interface ProducerData {
  deviceId: string;
  cameraId: string;
  kind: string;
}

interface DeviceConnectionData {
  deviceId: string;
  cameraId: string;
}

interface SocketInstance {
  emit: (event: string, ...args: Array<unknown>) => void;
  once: (event: string, callback: (data: unknown) => void) => void;
  on: (event: string, callback: (...args: Array<unknown>) => void) => void;
  disconnect: () => void;
}

interface TransportData {
  id: string;
  iceParameters: mediasoup.types.IceParameters;
  iceCandidates: Array<mediasoup.types.IceCandidate>;
  dtlsParameters: mediasoup.types.DtlsParameters;
  sctpParameters?: mediasoup.types.SctpParameters;
}

const WebRTCMultiStreamViewer = () => {
  const [socket, setSocket] = useState<SocketInstance | null>(null);
  const [device, setDevice] = useState<mediasoup.Device | null>(null);
  const [recvTransport, setRecvTransport] = useState<mediasoup.types.Transport | null>(null);
  const [devices, setDevices] = useState<Array<Device>>([]);
  const [activeStreams, setActiveStreams] = useState(new Map<string, StreamData>());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>(
    'disconnected'
  );
  const [streamStats, setStreamStats] = useState<Record<string, StreamStats>>({});

  const videoRefs = useRef(new Map<string, HTMLVideoElement>());
  const consumersRef = useRef(new Map<string, mediasoup.types.Consumer>());

  // Use refs to store latest values for accessing in socket callbacks
  const deviceRef = useRef<mediasoup.Device | null>(null);
  const socketRef = useRef<SocketInstance | null>(null);
  const recvTransportRef = useRef<mediasoup.types.Transport | null>(null);

  console.log('🔍 activeStreams:', activeStreams);

  // Update refs when state changes
  useEffect(() => {
    deviceRef.current = device;
  }, [device]);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    recvTransportRef.current = recvTransport;
  }, [recvTransport]);

  useEffect(() => {
    initializeConnection();
    return () => {
      cleanup();
    };
  }, []);

  // Handle track attachment when video elements become available
  useEffect(() => {
    console.log('🔍 Track attachment useEffect triggered');
    console.log('📊 activeStreams:', activeStreams);
    console.log('🎬 consumersRef:', consumersRef.current);
    console.log('📺 videoRefs:', videoRefs.current);

    const attachPendingTracks = () => {
      console.log('🔗 Running attachPendingTracks...');

      consumersRef.current.forEach((consumer, streamKey) => {
        console.log(`🎥 Checking ${streamKey}:`);

        const videoElement = videoRefs.current.get(streamKey);
        const streamData = activeStreams.get(streamKey);

        console.log(`  - videoElement:`, videoElement);
        console.log(`  - consumer:`, consumer);
        console.log(`  - consumer.track:`, consumer.track);
        console.log(`  - streamData:`, streamData);
        console.log(`  - existing srcObject:`, videoElement?.srcObject);

        if (videoElement && consumer.track && streamData) {
          console.log(`✅ Attaching track for ${streamKey}`);

          // Debug the consumer track before creating stream
          console.log(`🔍 Consumer track detailed info:`, {
            id: consumer.track.id,
            kind: consumer.track.kind,
            label: consumer.track.label,
            enabled: consumer.track.enabled,
            muted: consumer.track.muted,
            readyState: consumer.track.readyState,
            contentHint: consumer.track.contentHint,
            constraints: consumer.track.getConstraints ? consumer.track.getConstraints() : 'N/A',
            capabilities: consumer.track.getCapabilities ? consumer.track.getCapabilities() : 'N/A',
            settings: consumer.track.getSettings ? consumer.track.getSettings() : 'N/A',
          });

          const stream = new MediaStream([consumer.track]);

          // Debug the created stream
          console.log(`🔍 Created MediaStream info:`, {
            id: stream.id,
            active: stream.active,
            tracks: stream.getTracks().length,
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length,
          });

          // Test if track has actual video frames by checking settings
          const trackSettings = consumer.track.getSettings ? consumer.track.getSettings() : {};
          console.log(`🔍 Track settings detail:`, trackSettings);

          if (trackSettings.width && trackSettings.height) {
            console.log(
              `✅ Track has video dimensions: ${trackSettings.width}x${trackSettings.height}`
            );
          } else {
            console.warn(`⚠️ Track missing video dimensions - might be empty track`);
          }

          // Create a test canvas to verify track is producing frames
          const testCanvas = document.createElement('canvas');
          testCanvas.width = 200;
          testCanvas.height = 150;
          const testCtx = testCanvas.getContext('2d');

          if (testCtx) {
            // Try to draw track onto canvas to test if it has actual video
            const testVideo = document.createElement('video');
            testVideo.srcObject = stream;
            testVideo.muted = true;
            testVideo
              .play()
              .then(() => {
                console.log(`🎯 Test video playing - checking for frames...`);

                // Check for actual video frames
                const checkFrames = () => {
                  if (testVideo.videoWidth > 0 && testVideo.videoHeight > 0) {
                    console.log(
                      `✅ Test video has dimensions: ${testVideo.videoWidth}x${testVideo.videoHeight}`
                    );

                    // Draw frame to canvas to test actual content
                    testCtx.drawImage(testVideo, 0, 0, testCanvas.width, testCanvas.height);
                    const imageData = testCtx.getImageData(
                      0,
                      0,
                      testCanvas.width,
                      testCanvas.height
                    );

                    // Check if pixels are not all black/transparent
                    let hasContent = false;
                    if (imageData.data) {
                      for (let i = 0; i < imageData.data.length; i += 4) {
                        if (
                          imageData.data[i] > 0 ||
                          imageData.data[i + 1] > 0 ||
                          imageData.data[i + 2] > 0
                        ) {
                          hasContent = true;
                          break;
                        }
                      }
                    }

                    console.log(`🎯 Track has actual video content: ${hasContent}`);
                    if (hasContent) {
                      console.log(`✅ Track is producing real video frames!`);
                    } else {
                      console.warn(`⚠️ Track dimensions exist but content appears blank/black`);
                    }
                  } else {
                    console.warn(`⚠️ Test video still has no dimensions after play`);
                  }
                };

                // Check frames after a short delay
                setTimeout(checkFrames, 500);
                setTimeout(checkFrames, 1000);
                setTimeout(checkFrames, 2000);
              })
              .catch((err) => {
                console.error(`❌ Test video play failed:`, err);
              });
          }

          // IMPORTANT: Debug why track has no dimensions
          if (!trackSettings.width && !trackSettings.height) {
            console.error(`🚨 TRACK HAS NO VIDEO DIMENSIONS!`);
            console.log(`🔍 Debugging consumer creation...`);
            console.log(`🔍 Consumer details:`, {
              id: consumer.id,
              kind: consumer.kind,
              rtpParameters: consumer.rtpParameters,
              paused: consumer.paused,
              producerPaused: consumer.producerPaused,
              track: !!consumer.track,
            });

            // Check if this is a mock consumer issue
            if (typeof consumer.resume === 'function') {
              console.log(`🔄 Trying to resume consumer...`);
              consumer.resume();
            }

            // Check if we need to explicitly request video
            if (socketRef.current) {
              console.log(`📡 Requesting producer resume from server...`);
              socketRef.current.emit('resumeProducer', {
                deviceId: streamData.deviceId,
                cameraId: streamData.cameraId,
              });

              // Also try consumer resume
              socketRef.current.emit('resumeConsumer', {
                deviceId: streamData.deviceId,
                cameraId: streamData.cameraId,
                consumerId: consumer.id,
              });
            }

            console.warn(`⚠️ Track Settings:`, trackSettings);
            console.warn(`⚠️ This might be an empty track or consumer not properly created`);
            console.warn(`⚠️ Server might not be sending actual video data`);
          }

          videoElement.srcObject = stream;

          console.log(`📺 Track attached, new srcObject:`, videoElement.srcObject);
          console.log(`🎵 Stream tracks:`, stream.getTracks());
          console.log(`🎵 Stream active:`, stream.active);

          // Debug individual tracks
          stream.getTracks().forEach((track, index) => {
            console.log(`🎵 Track ${index}:`, {
              kind: track.kind,
              id: track.id,
              enabled: track.enabled,
              readyState: track.readyState,
              muted: track.muted,
              label: track.label,
              settings: track.getSettings ? track.getSettings() : 'N/A',
            });

            // Monitor track events
            track.addEventListener('ended', () => {
              console.log(`🎵 Track ${index} ended`);
            });

            track.addEventListener('mute', () => {
              console.log(`🎵 Track ${index} muted`);
            });

            track.addEventListener('unmute', () => {
              console.log(`🎵 Track ${index} unmuted`);
            });
          });

          // Backup retry attempts only if video is still paused after initial attempts
          const retryAttempts = [1000, 2000, 3000];
          retryAttempts.forEach((delay, index) => {
            setTimeout(() => {
              if (videoElement.paused) {
                console.log(`🔄 Backup retry attempt ${index + 1} for ${streamKey} (${delay}ms)`);
                console.log(`📊 Current state:`, {
                  readyState: videoElement.readyState,
                  paused: videoElement.paused,
                  srcObject: !!videoElement.srcObject,
                  videoWidth: videoElement.videoWidth,
                  videoHeight: videoElement.videoHeight,
                });
                videoElement.play().catch((err) => {
                  console.error(`❌ Backup retry ${index + 1} failed:`, err);
                });
              }
            }, delay);
          });

          // Resume consumer
          if (socketRef.current) {
            console.log(`📡 Resuming consumer for ${streamKey}`);
            socketRef.current.emit('resumeConsumer', {
              deviceId: streamData.deviceId,
              cameraId: streamData.cameraId,
              consumerId: consumer.id,
            });
          }
        } else {
          console.log(`⚠️ Cannot attach track for ${streamKey}:`);
          console.log(`  - Has videoElement: ${!!videoElement}`);
          console.log(`  - Has consumer.track: ${!!consumer.track}`);
          console.log(`  - Has streamData: ${!!streamData}`);
          console.log(`  - No existing srcObject: ${!videoElement?.srcObject}`);
        }
      });
    };

    // Attach tracks whenever activeStreams changes (new video elements rendered)
    attachPendingTracks();
  }, [activeStreams]);

  const cleanup = () => {
    // Close all consumers
    consumersRef.current.forEach((consumer) => {
      if (consumer && !consumer.closed) {
        consumer.close();
      }
    });
    consumersRef.current.clear();

    // Close receive transport
    if (recvTransport && !recvTransport.closed) {
      recvTransport.close();
    }

    // Close device
    if (device && 'close' in device && typeof device.close === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      device.close();
    }

    // Disconnect socket
    if (socket) {
      socket.disconnect();
    }
  };

  // Create stable functions using useCallback
  const createConsumerForDevice = useCallback(
    (socketInstance: SocketInstance, deviceId: string, cameraId: string): void => {
      try {
        console.log('🎥 Creating consumer for device:', deviceRef.current);
        if (!deviceRef.current || !deviceRef.current.rtpCapabilities) {
          console.warn('⚠️ Mediasoup device not ready, skipping consumer creation');
          return;
        }

        if (!recvTransportRef.current) {
          console.warn('⚠️ Receive transport not ready, skipping consumer creation');
          return;
        }

        console.log(`��️ Creating consumer for ${deviceId}/${cameraId}...`);

        socketInstance.emit('consume', {
          deviceId,
          cameraId,
          rtpCapabilities: deviceRef.current.rtpCapabilities,
        });
      } catch (error) {
        console.error(`❌ Failed to create consumer for ${deviceId}/${cameraId}:`, error);
      }
    },
    []
  );

  const createConsumerForProducer = useCallback(
    (socketInstance: SocketInstance, producerData: ProducerData): void => {
      if (producerData.kind === 'video') {
        createConsumerForDevice(socketInstance, producerData.deviceId, producerData.cameraId);
      }
    },
    [createConsumerForDevice]
  );

  const consumeAllVideoFeeds = useCallback(
    (socketInstance: SocketInstance, deviceList: Array<Device>): void => {
      console.log('🎥 Consuming video feeds from all devices...');

      for (const deviceItem of deviceList) {
        for (const camera of deviceItem.cameras) {
          console.log(`📹 Consuming feed: ${deviceItem.name} → ${camera.name}`);
          createConsumerForDevice(socketInstance, deviceItem.id, camera.id);
        }
      }
    },
    [createConsumerForDevice]
  );

  const createReceiveTransport = useCallback(
    async (socketInstance: SocketInstance): Promise<mediasoup.types.Transport> => {
      console.log('🚛 Creating receive transport...');

      return new Promise((resolve, reject) => {
        // Add timeout to prevent hanging forever
        const timeout = setTimeout(() => {
          console.error('❌ Transport creation timeout after 10 seconds');
          reject(new Error('Transport creation timeout'));
        }, 10000);

        console.log('📡 Emitting createWebRtcTransport event...');
        socketInstance.emit('createTransport', {
          consumer: true,
        });

        console.log('⏳ Waiting for transportCreated event...');

        socketInstance.once('transportCreated', (data: unknown) => {
          console.log('✅ Received transportCreated event:', data);
          clearTimeout(timeout);

          try {
            const transportData = data as TransportData;
            console.log('🚛 Transport data received:', transportData);

            if (!deviceRef.current) {
              throw new Error('Device not initialized');
            }

            console.log('🏗️ Creating receive transport with device...');
            const transport = deviceRef.current.createRecvTransport({
              id: transportData.id,
              iceParameters: transportData.iceParameters,
              iceCandidates: transportData.iceCandidates,
              dtlsParameters: transportData.dtlsParameters,
            });

            console.log('✅ Receive transport created:', transport);

            // Handle transport events
            transport.on('connect', ({ dtlsParameters }, callback, errback) => {
              console.log('🔗 Transport connecting...');
              socketInstance.emit('connectTransport', {
                transportId: transport.id,
                dtlsParameters,
              });

              socketInstance.once('transportConnected', () => {
                console.log('✅ Transport connected');
                callback();
              });

              socketInstance.once('transportConnectError', (error: unknown) => {
                console.error('❌ Transport connect error:', error);
                errback(error as Error);
              });
            });

            transport.on('connectionstatechange', (state) => {
              console.log(`🔗 Transport connection state changed: ${state}`);
            });

            resolve(transport);
          } catch (error) {
            console.error('❌ Failed to create receive transport:', error);
            reject(error);
          }
        });

        socketInstance.once('transportCreateError', (error: unknown) => {
          console.error('❌ Transport creation error from server:', error);
          clearTimeout(timeout);
          reject(error as Error);
        });

        // Also listen for generic error events that might indicate server issues
        const errorHandler = (error: unknown) => {
          console.error('❌ Socket error during transport creation:', error);
        };

        socketInstance.once('error', errorHandler);
        socketInstance.once('disconnect', () => {
          console.error('❌ Socket disconnected during transport creation');
          clearTimeout(timeout);
          reject(new Error('Socket disconnected during transport creation'));
        });
      });
    },
    []
  );

  const setupConsumerTrack = useCallback(async (consumerData: ConsumerData): Promise<void> => {
    try {
      const streamKey = `${consumerData.deviceId || 'unknown'}-${consumerData.cameraId || 'unknown'}`;

      console.log(`🎬 Setting up consumer track for ${streamKey}:`, consumerData);

      if (!recvTransportRef.current) {
        console.error('❌ No receive transport available');
        return;
      }

      // Create consumer using real WebRTC transport
      const consumer = await recvTransportRef.current.consume({
        id: consumerData.consumerId,
        producerId: consumerData.producerId || '',
        kind: consumerData.kind as mediasoup.types.MediaKind,
        rtpParameters: consumerData.rtpParameters,
      });

      console.log(`✅ Consumer created for ${streamKey}:`, consumer);
      console.log(`🎵 Consumer track:`, consumer.track);
      if (consumer.track) {
        console.log(`🎵 Track readyState:`, consumer.track.readyState);
      }

      // Store consumer first
      consumersRef.current.set(streamKey, consumer);
      console.log(`💾 Consumer stored, total consumers:`, consumersRef.current.size);

      // Create stream entry to trigger video element rendering
      // The useEffect will handle track attachment when element is available
      setActiveStreams((prev) => {
        const newStreams = new Map(prev);
        newStreams.set(streamKey, {
          deviceId: consumerData.deviceId,
          cameraId: consumerData.cameraId,
          timestamp: Date.now(),
          active: true,
          consumer: consumer,
        });
        console.log(`📊 Updated activeStreams, total streams:`, newStreams.size);
        return newStreams;
      });

      // Update stats
      setStreamStats((prev) => ({
        ...prev,
        [streamKey]: {
          ...prev[streamKey],
          lastUpdate: Date.now(),
          consumerId: consumer.id,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        },
      }));
    } catch (error) {
      console.error('❌ Failed to setup consumer track:', error);
    }
  }, []);

  const initializeConnection = () => {
    console.log('🔗 Connecting to SFU Service...');

    const newSocket = io('ws://localhost:3000', {
      transports: ['websocket'],
      forceNew: true,
    }) as SocketInstance;

    newSocket.on('connect', () => {
      console.log('✅ Connected to SFU Service');
      setConnectionStatus('connected');

      // Add comprehensive event logging to debug server responses
      console.log('🔍 Setting up debug event listeners...');

      // Listen to all possible events to see what the server supports
      const debugEvents = [
        'transportCreated',
        'transportCreateError',
        'createWebRtcTransportResponse',
        'createTransportResponse',
        'transport-created',
        'transport-create-error',
        'newConsumerTransport',
        'consumerTransportCreated',
      ];

      debugEvents.forEach((eventName) => {
        newSocket.on(eventName, (data: unknown) => {
          console.log(`🔍 DEBUG: Received event '${eventName}':`, data);
        });
      });

      // Initialize mediasoup device and transport
      initializeMediasoupDevice(newSocket)
        .then(async () => {
          console.log('🔍 initializeMediasoupDevice');

          // Try to create receive transport
          try {
            const transport = await createReceiveTransport(newSocket);
            console.log('🔍 transport:', transport);
            setRecvTransport(transport);

            // Request available devices only after transport is ready
            newSocket.emit('getDevices');
          } catch (error) {
            console.error('❌ Failed to create transport, will try alternative approach:', error);

            // Fallback: Request devices without transport (for testing)
            console.log('🔄 Fallback: Requesting devices without transport...');
            newSocket.emit('getDevices');

            // Try different transport creation methods
            console.log('🔄 Trying alternative transport creation...');

            // Method 1: Try with different event name
            setTimeout(() => {
              console.log('📡 Trying createTransport event...');
              newSocket.emit('createTransport', { consumer: true });
            }, 1000);

            // Method 2: Try with createConsumerTransport
            setTimeout(() => {
              console.log('📡 Trying createConsumerTransport event...');
              newSocket.emit('createConsumerTransport');
            }, 2000);

            // Method 3: Try to proceed without transport for debugging
            setTimeout(() => {
              console.log('📡 Trying to proceed without transport...');
              // This will help us see if the issue is with transport or consumer creation
            }, 3000);
          }
        })
        .catch((error) => {
          console.error('❌ Failed to initialize:', error);
        });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from SFU Service');
      setConnectionStatus('disconnected');
    });

    newSocket.on('devices', (deviceList: unknown) => {
      console.log('📱 Received device list:', deviceList);
      const typedDeviceList = deviceList as Array<Device>;
      setDevices(typedDeviceList);

      // Auto-consume all video feeds
      consumeAllVideoFeeds(newSocket, typedDeviceList);
    });

    newSocket.on('newProducer', (data: unknown) => {
      console.log('🆕 New producer available:', data);
      const producerData = data as ProducerData;
      if (producerData.kind === 'video') {
        createConsumerForProducer(newSocket, producerData);
      }
    });

    newSocket.on('deviceRegistered', (data: unknown) => {
      console.log('📋 New device registered:', data);
      // Refresh device list
      newSocket.emit('getDevices');
    });

    newSocket.on('deviceDisconnected', (data: unknown) => {
      console.log('📴 Device disconnected:', data);
      const connectionData = data as DeviceConnectionData;
      removeStreamFromDevice(connectionData.deviceId, connectionData.cameraId);
    });

    // WebRTC specific events
    newSocket.on('consumed', (data: unknown) => {
      console.log('🍽️ Consumer created:', data);
      setTimeout(() => {
        setupConsumerTrack(data as ConsumerData).catch((error) => {
          console.error('❌ Error in setupConsumerTrack:', error);
        });
      }, 0);
    });

    newSocket.on('consumerResumed', (data: unknown) => {
      console.log('▶️ Consumer resumed:', data);
    });

    newSocket.on('error', (error: unknown) => {
      console.error('❌ Socket error:', error);
    });

    setSocket(newSocket);
  };

  const initializeMediasoupDevice = async (
    socketInstance: SocketInstance
  ): Promise<mediasoup.Device> => {
    try {
      console.log('🎛️ Initializing mediasoup device...');

      // Get router RTP capabilities
      const rtpCapabilities = await new Promise<unknown>((resolve) => {
        socketInstance.emit('getRtpCapabilities');
        socketInstance.once('rtpCapabilities', resolve);
      });

      console.log('📋 Router RTP capabilities:', rtpCapabilities);

      // Create mediasoup device
      const newDevice = new mediasoup.Device();
      await newDevice.load({
        routerRtpCapabilities: rtpCapabilities as mediasoup.types.RtpCapabilities,
      });

      console.log('✅ Mediasoup device initialized');
      console.log('🎛️ Device RTP capabilities:', newDevice.rtpCapabilities);

      setDevice(newDevice);
      return newDevice;
    } catch (error) {
      console.error('❌ Failed to initialize mediasoup device:', error);
      throw error;
    }
  };

  const removeStreamFromDevice = (deviceId: string, cameraId: string): void => {
    const streamKey = `${deviceId}-${cameraId}`;

    // Close consumer
    const consumer = consumersRef.current.get(streamKey);
    if (consumer && !consumer.closed) {
      consumer.close();
    }
    consumersRef.current.delete(streamKey);

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

  const renderVideoStream = (streamKey: string, streamData: StreamData) => {
    // const { device: deviceItem, camera } = getDeviceByStream(streamKey);
    // console.log('🎥 Device item:', deviceItem);
    // console.log('🎥 Camera:', camera);
    // const name = `${streamData.active}-${streamData.cameraId}`;
    const deviceItem = devices.find((d) => d.id === streamData.deviceId);
    const camera = deviceItem?.cameras.find((c) => c.id === streamData.cameraId);
    const stats = streamStats[streamKey] || {};

    if (!streamData) return null;

    return (
      <div key={streamKey} className="video-stream-container">
        <div className="stream-header">
          <h3>{deviceItem?.name}</h3>
          <span className="camera-name">{camera?.name}</span>
          <span className={`status ${streamData.active ? 'active' : 'inactive'}`}>
            {streamData.active ? '🔴 LIVE (WebRTC)' : '⚫ OFFLINE'}
          </span>
        </div>

        <div className="video-wrapper">
          <video
            ref={(el) => {
              console.log(`📺 Setting video ref for ${streamKey}:`, el);
              if (el) {
                videoRefs.current.set(streamKey, el);
                console.log(`✅ Video ref set for ${streamKey}`, videoRefs.current.get(streamKey));

                // Add event listeners to monitor video state
                el.addEventListener('loadstart', () => {
                  console.log(`🎬 ${streamKey}: loadstart`);
                });
                el.addEventListener('loadeddata', () => {
                  console.log(`🎬 ${streamKey}: loadeddata`);
                });
                el.addEventListener('loadedmetadata', () => {
                  console.log(`🎬 ${streamKey}: loadedmetadata`);
                });
                el.addEventListener('canplay', () => {
                  console.log(`🎬 ${streamKey}: canplay`);
                });
                el.addEventListener('canplaythrough', () => {
                  console.log(`🎬 ${streamKey}: canplaythrough`);
                });
                el.addEventListener('playing', () => {
                  console.log(`🎬 ${streamKey}: playing`);
                });
                el.addEventListener('pause', () => {
                  console.log(`🎬 ${streamKey}: pause`);
                });
                el.addEventListener('ended', () => {
                  console.log(`🎬 ${streamKey}: ended`);
                });
                el.addEventListener('error', (e) => {
                  console.error(`🎬 ${streamKey}: error`, e);
                });
                el.addEventListener('stalled', () => {
                  console.warn(`🎬 ${streamKey}: stalled`);
                });
                el.addEventListener('waiting', () => {
                  console.warn(`🎬 ${streamKey}: waiting`);
                });
              }
            }}
            autoPlay
            muted
            playsInline
            className="video-element"
            style={{ border: '2px solid red' }} // Add visible border to see the video element
          />

          <div className="stream-overlay">
            <div className="stream-info">
              <span>
                📹 {camera?.resolution} @ {camera?.fps}fps
              </span>
              <span>
                🎬 Consumer: {(stats as StreamStats).consumerId?.substring(0, 8) || 'N/A'}...
              </span>
              <span>📡 WebRTC: {(stats as StreamStats).kind || 'video'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDeviceGrid = () => {
    const streamEntries = Array.from(activeStreams.entries());
    console.log(streamEntries);

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
      <span className="tech-info">WebRTC + mediasoup</span>
    </div>
  );

  const renderSystemStats = () => (
    <div className="system-stats">
      <div className="stat-item">
        <span className="label">🎥 WebRTC Streams:</span>
        <span className="value">{activeStreams.size}</span>
      </div>
      <div className="stat-item">
        <span className="label">📱 Connected Devices:</span>
        <span className="value">{devices.length}</span>
      </div>
      <div className="stat-item">
        <span className="label">🍽️ Active Consumers:</span>
        <span className="value">{consumersRef.current.size}</span>
      </div>
      <div className="stat-item">
        <span className="label">🎛️ Device Status:</span>
        <span className="value">{device ? 'Ready' : 'Loading...'}</span>
      </div>
      <div className="stat-item">
        <span className="label">🚛 Transport Status:</span>
        <span className="value">{recvTransport ? 'Connected' : 'Connecting...'}</span>
      </div>
    </div>
  );

  return (
    <div className="multi-stream-viewer">
      <header className="viewer-header">
        <h1>🎥 Real WebRTC Multi-Stream Viewer</h1>
        {renderConnectionStatus()}
        {renderSystemStats()}
      </header>

      <main className="viewer-content">
        {activeStreams.size > 0 ? (
          <>
            <div className="content-header">
              <h2>📺 Live WebRTC Video Streams ({activeStreams.size})</h2>
              <p>🔄 Real-time streaming via mediasoup WebRTC</p>
            </div>
            {renderDeviceGrid()}
          </>
        ) : (
          <div className="no-streams">
            <h2>⏳ Waiting for WebRTC video streams...</h2>
            <p>Ensure remote devices are connected and producing video</p>
            {device && (
              <div className="device-status">
                <h3>🎛️ mediasoup Device Status:</h3>
                <div className="status-item">
                  <span>✅ Device loaded and ready</span>
                  <span>
                    📋 RTP Capabilities: {device.rtpCapabilities ? 'Available' : 'Loading...'}
                  </span>
                </div>
              </div>
            )}
            {recvTransport && (
              <div className="device-status">
                <h3>🚛 Transport Status:</h3>
                <div className="status-item">
                  <span>✅ Receive transport connected</span>
                  <span>🔗 Connection State: {recvTransport.connectionState}</span>
                </div>
              </div>
            )}
            {devices.length > 0 && (
              <div className="device-list">
                <h3>📋 Available Devices:</h3>
                {devices.map((deviceItem) => (
                  <div key={deviceItem.id} className="device-item">
                    <span>{deviceItem.name}</span>
                    <span className={`device-status ${deviceItem.status}`}>
                      {deviceItem.status.toUpperCase()}
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

// Enhanced CSS Styles for WebRTC client
const styles = `
.multi-stream-viewer {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: white;
}

.viewer-header {
  background: rgba(0,0,0,0.2);
  backdrop-filter: blur(10px);
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
}

.connection-status.connected {
  background: rgba(39, 174, 96, 0.3);
  border-color: rgba(39, 174, 96, 0.5);
}

.connection-status.disconnected {
  background: rgba(231, 76, 60, 0.3);
  border-color: rgba(231, 76, 60, 0.5);
}

.tech-info {
  font-size: 0.8rem;
  opacity: 0.8;
  background: rgba(255,255,255,0.1);
  padding: 0.2rem 0.5rem;
  border-radius: 10px;
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
  background: rgba(255,255,255,0.1);
  padding: 0.5rem;
  border-radius: 8px;
  min-width: 100px;
}

.stat-item .value {
  font-weight: bold;
  font-size: 1.1rem;
  color: #3498db;
  text-shadow: 0 0 10px rgba(52, 152, 219, 0.5);
}

.viewer-content {
  padding: 2rem;
}

.content-header {
  text-align: center;
  margin-bottom: 2rem;
}

.content-header h2 {
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.video-stream-container {
  background: rgba(255,255,255,0.95);
  color: #333;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  overflow: hidden;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
}

.video-stream-container:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 12px 40px rgba(0,0,0,0.3);
}

.stream-header {
  background: linear-gradient(45deg, #2c3e50, #34495e);
  color: white;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stream-header h3 {
  margin: 0;
  font-size: 1.1rem;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.camera-name {
  font-size: 0.9rem;
  opacity: 0.8;
}

.status.active {
  color: #e74c3c;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(231, 76, 60, 0.5);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.status.inactive {
  color: #95a5a6;
}

.video-wrapper {
  position: relative;
  aspect-ratio: 16/9;
  background: #000;
  overflow: hidden;
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
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  padding: 1rem;
}

.stream-info {
  display: flex;
  justify-content: space-between;
  color: white;
  font-size: 0.8rem;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

.no-streams {
  text-align: center;
  padding: 4rem 2rem;
  background: rgba(255,255,255,0.1);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  margin: 2rem auto;
  max-width: 800px;
}

.device-status {
  margin: 2rem 0;
  padding: 1rem;
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.2);
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
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
  background: rgba(255,255,255,0.9);
  color: #333;
  margin: 0.5rem 0;
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  backdrop-filter: blur(10px);
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

export default WebRTCMultiStreamViewer;
