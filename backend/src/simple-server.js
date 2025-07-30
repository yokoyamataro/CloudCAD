const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

// CORS設定
app.use(cors({
  origin: true, // 全てのオリジンを許可（開発用）
  credentials: true
}));

app.use(express.json());

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 認証エンドポイント（デモ用）
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // デモ用の認証
  if (email && password) {
    res.json({
      message: 'ログインに成功しました',
      user: {
        id: '1',
        email: email,
        name: 'デモユーザー',
        role: 'surveyor'
      },
      token: 'demo-jwt-token',
      refreshToken: 'demo-refresh-token'
    });
  } else {
    res.status(401).json({ error: 'メールアドレスとパスワードは必須です' });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { email, name, password, role = 'user' } = req.body;
  
  if (email && name && password) {
    res.status(201).json({
      message: 'ユーザーを正常に作成しました',
      user: {
        id: '2',
        email: email,
        name: name,
        role: role
      },
      token: 'demo-jwt-token',
      refreshToken: 'demo-refresh-token'
    });
  } else {
    res.status(400).json({ error: 'メールアドレス、名前、パスワードは必須です' });
  }
});

// プロジェクトエンドポイント（デモ用）
app.get('/api/projects', (req, res) => {
  res.json({
    projects: [
      {
        id: '1',
        name: 'サンプル地籍調査プロジェクト',
        description: 'デモ用のプロジェクトです',
        surveyArea: '東京都渋谷区',
        coordinateSystem: 'JGD2000',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  });
});

app.post('/api/projects', (req, res) => {
  const { name, description, surveyArea, coordinateSystem } = req.body;
  
  res.status(201).json({
    message: 'プロジェクトを作成しました',
    project: {
      id: Date.now().toString(),
      name: name,
      description: description,
      surveyArea: surveyArea,
      coordinateSystem: coordinateSystem || 'JGD2000',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });
});

// レイヤーエンドポイント（デモ用）
app.get('/api/projects/:projectId/layers', (req, res) => {
  res.json({
    layers: [
      {
        id: '1',
        name: 'デフォルト',
        color: '#000000',
        lineType: 'solid',
        lineWidth: 1.0,
        visible: true,
        locked: false,
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  });
});

app.post('/api/layers', (req, res) => {
  const layerData = req.body;
  res.status(201).json({
    layer: {
      id: Date.now().toString(),
      ...layerData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });
});

// 404ハンドラー
app.use((req, res) => {
  res.status(404).json({ error: `Endpoint not found: ${req.path}` });
});

app.listen(PORT, () => {
  console.log(`🚀 地籍調査CAD デモサーバーが起動しました`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`📊 フロントエンド: http://localhost:5174`);
});