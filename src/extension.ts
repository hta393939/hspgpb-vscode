// エントリファイル

import * as vscode from 'vscode';

import { GpbLiteProvider } from './gpblite';
import { MaterialLiteEditorProvider } from './materiallite';
import { PreviewCode } from './previewcode';
import { GpbPreviewProvider } from './gpbpreview';

import * as path from 'node:path';

export function activate(context: vscode.ExtensionContext) {

  context.subscriptions.push(GpbPreviewProvider.register(context));

  { // commands hsp ファイル生成
    const name = 'hspgpb-vscode.makepreviewcode';
    context.subscriptions.push(vscode.commands.registerCommand(name, (...commandArgs) => {
      vscode.window.showWarningMessage(`未実装 ${vscode.env.language} makepreviewcode foo ${name}`);

      const [first, second] = commandArgs;
      if (first instanceof vscode.Uri) {
        const previewCode = new PreviewCode(context);
        previewCode.make(first, second);
      }
    }));
  }

  {
    const name = 'hspgpb-vscode.parsegpb';
    context.subscriptions.push(vscode.commands.registerCommand(name, async (...commandArgs) => {
      let parsed = path.parse('');
      const [first] = commandArgs;
      if (first instanceof vscode.Uri) {
        parsed = path.parse(first.fsPath);
      }

      const panel = vscode.window.createWebviewPanel(
        'hspgpb-vscode.gpbparse', // viewType
        parsed.name,
        vscode.ViewColumn.One,
        {
          enableScripts: true, // 重要
        }
      );

      const provider = new GpbLiteProvider(context);
      panel.webview.html = await provider.getHtmlForWebview(panel.webview, first);
    }));
  }

  /*
  { // 初期実装
    const name = 'hspgpb-vscode.bar';
    context.subscriptions.push(vscode.commands.registerCommand(name, async (...commandArgs) => {
      const first = commandArgs[0];
      let parsed = path.parse('');
      if (first instanceof vscode.Uri) {
        parsed = path.parse(first.toString());
      }

      const panel = vscode.window.createWebviewPanel(
        'hspgpb-vscode', // viewType
        parsed.name,
        vscode.ViewColumn.Two,
        {
          enableScripts: true, // 重要
        }
      );

      const provider = new MaterialLiteEditorProvider(context);
      panel.webview.html = await provider.getHtmlForWebview(panel.webview, first);
    }));
  } */

}

// This method is called when your extension is deactivated
export function deactivate() {}
