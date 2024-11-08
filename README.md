# hspgpb-vscode README

HSP3 hgimg4 で3Dモデルとして使用する.gpbファイルの
プレビュー機能を提供するVSCode拡張機能です。

(en) Preview gameplay3D 3D model gpb file for VS Code.

## Features

- HSP3 HGIMG4 によるgpbモデルのプレビュー機能
   - gpbファイルを選択するとプレビュー表示します
- materialファイルのハイライト機能
- (オマケ)gpbフォントファイルのビットマッププレビュー機能
- (オマケ)gpbファイルのパース機能
   - gpbファイルを右クリックしてHSPGPBから選択します

(en)
- Preview gpb 3D model file by HSP3 HGIMG4
   - Preview gpb file by select in VSCode
- Highlight material file
- (Appendix) Preview gpb font file
- (Appendix) Parse gpb file
   - Select in context menu for gpb file

## Extension Settings

設定項目はありません。

(en) Now no exists settings.

## Known Issues

- 標準シェーダー以外の材質の再現はできません。
- テクスチャは png のみです。

(en)  
- HSP3 standard shader only.
- png texture only.


## Release Notes

### 0.2.0

注: パブリッシャーのミススペルを修正したため(1文字足りなかった)
0.1.1 とは別拡張として扱われてしまうため
一旦、0.1.1 をアンインストールしてから 0.2.0 以降をインストールしてください。

右クリックのパース時のログ出力を強化した。

(en) Warning!   
Please uninstall ver.0.1.1 before ver.0.2.0 installing
because publisher typo fixed.

Add dump log in parsed.

### 0.1.1

初回公開。

(en) Initial release.
