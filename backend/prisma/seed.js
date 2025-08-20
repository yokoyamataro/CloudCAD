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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🌱 Seeding database...');
        // 1. ユーザー作成
        const user = yield prisma.user.upsert({
            where: { email: 'admin@cloudcad.com' },
            update: {},
            create: {
                email: 'admin@cloudcad.com',
                name: 'システム管理者',
                password: 'hashedpassword123', // 実際はハッシュ化必要
                role: 'admin',
            },
        });
        console.log('👤 ユーザー作成:', user.name);
        // 2. プロジェクト作成
        const project = yield prisma.project.upsert({
            where: { id: '1' },
            update: {},
            create: {
                id: '1',
                name: '地籍調査テストプロジェクト',
                description: '座標管理機能のテスト用プロジェクト',
                surveyArea: '東京都千代田区',
                coordinateSystem: 'JGD2000',
                units: 'm',
                boundingBox: '{"minX": 0, "minY": 0, "maxX": 1000, "maxY": 1000}',
            },
        });
        console.log('📁 プロジェクト作成:', project.name);
        // 3. プロジェクトユーザー関連付け
        yield prisma.projectUser.upsert({
            where: {
                userId_projectId: {
                    userId: user.id,
                    projectId: project.id,
                },
            },
            update: {},
            create: {
                userId: user.id,
                projectId: project.id,
                role: 'admin',
            },
        });
        // 4. 測量点のテストデータ作成
        const surveyPoints = [
            {
                pointNumber: 'BP-001',
                pointType: 'boundary_point',
                x: 100.123,
                y: 200.456,
                elevation: 45.67,
                measureDate: new Date('2024-01-15'),
                surveyorName: '田中測量士',
                remarks: 'コンクリート境界杭',
                stakeType: 'コンクリート杭',
                installationCategory: '既設',
                projectId: project.id,
                createdBy: user.id,
            },
            {
                pointNumber: 'BP-002',
                pointType: 'boundary_point',
                x: 150.789,
                y: 250.012,
                elevation: 46.12,
                measureDate: new Date('2024-01-15'),
                surveyorName: '田中測量士',
                remarks: '金属標',
                stakeType: '金属標',
                installationCategory: '既設',
                projectId: project.id,
                createdBy: user.id,
            },
            {
                pointNumber: 'CP-001',
                pointType: 'control_point',
                x: 125.456,
                y: 225.789,
                elevation: 45.89,
                measureDate: new Date('2024-01-16'),
                surveyorName: '佐藤測量士',
                remarks: 'GPS制御点',
                stakeType: '金属鋲',
                installationCategory: '新設',
                projectId: project.id,
                createdBy: user.id,
            },
        ];
        for (const pointData of surveyPoints) {
            const point = yield prisma.surveyPoint.upsert({
                where: {
                    projectId_pointNumber: {
                        projectId: pointData.projectId,
                        pointNumber: pointData.pointNumber,
                    },
                },
                update: {},
                create: pointData,
            });
            console.log('📍 測量点作成:', point.pointNumber);
        }
        // 5. 地番データ作成
        const landParcels = [
            {
                parcelNumber: '123-1',
                address: '東京都千代田区霞が関1-2-3',
                area: 250.75,
                landUse: '宅地',
                owner: '山田太郎',
                geometry: 'POLYGON((100.123 200.456, 150.789 250.012, 125.456 225.789, 100.123 200.456))',
                coordinatePoints: '["BP-001", "BP-002", "CP-001"]',
                registrationDate: new Date('2020-03-15'),
                remarks: '角地物件',
                projectId: project.id,
            },
            {
                parcelNumber: '123-2',
                address: '東京都千代田区霞が関1-2-4',
                area: 180.25,
                landUse: '宅地',
                owner: '鈴木花子',
                geometry: 'POLYGON((150.789 250.012, 180.123 280.456, 160.456 260.789, 150.789 250.012))',
                coordinatePoints: '["BP-002"]',
                registrationDate: new Date('2019-11-20'),
                remarks: '住宅用地',
                projectId: project.id,
            },
        ];
        for (const parcelData of landParcels) {
            const parcel = yield prisma.landParcel.upsert({
                where: {
                    projectId_parcelNumber: {
                        projectId: parcelData.projectId,
                        parcelNumber: parcelData.parcelNumber,
                    },
                },
                update: {},
                create: parcelData,
            });
            console.log('🏠 地番作成:', parcel.parcelNumber);
        }
        console.log('✅ シード完了！');
    });
}
main()
    .then(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}))
    .catch((e) => __awaiter(void 0, void 0, void 0, function* () {
    console.error('❌ シードエラー:', e);
    yield prisma.$disconnect();
    process.exit(1);
}));
