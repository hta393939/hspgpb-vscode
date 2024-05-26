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
		let ret = `<html><body>start! 5</body></html>`;
		let str = 'mate<br />';
		let fsPosition = '/* emscripten empty replace */';

		try {
			const templateUri = vscode.Uri.joinPath(
				this._context.extensionUri, 'media', '',
			);
			//const u8buf = await vscode.workspace.fs.readFile();
		} catch (ec) {

		}
	}

}
