/**
 * @file gpbpreview.ts
 */

import * as vscode from 'vscode';
import {Disposable, disposeAll} from './dispose';
import {getNonce} from './util';

import * as fs from 'node:fs';
import * as path from 'node:path';

import {PreGpb} from './pregpb';

interface GpbPreviewEdit {
    readonly color: string;
    readonly stroke: ReadonlyArray<[number, number]>;
}

interface GpbPreviewDocumentDelegate {
    getFileData(): Promise<Uint8Array>;
}

const list: string[] = [
	'colored.frag',
	'colored.vert',
	'font.frag',
	'font.vert',
	'lighting.frag',
	'lighting.vert',
	'p_blur.frag',
	'p_blur2.frag',
	'p_blur2.vert',
	'p_bright.frag',
	'p_constrast.frag',
	'p_crtmonitor.frag',
	'p_crtmonitor2.frag',
	'p_cutoff.frag',
	'p_grayscale.frag',
	'p_mosaic.frag',
	'p_oldfilm.frag',
	'p_sepia.frag',
	'p_sobel.frag',
	'simpletex.frag',
	'simpletex.vert',
	'skinning-none.vert',
	'skinning.vert',
	'skybox.frag',
	'skybox.vert',
	'sprite.frag',
	'sprite.vert',
	'spritecol.frag',
	'spritecol.vert',
	'terrain.frag',
	'terrain.vert',
	'textured_gray.frag',
	'textured.frag',
	'textured.vert',
];


/**
 * エディタとしては動作しない
 */
class GpbPreviewDocument extends Disposable implements vscode.CustomDocument {
    static async create(
        uri: vscode.Uri,
        backupId: string | undefined,
        delegate: GpbPreviewDocumentDelegate) {
        const dataFile = typeof backupId === 'string' ? vscode.Uri.parse(backupId) : uri;
        const fileData = await GpbPreviewDocument.readFile(dataFile);
        return new GpbPreviewDocument(uri, fileData, delegate);
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
	private _edits: Array<GpbPreviewEdit> = [];
	private _savedEdits: Array<GpbPreviewEdit> = [];
    private _documentData: Uint8Array;
    
    private readonly _delegate: GpbPreviewDocumentDelegate;

    private constructor(
        uri: vscode.Uri,
        initialContent: Uint8Array,
        delegate: GpbPreviewDocumentDelegate
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
		readonly edits: readonly GpbPreviewEdit[];
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
	makeEdit(edit: GpbPreviewEdit) {
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
		const diskContent = await GpbPreviewDocument.readFile(this.uri);
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
export class GpbPreviewProvider implements vscode.CustomEditorProvider<GpbPreviewDocument> {

	private static newFileId = 1;

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		vscode.commands.registerCommand('hspgpb-vscode.previewgpb', () => {

			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders) {
				vscode.window.showErrorMessage("Creating new gpb files currently requires opening a workspace");
				return;
			}

			const uri = vscode.Uri.joinPath(workspaceFolders[0].uri, `new-${GpbPreviewProvider.newFileId++}.gpb`)
				.with({ scheme: 'untitled' });

			vscode.commands.executeCommand('vscode.openWith', uri, GpbPreviewProvider.viewType);
		});

		return vscode.window.registerCustomEditorProvider(
			GpbPreviewProvider.viewType,
			new GpbPreviewProvider(context),
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

	private static readonly viewType = 'hspgpb-vscode.gpbpreview';

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
	): Promise<GpbPreviewDocument> {
		const document: GpbPreviewDocument = await GpbPreviewDocument.create(uri, openContext.backupId, {
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
		document: GpbPreviewDocument,
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

	private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<GpbPreviewDocument>>();
	public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

	public saveCustomDocument(document: GpbPreviewDocument, cancellation: vscode.CancellationToken): Thenable<void> {
		return document.save(cancellation);
	}

	public saveCustomDocumentAs(document: GpbPreviewDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Thenable<void> {
		return document.saveAs(destination, cancellation);
	}

	public revertCustomDocument(document: GpbPreviewDocument, cancellation: vscode.CancellationToken): Thenable<void> {
		return document.revert(cancellation);
	}

	public backupCustomDocument(document: GpbPreviewDocument, context: vscode.CustomDocumentBackupContext, cancellation: vscode.CancellationToken): Thenable<vscode.CustomDocumentBackup> {
		return document.backup(context.destination, cancellation);
	}

	//#endregion

	/**
     * ページテキストを返す
	 */
	public async getHtmlForWebview(webview: vscode.Webview, targetUri: vscode.Uri): Promise<string> {
		const binary = await vscode.workspace.fs.readFile(targetUri);

		const parser = new PreGpb();
		const gr = parser.parseGPB(binary.buffer);
		const isFont = gr.userData.hasFont;

		const base = webview.asWebviewUri(
			vscode.Uri.joinPath(this._context.extensionUri, 'media')
		);
		const baseStr = base.toString() + '/';

		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();

		let ret = `<html><body>n/a</body></html>`;
		let str = 'material<br />';

		let fsPosition = '/* emscripten empty replace */';
		if (!isFont) {
			try {
				const result = await this.parseMaterial(targetUri);
				fsPosition = result.emsFiles.map(files => {
					const lines: string[] = [
						`Module['FS_createPath']('/', '${files.emsDir}', true, true);`,
						`Module['FS_createPreloadedFile']('/', '${files.emsFilename}', '${webview.asWebviewUri(files.uri).toString()}', true, true);`,
					];
					return lines.join('\n');
				}).join('\n');

				const lines = [
					`${result.name}`,
					`${[...gr.userData.min, ...gr.userData.max].join(',')}`,
					``,
				];

				fsPosition += `\nvar _name = '${lines.join('\\n')}';\n`;
				fsPosition += `var _buf = new TextEncoder().encode(_name);\n`;
				fsPosition += `Module['FS_createPreloadedFile']('/', '_name.txt', _buf, true, true);\n`;
			} catch (ec) {
				vscode.window.showWarningMessage(`Error occured`);
				return `Error occured`;
			}
		} else {
			const viewUri = webview.asWebviewUri(targetUri);
			fsPosition = `var _name = "${viewUri.toString()}";\n`;
		}

		try {
			const source = webview.cspSource;

			const templateUri = vscode.Uri.joinPath(
				this._context.extensionUri,
				'media',
				!isFont ? 'look.html' : 'font.template.html'
			);
			const u8 = await vscode.workspace.fs.readFile(templateUri);
			ret = new TextDecoder().decode(u8);

			ret = ret.replace(/<title.+\/title>/, `
<base href="/*BASEHREFPOSITION*/" />
<meta http-equiv="Content-Security-Policy" content="
default-src 'none';
connect-src /*CSPPOSITION*/ blob: data:;
img-src /*CSPPOSITION*/ blob: data:;
media-src /*CSPPOSITION*/ blob: data:;
style-src /*CSPPOSITION*/ 'nonce-/*NONCEPOSITION*/';
script-src 'wasm-unsafe-eval' /*CSPPOSITION*/ 'nonce-/*NONCEPOSITION*/';
">
			`);

			ret = ret.replace('function runWithFS() {', `
function runWithFS() {
/*FSPOSITION*/
			`);

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

		const modelDirUri = dirname(materialUri);
		const u8buf = await vscode.workspace.fs.readFile(materialUri);
		let text = '';
		try {
			text = new TextDecoder().decode(u8buf);
		} catch (ec) {
			// shiftjis
		}

		/**
		 * 対象モデルファイルの / スプリット
		 */
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

		const notfounds = [];

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
			case '.vert':
			case '.frag':
				{
					const match = list.some(end => {
						return val.endsWith(`res/shaders/${end}`);
					});
					if (match) {
						console.log('found in list');
						continue; // リストにあったら非対象
					}
					// 処理を続ける
				}
				break;
			default:
				continue; // 非対象
			}
			
			/**
			 * .material の値として記載されている文字列の / スプリット
			 */
			const layers = val.split('/');
			{ // モデル基準
				try {
					const candUri = vscode.Uri.joinPath(
						modelDirUri, ...layers,
					);
					console.log('candUri', candUri.toString(), layers);

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
					console.log('%cmodel base catch',
						'color:mediumpurple',
						ec?.toString());
				}
			}

			{ // 1つずつ上がっていく
				let found = false;
				const wsLayersClone = [...wsLayers];
				while(wsLayersClone.length > 0) {
					try {
						//wsLayers.pop();
						
						const guessDirUri = modelDirUri.with({
							path: wsLayersClone.join('/'),
						});
						wsLayersClone.pop();

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
						found = true;
						break;
					} catch (ec) {
						str += `, ${ec?.toString()}\\n`;
						console.log('%cdepth catch', 'color:mediumpurple', ec?.toString());
					}
				}

				if (!found) {
					notfounds.push(val);
				}
			}
		}

		if (notfounds.length >= 1) {
			const text = `Fail find ${notfounds.join(', ')}`;
			vscode.window.showWarningMessage(text);
		}
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

	private onMessage(document: GpbPreviewDocument, message: any) {
		switch (message.type) {
			case 'stroke':
				document.makeEdit(message as GpbPreviewEdit);
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

