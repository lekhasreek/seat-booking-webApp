import React from 'react';
import { useRealtime } from '../contexts/RealtimeContext';

const ConnectionStatusIndicator = ({ className = '', showText = true }) => {
  const { connectionStatus } = useRealtime();

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          color: 'bg-green-500',
          text: 'Live',
          pulse: 'animate-pulse',
          icon: '●'
        };
      case 'connecting':
        return {
          color: 'bg-yellow-500',
          text: 'Connecting...',
          pulse: 'animate-pulse',
          icon: '◐'
        };
      case 'disconnected':
        return {
          color: 'bg-gray-400',
          text: 'Offline',
          pulse: '',
          icon: '○'
        };
      case 'error':
        return {
          color: 'bg-red-500',
          text: 'Connection Error',
          pulse: 'animate-pulse',
          icon: '✕'
        };
      default:
        return {
          color: 'bg-gray-400',
          text: 'Unknown',
          pulse: '',
          icon: '?'
        };
    }
  };

  const { color, text, pulse, icon } = getStatusConfig();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-3 h-3 rounded-full ${color} ${pulse}`} title={`Connection status: ${text}`} />
      {showText && (
        <span className="text-sm font-medium text-gray-600">
          {text}
        </span>
      )}
    </div>
  );
};

export default ConnectionStatusIndicator;
