// 市町村取得サービス
// 国土交通省の市町村取得APIを使用

interface Municipality {
  id: string;  // 市町村コード
  name: string; // 市町村名
}

interface Prefecture {
  code: string;
  name: string;
}

interface APIResponse {
  status: string;
  data: Municipality[];
}

// 都道府県コードマップ（JIS X 0401準拠）
export const PREFECTURES: Prefecture[] = [
  { code: '01', name: '北海道' },
  { code: '02', name: '青森県' },
  { code: '03', name: '岩手県' },
  { code: '04', name: '宮城県' },
  { code: '05', name: '秋田県' },
  { code: '06', name: '山形県' },
  { code: '07', name: '福島県' },
  { code: '08', name: '茨城県' },
  { code: '09', name: '栃木県' },
  { code: '10', name: '群馬県' },
  { code: '11', name: '埼玉県' },
  { code: '12', name: '千葉県' },
  { code: '13', name: '東京都' },
  { code: '14', name: '神奈川県' },
  { code: '15', name: '新潟県' },
  { code: '16', name: '富山県' },
  { code: '17', name: '石川県' },
  { code: '18', name: '福井県' },
  { code: '19', name: '山梨県' },
  { code: '20', name: '長野県' },
  { code: '21', name: '岐阜県' },
  { code: '22', name: '静岡県' },
  { code: '23', name: '愛知県' },
  { code: '24', name: '三重県' },
  { code: '25', name: '滋賀県' },
  { code: '26', name: '京都府' },
  { code: '27', name: '大阪府' },
  { code: '28', name: '兵庫県' },
  { code: '29', name: '奈良県' },
  { code: '30', name: '和歌山県' },
  { code: '31', name: '鳥取県' },
  { code: '32', name: '島根県' },
  { code: '33', name: '岡山県' },
  { code: '34', name: '広島県' },
  { code: '35', name: '山口県' },
  { code: '36', name: '徳島県' },
  { code: '37', name: '香川県' },
  { code: '38', name: '愛媛県' },
  { code: '39', name: '高知県' },
  { code: '40', name: '福岡県' },
  { code: '41', name: '佐賀県' },
  { code: '42', name: '長崎県' },
  { code: '43', name: '熊本県' },
  { code: '44', name: '大分県' },
  { code: '45', name: '宮崎県' },
  { code: '46', name: '鹿児島県' },
  { code: '47', name: '沖縄県' }
];

// 都道府県名からコードを取得
export const getPrefectureCode = (prefectureName: string): string | null => {
  const prefecture = PREFECTURES.find(p => p.name === prefectureName);
  return prefecture ? prefecture.code : null;
};

// 都道府県の市町村を取得
export const getMunicipalities = async (prefectureCode: string): Promise<Municipality[]> => {
  try {
    // 総務省統計局のAPIを使用（CORS対応）
    const apiUrl = `https://www.e-stat.go.jp/api/1.0/json/getStdRegion?appId=DEMO&lang=J&prefecture=${prefectureCode}&addArea=01000`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.GET_STATS_DATA?.STATISTICAL_DATA?.CLASS_INF?.CLASS_OBJ) {
      const areas = data.GET_STATS_DATA.STATISTICAL_DATA.CLASS_INF.CLASS_OBJ;
      const municipalities: Municipality[] = [];
      
      if (Array.isArray(areas)) {
        areas.forEach((area: any) => {
          if (area['@level'] === '3') { // 市区町村レベル
            municipalities.push({
              id: area['@code'],
              name: area['@name']
            });
          }
        });
      }
      
      return municipalities;
    } else {
      throw new Error('Unexpected API response structure');
    }
  } catch (error) {
    console.error('市町村取得エラー:', error);
    console.log('フォールバックデータを使用します');
    
    // フォールバック: 主要市町村のサンプルデータを返す
    return getFallbackMunicipalities(prefectureCode);
  }
};

// フォールバック用の主要市町村データ
const getFallbackMunicipalities = (prefectureCode: string): Municipality[] => {
  const fallbackData: { [key: string]: Municipality[] } = {
    '13': [ // 東京都
      { id: '13101', name: '千代田区' },
      { id: '13102', name: '中央区' },
      { id: '13103', name: '港区' },
      { id: '13104', name: '新宿区' },
      { id: '13105', name: '文京区' },
      { id: '13106', name: '台東区' },
      { id: '13107', name: '墨田区' },
      { id: '13108', name: '江東区' },
      { id: '13109', name: '品川区' },
      { id: '13110', name: '目黒区' },
      { id: '13111', name: '大田区' },
      { id: '13112', name: '世田谷区' },
      { id: '13113', name: '渋谷区' },
      { id: '13114', name: '中野区' },
      { id: '13115', name: '杉並区' },
      { id: '13116', name: '豊島区' },
      { id: '13117', name: '北区' },
      { id: '13118', name: '荒川区' },
      { id: '13119', name: '板橋区' },
      { id: '13120', name: '練馬区' },
      { id: '13121', name: '足立区' },
      { id: '13122', name: '葛飾区' },
      { id: '13123', name: '江戸川区' },
      { id: '13201', name: '八王子市' },
      { id: '13202', name: '立川市' },
      { id: '13203', name: '武蔵野市' },
      { id: '13204', name: '三鷹市' },
      { id: '13205', name: '青梅市' },
      { id: '13206', name: '府中市' },
      { id: '13207', name: '昭島市' },
      { id: '13208', name: '調布市' },
      { id: '13209', name: '町田市' },
      { id: '13210', name: '小金井市' }
    ],
    '14': [ // 神奈川県
      { id: '14100', name: '横浜市' },
      { id: '14130', name: '川崎市' },
      { id: '14150', name: '相模原市' },
      { id: '14201', name: '横須賀市' },
      { id: '14203', name: '平塚市' },
      { id: '14204', name: '鎌倉市' },
      { id: '14205', name: '藤沢市' },
      { id: '14206', name: '小田原市' },
      { id: '14207', name: '茅ヶ崎市' },
      { id: '14208', name: '逗子市' }
    ],
    '27': [ // 大阪府
      { id: '27100', name: '大阪市' },
      { id: '27140', name: '堺市' },
      { id: '27202', name: '岸和田市' },
      { id: '27203', name: '豊中市' },
      { id: '27204', name: '池田市' },
      { id: '27205', name: '吹田市' },
      { id: '27206', name: '泉大津市' },
      { id: '27207', name: '高槻市' },
      { id: '27208', name: '貝塚市' },
      { id: '27209', name: '守口市' }
    ]
  };
  
  return fallbackData[prefectureCode] || [];
};

// 都道府県名の配列を取得（Select用）
export const getPrefectureNames = (): string[] => {
  return PREFECTURES.map(p => p.name);
};

// 市町村名の配列を取得（Select用）
export const getMunicipalityNames = async (prefectureName: string): Promise<string[]> => {
  const prefectureCode = getPrefectureCode(prefectureName);
  if (!prefectureCode) return [];
  
  const municipalities = await getMunicipalities(prefectureCode);
  return municipalities.map(m => m.name);
};