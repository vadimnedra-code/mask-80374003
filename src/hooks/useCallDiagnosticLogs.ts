import { useState, useCallback, useRef } from 'react';

export interface DiagnosticLogEntry {
  timestamp: Date;
  type: 'ice' | 'sdp' | 'connection' | 'media' | 'error' | 'info';
  event: string;
  details?: string;
}

export const useCallDiagnosticLogs = () => {
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>([]);
  const logsRef = useRef<DiagnosticLogEntry[]>([]);

  const addLog = useCallback((type: DiagnosticLogEntry['type'], event: string, details?: string) => {
    const entry: DiagnosticLogEntry = {
      timestamp: new Date(),
      type,
      event,
      details,
    };
    logsRef.current = [...logsRef.current, entry];
    setLogs([...logsRef.current]);
    
    // Also log to console for debugging
    console.log(`[CallDiag][${type.toUpperCase()}] ${event}${details ? `: ${details}` : ''}`);
  }, []);

  const clearLogs = useCallback(() => {
    logsRef.current = [];
    setLogs([]);
  }, []);

  const generateReport = useCallback(() => {
    const report: string[] = [
      '=== MASK Call Diagnostic Report ===',
      `Generated: ${new Date().toISOString()}`,
      `Total Events: ${logsRef.current.length}`,
      '',
      '--- Event Timeline ---',
    ];

    logsRef.current.forEach((entry, index) => {
      const time = entry.timestamp.toISOString().split('T')[1].split('.')[0];
      const line = `[${time}] [${entry.type.toUpperCase().padEnd(10)}] ${entry.event}`;
      report.push(line);
      if (entry.details) {
        report.push(`           └─ ${entry.details}`);
      }
    });

    report.push('');
    report.push('--- Summary ---');
    
    const typeCounts = logsRef.current.reduce((acc, entry) => {
      acc[entry.type] = (acc[entry.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(typeCounts).forEach(([type, count]) => {
      report.push(`${type.toUpperCase()}: ${count} events`);
    });

    const errors = logsRef.current.filter(e => e.type === 'error');
    if (errors.length > 0) {
      report.push('');
      report.push('--- Errors ---');
      errors.forEach(e => report.push(`• ${e.event}: ${e.details || 'No details'}`));
    }

    report.push('');
    report.push('=== End of Report ===');

    return report.join('\n');
  }, []);

  const copyReportToClipboard = useCallback(async () => {
    const report = generateReport();
    try {
      await navigator.clipboard.writeText(report);
      return true;
    } catch (err) {
      console.error('Failed to copy report:', err);
      return false;
    }
  }, [generateReport]);

  return {
    logs,
    addLog,
    clearLogs,
    generateReport,
    copyReportToClipboard,
  };
};
