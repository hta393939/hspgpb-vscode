import * as vscode from 'vscode';
import { GpbLiteEditorProvider } from './gpbliteeditor';

import { exec } from 'node:child_process';
import { GpbLiteProvider } from './gpblite';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(GpbLiteEditorProvider.register(context));

  context.subscriptions.push(GpbLiteProvider.register(context));

  { // commands に記載したコマンドの実装
    const name = 'hspgpb-vscode.corge';
    context.subscriptions.push(vscode.commands.registerCommand(name, () => {
      // 毎回ビルドするかなぁ;;
      const editor = vscode.window.activeTextEditor;
      const doc = editor?.document;
      let text = doc?.getText();
      vscode.window.showInformationMessage(text ?? 'undefined');

      exec('mspaint.exe', (error, stdout, stderr) => {
        // 終了後
      });
    }));
  }

  { // commands に記載したコマンドの実装
    const name = 'hspgpb-vscode.material';
    context.subscriptions.push(vscode.commands.registerCommand(name, () => {
      const editor = vscode.window.activeTextEditor;
      const doc = editor?.document;
      let text = doc?.getText();
      vscode.window.showInformationMessage(text ?? 'material undefined');

      const panel = vscode.window.createWebviewPanel(
        'hspgpb-vscode', // viewType
        'titlesample1',
        vscode.ViewColumn.Two,
        {}
      );
      panel.webview.html = `<html><body>sample1</body></html>`;

      exec('mspaint.exe', (error, stdout, stderr) => {
        // 終了後
      });
    }));
  }

}

// This method is called when your extension is deactivated
export function deactivate() {}
