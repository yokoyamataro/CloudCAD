import React from 'react';
import type { Project } from '../../types/project';
import { MapLibreViewer } from './MapLibreViewer';

interface CoordinatePoint {
  id: string;
  pointName: string;
  x: number;
  y: number;
  z: number;
  type: 'benchmark' | 'control_point' | 'boundary_point';
  visible: boolean;
}

interface LotData {
  id: string;
  lotNumber: string;
  landCategory: string;
  area: number;
  coordinates: string[];
  visible: boolean;
}

interface CoordinateLotViewerProps {
  project?: Project;
  coordinates?: CoordinatePoint[];
  lots?: LotData[];
  hoveredCoordinate?: string | null;
  hoveredLot?: string | null;
  onCoordinateClick?: (coordinate: CoordinatePoint) => void;
  onLotClick?: (lot: LotData) => void;
}

/**
 * 座標・地番ビューワー（地理院地図ベース統一版）
 * MapLibreViewerをラップして既存のインターフェースとの互換性を保つ
 */
export const CoordinateLotViewer: React.FC<CoordinateLotViewerProps> = ({
  project,
  coordinates,
  lots,
  hoveredCoordinate,
  hoveredLot,
  onCoordinateClick,
  onLotClick
}) => {
  return (
    <MapLibreViewer
      project={project}
      coordinates={coordinates}
      lots={lots}
      hoveredCoordinate={hoveredCoordinate}
      hoveredLot={hoveredLot}
      onCoordinateClick={onCoordinateClick}
      onLotClick={onLotClick}
    />
  );
};