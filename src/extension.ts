// エントリファイル

import * as vscode from 'vscode';
import { GpbLiteEditorProvider } from './gpbliteeditor';

import { exec } from 'node:child_process';
import { GpbLiteProvider } from './gpblite';

import { MaterialLiteEditorProvider } from './materiallite';

import * as path from 'node:path';

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

  { // commands
    const name = 'hspgpb-vscode.foo';
    context.subscriptions.push(vscode.commands.registerCommand(name, () => {
      vscode.window.showInformationMessage(`material ${name}`);
    }));
  }

  {
    const name = 'hspgpb-vscode.bar';
    context.subscriptions.push(vscode.commands.registerCommand(name, async (...commandArgs) => {
      const first = commandArgs[0];
      const second = commandArgs[1];
      let parsed = path.parse('');
      if (first instanceof vscode.Uri) {
        parsed = path.parse(first.toString());
      }
      vscode.window.showInformationMessage(`bar ${name}`);

      const editor = vscode.window.activeTextEditor;
      const doc = editor?.document;
      let text = doc?.getText();
      vscode.window.showInformationMessage(text ?? 'material undefined');

      //parsed = path.parse(doc?.uri.toString() ?? '');

      const panel = vscode.window.createWebviewPanel(
        'hspgpb-vscode', // viewType
        parsed.name,
        vscode.ViewColumn.Two,
        {
          enableScripts: true, // 重要
        }
      );

      const provider = new MaterialLiteEditorProvider(context);
      panel.webview.html = await provider.getHtmlForWebview(panel.webview, parsed, first);
    }));
  }

}

// This method is called when your extension is deactivated
export function deactivate() {}
