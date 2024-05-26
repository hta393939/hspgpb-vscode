/**
 * @file makecode.ts
 */

import * as vscode from 'vscode';
import { Disposable, disposeAll } from './dispose';
import { getNonce } from './util';

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 */
export class PreviewCode {
	private static readonly viewType = 'hspgpb-vscode.makepreviewcode';

	constructor(
		private readonly _context: vscode.ExtensionContext
	) { }

	/**
     * コード生成する
	 */
	public async make(targetUri: vscode.Uri, targets: vscode.Uri[]): Promise<void> {
		try {
			const parsed = path.parse(targetUri.fsPath);

			const templateUri = vscode.Uri.joinPath(
				this._context.extensionUri, 'media', 'look.hsp',
			);
			const u8buf = await vscode.workspace.fs.readFile(templateUri);
			let text = new TextDecoder().decode(u8buf);

			for (const target of targets) {
				const stat = await vscode.workspace.fs.stat(target);
				if ((stat.type & vscode.FileType.Directory) === 0) {
					continue;
				}

				let param = `// parameter text\n`;
				param += `_name = "${parsed.name}"\n`;
				// 未実装 dir の場所から辿る
				param += `_pathname = "res/${parsed.name}"`;

				text = text.replace('/*PARAMETERPOSITION*/', param);
				const buf = new TextEncoder().encode(text);
				// 未実装 dir 配下に書き出す
				const outputUri = vscode.Uri.parse('');
				await vscode.workspace.fs.writeFile(outputUri, buf);
				break;
			}

		} catch (ec: unknown) {
			vscode.window.showWarningMessage(`HSPGPB: Error occurs ${ec?.toString() || ec}`);
		}
	}

}
