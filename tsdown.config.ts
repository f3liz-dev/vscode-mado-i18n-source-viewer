// tsdown.config.ts
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/extension.ts'], // ビルドのエントリーポイント
  outDir: 'dist',                // バンドル後の出力先ディレクトリ
  format: 'cjs',                 // VSCode拡張機能はCommonJS形式で動作
  target: 'node18',              // VSCodeが使用するNode.jsのバージョンに合わせる
  shims: true,                   // __dirnameなどのNode.jsグローバルを有効化
  sourcemap: true,               // デバッグ用にソースマップを生成
  clean: true,                   // ビルド前に出力先ディレクトリをクリーンアップ

  // VSCode拡張機能のビルドで最も重要な設定
  // 'vscode'モジュールはVSCode本体が提供するため、バンドルに含めない
  external: ['vscode'],
});