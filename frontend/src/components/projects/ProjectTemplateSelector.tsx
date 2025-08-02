import React, { useState } from 'react';
import {
  Grid,
  Card,
  Image,
  Text,
  Group,
  Badge,
  Stack,
  Button,
  Paper,
  Title,
  Tabs
} from '@mantine/core';
import { IconCheck, IconMap, IconBuilding, IconTrees, IconHome } from '@tabler/icons-react';
import { PROJECT_TEMPLATES, getTemplatesByCategory } from '../../data/projectTemplates';
import type { ProjectTemplate } from '../../types/project';

interface ProjectTemplateSelectorProps {
  onSelect: (template: ProjectTemplate) => void;
  selectedTemplateId?: string;
}

export const ProjectTemplateSelector: React.FC<ProjectTemplateSelectorProps> = ({
  onSelect,
  selectedTemplateId
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'すべて', icon: IconMap },
    { id: 'urban', label: '都市部', icon: IconBuilding },
    { id: 'rural', label: '農村部', icon: IconTrees },
    { id: 'residential', label: '住宅地', icon: IconHome },
    { id: 'industrial', label: '工業地域', icon: IconBuilding }
  ];

  const getTemplatesForCategory = (category: string) => {
    if (category === 'all') return PROJECT_TEMPLATES;
    return getTemplatesByCategory(category);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'urban': return 'blue';
      case 'rural': return 'green';
      case 'residential': return 'teal';
      case 'industrial': return 'gray';
      default: return 'blue';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'urban': return '都市部';
      case 'rural': return '農村部';
      case 'residential': return '住宅地';
      case 'industrial': return '工業地域';
      default: return category;
    }
  };

  return (
    <div>
      <Paper mb="md" p="sm" withBorder>
        <Title order={4} mb="sm">プロジェクトテンプレートを選択</Title>
        <Text size="sm" c="dimmed">
          調査対象地域の特性に最も適したテンプレートを選択してください
        </Text>
      </Paper>

      {/* カテゴリータブ */}
      <Tabs value={activeCategory} onChange={(value) => setActiveCategory(value || 'all')} mb="md">
        <Tabs.List>
          {categories.map((category) => {
            const Icon = category.icon;
            const templates = getTemplatesForCategory(category.id);
            return (
              <Tabs.Tab 
                key={category.id}
                value={category.id}
                leftSection={<Icon size={16} />}
              >
                {category.label} ({templates.length})
              </Tabs.Tab>
            );
          })}
        </Tabs.List>
      </Tabs>

      {/* テンプレート一覧 */}
      <Grid>
        {getTemplatesForCategory(activeCategory).map((template) => (
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={template.id}>
            <Card
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              style={{
                cursor: 'pointer',
                border: selectedTemplateId === template.id ? '2px solid #228be6' : undefined,
                backgroundColor: selectedTemplateId === template.id ? '#f8f9ff' : undefined
              }}
              onClick={() => onSelect(template)}
            >
              <Card.Section>
                <Image
                  src={template.image}
                  height={160}
                  alt={template.name}
                />
              </Card.Section>

              <Group justify="space-between" mt="md" mb="xs">
                <Text fw={500} size="lg" truncate>
                  {template.name}
                </Text>
                <Group gap="xs">
                  <Badge 
                    color={getCategoryColor(template.category)} 
                    variant="light"
                    size="sm"
                  >
                    {getCategoryLabel(template.category)}
                  </Badge>
                  {selectedTemplateId === template.id && (
                    <Badge color="blue" variant="filled" size="sm">
                      <IconCheck size={12} />
                    </Badge>
                  )}
                </Group>
              </Group>

              <Text size="sm" c="dimmed" mb="md" lineClamp={2}>
                {template.description}
              </Text>

              <Stack gap="xs" mb="md">
                <Group gap="xs">
                  <Text size="xs" fw={500} c="dimmed">主な特徴:</Text>
                </Group>
                {template.features.slice(0, 3).map((feature, index) => (
                  <Text key={index} size="xs" pl="sm">
                    • {feature}
                  </Text>
                ))}
              </Stack>

              <Stack gap="xs" mb="md">
                <Group gap="xs">
                  <Text size="xs" c="dimmed">座標系:</Text>
                  <Text size="xs">{template.defaultSettings.coordinateSystem}</Text>
                </Group>
                <Group gap="xs">
                  <Text size="xs" c="dimmed">推奨縮尺:</Text>
                  <Text size="xs">{template.defaultSettings.scale}</Text>
                </Group>
              </Stack>

              {selectedTemplateId === template.id ? (
                <Button 
                  fullWidth 
                  variant="filled"
                  leftSection={<IconCheck size={16} />}
                >
                  選択中
                </Button>
              ) : (
                <Button 
                  fullWidth 
                  variant="light"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(template);
                  }}
                >
                  このテンプレートを選択
                </Button>
              )}
            </Card>
          </Grid.Col>
        ))}
      </Grid>
    </div>
  );
};