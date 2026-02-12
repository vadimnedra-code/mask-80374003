import { useState, useEffect, useCallback, useRef } from 'react';

export type VideoQuality = 'high' | 'medium' | 'low' | 'auto';

export interface VideoStats {
  width: number | null;
  height: number | null;
  frameRate: number | null;
  bitrate: number | null;
}

export type ConnectionType = 'relay' | 'srflx' | 'prflx' | 'host' | 'unknown';

export interface ConnectionStats {
  latency: number | null;
  packetLoss: number | null;
  jitter: number | null;
  bitrate: number | null;
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  connectionType: ConnectionType;
  localCandidateType: string | null;
  remoteCandidateType: string | null;
  relayProtocol: string | null;
  videoStats: VideoStats;
  currentVideoQuality: VideoQuality;
}

interface UseConnectionStatsOptions {
  autoAdaptQuality?: boolean;
  onQualityChange?: (quality: VideoQuality) => void;
}

export const VIDEO_QUALITY_CONSTRAINTS: Record<Exclude<VideoQuality, 'auto'>, MediaTrackConstraints> = {
  high: {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 30 },
  },
  medium: {
    width: { ideal: 640, max: 960 },
    height: { ideal: 480, max: 540 },
    frameRate: { ideal: 24 },
  },
  low: {
    width: { ideal: 320, max: 480 },
    height: { ideal: 240, max: 360 },
    frameRate: { ideal: 15 },
  },
};

export const useConnectionStats = (
  peerConnection: RTCPeerConnection | null,
  options: UseConnectionStatsOptions = {}
) => {
  const { autoAdaptQuality = true, onQualityChange } = options;
  
  const [stats, setStats] = useState<ConnectionStats>({
    latency: null,
    packetLoss: null,
    jitter: null,
    bitrate: null,
    quality: 'unknown',
    connectionType: 'unknown',
    localCandidateType: null,
    remoteCandidateType: null,
    relayProtocol: null,
    videoStats: {
      width: null,
      height: null,
      frameRate: null,
      bitrate: null,
    },
    currentVideoQuality: 'auto',
  });

  const [prevBytesReceived, setPrevBytesReceived] = useState<number>(0);
  const [prevVideoBytesReceived, setPrevVideoBytesReceived] = useState<number>(0);
  const [prevTimestamp, setPrevTimestamp] = useState<number>(0);
  const poorQualityCount = useRef(0);
  const lastQualityChange = useRef(0);

  const calculateQuality = useCallback((latency: number | null, packetLoss: number | null): ConnectionStats['quality'] => {
    if (latency === null && packetLoss === null) return 'unknown';
    
    const lat = latency ?? 0;
    const loss = packetLoss ?? 0;

    if (lat < 100 && loss < 1) return 'excellent';
    if (lat < 200 && loss < 3) return 'good';
    if (lat < 400 && loss < 5) return 'fair';
    return 'poor';
  }, []);

  const getRecommendedQuality = useCallback((quality: ConnectionStats['quality']): Exclude<VideoQuality, 'auto'> => {
    switch (quality) {
      case 'excellent':
        return 'high';
      case 'good':
        return 'high';
      case 'fair':
        return 'medium';
      case 'poor':
        return 'low';
      default:
        return 'medium';
    }
  }, []);

  useEffect(() => {
    if (!peerConnection) {
      setStats({
        latency: null,
        packetLoss: null,
        jitter: null,
        bitrate: null,
        quality: 'unknown',
        connectionType: 'unknown',
        localCandidateType: null,
        remoteCandidateType: null,
        relayProtocol: null,
        videoStats: {
          width: null,
          height: null,
          frameRate: null,
          bitrate: null,
        },
        currentVideoQuality: 'auto',
      });
      poorQualityCount.current = 0;
      return;
    }

    const getStats = async () => {
      try {
        const statsReport = await peerConnection.getStats();
        let latency: number | null = null;
        let packetLoss: number | null = null;
        let jitter: number | null = null;
        let currentBytesReceived = 0;
        let currentVideoBytesReceived = 0;
        let currentTimestamp = Date.now();
        let videoWidth: number | null = null;
        let videoHeight: number | null = null;
        let frameRate: number | null = null;
        let localCandidateId: string | null = null;
        let remoteCandidateId: string | null = null;
        let detectedLocalType: string | null = null;
        let detectedRemoteType: string | null = null;
        let detectedRelayProtocol: string | null = null;

        // First pass: find succeeded candidate pair
        statsReport.forEach((report) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (report.currentRoundTripTime !== undefined) {
              latency = Math.round(report.currentRoundTripTime * 1000);
            }
            localCandidateId = report.localCandidateId ?? null;
            remoteCandidateId = report.remoteCandidateId ?? null;
          }
        });

        // Second pass: resolve candidate types and gather RTP stats
        statsReport.forEach((report) => {
          // Resolve local candidate type
          if (report.type === 'local-candidate' && report.id === localCandidateId) {
            detectedLocalType = report.candidateType ?? null;
            if (report.relayProtocol) {
              detectedRelayProtocol = report.relayProtocol;
            }
          }
          // Resolve remote candidate type
          if (report.type === 'remote-candidate' && report.id === remoteCandidateId) {
            detectedRemoteType = report.candidateType ?? null;
          }

          // Get packet loss and jitter from inbound-rtp audio
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            if (report.packetsLost !== undefined && report.packetsReceived !== undefined) {
              const totalPackets = report.packetsLost + report.packetsReceived;
              if (totalPackets > 0) {
                packetLoss = Math.round((report.packetsLost / totalPackets) * 100 * 10) / 10;
              }
            }
            if (report.jitter !== undefined) {
              jitter = Math.round(report.jitter * 1000);
            }
            if (report.bytesReceived !== undefined) {
              currentBytesReceived = report.bytesReceived;
            }
          }

          // Get video stats from inbound-rtp video
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            if (report.frameWidth !== undefined) {
              videoWidth = report.frameWidth;
            }
            if (report.frameHeight !== undefined) {
              videoHeight = report.frameHeight;
            }
            if (report.framesPerSecond !== undefined) {
              frameRate = Math.round(report.framesPerSecond);
            }
            if (report.bytesReceived !== undefined) {
              currentVideoBytesReceived = report.bytesReceived;
            }
          }
        });

        // Determine connection type
        const connectionType: ConnectionType = 
          detectedLocalType === 'relay' || detectedRemoteType === 'relay' ? 'relay' :
          detectedLocalType === 'srflx' || detectedRemoteType === 'srflx' ? 'srflx' :
          detectedLocalType === 'prflx' || detectedRemoteType === 'prflx' ? 'prflx' :
          detectedLocalType === 'host' ? 'host' : 'unknown';

        // Calculate audio bitrate
        let bitrate: number | null = null;
        if (prevBytesReceived > 0 && prevTimestamp > 0) {
          const timeDiff = (currentTimestamp - prevTimestamp) / 1000;
          if (timeDiff > 0) {
            bitrate = Math.round(((currentBytesReceived - prevBytesReceived) * 8) / timeDiff / 1000);
          }
        }

        // Calculate video bitrate
        let videoBitrate: number | null = null;
        if (prevVideoBytesReceived > 0 && prevTimestamp > 0) {
          const timeDiff = (currentTimestamp - prevTimestamp) / 1000;
          if (timeDiff > 0) {
            videoBitrate = Math.round(((currentVideoBytesReceived - prevVideoBytesReceived) * 8) / timeDiff / 1000);
          }
        }

        setPrevBytesReceived(currentBytesReceived);
        setPrevVideoBytesReceived(currentVideoBytesReceived);
        setPrevTimestamp(currentTimestamp);

        const quality = calculateQuality(latency, packetLoss);

        // Auto-adapt quality logic
        if (autoAdaptQuality && quality === 'poor') {
          poorQualityCount.current++;
          // If poor quality persists for 3 checks (6 seconds), suggest lowering quality
          if (poorQualityCount.current >= 3 && Date.now() - lastQualityChange.current > 10000) {
            const recommended = getRecommendedQuality(quality);
            onQualityChange?.(recommended);
            lastQualityChange.current = Date.now();
            poorQualityCount.current = 0;
          }
        } else if (quality === 'excellent' || quality === 'good') {
          poorQualityCount.current = 0;
        }

        setStats(prev => ({
          latency,
          packetLoss,
          jitter,
          bitrate,
          quality,
          connectionType,
          localCandidateType: detectedLocalType,
          remoteCandidateType: detectedRemoteType,
          relayProtocol: detectedRelayProtocol,
          videoStats: {
            width: videoWidth,
            height: videoHeight,
            frameRate,
            bitrate: videoBitrate,
          },
          currentVideoQuality: prev.currentVideoQuality,
        }));
      } catch (error) {
        console.error('Error getting connection stats:', error);
      }
    };

    // Get stats every 2 seconds
    const interval = setInterval(getStats, 2000);
    getStats();

    return () => clearInterval(interval);
  }, [peerConnection, calculateQuality, autoAdaptQuality, onQualityChange, getRecommendedQuality, prevBytesReceived, prevVideoBytesReceived, prevTimestamp]);

  const setVideoQuality = useCallback((quality: VideoQuality) => {
    setStats(prev => ({ ...prev, currentVideoQuality: quality }));
    lastQualityChange.current = Date.now();
  }, []);

  return { stats, setVideoQuality };
};
