/**
 * @file gpblite.ts
 */

import * as vscode from 'vscode';
import { Disposable, disposeAll } from './dispose';
import { getNonce } from './util';

interface GpbLiteDocumentDelegate {
  getFileData(): Promise<Uint8Array>;
}


/**
 * エディタとしては動作しない
 */
class GpbLiteDocument extends Disposable implements vscode.CustomDocument {
  static async create(
        uri: vscode.Uri,
        backupId: string | undefined,
        delegate: GpbLiteDocumentDelegate) {
    const dataFile = typeof backupId === 'string' ? vscode.Uri.parse(backupId) : uri;
    const fileData = await GpbLiteDocument.readFile(dataFile);
    return new GpbLiteDocument(uri, fileData, delegate);
  }

  private static async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    if (uri.scheme === 'untitled') {
      return new Uint8Array(); // タイトルが無い場合は0バイトバイナリ
    }
    return new Uint8Array(await vscode.workspace.fs.readFile(uri));
  }

  private readonly _uri: vscode.Uri;
/**
 * 対象ファイルのバイナリ
 */
  private _documentData: Uint8Array;
    
  private readonly _delegate: GpbLiteDocumentDelegate;

  private constructor(
        uri: vscode.Uri,
        initialContent: Uint8Array,
        delegate: GpbLiteDocumentDelegate
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
    readonly edits: readonly any[];
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
  makeEdit(edit: any) {
    return;
  }

  /**
   * Called by VS Code when the user saves the document.
   */
  async save(cancellation: vscode.CancellationToken): Promise<void> {
    return;
  }

  /**
   * Called by VS Code when the user saves the document to a new location.
   */
  async saveAs(targetResource: vscode.Uri, cancellation: vscode.CancellationToken): Promise<void> {
    return;
  }

  /**
   * this.uri からバイナリを読み直してプライベートに格納する
   * Called by VS Code when the user calls `revert` on a document.
   */
  async revert(_cancellation: vscode.CancellationToken): Promise<void> {
    const diskContent = await GpbLiteDocument.readFile(this.uri);
    this._documentData = diskContent;
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
 * エディタの方は GpbLite "Editor" Provider
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
export class GpbLiteProvider implements vscode.CustomEditorProvider<GpbLiteDocument> {

  private static newFileId = 1;

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      GpbLiteProvider.viewType,
      new GpbLiteProvider(context),
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

  private static readonly viewType = 'hspgpb-vscode.gpblite';

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
  ): Promise<GpbLiteDocument> {
    const document: GpbLiteDocument = await GpbLiteDocument.create(uri, openContext.backupId, {
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
    document: GpbLiteDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    // Add the webview to our internal set of active webviews
    this.webviews.add(document.uri, webviewPanel);

    // Setup initial content for the webview
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

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

  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<GpbLiteDocument>>();
  public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

  public saveCustomDocument(document: GpbLiteDocument, cancellation: vscode.CancellationToken): Thenable<void> {
    return document.save(cancellation);
  }

  public saveCustomDocumentAs(document: GpbLiteDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Thenable<void> {
    return document.saveAs(destination, cancellation);
  }

  public revertCustomDocument(document: GpbLiteDocument, cancellation: vscode.CancellationToken): Thenable<void> {
    return document.revert(cancellation);
  }

  public backupCustomDocument(document: GpbLiteDocument, context: vscode.CustomDocumentBackupContext, cancellation: vscode.CancellationToken): Thenable<vscode.CustomDocumentBackup> {
    return document.backup(context.destination, cancellation);
  }

  //#endregion

  /**
   * Get the static HTML used for in our editor's webviews.
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    const base = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._context.extensionUri, 'media'
      )
    );
    const baseStr = base.toString() + '/';

    // Local path to script and css for the webview
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
      this._context.extensionUri, 'media', 'gpblite.js'));

    const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(
      this._context.extensionUri, 'media', 'reset.css'));

    const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(
      this._context.extensionUri, 'media', 'vscode.css'));

//    const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(
//      this._context.extensionUri, 'media', 'gpblite.css'));

    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();

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

        <link href="gpblite.css" rel="stylesheet" />
        <link href="style/color.css" rel="stylesheet" />

        <title></title>
      </head>
      <body>
        <div class="tobottom">
          <div class="red text0">0</div>
          <div class="green text1">1</div>
          <div class="blue text2">2</div>
        </div>
        <details open>
          <summary class="pt">情報</summary>
          <div class="toright">
            <div class="purple">purple</div>
            <div class="red">red</div>
            <div class="green">green</div>
            <div class="blue">blue</div>
          </div>
        </details>
        <div class="drawing-canvas"></div>

        <div>
          <div>未実装: 材質</div>
          <div id="materialelement"></div>
        </div>

        <!-- nonce を指定すること -->
        <script nonce="${nonce}" src="third_party/three.min.js"></script>
        <script nonce="${nonce}" src="third_party/OrbitControls.js"></script>
        <script nonce="${nonce}" src="lib/gpb.js"></script>
        <script nonce="${nonce}" src="lib/gpbthree.js"></script>
        <script nonce="${nonce}" src="gpblite.js"></script>
      </body>
      </html>`;
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

  private onMessage(document: GpbLiteDocument, message: any) {
    switch (message.type) {
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

