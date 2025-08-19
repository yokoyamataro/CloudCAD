import express from 'express';
import { prisma } from '../index';

const router = express.Router();

// プロジェクトオプションの取得
router.get('/:projectId/:category', async (req, res) => {
  try {
    const { projectId, category } = req.params;
    
    const options = await prisma.projectOption.findMany({
      where: {
        projectId,
        category
      },
      orderBy: [
        { isDefault: 'desc' },
        { label: 'asc' }
      ]
    });

    res.json(options);
  } catch (error) {
    console.error('プロジェクトオプション取得エラー:', error);
    res.status(500).json({ error: 'プロジェクトオプションの取得に失敗しました' });
  }
});

// プロジェクトオプションの作成
router.post('/:projectId/:category', async (req, res) => {
  try {
    const { projectId, category } = req.params;
    const { value, label, isDefault = false } = req.body;

    const option = await prisma.projectOption.create({
      data: {
        projectId,
        category,
        value,
        label,
        isDefault
      }
    });

    res.status(201).json(option);
  } catch (error) {
    console.error('プロジェクトオプション作成エラー:', error);
    res.status(500).json({ error: 'プロジェクトオプションの作成に失敗しました' });
  }
});

// プロジェクトオプションの更新
router.put('/:projectId/:category/:optionId', async (req, res) => {
  try {
    const { optionId } = req.params;
    const { value, label, isDefault } = req.body;

    const option = await prisma.projectOption.update({
      where: {
        id: optionId
      },
      data: {
        value,
        label,
        isDefault
      }
    });

    res.json(option);
  } catch (error) {
    console.error('プロジェクトオプション更新エラー:', error);
    res.status(500).json({ error: 'プロジェクトオプションの更新に失敗しました' });
  }
});

// プロジェクトオプションの削除
router.delete('/:projectId/:category/:optionId', async (req, res) => {
  try {
    const { optionId } = req.params;

    await prisma.projectOption.delete({
      where: {
        id: optionId
      }
    });

    res.status(204).send();
  } catch (error) {
    console.error('プロジェクトオプション削除エラー:', error);
    res.status(500).json({ error: 'プロジェクトオプションの削除に失敗しました' });
  }
});

// デフォルトオプションの初期化
router.post('/:projectId/initialize', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // 杭種のデフォルトオプション
    const stakeTypes = [
      { value: 'wood', label: '木杭' },
      { value: 'metal_pin', label: '金属鋲' },
      { value: 'metal_marker', label: '金属標' },
      { value: 'stone_marker', label: '石標' },
      { value: 'plastic_stake', label: 'プラスチック杭' },
      { value: 'concrete_stake', label: 'コンクリート杭' },
      { value: 'marking', label: 'マーキング' },
      { value: 'engraving', label: '刻印' }
    ];

    // 設置区分のデフォルトオプション
    const installationCategories = [
      { value: 'existing', label: '既設' },
      { value: 'new', label: '新設' },
      { value: 'restoration', label: '復元' },
      { value: 'replacement', label: '入替' }
    ];

    // 杭種オプションを作成
    const stakeTypeOptions = await Promise.all(
      stakeTypes.map(type =>
        prisma.projectOption.create({
          data: {
            projectId,
            category: 'stake_type',
            value: type.value,
            label: type.label,
            isDefault: true
          }
        })
      )
    );

    // 設置区分オプションを作成
    const installationCategoryOptions = await Promise.all(
      installationCategories.map(category =>
        prisma.projectOption.create({
          data: {
            projectId,
            category: 'installation_category',
            value: category.value,
            label: category.label,
            isDefault: true
          }
        })
      )
    );

    res.json({
      stakeTypes: stakeTypeOptions,
      installationCategories: installationCategoryOptions
    });
  } catch (error) {
    console.error('デフォルトオプション初期化エラー:', error);
    res.status(500).json({ error: 'デフォルトオプションの初期化に失敗しました' });
  }
});

export default router;