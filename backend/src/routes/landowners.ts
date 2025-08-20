import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// 地権者一覧取得
router.get('/:projectId/landowners', async (req, res) => {
  try {
    const { projectId } = req.params;
    const landowners = await prisma.landowner.findMany({
      where: { projectId },
      include: {
        landParcels: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(landowners);
  } catch (error) {
    console.error('地権者取得エラー:', error);
    res.status(500).json({ error: '地権者の取得に失敗しました' });
  }
});

// 地権者詳細取得
router.get('/:projectId/landowners/:landownerId', async (req, res) => {
  try {
    const { projectId, landownerId } = req.params;
    const landowner = await prisma.landowner.findFirst({
      where: {
        id: landownerId,
        projectId,
      },
      include: {
        landParcels: true,
      },
    });

    if (!landowner) {
      return res.status(404).json({ error: '地権者が見つかりません' });
    }

    res.json(landowner);
  } catch (error) {
    console.error('地権者詳細取得エラー:', error);
    res.status(500).json({ error: '地権者詳細の取得に失敗しました' });
  }
});

// 地権者作成
router.post('/:projectId/landowners', async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      name,
      address,
      phoneNumber,
      email,
      birthDate,
      idNumber,
      remarks,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: '地権者名は必須です' });
    }

    const landowner = await prisma.landowner.create({
      data: {
        name,
        address,
        phoneNumber,
        email,
        birthDate: birthDate ? new Date(birthDate) : null,
        idNumber,
        remarks,
        projectId,
      },
      include: {
        landParcels: true,
      },
    });

    res.status(201).json(landowner);
  } catch (error) {
    console.error('地権者作成エラー:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: 'この名前の地権者は既に登録されています' 
      });
    }
    res.status(500).json({ error: '地権者の作成に失敗しました' });
  }
});

// 地権者更新
router.put('/:projectId/landowners/:landownerId', async (req, res) => {
  try {
    const { projectId, landownerId } = req.params;
    const {
      name,
      address,
      phoneNumber,
      email,
      birthDate,
      idNumber,
      remarks,
    } = req.body;

    // 地権者の存在確認
    const existingLandowner = await prisma.landowner.findFirst({
      where: {
        id: landownerId,
        projectId,
      },
    });

    if (!existingLandowner) {
      return res.status(404).json({ error: '地権者が見つかりません' });
    }

    const landowner = await prisma.landowner.update({
      where: { id: landownerId },
      data: {
        name,
        address,
        phoneNumber,
        email,
        birthDate: birthDate ? new Date(birthDate) : null,
        idNumber,
        remarks,
      },
      include: {
        landParcels: true,
      },
    });

    res.json(landowner);
  } catch (error) {
    console.error('地権者更新エラー:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: 'この名前の地権者は既に登録されています' 
      });
    }
    res.status(500).json({ error: '地権者の更新に失敗しました' });
  }
});

// 地権者削除
router.delete('/:projectId/landowners/:landownerId', async (req, res) => {
  try {
    const { projectId, landownerId } = req.params;

    // 地権者の存在確認
    const existingLandowner = await prisma.landowner.findFirst({
      where: {
        id: landownerId,
        projectId,
      },
      include: {
        landParcels: true,
      },
    });

    if (!existingLandowner) {
      return res.status(404).json({ error: '地権者が見つかりません' });
    }

    // 関連する土地がある場合の確認
    if (existingLandowner.landParcels.length > 0) {
      return res.status(400).json({ 
        error: '関連する土地があるため、地権者を削除できません。先に土地の所有者を変更してください。' 
      });
    }

    await prisma.landowner.delete({
      where: { id: landownerId },
    });

    res.json({ message: '地権者を削除しました' });
  } catch (error) {
    console.error('地権者削除エラー:', error);
    res.status(500).json({ error: '地権者の削除に失敗しました' });
  }
});

// 地権者の所有土地一覧取得
router.get('/:projectId/landowners/:landownerId/parcels', async (req, res) => {
  try {
    const { projectId, landownerId } = req.params;

    const landowner = await prisma.landowner.findFirst({
      where: {
        id: landownerId,
        projectId,
      },
      include: {
        landParcels: {
          orderBy: { parcelNumber: 'asc' },
        },
      },
    });

    if (!landowner) {
      return res.status(404).json({ error: '地権者が見つかりません' });
    }

    res.json(landowner.landParcels);
  } catch (error) {
    console.error('地権者所有土地取得エラー:', error);
    res.status(500).json({ error: '地権者の所有土地取得に失敗しました' });
  }
});

export default router;