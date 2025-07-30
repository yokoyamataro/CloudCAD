import React, { useState, useCallback } from 'react';
import { Button, Group, Stack, Text, Alert, Progress, FileButton } from '@mantine/core';
import { useDrawingStore } from '../drawing/DrawingStore';
import { P21Parser } from './P21Parser';
import { SXFConverter, SXFConversionOptions } from './SXFConverter';
import type { P21ParseResult, SXFFile } from '../../types/sxf';

interface SXFLoaderProps {
  onLoadComplete?: (success: boolean, message: string) => void;
  conversionOptions?: SXFConversionOptions;
}

interface LoadState {
  isLoading: boolean;
  progress: number;
  currentStep: string;
  error?: string;
  success?: boolean;
}

export const SXFLoader: React.FC<SXFLoaderProps> = ({
  onLoadComplete,
  conversionOptions = {}
}) => {
  const { addElement } = useDrawingStore();
  const [loadState, setLoadState] = useState<LoadState>({
    isLoading: false,
    progress: 0,
    currentStep: ''
  });
  const [file, setFile] = useState<File | null>(null);

  // ファイル読み込み処理
  const handleFileLoad = useCallback(async (selectedFile: File) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoadState({
      isLoading: true,
      progress: 0,
      currentStep: 'ファイル読み込み中...'
    });

    try {
      // ファイル内容を読み込み
      const fileContent = await readFileAsText(selectedFile);
      setLoadState(prev => ({ ...prev, progress: 20, currentStep: 'P21解析中...' }));

      // P21パーサーでSXFファイルを解析
      const parser = new P21Parser({
        encoding: 'utf-8',
        strictMode: false, // 地籍調査データは多様なフォーマットがあるため
        ignoreErrors: true
      });

      const parseResult: P21ParseResult = await parser.parseFile(fileContent);
      setLoadState(prev => ({ ...prev, progress: 50, currentStep: 'SXF変換中...' }));

      if (!parseResult.success || !parseResult.data) {
        throw new Error(`P21解析に失敗しました: ${parseResult.errors.join(', ')}`);
      }

      // SXFコンバーターで描画要素に変換
      const converter = new SXFConverter({
        scale: 0.1, // mm単位からWebGL単位への変換
        flipY: true,
        ...conversionOptions
      });

      const conversionResult = await converter.convertSXFFile(parseResult.data);
      setLoadState(prev => ({ ...prev, progress: 80, currentStep: '描画要素追加中...' }));

      if (!conversionResult.success) {
        throw new Error(`SXF変換に失敗しました: ${conversionResult.errors.join(', ')}`);
      }

      // 描画ストアに要素を追加
      conversionResult.elements.forEach(element => {
        addElement(element);
      });

      // 完了
      setLoadState({
        isLoading: false,
        progress: 100,
        currentStep: '完了',
        success: true
      });

      const message = `SXFファイルを正常に読み込みました。
        - 総要素数: ${conversionResult.statistics.totalElements}
        - 変換済み: ${conversionResult.statistics.convertedElements}
        - スキップ: ${conversionResult.statistics.skippedElements}
        ${conversionResult.warnings.length > 0 ? `\n警告: ${conversionResult.warnings.length}件` : ''}`;

      onLoadComplete?.(true, message);

    } catch (error) {
      setLoadState({
        isLoading: false,
        progress: 0,
        currentStep: '',
        error: error.message
      });

      onLoadComplete?.(false, error.message);
    }
  }, [addElement, conversionOptions, onLoadComplete]);

  // ファイルをテキストとして読み込み
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error('ファイル読み込みエラー'));
      reader.readAsText(file, 'utf-8');
    });
  };

  // サンプルSXFファイルの作成（テスト用）
  const createSampleSXF = useCallback(() => {
    const sampleContent = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('SXF Sample File'), '2.0');
FILE_NAME('sample.sxf', '2024-01-01T00:00:00', ('Claude CAD'), ('Claude CAD'), 'SXF 3.1', 'CAD System', '');
FILE_SCHEMA(('SXF_3_1'));
ENDSEC;
DATA;
#1 = SXF_LAYER('測量点', '#FF0000', 'CONTINUOUS', 1.0, .T., .F.);
#2 = SXF_LAYER('境界線', '#000000', 'CONTINUOUS', 2.0, .T., .F.);
#3 = SXF_LAYER('文字', '#0000FF', 'CONTINUOUS', 1.0, .T., .F.);
#10 = CARTESIAN_POINT((0.0, 0.0, 0.0));
#11 = CARTESIAN_POINT((100.0, 0.0, 0.0));
#12 = CARTESIAN_POINT((100.0, 100.0, 0.0));
#13 = CARTESIAN_POINT((0.0, 100.0, 0.0));
#14 = CARTESIAN_POINT((50.0, 50.0, 0.0));
#20 = SXF_LINE(#10, #11, #2);
#21 = SXF_LINE(#11, #12, #2);
#22 = SXF_LINE(#12, #13, #2);
#23 = SXF_LINE(#13, #10, #2);
#30 = SXF_POINT(#10, #1);
#31 = SXF_POINT(#11, #1);
#32 = SXF_POINT(#12, #1);
#33 = SXF_POINT(#13, #1);
#40 = SXF_TEXT(#14, 'サンプル区画', 10.0, 0.0, #3);
ENDSEC;
END-ISO-10303-21;`;

    const blob = new Blob([sampleContent], { type: 'text/plain' });
    const sampleFile = new File([blob], 'sample.sxf', { type: 'text/plain' });
    handleFileLoad(sampleFile);
  }, [handleFileLoad]);

  return (
    <Stack spacing="md">
      <Group>
        <FileButton
          accept=".sxf,.p21"
          onChange={handleFileLoad}
          disabled={loadState.isLoading}
        >
          {(props) => (
            <Button {...props} disabled={loadState.isLoading}>
              SXFファイルを選択
            </Button>
          )}
        </FileButton>
        
        <Button 
          variant="outline" 
          onClick={createSampleSXF}
          disabled={loadState.isLoading}
        >
          サンプルSXF読み込み
        </Button>
      </Group>

      {file && !loadState.isLoading && (
        <Text size="sm" color="dimmed">
          選択されたファイル: {file.name} ({(file.size / 1024).toFixed(1)} KB)
        </Text>
      )}

      {loadState.isLoading && (
        <Stack spacing="xs">
          <Progress value={loadState.progress} animated />
          <Text size="sm">{loadState.currentStep}</Text>
        </Stack>
      )}

      {loadState.error && (
        <Alert color="red" title="エラー">
          {loadState.error}
        </Alert>
      )}

      {loadState.success && (
        <Alert color="green" title="成功">
          SXFファイルを正常に読み込みました。
        </Alert>
      )}

      <Text size="xs" color="dimmed">
        対応フォーマット: SXF (.sxf), P21 (.p21)<br/>
        地籍調査で使用される標準的なCADデータ交換フォーマットに対応しています。
      </Text>
    </Stack>
  );
};