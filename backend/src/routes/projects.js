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
// プロジェクト一覧取得
router.get('/', (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const projects = yield index_1.prisma.project.findMany({
        where: {
            users: {
                some: {
                    userId
                }
            }
        },
        include: {
            users: {
                include: {
                    user: {
                        select: { id: true, name: true, email: true }
                    }
                }
            },
            _count: {
                select: {
                    drawings: true,
                    surveyPoints: true,
                    boundaryLines: true
                }
            }
        }
    });
    res.json({ projects });
})));
// プロジェクト作成
router.post('/', (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { name, description, surveyArea, coordinateSystem } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const project = yield index_1.prisma.project.create({
        data: {
            name,
            description,
            surveyArea,
            coordinateSystem: coordinateSystem || 'JGD2000',
            users: {
                create: {
                    userId: userId,
                    role: 'owner'
                }
            }
        },
        include: {
            users: {
                include: {
                    user: {
                        select: { id: true, name: true, email: true }
                    }
                }
            }
        }
    });
    res.status(201).json({
        message: 'プロジェクトを作成しました',
        project
    });
})));
// プロジェクト詳細取得
router.get('/:projectId', (0, auth_1.checkProjectAccess)('viewer'), (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    const project = yield index_1.prisma.project.findUnique({
        where: { id: projectId },
        include: {
            users: {
                include: {
                    user: {
                        select: { id: true, name: true, email: true, role: true }
                    }
                }
            },
            layers: true,
            _count: {
                select: {
                    drawings: true,
                    surveyPoints: true,
                    boundaryLines: true,
                    landParcels: true
                }
            }
        }
    });
    res.json({ project });
})));
// その他のエンドポイント（更新、削除、メンバー管理等）
// 実装は必要に応じて拡張
exports.default = router;
