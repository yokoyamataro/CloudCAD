import React, { useMemo, useState } from 'react';
import { Map, NavigationControl, ScaleControl, Marker, Popup } from 'react-map-gl/maplibre';
import {
  Paper,
  Text,
  Badge,
  Button,
  Group,
  Stack
} from '@mantine/core';
import { IconMapPin, IconEye } from '@tabler/icons-react';
import type { Project } from '../../types/project';
import 'maplibre-gl/dist/maplibre-gl.css';

interface ProjectMapViewerProps {
  projects: Project[];
  onProjectSelect?: (project: Project) => void;
}

export const ProjectMapViewer: React.FC<ProjectMapViewerProps> = ({ 
  projects, 
  onProjectSelect 
}) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  // プロジェクトの座標データがあるもののみフィルター
  const validProjects = useMemo(() => {
    return projects.filter(project => project.location.coordinates);
  }, [projects]);

  // 全プロジェクトが見えるように地図の中心と境界を計算
  const mapBounds = useMemo(() => {
    if (validProjects.length === 0) {
      return {
        center: { lat: 35.6762, lng: 139.6503 }, // 東京駅
        zoom: 5
      };
    }

    const lats = validProjects.map(p => p.location.coordinates!.lat);
    const lngs = validProjects.map(p => p.location.coordinates!.lng);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    // 境界に基づいてズームレベルを計算（簡易版）
    const latRange = maxLat - minLat;
    const lngRange = maxLng - minLng;
    const maxRange = Math.max(latRange, lngRange);
    
    let zoom = 5;
    if (maxRange < 0.1) zoom = 10;
    else if (maxRange < 0.5) zoom = 8;
    else if (maxRange < 2) zoom = 6;
    else if (maxRange < 10) zoom = 4;
    
    return {
      center: { lat: centerLat, lng: centerLng },
      zoom
    };
  }, [validProjects]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return '#4c6ef5';
      case 'in_progress': return '#fab005';
      case 'review': return '#fd7e14';
      case 'completed': return '#51cf66';
      default: return '#868e96';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planning': return '計画中';
      case 'in_progress': return '実施中';
      case 'review': return 'レビュー中';
      case 'completed': return '完了';
      default: return '不明';
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Map
        initialViewState={{
          longitude: mapBounds.center.lng,
          latitude: mapBounds.center.lat,
          zoom: mapBounds.zoom
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://tile.openstreetmap.jp/styles/maptiler-basic-ja/style.json"
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-left" />
        
        {validProjects.map((project) => (
          <Marker
            key={project.id}
            longitude={project.location.coordinates!.lng}
            latitude={project.location.coordinates!.lat}
            anchor="bottom"
          >
            <div
              style={{
                backgroundColor: getStatusColor(project.status),
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: '3px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => {
                setSelectedProject(selectedProject?.id === project.id ? null : project);
              }}
            >
              <IconMapPin size={14} color="white" />
            </div>
          </Marker>
        ))}

        {selectedProject && (
          <Popup
            longitude={selectedProject.location.coordinates!.lng}
            latitude={selectedProject.location.coordinates!.lat}
            anchor="top"
            closeButton={true}
            closeOnClick={false}
            onClose={() => setSelectedProject(null)}
            style={{
              maxWidth: '300px'
            }}
          >
            <Paper p="sm" style={{ minWidth: '250px' }}>
              <Stack gap="sm">
                <div>
                  <Text fw={500} mb={4}>{selectedProject.name}</Text>
                  <Text size="sm" c="dimmed" mb="xs">{selectedProject.location.address}</Text>
                  <Badge 
                    color={getStatusColor(selectedProject.status)} 
                    variant="light"
                  >
                    {getStatusLabel(selectedProject.status)}
                  </Badge>
                </div>
                
                <Text size="sm" lineClamp={2}>
                  {selectedProject.description}
                </Text>
                
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    作成日: {new Date(selectedProject.createdAt).toLocaleDateString('ja-JP')}
                  </Text>
                </Group>
                
                {onProjectSelect && (
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconEye size={14} />}
                    onClick={() => onProjectSelect(selectedProject)}
                    fullWidth
                  >
                    プロジェクトを開く
                  </Button>
                )}
              </Stack>
            </Paper>
          </Popup>
        )}
      </Map>
      
      {/* 凡例 */}
      <Paper
        p="sm"
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 1000,
          minWidth: '150px'
        }}
        shadow="sm"
      >
        <Text size="sm" fw={500} mb="xs">プロジェクト状況</Text>
        <Stack gap={4}>
          <Group gap="xs">
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: getStatusColor('planning')
              }}
            />
            <Text size="xs">計画中</Text>
          </Group>
          <Group gap="xs">
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: getStatusColor('in_progress')
              }}
            />
            <Text size="xs">実施中</Text>
          </Group>
          <Group gap="xs">
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: getStatusColor('review')
              }}
            />
            <Text size="xs">レビュー中</Text>
          </Group>
          <Group gap="xs">
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: getStatusColor('completed')
              }}
            />
            <Text size="xs">完了</Text>
          </Group>
        </Stack>
      </Paper>
    </div>
  );
};