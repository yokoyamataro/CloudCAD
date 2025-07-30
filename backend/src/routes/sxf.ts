import express from 'express';
import multer from 'multer';
import { prisma } from '../index';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { checkProjectAccess } from '../middleware/auth';

const router = express.Router();

// ファイルアップロード設定
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['text/plain', 'application/octet-stream'];
    const allowedExts = ['.sxf', '.p21'];
    
    const hasValidMime = allowedMimes.includes(file.mimetype);
    const hasValidExt = allowedExts.some(ext => 
      file.originalname.toLowerCase().endsWith(ext)
    );
    
    if (hasValidMime || hasValidExt) {
      cb(null, true);
    } else {
      cb(new AppError('SXFまたはP21ファイルのみアップロード可能です', 400));
    }
  }
});

// SXFファイルアップロード・解析
router.post('/upload/:projectId', 
  checkProjectAccess('editor'),
  upload.single('sxfFile'),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { name } = req.body;
    const userId = req.user?.userId;

    if (!req.file) {
      throw new AppError('SXFファイルが必要です', 400);
    }

    // ファイル内容を文字列として取得
    const fileContent = req.file.buffer.toString('utf-8');
    
    // TODO: SXFパーサーを使用してファイルを解析
    // const parser = new P21Parser();
    // const parseResult = await parser.parseFile(fileContent);
    
    // 仮の処理（実際はSXFパーサーの結果を使用）
    const sxfData = {
      originalFilename: req.file.originalname,
      fileSize: req.file.size,
      uploadDate: new Date().toISOString(),
      content: fileContent.substring(0, 1000) + '...' // 最初の1000文字のみ保存（例）
    };

    // 図面として保存
    const drawing = await prisma.drawing.create({
      data: {
        name: name || req.file.originalname,
        projectId,
        authorId: userId!,
        sxfData: JSON.stringify(sxfData),
        metadata: JSON.stringify({
          uploadedFrom: 'sxf',
          originalFilename: req.file.originalname,
          fileSize: req.file.size
        })
      },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json({
      message: 'SXFファイルを正常にアップロードしました',
      drawing,
      parseInfo: {
        fileSize: req.file.size,
        filename: req.file.originalname
      }
    });
  })
);

// SXFデータのエクスポート
router.get('/export/:drawingId', asyncHandler(async (req, res) => {
  const { drawingId } = req.params;

  const drawing = await prisma.drawing.findUnique({
    where: { id: drawingId },
    include: {
      elements: true,
      project: {
        select: { name: true, coordinateSystem: true }
      }
    }
  });

  if (!drawing) {
    throw new AppError('図面が見つかりません', 404);
  }

  // TODO: 描画要素をSXF形式に変換
  // const converter = new SXFExporter();
  // const sxfContent = converter.exportToSXF(drawing);

  // 仮のSXF出力
  const sxfContent = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('${drawing.name}'), '2.0');
FILE_NAME('${drawing.name}.sxf', '${new Date().toISOString()}', ('CloudCAD'),
('CloudCAD'), 'SXF 3.1', 'CloudCAD System', '');
FILE_SCHEMA(('SXF_3_1'));
ENDSEC;
DATA;
/* 描画要素: ${drawing.elements.length}個 */
ENDSEC;
END-ISO-10303-21;`;

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${drawing.name}.sxf"`);
  res.send(sxfContent);
}));

export default router;