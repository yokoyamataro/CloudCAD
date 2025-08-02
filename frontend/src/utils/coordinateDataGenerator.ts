// 1000点の座標データを生成するユーティリティ

export interface CoordinatePoint {
  id: string;
  pointName: string;
  x: number;
  y: number;
  z: number;
  type: 'benchmark' | 'control_point' | 'boundary_point';
  visible: boolean;
}

export const generateCoordinateData = (count: number = 1000): CoordinatePoint[] => {
  const data: CoordinatePoint[] = [];
  const types: Array<'benchmark' | 'control_point' | 'boundary_point'> = ['benchmark', 'control_point', 'boundary_point'];
  const typePrefix = { benchmark: 'BP', control_point: 'CP', boundary_point: 'PT' };
  
  for (let i = 1; i <= count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const baseX = 45000 + (i % 50) * 10 + Math.random() * 5;
    const baseY = -12000 - Math.floor(i / 50) * 10 + Math.random() * 5;
    const baseZ = 10 + Math.random() * 10;
    
    data.push({
      id: i.toString(),
      pointName: `${typePrefix[type]}-${i.toString().padStart(4, '0')}`,
      type: type,
      x: parseFloat(baseX.toFixed(3)),
      y: parseFloat(baseY.toFixed(3)),
      z: parseFloat(baseZ.toFixed(3)),
      visible: true
    });
  }
  return data;
};