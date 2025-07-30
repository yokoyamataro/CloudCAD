import React from 'react';

export const SimpleTest: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#2563eb' }}>CloudCAD - 動作確認</h1>
      <div style={{ backgroundColor: '#f3f4f6', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2>✅ アプリケーションが正常に起動しました</h2>
        <ul>
          <li>React: 正常動作</li>
          <li>TypeScript: 正常動作</li>
          <li>Vite: 正常動作</li>
        </ul>
      </div>
      
      <div style={{ backgroundColor: '#fff3cd', padding: '20px', borderRadius: '8px' }}>
        <h2>📝 マルチページ機能テスト</h2>
        <p>以下のボタンでページ管理機能をテストできます：</p>
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button 
            style={{ 
              backgroundColor: '#22c55e', 
              color: 'white', 
              border: 'none', 
              padding: '10px 20px', 
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            onClick={() => alert('新しいページを追加しました!')}
          >
            ➕ ページ追加
          </button>
          
          <button 
            style={{ 
              backgroundColor: '#ef4444', 
              color: 'white', 
              border: 'none', 
              padding: '10px 20px', 
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            onClick={() => alert('ページを削除しました!')}
          >
            ➖ ページ削除
          </button>
          
          <select 
            style={{ 
              padding: '10px', 
              borderRadius: '6px', 
              border: '1px solid #d1d5db' 
            }}
            onChange={(e) => alert(`${e.target.value}に切り替えました!`)}
          >
            <option value="ページ 1">ページ 1</option>
            <option value="ページ 2">ページ 2</option>
            <option value="ページ 3">ページ 3</option>
          </select>
        </div>
      </div>
      
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#6b7280' }}>
        <p>🌐 開発サーバー: localhost:5180</p>
        <p>⏰ 最終更新: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};