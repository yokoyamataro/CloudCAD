import React from 'react';
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
import type { Project, ProjectTemplate } from '../../types/project';
import { getPrefectureNames } from '../../services/municipalityService';

interface ProjectEditFormProps {
  project: Project;
  onSubmit: (project: Partial<Project>) => void;
  onCancel: () => void;
}

export const ProjectEditForm: React.FC<ProjectEditFormProps> = ({
  project,
  onSubmit,
  onCancel
}) => {
  
  const prefectures = getPrefectureNames();

  const coordinateSystems = [
    { value: 'JGD2011', label: 'JGD2011 (日本測地系2011)' },
    { value: 'JGD2000', label: 'JGD2000 (日本測地系2000)' },
    { value: 'Tokyo', label: '日本測地系 (Tokyo Datum)' }
  ];

  const planeRectangularZones = [
    { value: '1', label: '第1系（長崎県・鹿児島県の一部）' },
    { value: '2', label: '第2系（福岡県・佐賀県・熊本県・大分県・宮崎県・鹿児島県）' },
    { value: '3', label: '第3系（山口県・島根県・広島県）' },
    { value: '4', label: '第4系（香川県・愛媛県・徳島県・高知県）' },
    { value: '5', label: '第5系（兵庫県・鳥取県・岡山県）' },
    { value: '6', label: '第6系（京都府・大阪府・福井県・滋賀県・三重県・奈良県・和歌山県）' },
    { value: '7', label: '第7系（石川県・富山県・岐阜県・愛知県）' },
    { value: '8', label: '第8系（新潟県・長野県・山梨県・静岡県）' },
    { value: '9', label: '第9系（東京都・福島県・栃木県・茨城県・埼玉県・千葉県・群馬県・神奈川県）' },
    { value: '10', label: '第10系（青森県・秋田県・山形県・岩手県・宮城県）' },
    { value: '11', label: '第11系（北海道西部）' },
    { value: '12', label: '第12系（北海道中部）' },
    { value: '13', label: '第13系（北海道東部）' },
    { value: '14', label: '第14系（東京都（島部））' },
    { value: '15', label: '第15系（沖縄本島付近）' },
    { value: '16', label: '第16系（大東島付近）' },
    { value: '17', label: '第17系（久米島付近）' },
    { value: '18', label: '第18系（宮古島付近）' },
    { value: '19', label: '第19系（石垣島付近）' }
  ];

  
  const form = useForm({
    initialValues: {
      name: project.name || '',
      description: project.description || '',
      prefecture: project.location?.prefecture || '',
      city: project.location?.city || '',
      coordinateSystem: project.settings?.coordinateSystem || '',
      planeRectangularZone: project.settings?.planeRectangularZone || ''
    },
    validate: {
      name: (value) => (!value ? 'プロジェクト名は必須です' : null),
      prefecture: (value) => (!value ? '都道府県は必須です' : null),
      city: (value) => (!value ? '市区町村は必須です' : null),
      coordinateSystem: (value) => (!value ? '座標系は必須です' : null),
      planeRectangularZone: (value) => (!value ? '平面直角座標系は必須です' : null)
    }
  });

  const handleSubmit = () => {
    const validation = form.validate();
    if (!validation.hasErrors) {
      const projectData: Partial<Project> = {
        name: form.values.name,
        description: form.values.description,
        templateId: project.templateId,
        template: project.template,
        location: {
          prefecture: form.values.prefecture,
          city: form.values.city
        },
        settings: {
          coordinateSystem: form.values.coordinateSystem,
          planeRectangularZone: form.values.planeRectangularZone
        }
      };
      onSubmit(projectData);
    }
  };

  return (
    <Stack>
      <Title order={4}>プロジェクト編集</Title>
      
      <TextInput
        label="プロジェクト名"
        placeholder="例: 渋谷区神宮前地区調査"
        required
        {...form.getInputProps('name')}
      />

      <Textarea
        label="説明"
        placeholder="プロジェクトの詳細説明を入力してください（任意）"
        minRows={3}
        {...form.getInputProps('description')}
      />

      <Grid>
        <Grid.Col span={6}>
          <Select
            label="都道府県"
            placeholder="選択してください"
            required
            searchable
            data={prefectures}
            comboboxProps={{ zIndex: 5000 }}
            {...form.getInputProps('prefecture')}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <TextInput
            label="市区町村"
            placeholder="例: 渋谷区、横浜市、大阪市"
            required
            {...form.getInputProps('city')}
          />
        </Grid.Col>
      </Grid>

      <Grid>
        <Grid.Col span={6}>
          <Select
            label="座標系"
            placeholder="座標系を選択"
            required
            data={coordinateSystems}
            comboboxProps={{ zIndex: 5000 }}
            {...form.getInputProps('coordinateSystem')}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <Select
            label="平面直角座標系"
            placeholder="平面直角座標系を選択"
            required
            data={planeRectangularZones}
            comboboxProps={{ zIndex: 5000 }}
            {...form.getInputProps('planeRectangularZone')}
          />
        </Grid.Col>
      </Grid>

      <Text size="sm" c="dimmed">
        ※平面直角座標系は調査地域に応じて適切な系を選択してください
      </Text>

      <Group justify="flex-end" mt="xl">
        <Button variant="default" onClick={onCancel}>
          キャンセル
        </Button>
        <Button onClick={handleSubmit}>
          保存
        </Button>
      </Group>
    </Stack>
  );
};