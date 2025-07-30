import React, { useState } from 'react';
import {
  Stack,
  TextInput,
  Textarea,
  Select,
  Group,
  Button,
  Stepper,
  Paper,
  Title,
  Text,
  Grid,
  Box
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconArrowLeft, IconArrowRight, IconCheck } from '@tabler/icons-react';
import { ProjectTemplateSelector } from './ProjectTemplateSelector';
import { ProjectTemplate, Project } from '../../types/project';
import { getTemplateById } from '../../data/projectTemplates';

interface ProjectCreateFormProps {
  onSubmit: (project: Partial<Project>) => void;
  onCancel: () => void;
}

export const ProjectCreateForm: React.FC<ProjectCreateFormProps> = ({
  onSubmit,
  onCancel
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);

  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      address: '',
      prefecture: '',
      city: '',
      coordinateSystem: '',
      scale: '',
      units: 'メートル'
    },
    validate: (values) => {
      const errors: any = {};
      if (activeStep >= 1) {
        if (!values.name) errors.name = 'プロジェクト名は必須です';
        if (!values.description) errors.description = '説明は必須です';
      }
      if (activeStep >= 2) {
        if (!values.address) errors.address = '住所は必須です';
        if (!values.prefecture) errors.prefecture = '都道府県は必須です';
        if (!values.city) errors.city = '市区町村は必須です';
      }
      return errors;
    }
  });

  const prefectures = [
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
    '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
    '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
    '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
  ];

  const coordinateSystems = [
    { value: 'JGD2011', label: 'JGD2011 (日本測地系2011)' },
    { value: 'JGD2000', label: 'JGD2000 (日本測地系2000)' },
    { value: 'Tokyo', label: '日本測地系 (Tokyo Datum)' }
  ];

  const scales = [
    { value: '1:250', label: '1:250' },
    { value: '1:500', label: '1:500' },
    { value: '1:1000', label: '1:1000' },
    { value: '1:2500', label: '1:2500' },
    { value: '1:5000', label: '1:5000' }
  ];

  const nextStep = () => {
    if (activeStep === 0 && !selectedTemplate) return;
    
    if (activeStep < 3) {
      const validation = form.validate();
      if (!validation.hasErrors || activeStep === 0) {
        setActiveStep(activeStep + 1);
        
        // テンプレートの設定を適用
        if (activeStep === 0 && selectedTemplate) {
          form.setValues({
            ...form.values,
            coordinateSystem: selectedTemplate.defaultSettings.coordinateSystem,
            scale: selectedTemplate.defaultSettings.scale,
            units: selectedTemplate.defaultSettings.units
          });
        }
      }
    }
  };

  const prevStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSubmit = () => {
    const validation = form.validate();
    if (!validation.hasErrors && selectedTemplate) {
      const projectData: Partial<Project> = {
        name: form.values.name,
        description: form.values.description,
        templateId: selectedTemplate.id,
        template: selectedTemplate,
        location: {
          address: form.values.address,
          prefecture: form.values.prefecture,
          city: form.values.city
        },
        settings: {
          coordinateSystem: form.values.coordinateSystem,
          scale: form.values.scale,
          units: form.values.units
        }
      };
      onSubmit(projectData);
    }
  };

  return (
    <Box>
      <Stepper active={activeStep} mb="xl">
        <Stepper.Step label="テンプレート選択" description="調査種別を選択">
          <ProjectTemplateSelector
            onSelect={setSelectedTemplate}
            selectedTemplateId={selectedTemplate?.id}
          />
        </Stepper.Step>

        <Stepper.Step label="基本情報" description="プロジェクト詳細">
          <Paper p="md" withBorder>
            <Stack>
              <Title order={4}>プロジェクト基本情報</Title>
              
              {selectedTemplate && (
                <Paper p="sm" bg="blue.0" mb="md">
                  <Text size="sm">
                    <strong>選択されたテンプレート:</strong> {selectedTemplate.name}
                  </Text>
                </Paper>
              )}

              <TextInput
                label="プロジェクト名"
                placeholder="例: 渋谷区神宮前地区調査"
                required
                {...form.getInputProps('name')}
              />

              <Textarea
                label="説明"
                placeholder="プロジェクトの詳細説明を入力してください"
                minRows={3}
                required
                {...form.getInputProps('description')}
              />
            </Stack>
          </Paper>
        </Stepper.Step>

        <Stepper.Step label="調査地域" description="所在地情報">
          <Paper p="md" withBorder>
            <Stack>
              <Title order={4}>調査対象地域</Title>

              <TextInput
                label="住所"
                placeholder="例: 東京都渋谷区神宮前1-1-1"
                required
                {...form.getInputProps('address')}
              />

              <Grid>
                <Grid.Col span={6}>
                  <Select
                    label="都道府県"
                    placeholder="選択してください"
                    data={prefectures}
                    required
                    searchable
                    {...form.getInputProps('prefecture')}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="市区町村"
                    placeholder="例: 渋谷区"
                    required
                    {...form.getInputProps('city')}
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </Paper>
        </Stepper.Step>

        <Stepper.Step label="測量設定" description="座標系・縮尺設定">
          <Paper p="md" withBorder>
            <Stack>
              <Title order={4}>測量・座標設定</Title>

              <Select
                label="座標系"
                placeholder="座標系を選択"
                data={coordinateSystems}
                required
                {...form.getInputProps('coordinateSystem')}
              />

              <Grid>
                <Grid.Col span={6}>
                  <Select
                    label="縮尺"
                    placeholder="縮尺を選択"
                    data={scales}
                    required
                    {...form.getInputProps('scale')}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Select
                    label="単位"
                    data={[
                      { value: 'メートル', label: 'メートル (m)' },
                      { value: 'センチメートル', label: 'センチメートル (cm)' },
                      { value: 'ミリメートル', label: 'ミリメートル (mm)' }
                    ]}
                    {...form.getInputProps('units')}
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </Paper>
        </Stepper.Step>

        <Stepper.Completed>
          <Paper p="md" withBorder ta="center">
            <Title order={4} mb="md">プロジェクト設定完了</Title>
            <Text mb="md">
              すべての設定が完了しました。プロジェクトを作成してください。
            </Text>
            
            {selectedTemplate && (
              <Paper p="sm" bg="green.0" mb="md">
                <Stack gap="xs">
                  <Text size="sm"><strong>プロジェクト名:</strong> {form.values.name}</Text>
                  <Text size="sm"><strong>テンプレート:</strong> {selectedTemplate.name}</Text>
                  <Text size="sm"><strong>調査地域:</strong> {form.values.address}</Text>
                  <Text size="sm"><strong>座標系:</strong> {form.values.coordinateSystem}</Text>
                </Stack>
              </Paper>
            )}
          </Paper>
        </Stepper.Completed>
      </Stepper>

      <Group justify="space-between" mt="xl">
        <Group>
          <Button variant="default" onClick={onCancel}>
            キャンセル
          </Button>
          {activeStep > 0 && (
            <Button
              variant="default"
              leftSection={<IconArrowLeft size={16} />}
              onClick={prevStep}
            >
              戻る
            </Button>
          )}
        </Group>

        <Group>
          {activeStep < 3 ? (
            <Button
              rightSection={<IconArrowRight size={16} />}
              onClick={nextStep}
              disabled={activeStep === 0 && !selectedTemplate}
            >
              次へ
            </Button>
          ) : (
            <Button
              leftSection={<IconCheck size={16} />}
              onClick={handleSubmit}
            >
              プロジェクトを作成
            </Button>
          )}
        </Group>
      </Group>
    </Box>
  );
};