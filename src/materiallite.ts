/**
 * @file materiallite.ts
 */

import * as vscode from 'vscode';
import { Disposable, disposeAll } from './dispose';
import { getNonce } from './util';

import * as fs from 'node:fs';
import * as path from 'node:path';

interface MaterialLiteEdit {
    readonly color: string;
    readonly stroke: ReadonlyArray<[number, number]>;
}

interface MaterialLiteDocumentDelegate {
    getFileData(): Promise<Uint8Array>;
}



/**
 * エディタとしては動作しない
 */
class MaterialLiteDocument extends Disposable implements vscode.CustomDocument {
    static async create(
        uri: vscode.Uri,
        backupId: string | undefined,
        delegate: MaterialLiteDocumentDelegate) {
        const dataFile = typeof backupId === 'string' ? vscode.Uri.parse(backupId) : uri;
        const fileData = await MaterialLiteDocument.readFile(dataFile);
        return new MaterialLiteDocument(uri, fileData, delegate);
    }

	private static async readFile(uri: vscode.Uri): Promise<Uint8Array> {
		if (uri.scheme === 'untitled') {
			return new Uint8Array();
		}
		return new Uint8Array(await vscode.workspace.fs.readFile(uri));
	}

    private readonly _uri: vscode.Uri;
/**
 * 編集可能時のみ使用
 */
	private _edits: Array<MaterialLiteEdit> = [];
	private _savedEdits: Array<MaterialLiteEdit> = [];
    private _documentData: Uint8Array;
    
    private readonly _delegate: MaterialLiteDocumentDelegate;

    private constructor(
        uri: vscode.Uri,
        initialContent: Uint8Array,
        delegate: MaterialLiteDocumentDelegate
    ) {
        super();
        this._uri = uri;
        this._documentData = initialContent;
        this._delegate = delegate;
    }


	public get uri() { return this._uri; }

	public get documentData(): Uint8Array { return this._documentData; }

	private readonly _onDidDispose = this._register(new vscode.EventEmitter<void>());
	/**
	 * Fired when the document is disposed of.
	 */
	public readonly onDidDispose = this._onDidDispose.event;

	private readonly _onDidChangeDocument = this._register(new vscode.EventEmitter<{
		readonly content?: Uint8Array;
		readonly edits: readonly MaterialLiteEdit[];
	}>());
	/**
	 * Fired to notify webviews that the document has changed.
	 */
	public readonly onDidChangeContent = this._onDidChangeDocument.event;

	private readonly _onDidChange = this._register(new vscode.EventEmitter<{
		readonly label: string,
		undo(): void,
		redo(): void,
	}>());
	/**
	 * Fired to tell VS Code that an edit has occurred in the document.
	 *
	 * This updates the document's dirty indicator.
	 */
	public readonly onDidChange = this._onDidChange.event;

	/**
	 * Called by VS Code when there are no more references to the document.
	 *
	 * This happens when all editors for it have been closed.
	 */
	dispose(): void {
		this._onDidDispose.fire();
		super.dispose();
	}

	/**
	 * Called when the user edits the document in a webview.
	 *
	 * This fires an event to notify VS Code that the document has been edited.
	 */
	makeEdit(edit: MaterialLiteEdit) {
		this._edits.push(edit);

		this._onDidChange.fire({
			label: 'Stroke',
			undo: async () => {
				this._edits.pop();
				this._onDidChangeDocument.fire({
					edits: this._edits,
				});
			},
			redo: async () => {
				this._edits.push(edit);
				this._onDidChangeDocument.fire({
					edits: this._edits,
				});
			}
		});
	}

	/**
	 * Called by VS Code when the user saves the document.
	 */
	async save(cancellation: vscode.CancellationToken): Promise<void> {
		await this.saveAs(this.uri, cancellation);
		this._savedEdits = Array.from(this._edits);
	}

	/**
	 * Called by VS Code when the user saves the document to a new location.
	 */
	async saveAs(targetResource: vscode.Uri, cancellation: vscode.CancellationToken): Promise<void> {
		const fileData = await this._delegate.getFileData();
		if (cancellation.isCancellationRequested) {
			return;
		}
		await vscode.workspace.fs.writeFile(targetResource, fileData);
	}

	/**
	 * Called by VS Code when the user calls `revert` on a document.
	 */
	async revert(_cancellation: vscode.CancellationToken): Promise<void> {
		const diskContent = await MaterialLiteDocument.readFile(this.uri);
		this._documentData = diskContent;
		this._edits = this._savedEdits;
		this._onDidChangeDocument.fire({
			content: diskContent,
			edits: this._edits,
		});
	}

	/**
	 * Called by VS Code to backup the edited document.
	 *
	 * These backups are used to implement hot exit.
	 */
	async backup(destination: vscode.Uri, cancellation: vscode.CancellationToken): Promise<vscode.CustomDocumentBackup> {
		await this.saveAs(destination, cancellation);

		return {
			id: destination.toString(),
			delete: async () => {
				try {
					await vscode.workspace.fs.delete(destination);
				} catch {
					// noop
				}
			}
		};
	}
}

/**
 * Provider for paw draw editors.
 *
 * Paw draw editors are used for `.pawDraw` files, which are just `.png` files with a different file extension.
 *
 * This provider demonstrates:
 *
 * - How to implement a custom editor for binary files.
 * - Setting up the initial webview for a custom editor.
 * - Loading scripts and styles in a custom editor.
 * - Communication between VS Code and the custom editor.
 * - Using CustomDocuments to store information that is shared between multiple custom editors.
 * - Implementing save, undo, redo, and revert.
 * - Backing up a custom editor.
 */
export class MaterialLiteEditorProvider implements vscode.CustomEditorProvider<MaterialLiteDocument> {

	private static newFileId = 1;

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		vscode.commands.registerCommand('hspgpb-vscode.bar', () => {

			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders) {
				vscode.window.showErrorMessage("Creating new Paw Draw files currently requires opening a workspace");
				return;
			}

			const uri = vscode.Uri.joinPath(workspaceFolders[0].uri, `new-${MaterialLiteEditorProvider.newFileId++}.gpb`)
				.with({ scheme: 'untitled' });

			vscode.commands.executeCommand('vscode.openWith', uri, MaterialLiteEditorProvider.viewType);
		});

		return vscode.window.registerCustomEditorProvider(
			MaterialLiteEditorProvider.viewType,
			new MaterialLiteEditorProvider(context),
			{
				// For this demo extension, we enable `retainContextWhenHidden` which keeps the
				// webview alive even when it is not visible. You should avoid using this setting
				// unless is absolutely required as it does have memory overhead.
				webviewOptions: {
					retainContextWhenHidden: true,
				},
				supportsMultipleEditorsPerDocument: false,
			});
	}

	private static readonly viewType = 'hspgpb-vscode.materialview';

	/**
	 * Tracks all known webviews
	 */
	private readonly webviews = new WebviewCollection();

	constructor(
		private readonly _context: vscode.ExtensionContext
	) { }

	//#region CustomEditorProvider

	async openCustomDocument(
		uri: vscode.Uri,
		openContext: { backupId?: string },
		_token: vscode.CancellationToken
	): Promise<MaterialLiteDocument> {
		const document: MaterialLiteDocument = await MaterialLiteDocument.create(uri, openContext.backupId, {
			getFileData: async () => {
				const webviewsForDocument = Array.from(this.webviews.get(document.uri));
				if (!webviewsForDocument.length) {
					throw new Error('Could not find webview to save for');
				}
				const panel = webviewsForDocument[0];
				const response = await this.postMessageWithResponse<number[]>(panel, 'getFileData', {});
				return new Uint8Array(response);
			}
		});

		const listeners: vscode.Disposable[] = [];

		listeners.push(document.onDidChange(e => {
			// Tell VS Code that the document has been edited by the use.
			this._onDidChangeCustomDocument.fire({
				document,
				...e,
			});
		}));

		listeners.push(document.onDidChangeContent(e => {
			// Update all webviews when the document changes
			for (const webviewPanel of this.webviews.get(document.uri)) {
				this.postMessage(webviewPanel, 'update', {
					edits: e.edits,
					content: e.content,
				});
			}
		}));

		document.onDidDispose(() => disposeAll(listeners));

		return document;
	}

	async resolveCustomEditor(
		document: MaterialLiteDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {
		// Add the webview to our internal set of active webviews
		this.webviews.add(document.uri, webviewPanel);

		// Setup initial content for the webview
		webviewPanel.webview.options = {
			enableScripts: true,
		};
		webviewPanel.webview.html = await this.getHtmlForWebview(webviewPanel.webview, document.uri);

		webviewPanel.webview.onDidReceiveMessage(e => this.onMessage(document, e));

		// Wait for the webview to be properly ready before we init
		webviewPanel.webview.onDidReceiveMessage(e => {
			if (e.type === 'ready') {
				if (document.uri.scheme === 'untitled') {
					this.postMessage(webviewPanel, 'init', {
						untitled: true,
						editable: true,
					});
				} else {
					const editable = vscode.workspace.fs.isWritableFileSystem(document.uri.scheme);

					this.postMessage(webviewPanel, 'init', {
						value: document.documentData,
						editable,
					});
				}
			}
		});
	}

	private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<MaterialLiteDocument>>();
	public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

	public saveCustomDocument(document: MaterialLiteDocument, cancellation: vscode.CancellationToken): Thenable<void> {
		return document.save(cancellation);
	}

	public saveCustomDocumentAs(document: MaterialLiteDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Thenable<void> {
		return document.saveAs(destination, cancellation);
	}

	public revertCustomDocument(document: MaterialLiteDocument, cancellation: vscode.CancellationToken): Thenable<void> {
		return document.revert(cancellation);
	}

	public backupCustomDocument(document: MaterialLiteDocument, context: vscode.CustomDocumentBackupContext, cancellation: vscode.CancellationToken): Thenable<vscode.CustomDocumentBackup> {
		return document.backup(context.destination, cancellation);
	}

	//#endregion

	/**
     * ページテキストを返す
	 */
	public async getHtmlForWebview(webview: vscode.Webview, targetUri: vscode.Uri): Promise<string> {

		const base = webview.asWebviewUri(
			vscode.Uri.joinPath(
				this._context.extensionUri, 'media'
			)
		);
		const baseStr = base.toString() + '/';

		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();

		let ret = `<html><body>start! 5</body></html>`;
		let str = 'mate<br />';

		let fsPosition = '/* emscripten empty replace */';
		try {
			const result = await this.parseMaterial(targetUri);
			fsPosition = result.emsFiles.map(files => {
				const lines: string[] = [
					`Module['FS_createPath']('/', '${files.emsDir}', true, true);`,
					`Module['FS_createPreloadedFile']('/', '${files.emsFilename}', '${webview.asWebviewUri(files.uri).toString()}', true, true);`,
				];
				return lines.join('\n');
			}).join('\n');

			fsPosition += `\nvar _name = '${result.name}';\n`;
			fsPosition += `var _buf = new TextEncoder().encode(_name);\n`;
			fsPosition += `Module['FS_createPreloadedFile']('/', '_name.txt', _buf, true, true);\n`;

			//fsPosition += `Module['FS_createPreloadedFile']('/', 'look.ax', './look.ax', true, true)`;

		} catch (ec) {
			vscode.window.showWarningMessage(`Error occured`);
			return `Error occured`;
		}

		try {
			const source = webview.cspSource;

			const templateUri = vscode.Uri.joinPath(
				this._context.extensionUri, 'media', 'look.html'
			);
			const u8 = await vscode.workspace.fs.readFile(templateUri);
			ret = new TextDecoder().decode(u8);

			ret = ret.replace('/*BASEHREFPOSITION*/', baseStr);

			ret = ret.replace(/\/\*NONCEPOSITION\*\//g, nonce);

			const styleNonce = `<style nonce="${nonce}" `;
			ret = ret.replace(/\<style/g, styleNonce);
			const scriptNonce = `<script nonce="${nonce}" `;
			ret = ret.replace(/\<script\s/g, scriptNonce);

			ret = ret.replace(/\/\*CSPPOSITION\*\//g, source);

			ret = ret.replace('/*FSPOSITION*/', fsPosition);

		} catch(ec: unknown) {
			str += `catch ${ec?.toString()}`;
		}

		//vscode.window.showInformationMessage(str);
		return ret;

		return /* html */`
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8" />
				<base href="${baseStr}" />

				<!--
				Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="reset.css" rel="stylesheet" />
				<link href="vscode.css" rel="stylesheet" />
				<link href="pawDraw.css" rel="stylesheet" />

				<title>HSP Gpb Lite</title>
			</head>
			<body>
            bar で表示したい1
				<div class="corge">gpb ファイル</div>
				<div class="drawing-canvas"></div>

				<div>
					<div>未実装: 材質</div>
					<div id="materialelement"></div>
				</div>

				<div class="drawing-controls">
					<button data-color="red" class="red" title="Red"></button>
					<button data-color="green" class="green" title="Green"></button>
				</div>

				<script nonce="${nonce}" src="hsp3dishw-gp.js"></script>
				<script nonce="${nonce}" src="pawDraw.js"></script>
			</body>
			</html>`;
	}

/**
 * .material ファイルの画像を取り出す
 * show に <br /> 効かない
 * @param targetUri 
 */
	public async parseMaterial(targetUri: vscode.Uri) {
		let str = 'p1,';

		const dirname = (uri: vscode.Uri) => {
			return vscode.Uri.parse(path.dirname(uri.path));
		};

		const ret = {
			name: '',
			emsFiles: [] as {emsFilename: string, emsDir: string, uri: vscode.Uri}[]
		};

		const gpbUri = targetUri.with({
			path: targetUri.path.replace(/\.(material|gpb)$/, '.gpb'),
		});

		const materialUri = targetUri.with({
			path: targetUri.path.replace(/\.(material|gpb)$/, '.material'),
		});

		//vscode.window.showInformationMessage(`parse ${materialUri.toString()}`);

		const modelDirUri = dirname(materialUri);
		const u8buf = await vscode.workspace.fs.readFile(materialUri);
		let text = '';
		try {
			text = new TextDecoder().decode(u8buf);
		} catch (ec) {
			// shiftjis
		}

		const wsLayers = modelDirUri.path.split('/');

// 2つのファイルを登録する
		for (const uri of [gpbUri, materialUri]) {
			const parsed = path.parse(uri.fsPath);
			ret.name = parsed.name;

			const emsFile = {
				emsDir: '/',
				emsFilename: `${parsed.base}`,
				uri,
			};
			ret.emsFiles.push(emsFile);
		}

		const lines = text.split('\n').map(line => line.trim());
		//str += `p,${lines.length},`;
		const reExt = /(?<ext>\.[^.]*)$/;

		for (const line of lines) {
			const ss = line.split('=').map(v => v.trim());
			if (ss.length !== 2) {
				continue;
			}
			const [key, val] = ss;
			const m = reExt.exec(val);
			const ext = m?.groups?.['ext'];
			switch(ext) {
			case '.png':
				// 処理を続ける
				break;
			//case '.vert':
			//case '.frag':
				// Do nothing.
				//break;
			default:
				continue; // 非対象
			}
			
			const layers = val.split('/');
			{ // モデル基準
				try {
					const candUri = vscode.Uri.joinPath(
						modelDirUri, ...layers,
					);

					const stat = await vscode.workspace.fs.stat(candUri);
					str += `, ${candUri.toString()} ${stat.size}\\n`;

					const emsFile = {
						emsFilename: val,
						emsDir: '/',
						uri: candUri,
					};
					if (layers.length >= 2) {
						layers.pop();
						emsFile.emsDir = '/' + layers.join('/');
					}
					ret.emsFiles.push(emsFile);
					continue;
				} catch (ec) {
					str += `, ${ec?.toString()}\\n`;
				}
				vscode.window.showInformationMessage(`model, ${str}`);
			}

			{ // 1つずつ上がっていく
				while(wsLayers.length > 0) {
					try {
						wsLayers.pop();
						
						const guessDirUri = modelDirUri.with({
							path: wsLayers.join('/'),
						});
						const candUri = vscode.Uri.joinPath(
							guessDirUri, ...layers,
						);

						const stat = await vscode.workspace.fs.stat(candUri);
						str += `, ${candUri.toString()} ${stat.size}\\n`;
						const emsFile = {
							emsDir: '/',
							emsFilename: val,
							uri: candUri,
						};
						if (layers.length >= 2) {
							layers.pop();
							emsFile.emsDir = '/' + layers.join('/');
						}
						ret.emsFiles.push(emsFile);
						break;
					} catch (ec) {
						str += `, ${ec?.toString()}\\n`;
					}
					//vscode.window.showInformationMessage(`up ${candUri.toString()}`);
				}
			}
		}

		vscode.window.showInformationMessage(str);
		return ret;
	}



	private _requestId = 1;
	private readonly _callbacks = new Map<number, (response: any) => void>();

	private postMessageWithResponse<R = unknown>(panel: vscode.WebviewPanel, type: string, body: any): Promise<R> {
		const requestId = this._requestId++;
		const p = new Promise<R>(resolve => this._callbacks.set(requestId, resolve));
		panel.webview.postMessage({ type, requestId, body });
		return p;
	}

	private postMessage(panel: vscode.WebviewPanel, type: string, body: any): void {
		panel.webview.postMessage({ type, body });
	}

	private onMessage(document: MaterialLiteDocument, message: any) {
		switch (message.type) {
			case 'stroke':
				document.makeEdit(message as MaterialLiteEdit);
				return;

			case 'response':
				{
					const callback = this._callbacks.get(message.requestId);
					callback?.(message.body);
					return;
				}
		}
	}
}

/**
 * Tracks all webviews.
 */
class WebviewCollection {

	private readonly _webviews = new Set<{
		readonly resource: string;
		readonly webviewPanel: vscode.WebviewPanel;
	}>();

	/**
	 * Get all known webviews for a given uri.
	 */
	public *get(uri: vscode.Uri): Iterable<vscode.WebviewPanel> {
		const key = uri.toString();
		for (const entry of this._webviews) {
			if (entry.resource === key) {
				yield entry.webviewPanel;
			}
		}
	}

	/**
	 * Add a new webview to the collection.
	 */
	public add(uri: vscode.Uri, webviewPanel: vscode.WebviewPanel) {
		const entry = { resource: uri.toString(), webviewPanel };
		this._webviews.add(entry);

		webviewPanel.onDidDispose(() => {
			this._webviews.delete(entry);
		});
	}
}

