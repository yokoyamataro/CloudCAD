// 共通のモックデータ生成関数

export interface CoordinatePoint {
  id: string;
  pointName: string;
  type: 'benchmark' | 'control_point' | 'boundary_point';
  x: number;
  y: number;
  z: number;
  description: string;
  surveyDate: string;
  assignee: string;
  status: string;
}

export interface LotData {
  id: string;
  parentNumber: number;
  childNumber?: number;
  landCategory: string;
  area: number;
  address: string;
  owner: string;
  registrationDate: string;
  description?: string;
  coordinates: string[];
}

export interface LandownerData {
  id: string;
  name: string;
  type: 'individual' | 'company';
  address: string;
  phone: string;
  email: string;
  registrationDate: string;
  totalLandArea: number;
  landCount: number;
}

// 整然とした座標データ生成（規則的配置）
export const generateSimpleCoordinateData = (): CoordinatePoint[] => {
  const data: CoordinatePoint[] = [];
  const typeLabels = { benchmark: '基準点', control_point: '制御点', boundary_point: '境界点' };
  const assignees = ['田中太郎', '佐藤花子', '山田一郎', '鈴木美子', '高橋健太', '未割当'];
  const statuses = ['未測量', '測量中', '測量済み', '検査済み', '要再測量'];
  
  let pointId = 1;

  // 1. 基準点を四隅に配置（4点）
  const benchmarkPositions = [
    { x: -20000, y: 15000, name: 'BP-001' },
    { x: -19000, y: 15000, name: 'BP-002' },
    { x: -19000, y: 16000, name: 'BP-003' },
    { x: -20000, y: 16000, name: 'BP-004' }
  ];

  benchmarkPositions.forEach((pos, index) => {
    data.push({
      id: pointId.toString(),
      pointName: pos.name,
      type: 'benchmark',
      x: pos.x,
      y: pos.y,
      z: 55 + index * 2,
      description: `${typeLabels.benchmark}${index + 1}号`,
      surveyDate: '2024-01-15',
      assignee: assignees[0],
      status: '検査済み'
    });
    pointId++;
  });

  // 2. 制御点を中間位置に規則的に配置（12点）
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const x = -19750 + col * 250;
      const y = 15250 + row * 250;
      
      data.push({
        id: pointId.toString(),
        pointName: `CP-${pointId.toString().padStart(3, '0')}`,
        type: 'control_point',
        x: x,
        y: y,
        z: 52 + row + col,
        description: `${typeLabels.control_point}${pointId - 4}号`,
        surveyDate: '2024-02-01',
        assignee: assignees[1],
        status: '測量済み'
      });
      pointId++;
    }
  }

  // 3. 境界点を地番の周囲に規則的に配置（24点）
  // 地番1の境界点（長方形）
  const lot1Points = [
    { x: -19900, y: 15100, name: 'PT-017' },
    { x: -19800, y: 15100, name: 'PT-018' },
    { x: -19800, y: 15200, name: 'PT-019' },
    { x: -19900, y: 15200, name: 'PT-020' }
  ];

  // 地番2の境界点（長方形）
  const lot2Points = [
    { x: -19700, y: 15100, name: 'PT-021' },
    { x: -19600, y: 15100, name: 'PT-022' },
    { x: -19600, y: 15200, name: 'PT-023' },
    { x: -19700, y: 15200, name: 'PT-024' }
  ];

  // 地番3の境界点（L字型）
  const lot3Points = [
    { x: -19500, y: 15100, name: 'PT-025' },
    { x: -19400, y: 15100, name: 'PT-026' },
    { x: -19400, y: 15150, name: 'PT-027' },
    { x: -19450, y: 15150, name: 'PT-028' },
    { x: -19450, y: 15200, name: 'PT-029' },
    { x: -19500, y: 15200, name: 'PT-030' }
  ];

  // 地番4の境界点（長方形）
  const lot4Points = [
    { x: -19900, y: 15300, name: 'PT-031' },
    { x: -19750, y: 15300, name: 'PT-032' },
    { x: -19750, y: 15400, name: 'PT-033' },
    { x: -19900, y: 15400, name: 'PT-034' }
  ];

  // 地番5の境界点（長方形）
  const lot5Points = [
    { x: -19650, y: 15300, name: 'PT-035' },
    { x: -19500, y: 15300, name: 'PT-036' },
    { x: -19500, y: 15400, name: 'PT-037' },
    { x: -19650, y: 15400, name: 'PT-038' }
  ];

  const allLotPoints = [...lot1Points, ...lot2Points, ...lot3Points, ...lot4Points, ...lot5Points];

  allLotPoints.forEach((pos, index) => {
    data.push({
      id: pointId.toString(),
      pointName: pos.name,
      type: 'boundary_point',
      x: pos.x,
      y: pos.y,
      z: 48 + index * 0.5,
      description: `${typeLabels.boundary_point}${index + 1}号`,
      surveyDate: '2024-03-01',
      assignee: assignees[Math.floor(index / 6) % assignees.length],
      status: index < 12 ? '測量済み' : '測量中'
    });
    pointId++;
  });

  return data;
};

// きれいに整理された地番データ生成
export const generateLotData = (): LotData[] => {
  const owners = ['田中太郎', '佐藤花子', '山田一郎', '鈴木美子', '高橋健太'];
  
  return [
    {
      id: '1',
      parentNumber: 123,
      childNumber: 1,
      landCategory: '宅地',
      area: 150.25,
      address: '北海道釧路市春日町123-1',
      owner: owners[0],
      registrationDate: '2024-01-20',
      description: '角地、南向き',
      coordinates: ['17', '18', '19', '20'] // lot1Points に対応
    },
    {
      id: '2',
      parentNumber: 123,
      childNumber: 2,
      landCategory: '宅地',
      area: 125.50,
      address: '北海道釧路市春日町123-2',
      owner: owners[1],
      registrationDate: '2024-01-21',
      description: '整形地',
      coordinates: ['21', '22', '23', '24'] // lot2Points に対応
    },
    {
      id: '3',
      parentNumber: 124,
      childNumber: undefined,
      landCategory: '雑種地',
      area: 88.75,
      address: '北海道釧路市春日町124',
      owner: owners[2],
      registrationDate: '2024-01-22',
      description: 'L字型変形地',
      coordinates: ['25', '26', '27', '28', '29', '30'] // lot3Points に対応
    },
    {
      id: '4',
      parentNumber: 125,
      childNumber: 1,
      landCategory: '田',
      area: 225.00,
      address: '北海道釧路市春日町125-1',
      owner: owners[3],
      registrationDate: '2024-01-23',
      description: '農業用地',
      coordinates: ['31', '32', '33', '34'] // lot4Points に対応
    },
    {
      id: '5',
      parentNumber: 125,
      childNumber: 2,
      landCategory: '畑',
      area: 180.00,
      address: '北海道釧路市春日町125-2',
      owner: owners[4],
      registrationDate: '2024-01-24',
      description: '農業用地',
      coordinates: ['35', '36', '37', '38'] // lot5Points に対応
    }
  ];
};

// 整理された地権者データ生成
export const generateLandownerData = (): LandownerData[] => {
  return [
    {
      id: '1',
      name: '田中太郎',
      type: 'individual',
      address: '北海道釧路市春日町1-2-3',
      phone: '0154-23-1234',
      email: 'tanaka@example.com',
      registrationDate: '2024-01-15',
      totalLandArea: 150.25,
      landCount: 1
    },
    {
      id: '2',
      name: '佐藤花子',
      type: 'individual',
      address: '北海道釧路市若松町2-3-4',
      phone: '0154-34-2345',
      email: 'sato@example.com',
      registrationDate: '2024-01-16',
      totalLandArea: 125.50,
      landCount: 1
    },
    {
      id: '3',
      name: '山田一郎',
      type: 'individual',
      address: '北海道釧路市栄町3-4-5',
      phone: '0154-45-3456',
      email: 'yamada@example.com',
      registrationDate: '2024-01-17',
      totalLandArea: 88.75,
      landCount: 1
    },
    {
      id: '4',
      name: '鈴木美子',
      type: 'individual',
      address: '北海道釧路市緑ヶ岡4-5-6',
      phone: '0154-56-4567',
      email: 'suzuki@example.com',
      registrationDate: '2024-01-18',
      totalLandArea: 225.00,
      landCount: 1
    },
    {
      id: '5',
      name: '高橋健太',
      type: 'individual',
      address: '北海道釧路市昭和町5-6-7',
      phone: '0154-67-5678',
      email: 'takahashi@example.com',
      registrationDate: '2024-01-19',
      totalLandArea: 180.00,
      landCount: 1
    },
    {
      id: '6',
      name: '釧路農業協同組合',
      type: 'company',
      address: '北海道釧路市中央町10-1',
      phone: '0154-22-1000',
      email: 'info@kushiro-ja.co.jp',
      registrationDate: '2024-01-10',
      totalLandArea: 1250.00,
      landCount: 8
    }
  ];
};

// 地番表示フォーマット関数
export const formatLotNumber = (parentNumber: number, childNumber?: number) => {
  return childNumber ? `${parentNumber}-${childNumber}` : `${parentNumber}`;
};