import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    console.log('mado-i18n-source-viewer activated.');

    // context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
    //     if (e.affectsConfiguration('side-by-side-source-viewer')) {
    //         console.log('Configuration changed.');
    //     }
    // }));

    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(document => {
		//console.log('--- File opened event fired! ---', document.uri.fsPath);
        const config = vscode.workspace.getConfiguration('mado-i18n-source-viewer');
        if (config.get('autoOpenOn') === 'onOpen') {
            findAndOpenSourceFile(document);
        }
    }));

    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        const config = vscode.workspace.getConfiguration('mado-i18n-source-viewer');
        if (config.get('autoOpenOn') === 'onEdit') {
            findAndOpenSourceFile(event.document);
        }
    }));

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

export function deactivate() {}

async function findAndOpenSourceFile(targetDocument: vscode.TextDocument) {
    const config = vscode.workspace.getConfiguration('mado-i18n-source-viewer');
    if (!config.get('enabled')) {
        return;
    }

    const rules: {target:string,source:string}[] = config.get('rules', []);
    const targetPath = targetDocument.uri.fsPath;

    for (const rule of rules) {
        try {
            const targetRegex = new RegExp(rule.target);
            const match = targetPath.match(targetRegex);

            if (match) {
                const sourcePath = rule.source.replace(/\$(\d)/g, (_: any, index: string) => {
                    return match[parseInt(index, 10)] || '';
                });

                const workspaceFolder = vscode.workspace.getWorkspaceFolder(targetDocument.uri);
                const absoluteSourcePath = path.resolve(workspaceFolder?.uri.fsPath || '', sourcePath);

                if (!fs.existsSync(absoluteSourcePath)) {
                    console.warn(`Source file not found: ${absoluteSourcePath}`);
                    continue;
                }

                const isAlreadyVisible = vscode.window.visibleTextEditors.some(editor => 
                    editor.viewColumn === vscode.ViewColumn.Beside && 
                    editor.document.uri.fsPath === absoluteSourcePath
                );

                if (isAlreadyVisible) {
                    return;
                }

                // ファイルを開く
                const sourceUri = vscode.Uri.file(absoluteSourcePath);
                await vscode.window.showTextDocument(sourceUri, {
                    viewColumn: vscode.ViewColumn.Beside,
                    preserveFocus: true,
                });

                return;
            }
        } catch (e) {
            console.error('Error processing rule:', rule, e);
            vscode.window.showErrorMessage(`Invalid RegExp in side-by-side-viewer rule: ${rule.target}`);
        }
    }
}