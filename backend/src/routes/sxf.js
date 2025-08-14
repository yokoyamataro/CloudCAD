"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ファイルアップロード設定
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['text/plain', 'application/octet-stream'];
        const allowedExts = ['.sxf', '.p21'];
        const hasValidMime = allowedMimes.includes(file.mimetype);
        const hasValidExt = allowedExts.some(ext => file.originalname.toLowerCase().endsWith(ext));
        if (hasValidMime || hasValidExt) {
            cb(null, true);
        }
        else {
            cb(new errorHandler_1.AppError('SXFまたはP21ファイルのみアップロード可能です', 400));
        }
    }
});
// SXFファイルアップロード・解析
router.post('/upload/:projectId', (0, auth_1.checkProjectAccess)('editor'), upload.single('sxfFile'), (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { projectId } = req.params;
    const { name } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!req.file) {
        throw new errorHandler_1.AppError('SXFファイルが必要です', 400);
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
    const drawing = yield index_1.prisma.drawing.create({
        data: {
            name: name || req.file.originalname,
            projectId,
            authorId: userId,
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
})));
// SXFデータのエクスポート
router.get('/export/:drawingId', (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { drawingId } = req.params;
    const drawing = yield index_1.prisma.drawing.findUnique({
        where: { id: drawingId },
        include: {
            elements: true,
            project: {
                select: { name: true, coordinateSystem: true }
            }
        }
    });
    if (!drawing) {
        throw new errorHandler_1.AppError('図面が見つかりません', 404);
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
})));
exports.default = router;
