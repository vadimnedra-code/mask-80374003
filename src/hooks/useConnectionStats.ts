import { useState, useEffect, useCallback } from 'react';

export interface ConnectionStats {
  latency: number | null;
  packetLoss: number | null;
  jitter: number | null;
  bitrate: number | null;
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
}

export const useConnectionStats = (peerConnection: RTCPeerConnection | null) => {
  const [stats, setStats] = useState<ConnectionStats>({
    latency: null,
    packetLoss: null,
    jitter: null,
    bitrate: null,
    quality: 'unknown'
  });

  const [prevBytesReceived, setPrevBytesReceived] = useState<number>(0);
  const [prevTimestamp, setPrevTimestamp] = useState<number>(0);

  const calculateQuality = useCallback((latency: number | null, packetLoss: number | null): ConnectionStats['quality'] => {
    if (latency === null && packetLoss === null) return 'unknown';
    
    const lat = latency ?? 0;
    const loss = packetLoss ?? 0;

    if (lat < 100 && loss < 1) return 'excellent';
    if (lat < 200 && loss < 3) return 'good';
    if (lat < 400 && loss < 5) return 'fair';
    return 'poor';
  }, []);

  useEffect(() => {
    if (!peerConnection) {
      setStats({
        latency: null,
        packetLoss: null,
        jitter: null,
        bitrate: null,
        quality: 'unknown'
      });
      return;
    }

    const getStats = async () => {
      try {
        const statsReport = await peerConnection.getStats();
        let latency: number | null = null;
        let packetLoss: number | null = null;
        let jitter: number | null = null;
        let currentBytesReceived = 0;
        let currentTimestamp = Date.now();

        statsReport.forEach((report) => {
          // Get RTT from candidate-pair
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (report.currentRoundTripTime !== undefined) {
              latency = Math.round(report.currentRoundTripTime * 1000);
            }
          }

          // Get packet loss and jitter from inbound-rtp
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
        });

        // Calculate bitrate
        let bitrate: number | null = null;
        if (prevBytesReceived > 0 && prevTimestamp > 0) {
          const timeDiff = (currentTimestamp - prevTimestamp) / 1000;
          if (timeDiff > 0) {
            bitrate = Math.round(((currentBytesReceived - prevBytesReceived) * 8) / timeDiff / 1000);
          }
        }

        setPrevBytesReceived(currentBytesReceived);
        setPrevTimestamp(currentTimestamp);

        const quality = calculateQuality(latency, packetLoss);

        setStats({
          latency,
          packetLoss,
          jitter,
          bitrate,
          quality
        });
      } catch (error) {
        console.error('Error getting connection stats:', error);
      }
    };

    // Get stats every 2 seconds
    const interval = setInterval(getStats, 2000);
    getStats();

    return () => clearInterval(interval);
  }, [peerConnection, calculateQuality, prevBytesReceived, prevTimestamp]);

  return stats;
};
