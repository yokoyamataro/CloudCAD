import React, { useState, useCallback } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Progress,
  Group,
  Stack,
  Card,
  Badge,
  Textarea,
  Alert,
  FileInput,
  ActionIcon
} from '@mantine/core';
import { 
  IconUpload, 
  IconFileText, 
  IconAlertCircle, 
  IconCheck,
  IconX,
  IconRefresh 
} from '@tabler/icons-react';
import { SXFParser, type SXFData } from '../../utils/sxfParser';

interface SXFTesterProps {
  onClose: () => void;
}

const SXFTester: React.FC<SXFTesterProps> = ({ onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SXFData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>('');

  const handleFileSelect = useCallback((selectedFile: File | null) => {
    setFile(selectedFile);
    setResult(null);
    setError(null);
    setSummary('');
    setProgress(0);
  }, []);

  const handleParse = useCallback(async () => {
    if (!file) return;

    setParsing(true);
    setError(null);
    setProgress(0);

    try {
      console.log('SXFファイル解析開始:', file.name, file.size, 'bytes');
      
      // ファイルを読み込み
      const content = await file.text();
      console.log('ファイル内容読み込み完了:', content.length, '文字');

      // パーサーで解析
      const parser = new SXFParser();
      
      // レベルグループ化解析で座標変換を適用
      const data = parser.parseWithLevelGrouping(content);
      setProgress(100);

      setResult(data);
      setSummary(parser.getSummary());
      console.log('SXF解析完了:', data);

    } catch (err: any) {
      console.error('SXF解析エラー:', err);
      setError(err.message || 'ファイルの解析中にエラーが発生しました');
    } finally {
      setParsing(false);
    }
  }, [file]);

  const handleTestWithSample = useCallback(async () => {
    setParsing(true);
    setError(null);
    setProgress(0);

    try {
      // 美山南地区画地調整図のサンプルデータをシミュレート
      const sampleContent = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('SCADEC level2 feature_mode'), '2;1');
FILE_NAME('美山南地区画地調整図（仮）.SFC', '2023-6-17T10:36:1', ('測量会社'), (''), 'SCADEC_API_Ver3.30', 'INFINITY 2021 10.0', '');
FILE_SCHEMA(('ASSOCIATIVE_DRAUGHTING'));
ENDSEC;
DATA;

/*SXF
#10 = user_defined_colour_feature('0','0','0')
SXF*/

/*SXF
#20 = user_defined_colour_feature('255','0','0')
SXF*/

/*SXF
#30 = user_defined_colour_feature('0','255','0')
SXF*/

/*SXF
#40 = width_feature('0.130000')
SXF*/

/*SXF
#50 = arc_feature('4','23','1','1','-29441611.044738','-19727007.399730','125.000000','0','4.89922438446944','184.899792769308')
SXF*/

/*SXF
#60 = arc_feature('4','23','1','1','-29442607.390238','-19727092.814273','125.000000','0','4.89950857681587','184.899508576816')
SXF*/

/*SXF
#70 = composite_curve_org_feature('23','1','1','0')
SXF*/

/*SXF
#80 = text_font_feature('MS ゴシック')
SXF*/

ENDSEC;
END-ISO-10303-21;`;

      const parser = new SXFParser();
      const data = parser.parseWithLevelGrouping(sampleContent);
      setProgress(100);

      setResult(data);
      setSummary(parser.getSummary());
      
      // サンプルファイル情報を追加
      setSummary(prev => prev + '\n\n[サンプルデータでのテスト結果]');

    } catch (err: any) {
      console.error('サンプルテストエラー:', err);
      setError(err.message || 'サンプルデータの解析中にエラーが発生しました');
    } finally {
      setParsing(false);
    }
  }, []);

  return (
    <Container size="xl" py="md">
      <Paper shadow="sm" radius="md" p="xl">
        <Group mb="lg" justify="space-between">
          <Title order={2}>SXF/SFCファイル 読み込みテスト</Title>
          <ActionIcon variant="outline" onClick={onClose}>
            <IconX />
          </ActionIcon>
        </Group>

        <Text size="sm" c="dimmed" mb="lg">
          大規模なSXF形式のCADファイル（美山南地区画地調整図など）が正常に読み込み・解析できるかをテストします。
          190,000行・6.6MBのような大きなファイルの処理性能を確認できます。
        </Text>

        <Stack gap="lg">
          {/* ファイル選択 */}
          <Card withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={500}>ファイル選択</Text>
                <Badge variant="light" color="blue">
                  対応形式: SFC, SXF
                </Badge>
              </Group>
              
              <FileInput
                placeholder="SXFファイルを選択してください"
                value={file}
                onChange={handleFileSelect}
                accept=".sfc,.sxf"
                leftSection={<IconFileText size="1rem" />}
              />
              
              <Group>
                <Button
                  onClick={handleParse}
                  disabled={!file || parsing}
                  leftSection={<IconUpload size="1rem" />}
                  loading={parsing}
                >
                  {parsing ? '解析中...' : 'ファイル解析'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleTestWithSample}
                  disabled={parsing}
                  leftSection={<IconRefresh size="1rem" />}
                >
                  サンプルデータでテスト
                </Button>
              </Group>

              {file && (
                <Text size="sm" c="dimmed">
                  選択済み: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </Text>
              )}
            </Stack>
          </Card>

          {/* プログレス */}
          {parsing && (
            <Card withBorder>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text fw={500}>解析進行状況</Text>
                  <Text size="sm">{progress.toFixed(1)}%</Text>
                </Group>
                <Progress value={progress} />
                <Text size="xs" c="dimmed">
                  大きなファイルの場合、数分かかる場合があります...
                </Text>
              </Stack>
            </Card>
          )}

          {/* エラー表示 */}
          {error && (
            <Alert icon={<IconAlertCircle size="1rem" />} color="red" title="エラー">
              {error}
            </Alert>
          )}

          {/* 結果表示 */}
          {result && (
            <Stack gap="md">
              <Alert icon={<IconCheck size="1rem" />} color="green" title="解析完了">
                SXFファイルの解析が正常に完了しました
              </Alert>

              {/* サマリー */}
              <Card withBorder>
                <Stack gap="sm">
                  <Text fw={500}>解析結果サマリー</Text>
                  <Textarea
                    value={summary}
                    readOnly
                    rows={6}
                    styles={{
                      input: {
                        fontFamily: 'monospace',
                        fontSize: '12px'
                      }
                    }}
                  />
                </Stack>
              </Card>

              {/* ヘッダー情報 */}
              <Card withBorder>
                <Stack gap="sm">
                  <Text fw={500}>ファイル情報</Text>
                  <Group gap="xs" align="start">
                    <Badge color="blue">説明</Badge>
                    <Text size="sm">{result.header.description || 'N/A'}</Text>
                  </Group>
                  <Group gap="xs" align="start">
                    <Badge color="green">スキーマ</Badge>
                    <Text size="sm">{result.header.schema || 'N/A'}</Text>
                  </Group>
                  <Group gap="xs" align="start">
                    <Badge color="orange">要素数</Badge>
                    <Text size="sm">{result.statistics.totalElements} 個</Text>
                  </Group>
                </Stack>
              </Card>

              {/* 要素種別 */}
              <Card withBorder>
                <Stack gap="sm">
                  <Text fw={500}>検出された要素種別</Text>
                  <Group gap="xs">
                    {Object.entries(result.statistics.elementTypes).map(([type, count]) => (
                      <Badge key={type} variant="light">
                        {type}: {count}
                      </Badge>
                    ))}
                  </Group>
                </Stack>
              </Card>

              {/* 座標範囲 */}
              {result.statistics.coordinateRange.minX !== Infinity && (
                <Card withBorder>
                  <Stack gap="sm">
                    <Text fw={500}>座標範囲</Text>
                    <Group gap="md">
                      <Text size="sm">
                        X: {result.statistics.coordinateRange.minX.toFixed(2)} 
                        ～ {result.statistics.coordinateRange.maxX.toFixed(2)}
                      </Text>
                      <Text size="sm">
                        Y: {result.statistics.coordinateRange.minY.toFixed(2)} 
                        ～ {result.statistics.coordinateRange.maxY.toFixed(2)}
                      </Text>
                    </Group>
                  </Stack>
                </Card>
              )}

              {/* パフォーマンス情報 */}
              <Alert color="blue" title="パフォーマンス情報">
                <Text size="sm">
                  ブラウザでの大規模CADデータ処理のテストが完了しました。
                  実際の描画には追加の最適化が必要です。
                </Text>
              </Alert>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Container>
  );
};

export default SXFTester;