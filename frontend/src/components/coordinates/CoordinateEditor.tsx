import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Tabs,
  ActionIcon,
  Table,
  Badge,
  TextInput,
  Select,
  ScrollArea,
  MultiSelect,
  Checkbox,
  Modal,
  FileInput,
  Progress
} from '@mantine/core';
import {
  IconArrowLeft,
  IconMapPins,
  IconMap2,
  IconPlus,
  IconSearch,
  IconFilter,
  IconFilterOff,
  IconUsers,
  IconTrash,
  IconDownload,
  IconUpload,
  IconX,
  IconRefresh
} from '@tabler/icons-react';
import type { Project } from '../../types/project';
import { CoordinateLotViewer } from '../viewer/CoordinateLotViewer';
import { 
  generateLotData, 
  generateLandownerData,
  generateSimpleCoordinateData,
  formatLotNumber,
  getDefaultStakeTypes,
  getDefaultInstallationCategories,
  type CoordinatePoint as MockCoordinatePoint,
  type LotData as MockLotData,
  type LandownerData as MockLandownerData
} from '../../utils/mockDataGenerator';
import { surveyPointService, type SurveyPoint } from '../../services/surveyPointService';
import SurveyPointService from '../../services/surveyPointService';
import { landParcelService, type LandParcel } from '../../services/landParcelService';

interface CoordinateEditorProps {
  project: Project;
  onClose: () => void;
  initialTab?: 'coordinates' | 'lots';
}

export const CoordinateEditor: React.FC<CoordinateEditorProps> = ({
  project,
  onClose,
  initialTab = 'coordinates'
}) => {
  console.log('CoordinateEditor loaded with project:', project?.name, 'initialTab:', initialTab);
  const [activeTab, setActiveTab] = useState<string | null>(initialTab);

  // API データ管理
  const [surveyPoints, setSurveyPoints] = useState<SurveyPoint[]>([]);
  const [landParcels, setLandParcels] = useState<LandParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 座標データ管理（削除：モックデータは使用しない）
  const [lotData, setLotData] = useState(() => generateLotData());
  const [landownerData, setLandownerData] = useState(() => generateLandownerData());

  
  // 座標選択状態管理
  const [selectedCoordinates, setSelectedCoordinates] = useState<Set<string>>(new Set());
  const [showSIMModal, setShowSIMModal] = useState(false);
  const [simAction, setSIMAction] = useState<'read' | 'write'>('read');
  
  // SIM読込進捗状態管理
  const [simLoading, setSIMLoading] = useState(false);
  const [simProgress, setSIMProgress] = useState(0);
  const [simProgressMessage, setSIMProgressMessage] = useState('');
  
  // インライン編集状態管理
  const [editingCoordId, setEditingCoordId] = useState<string | null>(null);
  const [editingCoordField, setEditingCoordField] = useState<string | null>(null);
  const [editingCoordValue, setEditingCoordValue] = useState<string>('');
  
  // フィルター状態管理（複数選択対応）
  const [filters, setFilters] = useState({
    search: '',
    type: [] as string[],
    assignee: [] as string[],
    status: [] as string[]
  });
  
  // データロード処理
  useEffect(() => {
    const loadData = async () => {
      if (!project?.id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔄 データロード開始:', { projectId: project.id });
        
        // 座標点データと地番データを並行して取得
        const [surveyPointsResponse, landParcelsResponse] = await Promise.all([
          surveyPointService.getAllSurveyPointsByProject(project.id),
          landParcelService.getLandParcelsByProject(project.id)
        ]);
        
        console.log('🔍 APIレスポンス詳細:', {
          surveyPoints: surveyPointsResponse.slice(0, 2), // 最初の2件だけログ出力
          surveyPointsCount: surveyPointsResponse.length,
          landParcelsCount: landParcelsResponse.length
        });
        
        setSurveyPoints(surveyPointsResponse);
        setLandParcels(landParcelsResponse);
        
        console.log('✅ データロード完了:', {
          surveyPoints: surveyPointsResponse.length,
          landParcels: landParcelsResponse.length
        });
      } catch (err) {
        console.error('❌ データロードエラー:', err);
        const errorMessage = err instanceof Error ? err.message : 'データの読み込みに失敗しました';
        setError(errorMessage);
        // エラー時はモックデータを使用
        console.log('フォールバック: モックデータを使用します');
        
        // ユーザーへの通知（将来的にはトーストなどで）
        if (process.env.NODE_ENV === 'development') {
          console.warn(`API接続エラー: ${errorMessage}. モックデータで続行します。`);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [project?.id]);

  // 手動データ再読み込み関数
  const reloadData = useCallback(async () => {
    console.log('🔄 手動データ再読み込み開始');
    if (!project?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [surveyPointsResponse, landParcelsResponse] = await Promise.all([
        surveyPointService.getAllSurveyPointsByProject(project.id),
        landParcelService.getLandParcelsByProject(project.id)
      ]);
      
      setSurveyPoints(surveyPointsResponse);
      setLandParcels(landParcelsResponse);
      
      console.log('✅ 手動データ再読み込み完了:', {
        surveyPoints: surveyPointsResponse.length,
        landParcels: landParcelsResponse.length
      });
    } catch (err) {
      console.error('❌ 手動データ再読み込みエラー:', err);
      setError(err instanceof Error ? err.message : 'データの再読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  // 種類ラベルの正規化関数
  const getTypeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case 'benchmark': return '基準点';
      case 'control_point': return '制御点';
      case 'boundary_point': return '境界点';
      case 'control': return '制御点';  // 短縮形も対応
      case 'boundary': return '境界点'; // 短縮形も対応
      case '制御点': return '制御点';    // 既に日本語の場合
      case '境界点': return '境界点';    // 既に日本語の場合
      case '基準点': return '基準点';    // 既に日本語の場合
      default: return type;
    }
  };

  // 日本語ラベルから英語APIキーへの逆変換関数
  const getTypeApiKey = (label: string) => {
    switch (label) {
      case '基準点': return 'benchmark';
      case '制御点': return 'control_point';
      case '境界点': return 'boundary_point';
      default: return label.toLowerCase(); // フォールバック
    }
  };

  // SurveyPoint から MockCoordinatePoint への変換
  const convertSurveyPointToCoordinatePoint = (surveyPoint: SurveyPoint): MockCoordinatePoint => {
    console.log('🔧 座標変換中:', {
      pointNumber: surveyPoint.pointNumber,
      x: surveyPoint.x,
      y: surveyPoint.y,
      elevation: surveyPoint.elevation
    });
    
    const result = {
      id: surveyPoint.id,
      pointName: surveyPoint.pointNumber,
      type: getTypeLabel(surveyPoint.pointType), // 既存データを日本語に正規化
      x: surveyPoint.x,
      y: surveyPoint.y,
      z: surveyPoint.elevation || 0,
      description: surveyPoint.remarks || '',
      surveyDate: surveyPoint.measureDate || new Date().toISOString().split('T')[0],
      assignee: surveyPoint.surveyorName || '未割当',
      status: '測量済み', // デフォルトステータス
      stakeType: surveyPoint.stakeType,
      installationCategory: surveyPoint.installationCategory
    };
    
    console.log('✅ 変換結果:', result);
    return result;
  };

  // 実際に使用するデータ（APIデータのみ）
  const actualCoordinateData = useMemo(() => {
    console.log('🔍 actualCoordinateData計算中:', {
      loading,
      surveyPointsLength: surveyPoints.length,
      firstSurveyPoint: surveyPoints[0]
    });
    
    if (loading) {
      console.log('⏳ ローディング中のため空配列を返す');
      return [];
    }
    
    console.log('✅ APIデータを使用:', surveyPoints.length, '件');
    const converted = surveyPoints.map(convertSurveyPointToCoordinatePoint);
    console.log('🔧 変換後の最初のデータ:', converted[0]);
    return converted;
  }, [loading, surveyPoints]);

  // バッジの色を取得する関数
  const getTypeBadgeColor = (type: string) => {
    const normalizedType = getTypeLabel(type); // 既存データ互換性のため正規化
    switch (normalizedType) {
      case '基準点': return 'blue';
      case '制御点': return 'green';
      case '境界点': return 'orange';
      default: return 'gray';
    }
  };
  
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case '未測量': return 'gray';
      case '測量中': return 'yellow';
      case '測量済み': return 'blue';
      case '検査済み': return 'green';
      case '要再測量': return 'red';
      default: return 'gray';
    }
  };
  
  // フィルター適用関数（複数選択対応）
  const filteredCoordinateData = useMemo(() => {
    return actualCoordinateData.filter(coord => {
      const searchMatch = !filters.search || 
        coord.pointName.toLowerCase().includes(filters.search.toLowerCase()) ||
        coord.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        coord.assignee?.toLowerCase().includes(filters.search.toLowerCase());
      
      const typeMatch = filters.type.length === 0 || filters.type.includes(coord.type);
      const assigneeMatch = filters.assignee.length === 0 || filters.assignee.includes(coord.assignee);
      const statusMatch = filters.status.length === 0 || filters.status.includes(coord.status);
      
      return searchMatch && typeMatch && assigneeMatch && statusMatch;
    });
  }, [actualCoordinateData, filters]);
  
  // フィルターリセット関数
  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      type: [],
      assignee: [],
      status: []
    });
  }, []);
  
  // アクティブフィルター数（複数選択対応）
  const activeFilterCount = [
    filters.search,
    ...filters.type,
    ...filters.assignee,
    ...filters.status
  ].filter(Boolean).length;
  
  // ユニークな値を取得する関数
  const getUniqueAssignees = () => {
    const assignees = [...new Set(actualCoordinateData.map(coord => coord.assignee).filter(Boolean))];
    return assignees.sort();
  };
  
  const getUniqueStatuses = () => {
    const statuses = [...new Set(actualCoordinateData.map(coord => coord.status).filter(Boolean))];
    return statuses.sort();
  };
  
  // 座標選択関数
  const handleCoordinateCheck = (coordinateId: string, checked: boolean) => {
    setSelectedCoordinates(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(coordinateId);
      } else {
        newSet.delete(coordinateId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCoordinates(new Set(filteredCoordinateData.map(coord => coord.id)));
    } else {
      setSelectedCoordinates(new Set());
    }
  };

  const handleBulkDelete = useCallback(async () => {
    if (!project?.id || selectedCoordinates.size === 0) return;

    const confirmDelete = window.confirm(
      `選択した${selectedCoordinates.size}個の座標点を削除します。この操作は取り消せません。続行しますか？`
    );
    
    if (!confirmDelete) return;

    try {
      if (surveyPoints.length > 0) {
        // API 経由で削除
        const deletePromises = Array.from(selectedCoordinates).map(coordinateId =>
          surveyPointService.deleteSurveyPoint(coordinateId)
        );
        
        await Promise.allSettled(deletePromises);
        
        // データを再読み込みして最新状態を取得
        const updatedSurveyPoints = await surveyPointService.getAllSurveyPointsByProject(project.id!);
        setSurveyPoints(updatedSurveyPoints);
      } else {
        // APIデータがない場合は何もしない
        console.log('APIデータがないため削除処理をスキップします');
      }
      
      setSelectedCoordinates(new Set());
      console.log(`✅ ${selectedCoordinates.size}件の座標点を削除しました`);
    } catch (error) {
      console.error('一括削除エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '座標の削除に失敗しました';
      setError(errorMessage);
    }
  }, [project?.id, selectedCoordinates, surveyPoints.length]);

  // 新規座標点追加関数
  const handleAddCoordinate = useCallback(async () => {
    if (!project?.id) return;

    try {
      if (surveyPoints.length > 0) {
        // API経由で新規座標点を作成
        const newSurveyPoint = {
          pointNumber: `新規点-${Date.now()}`,
          pointType: 'boundary_point',
          x: 0,
          y: 0,
          elevation: 0,
          measureDate: new Date().toISOString().split('T')[0],
          surveyorName: '未割当',
          remarks: '新規追加座標点',
          stakeType: '',
          installationCategory: '',
          projectId: project.id
        };

        const createdSurveyPoint = await surveyPointService.createSurveyPoint(
          newSurveyPoint
        );
        
        // ローカル状態に追加
        setSurveyPoints(prev => [...prev, createdSurveyPoint]);
        console.log('✅ 新規座標点を追加しました:', createdSurveyPoint.pointNumber);
      } else {
        // APIデータがない場合は何もしない
        console.log('APIデータがないため座標点追加をスキップします');
      }
    } catch (error) {
      console.error('座標点追加エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '座標点の追加に失敗しました';
      setError(errorMessage);
    }
  }, [project?.id, surveyPoints.length]);

  // 座標インライン編集関数
  const startCoordInlineEdit = (coordId: string, field: string, currentValue: string) => {
    setEditingCoordId(coordId);
    setEditingCoordField(field);
    setEditingCoordValue(currentValue);
  };

  const saveCoordInlineEdit = useCallback(async () => {
    if (!editingCoordId || !editingCoordField || !project?.id) {
      cancelCoordInlineEdit();
      return;
    }

    try {
      // API 経由でデータを更新
      if (surveyPoints.length > 0) {
        const surveyPoint = surveyPoints.find(sp => sp.id === editingCoordId);
        if (surveyPoint) {
          let updateData: any = { ...surveyPoint };
          
          switch (editingCoordField) {
            case 'pointName':
              updateData.pointNumber = editingCoordValue;
              break;
            case 'type':
              updateData.pointType = getTypeApiKey(editingCoordValue);
              break;
            case 'x':
              updateData.x = parseFloat(editingCoordValue) || 0;
              break;
            case 'y':
              updateData.y = parseFloat(editingCoordValue) || 0;
              break;
            case 'z':
              updateData.elevation = parseFloat(editingCoordValue) || 0;
              break;
            case 'description':
              updateData.remarks = editingCoordValue;
              break;
            case 'assignee':
              updateData.surveyorName = editingCoordValue;
              break;
            case 'stakeType':
              updateData.stakeType = editingCoordValue;
              break;
            case 'installationCategory':
              updateData.installationCategory = editingCoordValue;
              break;
            case 'surveyDate':
              updateData.measureDate = editingCoordValue;
              break;
          }

          // API 呼び出し
          const updatedSurveyPoint = await surveyPointService.updateSurveyPoint(
            editingCoordId, 
            updateData
          );
          
          // ローカル状態更新
          setSurveyPoints(prev => prev.map(sp => 
            sp.id === editingCoordId ? updatedSurveyPoint : sp
          ));
          
          console.log(`✅ 座標点 ${surveyPoint.pointNumber} を更新しました`);
        }
      } else {
        // APIデータがない場合は何もしない
        console.log('APIデータがないため座標更新をスキップします');
      }
    } catch (error) {
      console.error('座標更新エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '座標の更新に失敗しました';
      setError(errorMessage);
    }
    
    cancelCoordInlineEdit();
  }, [editingCoordId, editingCoordField, editingCoordValue, project?.id, surveyPoints]);

  const cancelCoordInlineEdit = () => {
    setEditingCoordId(null);
    setEditingCoordField(null);
    setEditingCoordValue('');
  };

  // 編集可能フィールドの順序
  const editableFields = [
    'pointName', 'type', 'x', 'y', 'z', 
    'stakeType', 'installationCategory', 'assignee', 'status', 'description', 'surveyDate'
  ];

  // 次のフィールドに移動
  const moveToNextField = () => {
    if (!editingCoordId || !editingCoordField) return;
    
    const currentIndex = editableFields.indexOf(editingCoordField);
    const nextIndex = (currentIndex + 1) % editableFields.length;
    const nextField = editableFields[nextIndex];
    
    // 現在の編集を保存
    saveCoordInlineEdit();
    
    // 次のフィールドの編集を開始
    setTimeout(() => {
      const coord = actualCoordinateData.find(c => c.id === editingCoordId);
      if (coord) {
        let nextValue = '';
        switch (nextField) {
          case 'pointName':
            nextValue = coord.pointName;
            break;
          case 'type':
            nextValue = coord.type;
            break;
          case 'x':
            nextValue = coord.x.toString();
            break;
          case 'y':
            nextValue = coord.y.toString();
            break;
          case 'z':
            nextValue = coord.z.toString();
            break;
          case 'stakeType':
            nextValue = coord.stakeType || '';
            break;
          case 'installationCategory':
            nextValue = coord.installationCategory || '';
            break;
          case 'assignee':
            nextValue = coord.assignee;
            break;
          case 'status':
            nextValue = coord.status;
            break;
          case 'description':
            nextValue = coord.description || '';
            break;
          case 'surveyDate':
            nextValue = coord.surveyDate;
            break;
        }
        startCoordInlineEdit(editingCoordId, nextField, nextValue);
      }
    }, 50);
  };

  const handleCoordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveCoordInlineEdit();
    } else if (e.key === 'Escape') {
      cancelCoordInlineEdit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      moveToNextField();
    }
  };

  // Selectコンポーネント用のキーハンドラー
  const handleSelectKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      // Selectの場合は、現在の値を保存してから次に移動
      setTimeout(() => {
        moveToNextField();
      }, 10);
    } else if (e.key === 'Escape') {
      cancelCoordInlineEdit();
    }
  };

  // SIM読込・書込関数
  const handleSIMRead = () => {
    setSIMAction('read');
    setShowSIMModal(true);
  };

  const handleSIMWrite = () => {
    setSIMAction('write');
    setShowSIMModal(true);
  };

  const handleSIMProcess = async (file: File | null) => {
    if (!file && simAction !== 'write') return;
    if (!project?.id) return;

    if (simAction === 'read') {
      // SIM読込処理
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          setSIMLoading(true);
          setSIMProgress(0);
          setSIMProgressMessage('SIMファイルを解析中...');
          
          const content = e.target?.result as string;
          console.log('🔍 SIM読込開始');
          const simData = parseSIMFile(content);
          console.log('🔧 解析結果:', simData);
          
          setSIMProgress(10);
          
          if (simData.length === 0) {
            alert('SIMファイルから座標データが見つかりませんでした。ファイル形式を確認してください。');
            return;
          }
          
          setSIMProgressMessage(`${simData.length}件の座標データをデータベースに保存中...`);
          
          // API経由でSurveyPointを作成
          const createdPoints: SurveyPoint[] = [];
          const totalPoints = simData.length;
          
          for (let i = 0; i < simData.length; i++) {
            const coord = simData[i];
            const newSurveyPoint = {
              pointNumber: coord.pointName || `SIM-${String(i + 1).padStart(3, '0')}`,
              pointType: 'boundary_point',
              x: parseFloat(coord.x.toFixed(3)),
              y: parseFloat(coord.y.toFixed(3)),
              elevation: parseFloat(coord.z.toFixed(3)),
              measureDate: new Date().toISOString().split('T')[0],
              surveyorName: '未割当',
              remarks: `SIM読込座標点${i + 1}`,
              stakeType: '',
              installationCategory: '',
              projectId: project.id
            };

            try {
              const createdSurveyPoint = await surveyPointService.createSurveyPoint(newSurveyPoint);
              createdPoints.push(createdSurveyPoint);
              
              // 進捗を更新 (10% は解析、90% はデータベース保存)
              const progress = 10 + (i + 1) / totalPoints * 90;
              setSIMProgress(progress);
              setSIMProgressMessage(`座標データを保存中... (${i + 1}/${totalPoints})`);
              
            } catch (error) {
              console.error(`座標点 ${newSurveyPoint.pointNumber} の作成に失敗:`, error);
            }
          }
          
          setSIMProgressMessage('画面を更新中...');
          setSIMProgress(100);
          
          // ローカル状態に追加
          setSurveyPoints(prev => [...prev, ...createdPoints]);
          
          // 少し待ってからモーダルを閉じる
          setTimeout(() => {
            alert(`${createdPoints.length}件の座標データをSIMファイルから読み込み、データベースに保存しました。`);
          }, 500);
          
        } catch (error) {
          alert('SIMファイルの読み込みに失敗しました。ファイル形式を確認してください。');
          console.error('SIM読込エラー:', error);
        } finally {
          setSIMLoading(false);
          setSIMProgress(0);
          setSIMProgressMessage('');
        }
      };
      reader.readAsText(file);
    } else {
      // SIM書込処理
      const dataToExport = actualCoordinateData;
      const simContent = generateSIMFile(dataToExport);
      const blob = new Blob([simContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `coordinates_${new Date().toISOString().split('T')[0]}.sim`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert(`${dataToExport.length}件の座標データをSIMファイルに書き出しました。`);
    }

    if (!simLoading) {
      setShowSIMModal(false);
    }
  };

  // SIMファイル解析関数
  const parseSIMFile = (content: string) => {
    const lines = content.split('\n');
    const coordinates = [];
    
    console.log('🔍 SIM解析開始:', { 総行数: lines.length });
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      console.log(`🔧 行${i + 1}を解析中:`, line.substring(0, 50) + (line.length > 50 ? '...' : ''));
      
      if (!line || line.startsWith('#') || line.startsWith('G00') || line.startsWith('Z00') || line.startsWith('A00') || line.startsWith('A99')) {
        console.log('  ⏭️ スキップ: ヘッダーまたは空行');
        continue;
      }
      
      // SIMA形式のA01行を解析: A01,番号,点名,X座標,Y座標,Z座標,
      if (line.startsWith('A01,')) {
        console.log('  📍 A01行を発見:', line);
        
        const parts = line.split(',');
        console.log('  🔧 分割結果:', parts);
        
        if (parts.length >= 6) {
          const pointNumber = parts[1]?.trim();
          const pointName = parts[2]?.trim();
          const x = parseFloat(parts[3]);
          const y = parseFloat(parts[4]);
          const z = parseFloat(parts[5]);
          
          if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            const coord = {
              pointName: pointName || `点${pointNumber}`,
              x: x,
              y: y,
              z: z
            };
            coordinates.push(coord);
            console.log('  ✅ 座標を追加:', coord);
          } else {
            console.log('  ❌ 無効な座標値:', { x, y, z });
          }
        } else {
          console.log('  ❌ 不正な形式: パーツ数が不足', parts.length);
        }
      } else {
        console.log('  ⏭️ スキップ: A01行以外');
      }
    }
    
    console.log('✅ SIM解析完了:', { 解析済み座標数: coordinates.length });
    return coordinates;
  };

  // SIMファイル生成関数
  const generateSIMFile = (data: any[]) => {
    let content = '# 座標データ SIMファイル\n';
    content += '# 点名,X座標(m),Y座標(m),標高(m)\n';
    
    for (const coord of data) {
      content += `${coord.pointName},${coord.x.toFixed(3)},${coord.y.toFixed(3)},${coord.z.toFixed(3)}\n`;
    }
    
    return content;
  };

  
  // 地目バッジ色関数
  const getLandCategoryColor = (category: string) => {
    switch (category) {
      case '宅地': return 'blue';
      case '田': return 'green';
      case '畑': return 'yellow';
      case '山林': return 'teal';
      case '雑種地': return 'gray';
      default: return 'gray';
    }
  };
  
  return (
    <div style={{ display: 'flex' }}>
      <div style={{ flex: 1, marginRight: '33.333vw' }}>
        <Container size="xl" py={20}>
          {/* ヘッダー */}
          <Paper shadow="sm" p={20} mb={30} withBorder>
            <Group justify="space-between" mb="md">
              <Group>
                <ActionIcon variant="light" onClick={onClose}>
                  <IconArrowLeft size={18} />
                </ActionIcon>
                <div>
                  <Group gap="sm" align="center">
                    <IconMapPins size={24} color="#40c057" />
                    <Title order={2}>座標・地番管理</Title>
                  </Group>
                  <Text size="sm" c="dimmed">{project.name} - 測量基準点・境界点・地番の統合管理</Text>
                </div>
              </Group>
              <Group gap="xs">
                <Button
                  variant="light"
                  size="sm"
                  onClick={reloadData}
                  leftSection={<IconRefresh size={16} />}
                  loading={loading}
                >
                  データ更新
                </Button>
                {error && (
                  <Text size="sm" c="red">
                    {error}
                  </Text>
                )}
              </Group>
            </Group>
          </Paper>

          {/* タブとタブコンテンツ */}
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="coordinates" leftSection={<IconMapPins size={16} />}>
                座標管理
              </Tabs.Tab>
              <Tabs.Tab value="lots" leftSection={<IconMap2 size={16} />}>
                地番管理
              </Tabs.Tab>
              <Tabs.Tab value="landowners" leftSection={<IconUsers size={16} />}>
                地権者管理
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="coordinates" pt="md">
              <Paper shadow="sm" p={20} withBorder>
                <Stack gap="md">
                  <div>
                    <Text size="sm" c="dimmed">測量基準点・境界点の座標データを管理します - 各項目をクリックして直接編集、Tabキーで次の列に移動できます</Text>
                    {activeFilterCount > 0 && (
                      <Text size="sm" c="orange" fw={600}>
                        {activeFilterCount}個のフィルター適用中 ({filteredCoordinateData.length}/{actualCoordinateData.length}件表示)
                      </Text>
                    )}
                  </div>
                  
                  {/* フィルターコントロール */}
                  <Paper withBorder p="md" style={{ backgroundColor: '#f8f9fa' }}>
                    <Group justify="space-between" align="flex-end">
                      <Group grow style={{ flex: 1 }}>
                        <TextInput
                          placeholder="点名、説明、担当者で検索..."
                          value={filters.search}
                          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                          leftSection={<IconSearch size={16} />}
                          style={{ minWidth: '200px' }}
                        />
                        <MultiSelect
                          placeholder="種類でフィルター（複数選択可）"
                          value={filters.type}
                          onChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
                          data={[
                            { value: '基準点', label: '基準点' },
                            { value: '制御点', label: '制御点' },
                            { value: '境界点', label: '境界点' }
                          ]}
                          clearable
                          searchable
                        />
                        <MultiSelect
                          placeholder="担当者でフィルター（複数選択可）"
                          value={filters.assignee}
                          onChange={(value) => setFilters(prev => ({ ...prev, assignee: value }))}
                          data={getUniqueAssignees().map(assignee => ({
                            value: assignee,
                            label: assignee
                          }))}
                          clearable
                          searchable
                        />
                        <MultiSelect
                          placeholder="状態でフィルター（複数選択可）"
                          value={filters.status}
                          onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                          data={getUniqueStatuses().map(status => ({
                            value: status,
                            label: status
                          }))}
                          clearable
                          searchable
                        />
                      </Group>
                      <Group gap="xs">
                        {activeFilterCount > 0 && (
                          <Button
                            variant="light"
                            color="orange"
                            size="sm"
                            onClick={resetFilters}
                            leftSection={<IconFilterOff size={16} />}
                          >
                            フィルタークリア
                          </Button>
                        )}
                        <Button
                          variant="filled"
                          color={activeFilterCount > 0 ? 'orange' : 'gray'}
                          size="sm"
                          leftSection={<IconFilter size={16} />}
                        >
                          {activeFilterCount > 0 ? `${activeFilterCount}個適用中` : 'フィルター'}
                        </Button>
                      </Group>
                    </Group>
                  </Paper>
                  
                  <ScrollArea h={400} style={{ width: '100%' }}>
                    <Table striped highlightOnHover withTableBorder stickyHeader>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th width={50}>
                            <Checkbox
                              checked={selectedCoordinates.size === filteredCoordinateData.length && filteredCoordinateData.length > 0}
                              indeterminate={selectedCoordinates.size > 0 && selectedCoordinates.size < filteredCoordinateData.length}
                              onChange={(event) => handleSelectAll(event.currentTarget.checked)}
                            />
                          </Table.Th>
                          <Table.Th>点名</Table.Th>
                          <Table.Th>種類</Table.Th>
                          <Table.Th>X座標 (m)</Table.Th>
                          <Table.Th>Y座標 (m)</Table.Th>
                          <Table.Th>標高 (m)</Table.Th>
                          <Table.Th>杭種</Table.Th>
                          <Table.Th>設置区分</Table.Th>
                          <Table.Th>担当者</Table.Th>
                          <Table.Th>状態</Table.Th>
                          <Table.Th>備考</Table.Th>
                          <Table.Th>測量日</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {filteredCoordinateData.map((coord) => (
                        <Table.Tr key={coord.id}>
                          <Table.Td>
                            <Checkbox
                              checked={selectedCoordinates.has(coord.id)}
                              onChange={(event) => handleCoordinateCheck(coord.id, event.currentTarget.checked)}
                            />
                          </Table.Td>
                          <Table.Td>
                            {editingCoordId === coord.id && editingCoordField === 'pointName' ? (
                              <TextInput
                                value={editingCoordValue}
                                onChange={(e) => setEditingCoordValue(e.target.value)}
                                onKeyDown={handleCoordKeyPress}
                                onBlur={saveCoordInlineEdit}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Text 
                                fw={600}
                                style={{ cursor: 'pointer' }}
                                onClick={() => startCoordInlineEdit(coord.id, 'pointName', coord.pointName)}
                              >
                                {coord.pointName}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingCoordId === coord.id && editingCoordField === 'type' ? (
                              <Select
                                value={editingCoordValue}
                                onChange={(value) => {
                                  setEditingCoordValue(value || '');
                                  setTimeout(saveCoordInlineEdit, 100);
                                }}
                                onKeyDown={handleSelectKeyDown}
                                data={[
                                  { value: '基準点', label: '基準点' },
                                  { value: '制御点', label: '制御点' },
                                  { value: '境界点', label: '境界点' }
                                ]}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Badge 
                                color={getTypeBadgeColor(coord.type)} 
                                variant="light"
                                style={{ cursor: 'pointer' }}
                                onClick={() => startCoordInlineEdit(coord.id, 'type', coord.type)}
                              >
                                {getTypeLabel(coord.type)}
                              </Badge>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingCoordId === coord.id && editingCoordField === 'x' ? (
                              <TextInput
                                type="number"
                                step="0.001"
                                value={editingCoordValue}
                                onChange={(e) => setEditingCoordValue(e.target.value)}
                                onKeyDown={handleCoordKeyPress}
                                onBlur={saveCoordInlineEdit}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Text 
                                size="sm"
                                style={{ cursor: 'pointer', fontFamily: 'monospace' }}
                                onClick={() => startCoordInlineEdit(coord.id, 'x', coord.x.toString())}
                              >
                                {coord.x.toFixed(3)}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingCoordId === coord.id && editingCoordField === 'y' ? (
                              <TextInput
                                type="number"
                                step="0.001"
                                value={editingCoordValue}
                                onChange={(e) => setEditingCoordValue(e.target.value)}
                                onKeyDown={handleCoordKeyPress}
                                onBlur={saveCoordInlineEdit}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Text 
                                size="sm"
                                style={{ cursor: 'pointer', fontFamily: 'monospace' }}
                                onClick={() => startCoordInlineEdit(coord.id, 'y', coord.y.toString())}
                              >
                                {coord.y.toFixed(3)}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingCoordId === coord.id && editingCoordField === 'z' ? (
                              <TextInput
                                type="number"
                                step="0.001"
                                value={editingCoordValue}
                                onChange={(e) => setEditingCoordValue(e.target.value)}
                                onKeyDown={handleCoordKeyPress}
                                onBlur={saveCoordInlineEdit}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Text 
                                size="sm"
                                style={{ cursor: 'pointer', fontFamily: 'monospace' }}
                                onClick={() => startCoordInlineEdit(coord.id, 'z', coord.z.toString())}
                              >
                                {coord.z.toFixed(3)}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingCoordId === coord.id && editingCoordField === 'stakeType' ? (
                              <Select
                                value={editingCoordValue}
                                onChange={(value) => {
                                  setEditingCoordValue(value || '');
                                  setTimeout(saveCoordInlineEdit, 100);
                                }}
                                onKeyDown={handleSelectKeyDown}
                                data={getDefaultStakeTypes()}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Text 
                                size="sm"
                                style={{ cursor: 'pointer' }}
                                onClick={() => startCoordInlineEdit(coord.id, 'stakeType', coord.stakeType || '')}
                              >
                                {coord.stakeType || '-'}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingCoordId === coord.id && editingCoordField === 'installationCategory' ? (
                              <Select
                                value={editingCoordValue}
                                onChange={(value) => {
                                  setEditingCoordValue(value || '');
                                  setTimeout(saveCoordInlineEdit, 100);
                                }}
                                onKeyDown={handleSelectKeyDown}
                                data={getDefaultInstallationCategories()}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Text 
                                size="sm"
                                style={{ cursor: 'pointer' }}
                                onClick={() => startCoordInlineEdit(coord.id, 'installationCategory', coord.installationCategory || '')}
                              >
                                {coord.installationCategory || '-'}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingCoordId === coord.id && editingCoordField === 'assignee' ? (
                              <Select
                                value={editingCoordValue}
                                onChange={(value) => {
                                  setEditingCoordValue(value || '');
                                  setTimeout(saveCoordInlineEdit, 100);
                                }}
                                onKeyDown={handleSelectKeyDown}
                                data={getUniqueAssignees()}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Text 
                                size="sm" 
                                c={coord.assignee === '未割当' ? 'dimmed' : undefined}
                                style={{ cursor: 'pointer' }}
                                onClick={() => startCoordInlineEdit(coord.id, 'assignee', coord.assignee)}
                              >
                                {coord.assignee}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingCoordId === coord.id && editingCoordField === 'status' ? (
                              <Select
                                value={editingCoordValue}
                                onChange={(value) => {
                                  setEditingCoordValue(value || '');
                                  setTimeout(saveCoordInlineEdit, 100);
                                }}
                                onKeyDown={handleSelectKeyDown}
                                data={getUniqueStatuses()}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Badge 
                                color={getStatusBadgeColor(coord.status)} 
                                variant="light" 
                                size="sm"
                                style={{ cursor: 'pointer' }}
                                onClick={() => startCoordInlineEdit(coord.id, 'status', coord.status)}
                              >
                                {coord.status}
                              </Badge>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingCoordId === coord.id && editingCoordField === 'description' ? (
                              <TextInput
                                value={editingCoordValue}
                                onChange={(e) => setEditingCoordValue(e.target.value)}
                                onKeyDown={handleCoordKeyPress}
                                onBlur={saveCoordInlineEdit}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Text 
                                size="sm"
                                c="dimmed"
                                style={{ cursor: 'pointer' }}
                                onClick={() => startCoordInlineEdit(coord.id, 'description', coord.description || '')}
                              >
                                {coord.description || '-'}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingCoordId === coord.id && editingCoordField === 'surveyDate' ? (
                              <TextInput
                                type="date"
                                value={editingCoordValue}
                                onChange={(e) => setEditingCoordValue(e.target.value)}
                                onKeyDown={handleCoordKeyPress}
                                onBlur={saveCoordInlineEdit}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Text 
                                size="sm"
                                style={{ cursor: 'pointer' }}
                                onClick={() => startCoordInlineEdit(coord.id, 'surveyDate', coord.surveyDate)}
                              >
                                {coord.surveyDate}
                              </Text>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                  
                  <Group justify="space-between" align="center">
                    <div>
                      <Text size="sm" c="dimmed">
                        {activeFilterCount > 0 
                          ? `${filteredCoordinateData.length}/${actualCoordinateData.length} 件の座標データを表示中` 
                          : `${actualCoordinateData.length} 件の座標データが登録されています`
                        }
                      </Text>
                      {selectedCoordinates.size > 0 && (
                        <Text size="sm" c="blue" fw={600}>
                          {selectedCoordinates.size} 件選択中
                        </Text>
                      )}
                    </div>
                    <Group>
                      {selectedCoordinates.size > 0 && (
                        <Button 
                          leftSection={<IconTrash size={16} />} 
                          size="sm"
                          color="red"
                          variant="light"
                          onClick={handleBulkDelete}
                        >
                          選択した座標を削除 ({selectedCoordinates.size})
                        </Button>
                      )}
                      <Button 
                        leftSection={<IconDownload size={16} />} 
                        size="sm"
                        variant="light"
                        color="blue"
                        onClick={handleSIMRead}
                      >
                        SIM読込
                      </Button>
                      <Button 
                        leftSection={<IconUpload size={16} />} 
                        size="sm"
                        variant="light"
                        color="green"
                        onClick={handleSIMWrite}
                      >
                        SIM書込
                      </Button>
                      <Button 
                        leftSection={<IconPlus size={16} />} 
                        size="sm"
                        onClick={handleAddCoordinate}
                      >
                        座標点追加
                      </Button>
                    </Group>
                  </Group>
                </Stack>
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="lots" pt="md">
              <Paper shadow="sm" p={20} withBorder>
                <Stack gap="md">
                  <div>
                    <Text size="sm" c="dimmed">土地の地番・地目・面積データを管理します（座標依存）</Text>
                  </div>
                  
                  <ScrollArea h={400} style={{ width: '100%' }}>
                    <Table striped highlightOnHover withTableBorder stickyHeader>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>地番</Table.Th>
                          <Table.Th>地目</Table.Th>
                          <Table.Th>面積 (㎡)</Table.Th>
                          <Table.Th>構成点数</Table.Th>
                          <Table.Th>所在地</Table.Th>
                          <Table.Th>所有者</Table.Th>
                          <Table.Th>登記日</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {lotData.map((lot) => (
                          <Table.Tr key={lot.id}>
                            <Table.Td>
                              <div>
                                <Text fw={600}>{formatLotNumber(lot.parentNumber, lot.childNumber)}</Text>
                                {lot.description && (
                                  <Text size="xs" c="dimmed">{lot.description}</Text>
                                )}
                              </div>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={getLandCategoryColor(lot.landCategory)} variant="light">
                                {lot.landCategory}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" style={{ fontFamily: 'monospace' }}>
                                {lot.area.toFixed(2)}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge variant="outline" size="sm">
                                {lot.coordinates.length}点
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{lot.address}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{lot.owner}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{lot.registrationDate}</Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                  
                  <Group justify="space-between" align="center">
                    <Text size="sm" c="dimmed">
                      {lotData.length} 件の地番データが登録されています
                    </Text>
                    <Button leftSection={<IconPlus size={16} />} size="sm">
                      地番追加
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="landowners" pt="md">
              <Paper shadow="sm" p={20} withBorder>
                <Stack gap="md">
                  <div>
                    <Text size="sm" c="dimmed">地権者・土地所有者の情報を管理します</Text>
                  </div>
                  
                  <ScrollArea h={400} style={{ width: '100%' }}>
                    <Table striped highlightOnHover withTableBorder stickyHeader>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>氏名・法人名</Table.Th>
                          <Table.Th>種別</Table.Th>
                          <Table.Th>住所</Table.Th>
                          <Table.Th>電話番号</Table.Th>
                          <Table.Th>メールアドレス</Table.Th>
                          <Table.Th>所有地数</Table.Th>
                          <Table.Th>総面積 (㎡)</Table.Th>
                          <Table.Th>登録日</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {landownerData.map((landowner) => (
                          <Table.Tr key={landowner.id}>
                            <Table.Td>
                              <Text fw={600}>{landowner.name}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={landowner.type === 'company' ? 'blue' : 'green'} variant="light">
                                {landowner.type === 'company' ? '法人' : '個人'}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{landowner.address}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" style={{ fontFamily: 'monospace' }}>
                                {landowner.phone}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" style={{ fontFamily: 'monospace' }}>
                                {landowner.email}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge variant="outline" size="sm">
                                {landowner.landCount}件
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" style={{ fontFamily: 'monospace' }}>
                                {landowner.totalLandArea.toFixed(2)}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{landowner.registrationDate}</Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                  
                  <Group justify="space-between" align="center">
                    <Text size="sm" c="dimmed">
                      {landownerData.length} 件の地権者データが登録されています
                    </Text>
                    <Button leftSection={<IconPlus size={16} />} size="sm">
                      地権者追加
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            </Tabs.Panel>
          </Tabs>
        </Container>
      </div>
      {/* 右側のビューワー */}
      <CoordinateLotViewer 
        project={project}
        coordinates={actualCoordinateData.map(coord => ({
          id: coord.id,
          pointName: coord.pointName,
          x: coord.x,
          y: coord.y,
          z: coord.z,
          type: coord.type as '基準点' | '制御点' | '境界点',
          visible: true
        }))}
        lots={lotData.map(lot => ({
          id: lot.id,
          lotNumber: formatLotNumber(lot.parentNumber, lot.childNumber),
          landCategory: lot.landCategory,
          area: lot.area,
          coordinates: lot.coordinates,
          visible: true
        }))}
        onCoordinateClick={(coord) => {
          console.log('座標点クリック:', coord.pointName);
        }}
        onLotClick={(lot) => {
          console.log('地番クリック:', lot.lotNumber);
        }}
      />

      {/* SIM読込・書込モーダル */}
      {showSIMModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '50px'
          }}
          onClick={() => setShowSIMModal(false)}
        >
          <Paper
            shadow="xl"
            p="xl"
            style={{
              width: '500px',
              maxWidth: '90vw',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Group justify="space-between" mb="md">
              <Title order={3}>
                {simAction === 'read' ? 'SIM読込' : 'SIM書込'}
              </Title>
              <ActionIcon
                variant="subtle"
                onClick={() => {
                  if (!simLoading) {
                    setShowSIMModal(false);
                  }
                }}
                disabled={simLoading}
              >
                <IconX size={18} />
              </ActionIcon>
            </Group>
            
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                {simAction === 'read' 
                  ? 'SIMファイルから座標データを読み込みます。ファイルを選択してください。'
                  : '現在の座標データをSIMファイル形式で書き出します。'
                }
              </Text>
              
              {simAction === 'read' && (
                <>
                  <FileInput
                    label="SIMファイル"
                    placeholder="ファイルを選択..."
                    accept=".sim,.txt"
                    onChange={handleSIMProcess}
                    disabled={simLoading}
                  />
                  
                  {simLoading && (
                    <Stack gap="sm">
                      <Text size="sm" fw={600} c="blue">
                        {simProgressMessage}
                      </Text>
                      <Progress 
                        value={simProgress} 
                        size="lg" 
                        color="blue" 
                        striped 
                        animated
                      />
                      <Text size="xs" c="dimmed" ta="center">
                        {Math.round(simProgress)}% 完了
                      </Text>
                    </Stack>
                  )}
                </>
              )}
              
              {simAction === 'write' && (
                <Group justify="flex-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowSIMModal(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={() => handleSIMProcess(null)}
                    leftSection={<IconDownload size={16} />}
                  >
                    SIMファイル書き出し
                  </Button>
                </Group>
              )}
            </Stack>
          </Paper>
        </div>
      )}
    </div>
  );
};