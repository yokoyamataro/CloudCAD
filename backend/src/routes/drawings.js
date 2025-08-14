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
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// 図面一覧取得
router.get('/project/:projectId', (0, auth_1.checkProjectAccess)('viewer'), (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    const drawings = yield index_1.prisma.drawing.findMany({
        where: { projectId },
        include: {
            author: {
                select: { id: true, name: true, email: true }
            },
            _count: {
                select: { elements: true }
            }
        },
        orderBy: { updatedAt: 'desc' }
    });
    res.json({ drawings });
})));
// 図面作成
router.post('/', (0, auth_1.checkProjectAccess)('editor'), (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { name, projectId, sxfData, metadata } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const drawing = yield index_1.prisma.drawing.create({
        data: {
            name,
            projectId,
            authorId: userId,
            sxfData: sxfData ? JSON.stringify(sxfData) : null,
            metadata: metadata ? JSON.stringify(metadata) : null
        },
        include: {
            author: {
                select: { id: true, name: true, email: true }
            }
        }
    });
    res.status(201).json({
        message: '図面を作成しました',
        drawing
    });
})));
// 図面詳細取得
router.get('/:drawingId', (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { drawingId } = req.params;
    const drawing = yield index_1.prisma.drawing.findUnique({
        where: { id: drawingId },
        include: {
            author: {
                select: { id: true, name: true, email: true }
            },
            project: {
                select: { id: true, name: true, coordinateSystem: true }
            },
            elements: {
                include: {
                    layer: true
                }
            }
        }
    });
    if (!drawing) {
        throw new errorHandler_1.AppError('図面が見つかりません', 404);
    }
    res.json({ drawing });
})));
// 描画要素の追加
router.post('/:drawingId/elements', (0, auth_1.checkProjectAccess)('editor'), (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { drawingId } = req.params;
    const { type, geometry, properties, style, layerId } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const element = yield index_1.prisma.drawingElement.create({
        data: {
            type,
            geometry: JSON.stringify(geometry),
            properties: properties ? JSON.stringify(properties) : null,
            style: style ? JSON.stringify(style) : null,
            drawingId,
            layerId,
            createdBy: userId
        }
    });
    res.status(201).json({
        message: '描画要素を追加しました',
        element
    });
})));
exports.default = router;
