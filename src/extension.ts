// src/extension.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// 拡張機能が有効化されたときに呼ばれる
export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "side-by-side-source-viewer" is now active!');

    // // 設定変更を監視し、リスナーを再登録する
    // context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
    //     if (e.affectsConfiguration('side-by-side-source-viewer')) {
    //         // 現状はリスナーの再登録は不要だが、将来的な拡張のため
    //         console.log('Configuration changed.');
    //     }
    // }));

    // ファイルを開いた時のイベントリスナー
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(document => {
		console.log('--- File opened event fired! ---', document.uri.fsPath);
        const config = vscode.workspace.getConfiguration('mado-i18n-source-viewer');
        if (config.get('autoOpenOn') === 'onOpen') {
            findAndOpenSourceFile(document);
        }
    }));

    // ファイルを編集した時のイベントリスナー
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        const config = vscode.workspace.getConfiguration('side-by-side-source-viewer');
        if (config.get('autoOpenOn') === 'onEdit') {
            findAndOpenSourceFile(event.document);
        }
    }));

    // 手動実行コマンドの登録
    let disposable = vscode.commands.registerCommand('mado-i18n-source-viewer.openSource', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            findAndOpenSourceFile(editor.document);
        } else {
            vscode.window.showInformationMessage('No active editor found.');
        }
    });

    context.subscriptions.push(disposable);
}

// 拡張機能が無効化されるときに呼ばれる
export function deactivate() {}

// src/extension.ts (続き)

async function findAndOpenSourceFile(targetDocument: vscode.TextDocument) {
    // 設定を取得
    const config = vscode.workspace.getConfiguration('mado-i18n-source-viewer');
    if (!config.get('enabled')) {
        return; // 拡張機能が無効なら何もしない
    }

    const rules: any[] = config.get('rules', []);
    const targetPath = targetDocument.uri.fsPath;

    for (const rule of rules) {
        try {
            const targetRegex = new RegExp(rule.target);
            const match = targetPath.match(targetRegex);

            if (match) {
                // ターゲットの正規表現にマッチした場合
                const sourcePath = rule.source.replace(/\$(\d)/g, (_: any, index: string) => {
                    return match[parseInt(index, 10)] || '';
                });

                // 絶対パスに変換
                const workspaceFolder = vscode.workspace.getWorkspaceFolder(targetDocument.uri);
                const absoluteSourcePath = path.resolve(workspaceFolder?.uri.fsPath || '', sourcePath);

                // ソースファイルが存在するか確認
                if (!fs.existsSync(absoluteSourcePath)) {
                    console.warn(`Source file not found: ${absoluteSourcePath}`);
                    continue; // 次のルールへ
                }

                // 既に右側に表示されていないか確認
                const isAlreadyVisible = vscode.window.visibleTextEditors.some(editor => 
                    editor.viewColumn === vscode.ViewColumn.Beside && 
                    editor.document.uri.fsPath === absoluteSourcePath
                );

                if (isAlreadyVisible) {
                    return; // 既に表示済みなら何もしない
                }

                // ファイルを開く
                const sourceUri = vscode.Uri.file(absoluteSourcePath);
                await vscode.window.showTextDocument(sourceUri, {
                    viewColumn: vscode.ViewColumn.Beside, // 右側に表示
                    preserveFocus: true, // フォーカスは元のファイルに残す
                });

                // 一致するルールが見つかったのでループを抜ける
                return;
            }
        } catch (e) {
            console.error('Error processing rule:', rule, e);
            vscode.window.showErrorMessage(`Invalid RegExp in side-by-side-viewer rule: ${rule.target}`);
        }
    }
}